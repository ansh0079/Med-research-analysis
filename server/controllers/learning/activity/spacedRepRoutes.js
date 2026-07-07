'use strict';

const spacedRep = require('../../../services/spacedRepService');

function registerSpacedRepRoutes(app, deps) {
    const { db, requireAuthJwt, rateLimit } = deps;

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
}

module.exports = { registerSpacedRepRoutes };
