'use strict';

const logger = require('../config/logger');
const crypto = require('crypto');

/**
 * Normalize job result payloads into claim rows for doctor-trust UI and quiz anchoring.
 * @param {string} jobType
 * @param {object} resultPayload — completed job result (shape varies by jobType)
 * @returns {Array<{ claimKey: string, ordinal: number, claimText: string, sourceIds: string[], evidenceQuote: string|null, confidence: number|null, validationStatus: string, conceptKey: string|null }>}
 */
function uidsFromStudyIndices(sources, studyIndices) {
    const rows = Array.isArray(sources) ? sources : [];
    const want = new Set((studyIndices || []).map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0));
    if (want.size === 0) return [];
    const uids = [];
    for (const row of rows) {
        const idx = Number(row?.studyIndex);
        if (want.has(idx) && row?.uid) uids.push(String(row.uid));
    }
    return [...new Set(uids)];
}

function extractClaimsFromJobResult(jobType, resultPayload, extra = {}) {
    if (!resultPayload || typeof resultPayload !== 'object') return [];
    const defaultSourceIds = Array.isArray(extra.defaultSourceIds) ? extra.defaultSourceIds : [];
    const claims = [];
    let ordinal = 0;

    const push = (claimText, sourceIds = [], evidenceQuote = null, confidence = null, validationStatus = 'unvalidated') => {
        const text = String(claimText || '').trim();
        if (!text || text.length < 8) return;
        ordinal += 1;
        const claimKey = stableClaimKey(resultPayload.jobKey || 'job', ordinal, text.slice(0, 80));
        claims.push({
            claimKey,
            ordinal,
            claimText: text.slice(0, 4000),
            sourceIds: [...new Set([...(sourceIds || []).filter(Boolean), ...defaultSourceIds])],
            evidenceQuote: evidenceQuote ? String(evidenceQuote).slice(0, 3000) : null,
            confidence: confidence != null && Number.isFinite(Number(confidence)) ? Number(confidence) : null,
            validationStatus,
            conceptKey: null,
        });
    };

    if (jobType === 'consensus_synopsis') {
        const uids = (resultPayload.includedArticles || []).map((a) => a.uid || a.pmid || a.doi).filter(Boolean);
        const cv = resultPayload.citationValidation;
        const vStatus = cv && cv.ok === false ? 'citation_issue' : cv && cv.ok === true ? 'citations_ok' : 'unvalidated';
        if (resultPayload.statement) push(resultPayload.statement, uids, resultPayload.statement.slice(0, 400), 0.62, vStatus);
        const bl = resultPayload.clinicalBottomLine;
        if (bl) push(bl, uids, bl.slice(0, 400), 0.58, vStatus);
        for (const line of (resultPayload.areasOfAgreement || []).slice(0, 6)) {
            if (line) push(line, uids, line, 0.55, vStatus);
        }
        for (const line of (resultPayload.areasOfUncertainty || []).slice(0, 4)) {
            if (line) push(`Uncertainty: ${line}`, uids, line, 0.45, 'uncertainty');
        }
        return claims;
    }

    if (jobType === 'live_clinical_answer') {
        const syn = resultPayload.synthesis || {};
        const ca = resultPayload.clinicalAnswer || {};
        const fromSyn = Array.isArray(syn.sourceMap) ? syn.sourceMap : [];
        const fromRes = Array.isArray(resultPayload.sources) ? resultPayload.sources : [];
        const rawUids = [...fromSyn, ...fromRes]
            .map((s) => s && (s.uid || s.pmid))
            .filter(Boolean);
        const uids = rawUids.length ? rawUids : defaultSourceIds;
        const citationBlock = syn.clinicalBottomLine || syn.overallAnswer || ca.bottomLine;
        if (ca.bottomLine) push(ca.bottomLine, uids, citationBlock, 0.6, 'unvalidated');
        if (ca.whatChangesManagement) push(ca.whatChangesManagement, uids, ca.whatChangesManagement, 0.55, 'unvalidated');
        if (ca.whatIsUncertain) push(ca.whatIsUncertain, uids, ca.whatIsUncertain, 0.42, 'uncertainty');
        return claims;
    }

    if (jobType === 'full_synthesis') {
        const syn = resultPayload.synthesis || {};
        const sourceMap = Array.isArray(resultPayload.sources) ? resultPayload.sources : [];
        const sources = sourceMap.map((s) => s.uid).filter(Boolean);
        const cv = resultPayload.citationValidation;
        const vStatus = cv && cv.ok === false ? 'citation_issue' : cv && cv.ok === true ? 'citations_ok' : 'unvalidated';
        const lines = [
            syn.clinicalBottomLine,
            syn.consensus,
            syn.overallAnswer,
            syn.clinicalImplications,
        ].filter(Boolean);
        for (const line of lines) push(line, sources, line, 0.6, vStatus);
        for (const kf of (syn.keyFindings || []).slice(0, 8)) {
            const findingText =
                typeof kf === 'string' ? kf : String(kf?.finding || kf?.summary || '').trim();
            if (!findingText) continue;
            const idxs = Array.isArray(kf?.studyIndices) ? kf.studyIndices : [];
            const uids = uidsFromStudyIndices(sourceMap, idxs);
            push(findingText, uids.length ? uids : sources, findingText, 0.55, vStatus);
        }
        return claims;
    }

    if (jobType === 'paper_synopsis') {
        const syn = resultPayload.synopsis || {};
        const audit = resultPayload.audit || {};
        const uid = resultPayload.articleId ? [`article:${resultPayload.articleId}`] : [];
        const cv = audit.citationValidation || (syn.citationCheckPassed != null
            ? { ok: syn.citationCheckPassed === true, issueCount: syn.citationCheckPassed ? 0 : 1, issues: [] }
            : null);
        const vStatus = cv && cv.ok === false ? 'citation_issue' : cv && cv.ok === true ? 'citations_ok' : 'single_source';
        const abstractOnly = audit.abstractOnly === true || Number(audit.fullTextCoverageRatio || 0) === 0;
        const baseConfidence = abstractOnly ? 0.42 : 0.65;
        if (syn.takeaway) push(syn.takeaway, uid, syn.takeaway, baseConfidence - 0.03, vStatus);
        if (syn.mainFindings) push(syn.mainFindings, uid, syn.mainFindings, baseConfidence - 0.05, vStatus);
        if (syn.bottomLine) push(syn.bottomLine, uid, syn.bottomLine, baseConfidence, vStatus);
        if (syn.authorsConclusion) push(`Authors' conclusion: ${syn.authorsConclusion}`, uid, syn.authorsConclusion, baseConfidence - 0.15, 'attributed_quote');
        return claims;
    }

    return claims;
}

function stableClaimKey(jobKey, ordinal, snippet) {
    return crypto.createHash('sha256').update(`${jobKey}|${ordinal}|${snippet}`).digest('hex').slice(0, 24);
}

/**
 * @param {object} db
 * @param {string} jobKey
 * @param {string} jobType
 * @param {object} resultPayload
 */
async function persistClaimsForJob(db, jobKey, jobType, resultPayload) {
    if (!jobKey || typeof db.replaceAiGenerationClaims !== 'function') return;
    try {
        const extra = {};
        if (typeof db.getAiGenerationJobByKey === 'function') {
            const job = await db.getAiGenerationJobByKey(jobKey).catch((err) => { logger.warn({ err }, 'getAiGenerationJobByKey failed'); return null; });
            if (job?.inputPayload?.articleUids) extra.defaultSourceIds = job.inputPayload.articleUids;
        }
        const merged = { ...resultPayload, jobKey };
        const claims = extractClaimsFromJobResult(jobType, merged, extra);
        if (!claims.length) return;
        await db.replaceAiGenerationClaims(jobKey, claims);
    } catch (err) {
        // Non-fatal — job result still valid without claim row persistence

        console.warn('[claimMap] persist failed', err.message);
    }
}

module.exports = {
    extractClaimsFromJobResult,
    persistClaimsForJob,
};
