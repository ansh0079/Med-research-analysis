const logger = require('../config/logger');
const { buildLearningTrajectorySection } = require('./learnerStateService');
const { selectSearchRankingArm, SEARCH_RANKING_ARMS } = require('./personalizationBanditService');
const { loadMisconceptionBoostContext, misconceptionArticleBoost } = require('./misconceptionSearchBoostService');
const { applyBoostSafety, auditArmSafety } = require('./banditSafetyGuard');

function normalizeUid(value) {
    return String(value || '').trim().toLowerCase();
}

// Exponential decay: weight halves every `halfLifeDays` days.
// Returns 1.0 for brand-new signals, approaches 0 for very old ones.
function timeDecay(createdAt, halfLifeDays) {
    if (!createdAt) return 1;
    const ageDays = (Date.now() - new Date(createdAt).getTime()) / 86400000;
    return Math.exp(-ageDays * Math.LN2 / halfLifeDays);
}

function weightedUidSet(items = []) {
    const out = new Map();
    for (const item of Array.isArray(items) ? items : []) {
        const uid = normalizeUid(typeof item === 'string' ? item : item?.uid);
        if (!uid) continue;
        const weight = typeof item === 'object' && item !== null ? Number(item.w || item.weight || 1) : 1;
        out.set(uid, Math.max(out.get(uid) || 0, Number.isFinite(weight) ? weight : 1));
    }
    return out;
}

function articleUidCandidates(article) {
    return [
        article?.uid,
        article?.pmid,
        article?.doi,
        article?.doi ? String(article.doi).replace(/^https?:\/\/(dx\.)?doi\.org\//i, '') : null,
    ].map(normalizeUid).filter(Boolean);
}

function extractWeakArticleUids(topicKnowledge, weakOutlineNodeIds) {
    if (!topicKnowledge || !Array.isArray(weakOutlineNodeIds) || weakOutlineNodeIds.length === 0) {
        return new Set();
    }
    const sourceArticles = Array.isArray(topicKnowledge.sourceArticles) ? topicKnowledge.sourceArticles : [];
    const knowledge = topicKnowledge.knowledge || {};
    const teachingPoints = Array.isArray(knowledge.teachingPoints) ? knowledge.teachingPoints : [];
    const uids = new Set();

    for (const nodeId of weakOutlineNodeIds) {
        const srcMatch = String(nodeId).match(/^src-(\d+)$/);
        if (srcMatch) {
            const sourceIndex = parseInt(srcMatch[1], 10);
            const article = sourceArticles.find((a) => a.sourceIndex === sourceIndex);
            if (article?.uid) uids.add(normalizeUid(article.uid));
            continue;
        }
        const tpMatch = String(nodeId).match(/^tp-(\d+)$/);
        if (tpMatch) {
            const idx = parseInt(tpMatch[1], 10) - 1;
            const point = teachingPoints[idx];
            if (point && Array.isArray(point.sourceIndices)) {
                for (const si of point.sourceIndices) {
                    const article = sourceArticles.find((a) => a.sourceIndex === si);
                    if (article?.uid) uids.add(normalizeUid(article.uid));
                }
            }
            continue;
        }
    }
    return uids;
}

function learningContextFromMemory(memory, weakArticleUids = new Set()) {
    const top = weightedUidSet(memory?.topArticles || []);
    const saved = weightedUidSet(memory?.savedArticles || []);
    const memoryTier = memory?.memoryTier || 'none';
    const shouldPersonalize = memoryTier === 'building' || memoryTier === 'strong';

    return {
        memoryTier,
        searchCount: Number(memory?.searchCount || 0),
        topPaperCount: Number(memory?.topPaperCount || top.size || 0),
        savedPaperCount: Number(memory?.savedPaperCount || saved.size || 0),
        weakOutlineNodeCount: Array.isArray(memory?.weakOutlineNodeIds) ? memory.weakOutlineNodeIds.length : 0,
        shouldPersonalize,
        preferredArticleUids: top,
        savedArticleUids: saved,
        helpfulArticleUids: new Map(),
        notHelpfulArticleUids: new Map(),
        interactionArticleUids: new Map(),
        impressionArticleUids: new Map(),
        missedPaperUids: new Map(),
        weakArticleUids,
    };
}

function interactionWeight(row) {
    const type = String(row?.interaction_type || row?.interactionType || 'view');
    const dwell = Math.max(0, Number(row?.dwell_time_ms ?? row?.dwellTime ?? 0) || 0);
    const dwellBoost = Math.min(0.75, dwell / 120000);
    if (type === 'save') return 2.25 + dwellBoost;
    if (type === 'analyze' || type === 'analysis') return 1.75 + dwellBoost;
    if (type === 'click' || type === 'open') return 1 + dwellBoost;
    if (type === 'dwell') return 0.5 + dwellBoost;
    return 0.35 + dwellBoost;
}

function collectTrajectoryTerms(previousQueries = [], misconceptionPhrases = []) {
    const terms = new Set();
    for (const q of Array.isArray(previousQueries) ? previousQueries : []) {
        for (const t of String(q).toLowerCase().split(/\s+/)) {
            if (t.length > 3) terms.add(t);
        }
    }
    for (const phrase of Array.isArray(misconceptionPhrases) ? misconceptionPhrases : []) {
        for (const t of String(phrase).toLowerCase().split(/\s+/)) {
            if (t.length > 4) terms.add(t);
        }
    }
    return terms;
}

function articleTextBlob(article) {
    return `${article?.title || ''} ${article?.abstract || ''}`.toLowerCase();
}

async function buildSearchLearningContext({ db, userId, query, sessionId, previousQueries = [] }) {
    if (!db || !query || typeof db.getUserTopicMemory !== 'function') {
        return learningContextFromMemory(null);
    }

    try {
        const memory = userId ? await db.getUserTopicMemory(userId, query) : null;
        let weakArticleUids = new Set();
        if (userId && memory?.weakOutlineNodeIds?.length > 0 && typeof db.getTopicKnowledge === 'function') {
            const topicKnowledge = await db.getTopicKnowledge(query).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; });
            weakArticleUids = extractWeakArticleUids(topicKnowledge, memory.weakOutlineNodeIds);
        }
        const context = learningContextFromMemory(memory, weakArticleUids);
        if (userId && typeof db.listSearchResultFeedbackForUser === 'function') {
            const rows = await db.listSearchResultFeedbackForUser(userId, { limit: 250, days: 120 });
            for (const row of Array.isArray(rows) ? rows : []) {
                const uid = normalizeUid(row.article_uid || row.articleUid);
                if (!uid) continue;
                // Deliberate feedback decays slowly (90-day half-life).
                const decay = timeDecay(row.created_at, 90);
                if (row.feedback_type === 'helpful' || row.feedbackType === 'helpful') {
                    context.helpfulArticleUids.set(uid, (context.helpfulArticleUids.get(uid) || 0) + decay);
                }
                if (row.feedback_type === 'not_helpful' || row.feedbackType === 'not_helpful') {
                    context.notHelpfulArticleUids.set(uid, (context.notHelpfulArticleUids.get(uid) || 0) + decay);
                }
            }
            if (context.helpfulArticleUids.size > 0 || context.notHelpfulArticleUids.size > 0) {
                context.shouldPersonalize = true;
            }
        }
        if (userId && typeof db.listSynopsisFeedbackForUser === 'function') {
            const synopsisRows = await db.listSynopsisFeedbackForUser(userId, { limit: 250, days: 120 });
            for (const row of Array.isArray(synopsisRows) ? synopsisRows : []) {
                const uid = normalizeUid(row.article_uid || row.articleUid);
                if (!uid) continue;
                const decay = timeDecay(row.created_at, 90);
                if (row.feedback_type === 'helpful' || row.feedbackType === 'helpful') {
                    context.helpfulArticleUids.set(uid, (context.helpfulArticleUids.get(uid) || 0) + decay);
                }
                if (row.feedback_type === 'not_helpful' || row.feedbackType === 'not_helpful') {
                    context.notHelpfulArticleUids.set(uid, (context.notHelpfulArticleUids.get(uid) || 0) + decay);
                }
            }
            if (context.helpfulArticleUids.size > 0 || context.notHelpfulArticleUids.size > 0) {
                context.shouldPersonalize = true;
            }
        }
        if (userId && typeof db.getUserInteractions === 'function') {
            const rows = await db.getUserInteractions(userId, { limit: 250, days: 60 });
            for (const row of Array.isArray(rows) ? rows : []) {
                const uid = normalizeUid(row.article_id || row.articleId);
                if (!uid) continue;
                // Behavioural interactions decay at 30-day half-life.
                const decay = timeDecay(row.created_at, 30);
                context.interactionArticleUids.set(uid, (context.interactionArticleUids.get(uid) || 0) + interactionWeight(row) * decay);
            }
            if (context.interactionArticleUids.size > 0) {
                context.shouldPersonalize = true;
            }
        }
        if (userId && typeof db.getRecentSynopsisViews === 'function') {
            const synopsisViews = await db.getRecentSynopsisViews(userId, { days: 60, limit: 200 });
            for (const row of Array.isArray(synopsisViews) ? synopsisViews : []) {
                const uid = normalizeUid(row.article_id);
                if (!uid) continue;
                const decay = timeDecay(row.created_at, 30);
                context.interactionArticleUids.set(uid, (context.interactionArticleUids.get(uid) || 0) + 0.4 * decay);
            }
            if (synopsisViews.length > 0) {
                context.shouldPersonalize = true;
            }
        }
        if (userId && typeof db.getQuizAttempts === 'function') {
            try {
                const missRows = await db.getQuizAttempts({ userId, topic: query, limit: 300, offset: 0 });
                const missedPaperUids = new Map();
                const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
                let hasDangerousMisconception = false;
                for (const row of Array.isArray(missRows) ? missRows : []) {
                    const uid = normalizeUid(row.source_article_uid || row.sourceArticleUid);
                    if (!uid) continue;
                    const ts = row.created_at ? new Date(row.created_at).getTime() : 0;
                    if (ts < cutoff) continue;
                    if (row.is_correct === 0 || row.is_correct === false || row.isCorrect === false) {
                        missedPaperUids.set(uid, (missedPaperUids.get(uid) || 0) + 1);
                        // Confidence >= 4 on a wrong answer = dangerous misconception:
                        // user is confidently incorrect, highest-risk calibration state.
                        if (Number(row.confidence || 0) >= 4) hasDangerousMisconception = true;
                    }
                }
                context.missedPaperUids = missedPaperUids;
                context.hasDangerousMisconception = hasDangerousMisconception;
                if (missedPaperUids.size > 0) context.shouldPersonalize = true;
            } catch {
                context.missedPaperUids = new Map();
                context.hasDangerousMisconception = false;
            }
        } else {
            context.missedPaperUids = new Map();
            context.hasDangerousMisconception = false;
        }

        if (sessionId && typeof db.getRecentImpressions === 'function') {
            const rows = await db.getRecentImpressions(sessionId, { days: 30, limit: 200 });
            for (const row of Array.isArray(rows) ? rows : []) {
                const uid = normalizeUid(row.article_uid || row.articleUid);
                if (!uid) continue;
                let delta = 0;
                if (row.was_saved === 1 || row.was_saved === true) delta += 1.0;
                else if (row.was_clicked === 1 || row.was_clicked === true) delta += 0.5;
                else if ((row.dwell_time_ms || 0) > 30000) delta += 0.5;
                else if ((row.was_clicked === 0 || row.was_clicked === false) && (row.was_saved === 0 || row.was_saved === false)) delta -= 0.3;
                if ((row.dwell_time_ms || 0) > 0 && (row.dwell_time_ms || 0) <= 3000) delta -= 0.1;
                // Impressions are session-level; decay sharply after 14 days.
                const decay = timeDecay(row.created_at, 14);
                context.impressionArticleUids.set(uid, (context.impressionArticleUids.get(uid) || 0) + delta * decay);
            }
            if (context.impressionArticleUids.size > 0) {
                context.shouldPersonalize = true;
            }
        }

        const misconceptionPhrases = [];
        if (userId && typeof db.listLearningEvents === 'function') {
            const events = await db.listLearningEvents({ userId, topic: query, limit: 20 }).catch(() => []);
            for (const e of Array.isArray(events) ? events : []) {
                const payload = e.payload && typeof e.payload === 'object' ? e.payload : {};
                if (Array.isArray(payload.misconceptions)) {
                    misconceptionPhrases.push(...payload.misconceptions.map(String).filter(Boolean));
                }
            }
        }
        context.trajectoryTerms = collectTrajectoryTerms(previousQueries, misconceptionPhrases);
        context.profileWeakTopics = [];
        if (userId && typeof db.getLearningProfile === 'function') {
            const profile = await db.getLearningProfile(userId).catch(() => null);
            context.profileWeakTopics = Array.isArray(profile?.weakTopics) ? profile.weakTopics.map(String).filter(Boolean) : [];
            if (context.profileWeakTopics.length > 0) context.shouldPersonalize = true;
        }
        if (userId) {
            context.trajectoryHint = await buildLearningTrajectorySection(db, userId, query, { limit: 6, days: 60 });
            if (context.trajectoryHint) context.shouldPersonalize = true;
        }
        if (previousQueries.length > 0 || context.trajectoryTerms.size > 0) {
            context.shouldPersonalize = true;
        }

        if (userId) {
            context.misconceptionBoost = await loadMisconceptionBoostContext(db, userId, query);
            if (context.misconceptionBoost?.correctiveArticleUids?.size > 0
                || context.misconceptionBoost?.misconceptionPhrases?.length > 0) {
                context.shouldPersonalize = true;
            }
            context.banditSelection = await selectSearchRankingArm(db, userId).catch((err) => {
                logger.debug({ err }, 'selectSearchRankingArm failed');
                return { armId: 'heuristic_default', weights: SEARCH_RANKING_ARMS.heuristic_default };
            });
            // Safety override: dangerous misconception = user is confidently wrong on this topic.
            // Bypass the bandit and force misconception_heavy arm to surface contradicting evidence first.
            if (context.hasDangerousMisconception) {
                context.banditSelection = {
                    ...context.banditSelection,
                    armId: 'misconception_heavy',
                    weights: SEARCH_RANKING_ARMS.misconception_heavy,
                    calibrationOverride: 'dangerous_misconception',
                };
            }
        } else {
            context.banditSelection = { armId: 'heuristic_default', weights: SEARCH_RANKING_ARMS.heuristic_default };
        }
        return context;
    } catch {
        return learningContextFromMemory(null);
    }
}

function publicLearningContext(context) {
    return {
        memoryTier: context?.memoryTier || 'none',
        searchCount: Number(context?.searchCount || 0),
        topPaperCount: Number(context?.topPaperCount || 0),
        savedPaperCount: Number(context?.savedPaperCount || 0),
        weakOutlineNodeCount: Number(context?.weakOutlineNodeCount || 0),
        helpfulFeedbackCount: context?.helpfulArticleUids?.size || 0,
        notHelpfulFeedbackCount: context?.notHelpfulArticleUids?.size || 0,
        interactionCount: context?.interactionArticleUids?.size || 0,
        impressionCount: context?.impressionArticleUids?.size || 0,
        missedPaperCount: context?.missedPaperUids?.size || 0,
        weakArticleCount: context?.weakArticleUids?.size || 0,
        trajectoryTermCount: context?.trajectoryTerms?.size || 0,
        profileWeakTopicCount: context?.profileWeakTopics?.length || 0,
        hasTrajectoryHints: Boolean(context?.trajectoryHint),
        personalized: Boolean(context?.shouldPersonalize),
        banditArmId: context?.banditSelection?.armId || null,
        misconceptionTargets: context?.misconceptionBoost?.correctiveArticleUids?.size || 0,
        calibrationOverride: context?.banditSelection?.calibrationOverride || null,
        hasDangerousMisconception: Boolean(context?.hasDangerousMisconception),
    };
}

function articleLearningBoost(article, context) {
    if (!context?.shouldPersonalize) return 0;

    const weights = context.banditSelection?.weights || SEARCH_RANKING_ARMS.heuristic_default;
    let boost = 0;
    for (const uid of articleUidCandidates(article)) {
        const preferredWeight = context.preferredArticleUids?.get(uid) || 0;
        const savedWeight = context.savedArticleUids?.get(uid) || 0;
        const helpfulWeight = context.helpfulArticleUids?.get(uid) || 0;
        const notHelpfulWeight = context.notHelpfulArticleUids?.get(uid) || 0;
        const interactionScore = context.interactionArticleUids?.get(uid) || 0;
        const impressionWeight = context.impressionArticleUids?.get(uid) || 0;
        if (preferredWeight > 0) boost = Math.max(boost, Math.min(1.5, 0.75 + preferredWeight * 0.15));
        if (savedWeight > 0) boost = Math.max(boost, Math.min(2.5, (1.25 + savedWeight * 0.2) * weights.saved));
        if (helpfulWeight > 0) boost = Math.max(boost, Math.min(2, (1 + helpfulWeight * 0.25) * weights.helpful));
        if (interactionScore > 0) boost = Math.max(boost, Math.min(1.4, 0.4 + interactionScore * 0.18));
        if (notHelpfulWeight > 0) boost = Math.min(boost, -Math.min(3, 1.5 + notHelpfulWeight * 0.35));
        if (impressionWeight > 0) boost = Math.max(boost, Math.min(1.2, (0.3 + impressionWeight * 0.4) * weights.impression));
        if (impressionWeight < 0) boost = Math.min(boost, Math.max(-2, impressionWeight * 0.8));
        const missCount = context.missedPaperUids?.get(uid) || 0;
        if (missCount > 0) boost = Math.max(boost, Math.min(1.8, (0.6 + missCount * 0.3) * weights.missed));
        if (context.weakArticleUids?.has(uid)) boost = Math.max(boost, Math.min(1.4, (0.5 + boost) * weights.weak));
    }

    const misconceptionBoost = misconceptionArticleBoost(article, context.misconceptionBoost, weights);
    if (misconceptionBoost > 0) boost = Math.max(boost, misconceptionBoost);

    boost = applyBoostSafety(article, boost);

    const blob = articleTextBlob(article);
    if (blob && context.trajectoryTerms?.size) {
        for (const term of context.trajectoryTerms) {
            if (blob.includes(term)) {
                boost = Math.max(boost, 0.35 * weights.trajectory);
                break;
            }
        }
    }
    if (blob && Array.isArray(context.profileWeakTopics)) {
        for (const wt of context.profileWeakTopics) {
            const needle = String(wt || '').toLowerCase().trim();
            if (needle.length >= 4 && blob.includes(needle)) {
                boost = Math.max(boost, 0.28 * weights.weak);
                break;
            }
        }
    }
    return boost;
}

// How many compositeScore points one unit of boost is worth.
// With max boost ~2.5 and typical compositeScore range ~20–150, a scale of 20
// lets a maximally-boosted article overtake the top evidence result when warranted.
const BOOST_SCORE_SCALE = 20;

function buildCompositeScoreMap(bouquetRanking) {
    const map = new Map();
    for (const row of Array.isArray(bouquetRanking) ? bouquetRanking : []) {
        const score = Number(row?.compositeScore || 0);
        if (!score) continue;
        for (const key of articleUidCandidates(row)) {
            if (!map.has(key)) map.set(key, score);
        }
    }
    return map;
}

function applySearchLearningBoost(articles, context, bouquetRanking = []) {
    if (!Array.isArray(articles) || articles.length < 2 || !context?.shouldPersonalize) {
        return articles;
    }

    const compositeScores = buildCompositeScoreMap(bouquetRanking);
    const N = articles.length;

    const ranked = articles
        .map((article, index) => {
            const boost = articleLearningBoost(article, context);
            let baseScore = null;
            let missCount = 0;
            for (const key of articleUidCandidates(article)) {
                const s = compositeScores.get(key);
                if (s != null && baseScore === null) baseScore = s;
                const mc = context.missedPaperUids?.get(key) || 0;
                if (mc > missCount) missCount = mc;
            }
            // When compositeScore is available use it so boosts can create large rank jumps.
            // Fall back to (N - index) when there is no bouquet ranking (e.g. in unit tests).
            const score = baseScore !== null
                ? baseScore + boost * BOOST_SCORE_SCALE
                : (N - index) + boost;
            return { article, index, boost, score, missCount };
        })
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.index - b.index; // stable tiebreak: preserve evidence order
        });

    const result = ranked.map(({ article, boost, missCount }) => (
        boost !== 0
            ? {
                ...article,
                _learningBoost: Number(boost.toFixed(3)),
                _banditArmId: context.banditSelection?.armId || null,
                ...(missCount > 0 ? { _missedQuizCount: missCount } : {}),
            }
            : article
    ));

    context._banditMeta = {
        armId: context.banditSelection?.armId || 'heuristic_default',
        scopeKey: context.banditSelection?.scopeKey || 'global',
        memoryTier: context.memoryTier || 'none',
        sampled: context.banditSelection?.sampled ?? null,
        misconceptionBoostCount: context.misconceptionBoost?.correctiveArticleUids?.size || 0,
    };

    return result;
}

module.exports = {
    applySearchLearningBoost,
    articleLearningBoost,
    articleUidCandidates,
    buildCompositeScoreMap,
    buildSearchLearningContext,
    collectTrajectoryTerms,
    publicLearningContext,
    interactionWeight,
    BOOST_SCORE_SCALE,
};
