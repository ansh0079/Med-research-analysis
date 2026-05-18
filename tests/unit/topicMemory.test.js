// ==========================================
// Topic Memory Unit Tests
// Runs against real SQLite to test JSON serialization, scoring, and promotion logic
// ==========================================

const path = require('path');
const fs = require('fs');
const { Database } = require('../../database');

const TEST_DB_PATH = path.join(__dirname, '__topic_memory_test__.db');

describe('Topic Memory (real SQLite)', () => {
    let db;

    beforeAll(async () => {
        if (fs.existsSync(TEST_DB_PATH)) {
            fs.unlinkSync(TEST_DB_PATH);
        }
        db = new Database(TEST_DB_PATH);
        await db.connect();
        await db.runMigrations();
        // Insert a test user (required for FK constraints)
        await db.run(
            `INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)`,
            ['u-test', 'test@example.com', 'hash', 'Test User', 'user']
        );
    });

    afterAll(async () => {
        await db.close();
        if (fs.existsSync(TEST_DB_PATH)) {
            fs.unlinkSync(TEST_DB_PATH);
        }
    });

    beforeEach(async () => {
        // Clean topic memory and related tables between tests
        await db.run(`DELETE FROM user_topic_memory WHERE user_id = ?`, ['u-test']);
        await db.run(`DELETE FROM user_topic_mastery WHERE user_id = ?`, ['u-test']);
        await db.run(`DELETE FROM topic_knowledge_proposals WHERE created_by = ?`, ['u-test']);
    });

    // ==========================================
    // _memoryTierFromScore
    // ==========================================
    test('_memoryTierFromScore returns correct tiers', () => {
        expect(db._memoryTierFromScore(0)).toBe('sparse');
        expect(db._memoryTierFromScore(0.27)).toBe('sparse');
        expect(db._memoryTierFromScore(0.28)).toBe('building');
        expect(db._memoryTierFromScore(0.5)).toBe('building');
        expect(db._memoryTierFromScore(0.61)).toBe('building');
        expect(db._memoryTierFromScore(0.62)).toBe('strong');
        expect(db._memoryTierFromScore(1.0)).toBe('strong');
    });

    // ==========================================
    // _computeTopicMemoryScores
    // ==========================================
    test('_computeTopicMemoryScores: all zeros = sparse', () => {
        const row = { search_count: 0, top_article_uids: '[]', saved_article_uids: '[]', weak_outline_node_ids: '[]' };
        const { memoryScore, memoryTier } = db._computeTopicMemoryScores(row, null);
        expect(memoryTier).toBe('sparse');
        expect(memoryScore).toBeGreaterThanOrEqual(0);
        expect(memoryScore).toBeLessThan(0.28);
    });

    test('_computeTopicMemoryScores: high search + top articles = building/strong', () => {
        const row = {
            search_count: 10,
            top_article_uids: JSON.stringify([{ uid: 'a1' }, { uid: 'a2' }, { uid: 'a3' }, { uid: 'a4' }, { uid: 'a5' }, { uid: 'a6' }]),
            saved_article_uids: JSON.stringify([{ uid: 's1' }]),
            weak_outline_node_ids: '[]',
        };
        const masteryRow = { overall_score: 80, attempts_count: 24 };
        const { memoryScore, memoryTier } = db._computeTopicMemoryScores(row, masteryRow);
        expect(memoryScore).toBeGreaterThanOrEqual(0.62);
        expect(memoryTier).toBe('strong');
    });

    test('_computeTopicMemoryScores: weak nodes contribute correctly', () => {
        const row = {
            search_count: 5,
            top_article_uids: JSON.stringify([{ uid: 'a1' }, { uid: 'a2' }, { uid: 'a3' }]),
            saved_article_uids: '[]',
            weak_outline_node_ids: JSON.stringify(['node-1', 'node-2', 'node-3', 'node-4', 'node-5', 'node-6', 'node-7', 'node-8']),
        };
        const { memoryScore, memoryTier } = db._computeTopicMemoryScores(row, null);
        expect(memoryScore).toBeGreaterThanOrEqual(0.28);
        expect(memoryTier).toBe('building');
    });

    // ==========================================
    // mapUserTopicMemoryRow
    // ==========================================
    test('mapUserTopicMemoryRow maps fields and parses JSON arrays', () => {
        const row = {
            user_id: 'u-test',
            normalized_topic: 'ards',
            display_topic: 'ARDS',
            search_count: 3,
            last_search_at: '2024-01-01T00:00:00Z',
            top_article_uids: JSON.stringify([{ uid: 'a1', w: 2 }]),
            saved_article_uids: JSON.stringify([{ uid: 's1', w: 1 }]),
            weak_outline_node_ids: JSON.stringify(['n1']),
            memory_score: 0.45,
            memory_tier: 'building',
            promoted_proposal_at: null,
            updated_at: '2024-01-01T00:00:00Z',
        };
        const mapped = db.mapUserTopicMemoryRow(row);
        expect(mapped.userId).toBe('u-test');
        expect(mapped.normalizedTopic).toBe('ards');
        expect(mapped.displayTopic).toBe('ARDS');
        expect(mapped.searchCount).toBe(3);
        expect(mapped.topPaperCount).toBe(1);
        expect(mapped.savedPaperCount).toBe(1);
        expect(mapped.weakOutlineNodeIds).toEqual(['n1']);
        expect(mapped.memoryScore).toBe(0.45);
        expect(mapped.memoryTier).toBe('building');
        expect(mapped.promotedProposalAt).toBeNull();
    });

    test('mapUserTopicMemoryRow returns null for null input', () => {
        expect(db.mapUserTopicMemoryRow(null)).toBeNull();
    });

    // ==========================================
    // recordUserTopicSearchSignal
    // ==========================================
    test('recordUserTopicSearchSignal creates row and increments search_count', async () => {
        const result = await db.recordUserTopicSearchSignal('u-test', 'sepsis management', ['pmid-1', 'pmid-2']);
        expect(result).not.toBeNull();
        expect(result.searchCount).toBe(1);
        expect(result.topPaperCount).toBe(2);
        expect(result.memoryTier).toBe('sparse');
    });

    test('recordUserTopicSearchSignal increments search_count on repeated calls', async () => {
        await db.recordUserTopicSearchSignal('u-test', 'sepsis management', ['pmid-1']);
        const result = await db.recordUserTopicSearchSignal('u-test', 'sepsis management', ['pmid-2', 'pmid-3']);
        expect(result.searchCount).toBe(2);
        expect(result.topPaperCount).toBe(3);
    });

    test('recordUserTopicSearchSignal deduplicates top UIDs with weighting', async () => {
        await db.recordUserTopicSearchSignal('u-test', 'sepsis management', ['pmid-1', 'pmid-2']);
        const result = await db.recordUserTopicSearchSignal('u-test', 'sepsis management', ['pmid-1', 'pmid-3']);
        expect(result.topPaperCount).toBe(3); // pmid-1, pmid-2, pmid-3
    });

    // ==========================================
    // recordUserTopicSavedArticleSignal
    // ==========================================
    test('recordUserTopicSavedArticleSignal appends article UID to saved_article_uids', async () => {
        const result = await db.recordUserTopicSavedArticleSignal('u-test', 'sepsis management', 'pmid-save-1');
        expect(result).not.toBeNull();
        expect(result.savedPaperCount).toBe(1);
        expect(result.savedArticles[0].uid).toBe('pmid-save-1');
    });

    test('recordUserTopicSavedArticleSignal deduplicates saved UIDs', async () => {
        await db.recordUserTopicSavedArticleSignal('u-test', 'sepsis management', 'pmid-save-1');
        const result = await db.recordUserTopicSavedArticleSignal('u-test', 'sepsis management', 'pmid-save-1');
        expect(result.savedPaperCount).toBe(1);
        expect(result.savedArticles[0].w).toBe(2); // weight incremented
    });

    // ==========================================
    // mergeUserTopicWeakOutlineNodes
    // ==========================================
    test('mergeUserTopicWeakOutlineNodes creates row with weak nodes', async () => {
        const attempts = [
            { isCorrect: false, outlineNodeId: 'tp-1' },
            { isCorrect: true, outlineNodeId: 'tp-2' },
            { isCorrect: false, outlineNodeId: 'mcq-1' },
        ];
        const result = await db.mergeUserTopicWeakOutlineNodes('u-test', 'sepsis management', attempts);
        expect(result).not.toBeNull();
        expect(result.weakOutlineNodeIds).toContain('tp-1');
        expect(result.weakOutlineNodeIds).toContain('mcq-1');
        expect(result.weakOutlineNodeIds).not.toContain('tp-2');
    });

    test('mergeUserTopicWeakOutlineNodes deduplicates and preserves existing weak nodes', async () => {
        await db.mergeUserTopicWeakOutlineNodes('u-test', 'sepsis management', [
            { isCorrect: false, outlineNodeId: 'tp-1' },
        ]);
        const result = await db.mergeUserTopicWeakOutlineNodes('u-test', 'sepsis management', [
            { isCorrect: false, outlineNodeId: 'tp-1' },
            { isCorrect: false, outlineNodeId: 'tp-2' },
        ]);
        expect(result.weakOutlineNodeIds).toEqual(['tp-1', 'tp-2']);
    });

    test('mergeUserTopicWeakOutlineNodes with no incorrect attempts finalizes existing row', async () => {
        await db.recordUserTopicSearchSignal('u-test', 'sepsis management', ['pmid-1']);
        const result = await db.mergeUserTopicWeakOutlineNodes('u-test', 'sepsis management', [
            { isCorrect: true, outlineNodeId: 'tp-1' },
        ]);
        expect(result).not.toBeNull();
        expect(result.searchCount).toBe(1);
    });

    test('mergeUserTopicWeakOutlineNodes returns null when no row exists and no weak nodes', async () => {
        const result = await db.mergeUserTopicWeakOutlineNodes('u-test', 'sepsis management', [
            { isCorrect: true, outlineNodeId: 'tp-1' },
        ]);
        expect(result).toBeNull();
    });

    // ==========================================
    // maybePromoteAdaptiveTopicProposal
    // ==========================================
    test('maybePromoteAdaptiveTopicProposal does nothing if tier is not strong', async () => {
        await db.recordUserTopicSearchSignal('u-test', 'sepsis management', ['pmid-1']);
        const row = await db.get(`SELECT * FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, ['u-test', 'sepsis-management']);
        const result = await db.maybePromoteAdaptiveTopicProposal('u-test', row);
        expect(result).toBeNull();
    });

    test('maybePromoteAdaptiveTopicProposal does nothing if already promoted', async () => {
        // Manually create a strong-memory row with promoted_proposal_at set
        await db.recordUserTopicSearchSignal('u-test', 'sepsis management', ['pmid-1', 'pmid-2', 'pmid-3', 'pmid-4', 'pmid-5', 'pmid-6']);
        await db.run(`UPDATE user_topic_memory SET memory_tier = ?, promoted_proposal_at = ? WHERE user_id = ? AND normalized_topic = ?`, [
            'strong', new Date().toISOString(), 'u-test', 'sepsis-management'
        ]);
        const row = await db.get(`SELECT * FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, ['u-test', 'sepsis-management']);
        const result = await db.maybePromoteAdaptiveTopicProposal('u-test', row);
        expect(result).toBeNull();
    });

    test('maybePromoteAdaptiveTopicProposal does nothing if search_count < 5', async () => {
        for (let i = 0; i < 4; i++) {
            await db.recordUserTopicSearchSignal('u-test', 'sepsis management', ['pmid-1', 'pmid-2', 'pmid-3']);
        }
        await db.run(`UPDATE user_topic_memory SET memory_tier = ? WHERE user_id = ? AND normalized_topic = ?`, [
            'strong', 'u-test', 'sepsis management'
        ]);
        const row = await db.get(`SELECT * FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, ['u-test', 'sepsis management']);
        expect(Number(row.search_count)).toBe(4);
        const result = await db.maybePromoteAdaptiveTopicProposal('u-test', row);
        expect(result).toBeNull();
    });

    test('maybePromoteAdaptiveTopicProposal does nothing if top articles < 3', async () => {
        for (let i = 0; i < 5; i++) {
            await db.recordUserTopicSearchSignal('u-test', 'sepsis management', ['pmid-1']);
        }
        await db.run(`UPDATE user_topic_memory SET memory_tier = ? WHERE user_id = ? AND normalized_topic = ?`, [
            'strong', 'u-test', 'sepsis management'
        ]);
        const row = await db.get(`SELECT * FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, ['u-test', 'sepsis management']);
        const result = await db.maybePromoteAdaptiveTopicProposal('u-test', row);
        expect(result).toBeNull();
    });

    test('maybePromoteAdaptiveTopicProposal creates proposal when all conditions met', async () => {
        // Build a strong-memory row with 10 searches and 6+ top articles + mastery
        for (let i = 0; i < 10; i++) {
            await db.recordUserTopicSearchSignal('u-test', 'sepsis management', [
                'pmid-1', 'pmid-2', 'pmid-3', 'pmid-4', 'pmid-5', 'pmid-6'
            ]);
        }
        // Add high mastery to push score into strong tier
        await db.run(`INSERT INTO user_topic_mastery (user_id, topic, normalized_topic, overall_score, attempts_count) VALUES (?, ?, ?, ?, ?)`, [
            'u-test', 'sepsis management', 'sepsis management', 95, 30
        ]);
        // Re-finalize to pick up mastery and compute tier — this auto-triggers promotion
        const finalized = await db._finalizeUserTopicMemory('u-test', 'sepsis management');

        expect(finalized.memoryTier).toBe('strong');
        expect(finalized.searchCount).toBeGreaterThanOrEqual(5);

        // Because _finalizeUserTopicMemory calls maybePromoteAdaptiveTopicProposal,
        // the proposal should already be created and promoted_proposal_at set.
        const row = await db.get(`SELECT * FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, ['u-test', 'sepsis management']);
        expect(row.promoted_proposal_at).not.toBeNull();

        // Verify the proposal actually exists
        const proposals = await db.listTopicKnowledgeProposals({ topic: 'sepsis management', status: 'pending_review' });
        expect(proposals.total).toBeGreaterThanOrEqual(1);
        expect(proposals.proposals[0].topic).toBe('sepsis management');
    });

    test('maybePromoteAdaptiveTopicProposal does nothing if a pending proposal already exists', async () => {
        // First promotion should work
        for (let i = 0; i < 5; i++) {
            await db.recordUserTopicSearchSignal('u-test', 'sepsis management', ['pmid-1', 'pmid-2', 'pmid-3']);
        }
        await db.run(`INSERT INTO user_topic_mastery (user_id, topic, normalized_topic, overall_score, attempts_count) VALUES (?, ?, ?, ?, ?)`, [
            'u-test', 'sepsis management', 'sepsis management', 95, 30
        ]);
        await db._finalizeUserTopicMemory('u-test', 'sepsis management');
        const row = await db.get(`SELECT * FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, ['u-test', 'sepsis management']);
        await db.maybePromoteAdaptiveTopicProposal('u-test', row);

        // Reset promoted flag to simulate re-attempt
        await db.run(`UPDATE user_topic_memory SET promoted_proposal_at = NULL WHERE user_id = ? AND normalized_topic = ?`, ['u-test', 'sepsis management']);
        const row2 = await db.get(`SELECT * FROM user_topic_memory WHERE user_id = ? AND normalized_topic = ?`, ['u-test', 'sepsis management']);

        // Second promotion should fail because pending proposal exists
        const result = await db.maybePromoteAdaptiveTopicProposal('u-test', row2);
        expect(result).toBeNull();
    });
});
