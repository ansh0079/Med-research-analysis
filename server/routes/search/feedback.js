const { explainInteractionReward } = require('../../services/rewardAttributionService');
const { attributeSearchInteractionReward } = require('../../services/searchLearningOutcomeService');
const { LEARNING_SIGNAL_TYPES, recordLearningSignal } = require('../../services/learningSignalService');
const {
    consensusEnrichmentJobKey,
    liveClinicalAnswerEnrichmentJobKey,
} = require('../../services/searchEnrichmentKeys');

function registerSearchFeedbackRoutes(app, { db, cache, rateLimit, requireJson }) {
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
            for (const imp of normalized.slice(0, 20)) {
                void recordLearningSignal(db, {
                    userId: req.user?.id ?? null,
                    sessionId: req.sessionId,
                    eventType: LEARNING_SIGNAL_TYPES.SEARCH_IMPRESSION,
                    articleUid: imp.articleUid,
                    searchId: sid,
                    payload: { position: imp.position },
                });
            }
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
            await db.updateSearchImpressionInteraction(sid, uid, updates, {
                userId: req.user?.id ?? null,
                sessionId: req.sessionId,
            });
            void recordLearningSignal(db, {
                userId: req.user?.id ?? null,
                sessionId: req.sessionId,
                eventType: type === 'click'
                    ? LEARNING_SIGNAL_TYPES.SEARCH_CLICK
                    : type === 'save'
                        ? LEARNING_SIGNAL_TYPES.SEARCH_SAVE
                        : LEARNING_SIGNAL_TYPES.SEARCH_DWELL,
                articleUid: uid,
                searchId: sid,
                decisionId: decisionId != null ? Number(decisionId) : null,
                payload: {
                    interactionType: type,
                    dwellMs: dwellMs != null ? Number(dwellMs) : null,
                    elapsedMs: elapsedMs != null ? Number(elapsedMs) : null,
                },
            });
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
                    sessionId: req.sessionId,
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
        const { articleUid, feedbackType, reason, searchId, decisionId, topic } = req.body || {};
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
                topic: topic ? String(topic).slice(0, 240) : null,
            });
            void recordLearningSignal(db, {
                userId: req.user?.id ?? null,
                sessionId: req.sessionId,
                eventType: type === 'helpful'
                    ? LEARNING_SIGNAL_TYPES.SEARCH_FEEDBACK_HELPFUL
                    : LEARNING_SIGNAL_TYPES.SEARCH_FEEDBACK_NOT_HELPFUL,
                topic: topic ? String(topic).slice(0, 240) : '',
                articleUid: uid,
                searchId: searchId != null ? Number(searchId) : null,
                decisionId: decisionId != null ? Number(decisionId) : null,
                payload: {
                    feedbackType: type,
                    reason: reason ? String(reason).slice(0, 500) : null,
                },
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
                    sessionId: req.sessionId,
                    topic: topic ? String(topic).slice(0, 240) : '',
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

    app.get('/api/search/ai-enrichment/:key', rateLimit(60, 60), async (req, res) => {
        const key = String(req.params.key || '');
        if (!/^[0-9a-f]{32}$/.test(key)) {
            return res.status(400).json({ error: 'Invalid enrichment key' });
        }
        try {
            const cached = await Promise.resolve(cache.get(`enrichment:${key}`)).catch((err) => { req.log?.warn?.({ err }, 'cache get failed'); return null; });
            if (cached) {
                return res.json({
                    status: cached.status,
                    ...(cached.status === 'ready' ? {
                        clinicalAnswer: cached.clinicalAnswer ?? null,
                        consensusSynopsis: cached.consensusSynopsis ?? null,
                    } : {}),
                    ...(cached.status === 'failed' ? { errorMessage: cached.errorMessage || 'Enrichment failed' } : {}),
                });
            }

            // Fallback to durable job rows when cache has expired or was never populated.
            if (typeof db?.getAiGenerationJobByKey === 'function') {
                const [consensusJob, clinicalAnswerJob] = await Promise.all([
                    db.getAiGenerationJobByKey(consensusEnrichmentJobKey(key)).catch(() => null),
                    db.getAiGenerationJobByKey(liveClinicalAnswerEnrichmentJobKey(key)).catch(() => null),
                ]);

                const consensusStatus = consensusJob?.status || 'pending';
                const caStatus = clinicalAnswerJob?.status || 'pending';
                const status = consensusStatus === 'failed' && caStatus === 'failed'
                    ? 'failed'
                    : consensusStatus === 'completed' || caStatus === 'completed'
                        ? 'ready'
                        : consensusStatus === 'running' || caStatus === 'running'
                            ? 'running'
                            : 'pending';

                if (status === 'ready') {
                    return res.json({
                        status: 'ready',
                        clinicalAnswer: clinicalAnswerJob?.resultPayload?.clinicalAnswer ?? null,
                        consensusSynopsis: consensusJob?.resultPayload ?? null,
                    });
                }
                if (status === 'failed') {
                    return res.json({
                        status: 'failed',
                        errorMessage: consensusJob?.errorMessage || clinicalAnswerJob?.errorMessage || 'Enrichment failed',
                    });
                }
                return res.json({ status });
            }

            return res.json({ status: 'pending' });
        } catch (err) {
            req.log?.warn?.({ err }, 'Enrichment poll error');
            return res.json({ status: 'pending' });
        }
    });
}

module.exports = { registerSearchFeedbackRoutes };
