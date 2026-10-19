'use strict';

/**
 * Position-debiasing (IPS) for search engagement rewards.
 *
 * Clicks/saves/dwell at rank k over-represent top positions because users
 * examine top positions more, not because the ranker is better. Weighting each
 * engagement reward by 1 / P(examine | position k) removes that bias.
 *
 * P(examine | k) is estimated from aggregate impression data with Beta
 * smoothing; when a position has no data, a geometric-decay prior is used so
 * early positions still get sensible (conservative) weights. Weights are
 * always capped — IPS variance explodes as propensity approaches zero.
 */

const DEFAULT_CAP = 10;
const PRIOR_EXAM_PROB = 0.5;
const PRIOR_STRENGTH = 5;
const DECAY_GAMMA = 0.7;

/**
 * Estimate P(examine | position) from impression aggregates.
 * rows: [{ position, impressions, engagements }] — engagements = clicked or saved or dwell>=12s.
 * Returns a Map position -> probability in (0, 1].
 */
function estimateExaminationProbabilities(rows = []) {
    const stats = new Map();
    for (const row of rows || []) {
        const pos = Number(row.position);
        if (!Number.isFinite(pos) || pos < 0) continue;
        const cur = stats.get(pos) || { impressions: 0, engagements: 0 };
        cur.impressions += Number(row.impressions || 0);
        cur.engagements += Number(row.engagements || 0);
        stats.set(pos, cur);
    }
    const out = new Map();
    for (const [pos, s] of stats) {
        const p = (s.engagements + PRIOR_EXAM_PROB * PRIOR_STRENGTH)
            / (s.impressions + PRIOR_STRENGTH);
        out.set(pos, Math.min(1, Math.max(0.02, p)));
    }
    return out;
}

/**
 * P(examine | position) with data-first, prior-fallback behaviour.
 */
function examinationProbability(position, estimated = new Map()) {
    const pos = Number(position) || 0;
    if (estimated.has(pos)) return estimated.get(pos);
    // Geometric-decay prior: position 0 examined with PRIOR_EXAM_PROB, each
    // deeper slot multiplies by DECAY_GAMMA.
    return Math.max(0.02, PRIOR_EXAM_PROB * Math.pow(DECAY_GAMMA, pos));
}

/**
 * Aggregate impressions into per-position examination statistics.
 */
async function loadPositionStats(db, { days = 30 } = {}) {
    if (!db?.all) return [];
    const since = new Date(Date.now() - Math.min(Math.max(Number(days) || 30, 1), 90) * 86400000).toISOString();
    return db.all(
        `SELECT position,
                COUNT(*) AS impressions,
                SUM(CASE WHEN was_clicked = 1 OR was_saved = 1 OR dwell_time_ms >= 12000 THEN 1 ELSE 0 END) AS engagements
         FROM search_result_impressions
         WHERE created_at >= ? AND position IS NOT NULL
         GROUP BY position
         ORDER BY position ASC`,
        [since]
    ).catch(() => []);
}

function ipsWeight(position, estimated, { cap = DEFAULT_CAP } = {}) {
    const p = examinationProbability(position, estimated);
    return Math.min(cap, 1 / p);
}

module.exports = {
    DEFAULT_CAP,
    estimateExaminationProbabilities,
    examinationProbability,
    loadPositionStats,
    ipsWeight,
};
