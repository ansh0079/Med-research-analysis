'use strict';

const { safeJsonParse, toPgVectorLiteral } = require('../lib/helpers');
const { expandNormalizedTopicKeys, resolveCanonicalNormalized } = require('../../server/utils/topicSynonyms');

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
        `INSERT INTO pdf_sections (article_uid, sections, ordered_keys, tables, word_count, url, source, numpages, indexed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(article_uid) DO UPDATE SET
           sections = excluded.sections,
           ordered_keys = excluded.ordered_keys,
           tables = excluded.tables,
           word_count = excluded.word_count,
           url = excluded.url,
           source = excluded.source,
           numpages = excluded.numpages,
           indexed_at = excluded.indexed_at`,
        [
            String(articleUid),
            JSON.stringify(payload.sections || {}),
            JSON.stringify(payload.orderedKeys || []),
            JSON.stringify(payload.tables || []),
            payload.wordCount || 0,
            payload.url || null,
            payload.source || null,
            payload.numpages || 0,
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
    };
}

async getAiGenerationJobByKey(jobKey) {
    if (!jobKey) return null;
    const row = await this.get(`SELECT * FROM ai_generation_jobs WHERE job_key = ?`, [String(jobKey)]);
    return this.mapAiGenerationJobRow(row);
}

async createAiGenerationJob({ jobKey, jobType, topic = null, inputHash = null, inputPayload = null, provider = null, model = null, expiresAt = null } = {}) {
    if (!jobKey || !jobType) return null;
    const now = new Date().toISOString();
    await this.run(
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
    return this.getAiGenerationJobByKey(jobKey);
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
}

async listAiGenerationClaimsByJobKey(jobKey) {
    const rows = await this.all(
        `SELECT * FROM ai_generation_claims WHERE job_key = ? ORDER BY ordinal ASC, id ASC`,
        [String(jobKey)]
    );
    return rows.map((r) => this.mapAiGenerationClaimRow(r));
}

};
