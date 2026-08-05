'use strict';

const { SEARCH_RANKING_ARMS } = require('../bandit/constants');
const logger = require('../../config/logger');

const SIGNAL_KEYS = ['saved', 'helpful', 'impression', 'missed', 'misconception', 'trajectory', 'weak'];

function weightNorm(weights = {}) {
    const vals = SIGNAL_KEYS.map((k) => Number(weights[k]) || 1);
    return vals.reduce((s, v) => s + v, 0) / Math.max(vals.length, 1);
}

/**
 * Approximate shadow ranking for alternate arms using logged boost × weight-norm scale.
 * Good enough for offline IPS / debugging without replaying full learner context.
 */
function buildShadowRankings(articles = [], servedArmId) {
    const served = SEARCH_RANKING_ARMS[servedArmId] || SEARCH_RANKING_ARMS.heuristic_default;
    const servedNorm = weightNorm(served);
    const top = (Array.isArray(articles) ? articles : []).slice(0, 12);
    const servedUids = top
        .map((a) => a?.uid || a?.pmid || a?.doi)
        .filter(Boolean)
        .map(String);

    const shadows = [];
    for (const [armId, weights] of Object.entries(SEARCH_RANKING_ARMS)) {
        if (armId === servedArmId) continue;
        const scale = servedNorm > 0 ? weightNorm(weights) / servedNorm : 1;
        const ranked = top
            .map((article, index) => {
                const uid = article?.uid || article?.pmid || article?.doi;
                if (!uid) return null;
                const boost = Number(article._learningBoost || 0);
                const shadowBoost = boost * scale;
                const score = (top.length - index) + shadowBoost;
                return { uid: String(uid), score, shadowBoost };
            })
            .filter(Boolean)
            .sort((a, b) => b.score - a.score || a.uid.localeCompare(b.uid));
        shadows.push({
            shadowArmId: armId,
            shadowUids: ranked.map((r) => r.uid),
            scale: Number(scale.toFixed(4)),
        });
    }
    return { servedArmId, servedUids, shadows };
}

async function persistCounterfactualRankings(db, {
    searchId = null,
    userId = null,
    servedArmId,
    articles = [],
    propensityByArm = null,
} = {}) {
    if (!db?.run || !servedArmId || searchId == null) return { written: 0 };
    const { servedUids, shadows } = buildShadowRankings(articles, servedArmId);
    if (!servedUids.length || !shadows.length) return { written: 0 };

    const now = new Date().toISOString();
    let written = 0;
    for (const shadow of shadows) {
        const propensity = propensityByArm?.[shadow.shadowArmId] != null
            ? Number(propensityByArm[shadow.shadowArmId])
            : null;
        try {
            await db.run(
                `INSERT INTO search_counterfactual_rankings (
                    search_id, user_id, served_arm_id, shadow_arm_id,
                    served_uids_json, shadow_uids_json, propensity, created_at
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    Number(searchId),
                    userId ? String(userId) : null,
                    String(servedArmId),
                    String(shadow.shadowArmId),
                    JSON.stringify(servedUids),
                    JSON.stringify(shadow.shadowUids),
                    propensity,
                    now,
                ]
            );
            written += 1;
        } catch (err) {
            logger.debug({ err, searchId, shadowArmId: shadow.shadowArmId }, 'counterfactual insert failed');
        }
    }
    return { written, servedUids, shadowArmCount: shadows.length };
}

module.exports = {
    weightNorm,
    buildShadowRankings,
    persistCounterfactualRankings,
};
