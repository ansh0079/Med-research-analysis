'use strict';

const { getLearningVelocity } = require('../../../services/learningVelocityService');
const { summarizeCalibration } = require('../../../services/confidenceCalibrationService');
const { buildOutline, summarizeRunGaps } = require('../../../utils/learningUtils');

function registerInsightsRoutes(app, deps) {
    const { db, requireAuthJwt, rateLimit, logger } = deps;

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

            // Confidence calibration — surfaces overconfidence as a first-class
            // insight since a learner who is confidently wrong is the clinically
            // riskiest pattern this app can detect.
            const calibration = summarizeCalibration(allAttempts);
            if (calibration.verdict === 'overconfident') {
                insights.push({
                    type: 'calibration',
                    severity: 'high',
                    icon: 'fa-bullseye',
                    color: 'red',
                    message: 'Your confidence and accuracy are out of sync.',
                    detail: calibration.message,
                    action: null,
                    topic: null,
                });
            }

            res.json({ insights, profile, calibration });
        } catch (error) {
            req.log.error({ err: error }, 'Learning insights error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
}

module.exports = { registerInsightsRoutes };
