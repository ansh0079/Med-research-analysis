'use strict';

const { safeJsonParse, toPgVectorLiteral } = require('../lib/helpers');
const { expandNormalizedTopicKeys, resolveCanonicalNormalized } = require('../../server/utils/topicSynonyms');

module.exports = (Sup) => class extends Sup {
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
async searchSimilarArticlesCache(queryEmbedding, limit = 10, minSimilarity = 0.4, { source = null } = {}) {
    if (!this.pgVectorPool) {
        throw new Error('Vector search requires PG_VECTOR_URL (or VECTOR_DATABASE_URL)');
    }
    await this.assertArticlesCacheEmbeddingDim(queryEmbedding, 'articles_cache search');
    const vec = toPgVectorLiteral(queryEmbedding);
    const maxDistance = 1 - minSimilarity;
    const sourceFilter = source ? String(source) : null;
    const sql = `
        SELECT data, 1 - (embedding <=> $1::vector) AS score
        FROM articles_cache
        WHERE embedding IS NOT NULL
          AND (embedding <=> $1::vector) < $2
          AND ($4::text IS NULL OR source = $4)
        ORDER BY embedding <=> $1::vector ASC
        LIMIT $3
    `;
    const { rows } = await this.pgVectorPool.query(sql, [vec, maxDistance, limit, sourceFilter]);
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
};
