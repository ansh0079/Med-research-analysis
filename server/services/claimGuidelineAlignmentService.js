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

// Claims with this concept are quiz-seed questions ("What score on CEPH-FAST
// indicates a low risk of cephalosporin allergy?"), not factual assertions --
// see buildKnowledgeGraphRelationships / CONCEPT_RELATIONS in
// teachingObjectService.js, where quiz_focus is explicitly the question-shaped
// concept type used to seed MCQ generation. A question cannot semantically
// agree or conflict with a guideline recommendation the way a factual claim
// can, so token-overlap scoring against one is structurally guaranteed to read
// as no/weak match. Found while triaging the guideline_uncertain queue: 26 of
// 56 flagged items were quiz_focus questions manufacturing false uncertainty
// signal for content that was never a claim about the guideline in the first
// place -- their intended purpose (seeding quizzes) is unaffected either way.
const NON_VERIFIABLE_CONCEPTS = new Set(['quiz_focus']);

function classifyClaimGuidelineAlignment(claim, guidelines = []) {
    const claimText = String(claim?.claimText || claim?.claim_text || '').trim();
    const conceptKey = claim?.conceptKey || claim?.concept_key || null;
    if (!claimText) {
        return {
            alignmentStatus: 'no_claim_text',
            recommendedVerificationStatus: 'unverified',
            confidence: 0,
            reason: 'No claim text available for guideline comparison.',
            matchedGuideline: null,
        };
    }
    if (NON_VERIFIABLE_CONCEPTS.has(conceptKey)) {
        return {
            alignmentStatus: 'not_verifiable',
            recommendedVerificationStatus: 'unverified',
            confidence: 0,
            reason: `Concept "${conceptKey}" is question-shaped content, not a factual claim -- guideline comparison does not apply.`,
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
