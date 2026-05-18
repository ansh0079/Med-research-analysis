const path = require('path');
const fs = require('fs');
const { Database } = require('../../database');

const TEST_DB_PATH = path.join(__dirname, '__topic_bouquet_graph_test__.db');

describe('Topic bouquet graph (real SQLite)', () => {
    let db;

    beforeAll(async () => {
        if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
        db = new Database(TEST_DB_PATH);
        await db.connect();
        await db.runMigrations();
    });

    afterAll(async () => {
        await db.close();
        if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    });

    beforeEach(async () => {
        await db.run(`DELETE FROM topic_bouquet_signals`);
        await db.run(`DELETE FROM topic_knowledge`);
        await db.run(`DELETE FROM search_result_impressions`);
        await db.run(`DELETE FROM searches`);
    });

    test('getRelatedBouquetTopicsForTopic links topics through shared high-signal articles', async () => {
        await db.recordBouquetSignals('sepsis management', [
            { uid: 'pmid-1', archetype: 'guideline', compositeScore: 0.9 },
            { uid: 'pmid-2', archetype: 'rct', compositeScore: 0.8 },
            { uid: 'pmid-3', archetype: 'review', compositeScore: 0.7 },
        ]);
        await db.recordBouquetSignals('septic shock', [
            { uid: 'pmid-1', archetype: 'guideline', compositeScore: 0.9 },
            { uid: 'pmid-2', archetype: 'rct', compositeScore: 0.8 },
            { uid: 'pmid-4', archetype: 'review', compositeScore: 0.6 },
        ]);
        await db.recordBouquetSignals('asthma inhalers', [
            { uid: 'pmid-1', archetype: 'guideline', compositeScore: 0.5 },
            { uid: 'pmid-8', archetype: 'rct', compositeScore: 0.6 },
        ]);

        const related = await db.getRelatedBouquetTopicsForTopic(db.normalizeTopic('sepsis management'), {
            minSharedArticles: 2,
        });

        expect(related).toHaveLength(1);
        expect(related[0]).toMatchObject({
            normalizedTopic: db.normalizeTopic('septic shock'),
            sharedArticles: 2,
        });
    });

    test('getClusterBouquetArticlesForTopic ranks articles shared across related topics', async () => {
        await db.recordBouquetSignals('sepsis management', [
            { uid: 'pmid-1', archetype: 'guideline', compositeScore: 0.9 },
            { uid: 'pmid-2', archetype: 'rct', compositeScore: 0.8 },
        ]);
        await db.recordBouquetSignals('vasopressors in sepsis', [
            { uid: 'pmid-1', archetype: 'guideline', compositeScore: 0.9 },
            { uid: 'pmid-2', archetype: 'rct', compositeScore: 0.8 },
            { uid: 'pmid-5', archetype: 'trial', compositeScore: 0.7 },
        ]);

        const cluster = await db.getClusterBouquetArticlesForTopic(db.normalizeTopic('sepsis management'), {
            minSharedArticles: 2,
            articleLimit: 5,
        });

        expect(cluster[0]).toMatchObject({ uid: 'pmid-1', topicCount: 2 });
        expect(cluster.map((a) => a.uid)).toContain('pmid-2');
    });

    test('getStaleTopicsForRefresh prioritizes high confidence decay', async () => {
        const old = '2025-11-16T00:00:00.000Z';
        await db.recordBouquetSignals('GLP-1 agonists', [
            { uid: 'glp-1', archetype: 'rct', compositeScore: 0.9 },
            { uid: 'glp-2', archetype: 'review', compositeScore: 0.8 },
            { uid: 'glp-3', archetype: 'guideline', compositeScore: 0.7 },
        ]);
        await db.recordBouquetSignals('basic physiology', [
            { uid: 'phys-1', archetype: 'review', compositeScore: 0.9 },
            { uid: 'phys-2', archetype: 'review', compositeScore: 0.8 },
            { uid: 'phys-3', archetype: 'review', compositeScore: 0.7 },
        ]);
        await db.run(
            `INSERT INTO topic_knowledge
             (topic, normalized_topic, canonical_normalized, knowledge, source_articles, aliases_normalized, status, confidence, created_at, updated_at, last_refreshed_at)
             VALUES (?, ?, ?, ?, '[]', '[]', 'ai_generated', 0.8, ?, ?, ?)`,
            ['GLP-1 agonists', db.normalizeTopic('GLP-1 agonists'), db.normalizeTopic('GLP-1 agonists'), JSON.stringify({ mentorMessage: 'GLP-1 guide' }), old, old, old]
        );
        await db.run(
            `INSERT INTO topic_knowledge
             (topic, normalized_topic, canonical_normalized, knowledge, source_articles, aliases_normalized, status, confidence, created_at, updated_at, last_refreshed_at)
             VALUES (?, ?, ?, ?, '[]', '[]', 'ai_generated', 0.8, ?, ?, ?)`,
            ['basic physiology', db.normalizeTopic('basic physiology'), db.normalizeTopic('basic physiology'), JSON.stringify({ mentorMessage: 'Stable guide' }), old, old, old]
        );

        const stale = await db.getStaleTopicsForRefresh({
            minSignalCount: 3,
            maxAgeDays: 1,
            minPriorityScore: 0,
            limit: 5,
        });

        expect(stale[0].normalizedTopic).toBe(db.normalizeTopic('GLP-1 agonists'));
        expect(stale[0].volatility).toBe('high');
        expect(stale[0].priorityScore).toBeGreaterThan(stale[1].priorityScore);
    });

    test('getStrongMemoryTopicsForRefresh finds high-confidence topics with community engagement', async () => {
        const now = new Date().toISOString();
        const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const normalized = db.normalizeTopic('ARDS ventilation');

        // Insert topic_knowledge with high confidence
        await db.run(
            `INSERT INTO topic_knowledge
             (topic, normalized_topic, canonical_normalized, knowledge, source_articles, aliases_normalized, status, confidence, created_at, updated_at, last_refreshed_at)
             VALUES (?, ?, ?, ?, '[]', '[]', 'ai_generated', 0.85, ?, ?, ?)`,
            ['ARDS ventilation', normalized, normalized, JSON.stringify({ mentorMessage: 'ARDS guide' }), old, old, old]
        );

        // Insert a search and impressions (clicks + saves = community engagement)
        const searchRes = await db.run(
            `INSERT INTO searches (query, normalized_topic, session_id, session_sequence_index, created_at)
             VALUES (?, ?, ?, ?, ?)`,
            ['ARDS ventilation', normalized, 'sess-1', 1, now]
        );
        const searchId = searchRes.id;

        await db.run(
            `INSERT INTO search_result_impressions (search_id, session_id, article_uid, position, was_clicked, was_saved, dwell_time_ms, created_at)
             VALUES (?, ?, ?, ?, 1, 0, 45000, ?)`,
            [searchId, 'sess-1', 'pmid-ards-1', 1, now]
        );
        await db.run(
            `INSERT INTO search_result_impressions (search_id, session_id, article_uid, position, was_clicked, was_saved, dwell_time_ms, created_at)
             VALUES (?, ?, ?, ?, 0, 1, 120000, ?)`,
            [searchId, 'sess-1', 'pmid-ards-2', 2, now]
        );

        const strong = await db.getStrongMemoryTopicsForRefresh({
            minEngagementScore: 5,
            minRefreshAgeDays: 1,
            limit: 5,
        });

        expect(strong).toHaveLength(1);
        expect(strong[0].normalizedTopic).toBe(normalized);
        expect(strong[0].memoryTier).toBe('high_confidence');
        expect(strong[0].communityEngagementScore).toBe(7); // 1 click (2) + 1 save (5)
        expect(strong[0].totalDwellMs).toBe(165000);
    });

    test('getStrongMemoryTopicsForRefresh respects human_reviewed status', async () => {
        const now = new Date().toISOString();
        const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const normalized = db.normalizeTopic('sepsis bundles');

        await db.run(
            `INSERT INTO topic_knowledge
             (topic, normalized_topic, canonical_normalized, knowledge, source_articles, aliases_normalized, status, confidence, created_at, updated_at, last_refreshed_at)
             VALUES (?, ?, ?, ?, '[]', '[]', 'human_reviewed', 0.5, ?, ?, ?)`,
            ['sepsis bundles', normalized, normalized, JSON.stringify({ mentorMessage: 'Sepsis guide' }), old, old, old]
        );

        const searchRes = await db.run(
            `INSERT INTO searches (query, normalized_topic, session_id, session_sequence_index, created_at)
             VALUES (?, ?, ?, ?, ?)`,
            ['sepsis bundles', normalized, 'sess-2', 1, now]
        );
        const searchId = searchRes.id;

        await db.run(
            `INSERT INTO search_result_impressions (search_id, session_id, article_uid, position, was_clicked, was_saved, dwell_time_ms, created_at)
             VALUES (?, ?, ?, ?, 1, 1, 60000, ?)`,
            [searchId, 'sess-2', 'pmid-sepsis-1', 1, now]
        );

        const strong = await db.getStrongMemoryTopicsForRefresh({
            minEngagementScore: 5,
            minRefreshAgeDays: 1,
            limit: 5,
        });

        expect(strong).toHaveLength(1);
        expect(strong[0].memoryTier).toBe('human_reviewed');
        expect(strong[0].confidence).toBe(0.5);
    });

    test('getStrongMemoryTopicsForRefresh excludes recently refreshed topics', async () => {
        const now = new Date().toISOString();
        const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
        const normalized = db.normalizeTopic('pneumonia guidelines');

        await db.run(
            `INSERT INTO topic_knowledge
             (topic, normalized_topic, canonical_normalized, knowledge, source_articles, aliases_normalized, status, confidence, created_at, updated_at, last_refreshed_at)
             VALUES (?, ?, ?, ?, '[]', '[]', 'ai_generated', 0.9, ?, ?, ?)`,
            ['pneumonia guidelines', normalized, normalized, JSON.stringify({ mentorMessage: 'Pneumonia guide' }), now, now, recent]
        );

        const searchRes = await db.run(
            `INSERT INTO searches (query, normalized_topic, session_id, session_sequence_index, created_at)
             VALUES (?, ?, ?, ?, ?)`,
            ['pneumonia guidelines', normalized, 'sess-3', 1, now]
        );
        const searchId = searchRes.id;

        await db.run(
            `INSERT INTO search_result_impressions (search_id, session_id, article_uid, position, was_clicked, was_saved, dwell_time_ms, created_at)
             VALUES (?, ?, ?, ?, 1, 0, 30000, ?)`,
            [searchId, 'sess-3', 'pmid-pneu-1', 1, now]
        );

        const strong = await db.getStrongMemoryTopicsForRefresh({
            minEngagementScore: 1,
            minRefreshAgeDays: 14,
            limit: 5,
        });

        expect(strong).toHaveLength(0);
    });

    test('getCommunityEngagedArticlesForTopic returns engagement-weighted article UIDs', async () => {
        const now = new Date().toISOString();
        const normalized = db.normalizeTopic('heart failure');

        const searchRes = await db.run(
            `INSERT INTO searches (query, normalized_topic, session_id, session_sequence_index, created_at)
             VALUES (?, ?, ?, ?, ?)`,
            ['heart failure', normalized, 'sess-4', 1, now]
        );
        const searchId = searchRes.id;

        await db.run(
            `INSERT INTO search_result_impressions (search_id, session_id, article_uid, position, was_clicked, was_saved, dwell_time_ms, created_at)
             VALUES (?, ?, ?, ?, 1, 0, 30000, ?)`,
            [searchId, 'sess-4', 'pmid-hf-1', 1, now]
        );
        await db.run(
            `INSERT INTO search_result_impressions (search_id, session_id, article_uid, position, was_clicked, was_saved, dwell_time_ms, created_at)
             VALUES (?, ?, ?, ?, 0, 1, 90000, ?)`,
            [searchId, 'sess-4', 'pmid-hf-2', 2, now]
        );
        await db.run(
            `INSERT INTO search_result_impressions (search_id, session_id, article_uid, position, was_clicked, was_saved, dwell_time_ms, created_at)
             VALUES (?, ?, ?, ?, 1, 0, 20000, ?)`,
            [searchId, 'sess-4', 'pmid-hf-1', 3, now]
        );

        const engaged = await db.getCommunityEngagedArticlesForTopic(normalized, 5);

        expect(engaged).toHaveLength(2);
        expect(engaged[0].uid).toBe('pmid-hf-2'); // save = 5
        expect(Number(engaged[0].engagement_score)).toBe(5);
        expect(engaged[1].uid).toBe('pmid-hf-1'); // 2 clicks = 4
        expect(Number(engaged[1].engagement_score)).toBe(4);
    });
});
