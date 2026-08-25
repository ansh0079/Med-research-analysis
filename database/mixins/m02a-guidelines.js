'use strict';

const { expandNormalizedTopicKeys, resolveCanonicalNormalized } = require('../../server/utils/topicSynonyms');
const { assessGuidelineQuality } = require('../../server/services/guidelineQualityService');

/**
 * A guideline row is only servable if its text actually reads as a recommendation.
 *
 * The extraction prompt asked a model for "specific actionable recommendations" using
 * only the PubMed *abstract* of a guideline publication as input. Abstracts mostly
 * contain scope and background, so the model returned what was there: disease
 * definitions ("Asthma is a complex disorder characterised by..."), epidemiology, and
 * meta-commentary about guidelines -- each then rendered to a clinician as though a
 * named body had recommended it. An audit of 9,999 rows found only ~1,995 containing
 * any recommendation verb.
 *
 * This gate is deliberately at the serving layer rather than in extraction: it applies
 * to the rows already stored, and cannot be bypassed by a future write path.
 */
const RECOMMENDATION_VERB_RE =
    /(should|should not|recommend|recommended|recommends|must|initiate|consider|offer|avoid|do not|start|titrate|discontinue|prescribe|screen|monitor|refer|first-line|second-line|indicated|contraindicated)/i;

const MIN_RECOMMENDATION_LENGTH = 25;

function isServableGuideline(row) {
    const text = String(row?.recommendation_text || '').trim();
    if (text.length < MIN_RECOMMENDATION_LENGTH) return false;
    return RECOMMENDATION_VERB_RE.test(text);
}

module.exports = (Sup) => class extends Sup {
// Guideline Memory
// ==========================================

// Guideline Memory
// ==========================================

mapGuidelineRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        topic: row.topic,
        normalizedTopic: row.normalized_topic,
        sourceBody: row.source_body,
        sourceRegion: row.source_region || undefined,
        sourceYear: row.source_year === null || row.source_year === undefined ? undefined : Number(row.source_year),
        sourceUrl: row.source_url || undefined,
        sourceSpecialty: row.source_specialty || undefined,
        sourceDomain: row.source_domain || undefined,
        recommendationText: row.recommendation_text,
        recommendationStrength: row.recommendation_strength || undefined,
        recommendationCertainty: row.recommendation_certainty || undefined,
        population: row.population || undefined,
        intervention: row.intervention || undefined,
        cautions: row.cautions || undefined,
        status: row.status,
        reviewedBy: row.reviewed_by || undefined,
        reviewedAt: row.reviewed_at || undefined,
        supersededById: row.superseded_by_id === null || row.superseded_by_id === undefined ? undefined : Number(row.superseded_by_id),
        lastCheckedAt: row.last_checked_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        qualityAssessment: assessGuidelineQuality({
            sourceBody: row.source_body,
            sourceYear: row.source_year,
            sourceUrl: row.source_url,
            recommendationStrength: row.recommendation_strength,
            recommendationCertainty: row.recommendation_certainty,
            status: row.status,
            supersededById: row.superseded_by_id,
            lastCheckedAt: row.last_checked_at,
        }),
    };
}

async createGuideline(guideline) {
    const now = new Date().toISOString();
    const normalized = this.normalizeTopic(guideline.topic);
    const result = await this.run(
        `INSERT INTO topic_guidelines (
            topic, normalized_topic, source_body, source_region, source_year,
            source_url, source_specialty, source_domain, recommendation_text,
            recommendation_strength, recommendation_certainty, population,
            intervention, cautions, status, last_checked_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            String(guideline.topic || '').trim().slice(0, 240),
            normalized,
            String(guideline.sourceBody || '').trim(),
            guideline.sourceRegion ? String(guideline.sourceRegion).trim() : null,
            guideline.sourceYear ? parseInt(guideline.sourceYear, 10) : null,
            guideline.sourceUrl ? String(guideline.sourceUrl).trim() : null,
            guideline.sourceSpecialty ? String(guideline.sourceSpecialty).trim() : null,
            guideline.sourceDomain ? String(guideline.sourceDomain).trim() : null,
            String(guideline.recommendationText || '').trim(),
            guideline.recommendationStrength ? String(guideline.recommendationStrength).trim() : null,
            guideline.recommendationCertainty ? String(guideline.recommendationCertainty).trim() : null,
            guideline.population ? String(guideline.population).trim() : null,
            guideline.intervention ? String(guideline.intervention).trim() : null,
            guideline.cautions ? String(guideline.cautions).trim() : null,
            guideline.status || 'ai_extracted',
            now, now, now,
        ]
    );
    return this.getGuidelineById(result.id);
}

async getGuidelineById(id) {
    const row = await this.get(`SELECT * FROM topic_guidelines WHERE id = ?`, [id]);
    return this.mapGuidelineRow(row);
}

async getGuidelinesByTopic(topic, { status = '', limit = 20 } = {}) {
    const normalized = this.normalizeTopic(topic);
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 100);
    const statusFilter = String(status || '').trim();
    const staleThreshold = new Date(Date.now() - 365 * 86400000).toISOString();
    const keys = [...new Set([
        normalized,
        resolveCanonicalNormalized(String(topic || '').trim(), (s) => this.normalizeTopic(s)),
        ...expandNormalizedTopicKeys(normalized, (s) => this.normalizeTopic(s)),
    ].filter(Boolean))];
    if (!keys.length) return [];

    // Auto-flag stale guidelines on read (all synonym keys)
    const stalePlaceholders = keys.map(() => '?').join(', ');
    await this.run(
        `UPDATE topic_guidelines SET status = 'stale'
         WHERE normalized_topic IN (${stalePlaceholders})
           AND status IN ('ai_extracted', 'human_reviewed')
           AND last_checked_at < ?
           AND superseded_by_id IS NULL`,
        [...keys, staleThreshold]
    );

    const rows = await this.all(
        `SELECT * FROM topic_guidelines
         WHERE normalized_topic IN (${stalePlaceholders})
           AND (? = '' OR status = ?)
           AND superseded_by_id IS NULL
         ORDER BY source_year DESC, updated_at DESC
         LIMIT ?`,
        [...keys, statusFilter, statusFilter, safeLimit]
    );
    // Filter after the query so the limit still applies to the servable set rather
    // than being consumed by rows that get dropped.
    return rows.filter(isServableGuideline).map((row) => this.mapGuidelineRow(row));
}

async listGuidelines({ query = '', status = '', sourceBody = '', limit = 50, offset = 0, onlyActive = false } = {}) {
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 100);
    const safeOffset = Math.max(parseInt(String(offset), 10) || 0, 0);
    const qRaw = String(query || '').trim();
    const qLower = qRaw.toLowerCase();
    const qPattern = qRaw ? `%${qLower}%` : '';
    const statusFilter = String(status || '').trim();
    const sourceFilter = String(sourceBody || '').trim();
    const activeOnly = onlyActive ? 1 : 0;

    const rows = await this.all(
        `SELECT * FROM topic_guidelines
         WHERE (length(?) = 0 OR lower(topic) LIKE ? OR lower(coalesce(recommendation_text, '')) LIKE ? OR lower(coalesce(source_body, '')) LIKE ?)
           AND (? = '' OR status = ?)
           AND (? = '' OR source_body = ?)
           AND (? != 1 OR superseded_by_id IS NULL)
         ORDER BY updated_at DESC
         LIMIT ? OFFSET ?`,
        [qLower, qPattern, qPattern, qPattern, statusFilter, statusFilter, sourceFilter, sourceFilter, activeOnly, safeLimit, safeOffset]
    );
    const countRow = await this.get(
        `SELECT COUNT(*) AS count FROM topic_guidelines
         WHERE (length(?) = 0 OR lower(topic) LIKE ? OR lower(coalesce(recommendation_text, '')) LIKE ? OR lower(coalesce(source_body, '')) LIKE ?)
           AND (? = '' OR status = ?)
           AND (? = '' OR source_body = ?)
           AND (? != 1 OR superseded_by_id IS NULL)`,
        [qLower, qPattern, qPattern, qPattern, statusFilter, statusFilter, sourceFilter, sourceFilter, activeOnly]
    );
    return {
        guidelines: rows.map((row) => this.mapGuidelineRow(row)),
        total: Number(countRow?.count || 0),
        limit: safeLimit,
        offset: safeOffset,
    };
}

async updateGuideline(id, patch) {
    const existing = await this.getGuidelineById(id);
    if (!existing) return null;
    const now = new Date().toISOString();

    const fields = [];
    const values = [];
    const add = (col, val) => { if (val !== undefined) { fields.push(`${col} = ?`); values.push(val); } };

    add('topic', patch.topic !== undefined ? String(patch.topic).trim().slice(0, 240) : undefined);
    add('normalized_topic', patch.topic !== undefined ? this.normalizeTopic(patch.topic) : undefined);
    add('source_body', patch.sourceBody !== undefined ? String(patch.sourceBody).trim() : undefined);
    add('source_region', patch.sourceRegion !== undefined ? (patch.sourceRegion ? String(patch.sourceRegion).trim() : null) : undefined);
    add('source_year', patch.sourceYear !== undefined ? (patch.sourceYear ? parseInt(patch.sourceYear, 10) : null) : undefined);
    add('source_url', patch.sourceUrl !== undefined ? (patch.sourceUrl ? String(patch.sourceUrl).trim() : null) : undefined);
    add('source_specialty', patch.sourceSpecialty !== undefined ? (patch.sourceSpecialty ? String(patch.sourceSpecialty).trim() : null) : undefined);
    add('source_domain', patch.sourceDomain !== undefined ? (patch.sourceDomain ? String(patch.sourceDomain).trim() : null) : undefined);
    add('recommendation_text', patch.recommendationText !== undefined ? String(patch.recommendationText).trim() : undefined);
    add('recommendation_strength', patch.recommendationStrength !== undefined ? (patch.recommendationStrength ? String(patch.recommendationStrength).trim() : null) : undefined);
    add('recommendation_certainty', patch.recommendationCertainty !== undefined ? (patch.recommendationCertainty ? String(patch.recommendationCertainty).trim() : null) : undefined);
    add('population', patch.population !== undefined ? (patch.population ? String(patch.population).trim() : null) : undefined);
    add('intervention', patch.intervention !== undefined ? (patch.intervention ? String(patch.intervention).trim() : null) : undefined);
    add('cautions', patch.cautions !== undefined ? (patch.cautions ? String(patch.cautions).trim() : null) : undefined);
    add('status', patch.status !== undefined ? String(patch.status).trim() : undefined);
    add('last_checked_at', patch.lastCheckedAt !== undefined ? patch.lastCheckedAt : now);
    add('updated_at', now);

    if (fields.length === 0) return existing;
    values.push(id);
    await this.run(`UPDATE topic_guidelines SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getGuidelineById(id);
}

async markGuidelineReviewed(id, reviewerId) {
    const now = new Date().toISOString();
    await this.run(
        `UPDATE topic_guidelines SET status = 'human_reviewed', reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?`,
        [reviewerId || null, now, now, id]
    );
    return this.getGuidelineById(id);
}

async markGuidelineStale(id) {
    const now = new Date().toISOString();
    await this.run(
        `UPDATE topic_guidelines SET status = 'stale', updated_at = ? WHERE id = ?`,
        [now, id]
    );
    return this.getGuidelineById(id);
}

async markGuidelineSuperseded(id, supersededById) {
    const now = new Date().toISOString();
    await this.run(
        `UPDATE topic_guidelines SET status = 'superseded', superseded_by_id = ?, updated_at = ? WHERE id = ?`,
        [supersededById, now, id]
    );
    return this.getGuidelineById(id);
}

async deleteGuideline(id) {
    await this.run(`DELETE FROM topic_guidelines WHERE id = ?`, [id]);
    return { deleted: true };
}
};
