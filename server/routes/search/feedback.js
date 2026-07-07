const { explainInteractionReward } = require('../../services/rewardAttributionService');
const { attributeSearchInteractionReward } = require('../../services/searchLearningOutcomeService');

function registerSearchFeedbackRoutes(app, { db, rateLimit, requireJson }) {
    app.post('/api/search/impressions', rateLimit(120, 60), requireJson, async (req, res) => {
        const { searchId, impressions } = req.body || {};
        const sid = Number(searchId);
        if (!sid || !Array.isArray(impressions) || impressions.length === 0) {
            return res.status(400).json({ error: 'searchId and impressions[] are required' });
        }
        try {
            const normalized = impressions
                .map((imp, index) => ({
                    articleUid: String(imp.articleUid || imp.uid || '').trim(),
                    position: Number(imp.position ?? index + 1),
                }))
                .filter((imp) => imp.articleUid && imp.position > 0)
                .slice(0, 30);
            if (!normalized.length) return res.status(400).json({ error: 'No valid impressions' });
            await db.recordSearchImpressions(sid, req.sessionId, normalized, req.user?.id ?? null);
            return res.json({ ok: true, recorded: normalized.length });
        } catch (err) {
            req.log?.error?.({ err }, 'Search impressions error');
            return res.status(500).json({ error: 'Failed to record impressions' });
        }
    });

    app.post('/api/search/interaction', rateLimit(180, 60), requireJson, async (req, res) => {
        const { searchId, articleUid, interactionType, dwellMs, elapsedMs, decisionId } = req.body || {};
        const sid = Number(searchId);
        const uid = String(articleUid || '').trim();
        const type = String(interactionType || '').trim();
        if (!sid || !uid || !['click', 'save', 'dwell'].includes(type)) {
            return res.status(400).json({ error: 'searchId, articleUid, and interactionType (click|save|dwell) are required' });
        }
        try {
            const updates = {};
            if (type === 'click') updates.wasClicked = true;
            if (type === 'save') updates.wasSaved = true;
            if (type === 'dwell' && dwellMs != null) updates.dwellTimeMs = Number(dwellMs);
            await db.updateSearchImpressionInteraction(sid, uid, updates);
            const { trackUserInteraction } = require('../../services/userInteractionService');
            void trackUserInteraction(db, {
                type: `paper_${type}`,
                rawType: type,
                userId: req.user?.id ?? null,
                sessionId: req.sessionId,
                paperId: uid,
                searchId: sid,
                duration: dwellMs != null ? Number(dwellMs) : (elapsedMs != null ? Number(elapsedMs) : null),
                metadata: { elapsedMs: elapsedMs != null ? Number(elapsedMs) : null },
            }, { logger: req.log });
            if (type === 'click') {
                db.logEvent('search_result_click', req.sessionId, {
                    searchId: sid,
                    articleUid: uid,
                    dwellMs: dwellMs != null ? Number(dwellMs) : null,
                    elapsedMs: elapsedMs != null ? Number(elapsedMs) : null,
                }).catch(() => undefined);
            }
            const rewardExplain = explainInteractionReward({
                interactionType: type,
                impression: {
                    was_clicked: type === 'click',
                    was_saved: type === 'save',
                    dwell_time_ms: dwellMs != null ? Number(dwellMs) : 0,
                },
            });
            let banditReward = null;
            const banditUserId = req.user?.id ?? null;
            const canAttributeBandit = Boolean(banditUserId || decisionId != null);
            if (canAttributeBandit) {
                banditReward = await attributeSearchInteractionReward(db, banditUserId, {
                    searchId: sid,
                    articleUid: uid,
                    decisionId: decisionId != null ? Number(decisionId) : null,
                    interactionType: type,
                    dwellMs: dwellMs != null ? Number(dwellMs) : null,
                    wasClicked: type === 'click',
                    wasSaved: type === 'save',
                }).catch((err) => {
                    req.log?.warn?.({ err }, 'attributeSearchInteractionReward failed');
                    return null;
                });
            }
            return res.json({ ok: true, rewardExplain, banditReward });
        } catch (err) {
            req.log?.error?.({ err }, 'Search interaction error');
            return res.status(500).json({ error: 'Failed to record interaction' });
        }
    });

    app.get('/api/search/reward-explain', rateLimit(120, 60), async (req, res) => {
        const interactionType = String(req.query.interactionType || '').trim() || null;
        const feedbackType = String(req.query.feedbackType || '').trim() || null;
        const dwellMs = req.query.dwellMs != null ? Number(req.query.dwellMs) : null;
        const wasClicked = req.query.wasClicked === '1' || req.query.wasClicked === 'true';
        const wasSaved = req.query.wasSaved === '1' || req.query.wasSaved === 'true';
        const isCorrect = req.query.isCorrect === '1' || req.query.isCorrect === 'true';
        const isFirstAttempt = req.query.isFirstAttempt !== '0' && req.query.isFirstAttempt !== 'false';

        const rewardExplain = explainInteractionReward({
            interactionType,
            feedbackType: ['helpful', 'not_helpful'].includes(feedbackType || '') ? feedbackType : null,
            impression: (wasClicked || wasSaved || dwellMs != null) ? {
                was_clicked: wasClicked,
                was_saved: wasSaved,
                dwell_time_ms: dwellMs ?? 0,
            } : null,
            quizAttempt: req.query.isCorrect != null ? { isCorrect, isFirstAttempt } : null,
            recommendationEventType: String(req.query.recommendationEventType || '').trim() || null,
        });
        return res.json(rewardExplain);
    });

    app.post('/api/search/feedback', rateLimit(60, 60), requireJson, async (req, res) => {
        const { articleUid, feedbackType, reason, searchId, decisionId } = req.body || {};
        const uid = String(articleUid || '').trim();
        const type = String(feedbackType || '').trim();
        if (!uid || !['helpful', 'not_helpful'].includes(type)) {
            return res.status(400).json({ error: 'articleUid and feedbackType (helpful|not_helpful) are required' });
        }
        try {
            await db.recordSearchResultFeedback({
                userId: req.user?.id ?? null,
                sessionId: req.sessionId,
                searchId: searchId != null ? Number(searchId) : null,
                articleUid: uid,
                feedbackType: type,
                reason: reason ? String(reason).slice(0, 500) : null,
            });
            const rewardExplain = explainInteractionReward({
                interactionType: 'feedback',
                feedbackType: type,
            });
            let banditReward = null;
            const banditUserId = req.user?.id ?? null;
            const canAttributeBandit = Boolean(banditUserId || decisionId != null);
            if (canAttributeBandit) {
                banditReward = await attributeSearchInteractionReward(db, banditUserId, {
                    searchId: searchId != null ? Number(searchId) : null,
                    articleUid: uid,
                    decisionId: decisionId != null ? Number(decisionId) : null,
                    feedbackType: type,
                }).catch((err) => {
                    req.log?.warn?.({ err }, 'attributeSearchInteractionReward failed');
                    return null;
                });
            }
            return res.json({ ok: true, rewardExplain, banditReward });
        } catch (err) {
            req.log?.error?.({ err }, 'Search feedback error');
            return res.status(500).json({ error: 'Failed to record feedback' });
        }
    });
}

module.exports = { registerSearchFeedbackRoutes };
