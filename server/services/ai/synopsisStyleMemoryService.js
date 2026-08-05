'use strict';

const logger = require('../../config/logger');
const { SYNOPSIS_STYLE_ARMS } = require('../bandit/constants');

const LEARNING_RATE = 0.22;
const DECAY = 0.04;

/**
 * Slowly converge a per-user preferred synopsis style from A/B feedback.
 */
async function updateSynopsisStyleMemory(db, userId, armId, reward) {
    if (!db?.run || !userId || !armId) return null;
    const r = Math.max(-1, Math.min(1, Number(reward) || 0));
    const now = new Date().toISOString();
    const armIds = Object.keys(SYNOPSIS_STYLE_ARMS);

    try {
        await db.run(
            `INSERT INTO user_synopsis_style_memory (user_id, style_arm_id, preference_score, updates, updated_at)
             VALUES (?, ?, ?, 1, ?)
             ON CONFLICT(user_id, style_arm_id) DO UPDATE SET
                preference_score = user_synopsis_style_memory.preference_score + ?,
                updates = user_synopsis_style_memory.updates + 1,
                updated_at = excluded.updated_at`,
            [String(userId), String(armId), r * LEARNING_RATE, now, r * LEARNING_RATE]
        );

        // Soft-decay competing styles so preference mass concentrates.
        for (const other of armIds) {
            if (other === armId) continue;
            await db.run(
                `UPDATE user_synopsis_style_memory
                 SET preference_score = preference_score - ?,
                     updated_at = ?
                 WHERE user_id = ? AND style_arm_id = ?`,
                [Math.abs(r) * DECAY, now, String(userId), other]
            ).catch(() => null);
        }
        return true;
    } catch (err) {
        logger.debug({ err, userId, armId }, 'updateSynopsisStyleMemory failed');
        return null;
    }
}

async function listSynopsisStyleMemory(db, userId) {
    if (!db?.all || !userId) return [];
    const rows = await db.all(
        `SELECT style_arm_id, preference_score, updates, updated_at
         FROM user_synopsis_style_memory
         WHERE user_id = ?
         ORDER BY preference_score DESC`,
        [String(userId)]
    ).catch(() => []);
    return (rows || []).map((r) => ({
        armId: r.style_arm_id,
        preferenceScore: Number(r.preference_score || 0),
        updates: Number(r.updates || 0),
        updatedAt: r.updated_at,
    }));
}

/** Multiplicative prior boost for Thompson sampling (1.0 = neutral). */
async function synopsisStyleMemoryBoosts(db, userId) {
    const rows = await listSynopsisStyleMemory(db, userId);
    const boosts = {};
    for (const armId of Object.keys(SYNOPSIS_STYLE_ARMS)) boosts[armId] = 1;
    if (!rows.length) return boosts;
    const maxAbs = Math.max(...rows.map((r) => Math.abs(r.preferenceScore)), 0.01);
    for (const row of rows) {
        // Map score ∈ ~[-1,1+] → boost ∈ [0.85, 1.25]
        const norm = Math.max(-1, Math.min(1, row.preferenceScore / maxAbs));
        boosts[row.armId] = 1 + norm * 0.25;
    }
    return boosts;
}

module.exports = {
    updateSynopsisStyleMemory,
    listSynopsisStyleMemory,
    synopsisStyleMemoryBoosts,
    LEARNING_RATE,
};
