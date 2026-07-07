'use strict';

async function completeJobAndClaims(db, jobKey, jobType, {
    resultPayload,
    provider = null,
    model = null,
    auditPayload = null,
} = {}) {
    const payload = { ...(resultPayload || {}), jobKey };
    const complete = async () => {
        await db.completeAiGenerationJob(jobKey, {
            resultPayload: payload,
            provider,
            model,
            auditPayload,
        });
        const claimMapService = require('./claimMapService');
        await claimMapService.persistClaimsForJob(db, jobKey, jobType, payload);
    };
    if (typeof db.withTransaction === 'function') {
        await db.withTransaction(complete);
    } else {
        await complete();
    }
}

module.exports = { completeJobAndClaims };
