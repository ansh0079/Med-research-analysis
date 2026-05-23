'use strict';

const NEGATION_RE = /\b(no|not|avoid|against|contraindicat|do not|should not|isn't|aren't|without)\b/i;

function tokens(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length >= 4 && !['with', 'from', 'that', 'this', 'were', 'been', 'have', 'into', 'than', 'then', 'when', 'where'].includes(t));
}

function overlapScore(a, b) {
    const aa = new Set(tokens(a));
    const bb = new Set(tokens(b));
    if (!aa.size || !bb.size) return 0;
    let shared = 0;
    for (const token of aa) if (bb.has(token)) shared += 1;
    return shared / Math.max(aa.size, bb.size);
}

function classifyClaimGuidelineAlignment(claim, guidelines = []) {
    const claimText = String(claim?.claimText || claim?.claim_text || '').trim();
    if (!claimText) {
        return {
            alignmentStatus: 'no_claim_text',
            recommendedVerificationStatus: 'unverified',
            confidence: 0,
            reason: 'No claim text available for guideline comparison.',
            matchedGuideline: null,
        };
    }
    if (!Array.isArray(guidelines) || guidelines.length === 0) {
        return {
            alignmentStatus: 'no_guideline_context',
            recommendedVerificationStatus: 'unverified',
            confidence: 0,
            reason: 'No stored guideline recommendations were available for this topic.',
            matchedGuideline: null,
        };
    }

    const ranked = guidelines
        .map((g, index) => {
            const recommendation = g.recommendationText || g.recommendation_text || '';
            return {
                guideline: g,
                index,
                recommendation,
                score: overlapScore(claimText, recommendation),
            };
        })
        .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    if (!best || best.score < 0.08) {
        return {
            alignmentStatus: 'guideline_uncertain',
            recommendedVerificationStatus: 'guideline_uncertain',
            confidence: Math.round((best?.score || 0) * 100) / 100,
            reason: 'Stored guidelines exist, but no recommendation had enough concept overlap with the claim.',
            matchedGuideline: best?.guideline || null,
        };
    }

    const claimNegated = NEGATION_RE.test(claimText);
    const guidelineNegated = NEGATION_RE.test(best.recommendation);
    const conflict = claimNegated !== guidelineNegated && best.score >= 0.12;
    if (conflict) {
        return {
            alignmentStatus: 'possible_conflict',
            recommendedVerificationStatus: 'guideline_conflict',
            confidence: Math.round(best.score * 100) / 100,
            reason: 'Claim and matched guideline recommendation share concepts but differ in negation/caution language.',
            matchedGuideline: best.guideline,
        };
    }

    if (best.score < 0.18) {
        return {
            alignmentStatus: 'guideline_uncertain',
            recommendedVerificationStatus: 'guideline_uncertain',
            confidence: Math.round(best.score * 100) / 100,
            reason: 'Weak overlap with a stored guideline recommendation — manual review recommended.',
            matchedGuideline: best.guideline,
        };
    }

    return {
        alignmentStatus: 'guideline_supported',
        recommendedVerificationStatus: 'guideline_supported',
        confidence: Math.round(best.score * 100) / 100,
        reason: 'Claim overlaps with a stored guideline recommendation without an obvious contradiction signal.',
        matchedGuideline: best.guideline,
    };
}

module.exports = {
    classifyClaimGuidelineAlignment,
};
