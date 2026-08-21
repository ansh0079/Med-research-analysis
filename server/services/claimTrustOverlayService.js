'use strict';

/**
 * Bridge curator trust on teaching_object_claims into synthesis UI rows
 * (ai_generation_claims). Keys often differ across the two stores, so we
 * match by claim_key, normalized text, or sourceIds ∩ articleUid + text.
 */

const {
    statusToTrustTier,
    TRUST_LADDER,
    normalizeStatus,
} = require('./claimLifecycleService');
const logger = require('../config/logger');

function trustTierIndex(tier) {
    return TRUST_LADDER.findIndex((s) => s.tier === tier);
}

function normalizeClaimText(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120);
}

/** Map AI validation_status (and teaching statuses) onto the trust ladder. */
function validationStatusToTrustTier(validationStatus) {
    const s = normalizeStatus(validationStatus);
    if (s === 'citations_ok') return 'full_text_verified';
    if (s === 'single_source' || s === 'attributed_quote') return 'abstract_only';
    if (s === 'citation_issue' || s === 'uncertainty' || s === 'unvalidated' || s === 'synthesis_excerpt') {
        return 'generated';
    }
    return statusToTrustTier(s);
}

function shouldPreferTeaching(teachingStatus, aiValidationStatus) {
    const tIdx = trustTierIndex(statusToTrustTier(teachingStatus));
    const aIdx = trustTierIndex(validationStatusToTrustTier(aiValidationStatus));
    // Prefer curated ladder when teaching is above raw "generated".
    return tIdx > trustTierIndex('generated') && tIdx >= aIdx;
}

function textsMatch(a, b) {
    const na = normalizeClaimText(a);
    const nb = normalizeClaimText(b);
    if (!na || !nb || na.length < 12 || nb.length < 12) return false;
    if (na === nb) return true;
    const aPrefix = na.slice(0, Math.min(48, na.length));
    const bPrefix = nb.slice(0, Math.min(48, nb.length));
    return na.includes(bPrefix) || nb.includes(aPrefix);
}

function sourceOverlap(sourceIds, articleUid) {
    if (!articleUid) return false;
    const uid = String(articleUid);
    return (Array.isArray(sourceIds) ? sourceIds : []).some((s) => {
        const sid = String(s || '');
        return sid && (sid === uid || sid.includes(uid) || uid.includes(sid));
    });
}

function matchTeachingClaim(aiClaim, teachingClaims) {
    const list = Array.isArray(teachingClaims) ? teachingClaims : [];
    let hit = list.find((t) => t.claimKey && t.claimKey === aiClaim.claimKey);
    if (hit) return { claim: hit, match: 'claim_key' };

    hit = list.find((t) => textsMatch(aiClaim.claimText, t.claimText));
    if (hit) return { claim: hit, match: 'text' };

    hit = list.find(
        (t) => sourceOverlap(aiClaim.sourceIds, t.articleUid) && textsMatch(aiClaim.claimText, t.claimText)
    );
    if (hit) return { claim: hit, match: 'source_text' };

    return null;
}

async function loadCandidateTeachingClaims(db, aiClaims, topic) {
    const byKey = new Map();

    for (const c of aiClaims) {
        if (!c?.claimKey || typeof db.getTeachingClaimByKey !== 'function') continue;
        const tc = await db.getTeachingClaimByKey(c.claimKey).catch(() => null);
        if (tc?.claimKey) byKey.set(tc.claimKey, tc);
    }

    if (topic && typeof db.listTeachingObjectClaimsForTopic === 'function') {
        const rows = await db.listTeachingObjectClaimsForTopic(topic, { limit: 80 }).catch(() => []);
        for (const tc of rows || []) {
            if (tc?.claimKey) byKey.set(tc.claimKey, tc);
        }
    }

    const uids = new Set();
    for (const c of aiClaims) {
        for (const sid of c.sourceIds || []) {
            if (sid) uids.add(String(sid));
        }
    }
    for (const uid of [...uids].slice(0, 12)) {
        if (typeof db.getTeachingObjectForArticle !== 'function') break;
        const obj = await db.getTeachingObjectForArticle(uid).catch(() => null);
        if (!obj?.objectKey || typeof db.listTeachingObjectClaimsByObjectKey !== 'function') continue;
        const claims = await db.listTeachingObjectClaimsByObjectKey(obj.objectKey).catch(() => []);
        for (const tc of claims || []) {
            if (tc?.claimKey) byKey.set(tc.claimKey, tc);
        }
    }

    return [...byKey.values()];
}

/**
 * Overlay teaching verification onto AI generation claim rows for synthesis UI.
 * @returns {Promise<object[]>}
 */
async function overlayTeachingClaimTrust(db, aiClaims, { topic = null } = {}) {
    if (!Array.isArray(aiClaims) || aiClaims.length === 0) return aiClaims || [];
    let teaching = [];
    try {
        teaching = await loadCandidateTeachingClaims(db, aiClaims, topic);
    } catch (err) {
        logger.warn({ err }, 'loadCandidateTeachingClaims failed');
        return aiClaims;
    }
    if (!teaching.length) {
        return aiClaims.map((c) => ({ ...c, trustOverlay: null }));
    }

    return aiClaims.map((ai) => {
        const matched = matchTeachingClaim(ai, teaching);
        if (!matched) return { ...ai, trustOverlay: null };
        const teachingStatus = matched.claim.verificationStatus || 'unverified';
        const applied = shouldPreferTeaching(teachingStatus, ai.validationStatus);
        return {
            ...ai,
            validationStatus: applied ? teachingStatus : ai.validationStatus,
            verificationStatus: teachingStatus,
            teachingClaimKey: matched.claim.claimKey,
            trustOverlay: {
                matchedBy: matched.match,
                teachingClaimKey: matched.claim.claimKey,
                verificationStatus: teachingStatus,
                applied,
            },
        };
    });
}

/**
 * When a curator updates teaching_object_claims.verification_status, push that
 * status onto matching ai_generation_claims.validation_status so list/cache
 * reads stay consistent without waiting for a re-overlay.
 */
async function writeThroughTeachingVerification(db, teachingClaim) {
    if (!db?.all || !db?.run || !teachingClaim) return { updated: 0 };
    const status = String(teachingClaim.verificationStatus || '').trim();
    if (!status) return { updated: 0 };

    const candidates = [];
    const seenIds = new Set();
    const pushRows = (rows) => {
        for (const row of rows || []) {
            if (!row?.id || seenIds.has(row.id)) continue;
            seenIds.add(row.id);
            candidates.push(row);
        }
    };

    try {
        if (teachingClaim.claimKey) {
            pushRows(await db.all(
                `SELECT * FROM ai_generation_claims WHERE claim_key = ? LIMIT 20`,
                [String(teachingClaim.claimKey)]
            ).catch(() => []));
        }
        if (teachingClaim.articleUid) {
            pushRows(await db.all(
                `SELECT * FROM ai_generation_claims
                 WHERE source_ids_json LIKE ?
                 ORDER BY id DESC LIMIT 40`,
                [`%${String(teachingClaim.articleUid).slice(0, 80)}%`]
            ).catch(() => []));
        }
        const snippet = String(teachingClaim.claimText || '').trim().slice(0, 48);
        if (snippet.length >= 16) {
            const safe = snippet.replace(/[%_]/g, '');
            if (safe.length >= 16) {
                pushRows(await db.all(
                    `SELECT * FROM ai_generation_claims
                     WHERE claim_text LIKE ?
                     ORDER BY id DESC LIMIT 20`,
                    [`%${safe}%`]
                ).catch(() => []));
            }
        }
    } catch (err) {
        logger.warn({ err }, 'writeThroughTeachingVerification candidate load failed');
        return { updated: 0 };
    }

    let updated = 0;
    for (const row of candidates) {
        const mapped = typeof db.mapAiGenerationClaimRow === 'function'
            ? db.mapAiGenerationClaimRow(row)
            : {
                claimKey: row.claim_key,
                claimText: row.claim_text,
                sourceIds: (() => {
                    try { return JSON.parse(row.source_ids_json || '[]'); } catch { return []; }
                })(),
                validationStatus: row.validation_status,
            };
        const match = matchTeachingClaim(mapped, [teachingClaim]);
        if (!match) continue;
        await db.run(
            `UPDATE ai_generation_claims SET validation_status = ? WHERE id = ?`,
            [status, row.id]
        ).catch((err) => {
            logger.warn({ err, id: row.id }, 'ai_generation_claims validation write-through failed');
        });
        updated += 1;
    }
    return { updated };
}

module.exports = {
    normalizeClaimText,
    textsMatch,
    sourceOverlap,
    matchTeachingClaim,
    shouldPreferTeaching,
    validationStatusToTrustTier,
    overlayTeachingClaimTrust,
    writeThroughTeachingVerification,
};
