'use strict';

const crypto = require('crypto');
const { getPromptVersion } = require('../../prompts/promptVersions');
const { liveQuizMcqBatchKey } = require('../../utils/teachingObjectKeys');
const { isProvable } = require('../content/legacyContentPolicy');

const QUIZ_BATCH_REUSE_MAX_AGE_DAYS = Number(process.env.QUIZ_BATCH_REUSE_MAX_AGE_DAYS) > 0
    ? Number(process.env.QUIZ_BATCH_REUSE_MAX_AGE_DAYS)
    : 30;

function buildQuizBatchDescriptor({ db, topic, flow, prompt, provider, model, userId = null }) {
    const promptVersion = getPromptVersion('quiz');
    const promptHash = crypto.createHash('sha256').update(String(prompt || '')).digest('hex');
    const cacheKey = crypto.createHash('sha256').update(JSON.stringify({
        flow,
        promptHash,
        promptVersion,
        provider,
        model,
    })).digest('hex');
    return {
        cacheKey,
        objectKey: liveQuizMcqBatchKey(db, topic, flow, userId),
        promptHash,
        promptVersion,
        flow,
        userId: userId || null,
    };
}

async function hasReplayableLineage(db, object) {
    if (!isProvable(object) || typeof db?.get !== 'function') return false;
    const snapshotId = object.evidenceSnapshotId ?? object.evidence_snapshot_id;
    const row = await db.get(
        'SELECT contract_version FROM search_evidence_snapshots WHERE id = ?',
        [snapshotId]
    ).catch(() => null);
    return Number(row?.contract_version || 0) >= 2;
}

async function findReusableQuizBatch(db, descriptor, { now = Date.now(), maxAgeDays = QUIZ_BATCH_REUSE_MAX_AGE_DAYS } = {}) {
    if (!db?.getTeachingObjectByKey || !descriptor?.objectKey) return null;
    const object = await db.getTeachingObjectByKey(descriptor.objectKey).catch(() => null);
    const payload = object?.payload;
    if (!object || object.reviewState === 'withdrawn' || !payload) return null;
    if (payload.quizCacheKey !== descriptor.cacheKey) return null;
    if (payload.promptVersion !== descriptor.promptVersion) return null;
    if ((payload.cacheScopeUserId || null) !== descriptor.userId) return null;
    if (!Array.isArray(payload.response?.questions) || payload.response.questions.length === 0) return null;
    if (!(await hasReplayableLineage(db, object))) return null;

    const generatedMs = Date.parse(payload.generatedAt || object.generatedAt || object.updatedAt || '');
    if (!Number.isFinite(generatedMs)) return null;
    if ((now - generatedMs) / 86400000 > maxAgeDays) return null;

    return {
        ...payload.response,
        provider: 'stored_quiz_cache',
        sourceProvider: object.provider || payload.response.provider || null,
        sourceModel: object.model || payload.response.model || null,
        cached: true,
        reusedFromStore: true,
    };
}

async function persistQuizBatch(db, descriptor, {
    topic,
    responseBody,
    provider,
    model,
    confidence,
    evidenceLineage,
    manifestComplete,
}) {
    if (!db?.upsertTeachingObject || !descriptor?.objectKey || !responseBody?.questions?.length) return false;
    await db.upsertTeachingObject({
        objectKey: descriptor.objectKey,
        objectType: 'live_quiz_mcq',
        normalizedTopic: db.normalizeTopic(topic),
        topic,
        title: `Reusable quiz MCQs: ${topic}`,
        payload: {
            mcqs: responseBody.questions,
            response: responseBody,
            quizCacheKey: descriptor.cacheKey,
            promptHash: descriptor.promptHash,
            promptVersion: descriptor.promptVersion,
            cacheScopeUserId: descriptor.userId,
            flow: descriptor.flow,
            generatedAt: new Date().toISOString(),
        },
        provider,
        model,
        confidence,
        evidenceSnapshotId: evidenceLineage?.snapshotId || null,
        lineageStatus: evidenceLineage?.status || null,
        manifestComplete: Boolean(manifestComplete),
    });
    return true;
}

module.exports = {
    QUIZ_BATCH_REUSE_MAX_AGE_DAYS,
    buildQuizBatchDescriptor,
    findReusableQuizBatch,
    persistQuizBatch,
};
