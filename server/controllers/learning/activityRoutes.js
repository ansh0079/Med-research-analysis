const logger = require('../../config/logger');
const spacedRep = require('../../services/spacedRepService');
const { resolveProvider } = require('../../utils/aiProvider');
const { getPersonalisedRecommendations } = require('../../services/learningAgentService');
const { getLearningVelocity } = require('../../services/learningVelocityService');
const { attributeRecommendationFollowThrough } = require('../../services/searchLearningOutcomeService');
const { calculateMastery, nextReviewDate, normalizeAttemptClaimKey, inferEvidenceJudgement, textIncludes, buildOutline, summarizeRunGaps } = require('../../utils/learningUtils');
function registerActivityRoutes(app, deps) {
    const { db, requireAuthJwt, requireAuthOrBeta, requireVerifiedEmail, rateLimit, serverConfig, fetch: fetchImpl } = deps;
    const { limitBodySize, requireJson, validateBody, schemas } = require('../../utils/validation');
    const requireQuizAuth = requireAuthOrBeta || requireAuthJwt;

    function recordLearningEventSafe(event) {
        return db.recordLearningEvent(event).catch((err) => {
            logger.warn({ err, eventType: event?.eventType }, 'recordLearningEvent failed');
            return null;
        });
    }

    app.post('/api/learning/agent/conversations', limitBodySize(32 * 1024), requireJson, requireAuthJwt, rateLimit(10, 60), validateBody(schemas.agentConversation), async (req, res) => {
        try {
            const { topic, title } = req.body;
            const conversation = await db.createAgentConversation(req.user.id, topic, title);
            res.status(201).json({ conversation });
        } catch (error) {
            req.log.error({ err: error }, 'Create agent conversation error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/agent/conversations', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const { topic = '', limit = 20, offset = 0 } = req.query;
            const conversations = await db.listAgentConversations(req.user.id, {
                topic: String(topic),
                limit: Math.min(parseInt(limit, 10) || 20, 100),
                offset: parseInt(offset, 10) || 0,
            });
            res.json({ conversations });
        } catch (error) {
            req.log.error({ err: error }, 'List agent conversations error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/agent/conversations/:id', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const conversation = await db.getAgentConversation(req.params.id);
            if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
            if (conversation.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
            res.json({ conversation });
        } catch (error) {
            req.log.error({ err: error }, 'Get agent conversation error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.patch('/api/learning/agent/conversations/:id', limitBodySize(256 * 1024), requireJson, requireAuthJwt, rateLimit(20, 60), validateBody(schemas.agentMessageAppend), async (req, res) => {
        try {
            const conversation = await db.getAgentConversation(req.params.id);
            if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
            if (conversation.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
            const updated = await db.appendAgentMessages(req.params.id, req.body.messages);
            res.json({ conversation: updated });
        } catch (error) {
            req.log.error({ err: error }, 'Append agent messages error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.delete('/api/learning/agent/conversations/:id', requireAuthJwt, rateLimit(10, 60), async (req, res) => {
        try {
            const conversation = await db.getAgentConversation(req.params.id);
            if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
            if (conversation.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
            await db.deleteAgentConversation(req.params.id);
            res.json({ success: true });
        } catch (error) {
            req.log.error({ err: error }, 'Delete agent conversation error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // Case Attempts
    // ==========================================

    app.post('/api/learning/case-attempt', limitBodySize(512 * 1024), requireJson, requireAuthJwt, rateLimit(10, 60), async (req, res) => {
        try {
            const { topic, caseText, userResponse, score, feedback, difficulty, timeMs, caseType, learningMode, aiFeedback, seedArticleUids } = req.body || {};
            if (!String(topic || '').trim()) return res.status(400).json({ error: 'topic is required' });
            const attempt = await db.createCaseAttempt({
                userId: req.user.id,
                topic: String(topic).trim(),
                caseText: String(caseText || '').slice(0, 20000),
                caseType: String(caseType || 'analysis').slice(0, 60),
                learningMode: String(learningMode || difficulty || 'resident').slice(0, 60),
                userResponse: userResponse && typeof userResponse === 'object'
                    ? userResponse
                    : (String(userResponse || '').trim() ? { text: String(userResponse).slice(0, 20000) } : null),
                aiFeedback: aiFeedback && typeof aiFeedback === 'object'
                    ? aiFeedback
                    : (String(feedback || '').trim() ? { text: String(feedback).slice(0, 5000) } : null),
                score: score != null ? Number(score) : null,
                seedArticleUids: Array.isArray(seedArticleUids) ? seedArticleUids : [],
            });
            void recordLearningEventSafe({
                userId: req.user.id,
                eventType: 'case_attempted',
                topic: String(topic).trim(),
                sourceType: 'case_attempt',
                sourceId: attempt?.id,
                payload: {
                    caseType: caseType || 'analysis',
                    learningMode: learningMode || difficulty || 'resident',
                    hasUserResponse: Boolean(userResponse),
                    score: score != null ? Number(score) : null,
                    timeMs: timeMs != null ? Number(timeMs) : null,
                    seedArticleCount: Array.isArray(seedArticleUids) ? seedArticleUids.length : 0,
                },
            });
            if (caseType === 'teaching_vignette') {
                void recordLearningEventSafe({
                    userId: req.user.id,
                    eventType: 'case_generated',
                    topic: String(topic).trim(),
                    sourceType: 'case_attempt',
                    sourceId: attempt?.id,
                    payload: { learningMode: learningMode || difficulty || 'resident' },
                });
            }
            res.status(201).json({ attempt });
        } catch (error) {
            req.log.error({ err: error }, 'Create case attempt error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/case-history', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const { topic = '', limit = 50, offset = 0 } = req.query;
            const attempts = await db.getCaseAttempts({
                userId: req.user.id,
                topic: String(topic),
                limit: Math.min(parseInt(limit, 10) || 50, 100),
                offset: parseInt(offset, 10) || 0,
            });
            res.json({ attempts });
        } catch (error) {
            req.log.error({ err: error }, 'Get case history error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // Topic Mastery
    // ==========================================

    app.get('/api/learning/mastery', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const { limit = 50, offset = 0 } = req.query;
            const mastery = await db.listUserTopicMastery(req.user.id, {
                limit: Math.min(parseInt(limit, 10) || 50, 100),
                offset: parseInt(offset, 10) || 0,
            });
            res.json({ mastery });
        } catch (error) {
            req.log.error({ err: error }, 'List topic mastery error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/mastery/:topic/cohort', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const cohort = await db.getMasteryCohortBenchmark(req.user.id, req.params.topic);
            if (!cohort) return res.status(404).json({ error: 'No mastery data for this topic' });
            res.json({ cohort });
        } catch (error) {
            req.log.error({ err: error }, 'Mastery cohort benchmark error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/mastery/:topic', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const mastery = await db.getUserTopicMastery(req.user.id, req.params.topic);
            if (!mastery) return res.status(404).json({ error: 'No mastery data for this topic' });
            res.json({ mastery });
        } catch (error) {
            req.log.error({ err: error }, 'Get topic mastery error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // Dashboard
    // ==========================================

    // ==========================================
    // Personalised Insights
    // ==========================================

    app.get('/api/learning/insights', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const userId = req.user.id;
            const [profile, masteryList, allAttempts] = await Promise.all([
                db.getLearningProfile(userId),
                db.listUserTopicMastery(userId, { limit: 100, offset: 0 }),
                db.getQuizAttempts({ userId, limit: 100, offset: 0 }),
            ]);
            const activeRuns = await db.listStudyRuns(userId, { status: 'active', limit: 10, offset: 0 }).catch((err) => { logger.warn({ err }, 'listStudyRuns failed'); return []; });

            const insights = [];

            const TYPE_LABELS = {
                recall: 'Recall', clinical_application: 'Clinical Application',
                trial_interpretation: 'Trial Interpretation', guideline: 'Guideline', pitfall: 'Pitfall/Misconception',
            };

            // Weak question types — consistent misses across >= 5 attempts
            const byType = {};
            for (const a of allAttempts) {
                const t = a.questionType || 'recall';
                if (!byType[t]) byType[t] = { correct: 0, total: 0, wrongTopics: [] };
                byType[t].total++;
                if (a.isCorrect) byType[t].correct++;
                else byType[t].wrongTopics.push(a.topic);
            }
            for (const [type, stats] of Object.entries(byType)) {
                if (stats.total < 5) continue;
                const accuracy = Math.round((stats.correct / stats.total) * 100);
                if (accuracy < 55) {
                    const topMissed = [...new Set(stats.wrongTopics)].slice(0, 3).join(', ');
                    insights.push({
                        type: 'weak_type',
                        severity: accuracy < 35 ? 'high' : 'medium',
                        icon: 'fa-exclamation-circle',
                        color: accuracy < 35 ? 'red' : 'amber',
                        message: `You're scoring ${accuracy}% on ${TYPE_LABELS[type] || type} questions across ${stats.total} attempts.`,
                        detail: topMissed ? `Most missed topics: ${topMissed}.` : '',
                        action: 'Drill this type',
                        questionType: type,
                        topic: stats.wrongTopics[0] || null,
                    });
                }
            }

            // Topics overdue for review
            const overdue = masteryList
                .filter((m) => m.nextReviewAt && new Date(m.nextReviewAt) <= new Date())
                .sort((a, b) => new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime())
                .slice(0, 3);
            for (const m of overdue) {
                const ms = Date.now() - new Date(m.nextReviewAt).getTime();
                const daysOverdue = Math.max(0, Math.round(ms / 86400000));
                insights.push({
                    type: 'review_due',
                    severity: daysOverdue > 3 ? 'high' : 'medium',
                    icon: 'fa-clock',
                    color: 'amber',
                    message: `"${m.topic}" is ${daysOverdue > 0 ? `${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue` : 'due today'} for review.`,
                    detail: `Mastery: ${m.overallScore}% — ${m.attemptsCount} questions answered.`,
                    action: 'Review now',
                    topic: m.topic,
                });
            }

            for (const run of activeRuns.slice(0, 3)) {
                const coverage = run.nodeCoverage || {};
                const topicKnowledge = run.outlineId
                    ? await db.get(`SELECT * FROM topic_knowledge WHERE id = ?`, [run.outlineId]).then((row) => db.mapTopicKnowledgeRow(row)).catch((err) => { logger.warn({ err }, 'get topic_knowledge by id failed'); return null; })
                    : await db.getTopicKnowledge(run.topic).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; });
                const outline = buildOutline(topicKnowledge);
                const gapReport = summarizeRunGaps(run, outline);
                const totalNodes = gapReport.totalNodes || Object.keys(coverage).length || Number(run.progress?.totalNodes || 0);
                const coveredNodes = gapReport.coveredNodes || Number(run.progress?.coveredNodes || 0);
                if (totalNodes > 0 && coveredNodes < totalNodes) {
                    const nextGap = gapReport.weakNodes[0] || gapReport.uncoveredNodes[0] || null;
                    insights.push({
                        type: 'coverage_gap',
                        severity: gapReport.weakNodes.length > 0 ? 'medium' : (coveredNodes === 0 ? 'medium' : 'low'),
                        icon: 'fa-map-signs',
                        color: 'indigo',
                        message: `"${run.topic}" has ${totalNodes - coveredNodes} outline node${totalNodes - coveredNodes === 1 ? '' : 's'} left to cover.`,
                        detail: nextGap ? `Next gap: ${nextGap.label}` : `Covered ${coveredNodes}/${totalNodes} nodes in this study run.`,
                        action: 'Resume run',
                        topic: run.topic,
                        studyRunId: run.id,
                        gapReport,
                    });
                }
            }

            // Improvement: topic with biggest recent gain
            const improving = masteryList
                .filter((m) => m.overallScore >= 70 && m.attemptsCount >= 5)
                .sort((a, b) => b.overallScore - a.overallScore)
                .slice(0, 1);
            if (improving.length > 0) {
                const m = improving[0];
                insights.push({
                    type: 'strength',
                    severity: 'low',
                    icon: 'fa-star',
                    color: 'emerald',
                    message: `Strong performance on "${m.topic}" — ${m.overallScore}% mastery.`,
                    detail: `${m.correctCount}/${m.attemptsCount} correct across all question types.`,
                    action: null,
                    topic: m.topic,
                });
            }

            // Streak milestone
            if (profile?.currentStreak >= 3) {
                insights.push({
                    type: 'milestone',
                    severity: 'low',
                    icon: 'fa-fire',
                    color: 'orange',
                    message: `${profile.currentStreak}-day study streak!`,
                    detail: profile.currentStreak >= 7 ? 'Outstanding consistency.' : 'Keep it going — 7 days is the first milestone.',
                    action: null,
                    topic: null,
                });
            }

            // Onboarding — no data yet
            if (allAttempts.length === 0) {
                insights.push({
                    type: 'onboarding',
                    severity: 'low',
                    icon: 'fa-graduation-cap',
                    color: 'indigo',
                    message: 'No quiz data yet.',
                    detail: 'Take your first quiz to start receiving personalised insights.',
                    action: 'Take a quiz',
                    topic: null,
                });
            }

            res.json({ insights, profile });
        } catch (error) {
            req.log.error({ err: error }, 'Learning insights error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // Dashboard
    // ==========================================

    app.get('/api/learning/dashboard', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const userId = req.user.id;
            const [profile, masteryList, recentAttempts, recentConversations, recentCases, activeRuns, dueCardCount] = await Promise.all([
                db.getLearningProfile(userId),
                db.listUserTopicMastery(userId, { limit: 100, offset: 0 }),
                db.getQuizAttempts({ userId, limit: 5, offset: 0 }),
                db.listAgentConversations(userId, { limit: 5, offset: 0 }),
                db.getCaseAttempts({ userId, limit: 5, offset: 0 }),
                db.listStudyRuns(userId, { status: 'active', limit: 5, offset: 0 }),
                spacedRep.countDueCards(db, userId).catch((err) => { logger.warn({ err }, 'countDueCards failed'); return 0; }),
            ]);

            const weakTopics = masteryList
                .filter((m) => m.overallScore < 60)
                .sort((a, b) => a.overallScore - b.overallScore)
                .slice(0, 5);

            const velocityTopics = await Promise.all(
                masteryList.slice(0, 8).map(async (row) => {
                    const velocity = await getLearningVelocity(db, userId, row.topic, { days: 7 }).catch(() => null);
                    return velocity
                        ? { topic: row.topic, overallScore: row.overallScore, learningVelocity: velocity }
                        : null;
                })
            );

            const reviewQueue = masteryList
                .filter((m) => m.nextReviewAt && new Date(m.nextReviewAt) <= new Date())
                .sort((a, b) => new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime())
                .slice(0, 10);

            const totalQuizAttempts = masteryList.reduce((s, m) => s + (m.attemptsCount || 0), 0);
            const totalCorrect = masteryList.reduce((s, m) => s + (m.correctCount || 0), 0);
            const totalCases = await db.get(`SELECT COUNT(*) AS count FROM case_attempts WHERE user_id = ?`, [userId]);

            const cl = await db.listCurricula().catch((err) => { logger.warn({ err }, 'listCurricula failed'); return []; });
            const curriculaOverview = await Promise.all(cl.map(async (c) => ({
                ...c,
                examSummary: await db.getCurriculumExamSummaryForUser(userId, c.id),
            })));

            res.json({
                profile,
                stats: {
                    currentStreak: profile?.currentStreak || 0,
                    longestStreak: profile?.longestStreak || 0,
                    totalQuizzes: totalQuizAttempts,
                    totalCases: totalCases?.count || 0,
                    overallAccuracy: totalQuizAttempts > 0 ? Math.round((totalCorrect / totalQuizAttempts) * 100) : 0,
                    topicsStudied: masteryList.length,
                },
                weakTopics,
                learningVelocityByTopic: velocityTopics.filter(Boolean),
                reviewQueue,
                dueCardCount,
                curriculaOverview,
                recentActivity: {
                    quizzes: recentAttempts,
                    conversations: recentConversations,
                    cases: recentCases,
                },
                mastery: masteryList,
                activeRuns,
            });
        } catch (error) {
            req.log.error({ err: error }, 'Learning dashboard error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // CPD / CME Session Logging
    // ==========================================

    app.post('/api/learning/cpd', limitBodySize(32 * 1024), requireJson, requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const { activityType, topic = '', durationMinutes = 0, questionCount = 0, accuracyPct = null, notes = '', source = 'auto' } = req.body;
            const VALID_TYPES = ['quiz', 'synthesis', 'case', 'search', 'study_run', 'manual'];
            if (!VALID_TYPES.includes(activityType)) {
                return res.status(400).json({ error: `activityType must be one of: ${VALID_TYPES.join(', ')}` });
            }
            const result = await db.createCpdSession(req.user.id, { activityType, topic, durationMinutes, questionCount, accuracyPct, notes, source });
            res.status(201).json({ id: result.id });
        } catch (error) {
            req.log.error({ err: error }, 'Create CPD session error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/cpd', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const { limit = 100, offset = 0, startDate = '', endDate = '', activityType = '' } = req.query;
            const sessions = await db.listCpdSessions(req.user.id, {
                limit: Math.min(parseInt(limit, 10) || 100, 200),
                offset: parseInt(offset, 10) || 0,
                startDate: String(startDate),
                endDate: String(endDate),
                activityType: String(activityType),
            });
            res.json({ sessions });
        } catch (error) {
            req.log.error({ err: error }, 'List CPD sessions error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/cpd/summary', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const year = parseInt(req.query.year, 10) || new Date().getFullYear();
            const summary = await db.getCpdSummary(req.user.id, { year });
            res.json({ summary });
        } catch (error) {
            req.log.error({ err: error }, 'CPD summary error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    const CPD_PDF_LABELS = {
        quiz: 'Quiz',
        synthesis: 'Evidence review',
        case: 'Case',
        search: 'Search',
        study_run: 'Topic run',
        manual: 'Manual',
    };

    app.get('/api/learning/cpd/export-pdf', requireAuthJwt, rateLimit(10, 60), async (req, res) => {
        try {
            const PDFDocument = require('pdfkit');
            const year = parseInt(req.query.year, 10) || new Date().getFullYear();
            const startDate = `${year}-01-01`;
            const endDate = `${year}-12-31`;
            const sessionsRaw = await db.listCpdSessions(req.user.id, {
                startDate,
                endDate,
                limit: 500,
                offset: 0,
            });
            const sessions = [...sessionsRaw].reverse();
            if (!sessions.length) {
                return res.status(400).json({ error: 'No CPD sessions in this year to export' });
            }
            const summary = await db.getCpdSummary(req.user.id, { year });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="cpd-record-${year}.pdf"`);

            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            doc.pipe(res);

            doc.fontSize(18).text(`CPD / CME activity record — ${year}`, { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(11).fillColor('#444').text(
                `Total recorded time: ${(summary?.totalHours ?? 0).toFixed(1)} hours · ${sessions.length} activities`,
            );
            doc.moveDown();
            doc.fillColor('#000');

            const tableTop = doc.y;
            const colX = [50, 105, 215, 300, 360, 420];
            doc.fontSize(9).font('Helvetica-Bold');
            ['Date', 'Type', 'Topic', 'Mins', 'Q#', 'Acc'].forEach((h, i) => {
                doc.text(h, colX[i], tableTop, { width: i === 2 ? 200 : 50, continued: false });
            });
            doc.font('Helvetica');
            let rowY = tableTop + 16;
            const maxY = 780;
            for (const s of sessions) {
                if (rowY > maxY) {
                    doc.addPage();
                    rowY = 50;
                }
                const typeLabel = CPD_PDF_LABELS[s.activityType] || s.activityType;
                const dateStr = s.createdAt ? String(s.createdAt).slice(0, 10) : '—';
                doc.fontSize(8).text(dateStr, colX[0], rowY, { width: 52 });
                doc.text(typeLabel, colX[1], rowY, { width: 105 });
                doc.text(String(s.topic || '—').slice(0, 48), colX[2], rowY, { width: 200 });
                doc.text(String(s.durationMinutes ?? '—'), colX[3], rowY, { width: 48 });
                doc.text(s.questionCount != null ? String(s.questionCount) : '—', colX[4], rowY, { width: 40 });
                doc.text(s.accuracyPct != null ? `${s.accuracyPct}%` : '—', colX[5], rowY, { width: 40 });
                rowY += 14;
            }

            doc.moveDown(2);
            doc.fontSize(8).fillColor('#666').text(
                `Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · Signal MD · For your professional portfolio or regulatory return; verify against your local college requirements.`,
                { align: 'left' },
            );
            doc.end();
        } catch (error) {
            req.log.error({ err: error }, 'CPD PDF export error');
            if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // Portfolio / WBA Reflection Drafts
    // ==========================================

    app.post('/api/learning/reflections', limitBodySize(128 * 1024), requireJson, requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const {
                reflectionType = 'CBD',
                sourceType = 'manual',
                topic = '',
                whatHappened = '',
                whatILearned = '',
                whatIWillChange = '',
                evidenceUsed = '',
                supervisorDiscussion = '',
                status = 'draft',
                linkedCpdSessionId = null,
            } = req.body || {};
            const validTypes = ['CBD', 'mini-CEX', 'DOPS'];
            if (!validTypes.includes(reflectionType)) {
                return res.status(400).json({ error: `reflectionType must be one of: ${validTypes.join(', ')}` });
            }
            if (!String(topic).trim()) return res.status(400).json({ error: 'topic is required' });
            const reflection = await db.createPortfolioReflection(req.user.id, {
                reflectionType,
                sourceType,
                topic,
                whatHappened,
                whatILearned,
                whatIWillChange,
                evidenceUsed,
                supervisorDiscussion,
                status,
                linkedCpdSessionId,
            });
            res.status(201).json({ reflection });
        } catch (error) {
            req.log.error({ err: error }, 'Create portfolio reflection error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/reflections', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const reflections = await db.listPortfolioReflections(req.user.id, {
                limit: Math.min(parseInt(req.query.limit, 10) || 50, 100),
                offset: parseInt(req.query.offset, 10) || 0,
                topic: String(req.query.topic || ''),
                status: String(req.query.status || ''),
            });
            res.json({ reflections });
        } catch (error) {
            req.log.error({ err: error }, 'List portfolio reflections error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.put('/api/learning/reflections/:id', limitBodySize(128 * 1024), requireJson, requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            if (!Number.isFinite(id) || id < 1) return res.status(400).json({ error: 'Invalid reflection id' });
            const validTypes = ['CBD', 'mini-CEX', 'DOPS'];
            if (req.body?.reflectionType && !validTypes.includes(req.body.reflectionType)) {
                return res.status(400).json({ error: `reflectionType must be one of: ${validTypes.join(', ')}` });
            }
            const validStatuses = ['draft', 'discussed', 'exported', 'submitted'];
            if (req.body?.status && !validStatuses.includes(req.body.status)) {
                return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
            }
            const reflection = await db.updatePortfolioReflection(req.user.id, id, req.body || {});
            if (!reflection) return res.status(404).json({ error: 'Reflection not found' });
            res.json({ reflection });
        } catch (error) {
            req.log.error({ err: error }, 'Update portfolio reflection error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/learning/reflections/draft', requireJson, requireAuthJwt, rateLimit(10, 60), async (req, res) => {
        try {
            const { reflectionType = 'CBD', topic = '' } = req.body || {};
            const cleanTopic = String(topic).trim();
            if (!cleanTopic) return res.status(400).json({ error: 'topic is required' });
            const validTypes = ['CBD', 'mini-CEX', 'DOPS'];
            if (!validTypes.includes(reflectionType)) {
                return res.status(400).json({ error: `reflectionType must be one of: ${validTypes.join(', ')}` });
            }

            // Gather context: recent quiz attempts + topic knowledge seminal papers
            const [attempts, topicKnowledge] = await Promise.all([
                db.getQuizAttempts({ userId: req.user.id, topic: cleanTopic, limit: 10 }).catch((err) => { logger.warn({ err }, 'all failed'); return []; }),
                db.getTopicKnowledge(cleanTopic).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; }),
            ]);

            const attemptsText = (attempts || []).slice(0, 8).map((a, i) =>
                `${i + 1}. Q: ${String(a.question || '').slice(0, 200)} | Correct: ${a.isCorrect ? 'Yes' : 'No'} | Type: ${a.questionType || 'unknown'}${a.explanation ? ` | Explanation: ${String(a.explanation).slice(0, 200)}` : ''}`
            ).join('\n') || 'No quiz attempts recorded for this topic.';

            const seminalText = topicKnowledge?.knowledge?.seminalPapers?.slice(0, 3).map((p) =>
                `- ${p.title}${p.clinicalPrinciple ? `: ${p.clinicalPrinciple}` : ''}`
            ).join('\n') || '';

            const typeGuidance = {
                'CBD': 'Case-Based Discussion (CBD): reflects on a specific patient case, clinical decision-making, and evidence used.',
                'mini-CEX': 'Mini-Clinical Evaluation Exercise (mini-CEX): reflects on a brief clinical encounter, communication, and examination skills.',
                'DOPS': 'Direct Observation of Procedural Skills (DOPS): reflects on a procedural skill, technique, and patient safety considerations.',
            }[reflectionType];

            const prompt = `You are helping a medical trainee draft a ${reflectionType} portfolio reflection for topic: "${cleanTopic}".
${typeGuidance}

Recent quiz performance on this topic:
${attemptsText}
${seminalText ? `\nKey evidence for this topic:\n${seminalText}` : ''}

Write a professional, first-person portfolio reflection. Each field should be 2-4 concise sentences. Be specific and evidence-linked where possible.

Return ONLY valid JSON:
{
  "whatHappened": "What happened or was encountered — describe a realistic clinical encounter or learning event related to ${cleanTopic}",
  "whatILearned": "What was learned from this event — connect to quiz performance and key evidence above",
  "whatIWillChange": "What will change in future practice — specific, actionable, grounded in evidence",
  "evidenceUsed": "Key papers or guidelines referenced — derive from the evidence list above where possible"
}`;

            const { createAiService, PINNED_MODELS } = require('../services/aiService');
            const { serverConfig } = deps;
            const ai = createAiService({ serverConfig });
            const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider: 'auto' }, serverConfig);
            if (!selectedProvider) {
                return res.status(503).json({ error: 'No AI provider configured' });
            }
            const rawText = selectedProvider === 'gemini'
                ? await ai.callGemini(prompt, selectedModel, { temperature: 0.5 })
                : await ai.callMistralAI(prompt, selectedModel, { temperature: 0.5 });
            let draft;
            try {
                const match = rawText.match(/\{[\s\S]*\}/);
                draft = JSON.parse(match ? match[0] : rawText);
            } catch {
                return res.status(502).json({ error: 'AI returned an invalid response — try again' });
            }
            res.json({ draft, reflectionType, topic: cleanTopic });
        } catch (error) {
            req.log?.error?.({ err: error }, 'Reflection draft error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // Quiz explanation feedback
    // ==========================================

    app.post('/api/learning/quiz-feedback', requireJson, requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const { topic, outlineNodeId, feedbackType } = req.body || {};
            if (!topic || !outlineNodeId || !['confusing', 'clear'].includes(feedbackType)) {
                return res.status(400).json({ error: 'topic, outlineNodeId, and feedbackType (confusing|clear) required' });
            }
            // Patch confusingNodes in topic_knowledge.knowledge so the next quiz AI
            // prompt can warn the model which nodes learners found hard to understand.
            {
                const cleanTopic = String(topic).trim();
                const tkRow = await db.get(
                    `SELECT id, knowledge FROM topic_knowledge WHERE normalized_topic = LOWER(TRIM(?)) OR topic = ? LIMIT 1`,
                    [cleanTopic, cleanTopic]
                );
                if (tkRow) {
                    const knowledge = JSON.parse(String(tkRow.knowledge || '{}'));
                    const nodes = knowledge.confusingNodes || {};
                    const nodeId = String(outlineNodeId).trim();
                    nodes[nodeId] = nodes[nodeId] || { confusingCount: 0, clearCount: 0 };
                    if (feedbackType === 'confusing') nodes[nodeId].confusingCount += 1;
                    else nodes[nodeId].clearCount += 1;
                    knowledge.confusingNodes = nodes;
                    await db.run('UPDATE topic_knowledge SET knowledge = ? WHERE id = ?', [JSON.stringify(knowledge), tkRow.id]);
                }
            }
            void recordLearningEventSafe({
                userId: req.user.id,
                eventType: feedbackType === 'confusing' ? 'feedback_confusing' : 'feedback_helpful',
                topic,
                sourceType: 'quiz_feedback',
                sourceId: outlineNodeId,
                payload: { outlineNodeId, feedbackType },
            });
            res.status(204).send();
        } catch (error) {
            req.log.error({ err: error }, 'Quiz feedback error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ==========================================
    // Spaced Repetition — Due Reviews
    // ==========================================

    app.get('/api/learning/due-reviews', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const userId = req.user.id;
            const limit = Math.min(parseInt(req.query.limit || '100', 10) || 100, 200);
            const cards = await spacedRep.getDueCards(db, userId, limit);

            // Group by topic so the UI can show "5 reviews in Sepsis, 3 in AKI"
            const byTopic = {};
            for (const card of cards) {
                if (!byTopic[card.normalizedTopic]) {
                    byTopic[card.normalizedTopic] = { topic: card.topic, normalizedTopic: card.normalizedTopic, cards: [] };
                }
                byTopic[card.normalizedTopic].cards.push(card);
            }

            const groups = Object.values(byTopic).sort((a, b) => b.cards.length - a.cards.length);
            res.json({ total: cards.length, groups });
        } catch (error) {
            req.log.error({ err: error }, 'Due reviews error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/due-reviews/count', requireAuthJwt, rateLimit(120, 60), async (req, res) => {
        try {
            const count = await spacedRep.countDueCards(db, req.user.id);
            res.json({ count });
        } catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/habit-status', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const userId = req.user.id;
            const [profile, dueCount] = await Promise.all([
                db.getLearningProfile(userId),
                spacedRep.countDueCards(db, userId).catch(() => 0),
            ]);
            const today = new Date().toISOString().slice(0, 10);
            const lastStudy = profile?.lastStudyDate ? profile.lastStudyDate.slice(0, 10) : null;
            const studiedToday = lastStudy === today;
            const currentStreak = profile?.currentStreak || 0;
            const longestStreak = profile?.longestStreak || 0;
            const milestones = [3, 7, 14, 30, 60];
            const nextMilestone = milestones.find((m) => m > currentStreak) || milestones[milestones.length - 1];
            const streakAtRisk = dueCount > 0 && !studiedToday && currentStreak > 0;
            res.json({
                currentStreak,
                longestStreak,
                studiedToday,
                dueCount,
                streakAtRisk,
                nextMilestone,
                daysToMilestone: Math.max(0, nextMilestone - currentStreak),
                dailyGoalMet: studiedToday,
            });
        } catch (error) {
            req.log.error({ err: error }, 'Habit status error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/spaced-rep/topics', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const topics = await spacedRep.listAllCardsGroupedByTopic(db, req.user.id);
            res.json({ topics });
        } catch (error) {
            req.log.error({ err: error }, 'Spaced rep topics error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/recommendations', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const limit = Math.min(Math.max(parseInt(String(req.query.limit || '8'), 10) || 8, 1), 20);
            const recommendations = await getPersonalisedRecommendations(db, req.user.id, { limit });
            res.json({ recommendations, generatedAt: new Date().toISOString() });
        } catch (error) {
            req.log.error({ err: error }, 'Learning recommendations error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/learning/event', limitBodySize(32 * 1024), requireJson, requireAuthJwt, rateLimit(120, 60), async (req, res) => {
        try {
            const { eventType, topic, claimKey, sourceType, sourceId, payload } = req.body || {};
            if (!eventType || typeof eventType !== 'string') {
                return res.status(400).json({ error: 'eventType is required' });
            }
            void recordLearningEventSafe({
                userId: req.user.id,
                eventType,
                topic: topic || null,
                claimKey: claimKey || null,
                sourceType: sourceType || null,
                sourceId: sourceId || null,
                payload: payload || null,
            });

            const followThroughType = (() => {
                if (eventType === 'recommendation_clicked') {
                    const action = payload?.action;
                    if (action === 'case') return 'case_open';
                    if (action === 'quiz') return 'recommendation_clicked';
                    return 'topic_open';
                }
                if (eventType === 'topic_open') return 'topic_open';
                if (eventType === 'case_open') return 'case_open';
                return null;
            })();
            if (followThroughType && topic) {
                void attributeRecommendationFollowThrough(db, req.user.id, {
                    topic,
                    normalizedTopic: db.normalizeTopic(topic),
                    eventType: followThroughType,
                }).catch((err) => { logger.warn({ err }, 'attributeRecommendationFollowThrough failed'); });
            }

            res.json({ ok: true });
        } catch (error) {
            req.log.error({ err: error }, 'Learning event log error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });


}

module.exports = { registerActivityRoutes };
