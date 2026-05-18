const Database = require('../../database').Database; // Get the class, not the singleton
const path = require('path');
const fs = require('fs');

describe('Database Integration Tests (SQLite)', () => {
    let db;
    const TEST_DB_PATH = ':memory:'; // Use in-memory SQLite for speed and isolation

    beforeAll(async () => {
        // Create a new Database instance for these tests
        db = new Database(TEST_DB_PATH);
        await db.connect();
        // Manually initialize schema for in-memory DB
        const schemaPath = path.join(__dirname, '../../database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db._bs.exec(schema); // Access internal BetterSqlite instance
        // Ensure _migrations table is created (it's created by db.initialize() but we're doing it manually here)
        db._bs.exec(`CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        // Ensure annotations table is created (it's created by db.initialize() but we're doing it manually here)
        db._bs.exec(`
            CREATE TABLE IF NOT EXISTS annotations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                article_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                user_name TEXT,
                text TEXT NOT NULL,
                position TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
    });

    afterEach(async () => {
        // Clear tables after each test to ensure isolation
        await db.run('DELETE FROM searches');
        await db.run('DELETE FROM article_cache');
        await db.run('DELETE FROM analysis_cache');
        await db.run('DELETE FROM pico_extractions');
        await db.run('DELETE FROM review_articles');
        await db.run('DELETE FROM review_projects');
        await db.run('DELETE FROM topic_guidelines');
        await db.run('DELETE FROM topic_knowledge');
        await db.run('DELETE FROM topic_knowledge_proposals');
        await db.run('DELETE FROM search_alerts');
        await db.run('DELETE FROM team_saved_articles');
        await db.run('DELETE FROM team_members');
        await db.run('DELETE FROM teams');
        await db.run('DELETE FROM team_collections'); // Added for completeness
        await db.run('DELETE FROM team_collection_articles'); // Added for completeness
        await db.run('DELETE FROM team_invitations'); // Added for completeness
        await db.run('DELETE FROM user_saved_articles');
        await db.run('DELETE FROM users');
        await db.run('DELETE FROM saved_articles');
        await db.run('DELETE FROM sessions');
        await db.run('DELETE FROM user_topic_mastery');
        await db.run('DELETE FROM case_attempts');
        await db.run('DELETE FROM agent_conversations');
        await db.run('DELETE FROM quiz_attempts');
        await db.run('DELETE FROM user_learning_profiles');
        await db.run('DELETE FROM audit_logs');
        await db.run('DELETE FROM analytics');
        await db.run('DELETE FROM billing_audit_log');
        await db.run('DELETE FROM annotations');
    });

    afterAll(async () => {
        await db.close();
    });

    // --- Test Cases ---

    test('should connect to an in-memory SQLite database', async () => {
        expect(db._bs).toBeDefined();
        expect(db.kysely).toBeDefined();
        const result = await db.get('SELECT name FROM sqlite_master WHERE type="table" AND name="searches"');
        expect(result).toBeDefined();
        expect(result.name).toBe('searches');
    });

    test('run, get, all methods should work correctly', async () => {
        const insertResult = await db.run('INSERT INTO users (id, email) VALUES (?, ?)', ['user1', 'test@example.com']);
        expect(insertResult.changes).toBe(1);
        expect(insertResult.id).toBeGreaterThan(0);

        const user = await db.get('SELECT * FROM users WHERE id = ?', ['user1']);
        expect(user).toBeDefined();
        expect(user.email).toBe('test@example.com');

        const users = await db.all('SELECT * FROM users');
        expect(users).toHaveLength(1);
    });

    test('logSearch should insert a search entry', async () => {
        const sessionId = 'test-session-123';
        const query = 'test query';
        const sources = ['pubmed'];
        const filters = { year: 2023 };
        const resultsCount = 10;
        const executionTime = 150;
        const ipAddress = '127.0.0.1';

        await db.logSearch(sessionId, query, sources, filters, resultsCount, executionTime, ipAddress);

        const searchEntry = await db.get('SELECT * FROM searches WHERE session_id = ?', [sessionId]);
        expect(searchEntry).toBeDefined();
        expect(searchEntry.query).toBe(query);
        expect(JSON.parse(searchEntry.sources)).toEqual(sources);
        expect(JSON.parse(searchEntry.filters)).toEqual(filters);
        expect(searchEntry.results_count).toBe(resultsCount);
        expect(searchEntry.execution_time_ms).toBe(executionTime);
        expect(searchEntry.ip_address).toBe(ipAddress);
    });

    test('getSearchHistory should retrieve search entries for a session', async () => {
        const sessionId = 'history-session-456';
        await db.logSearch(sessionId, 'query1', ['pubmed'], {}, 5, 100, '127.0.0.1');
        await db.logSearch(sessionId, 'query2', ['semantic'], {}, 8, 120, '127.0.0.1');

        const history = await db.getSearchHistory(sessionId);
        expect(history).toHaveLength(2);
        expect(history[0].query).toBe('query2'); // Ordered by created_at DESC
        expect(history[1].query).toBe('query1');
    });

    test('cacheArticle and getCachedArticle should store and retrieve articles', async () => {
        const articleId = 'art1';
        const articleData = { uid: 'art1', title: 'Test Article', abstract: 'Abstract text' };
        const source = 'pubmed';

        await db.cacheArticle(articleId, source, articleData);
        const cached = await db.getCachedArticle(articleId);

        expect(cached).toBeDefined();
        expect(cached.uid).toBe(articleId);
        expect(cached.title).toBe(articleData.title);
        expect(cached._cached).toBe(true);
    });

    test('getCachedArticle should return null for expired articles', async () => {
        const articleId = 'expired-art';
        const articleData = { uid: 'expired-art', title: 'Expired Article' };
        const source = 'pubmed';

        // Cache with a very short TTL that expires immediately
        await db.cacheArticle(articleId, source, articleData, -1); // -1 hour TTL

        const cached = await db.getCachedArticle(articleId);
        expect(cached).toBeNull();
    });

    test('cleanExpiredCache should remove expired articles', async () => {
        const articleId1 = 'exp1';
        const articleId2 = 'exp2';
        const articleId3 = 'not-exp';

        await db.cacheArticle(articleId1, 's1', { uid: articleId1 }, -1); // Expired
        await db.cacheArticle(articleId2, 's2', { uid: articleId2 }, -1); // Expired
        await db.cacheArticle(articleId3, 's3', { uid: articleId3 }, 24); // Not expired

        const changes = await db.cleanExpiredCache();
        expect(changes).toBe(2);

        const remaining = await db.getCachedArticle(articleId3);
        expect(remaining).toBeDefined();
        const removed1 = await db.getCachedArticle(articleId1);
        expect(removed1).toBeNull();
    });

    test('createUser, getUserByEmail, getUserById should manage users', async () => {
        const user = { id: 'u1', email: 'user@example.com', name: 'Test User' };
        await db.createUser(user);

        const fetchedByEmail = await db.getUserByEmail('user@example.com');
        expect(fetchedByEmail).toBeDefined();
        expect(fetchedByEmail.id).toBe('u1');

        const fetchedById = await db.getUserById('u1');
        expect(fetchedById).toBeDefined();
        expect(fetchedById.email).toBe('user@example.com');
    });

    test('saveArticle, unsaveArticle, getSavedArticles (session) should manage saved articles', async () => {
        const sessionId = 's-1';
        const article1 = { uid: 'art-s1', title: 'Session Article 1' };
        const article2 = { uid: 'art-s2', title: 'Session Article 2' };

        await db.saveArticle(sessionId, article1);
        await db.saveArticle(sessionId, article2);

        let saved = await db.getSavedArticles(sessionId);
        expect(saved).toHaveLength(2);
        expect(saved[0].title).toBe(article2.title); // Ordered by created_at DESC

        await db.unsaveArticle(sessionId, 'art-s1');
        saved = await db.getSavedArticles(sessionId);
        expect(saved).toHaveLength(1);
        expect(saved[0].title).toBe(article2.title);
    });

    test('saveArticleToUser, unsaveArticleFromUser, getUserSavedArticles should manage user saved articles', async () => {
        const userId = 'u-saved';
        await db.createUser({ id: userId, email: 'saved@example.com' });
        const article1 = { uid: 'art-u1', title: 'User Article 1' };
        const article2 = { uid: 'art-u2', title: 'User Article 2' };

        await db.saveArticleToUser(userId, article1);
        await db.saveArticleToUser(userId, article2);

        let saved = await db.getUserSavedArticles(userId);
        expect(saved).toHaveLength(2);
        expect(saved[0].title).toBe(article2.title); // Ordered by created_at DESC

        await db.unsaveArticleFromUser(userId, 'art-u1');
        saved = await db.getUserSavedArticles(userId);
        expect(saved).toHaveLength(1);
        expect(saved[0].title).toBe(article2.title);
    });

    test('team management methods should work', async () => {
        const ownerId = 'owner1';
        const memberId = 'member1';
        await db.createUser({ id: ownerId, email: 'owner@example.com' });
        await db.createUser({ id: memberId, email: 'member@example.com' });

        const teamId = 't1';
        await db.createTeam({ id: teamId, name: 'Test Team', slug: 'test-team', ownerId });

        const team = await db.getTeamById(teamId);
        expect(team).toBeDefined();
        expect(team.name).toBe('Test Team');
        expect(team.owner_id).toBe(ownerId);

        await db.addTeamMember(teamId, memberId, 'member');

        const ownerRole = await db.getTeamRoleForUser(teamId, ownerId);
        expect(ownerRole).toBe('owner');
        const memberRole = await db.getTeamRoleForUser(teamId, memberId);
        expect(memberRole).toBe('member');

        const userTeams = await db.getUserTeams(ownerId);
        expect(userTeams).toHaveLength(1);
        expect(userTeams[0].name).toBe('Test Team');
    });

    test('review project methods should work', async () => {
        const userId = 'reviewer1';
        await db.createUser({ id: userId, email: 'reviewer@example.com' });

        const project = await db.createReviewProject({
            title: 'My Review',
            question: 'What is the effect?',
            criteria: { inclusion: ['RCT'], exclusion: ['animal'] },
            ownerType: 'user',
            ownerId: userId,
        });
        expect(project).toBeDefined();
        expect(project.title).toBe('My Review');
        expect(project.criteria.inclusion).toEqual(['RCT']);

        const fetchedProject = await db.getReviewProject(project.id);
        expect(fetchedProject.question).toBe('What is the effect?');

        const article1 = { uid: 'ra1', title: 'Review Article 1' };
        const article2 = { uid: 'ra2', title: 'Review Article 2' };
        await db.addReviewArticles(project.id, [article1, article2]);

        const articles = await db.listReviewArticles(project.id);
        expect(articles).toHaveLength(2);
        expect(articles[0].article_id).toBe('ra2'); // Ordered by created_at DESC

        await db.updateReviewScreening(project.id, 'ra1', { screeningStatus: 'included', notes: 'Good fit' });
        const updatedArticle = await db.get('SELECT * FROM review_articles WHERE review_id = ? AND article_id = ?', [project.id, 'ra1']);
        expect(updatedArticle.screening_status).toBe('included');
        expect(updatedArticle.notes).toBe('Good fit');

        const prismaCounts = await db.getReviewPrismaCounts(project.id);
        expect(prismaCounts.total).toBe(2);
        expect(prismaCounts.included).toBe(1);
        expect(prismaCounts.pending).toBe(1);
    });

    test('pico extraction methods should work', async () => {
        const articleId = 'pico-art';
        const extraction = { population: 'Adults', intervention: 'Drug', outcomes: ['mortality'] };
        const provider = 'gemini';
        const model = 'gemini-2.0-flash';
        const confidence = 0.8;

        await db.upsertPicoExtraction(articleId, extraction, provider, model, confidence);
        const pico = await db.getPicoExtraction(articleId);

        expect(pico).toBeDefined();
        expect(pico.article_id).toBe(articleId);
        expect(pico.extraction.population).toBe('Adults');
        expect(pico.provider).toBe(provider);
        expect(pico.confidence).toBe(confidence);

        // Update
        const updatedExtraction = { ...extraction, comparison: 'Placebo' };
        await db.upsertPicoExtraction(articleId, updatedExtraction, provider, model, 0.9);
        const updatedPico = await db.getPicoExtraction(articleId);
        expect(updatedPico.extraction.comparison).toBe('Placebo');
        expect(updatedPico.confidence).toBe(0.9);
    });

    test('audit log methods should work', async () => {
        const userId = 'audit-user';
        const sessionId = 'audit-session';
        await db.createAuditLog({
            userId,
            sessionId,
            action: 'login',
            resourceType: 'user',
            resourceId: userId,
            details: { ip: '1.1.1.1' },
            ipAddress: '1.1.1.1',
            userAgent: 'test-agent',
        });

        const logs = await db.getAuditLogs({ userId });
        expect(logs).toHaveLength(1);
        expect(logs[0].action).toBe('login');
        expect(JSON.parse(logs[0].details).ip).toBe('1.1.1.1');
    });

    test('normalizeTopic should clean and lowercase topic strings', () => {
        expect(db.normalizeTopic(' Acute Respiratory Distress Syndrome ')).toBe('acute respiratory distress syndrome');
        expect(db.normalizeTopic('ARDS (Adult)')).toBe('ards adult');
        expect(db.normalizeTopic('COVID-19 & Sepsis')).toBe('covid-19 sepsis');
        expect(db.normalizeTopic(null)).toBe('');
    });

    test('buildTopicKnowledgeAliasesJson should create correct aliases', async () => {
        const displayTopic = 'ARDS';
        const knowledge = { keywords: ['acute lung injury', 'ventilator induced lung injury'] };
        const aliasesJson = db.buildTopicKnowledgeAliasesJson(displayTopic, knowledge);
        const aliases = JSON.parse(aliasesJson);
        expect(aliases).toContain('ards');
        expect(aliases).toContain('acute respiratory distress syndrome'); // from TOPIC_SYNONYM_GROUPS
        expect(aliases).toContain('acute lung injury');
        expect(aliases).toContain('ventilator induced lung injury');
    });

    test('getTopicKnowledge should find by normalized topic and aliases', async () => {
        const topic1 = 'Acute Respiratory Distress Syndrome';
        const knowledge1 = { mentorMessage: 'ARDS basics' };
        await db.upsertTopicKnowledge(topic1, knowledge1, [], 'human_reviewed', 0.9);

        const topic2 = 'ARDS'; // Should resolve to the same canonical
        const tkByAlias = await db.getTopicKnowledge(topic2);
        expect(tkByAlias).toBeDefined();
        expect(tkByAlias.topic).toBe(topic1); // Should return the original topic
        expect(tkByAlias.knowledge.mentorMessage).toBe('ARDS basics');

        const topic3 = 'acute lung injury'; // A keyword from TOPIC_SYNONYM_GROUPS for ARDS
        const tkByKeyword = await db.getTopicKnowledge(topic3);
        expect(tkByKeyword).toBeDefined();
        expect(tkByKeyword.topic).toBe(topic1);
    });

    test('upsertTopicKnowledge should create proposal if existing is protected', async () => {
        const topic = 'Protected Topic';
        const initialKnowledge = { msg: 'initial' };
        await db.upsertTopicKnowledge(topic, initialKnowledge, [], 'human_reviewed', 0.9); // Protected status

        const newKnowledge = { msg: 'new' };
        const result = await db.upsertTopicKnowledge(topic, newKnowledge, [], 'ai_generated', 0.6);
        expect(result.protected).toBe(true);
        expect(result.proposalCreated).toBe(true);

        const proposals = await db.listTopicKnowledgeProposals({ topic });
        expect(proposals.total).toBe(1);
        expect(proposals.proposals[0].knowledge.msg).toBe('new');
        expect(proposals.proposals[0].status).toBe('pending_review');

        // Original topic knowledge should remain unchanged
        const originalTk = await db.getTopicKnowledge(topic);
        expect(originalTk.knowledge.msg).toBe('initial');
    });

    test('guideline methods should work', async () => {
        const guideline = {
            topic: 'ARDS',
            sourceBody: 'ESICM',
            recommendationText: 'Rec 1',
            sourceYear: 2023,
        };
        const created = await db.createGuideline(guideline);
        expect(created).toBeDefined();
        expect(created.recommendationText).toBe('Rec 1');

        const fetched = await db.getGuidelineById(created.id);
        expect(fetched.sourceBody).toBe('ESICM');

        const byTopic = await db.getGuidelinesByTopic('ARDS');
        expect(byTopic).toHaveLength(1);
        expect(byTopic[0].recommendationText).toBe('Rec 1');

        await db.updateGuideline(created.id, { recommendationText: 'Updated Rec' });
        const updated = await db.getGuidelineById(created.id);
        expect(updated.recommendationText).toBe('Updated Rec');
    });

    test('topic knowledge proposal methods should work', async () => {
        const topic = 'Sepsis';
        const knowledge = { mentorMessage: 'Sepsis proposal' };
        const userId = 'proposer1';
        await db.createUser({ id: userId, email: 'proposer@example.com' });

        const proposal = await db.createTopicKnowledgeProposal(topic, {
            knowledge,
            proposedStatus: 'pending_review',
            createdBy: userId,
        });
        expect(proposal).toBeDefined();
        expect(proposal.topic).toBe(topic);
        expect(proposal.status).toBe('pending_review');

        const fetchedProposal = await db.getTopicKnowledgeProposal(proposal.id);
        expect(fetchedProposal.knowledge.mentorMessage).toBe('Sepsis proposal');

        // Approve
        const reviewerId = 'reviewer1';
        await db.createUser({ id: reviewerId, email: 'reviewer@example.com' });
        const { proposal: approvedProposal, topicKnowledge } = await db.approveTopicKnowledgeProposal(proposal.id, reviewerId);
        expect(approvedProposal.status).toBe('approved');
        expect(topicKnowledge).toBeDefined();
        expect(topicKnowledge.topic).toBe(topic);
        expect(topicKnowledge.status).toBe('human_reviewed');

        // Create another proposal and reject it
        const proposal2 = await db.createTopicKnowledgeProposal('ARDS', { knowledge: { mentorMessage: 'ARDS proposal' } });
        const rejectedProposal = await db.rejectTopicKnowledgeProposal(proposal2.id, reviewerId);
        expect(rejectedProposal.status).toBe('rejected');
    });

    test('learning profile methods should work', async () => {
        const userId = 'lp-user';
        await db.createUser({ id: userId, email: 'lp@example.com' });
        const profileData = {
            persona: 'student',
            goals: ['learn ARDS'],
            preferredDifficulty: 'medium',
        };
        await db.upsertLearningProfile(userId, profileData);
        const profile = await db.getLearningProfile(userId);
        expect(profile).toBeDefined();
        expect(profile.persona).toBe('student');
        expect(profile.goals).toEqual(['learn ARDS']);

        // Update
        await db.upsertLearningProfile(userId, { preferredDifficulty: 'hard' });
        const updatedProfile = await db.getLearningProfile(userId);
        expect(updatedProfile.preferredDifficulty).toBe('hard');
    });

    test('quiz attempt methods should work', async () => {
        const userId = 'quiz-user';
        await db.createUser({ id: userId, email: 'quiz@example.com' });
        const attempt1 = {
            userId, topic: 'ARDS', questionId: 'q1', questionType: 'recall',
            questionText: 'Q1', userAnswer: 'A', correctAnswer: 'A', isCorrect: true,
        };
        const attempt2 = {
            userId, topic: 'ARDS', questionId: 'q2', questionType: 'clinical_application',
            questionText: 'Q2', userAnswer: 'B', correctAnswer: 'C', isCorrect: false,
        };
        await db.createQuizAttempt(attempt1);
        await db.createQuizAttempt(attempt2);

        const attempts = await db.getQuizAttempts({ userId, topic: 'ARDS' });
        expect(attempts).toHaveLength(2);
        expect(attempts[0].isCorrect).toBe(false); // Ordered by created_at DESC

        const stats = await db.getQuizAttemptStats(userId, 'ARDS');
        expect(stats).toHaveLength(2);
        expect(stats[0].is_correct).toBe(0);
    });

    test('agent conversation methods should work', async () => {
        const userId = 'agent-user';
        await db.createUser({ id: userId, email: 'agent@example.com' });
        const conv = await db.createAgentConversation(userId, 'ARDS', 'ARDS Chat');
        expect(conv).toBeDefined();
        expect(conv.title).toBe('ARDS Chat');
        expect(conv.messageCount).toBe(0);

        const fetchedConv = await db.getAgentConversation(conv.id);
        expect(fetchedConv.topic).toBe('ARDS');

        await db.appendAgentMessages(conv.id, [{ role: 'user', content: 'Hi' }]);
        const updatedConv = await db.getAgentConversation(conv.id);
        expect(updatedConv.messageCount).toBe(1);
        expect(updatedConv.messages[0].content).toBe('Hi');

        const list = await db.listAgentConversations(userId);
        expect(list).toHaveLength(1);

        await db.deleteAgentConversation(conv.id);
        const deletedConv = await db.getAgentConversation(conv.id);
        expect(deletedConv).toBeNull();
    });

    test('case attempt methods should work', async () => {
        const userId = 'case-user';
        await db.createUser({ id: userId, email: 'case@example.com' });
        const attempt = {
            userId, topic: 'ARDS', caseText: 'Patient with ARDS', caseType: 'analysis',
            learningMode: 'resident', score: 80,
        };
        await db.createCaseAttempt(attempt);
        const attempts = await db.getCaseAttempts({ userId, topic: 'ARDS' });
        expect(attempts).toHaveLength(1);
        expect(attempts[0].score).toBe(80);
    });

    test('user topic mastery methods should work', async () => {
        const userId = 'mastery-user';
        await db.createUser({ id: userId, email: 'mastery@example.com' });
        const scores = {
            overallScore: 75, recallScore: 80, clinicalApplicationScore: 70,
            attemptsCount: 10, correctCount: 8,
        };
        await db.upsertUserTopicMastery(userId, 'ARDS', scores);
        const mastery = await db.getUserTopicMastery(userId, 'ARDS');
        expect(mastery).toBeDefined();
        expect(mastery.overallScore).toBe(75);

        // Update
        await db.upsertUserTopicMastery(userId, 'ARDS', { ...scores, overallScore: 80 });
        const updatedMastery = await db.getUserTopicMastery(userId, 'ARDS');
        expect(updatedMastery.overallScore).toBe(80);

        const list = await db.listUserTopicMastery(userId);
        expect(list).toHaveLength(1);
    });

    test('session methods should work', async () => {
        const sessionId = 'session-test-1';
        await db.createSession(sessionId, 'UA', '1.2.3.4', { theme: 'dark' });
        const session = await db.get('SELECT * FROM sessions WHERE id = ?', [sessionId]);
        expect(session).toBeDefined();
        expect(JSON.parse(session.preferences).theme).toBe('dark');

        const initialLastActive = session.last_active;
        await new Promise(resolve => setTimeout(resolve, 10)); // Ensure time passes
        await db.updateSessionActivity(sessionId);
        const updatedSession = await db.get('SELECT * FROM sessions WHERE id = ?', [sessionId]);
        expect(updatedSession.last_active).not.toBe(initialLastActive);
    });

    test('analytics methods should work', async () => {
        const sessionId = 'analytics-session';
        await db.logEvent('search', sessionId, { query: 'test' });
        await db.logEvent('analyze', sessionId, { type: 'quick' });

        const analytics = await db.getAnalytics('2000-01-01', '2099-12-31');
        expect(analytics).toHaveLength(2); // Two distinct event types
        expect(analytics[0].event_type).toBe('analyze'); // Order by event_type, then date

        const dailyStats = await db.getDailyStats(1);
        expect(dailyStats).toHaveLength(1);
        expect(dailyStats[0].searches).toBe(1);
        expect(dailyStats[0].analyses).toBe(1);
    });

    test('billing audit log methods should work', async () => {
        const userId = 'billing-user';
        await db.logBillingEvent({
            userId,
            action: 'subscription_created',
            externalRef: 'sub_123',
            details: { plan: 'pro' },
        });

        const logs = await db.listBillingAuditLog();
        expect(logs).toHaveLength(1);
        expect(logs[0].action).toBe('subscription_created');
        expect(JSON.parse(logs[0].details).plan).toBe('pro');
    });

    test('getPopularSearches should return popular queries', async () => {
        const sessionId1 = 'pop-s1';
        const sessionId2 = 'pop-s2';
        await db.logSearch(sessionId1, 'query A', [], {}, 10, 100, '1.1.1.1');
        await db.logSearch(sessionId1, 'query B', [], {}, 20, 100, '1.1.1.1');
        await db.logSearch(sessionId2, 'query A', [], {}, 15, 100, '1.1.1.2'); // Duplicate query A

        const popular = await db.getPopularSearches();
        expect(popular).toHaveLength(1); // Only 'query A' has count > 1
        expect(popular[0].query).toBe('query A');
        expect(popular[0].count).toBe(2);
        expect(popular[0].avg_results).toBe(12.5);
    });

    test('annotation methods should work', async () => {
        const articleId = 'ann-art';
        const userId = 'ann-user';
        await db.createUser({ id: userId, email: 'ann@example.com', name: 'Annotator' });
        const position = { start: 0, end: 10 };

        await db.createAnnotation(articleId, userId, 'Annotator', 'My note', position);
        const annotations = await db.getAnnotationsByArticle(articleId, userId);
        expect(annotations).toHaveLength(1);
        expect(annotations[0].text).toBe('My note');
        expect(annotations[0].position).toEqual(position);
    });

    test('isTopicKnowledgeStale should return true for stale knowledge', async () => {
        const topic = 'Stale Topic';
        const knowledge = { mentorMessage: 'Old message' };
        await db.upsertTopicKnowledge(topic, knowledge, [], 'ai_generated', 0.5);

        // Manually set last_refreshed_at to be very old
        await db.run(`UPDATE topic_knowledge SET last_refreshed_at = datetime('now', '-365 days') WHERE topic = ?`, [topic]);

        const isStale = await db.isTopicKnowledgeStale(topic, 180); // Max age 180 days
        expect(isStale).toBe(true);

        const isNotStale = await db.isTopicKnowledgeStale(topic, 400); // Max age 400 days
        expect(isNotStale).toBe(false);
    });

    test('updateTopicKnowledge and markTopicKnowledgeReviewed should work', async () => {
        const topic = 'Update Topic';
        await db.upsertTopicKnowledge(topic, { msg: 'initial' }, [], 'ai_generated', 0.5);

        await db.updateTopicKnowledge(topic, { knowledge: { msg: 'updated' }, status: 'human_edited', confidence: 0.8 });
        const updated = await db.getTopicKnowledge(topic);
        expect(updated.knowledge.msg).toBe('updated');
        expect(updated.status).toBe('human_edited');
        expect(updated.confidence).toBe(0.8);

        const reviewerId = 'reviewer-tk';
        await db.createUser({ id: reviewerId, email: 'tk@example.com' });
        await db.markTopicKnowledgeReviewed(topic, reviewerId);
        const reviewed = await db.getTopicKnowledge(topic);
        expect(reviewed.status).toBe('human_reviewed');
        expect(reviewed.knowledge.reviewedBy).toBe(reviewerId);
    });

    test('guideline lifecycle methods should work', async () => {
        const guideline = { topic: 'Test', sourceBody: 'Src', recommendationText: 'Rec' };
        const created = await db.createGuideline(guideline);

        await db.updateGuideline(created.id, { sourceYear: 2020 });
        const updated = await db.getGuidelineById(created.id);
        expect(updated.sourceYear).toBe(2020);

        const reviewerId = 'g-reviewer';
        await db.createUser({ id: reviewerId, email: 'g@example.com' });
        await db.markGuidelineReviewed(created.id, reviewerId);
        const reviewed = await db.getGuidelineById(created.id);
        expect(reviewed.status).toBe('human_reviewed');
        expect(reviewed.reviewedBy).toBe(reviewerId);

        await db.markGuidelineStale(created.id);
        const stale = await db.getGuidelineById(created.id);
        expect(stale.status).toBe('stale');

        const newGuideline = await db.createGuideline({ topic: 'Test', sourceBody: 'NewSrc', recommendationText: 'NewRec' });
        await db.markGuidelineSuperseded(created.id, newGuideline.id);
        const superseded = await db.getGuidelineById(created.id);
        expect(superseded.status).toBe('superseded');
        expect(superseded.supersededById).toBe(newGuideline.id);

        const deleteResult = await db.deleteGuideline(created.id);
        expect(deleteResult.deleted).toBe(true);
        const deleted = await db.getGuidelineById(created.id);
        expect(deleted).toBeNull();
    });
});