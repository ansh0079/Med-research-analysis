'use strict';

/**
 * Personalization must reorder within safe bands — never bury protected evidence.
 * Extends boost caps with a post-rank floor for guidelines, landmarks, SRs,
 * retractions warnings, and recent safety updates.
 */

const { applyBoostSafety, articleSafetyTier } = require('../banditSafetyGuard');
const {
    isGuideline,
    isReview,
    isRCT,
    getCitationCount,
    getYear,
} = require('../evidenceBouquet/articleClassifiers');
const { LANDMARK_CITATION_THRESHOLD } = require('../evidenceBouquet/constants');

const PROTECTED_BAND_SHARE = 0.35; // protected items keep at least top 35% band
const CURRENT_YEAR = new Date().getFullYear();

function isLandmarkTrial(article) {
    if (article?._pinnedLandmark || article?._isLandmark) return true;
    if (!isRCT(article)) return false;
    const citations = getCitationCount(article);
    const year = getYear(article);
    const age = year ? CURRENT_YEAR - year : 99;
    return citations >= LANDMARK_CITATION_THRESHOLD && age >= 3;
}

function isSystematicReviewOrMeta(article) {
    if (!isReview(article)) return false;
    const text = `${article?.title || ''} ${(article?.pubtype || []).join(' ')}`.toLowerCase();
    return /meta-?analysis|systematic review|cochrane/.test(text) || isReview(article);
}

function hasRetractionWarning(article) {
    return Boolean(article?._retraction?.isRetracted || article?._retraction?.hasWarning);
}

function isRecentSafetyUpdate(article) {
    if (article?._safetyUpdate || article?._isSafetyUpdate) return true;
    const year = getYear(article);
    if (!year || CURRENT_YEAR - year > 2) return false;
    const text = `${article?.title || ''} ${article?.abstract || ''}`.toLowerCase();
    return /\b(safety|black box|boxed warning|pharmacovigilance|adverse event|recall|withdrawal|contraindicat)\b/.test(text);
}

function classifyProtection(article) {
    if (hasRetractionWarning(article)) return 'retraction_warning';
    if (isGuideline(article)) return 'guideline';
    if (isLandmarkTrial(article)) return 'landmark_rct';
    if (isSystematicReviewOrMeta(article)) return 'systematic_review';
    if (isRecentSafetyUpdate(article)) return 'recent_safety';
    return null;
}

/**
 * After personalization re-ranks, restore protected evidence into a safe band.
 * Personalization may reorder within the non-protected set freely.
 *
 * @param {object[]} rankedArticles — already sorted by personalized score
 * @param {object[]} originalArticles — pre-personalization order (evidence hierarchy)
 * @returns {{ articles: object[], guardrailMeta: object }}
 */
function enforcePersonalizationGuardrails(rankedArticles, originalArticles = []) {
    const ranked = Array.isArray(rankedArticles) ? [...rankedArticles] : [];
    const original = Array.isArray(originalArticles) ? originalArticles : ranked;
    if (ranked.length < 2) {
        return { articles: ranked, guardrailMeta: { applied: false, restored: [] } };
    }

    const N = ranked.length;
    const protectedFloor = Math.max(1, Math.ceil(N * PROTECTED_BAND_SHARE));
    const originalIndex = new Map();
    original.forEach((a, i) => {
        const uid = a?.uid || a?.pmid || a?.doi;
        if (uid) originalIndex.set(String(uid), i);
    });

    const restored = [];
    const protectedItems = [];
    const rest = [];

    for (const article of ranked) {
        const protection = classifyProtection(article);
        if (protection) {
            protectedItems.push({ article, protection });
        } else {
            rest.push(article);
        }
    }

    // Sort protected by original evidence hierarchy (lower index = stronger bouquet rank)
    protectedItems.sort((a, b) => {
        const ua = String(a.article?.uid || a.article?.pmid || '');
        const ub = String(b.article?.uid || b.article?.pmid || '');
        return (originalIndex.get(ua) ?? 999) - (originalIndex.get(ub) ?? 999);
    });

    // Build result: protected items occupy the safe head band in evidence order,
    // personalized non-protected fill remaining slots in their learned order.
    const out = new Array(N);
    const used = new Set();
    let p = 0;
    for (let slot = 0; slot < protectedFloor && p < protectedItems.length; slot++) {
        const item = protectedItems[p++];
        out[slot] = {
            ...item.article,
            _protectionClass: item.protection,
            _guardrailRestored: true,
        };
        used.add(String(item.article?.uid || item.article?.pmid || slot));
        restored.push({ uid: item.article?.uid, protection: item.protection, slot });
    }
    // Remaining protected still included but after floor (never dropped)
    while (p < protectedItems.length) {
        const item = protectedItems[p++];
        // find next empty slot
        const slot = out.findIndex((x) => x == null);
        if (slot === -1) break;
        out[slot] = {
            ...item.article,
            _protectionClass: item.protection,
            _guardrailRestored: true,
        };
        used.add(String(item.article?.uid || item.article?.pmid || slot));
        restored.push({ uid: item.article?.uid, protection: item.protection, slot });
    }
    let r = 0;
    for (let slot = 0; slot < N; slot++) {
        if (out[slot] != null) continue;
        while (r < rest.length) {
            const article = rest[r++];
            const uid = String(article?.uid || article?.pmid || '');
            if (used.has(uid)) continue;
            out[slot] = article;
            used.add(uid);
            break;
        }
    }
    // Fill any holes
    const articles = out.filter(Boolean);
    if (articles.length < ranked.length) {
        for (const a of ranked) {
            const uid = String(a?.uid || a?.pmid || '');
            if (!used.has(uid)) articles.push(a);
        }
    }

    return {
        articles,
        guardrailMeta: {
            applied: restored.length > 0,
            protectedFloor,
            restored,
            protectedCount: protectedItems.length,
        },
    };
}

function safeBoost(article, boost) {
    return applyBoostSafety(article, boost);
}

module.exports = {
    PROTECTED_BAND_SHARE,
    classifyProtection,
    isLandmarkTrial,
    isSystematicReviewOrMeta,
    hasRetractionWarning,
    isRecentSafetyUpdate,
    enforcePersonalizationGuardrails,
    safeBoost,
    articleSafetyTier,
};
