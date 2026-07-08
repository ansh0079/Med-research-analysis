'use strict';

const { safeJsonParse, toPgVectorLiteral } = require('../lib/helpers');
const { expandNormalizedTopicKeys, resolveCanonicalNormalized } = require('../../server/utils/topicSynonyms');
const crypto = require('crypto');

function extractSynthesisSnapshotClaims(synthesis = {}) {
    const candidates = [
        synthesis.clinicalBottomLine,
        synthesis.overallAnswer,
        synthesis.consensus,
        synthesis.limitations,
        synthesis.researchGaps,
        synthesis.clinicalImplications,
        synthesis.practiceImpact?.mondayMorningLine,
        synthesis.practiceImpact?.rationale,
        synthesis.clinicalActionCard?.recommendation,
        synthesis.clinicalActionCard?.caveat,
        ...(Array.isArray(synthesis.keyFindings) ? synthesis.keyFindings : []),
        ...(Array.isArray(synthesis.agreement) ? synthesis.agreement : []),
        ...(Array.isArray(synthesis.uncertainties) ? synthesis.uncertainties : []),
        ...(Array.isArray(synthesis.conflicts) ? synthesis.conflicts : []),
    ];
    const seen = new Set();
    return candidates
        .map((claim) => String(typeof claim === 'object' && claim !== null
            ? claim.summary || claim.finding || claim.text || claim.claim || ''
            : claim || '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 700))
        .filter((claim) => {
            if (claim.length < 12) return false;
            const key = claim.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, 24);
}

function buildSynthesisSnapshotFingerprint(synthesis = {}) {
    const claims = extractSynthesisSnapshotClaims(synthesis);
    const normalized = claims
        .map((claim) => claim.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim())
        .sort();
    return {
        claims,
        fingerprint: crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex'),
    };
}

module.exports = (Sup) => class extends Sup {
// Analytics Operations
// ==========================================

async logEvent(eventType, sessionId, metadata = {}) {
    if (!this.kysely) return;
    return this.kysely
        .insertInto('analytics')
        .values({
            event_type: eventType,
            session_id: sessionId,
            metadata: JSON.stringify(metadata),
            created_at: new Date().toISOString()
        })
        .execute();
}

async getRecentSynopsisViews(userId, { days = 60, limit = 200 } = {}) {
    if (!userId) return [];
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const safeLimit = Math.min(Number(limit) || 200, 500);
    return this.all(
        `SELECT json_extract(metadata, '$.articleId') AS article_id, created_at
         FROM analytics
         WHERE event_type = 'synopsis'
           AND json_extract(metadata, '$.userId') = ?
           AND created_at >= ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [userId, since, safeLimit]
    );
}

async getAnalytics(startDate, endDate) {
    return this.all(
        `SELECT event_type, COUNT(*) as count, date(created_at) as date
         FROM analytics 
         WHERE created_at BETWEEN ? AND ?
         GROUP BY event_type, date(created_at)
         ORDER BY date`,
        [startDate, endDate]
    );
}

async getDailyStats(days = 30) {
    if (this.isPostgres) {
        return this.all(
            `SELECT 
                DATE(created_at) as date,
                COUNT(DISTINCT CASE WHEN event_type = 'search' THEN id END) as searches,
                COUNT(DISTINCT CASE WHEN event_type = 'analyze' THEN id END) as analyses,
                COUNT(DISTINCT CASE WHEN event_type = 'save' THEN id END) as saves
             FROM analytics 
             WHERE created_at >= NOW() - INTERVAL '1 day' * ?
             GROUP BY DATE(created_at)
             ORDER BY date DESC`,
            [days]
        );
    }
    return this.all(
        `SELECT 
            date(created_at) as date,
            COUNT(DISTINCT CASE WHEN event_type = 'search' THEN id END) as searches,
            COUNT(DISTINCT CASE WHEN event_type = 'analyze' THEN id END) as analyses,
            COUNT(DISTINCT CASE WHEN event_type = 'save' THEN id END) as saves
         FROM analytics 
         WHERE created_at >= date('now', '-' || ? || ' days')
         GROUP BY date(created_at)
         ORDER BY date DESC`
    , [days]);
}

// ==========================================
// PostgreSQL + pgvector (articles_cache)
// ==========================================

async getArticlesCacheEmbeddingDim() {
    if (!this.pgVectorPool) {
        throw new Error('Vector cache requires PG_VECTOR_URL (or VECTOR_DATABASE_URL)');
    }
    if (this._articlesCacheEmbeddingDim) return this._articlesCacheEmbeddingDim;
    const { rows } = await this.pgVectorPool.query(`
        SELECT atttypmod
        FROM pg_attribute
        WHERE attrelid = 'articles_cache'::regclass
          AND attname = 'embedding'
          AND NOT attisdropped
        LIMIT 1
    `);
    const dim = Number(rows?.[0]?.atttypmod || 0) - 4;
    this._articlesCacheEmbeddingDim = Number.isInteger(dim) && dim > 0 ? dim : 384;
    return this._articlesCacheEmbeddingDim;
}

async assertArticlesCacheEmbeddingDim(embedding, operation) {
    if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error(`Invalid embedding for ${operation}`);
    }
    const expectedDim = await this.getArticlesCacheEmbeddingDim();
    if (embedding.length !== expectedDim) {
        const err = new Error(`Embedding dimension mismatch for ${operation}: expected ${expectedDim}, got ${embedding.length}`);
        err.code = 'EMBEDDING_DIM_MISMATCH';
        err.expectedDim = expectedDim;
        err.actualDim = embedding.length;
        throw err;
    }
}

isVectorSearchAvailable() {
    return !!this.pgVectorPool;
}

/**
 * @param {string} externalId
 * @param {string} source
 * @param {object} data - article JSON (stored as JSONB)
 * @param {number[]} embedding - length 384
 * @param {string} [doi]
 */
async upsertArticleCacheVector(externalId, source, data, embedding, doi = null) {
    if (!this.pgVectorPool) {
        throw new Error('Vector cache requires PG_VECTOR_URL (or VECTOR_DATABASE_URL)');
    }
    await this.assertArticlesCacheEmbeddingDim(embedding, 'articles_cache upsert');
    const vec = toPgVectorLiteral(embedding);
    const dataJson = JSON.stringify(data);
    const sql = `
        INSERT INTO articles_cache (external_id, doi, source, data, embedding, updated_at)
        VALUES ($1, $2, $3, $4::jsonb, $5::vector, NOW())
        ON CONFLICT (external_id) DO UPDATE SET
            doi = EXCLUDED.doi,
            source = EXCLUDED.source,
            data = EXCLUDED.data,
            embedding = EXCLUDED.embedding,
            updated_at = NOW()
    `;
    const res = await this.pgVectorPool.query(sql, [externalId, doi, source, dataJson, vec]);
    return { changes: res.rowCount };
}

/**
 * @param {number[]} queryEmbedding
 * @param {number} limit
 * @param {number} minSimilarity 0..1 (1 = identical direction for cosine)
 */
async searchSimilarArticlesCache(queryEmbedding, limit = 10, minSimilarity = 0.4) {
    if (!this.pgVectorPool) {
        throw new Error('Vector search requires PG_VECTOR_URL (or VECTOR_DATABASE_URL)');
    }
    await this.assertArticlesCacheEmbeddingDim(queryEmbedding, 'articles_cache search');
    const vec = toPgVectorLiteral(queryEmbedding);
    const maxDistance = 1 - minSimilarity;
    const sql = `
        SELECT data, 1 - (embedding <=> $1::vector) AS score
        FROM articles_cache
        WHERE embedding IS NOT NULL
          AND (embedding <=> $1::vector) < $2
        ORDER BY embedding <=> $1::vector ASC
        LIMIT $3
    `;
    const { rows } = await this.pgVectorPool.query(sql, [vec, maxDistance, limit]);
    return rows.map((r) => ({
        data: r.data,
        score: r.score !== null && r.score !== undefined ? Number(r.score) : 0
    }));
}

closeVectorPool() {
    if (this.pgVectorPool) {
        return this.pgVectorPool.end();
    }
    return Promise.resolve();
}

// ==========================================
// Annotation Operations
// ==========================================

async getAnnotationsByArticle(articleId, userId = null) {
    if (!this.kysely) return [];
    let query = this.kysely
        .selectFrom('annotations')
        .selectAll()
        .where('article_id', '=', articleId);
    if (userId) {
        query = query.where('user_id', '=', userId);
    }
    const rows = await query.orderBy('created_at', 'asc').execute();
    
    return rows.map(row => ({
        ...row,
        position: safeJsonParse(row.position, null)
    }));
}

async createAnnotation(articleId, userId, userName, text, position) {
    if (!this.kysely) return;
    const result = await this.kysely
        .insertInto('annotations')
        .values({
            article_id: articleId,
            user_id: userId,
            user_name: userName,
            text,
            position: position ? JSON.stringify(position) : null,
            created_at: new Date().toISOString()
        })
        .executeTakeFirst();
    return { id: Number(result.insertId) };
}

// ==========================================
// Analysis Cache Operations
// ==========================================

async getCachedAnalysis(articleId, analysisType, model) {
    if (!this.kysely) return null;
    const row = await this.kysely
        .selectFrom('analysis_cache')
        .selectAll()
        .where('article_id', '=', articleId)
        .where('analysis_type', '=', analysisType)
        .where('model', '=', model)
        .where(eb => eb.or([
            eb('expires_at', 'is', null),
            eb('expires_at', '>', new Date().toISOString())
        ]))
        .executeTakeFirst();

    if (row) {
        return {
            ...safeJsonParse(row.result, {}),
            _cached: true,
            _cachedAt: row.created_at,
            _cost: row.cost
        };
    }
    return null;
}

async cacheAnalysis(articleId, analysisType, model, result, tokensUsed, cost, ttlHours = 168) {
    if (!this.kysely) return;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttlHours);

    return this.kysely
        .insertInto('analysis_cache')
        .values({
            article_id: articleId,
            analysis_type: analysisType,
            model: model,
            result: JSON.stringify(result),
            tokens_used: tokensUsed,
            cost: cost,
            expires_at: expiresAt.toISOString(),
            created_at: new Date().toISOString()
        })
        .onConflict(oc => oc.columns(['article_id', 'analysis_type', 'model']).doUpdateSet({
            result: JSON.stringify(result),
            expires_at: expiresAt.toISOString()
        }))
        .execute();
}

// ==========================================
// PDF full-text persistence (no TTL — survives cache restarts)
// ==========================================

async savePdfSections(articleUid, payload) {
    if (!articleUid || !payload?.sections) return;
    await this.run(
        `INSERT INTO pdf_sections (article_uid, sections, ordered_keys, tables, word_count, url, source, numpages, indexed_at, extraction_backend, grobid_version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)
         ON CONFLICT(article_uid) DO UPDATE SET
           sections = excluded.sections,
           ordered_keys = excluded.ordered_keys,
           tables = excluded.tables,
           word_count = excluded.word_count,
           url = excluded.url,
           source = excluded.source,
           numpages = excluded.numpages,
           indexed_at = excluded.indexed_at,
           extraction_backend = excluded.extraction_backend,
           grobid_version = excluded.grobid_version`,
        [
            String(articleUid),
            JSON.stringify(payload.sections || {}),
            JSON.stringify(payload.orderedKeys || []),
            JSON.stringify(payload.tables || []),
            payload.wordCount || 0,
            payload.url || null,
            payload.source || null,
            payload.numpages || 0,
            payload.extractionBackend || 'legacy',
            payload.grobidVersion || null,
        ]
    );
}

async getPdfSections(articleUid) {
    if (!articleUid) return null;
    const row = await this.get(`SELECT * FROM pdf_sections WHERE article_uid = ?`, [String(articleUid)]);
    if (!row) return null;
    try {
        return {
            sections: JSON.parse(row.sections || '{}'),
            orderedKeys: JSON.parse(row.ordered_keys || '[]'),
            tables: JSON.parse(row.tables || '[]'),
            wordCount: row.word_count || 0,
            url: row.url || null,
            source: row.source || null,
            numpages: row.numpages || 0,
            indexedAt: row.indexed_at,
            extractionBackend: row.extraction_backend || 'legacy',
            grobidVersion: row.grobid_version || null,
        };
    } catch {
        return null;
    }
}

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

// ── Synthesis snapshots (staleness detection) ─────────────────────────────

async saveSynthesisSnapshot(topic, synthesis, articleUids = []) {
    const normalizedUids = Array.isArray(articleUids) ? articleUids : [];
    const normalized = this.normalizeTopic(topic);
    const consensusText = String(synthesis?.consensus || synthesis?.overallAnswer || '').slice(0, 2000);
    const keyFindingCount = Array.isArray(synthesis?.keyFindings) ? synthesis.keyFindings.length : 0;
    const generatedAt = new Date().toISOString();
    const claimFingerprint = buildSynthesisSnapshotFingerprint(synthesis);
    await this.run(
        `INSERT INTO synthesis_snapshots
           (normalized_topic, topic, consensus_text, evidence_grade, key_finding_count, article_count, article_uids, claim_fingerprint, claim_texts_json, generated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            normalized,
            String(topic).slice(0, 200),
            consensusText,
            String(synthesis?.evidenceGrade || 'MODERATE'),
            keyFindingCount,
            normalizedUids.length,
            JSON.stringify(normalizedUids.slice(0, 20)),
            claimFingerprint.fingerprint,
            JSON.stringify(claimFingerprint.claims),
            generatedAt,
        ]
    );
}

async getLatestSynthesisSnapshots(topic, limit = 2) {
    const normalized = this.normalizeTopic(topic);
    return this.all(
        `SELECT * FROM synthesis_snapshots WHERE normalized_topic = ?
         ORDER BY generated_at DESC LIMIT ?`,
        [normalized, Math.min(limit, 10)]
    );
}

// ── Product quality metrics ───────────────────────────────────────────────

async recordProductQualityFeedback({
    userId = null,
    sessionId = null,
    productType,
    topic = null,
    factualAccuracy = null,
    completeness = null,
    clinicalUsefulness = null,
    timeSavedMinutes = null,
    comment = null,
    metadata = {},
} = {}) {
    if (!this.kysely || !productType) return null;
    const now = new Date().toISOString();
    return this.kysely
        .insertInto('product_quality_feedback')
        .values({
            user_id: userId || null,
            session_id: sessionId || null,
            product_type: String(productType).slice(0, 40),
            topic: topic ? String(topic).slice(0, 240) : null,
            factual_accuracy: factualAccuracy != null ? Number(factualAccuracy) : null,
            completeness: completeness != null ? Number(completeness) : null,
            clinical_usefulness: clinicalUsefulness != null ? Number(clinicalUsefulness) : null,
            time_saved_minutes: timeSavedMinutes != null ? Number(timeSavedMinutes) : null,
            comment: comment ? String(comment).slice(0, 1000) : null,
            metadata_json: JSON.stringify(metadata || {}),
            created_at: now,
        })
        .execute();
}

_metricsSinceIso(days) {
    const safeDays = Math.min(90, Math.max(1, Number(days) || 30));
    return new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000).toISOString();
}

async getSearchImpressionMetricsWindow(days = 30) {
    if (!this.kysely) return [];
    const since = this._metricsSinceIso(days);
    return this.all(
        `SELECT search_id, position, was_clicked, was_saved, dwell_time_ms
         FROM search_result_impressions
         WHERE created_at >= ?
         ORDER BY search_id ASC, position ASC`,
        [since]
    );
}

async getSearchClickLatencyEvents(days = 30) {
    if (!this.kysely) return [];
    const since = this._metricsSinceIso(days);
    const rows = await this.all(
        `SELECT metadata, created_at
         FROM analytics
         WHERE event_type = 'search_result_click'
           AND created_at >= ?
         ORDER BY created_at DESC
         LIMIT 5000`,
        [since]
    );
    return rows.map((row) => {
        const meta = safeJsonParse(row.metadata, {});
        return { elapsed_ms: Number(meta.elapsedMs ?? meta.dwellMs ?? 0) };
    }).filter((row) => row.elapsed_ms > 0);
}

async getProductQualityFeedbackWindow(days = 30) {
    if (!this.kysely) return [];
    const since = this._metricsSinceIso(days);
    return this.all(
        `SELECT product_type, factual_accuracy, completeness, clinical_usefulness, time_saved_minutes
         FROM product_quality_feedback
         WHERE created_at >= ?`,
        [since]
    );
}

async getSynthesisQualityHintsForTopic(topic, { days = 90, limit = 20 } = {}) {
    if (!this.kysely || !topic) return null;
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const since = new Date(Date.now() - Number(days || 90) * 24 * 60 * 60 * 1000).toISOString();
    const rows = await this.all(
        `SELECT clinical_usefulness, factual_accuracy, completeness, metadata_json, time_saved_minutes
         FROM product_quality_feedback
         WHERE product_type = 'synthesis'
           AND topic IS NOT NULL
           AND LOWER(TRIM(topic)) = LOWER(TRIM(?))
           AND created_at >= ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [String(topic), since, safeLimit]
    ).catch(() => []);
    if (!Array.isArray(rows) || rows.length === 0) return null;

    const usefulness = rows.map((r) => Number(r.clinical_usefulness)).filter((n) => n >= 1 && n <= 5);
    const factual = rows.map((r) => Number(r.factual_accuracy)).filter((n) => n >= 1 && n <= 5);
    const completeness = rows.map((r) => Number(r.completeness)).filter((n) => n >= 1 && n <= 5);
    const avg = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
    const avgClinicalUsefulness = avg(usefulness);
    const avgFactualAccuracy = avg(factual);
    const avgCompleteness = avg(completeness);
    const lowRatedAspects = [];
    if (avgFactualAccuracy != null && avgFactualAccuracy < 3.5) lowRatedAspects.push('factual accuracy');
    if (avgCompleteness != null && avgCompleteness < 3.5) lowRatedAspects.push('completeness');
    if (avgClinicalUsefulness != null && avgClinicalUsefulness < 3.5) lowRatedAspects.push('clinical usefulness');

    return {
        sampleSize: rows.length,
        avgClinicalUsefulness,
        avgFactualAccuracy,
        avgCompleteness,
        lowRatedAspects,
    };
}

async getUserRetentionCohort(days = 30) {
    if (!this.kysely) return [];
    const safeDays = Math.min(90, Math.max(7, Number(days) || 30));
    const halfMs = (safeDays / 2) * 24 * 60 * 60 * 1000;
    const recentStart = new Date(Date.now() - halfMs).toISOString();
    const priorStart = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000).toISOString();
    return this.all(
        `SELECT DISTINCT prior.user_id,
                CASE WHEN recent.user_id IS NOT NULL THEN 1 ELSE 0 END AS returned
         FROM (
             SELECT DISTINCT user_id
             FROM learning_events
             WHERE user_id IS NOT NULL
               AND occurred_at >= ?
               AND occurred_at < ?
         ) prior
         LEFT JOIN (
             SELECT DISTINCT user_id
             FROM learning_events
             WHERE user_id IS NOT NULL
               AND occurred_at >= ?
         ) recent ON recent.user_id = prior.user_id`,
        [priorStart, recentStart, recentStart]
    );
}

async getSearchRefinementStats(days = 30) {
    if (!this.kysely) return [];
    const since = this._metricsSinceIso(days);
    return this.all(
        `SELECT session_sequence_index
         FROM searches
         WHERE created_at >= ?
           AND session_sequence_index > 0`,
        [since]
    );
}

async getKnowledgeProgressionSnapshot(days = 30) {
    if (!this.kysely) return [];
    const since = this._metricsSinceIso(days);
    return this.all(
        `SELECT memory_score, memory_tier, normalized_topic
         FROM user_topic_memory
         WHERE updated_at >= ?`,
        [since]
    );
}

async getRecommendationSatisfactionEvents(days = 30) {
    if (!this.kysely) return [];
    const since = this._metricsSinceIso(days);
    return this.all(
        `SELECT event_type
         FROM learning_events
         WHERE occurred_at >= ?
           AND event_type IN ('feedback_helpful', 'feedback_confusing')`,
        [since]
    );
}

async getSynthesisCitationValidationStats(days = 30) {
    if (!this.kysely) return { passRate: null, sampleSize: 0 };
    const since = this._metricsSinceIso(days);
    const rows = await this.all(
        `SELECT metadata
         FROM analytics
         WHERE event_type = 'synthesize'
           AND created_at >= ?
         ORDER BY created_at DESC
         LIMIT 2000`,
        [since]
    );
    let pass = 0;
    let total = 0;
    for (const row of rows) {
        const meta = safeJsonParse(row.metadata, {});
        if (meta.citationOk === undefined && meta.citationValidationOk === undefined) continue;
        total += 1;
        if (meta.citationOk === true || meta.citationValidationOk === true) pass += 1;
    }
    return {
        passRate: total ? pass / total : null,
        sampleSize: total,
    };
}

};
