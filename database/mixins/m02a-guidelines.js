'use strict';

const { isServableGuideline } = require('../../server/utils/guidelineQuality');
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

/**
 * Returns 0–1 relevance of a guideline row to the searched topic.
 *
 * Scoring only recommendation_text discarded correctly-filed guidance, because
 * a recommendation sentence rarely restates the disease it is about -- the
 * document it came from supplies that. Measured in production: of 21 AGA
 * Institute rows filed under "hepatorenal syndrome diagnosis and management",
 * *none* contain the word "hepatorenal" in their recommendation text
 * ("IV albumin is the volume expander of choice in hospitalized patients...").
 * With 'syndrome' in SCORE_STOP, the query "hepatorenal syndrome" reduces to
 * the single word "hepatorenal", so every one of those rows scored 0 and was
 * filtered out. Thirteen of them were unreachable by any query at all; the
 * other eight surfaced only if the searcher happened to name the drug.
 *
 * So the row's own attribution counts too, at half weight. A row whose text is
 * on-topic still outranks one that is merely filed under the topic, but a
 * correctly-filed recommendation is no longer thrown away for failing to repeat
 * its own subject.
 *
 * This does weaken the floor's original purpose (dropping rows swept into a
 * topic by a page scrape without containing its words). That trade is
 * deliberate: silently hiding two thirds of a real guideline set is the worse
 * failure for a product whose promise is to surface the evidence it has, and
 * mis-attribution is better fixed in the ingestion pipeline than by suppressing
 * results at read time.
 */
function guidelineTermScore(row, topicWords) {
    if (!topicWords.length) return 0;
    const text = String(row.recommendation_text || '').toLowerCase();
    const attribution = `${row.topic || ''} ${row.normalized_topic || ''}`.toLowerCase();
    let hits = 0;
    for (const w of topicWords) {
        if (text.includes(w)) hits += 1;
        else if (attribution.includes(w)) hits += 0.5;
    }
    return hits / topicWords.length;
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
        // Structured decomposition fields (migration 088). Present on rows that have
        // been through structure-recommendations.js; null on unstructured rows.
        recDirection: row.rec_direction || undefined,
        recExclusions: row.rec_exclusions || undefined,
        recTrigger: row.rec_trigger || undefined,
        structuredAt: row.structured_at || undefined,
        documentId: row.document_id || undefined,
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
 *
 * The INSERT carries `RETURNING id` -- without it, DatabaseCore.run() on
 * Postgres gets back `rows: []` (a plain INSERT returns no rows), so
 * `result.id` is undefined and this function returns undefined despite the
 * row committing. better-sqlite3's .run() tolerates RETURNING in the SQL text
 * fine (verified: it just ignores the returned row and still reports
 * lastInsertRowid), so this is safe on both dialects.
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
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING id`,
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

/**
 * Lightweight rows for browsing -- excludes full_text, which can run to tens
 * of thousands of words and is not needed until a single document is opened.
 */
async listGuidelineDocuments({ limit = 50, offset = 0, hasSynopsis = null } = {}) {
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 200);
    const safeOffset = Math.max(parseInt(String(offset), 10) || 0, 0);
    const where = [];
    if (hasSynopsis === true) where.push('synopsis_json IS NOT NULL');
    if (hasSynopsis === false) where.push('synopsis_json IS NULL');
    const rows = await this.all(
        `SELECT id, pmcid, pmid, doi, title, source_body, source_year, source_url,
                document_label, evidence_tier, word_count, synopsis_generated_at,
                (synopsis_json IS NOT NULL) AS has_synopsis
         FROM guideline_documents
         ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
         ORDER BY source_year DESC NULLS LAST, title
         LIMIT ? OFFSET ?`,
        [safeLimit, safeOffset]
    );
    const total = await this.get(
        `SELECT COUNT(*) AS c FROM guideline_documents ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`
    );
    return { rows, total: Number(total?.c || 0) };
}

/** Single document with its synopsis parsed, full_text omitted by default. */
async getGuidelineDocumentWithSynopsis(id, { includeFullText = false } = {}) {
    const row = await this.getGuidelineDocument(id);
    if (!row) return null;
    const { full_text, synopsis_json, ...rest } = row;
    let synopsis = null;
    if (synopsis_json) {
        try { synopsis = JSON.parse(synopsis_json); } catch { synopsis = null; }
    }
    return { ...rest, synopsis, fullText: includeFullText ? full_text : undefined };
}

// ─── Recommendations ─────────────────────────────────────────────────────────

/**
 * Insert a recommendation row and return it, or undefined on Postgres if the
 * INSERT lacks RETURNING id -- found 2026-09-09 running discoverGuidelinesForTopic
 * against 10 pilot topics: real rows landed in topic_guidelines (confirmed by
 * direct query) while the function returned undefined for every one of them, so
 * discoverGuidelinesForTopic's own accounting (`extracted: inserted.length`) and
 * its empty-result cache (`if (inserted.length === 0) _discoveryEmpty.set(...)`)
 * were both wrong. The existing test for that caller mocks db.createGuideline
 * wholesale, so it could not have caught this -- see the "mock hiding a 100%
 * failure rate" entry in project memory; this is the same shape again.
 */
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id`,
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

    // The keys above match normalized_topic by exact equality, so a query only
    // finds guidelines if it is worded exactly like the stored topic (or hits a
    // synonym group). Searching "hepatorenal syndrome terlipressin" returned
    // nothing while the corpus held four AGA Institute 2025 recommendations
    // under "hepatorenal syndrome diagnosis and management" -- one of them
    // naming terlipressin directly. The page then reported "0 guidelines",
    // which for a product whose promise is completeness is the worst possible
    // failure: a silent under-report indistinguishable from genuine absence.
    //
    // So when exact matching finds nothing, widen to topics sharing a
    // distinctive content word and let the existing relevance scoring below
    // decide. That scoring already floors at score > 0, which is what keeps a
    // broad candidate pool from becoming cross-topic noise -- it simply never
    // got the chance to run.
    // Widen the pool, always -- not only when the exact keys found nothing.
    //
    // Exact matching is on normalized_topic equality, so a guideline is only
    // reachable when the query is worded like the stored topic. Measured on
    // production, "hepatorenal syndrome terlipressin" returned two journal rows
    // (Dig Dis Sci 2019, Vnitr Lek 2006) while four AGA Institute 2025
    // recommendations sat under "hepatorenal syndrome diagnosis and
    // management" -- one naming terlipressin directly. Gating the wider search
    // on an empty result was not enough: two weak rows matched, so the strong
    // ones were never looked for.
    //
    // The relevance scoring below already floors at score > 0 to keep a broad
    // pool from becoming cross-topic noise, so the safe move is to give it
    // everything plausible and let it rank. Duplicates are collapsed by id.
    const probeWords = topicContentWords(topic).slice(0, 4);
    if (probeWords.length) {
        const likeClauses = probeWords.map(() => 'normalized_topic LIKE ?').join(' OR ');
        const widened = await this.all(
            `SELECT * FROM topic_guidelines
             WHERE (${likeClauses})
               AND (? = '' OR status = ?)
               AND superseded_by_id IS NULL
             ORDER BY source_year DESC, updated_at DESC
             LIMIT ?`,
            [...probeWords.map((w) => `%${w}%`), statusFilter, statusFilter, fetchLimit]
        );
        const seen = new Set(rows.map((r) => r.id));
        for (const row of widened) {
            if (!seen.has(row.id)) { seen.add(row.id); rows.push(row); }
        }
    }

    // Score by term overlap with the topic; floor at > 0 prevents cross-topic noise
    // (rows attributed to this topic via NICE page scrape but containing zero topic words).
    const topicWords = topicContentWords(topic);
    const scored = rows
        .filter(isServableGuideline)
        .map(row => ({ row, score: guidelineTermScore(row, topicWords), year: row.source_year || 0 }))
        .filter(({ score }) => topicWords.length === 0 || score > 0);
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
