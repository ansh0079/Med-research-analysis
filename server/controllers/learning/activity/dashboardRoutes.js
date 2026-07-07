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

    app.get('/api/learning/metrics', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const userId = req.user.id;
            const [
                attributionRows,
                quizRows,
                banditRows,
                sideEffectRows,
                memoryRows,
            ] = await Promise.all([
                db.all(`SELECT COUNT(*) AS count FROM search_learning_outcomes WHERE user_id = ?`, [userId]).catch(() => []),
                db.all(`SELECT COUNT(*) AS count FROM quiz_attempts WHERE user_id = ?`, [userId]).catch(() => []),
                db.all(
                    `SELECT policy_type, SUM(pulls) AS pulls, SUM(total_reward) AS total_reward
                     FROM personalization_arm_state
                     WHERE scope_key IN (?, 'global')
                     GROUP BY policy_type`,
                    [String(userId)]
                ).catch(() => []),
                db.all(
                    `SELECT status, COUNT(*) AS count
                     FROM agent_turn_side_effects
                     WHERE user_id = ?
                     GROUP BY status`,
                    [userId]
                ).catch(() => []),
                db.all(
                    `SELECT memory_tier, COUNT(*) AS count
                     FROM user_topic_memory
                     WHERE user_id = ?
                     GROUP BY memory_tier`,
                    [userId]
                ).catch(() => []),
            ]);
            const attributed = Number(attributionRows?.[0]?.count || 0);
            const totalQuizAttempts = Number(quizRows?.[0]?.count || 0);
            const sideEffects = sideEffectRows.reduce((acc, row) => {
                acc[row.status || 'unknown'] = Number(row.count || 0);
                return acc;
            }, {});
            const memoryTiers = memoryRows.reduce((acc, row) => {
                acc[row.memory_tier || 'sparse'] = Number(row.count || 0);
                return acc;
            }, {});

            res.json({
                attribution: {
                    attributedQuizAttempts: attributed,
                    totalQuizAttempts,
                    rate: totalQuizAttempts > 0 ? attributed / totalQuizAttempts : 0,
                },
                bandit: banditRows.map((row) => ({
                    policyType: row.policy_type,
                    pulls: Number(row.pulls || 0),
                    totalReward: Number(row.total_reward || 0),
                })),
                sideEffects: {
                    queued: sideEffects.queued || 0,
                    running: sideEffects.running || 0,
                    completed: sideEffects.completed || 0,
                    failed: sideEffects.failed || 0,
                    permanentlyFailed: sideEffects.permanently_failed || 0,
                },
                memoryTiers,
            });
        } catch (error) {
            req.log.error({ err: error }, 'Learning metrics error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
}

module.exports = { registerDashboardRoutes };
