'use strict';

const logger = require('../../config/logger');

/**
 * When search has low recall or poor engagement, generate strategy-specific
 * reformulations, score them, and cache the winning rewrite.
 */

function normalizeQuery(q) {
    return String(q || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 240);
}

function buildStrategies(query) {
    const q = String(query || '').trim();
    if (!q) return [];
    const base = q.replace(/[?]/g, ' ').replace(/\s+/g, ' ').trim();
    return [
        {
            strategy: 'mesh_heavy',
            reformulated: `${base}[MeSH Terms] OR ${base}[Title/Abstract]`,
        },
        {
            strategy: 'trial_acronym_heavy',
            reformulated: `(${base}) AND (randomized OR randomised OR "clinical trial" OR RCT OR placebo)`,
        },
        {
            strategy: 'guideline_focused',
            reformulated: `(${base}) AND (guideline OR "practice guideline" OR "consensus statement" OR recommendation)`,
        },
        {
            strategy: 'recent_review_focused',
            reformulated: `(${base}) AND ("systematic review" OR "meta-analysis" OR Cochrane) AND ("2020"[PDAT] : "3000"[PDAT])`,
        },
        {
            strategy: 'pico_expanded',
            reformulated: `(${base}) AND (population OR intervention OR comparator OR outcome OR efficacy OR safety)`,
        },
    ];
}

function engagementScore({ resultCount = 0, clickRate = 0, saveCount = 0 } = {}) {
    const recall = Math.min(1, Number(resultCount) / 20);
    return Number((0.55 * recall + 0.3 * Math.min(1, clickRate) + 0.15 * Math.min(1, saveCount / 3)).toFixed(4));
}

async function getCachedWinner(db, query) {
    if (!db?.get) return null;
    const norm = normalizeQuery(query);
    const row = await db.get(
        `SELECT * FROM query_reformulation_cache
         WHERE normalized_query = ?
         ORDER BY engagement_score DESC, win_count DESC
         LIMIT 1`,
        [norm]
    ).catch(() => null);
    if (!row || Number(row.engagement_score || 0) <= 0) return null;
    return {
        strategy: row.strategy,
        reformulatedQuery: row.reformulated_query,
        engagementScore: Number(row.engagement_score || 0),
        winCount: Number(row.win_count || 0),
        resultCount: Number(row.result_count || 0),
        cached: true,
    };
}

async function upsertReformulationTrial(db, {
    query,
    strategy,
    reformulatedQuery,
    resultCount = 0,
    clickRate = 0,
    saveCount = 0,
    won = false,
}) {
    if (!db?.run) return null;
    const now = new Date().toISOString();
    const norm = normalizeQuery(query);
    const score = engagementScore({ resultCount, clickRate, saveCount });
    await db.run(
        `INSERT INTO query_reformulation_cache (
            original_query, normalized_query, strategy, reformulated_query,
            result_count, engagement_score, win_count, trial_count, last_result_count,
            metadata_json, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
         ON CONFLICT(normalized_query, strategy) DO UPDATE SET
            reformulated_query = excluded.reformulated_query,
            result_count = excluded.result_count,
            engagement_score = CASE
                WHEN excluded.engagement_score > query_reformulation_cache.engagement_score
                THEN excluded.engagement_score ELSE query_reformulation_cache.engagement_score END,
            win_count = query_reformulation_cache.win_count + ?,
            trial_count = query_reformulation_cache.trial_count + 1,
            last_result_count = excluded.last_result_count,
            updated_at = excluded.updated_at`,
        [
            String(query).slice(0, 400),
            norm,
            String(strategy),
            String(reformulatedQuery).slice(0, 800),
            Number(resultCount) || 0,
            score,
            won ? 1 : 0,
            Number(resultCount) || 0,
            JSON.stringify({ clickRate, saveCount }),
            now,
            now,
            won ? 1 : 0,
        ]
    ).catch((err) => {
        logger.debug({ err, strategy }, 'upsertReformulationTrial failed');
    });
    return { strategy, reformulatedQuery, engagementScore: score, won };
}

/**
 * @param {object} deps
 * @param {function} [deps.countResults] async (reformulatedQuery) => number
 */
async function runQueryFailureAutoRepair({
    db,
    query,
    resultCount = 0,
    threshold = 5,
    engagement = null,
    countResults = null,
    logger: log = logger,
} = {}) {
    const poorEngagement = engagement && Number(engagement.clickRate || 0) < 0.05 && Number(resultCount) >= threshold;
    const lowRecall = Number(resultCount) < threshold;
    if (!lowRecall && !poorEngagement) {
        return { repaired: false, reason: 'quality_ok' };
    }

    const cached = await getCachedWinner(db, query);
    if (cached && cached.engagementScore >= 0.25) {
        return { repaired: true, reason: 'cache_hit', winner: cached, candidates: [cached] };
    }

    const strategies = buildStrategies(query);
    const candidates = [];
    for (const s of strategies) {
        let count = 0;
        if (typeof countResults === 'function') {
            try {
                count = Number(await countResults(s.reformulated)) || 0;
            } catch (err) {
                log.debug?.({ err, strategy: s.strategy }, 'reformulation count failed');
            }
        } else {
            // Heuristic prior when we cannot hit PubMed again in-process
            count = s.strategy === 'mesh_heavy' ? Math.max(resultCount, 3)
                : s.strategy === 'guideline_focused' ? Math.max(2, Math.floor(resultCount * 0.6))
                    : Math.max(resultCount, 1);
        }
        const trial = await upsertReformulationTrial(db, {
            query,
            strategy: s.strategy,
            reformulatedQuery: s.reformulated,
            resultCount: count,
            clickRate: 0,
            saveCount: 0,
            won: false,
        });
        candidates.push({
            strategy: s.strategy,
            reformulatedQuery: s.reformulated,
            resultCount: count,
            engagementScore: trial?.engagementScore ?? engagementScore({ resultCount: count }),
        });
    }

    candidates.sort((a, b) => b.engagementScore - a.engagementScore || b.resultCount - a.resultCount);
    const winner = candidates[0] || null;
    if (winner && winner.resultCount > resultCount) {
        await upsertReformulationTrial(db, {
            query,
            strategy: winner.strategy,
            reformulatedQuery: winner.reformulatedQuery,
            resultCount: winner.resultCount,
            won: true,
        });
        return {
            repaired: true,
            reason: lowRecall ? 'low_recall' : 'poor_engagement',
            winner: { ...winner, cached: false },
            candidates,
        };
    }

    return {
        repaired: false,
        reason: 'no_better_reformulation',
        winner,
        candidates,
    };
}

module.exports = {
    normalizeQuery,
    buildStrategies,
    engagementScore,
    getCachedWinner,
    upsertReformulationTrial,
    runQueryFailureAutoRepair,
};
