'use strict';

const { safeJsonParse, toPgVectorLiteral } = require('../lib/helpers');
const { expandNormalizedTopicKeys, resolveCanonicalNormalized } = require('../../server/utils/topicSynonyms');

module.exports = (Sup) => class extends Sup {
// ==========================================
// Durable AI generation jobs
// ==========================================

mapAiGenerationJobRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        jobKey: row.job_key,
        jobType: row.job_type,
        status: row.status,
        topic: row.topic || null,
        inputHash: row.input_hash || null,
        inputPayload: safeJsonParse(row.input_payload, null),
        resultPayload: safeJsonParse(row.result_payload, null),
        errorMessage: row.error_message || null,
        provider: row.provider || null,
        model: row.model || null,
        auditPayload: safeJsonParse(row.audit_payload, null),
        attempts: Number(row.attempts || 0),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        startedAt: row.started_at || null,
        completedAt: row.completed_at || null,
        expiresAt: row.expires_at || null,
        userId: row.user_id || null,
    };
}

async listUserAiGenerationJobs(userId, {
    statuses = ['queued', 'running'],
    jobTypes = ['full_synthesis'],
    limit = 12,
} = {}) {
    if (!userId) return [];
    const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 30);
    const statusList = (Array.isArray(statuses) ? statuses : String(statuses || '').split(','))
        .map((s) => String(s || '').trim())
        .filter(Boolean);
    const typeList = (Array.isArray(jobTypes) ? jobTypes : String(jobTypes || '').split(','))
        .map((s) => String(s || '').trim())
        .filter(Boolean);
    if (!statusList.length || !typeList.length) return [];

    const statusPlaceholders = statusList.map(() => '?').join(', ');
    const typePlaceholders = typeList.map(() => '?').join(', ');
    const params = [String(userId), ...statusList, ...typeList, safeLimit * 4];

    let rows = [];
    try {
        rows = await this.all(
            `SELECT * FROM ai_generation_jobs
             WHERE user_id = ?
               AND status IN (${statusPlaceholders})
               AND job_type IN (${typePlaceholders})
             ORDER BY updated_at DESC
             LIMIT ?`,
            params
        );
    } catch {
        rows = [];
    }

    if (!rows.length) {
        const fallbackRows = await this.all(
            `SELECT * FROM ai_generation_jobs
             WHERE status IN (${statusPlaceholders})
               AND job_type IN (${typePlaceholders})
             ORDER BY updated_at DESC
             LIMIT ?`,
            [...statusList, ...typeList, safeLimit * 6]
        ).catch(() => []);
        rows = fallbackRows.filter((row) => {
            const payload = safeJsonParse(row.input_payload, null);
            return payload?.userId === userId;
        });
    }

    return rows
        .map((row) => this.mapAiGenerationJobRow(row))
        .filter(Boolean)
        .slice(0, safeLimit);
}

async getAiGenerationJobByKey(jobKey) {
    if (!jobKey) return null;
    const row = await this.get(`SELECT * FROM ai_generation_jobs WHERE job_key = ?`, [String(jobKey)]);
    return this.mapAiGenerationJobRow(row);
}

async createAiGenerationJob({
    jobKey, jobType, topic = null, inputHash = null, inputPayload = null,
    provider = null, model = null, expiresAt = null, userId = null,
} = {}) {
    if (!jobKey || !jobType) return null;
    const now = new Date().toISOString();
    const resolvedUserId = userId || inputPayload?.userId || null;
    let changes = 0;
    try {
        const r = await this.run(
            `INSERT INTO ai_generation_jobs (job_key, job_type, status, topic, input_hash, input_payload, provider, model, user_id, created_at, updated_at, expires_at)
             VALUES (?, ?, 'queued', ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(job_key) DO NOTHING`,
            [
                String(jobKey),
                String(jobType),
                topic || null,
                inputHash || null,
                inputPayload ? JSON.stringify(inputPayload) : null,
                provider || null,
                model || null,
                resolvedUserId || null,
                now,
                now,
                expiresAt || null,
            ]
        );
        changes = r?.changes ?? 0;
    } catch {
        const r = await this.run(
            `INSERT INTO ai_generation_jobs (job_key, job_type, status, topic, input_hash, input_payload, provider, model, created_at, updated_at, expires_at)
             VALUES (?, ?, 'queued', ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(job_key) DO NOTHING`,
            [
                String(jobKey),
                String(jobType),
                topic || null,
                inputHash || null,
                inputPayload ? JSON.stringify(inputPayload) : null,
                provider || null,
                model || null,
                now,
                now,
                expiresAt || null,
            ]
        );
        changes = r?.changes ?? 0;
    }
    const row = await this.getAiGenerationJobByKey(jobKey);
    return row ? { ...row, inserted: changes === 1 } : null;
}

async markAiGenerationJobRunning(jobKey) {
    const now = new Date().toISOString();
    await this.run(
        `UPDATE ai_generation_jobs
         SET status = 'running', attempts = attempts + 1, started_at = COALESCE(started_at, ?), updated_at = ?
         WHERE job_key = ? AND status IN ('queued', 'failed')`,
        [now, now, String(jobKey)]
    );
    return this.getAiGenerationJobByKey(jobKey);
}

async completeAiGenerationJob(jobKey, { resultPayload, provider = null, model = null, auditPayload = null } = {}) {
    const now = new Date().toISOString();
    await this.run(
        `UPDATE ai_generation_jobs
         SET status = 'completed', result_payload = ?, error_message = NULL, provider = COALESCE(?, provider), model = COALESCE(?, model), audit_payload = ?, completed_at = ?, updated_at = ?
         WHERE job_key = ?`,
        [
            JSON.stringify(resultPayload || null),
            provider || null,
            model || null,
            auditPayload ? JSON.stringify(auditPayload) : null,
            now,
            now,
            String(jobKey),
        ]
    );
    return this.getAiGenerationJobByKey(jobKey);
}

async failAiGenerationJob(jobKey, errorMessage) {
    const now = new Date().toISOString();
    await this.run(
        `UPDATE ai_generation_jobs
         SET status = 'failed', error_message = ?, updated_at = ?
         WHERE job_key = ?`,
        [String(errorMessage || 'Generation failed').slice(0, 2000), now, String(jobKey)]
    );
    return this.getAiGenerationJobByKey(jobKey);
}

async resetAiGenerationJobForRetry(jobKey) {
    const now = new Date().toISOString();
    await this.run(
        `UPDATE ai_generation_jobs
         SET status = 'queued', error_message = NULL, updated_at = ?
         WHERE job_key = ? AND status = 'failed'`,
        [now, String(jobKey)]
    );
    return this.getAiGenerationJobByKey(jobKey);
}

async moveAiGenerationJobToDeadLetter(jobKey) {
    const row = await this.getAiGenerationJobByKey(jobKey);
    if (!row) return null;
    const now = new Date().toISOString();
    await this.run(
        `INSERT INTO dead_letter_jobs (
            job_key, job_type, topic, input_payload, result_payload, error_message,
            provider, model, audit_payload, attempts, created_at, failed_at, original_created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(job_key) DO UPDATE SET
            error_message = EXCLUDED.error_message,
            result_payload = COALESCE(EXCLUDED.result_payload, dead_letter_jobs.result_payload),
            attempts = EXCLUDED.attempts,
            failed_at = EXCLUDED.failed_at,
            audit_payload = COALESCE(EXCLUDED.audit_payload, dead_letter_jobs.audit_payload)`,
        [
            row.jobKey,
            row.jobType,
            row.topic || null,
            row.inputPayload ? JSON.stringify(row.inputPayload) : null,
            row.resultPayload ? JSON.stringify(row.resultPayload) : null,
            row.errorMessage ? String(row.errorMessage).slice(0, 2000) : null,
            row.provider || null,
            row.model || null,
            row.auditPayload ? JSON.stringify(row.auditPayload) : null,
            row.attempts || 0,
            row.createdAt || now,
            now,
            row.createdAt || null,
        ]
    );
    await this.run(`DELETE FROM ai_generation_jobs WHERE job_key = ?`, [String(jobKey)]);
    return this.getDeadLetterJobByKey(jobKey);
}

async requeueDeadLetterJob(jobKey) {
    const row = await this.getDeadLetterJobByKey(jobKey);
    if (!row) return null;
    const now = new Date().toISOString();
    await this.run(
        `INSERT INTO ai_generation_jobs (
            job_key, job_type, status, topic, input_hash, input_payload, result_payload,
            provider, model, audit_payload, attempts, created_at, updated_at, expires_at
        ) VALUES (?, ?, 'queued', ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
        ON CONFLICT(job_key) DO UPDATE SET
            status = 'queued',
            error_message = NULL,
            attempts = 0,
            updated_at = EXCLUDED.updated_at`,
        [
            row.jobKey,
            row.jobType,
            row.topic || null,
            null,
            row.inputPayload ? JSON.stringify(row.inputPayload) : null,
            row.resultPayload ? JSON.stringify(row.resultPayload) : null,
            row.provider || null,
            row.model || null,
            row.auditPayload ? JSON.stringify(row.auditPayload) : null,
            row.originalCreatedAt || now,
            now,
            null,
        ]
    );
    await this.run(`DELETE FROM dead_letter_jobs WHERE job_key = ?`, [String(jobKey)]);
    return this.getAiGenerationJobByKey(jobKey);
}

async getDeadLetterJobByKey(jobKey) {
    if (!jobKey) return null;
    const row = await this.get(`SELECT * FROM dead_letter_jobs WHERE job_key = ?`, [String(jobKey)]);
    if (!row) return null;
    return {
        jobKey: row.job_key,
        jobType: row.job_type,
        topic: row.topic,
        inputPayload: safeJsonParse(row.input_payload, null),
        resultPayload: safeJsonParse(row.result_payload, null),
        errorMessage: row.error_message,
        provider: row.provider,
        model: row.model,
        auditPayload: safeJsonParse(row.audit_payload, null),
        attempts: Number(row.attempts || 0),
        createdAt: row.created_at,
        failedAt: row.failed_at,
        originalCreatedAt: row.original_created_at,
    };
}

async listDeadLetterJobs({ jobTypes = [], limit = 50, topic = null } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const typeList = (Array.isArray(jobTypes) ? jobTypes : String(jobTypes || '').split(','))
        .map((s) => String(s || '').trim())
        .filter(Boolean);
    const typeClause = typeList.length ? `AND job_type IN (${typeList.map(() => '?').join(', ')})` : '';
    const topicClause = topic ? `AND topic = ?` : '';
    const params = [...typeList, ...(topic ? [topic] : []), safeLimit];
    const rows = await this.all(
        `SELECT * FROM dead_letter_jobs
         WHERE 1=1 ${typeClause} ${topicClause}
         ORDER BY failed_at DESC
         LIMIT ?`,
        params
    ).catch(() => []);
    return rows.map((row) => ({
        jobKey: row.job_key,
        jobType: row.job_type,
        topic: row.topic,
        errorMessage: row.error_message,
        attempts: Number(row.attempts || 0),
        failedAt: row.failed_at,
        originalCreatedAt: row.original_created_at,
    }));
}

async listAiGenerationJobs({ statuses = [], jobTypes = [], limit = 50, topic = null } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const statusList = (Array.isArray(statuses) ? statuses : String(statuses || '').split(','))
        .map((s) => String(s || '').trim())
        .filter(Boolean);
    const typeList = (Array.isArray(jobTypes) ? jobTypes : String(jobTypes || '').split(','))
        .map((s) => String(s || '').trim())
        .filter(Boolean);
    const statusClause = statusList.length ? `AND status IN (${statusList.map(() => '?').join(', ')})` : '';
    const typeClause = typeList.length ? `AND job_type IN (${typeList.map(() => '?').join(', ')})` : '';
    const topicClause = topic ? `AND topic = ?` : '';
    const params = [...statusList, ...typeList, ...(topic ? [topic] : []), safeLimit];
    const rows = await this.all(
        `SELECT * FROM ai_generation_jobs
         WHERE 1=1 ${statusClause} ${typeClause} ${topicClause}
         ORDER BY updated_at DESC
         LIMIT ?`,
        params
    ).catch(() => []);
    return rows.map((row) => this.mapAiGenerationJobRow(row));
}

async upsertTrialGuidelineConflictReview({
    normalizedTopic,
    jobKey = null,
    conflictHash,
    conflictLevel = 'nuanced',
    trialIndex,
    guidelineIndex,
    trialClaim,
    guidelineClaim,
    populationGap = null,
    clinicalNuance = null,
    recommendation = null,
    detectionMethod = 'llm',
} = {}) {
    if (!normalizedTopic || !conflictHash || !trialClaim || !guidelineClaim) return false;
    const now = new Date().toISOString();
    try {
        await this.run(
            `INSERT INTO trial_guideline_conflict_reviews (
                normalized_topic, job_key, conflict_hash, conflict_level, trial_index, guideline_index,
                trial_claim, guideline_claim, population_gap, clinical_nuance, recommendation,
                detection_method, status, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ai_detected', ?, ?)
             ON CONFLICT(normalized_topic, conflict_hash) DO UPDATE SET
                updated_at = excluded.updated_at,
                job_key = COALESCE(excluded.job_key, trial_guideline_conflict_reviews.job_key)`,
            [
                String(normalizedTopic),
                jobKey || null,
                String(conflictHash),
                String(conflictLevel),
                Number(trialIndex) || 0,
                Number(guidelineIndex) || 0,
                String(trialClaim).slice(0, 2000),
                String(guidelineClaim).slice(0, 2000),
                populationGap ? String(populationGap).slice(0, 1000) : null,
                clinicalNuance ? String(clinicalNuance).slice(0, 1000) : null,
                recommendation ? String(recommendation).slice(0, 1000) : null,
                String(detectionMethod),
                now,
                now,
            ]
        );
        return true;
    } catch {
        return false;
    }
}

mapAiGenerationClaimRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        jobKey: row.job_key,
        claimKey: row.claim_key,
        ordinal: Number(row.ordinal || 0),
        claimText: row.claim_text,
        sourceIds: safeJsonParse(row.source_ids_json, []),
        evidenceQuote: row.evidence_quote || null,
        confidence: row.confidence != null ? Number(row.confidence) : null,
        validationStatus: row.validation_status || 'unvalidated',
        conceptKey: row.concept_key || null,
        createdAt: row.created_at,
    };
}

async replaceAiGenerationClaims(jobKey, claims = []) {
    return this.withTransaction(async () => {
        await this.run(`DELETE FROM ai_generation_claims WHERE job_key = ?`, [String(jobKey)]);
        for (const c of claims) {
            await this.run(
                `INSERT INTO ai_generation_claims (job_key, claim_key, ordinal, claim_text, source_ids_json, evidence_quote, confidence, validation_status, concept_key, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
                [
                    String(jobKey),
                    String(c.claimKey),
                    Number(c.ordinal) || 0,
                    String(c.claimText || '').slice(0, 4000),
                    JSON.stringify(c.sourceIds || []),
                    c.evidenceQuote ? String(c.evidenceQuote).slice(0, 3000) : null,
                    c.confidence != null && Number.isFinite(Number(c.confidence)) ? Number(c.confidence) : null,
                    String(c.validationStatus || 'unvalidated'),
                    c.conceptKey ? String(c.conceptKey) : null,
                ]
            );
        }
    });
}

async listAiGenerationClaimsByJobKey(jobKey) {
    const rows = await this.all(
        `SELECT * FROM ai_generation_claims WHERE job_key = ? ORDER BY ordinal ASC, id ASC`,
        [String(jobKey)]
    );
    return rows.map((r) => this.mapAiGenerationClaimRow(r));
}
};
