'use strict';

function buildEvidenceAudit(claimSourceJob, claimAnchors) {
    if (!claimSourceJob) return undefined;
    const auditPayload = claimSourceJob.auditPayload && typeof claimSourceJob.auditPayload === 'object'
        ? claimSourceJob.auditPayload
        : {};
    return {
        jobKey: claimSourceJob.jobKey,
        jobType: claimSourceJob.jobType,
        model: claimSourceJob.model || auditPayload.model || null,
        provider: claimSourceJob.provider || auditPayload.provider || null,
        generatedAt: claimSourceJob.completedAt || auditPayload.generatedAt || claimSourceJob.updatedAt,
        sourceCount: auditPayload.sourceCount != null ? auditPayload.sourceCount : null,
        fullTextCoverageRatio: auditPayload.fullTextCoverageRatio ?? null,
        citationOk: auditPayload.citationValidation?.ok ?? null,
        citationIssueCount: auditPayload.citationValidation?.issueCount,
        retractionFlagged: Boolean(auditPayload.retractionFlagged),
        retractionChecked: Boolean(auditPayload.retractionChecked ?? auditPayload.retractionCheckedCount),
        humanReviewStatus: auditPayload.humanReviewStatus ?? null,
        claimCount: claimAnchors ? claimAnchors.length : 0,
    };
}

module.exports = {
    buildEvidenceAudit,
};
