'use strict';

const { safeJsonParse, toPgVectorLiteral } = require('../lib/helpers');
const { expandNormalizedTopicKeys, resolveCanonicalNormalized } = require('../../server/utils/topicSynonyms');

module.exports = (Sup) => class extends Sup {
// Review Assistant + PICO
// ==========================================

async createReviewProject(project) {
    const now = new Date().toISOString();
    await this.run(
        `INSERT INTO review_projects (id, title, question, criteria, owner_type, owner_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            project.id,
            project.title,
            project.question,
            JSON.stringify(project.criteria || {}),
            project.ownerType || 'session',
            project.ownerId,
            now,
            now,
        ]
    );
    return this.getReviewProject(project.id);
}

async getReviewProject(reviewId) {
    const row = await this.get(`SELECT * FROM review_projects WHERE id = ?`, [reviewId]);
    if (!row) return null;
    return {
        ...row,
        criteria: safeJsonParse(row.criteria, {}),
    };
}

async listReviewProjects({ ownerType, ownerId, limit = 50, offset = 0 } = {}) {
    const rows = await this.all(
        `SELECT rp.*,
            (SELECT COUNT(*) FROM review_articles ra WHERE ra.review_id = rp.id) AS total_articles,
            (SELECT COUNT(*) FROM review_articles ra WHERE ra.review_id = rp.id AND ra.screening_status = 'included') AS included_count
         FROM review_projects rp
         WHERE rp.owner_type = ? AND rp.owner_id = ?
         ORDER BY rp.updated_at DESC
         LIMIT ? OFFSET ?`,
        [ownerType, ownerId, limit, offset]
    );
    return rows.map((r) => ({ ...r, criteria: safeJsonParse(r.criteria, {}) }));
}

async addReviewArticles(reviewId, articles = []) {
    const now = new Date().toISOString();
    for (const article of articles) {
        const articleId = String(article.uid || article.articleId || '').trim();
        if (!articleId) continue;
        await this.run(
            `INSERT INTO review_articles (review_id, article_id, article_data, screening_status, created_at, updated_at)
             VALUES (?, ?, ?, 'pending', ?, ?)
             ON CONFLICT(review_id, article_id) DO UPDATE SET
                article_data = excluded.article_data,
                updated_at = excluded.updated_at`,
            [reviewId, articleId, JSON.stringify(article), now, now]
        );
    }
    return this.listReviewArticles(reviewId);
}

async listReviewArticles(reviewId) {
    const rows = await this.all(
        `SELECT * FROM review_articles WHERE review_id = ? ORDER BY created_at DESC`,
        [reviewId]
    );
    return rows.map((row) => ({
        ...row,
        article_data: safeJsonParse(row.article_data, {}),
    }));
}

async updateReviewScreening(reviewId, articleId, patch = {}) {
    const now = new Date().toISOString();
    await this.run(
        `UPDATE review_articles
         SET screening_status = ?, exclusion_reason = ?, notes = ?, updated_at = ?
         WHERE review_id = ? AND article_id = ?`,
        [
            patch.screeningStatus || 'pending',
            patch.exclusionReason || null,
            patch.notes || null,
            now,
            reviewId,
            articleId,
        ]
    );
    return this.get(
        `SELECT * FROM review_articles WHERE review_id = ? AND article_id = ?`,
        [reviewId, articleId]
    );
}

async getReviewPrismaCounts(reviewId) {
    const rows = await this.all(
        `SELECT screening_status, COUNT(*) AS count
         FROM review_articles
         WHERE review_id = ?
         GROUP BY screening_status`,
        [reviewId]
    );
    const counts = { total: 0, pending: 0, included: 0, excluded: 0, maybe: 0 };
    for (const row of rows) {
        const key = String(row.screening_status || 'pending');
        const count = Number(row.count || 0);
        counts.total += count;
        if (Object.prototype.hasOwnProperty.call(counts, key)) counts[key] = count;
    }
    return counts;
}

async upsertPicoExtraction(articleId, extraction, provider, model, confidence = 0) {
    const now = new Date().toISOString();
    await this.run(
        `INSERT INTO pico_extractions (article_id, extraction, provider, model, confidence, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(article_id) DO UPDATE SET
            extraction = excluded.extraction,
            provider = excluded.provider,
            model = excluded.model,
            confidence = excluded.confidence,
            updated_at = excluded.updated_at`,
        [articleId, JSON.stringify(extraction || {}), provider || null, model || null, Number(confidence || 0), now, now]
    );
    return this.getPicoExtraction(articleId);
}

async getPicoExtraction(articleId) {
    const row = await this.get(`SELECT * FROM pico_extractions WHERE article_id = ?`, [articleId]);
    if (!row) return null;
    return {
        ...row,
        extraction: safeJsonParse(row.extraction, {}),
    };
}

async getReviewExtractionRows(reviewId) {
    const rows = await this.all(
        `SELECT ra.review_id, ra.article_id, ra.screening_status, ra.exclusion_reason, ra.notes, ra.article_data,
                pe.extraction, pe.confidence, pe.provider, pe.model
         FROM review_articles ra
         LEFT JOIN pico_extractions pe ON pe.article_id = ra.article_id
         WHERE ra.review_id = ?
         ORDER BY ra.created_at DESC`,
        [reviewId]
    );
    return rows.map((row) => ({
        ...row,
        article_data: safeJsonParse(row.article_data, {}),
        extraction: safeJsonParse(row.extraction, null),
    }));
}
};
