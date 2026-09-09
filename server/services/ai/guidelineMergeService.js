'use strict';

/**
 * One merged view of everything the guidelines say about a topic.
 *
 * The product promise is "all the evidence on a topic, on one page, for a
 * clinician to decide on". Guidelines arrived as a flat list of rows from
 * several organisations, leaving the reader to merge five bodies' positions in
 * their head. This groups them by clinical decision instead, so agreement and
 * disagreement are visible together.
 *
 * Two properties matter more than the grouping quality:
 *
 * 1. The model never writes recommendation text. It returns theme labels and
 *    row indices; every group is rebuilt from the original rows. A fabricated
 *    or subtly reworded recommendation is therefore unrepresentable.
 *
 * 2. Nothing is silently dropped. Under "we show you all the evidence", a
 *    recommendation the model forgot to assign is a failure of the product, not
 *    a cosmetic gap -- and it fails invisibly. Every unassigned row is
 *    reconciled into a final theme, and the count is reported.
 */

const logger = require('../../config/logger');
const { buildGuidelineMergePrompt } = require('../../prompts/guidelineMerge');
const { getPromptVersion } = require('../../prompts/promptVersions');
const { getProviderCandidates } = require('../../utils/aiProvider');
const { getSharedAiService } = require('../aiService');
const { isIssuingBodyValue } = require('../../utils/guidelineAttribution');
const { assessGuidelineCandidate } = require('../../utils/guidelineQuality');

/** Enough to be worth merging; below this the flat list is already readable. */
const MIN_RECOMMENDATIONS = 3;
/** Beyond this the prompt stops being reliable and the panel stops being scannable. */
const MAX_RECOMMENDATIONS = 40;
const CACHE_TTL_SECONDS = 7 * 86400;

const VALID_AGREEMENT = new Set(['agree', 'conflict', 'single']);

function normalizeText(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Rows worth merging: real issuing bodies, real recommendations, no duplicates.
 *
 * The corpus stores trial findings and scraped abstract fragments in this same
 * table, and journal names in source_body. Under a merged "what the guidelines
 * recommend" heading each of those asserts guidance that nobody issued.
 */
function selectMergeableRecommendations(guidelines = []) {
    const seen = new Set();
    const out = [];
    for (const row of guidelines) {
        const sourceBody = row?.sourceBody || row?.source_body || null;
        const recommendationText = row?.recommendationText || row?.recommendation_text || '';
        if (!isIssuingBodyValue(sourceBody)) continue;
        if (!assessGuidelineCandidate({ sourceBody, recommendationText }).ok) continue;
        const text = normalizeText(recommendationText);
        if (text.length < 20) continue;
        const key = `${normalizeText(sourceBody)}|${text}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
            id: row.id ?? null,
            sourceBody,
            sourceYear: row.sourceYear ?? row.source_year ?? null,
            sourceUrl: row.sourceUrl || row.source_url || null,
            recommendationText: String(recommendationText).trim(),
            recommendationStrength: row.recommendationStrength || row.recommendation_strength || null,
            recommendationCertainty: row.recommendationCertainty || row.recommendation_certainty || null,
            population: row.population || null,
        });
        if (out.length >= MAX_RECOMMENDATIONS) break;
    }
    return out;
}

/**
 * Turn the model's index groups into themes of real rows.
 *
 * Rejects any index that is out of range or already used, then sweeps every
 * recommendation the model never assigned into a final theme. The caller is
 * told how many that was, so a systematically bad grouping is measurable rather
 * than looking like a short list.
 */
function reconcileThemes(rawThemes, recommendations) {
    const used = new Set();
    const themes = [];
    for (const theme of Array.isArray(rawThemes) ? rawThemes : []) {
        const indexes = Array.isArray(theme?.recommendationIndexes) ? theme.recommendationIndexes : [];
        const items = [];
        for (const value of indexes) {
            const index = Number(value);
            if (!Number.isInteger(index) || index < 0 || index >= recommendations.length) continue;
            if (used.has(index)) continue;
            used.add(index);
            items.push(recommendations[index]);
        }
        if (items.length === 0) continue;
        const label = String(theme?.label || '').trim().slice(0, 80);
        const bodies = [...new Set(items.map((r) => r.sourceBody).filter(Boolean))];
        // The model's own agreement call is not trusted where the row data
        // already settles it: one organisation cannot disagree with itself.
        const claimed = VALID_AGREEMENT.has(theme?.agreement) ? theme.agreement : 'agree';
        const agreement = bodies.length <= 1 ? 'single' : (claimed === 'single' ? 'agree' : claimed);
        themes.push({
            label: label || 'Other recommendations',
            agreement,
            conflictNote: agreement === 'conflict' && theme?.conflictNote
                ? String(theme.conflictNote).trim().slice(0, 300)
                : null,
            bodies,
            recommendations: items,
        });
    }

    const unassigned = recommendations.filter((_, i) => !used.has(i));
    if (unassigned.length > 0) {
        themes.push({
            label: 'Other recommendations',
            agreement: [...new Set(unassigned.map((r) => r.sourceBody))].length <= 1 ? 'single' : 'agree',
            conflictNote: null,
            bodies: [...new Set(unassigned.map((r) => r.sourceBody).filter(Boolean))],
            recommendations: unassigned,
        });
    }
    return { themes, unassignedCount: unassigned.length };
}

function parseThemesJson(text) {
    const cleaned = String(text || '').replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
        return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
        return null;
    }
}

/**
 * A single ungrouped theme holding everything, used when no provider is
 * available or the model's answer is unusable. Every recommendation still
 * reaches the reader attributed -- degrading to a flat list is acceptable,
 * dropping guidance is not.
 */
function ungroupedFallback(recommendations, reason) {
    const bodies = [...new Set(recommendations.map((r) => r.sourceBody).filter(Boolean))];
    return {
        themes: [{
            label: 'All recommendations',
            agreement: bodies.length <= 1 ? 'single' : 'agree',
            conflictNote: null,
            bodies,
            recommendations,
        }],
        unassignedCount: 0,
        grouped: false,
        degradedReason: reason,
    };
}

function cacheKey(topic, count) {
    return `guideline-merge:${normalizeText(topic)}:${count}:pv:${getPromptVersion('guideline_merge')}`;
}

/**
 * Build the merged guideline view for a topic.
 *
 * @returns {Promise<{topic, themes, recommendationCount, bodyCount, bodies,
 *   latestYear, unassignedCount, grouped, degradedReason, cached}|null>}
 *   null when the topic has too little guidance to merge.
 */
async function buildMergedGuidelineView({
    db, topic, serverConfig, fetchImpl, cache, limit = MAX_RECOMMENDATIONS, log = logger,
}) {
    if (!topic || !db?.getGuidelinesByTopic) return null;

    const rows = await db.getGuidelinesByTopic(topic, { limit: Math.max(limit, MAX_RECOMMENDATIONS) })
        .catch((err) => { log.debug({ err, topic }, 'merged guidelines lookup failed'); return []; });
    const recommendations = selectMergeableRecommendations(rows || []);
    if (recommendations.length < MIN_RECOMMENDATIONS) return null;

    const bodies = [...new Set(recommendations.map((r) => r.sourceBody).filter(Boolean))];
    const years = recommendations.map((r) => Number(r.sourceYear)).filter((y) => Number.isFinite(y) && y > 0);
    const summary = {
        topic,
        recommendationCount: recommendations.length,
        bodyCount: bodies.length,
        bodies,
        latestYear: years.length > 0 ? Math.max(...years) : null,
    };

    const key = cacheKey(topic, recommendations.length);
    if (cache?.getAsync) {
        const hit = await cache.getAsync(key).catch(() => null);
        if (hit) return { ...hit, cached: true };
    }

    const candidates = getProviderCandidates({ provider: 'auto' }, serverConfig);
    if (candidates.length === 0) {
        return { ...summary, ...ungroupedFallback(recommendations, 'no_provider'), cached: false };
    }

    let parsed = null;
    const ai = getSharedAiService({ serverConfig, fetchImpl });
    const prompt = buildGuidelineMergePrompt(topic, recommendations);
    for (const candidate of candidates) {
        try {
            const text = await ai.callText(prompt, candidate.provider, candidate.model, {
                temperature: 0.1,
                maxOutputTokens: 2000,
            });
            parsed = parseThemesJson(typeof text === 'string' ? text : text?.text);
            if (parsed?.themes) break;
        } catch (err) {
            log.warn({ err, provider: candidate.provider, topic }, 'guideline merge provider failed');
        }
    }
    if (!parsed?.themes) {
        return { ...summary, ...ungroupedFallback(recommendations, 'grouping_unavailable'), cached: false };
    }

    const { themes, unassignedCount } = reconcileThemes(parsed.themes, recommendations);
    const result = {
        ...summary,
        themes,
        unassignedCount,
        grouped: true,
        degradedReason: null,
    };
    if (cache?.setAsync) await cache.setAsync(key, result, CACHE_TTL_SECONDS).catch(() => {});
    return { ...result, cached: false };
}

module.exports = {
    buildMergedGuidelineView,
    selectMergeableRecommendations,
    reconcileThemes,
    parseThemesJson,
    MIN_RECOMMENDATIONS,
    MAX_RECOMMENDATIONS,
};
