/**
 * Database Integration Tests
 * These run against a REAL SQLite file to catch schema/runtime mismatches
 * that unit tests (which mock the entire db object) cannot detect.
 *
 * Run: npx jest tests/integration/db.integration.test.js
 */

const dbModule = require('../../database');
const Database = dbModule.Database;
const path = require('path');
const fs = require('fs');

const TEST_DB_PATH = path.join(__dirname, '__test_db__.db');

describe('Database Integration (real SQLite)', () => {
    let db;

    beforeAll(async () => {
        // Clean up any previous test database
        if (fs.existsSync(TEST_DB_PATH)) {
            fs.unlinkSync(TEST_DB_PATH);
        }
        db = new Database(TEST_DB_PATH);
        await db.connect();
        await db.runMigrations();
    });

    afterEach(async () => {
        // Clean up all tables that tests mutate to ensure isolation
        const tables = [
            'search_result_impressions',
            'search_result_feedback',
            'quiz_attempts',
            'study_runs',
            'teaching_object_claims',
            'teaching_objects',
            'topic_knowledge_proposals',
            'topic_knowledge',
            'search_alerts',
            'analysis_cache',
            'annotations',
            'article_cache',
            'searches',
            'saved_articles',
            'sessions',
            'users',
        ];
        for (const table of tables) {
            try {
                await db.run(`DELETE FROM ${table}`);
            } catch {
                /* ignore tables that don't exist or have FK constraints */
            }
        }
    });

    afterAll(async () => {
        await db.close();
        if (fs.existsSync(TEST_DB_PATH)) {
            fs.unlinkSync(TEST_DB_PATH);
        }
    });

    // ==========================================
    // Session Management
    // ==========================================
    test('db.createSession creates a session record', async () => {
        await db.createSession('sess-001', 'Mozilla/5.0', '127.0.0.1', { theme: 'dark' });
        const row = await db.get('SELECT * FROM sessions WHERE id = ?', ['sess-001']);
        expect(row).toBeTruthy();
        expect(row.id).toBe('sess-001');
    });

    test('db.updateSessionActivity updates last_active', async () => {
        await db.createSession('sess-activity', 'Mozilla/5.0', '127.0.0.1');
        const before = await db.get('SELECT last_active FROM sessions WHERE id = ?', ['sess-activity']);
        await new Promise(r => setTimeout(r, 50));
        await db.updateSessionActivity('sess-activity');
        const after = await db.get('SELECT last_active FROM sessions WHERE id = ?', ['sess-activity']);
        expect(new Date(after.last_active).getTime()).toBeGreaterThanOrEqual(new Date(before.last_active).getTime());
    });

    // ==========================================
    // Saved Articles (Session-based)
    // ==========================================
    test('db.saveArticle saves an article for a session', async () => {
        const article = {
            uid: 'pmid-12345',
            title: 'Test Article',
            abstract: 'This is a test.',
            authors: [{ name: 'Dr. Test' }]
        };
        await db.saveArticle('sess-001', article);
        const rows = await db.getSavedArticles('sess-001');
        expect(rows.length).toBeGreaterThanOrEqual(1);
        expect(rows.find(r => r.uid === 'pmid-12345')).toBeTruthy();
    });

    test('db.unsaveArticle removes an article from a session', async () => {
        await db.createSession('sess-unsave', 'Mozilla/5.0', '127.0.0.1');
        const article = { uid: 'pmid-unsave-1', title: 'To Remove', abstract: 'Test' };
        await db.saveArticle('sess-unsave', article);
        await db.unsaveArticle('sess-unsave', 'pmid-unsave-1');
        const rows = await db.getSavedArticles('sess-unsave');
        expect(rows.find(r => r.uid === 'pmid-unsave-1')).toBeFalsy();
    });

    // ==========================================
    // Search Logging
    // ==========================================
    test('db.logSearch records a search', async () => {
        await db.createSession('sess-search', 'Mozilla/5.0', '127.0.0.1');
        await db.logSearch('sess-search', 'cancer immunotherapy', ['pubmed'], { sort: 'relevance' }, 42, 150, '127.0.0.1');
        const rows = await db.getSearchHistory('sess-search');
        expect(rows.length).toBeGreaterThanOrEqual(1);
        expect(rows[0].query).toBe('cancer immunotherapy');
    });

    // ==========================================
    // Cache Maintenance
    // ==========================================
    test('db.cleanExpiredCache deletes expired article_cache entries', async () => {
        // Insert an expired cache entry
        await db.run(
            `INSERT INTO article_cache (id, source, data, title, expires_at) VALUES (?, ?, ?, ?, datetime('now', '-1 day'))`,
            ['expired-1', 'pubmed', '{}', 'Expired']
        );
        const cleaned = await db.cleanExpiredCache();
        expect(typeof cleaned).toBe('number');
        expect(cleaned).toBeGreaterThanOrEqual(1);
    });

    // ==========================================
    // Annotations
    // ==========================================
    test('db.createAnnotation and db.getAnnotationsByArticle work', async () => {
        const result = await db.createAnnotation('pmid-99999', 'user-1', 'Alice', 'This is important.', JSON.stringify({ page: 1 }));
        expect(result.id).toBeTruthy();
        const rows = await db.getAnnotationsByArticle('pmid-99999');
        expect(rows.length).toBeGreaterThanOrEqual(1);
        expect(rows[0].text).toBe('This is important.');
    });

    // ==========================================
    // Analysis Cache
    // ==========================================
    test('db.cacheAnalysis and db.getCachedAnalysis work', async () => {
        const result = { summary: 'Test summary', findings: [] };
        await db.cacheAnalysis('pmid-88888', 'quick', 'gemini-2.0-flash', result, 150, 0.002);
        const cached = await db.getCachedAnalysis('pmid-88888', 'quick', 'gemini-2.0-flash');
        expect(cached).toBeTruthy();
        expect(cached.summary).toBe('Test summary');
    });

    // ==========================================
    // Search Alerts (schema alignment)
    // ==========================================
    test('db.createSearchAlert stores sources column', async () => {
        // Create a dummy user first
        await db.run(
            `INSERT OR IGNORE INTO users (id, email, password) VALUES (?, ?, ?)`,
            ['user-alert-1', 'alert-test@example.com', 'hashedpass']
        );
        const alertData = {
            query: 'diabetes treatment',
            frequency: 'weekly',
            sources: JSON.stringify(['pubmed', 'semantic']),
            email: 'alert-test@example.com'
        };
        const result = await db.createSearchAlert('user-alert-1', alertData);
        expect(result.id).toBeTruthy();
        const row = await db.get('SELECT * FROM search_alerts WHERE id = ?', [result.id]);
        expect(row.query).toBe('diabetes treatment');
    });

    test('reviewed topic knowledge is protected from AI overwrite and creates a proposal', async () => {
        await db.upsertTopicKnowledge(
            'ARDS',
            { mentorMessage: 'Reviewed baseline', seminalPapers: [{ sourceIndex: 1, title: 'Berlin Definition' }] },
            [{ sourceIndex: 1, title: 'Berlin Definition' }],
            'human_reviewed',
            0.95
        );

        const attempted = await db.upsertTopicKnowledge(
            'ARDS',
            { mentorMessage: 'AI replacement', seminalPapers: [{ sourceIndex: 1, title: 'Noisy new paper' }] },
            [{ sourceIndex: 1, title: 'Noisy new paper' }],
            'ai_generated',
            0.4
        );

        expect(attempted.protected).toBe(true);
        expect(attempted.proposalCreated).toBe(true);

        const stored = await db.getTopicKnowledge('ARDS');
        expect(stored.knowledge.mentorMessage).toBe('Reviewed baseline');
        expect(stored.knowledge.seminalPapers[0].title).toBe('Berlin Definition');

        const pending = await db.listTopicKnowledgeProposals({ topic: 'ARDS' });
        expect(pending.total).toBeGreaterThanOrEqual(1);
        expect(pending.proposals[0].knowledge.mentorMessage).toBe('AI replacement');

        const approved = await db.approveTopicKnowledgeProposal(pending.proposals[0].id, 'curator-1');
        expect(approved.topicKnowledge.status).toBe('human_reviewed');
        expect(approved.topicKnowledge.knowledge.mentorMessage).toBe('AI replacement');
        expect(approved.proposal.status).toBe('approved');
    });

    test('study runs persist outline coverage from linked quiz attempts', async () => {
        await db.run(
            `INSERT OR IGNORE INTO users (id, email, password) VALUES (?, ?, ?)`,
            ['study-user-1', 'study-user@example.com', 'hashedpass']
        );
        const topicKnowledge = await db.upsertTopicKnowledge(
            'ARDS Study Run',
            {
                teachingPoints: [
                    { claim: 'Use low tidal volume ventilation', sourceIndices: [1] },
                    { claim: 'Prone severe ARDS early', sourceIndices: [2] },
                ],
            },
            [{ sourceIndex: 1, title: 'ARMA trial' }, { sourceIndex: 2, title: 'PROSEVA' }],
            'human_reviewed',
            0.95
        );

        const initialCoverage = {
            'tp-1': { seen: false, quizAttempts: 0, correct: 0, lastAttemptAt: null },
            'tp-2': { seen: false, quizAttempts: 0, correct: 0, lastAttemptAt: null },
        };
        const run = await db.createStudyRun('study-user-1', {
            topic: 'ARDS Study Run',
            outlineId: topicKnowledge.id,
            progress: { totalNodes: 2, coveredNodes: 0 },
            nodeCoverage: initialCoverage,
        });

        await db.createQuizAttempt({
            userId: 'study-user-1',
            topic: 'ARDS Study Run',
            questionId: 'q-low-vt',
            questionType: 'recall',
            questionText: 'Which ventilation strategy is evidence based?',
            userAnswer: 'A',
            correctAnswer: 'A',
            isCorrect: true,
            studyRunId: run.id,
            outlineNodeId: 'tp-1',
        });

        const updatedCoverage = {
            ...run.nodeCoverage,
            'tp-1': { seen: true, quizAttempts: 1, correct: 1, lastAttemptAt: new Date().toISOString() },
        };
        await db.updateStudyRun(run.id, {
            nodeCoverage: updatedCoverage,
            progress: { totalNodes: 2, coveredNodes: 1, quizAttempts: 1 },
        });

        const reloaded = await db.getStudyRun(run.id);
        expect(reloaded.outlineId).toBe(topicKnowledge.id);
        expect(reloaded.progress).toMatchObject({ totalNodes: 2, coveredNodes: 1, quizAttempts: 1 });
        expect(reloaded.nodeCoverage['tp-1']).toMatchObject({ seen: true, quizAttempts: 1, correct: 1 });

        const attempts = await db.getQuizAttempts({ userId: 'study-user-1', topic: 'ARDS Study Run' });
        expect(attempts[0]).toMatchObject({
            studyRunId: run.id,
            outlineNodeId: 'tp-1',
            isCorrect: true,
        });
    });

    test('quiz attempts persist evidence judgement tags and profile aggregates them', async () => {
        await db.run(
            `INSERT OR IGNORE INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)`,
            ['u-judgement', 'judge@example.com', 'hash', 'Judge User', 'user']
        );

        await db.createQuizAttempt({
            userId: 'u-judgement',
            topic: 'Sepsis',
            questionId: 'q-judge-1',
            questionType: 'trial_interpretation',
            questionText: 'Which limitation stops you overclaiming this subgroup result?',
            userAnswer: 'It changes practice for all patients',
            correctAnswer: 'It is hypothesis-generating and needs confirmation',
            isCorrect: false,
            reasoningTags: ['overclaims_evidence', 'misses_applicability'],
            reasoningNote: 'Auto-classified evidence judgement signal: overclaims_evidence, misses_applicability',
        });

        const row = await db.get(`SELECT reasoning_tags, reasoning_note FROM quiz_attempts WHERE user_id = ?`, ['u-judgement']);
        expect(JSON.parse(row.reasoning_tags)).toEqual(['overclaims_evidence', 'misses_applicability']);
        expect(row.reasoning_note).toContain('overclaims_evidence');

        const attempts = await db.getQuizAttempts({ userId: 'u-judgement', topic: 'Sepsis' });
        expect(attempts[0]).toMatchObject({ reasoningTags: ['overclaims_evidence', 'misses_applicability'] });

        const profile = await db.getEvidenceJudgementProfile('u-judgement', { topic: 'Sepsis', limit: 5 });
        expect(profile.tags.map((tag) => tag.tag)).toEqual(expect.arrayContaining(['overclaims_evidence', 'misses_applicability']));
        expect(profile.topics[0]).toMatchObject({ topic: 'sepsis', attempts: 1, correct: 0, accuracy: 0 });
    });

    test('practice-changing teaching objects return dashboard alert shape', async () => {
        await db.upsertTeachingObject({
            objectKey: 'paper:practice-alert-1',
            objectType: 'paper',
            articleUid: 'pmid-practice-alert-1',
            topic: 'COPD',
            title: 'Practice changing COPD trial',
            confidence: 0.8,
            payload: {
                claimAnchors: [
                    {
                        claimKey: 'practice-alert-claim-1',
                        claimText: 'This finding may change practice for selected COPD patients.',
                        conceptKey: 'clinical_bottom_line',
                        verificationStatus: 'source_verified',
                    },
                ],
            },
        });

        const alerts = await db.listPracticeChangingTeachingObjects({ topic: 'COPD', limit: 5 });
        expect(alerts[0]).toMatchObject({
            objectKey: 'paper:practice-alert-1',
            title: 'Practice changing COPD trial',
            topic: 'COPD',
            classification: 'practice_changing',
            rationale: 'This finding may change practice for selected COPD patients.',
        });
    });

    // ==========================================
    // Session Trajectory & Impressions (Sprint 2-3)
    // ==========================================
    test('db.getMaxSessionSequenceIndex returns correct max index', async () => {
        const sess = 'sess-seq-001';
        await db.createSession(sess, 'Test', '127.0.0.1');
        await db.logSearch(sess, 'query-a', ['pubmed'], {}, 10, 100, '127.0.0.1', { sessionSequenceIndex: 1 });
        await db.logSearch(sess, 'query-b', ['pubmed'], {}, 10, 100, '127.0.0.1', { sessionSequenceIndex: 2 });
        await db.logSearch(sess, 'query-c', ['pubmed'], {}, 10, 100, '127.0.0.1', { sessionSequenceIndex: 3 });

        const max = await db.getMaxSessionSequenceIndex(sess);
        expect(max).toBe(3);

        const empty = await db.getMaxSessionSequenceIndex('nonexistent-session');
        expect(empty).toBe(0);
    });

    test('db.getPreviousSearchInSession returns the prior search', async () => {
        const sess = 'sess-prev-001';
        await db.createSession(sess, 'Test', '127.0.0.1');
        await db.logSearch(sess, 'first', ['pubmed'], {}, 5, 50, '127.0.0.1', { sessionSequenceIndex: 1 });
        await db.logSearch(sess, 'second', ['pubmed'], {}, 8, 60, '127.0.0.1', { sessionSequenceIndex: 2, previousQueries: ['first'] });

        const prev = await db.getPreviousSearchInSession(sess, 2);
        expect(prev).toBeTruthy();
        expect(prev.query).toBe('first');
        expect(prev.session_sequence_index).toBe(1);

        const none = await db.getPreviousSearchInSession(sess, 1);
        expect(none).toBeFalsy();
    });

    test('db.recordSearchImpressions and db.getImpressionsForSearch work', async () => {
        const sess = 'sess-imp-001';
        await db.createSession(sess, 'Test', '127.0.0.1');
        await db.logSearch(sess, 'impression test', ['pubmed'], {}, 3, 50, '127.0.0.1', { sessionSequenceIndex: 1 });
        const searches = await db.getSearchHistory(sess, 1);
        const searchId = searches[0].id;

        await db.recordSearchImpressions(searchId, sess, [
            { articleUid: 'pmid-1001', position: 1 },
            { articleUid: 'pmid-1002', position: 2 },
            { articleUid: 'pmid-1003', position: 3 },
        ]);

        const impressions = await db.getImpressionsForSearch(searchId);
        expect(impressions.length).toBe(3);
        expect(impressions[0].article_uid).toBe('pmid-1001');
        expect(impressions[0].position).toBe(1);
        expect(impressions[1].article_uid).toBe('pmid-1002');
        expect(impressions[2].was_clicked).toBe(0);
    });

    test('db.updateSearchImpressionInteraction updates click, save and dwell', async () => {
        const sess = 'sess-imp-002';
        await db.createSession(sess, 'Test', '127.0.0.1');
        await db.logSearch(sess, 'interaction test', ['pubmed'], {}, 2, 50, '127.0.0.1', { sessionSequenceIndex: 1 });
        const searches = await db.getSearchHistory(sess, 1);
        const searchId = searches[0].id;

        await db.recordSearchImpressions(searchId, sess, [
            { articleUid: 'pmid-2001', position: 1 },
            { articleUid: 'pmid-2002', position: 2 },
        ]);

        await db.updateSearchImpressionInteraction(searchId, 'pmid-2001', { wasClicked: true, dwellTimeMs: 45000 });
        await db.updateSearchImpressionInteraction(searchId, 'pmid-2002', { wasSaved: true });

        const impressions = await db.getImpressionsForSearch(searchId);
        const imp1 = impressions.find(i => i.article_uid === 'pmid-2001');
        const imp2 = impressions.find(i => i.article_uid === 'pmid-2002');

        expect(imp1.was_clicked).toBe(1);
        expect(imp1.dwell_time_ms).toBe(45000);
        expect(imp2.was_saved).toBe(1);
        expect(imp2.was_clicked).toBe(0);
    });

    test('db.getRecentImpressions returns impressions within time window', async () => {
        const sess = 'sess-imp-003';
        await db.createSession(sess, 'Test', '127.0.0.1');
        await db.logSearch(sess, 'recent test', ['pubmed'], {}, 2, 50, '127.0.0.1', { sessionSequenceIndex: 1 });
        const searches = await db.getSearchHistory(sess, 1);
        const searchId = searches[0].id;

        await db.recordSearchImpressions(searchId, sess, [
            { articleUid: 'pmid-3001', position: 1 },
        ]);
        await db.updateSearchImpressionInteraction(searchId, 'pmid-3001', { wasClicked: true, dwellTimeMs: 5000 });

        const recent = await db.getRecentImpressions(sess, { days: 1, limit: 10 });
        expect(recent.length).toBeGreaterThanOrEqual(1);
        const found = recent.find(r => r.article_uid === 'pmid-3001');
        expect(found).toBeTruthy();
        expect(found.was_clicked).toBe(1);

        const old = await db.getRecentImpressions(sess, { days: 0, limit: 10 });
        expect(old.length).toBe(0);
    });
});
