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

// Stop words that carry no topic-discriminating signal.
const SCORE_STOP = new Set([
    'and','the','of','in','for','with','to','a','an','or','on','at','by','from','as','is','are','be',
    'was','were','been','being','have','has','had','do','does','did','will','would','shall','should',
    'may','might','must','can','could','not','no','nor','but','yet','so',
    'vs','versus','management','therapy','treatment','disease','syndrome','acute','chronic',
    'criteria','guidelines','guideline','patient','patients','clinical','care','use','used',
    'based','associated','related','including','following','due','new','first','also','than',
    'other','more','risk','high','low','type','level','dose','daily','per','each','all',
    'when','which','that','this','these','those','who','whom','what','where','how',
]);

function topicContentWords(topic) {
    const words = String(topic || '').toLowerCase().match(/[a-z]{4,}/g) || [];
    return [...new Set(words.filter(w => !SCORE_STOP.has(w)))];
}

// Returns 0–1 fraction of topic content words found in recommendation text.
function guidelineTermScore(row, topicWords) {
    if (!topicWords.length) return 0;
    const text = String(row.recommendation_text || '').toLowerCase();
    let hits = 0;
    for (const w of topicWords) {
        if (text.includes(w)) hits++;
    }
    return hits / topicWords.length;
}

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
        // Provenance tier (migration 087). Must survive the mapping: trial rows are
        // stored in this same table, and without the tier a trial finding reaches
        // the learner rendered identically to a guideline recommendation — with an
        // authority it has not earned.
        evidenceTier: row.evidence_tier || 'unknown',
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

// ─── Document store ───────────────────────────────────────────────────────────

/**
 * Upsert a source document (guideline article, trial abstract, …) into the
 * persistent document store. Returns the row id.
 *
 * Dedup key is pmcid when present; otherwise a composite of source_body +
 * source_year + title (truncated). Caller should prefer pmcid.
 */
async upsertGuidelineDocument(doc) {
    const now = new Date().toISOString();
    const wordCount = doc.fullText
        ? String(doc.fullText).trim().split(/\s+/).length
        : null;

    // Try pmcid-keyed upsert first.
    if (doc.pmcid) {
        const existing = await this.get(
            `SELECT id FROM guideline_documents WHERE pmcid = ?`, [doc.pmcid]
        );
        if (existing) {
            // Update full_text if we now have it and didn't before.
            if (doc.fullText) {
                await this.run(
                    `UPDATE guideline_documents SET
                        full_text = COALESCE(full_text, ?),
                        full_text_source = COALESCE(full_text_source, ?),
                        word_count = COALESCE(word_count, ?),
                        fetched_at = COALESCE(fetched_at, ?),
                        updated_at = ?
                     WHERE id = ?`,
                    [doc.fullText, doc.fullTextSource || 'jats', wordCount, now, now, existing.id]
                );
            }
            return existing.id;
        }
    }

    const result = await this.run(
        `INSERT INTO guideline_documents (
            pmcid, pmid, doi, title, source_body, source_year, source_url,
            document_label, evidence_tier, full_text, full_text_source,
            word_count, fetched_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            doc.pmcid || null,
            doc.pmid || null,
            doc.doi || null,
            doc.title ? String(doc.title).trim().slice(0, 500) : null,
            doc.sourceBody ? String(doc.sourceBody).trim() : null,
            doc.sourceYear ? parseInt(doc.sourceYear, 10) : null,
            doc.sourceUrl ? String(doc.sourceUrl).trim() : null,
            doc.documentLabel || null,
            doc.evidenceTier || 'guideline',
            doc.fullText || null,
            doc.fullTextSource || (doc.fullText ? 'jats' : null),
            wordCount,
            doc.fetchedAt || now,
            now, now,
        ]
    );
    return result.id;
}

async getGuidelineDocument(id) {
    return this.get(`SELECT * FROM guideline_documents WHERE id = ?`, [id]);
}

async getGuidelineDocumentByPmcid(pmcid) {
    return this.get(`SELECT * FROM guideline_documents WHERE pmcid = ?`, [pmcid]);
}

// ─── Recommendations ─────────────────────────────────────────────────────────

async createGuideline(guideline) {
    const now = new Date().toISOString();
    const normalized = this.normalizeTopic(guideline.topic);

    // Optionally link to a document store row.
    let documentId = guideline.documentId || null;
    if (!documentId && guideline.pmcid) {
        const doc = await this.getGuidelineDocumentByPmcid(guideline.pmcid);
        if (doc) documentId = doc.id;
    }

    const result = await this.run(
        `INSERT INTO topic_guidelines (
            topic, normalized_topic, source_body, source_region, source_year,
            source_url, source_specialty, source_domain, recommendation_text,
            recommendation_strength, recommendation_certainty, population,
            intervention, cautions, status, document_id,
            last_checked_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            documentId,
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

    // Fetch a wider candidate pool so relevant rows beyond the recency-top are reachable.
    const fetchLimit = Math.min(safeLimit * 8, 400);
    const rows = await this.all(
        `SELECT * FROM topic_guidelines
         WHERE normalized_topic IN (${stalePlaceholders})
           AND (? = '' OR status = ?)
           AND superseded_by_id IS NULL
         ORDER BY source_year DESC, updated_at DESC
         LIMIT ?`,
        [...keys, statusFilter, statusFilter, fetchLimit]
    );

    // Score by term overlap with the topic, then sort relevant-first, recency second.
    const topicWords = topicContentWords(topic);
    const scored = rows
        .filter(isServableGuideline)
        .map(row => ({ row, score: guidelineTermScore(row, topicWords), year: row.source_year || 0 }));
    scored.sort((a, b) => b.score - a.score || b.year - a.year);

    return scored.slice(0, safeLimit).map(({ row }) => this.mapGuidelineRow(row));
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
