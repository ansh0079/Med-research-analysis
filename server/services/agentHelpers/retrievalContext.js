const { articleUid } = require('../../utils/articleKeys');

function compactTeachingObject(object) {
    const payload = object?.payload || {};
    const synopsis = payload.synopsis || {};
    const seed = payload.quizSeed || {};
    return [
        `- ${object.title || object.objectKey}`,
        object.objectType ? `type: ${object.objectType}` : '',
        object.confidence != null ? `confidence: ${Number(object.confidence).toFixed(2)}` : '',
        payload.clinicalBottomLine ? `bottom line: ${String(payload.clinicalBottomLine).slice(0, 260)}` : '',
        synopsis.mainFindings ? `findings: ${String(synopsis.mainFindings).slice(0, 260)}` : '',
        Array.isArray(seed.focusPoints) && seed.focusPoints.length ? `quiz focus: ${seed.focusPoints.slice(0, 3).join('; ')}` : '',
    ].filter(Boolean).join(' | ');
}

function compactGroundedClaim(claim) {
    return [
        `[CLAIM-${claim.claimKey}] ${String(claim.claimText || '').slice(0, 360)}`,
        claim.sourcePath ? `source path: ${claim.sourcePath}` : '',
        claim.evidenceQuote ? `quote/snippet: ${String(claim.evidenceQuote).slice(0, 300)}` : '',
        claim.confidence != null ? `confidence: ${Number(claim.confidence).toFixed(2)}` : '',
        claim.verificationStatus ? `verification: ${claim.verificationStatus}` : '',
    ].filter(Boolean).join('\n  ');
}

function buildRetrievalContext(retrieval = {}) {
    const teachingObjects = Array.isArray(retrieval.teachingObjects) ? retrieval.teachingObjects.slice(0, 3) : [];
    const groundedClaims = Array.isArray(retrieval.groundedClaims) ? retrieval.groundedClaims.slice(0, 5) : [];
    const claimMastery = Array.isArray(retrieval.claimMastery) ? retrieval.claimMastery : [];
    const weakClaims = claimMastery.filter((claim) => claim.masteryState === 'weak').slice(0, 3);
    const untestedClaims = claimMastery.filter((claim) => claim.masteryState === 'untested').slice(0, 3);
    const freshness = retrieval.freshness;

    const parts = [];
    if (teachingObjects.length) {
        parts.push(`### Top reusable teaching objects
${teachingObjects.map(compactTeachingObject).join('\n')}`);
    }
    if (groundedClaims.length) {
        parts.push(`### Top grounded claims
${groundedClaims.map(compactGroundedClaim).join('\n\n')}`);
    }
    if (weakClaims.length || untestedClaims.length) {
        parts.push(`### User claim mastery gaps
${weakClaims.length ? `Previously weak claims:\n${weakClaims.map((c) => `- [CLAIM-${c.claimKey}] ${String(c.claimText || '').slice(0, 240)} (${c.accuracy ?? 0}% accuracy)`).join('\n')}` : ''}
${untestedClaims.length ? `Untested claims:\n${untestedClaims.map((c) => `- [CLAIM-${c.claimKey}] ${String(c.claimText || '').slice(0, 240)}`).join('\n')}` : ''}`);
    }
    const personalHooks = Array.isArray(retrieval.personalGraphHooks) ? retrieval.personalGraphHooks : [];
    if (personalHooks.length) {
        parts.push(`### Personal knowledge graph — prior mistakes to reference
${personalHooks.map((h) => `- ${h.prompt}`).join('\n')}
When a new paper tests the same boundary, explicitly connect it to the learner's prior mistake.`);
    }
    if (freshness) {
        parts.push(`### Freshness and volatility
- Volatility: ${freshness.volatility}
- Confidence decay: ${Math.round((freshness.confidenceDecay || 0) * 100)}%
- Effective confidence: ${Math.round((freshness.effectiveConfidence || 0) * 100)}%
- Refresh priority: ${freshness.priorityScore}
- Reason: ${freshness.reason}
${freshness.confidenceDecay > 0.25 ? '- Knowledge gap: this topic memory is stale enough to warn the learner and suggest refresh/re-quiz.' : ''}`);
    }
    return parts.join('\n\n') || 'No reusable teaching objects or grounded claim mastery available yet.';
}

function buildAgentEvidenceAnchors({ currentArticles = [], guidelines = [], groundedClaims = [] } = {}) {
    return [
        ...(Array.isArray(currentArticles) ? currentArticles.slice(0, 5).map((article) => ({
            type: 'paper',
            uid: articleUid(article),
            title: article.title,
            source: article.source || article.journal || null,
            confidence: article._quality?.score != null ? Number(article._quality.score) / 100 : null,
        })) : []),
        ...(Array.isArray(guidelines) ? guidelines.slice(0, 3).map((guideline) => ({
            type: 'guideline',
            uid: guideline.id || guideline.guidelineId || null,
            title: guideline.recommendationText || guideline.title,
            source: [guideline.sourceBody, guideline.sourceYear].filter(Boolean).join(' '),
            confidence: guideline.confidence || null,
            verificationStatus: guideline.reviewStatus || null,
        })) : []),
        ...(Array.isArray(groundedClaims) ? groundedClaims.slice(0, 6).map((claim) => ({
            type: 'grounded_claim',
            uid: claim.claimKey || null,
            title: claim.claimText,
            source: claim.sourcePath || null,
            confidence: claim.confidence || null,
            verificationStatus: claim.verificationStatus || null,
        })) : []),
    ];
}

module.exports = {
    compactTeachingObject,
    compactGroundedClaim,
    buildRetrievalContext,
    buildAgentEvidenceAnchors,
};
