'use strict';

const spacedRep = require('../../../services/spacedRepService');
const { getLearningVelocity } = require('../../../services/learningVelocityService');
const logger = require('../../../config/logger');

function registerDashboardRoutes(app, deps) {
    const { db, requireAuthJwt, rateLimit } = deps;

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
}

module.exports = { registerDashboardRoutes };
