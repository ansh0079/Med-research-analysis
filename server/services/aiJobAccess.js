'use strict';

function aiJobOwnerId(job) {
    return job?.userId || job?.user_id || job?.inputPayload?.userId || job?.input_payload?.userId || null;
}

function userCanAccessAiJob(job, userId) {
    if (!job || !userId) return false;
    const ownerId = aiJobOwnerId(job);
    return ownerId != null && String(ownerId) === String(userId);
}

module.exports = { aiJobOwnerId, userCanAccessAiJob };
