'use strict';

/**
 * Clinical guardrail: guideline-coverage action mask.
 *
 * For therapeutic or guideline-intent queries, serving zero guideline sources
 * is a clinical-safety failure, no matter how the ranker scored them. This
 * mask runs after all learning/bandit reordering and reinstates the best
 * available guideline candidate if (and only if) the final ranked list would
 * otherwise serve none. It is a hard constraint, not a penalty term:
 * deterministic, auditable, and logged in telemetry.
 *
 * The mask never fabricates evidence: if the retrieval pool itself contains
 * no guideline source, the list passes through unchanged and the miss is
 * reported so the gap can be fixed upstream (ingestion), not masked downstream.
 */

const GUARDED_INTENTS = new Set(['therapeutic', 'guideline']);

function isGuidelineSource(article) {
    if (!article) return false;
    if (article._evidenceLane === 'guidelines') return true;
    if (article.archetype === 'guideline' || article._archetype === 'guideline') return true;
    if (article.sourceType === 'guideline') return true;
    return false;
}

function articleKey(article) {
    return String(article?.uid || article?.pmid || article?.doi || '');
}

/**
 * @param {Array} ranked   final ranked articles (post-learning, post-lanes)
 * @param {Array} pool     full retrieved candidate pool for the same search
 * @param {object} opts    { intent }
 * @returns {{ articles: Array, applied: boolean, inserted: object|null, reason: string }}
 */
function applyGuidelineCoverageMask(ranked = [], pool = [], { intent = 'general' } = {}) {
    if (!GUARDED_INTENTS.has(intent)) {
        return { articles: ranked, applied: false, inserted: null, reason: 'intent_not_guarded' };
    }
    if (!Array.isArray(ranked) || !ranked.length) {
        return { articles: ranked, applied: false, inserted: null, reason: 'empty_result' };
    }
    if (ranked.some(isGuidelineSource)) {
        return { articles: ranked, applied: false, inserted: null, reason: 'coverage_ok' };
    }
    const inRanked = new Set(ranked.map(articleKey));
    const candidate = (Array.isArray(pool) ? pool : []).find((a) => isGuidelineSource(a) && !inRanked.has(articleKey(a)));
    if (!candidate) {
        return { articles: ranked, applied: false, inserted: null, reason: 'no_guideline_in_pool' };
    }
    const articles = [...ranked];
    const insertAt = Math.min(2, articles.length); // top-3 visibility
    articles.splice(insertAt, 0, { ...candidate, _guidelineGuardrail: 'inserted' });
    // Preserve served count: drop the tail item.
    articles.pop();
    return { articles, applied: true, inserted: candidate, reason: 'guideline_reinstated' };
}

module.exports = { GUARDED_INTENTS, isGuidelineSource, applyGuidelineCoverageMask };
