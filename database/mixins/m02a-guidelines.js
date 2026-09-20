'use strict';

const { isServableGuideline } = require('../../server/utils/guidelineQuality');
const { expandNormalizedTopicKeys, resolveCanonicalNormalized, resolveConditionGroupForTopic } = require('../../server/utils/topicSynonyms');
const { assessGuidelineQuality } = require('../../server/services/guidelineQualityService');
const { normalizeStoredDocument } = require('../../server/utils/importEvidenceQuality');
const { isIssuingBodyValue } = require('../../server/utils/guidelineAttribution');
const { isClinicalAbbreviation } = require('../../server/utils/clinicalAbbreviations');
const { synonymExpansionsForToken } = require('../../server/utils/conditionQuery');
const { sanitizePublicationYear } = require('../../server/utils/publicationYear');

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
    'diagnosis','diagnostic','criteria','guidelines','guideline','patient','patients','clinical','care','use','used',
    'based','associated','related','including','following','due','new','first','also','than',
    'other','more','risk','high','low','type','level','dose','daily','per','each','all',
    'when','which','that','this','these','those','who','whom','what','where','how',
]);

/**
 * The four-letter floor drops function words, but it also dropped the most
 * discriminating term in the way clinicians search. "aki diagnosis and
 * management" reduced to ["diagnosis"] -- "aki" too short, "management" a stop
 * word -- so retrieval matched every topic containing the word "diagnosis" and
 * returned cardiac amyloidosis, hepatorenal syndrome and syphilis with no AKI
 * content at all. "ckd management" reduced to nothing.
 *
 * Short tokens are admitted only when they are curated clinical abbreviations,
 * so the floor still keeps function words out.
 */
function topicContentWords(topic) {
    const tokens = String(topic || '').toLowerCase().match(/[a-z0-9]{2,}/g) || [];
    const kept = tokens.filter((word) => {
        if (SCORE_STOP.has(word)) return false;
        return word.length >= 4 || isClinicalAbbreviation(word);
    });
    return [...new Set(kept)];
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
        if (text.includes(w) || expansionHitsText(w, text)) hits += 1;
        else if (attribution.includes(w) || expansionHitsText(w, attribution)) hits += 0.5;
    }
    return hits / topicWords.length;
}

function expansionHitsText(word, haystack) {
    return synonymExpansionsForToken(word).some((phrase) => haystack.includes(phrase));
}

/**
 * Bodies are free text, so one organisation arrives under several spellings
 * ("American Thoracic Society", "American Thoracic Society (ATS)"). Grouping on
 * the raw string hands the same body two slots in a diversified list.
 */
function bodyKey(row) {
    return String(row.source_body || '')
        .toLowerCase()
        .replace(/\([^)]*\)/g, ' ')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim() || 'unattributed';
}

/**
 * Term score alone put twelve NICE 2014 rows in the top twelve for
 * community-acquired pneumonia while ATS 2025/2026, ERS 2026 and BTS sat below
 * them: the older text repeats the topic words slightly more often, and year was
 * only a tiebreak between *identical* scores, so a 0.83 from 2014 beat a 0.80
 * from 2026 outright.
 *
 * Quantising to tenths makes scores that differ by noise compare equal, and lets
 * recency decide between them. A row that is genuinely more on-topic still wins:
 * it lands in a higher bucket.
 */
const SCORE_BUCKET = 10;

/** Shared queue for source_body values that are not recognised organisations. */
const UNRECOGNISED_BODY = '__unrecognised_body__';

function rankKey({ score, year }) {
    return { bucket: Math.round(score * SCORE_BUCKET), year };
}

/**
 * Only rows scoring at least this share of the best row's score compete for a
 * body slot. Measured on production for "iron deficiency anaemia": every row
 * actually about the topic scored 1.00, while alpha-1 antitrypsin *deficiency*,
 * vitamin B12 *deficiency* and spironolactone all scored 0.33 — reached by a
 * single weak shared word. Without a floor those three bodies each took a slot
 * and pushed the real iron rows to positions five and seven. Adjacent topics
 * that genuinely belong (HFpEF under an HFrEF search, 0.80) stay above it.
 */
const DIVERSITY_RELEVANCE_FLOOR = 0.5;

/**
 * Interleave by issuing body so one organisation cannot take every slot, keeping
 * each body's own rows in rank order. A reader comparing guidance needs to see
 * that ATS, ERS, BTS and NICE all cover the topic; twelve rows from one of them
 * answers a different question than the one being asked.
 *
 * Only recognised organisations get a queue of their own. source_body is free
 * text and a large minority of it is journal names, so granting every distinct
 * value a slot led "iron deficiency anaemia" with PLoS One, Gut and Anemia.
 * Unrecognised values share a single queue: they still appear, and in rank
 * order, but collectively compete for one body's worth of positions.
 *
 * Grouping affects *ordering* only — nothing is dropped, here or by the
 * relevance floor. The curated body list under-lists real organisations ("Dutch
 * Working Party on Antibiotic Policy" is genuine and absent), and a weakly
 * matching row is still evidence the reader asked to see. Both mechanisms cost a
 * row its guaranteed slot, never its place in the results.
 */
function diversifyByBody(sorted, limit) {
    const best = sorted.length ? sorted[0].score : 0;
    const floor = best * DIVERSITY_RELEVANCE_FLOOR;

    const byBody = new Map();
    for (const item of sorted) {
        if (item.score < floor) continue;
        const key = isIssuingBodyValue(item.row.source_body) ? bodyKey(item.row) : UNRECOGNISED_BODY;
        if (!byBody.has(key)) byBody.set(key, []);
        byBody.get(key).push(item);
    }

    // Bodies compete in the order their best row ranked, so diversification
    // reorders within the result set without promoting a weak body above a
    // strong one's first entry.
    const queues = [...byBody.values()];
    const out = [];
    let progressed = true;
    while (out.length < limit && progressed) {
        progressed = false;
        for (const queue of queues) {
            if (!queue.length) continue;
            out.push(queue.shift());
            progressed = true;
            if (out.length >= limit) break;
        }
    }
    // Anything the floor held back, plus any queue leftovers, keep their rank
    // order. Flattening the queues alone would regroup them by body, so sort the
    // remainder back into the order the scorer produced.
    const placed = new Set(out);
    for (const item of sorted) {
        if (out.length >= limit) break;
        if (!placed.has(item)) out.push(item);
    }
    return out;
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

    // Deduplicate every stable identifier. The original implementation only
    // checked PMCID, so PubMed-, DOI-, and URL-only imports created a new local
    // document every time a seed job was re-run.
    const identities = [
        ['pmcid', doc.pmcid],
        ['pmid', doc.pmid],
        ['doi', doc.doi ? String(doc.doi).trim().toLowerCase() : null],
        ['source_url', doc.sourceUrl],
    ].filter(([, value]) => value);
    let existing = null;
    for (const [column, value] of identities) {
        existing = await this.get(`SELECT id FROM guideline_documents WHERE ${column} = ? LIMIT 1`, [value]);
        if (existing) break;
    }
    if (existing) {
        await this.run(
            `UPDATE guideline_documents SET
                pmcid = COALESCE(pmcid, ?), pmid = COALESCE(pmid, ?),
                doi = COALESCE(doi, ?), title = COALESCE(title, ?),
                source_body = COALESCE(source_body, ?), source_year = COALESCE(source_year, ?),
                source_url = COALESCE(source_url, ?), document_label = COALESCE(document_label, ?),
                evidence_tier = COALESCE(evidence_tier, ?),
                full_text = CASE WHEN ? = 1 AND full_text_source = 'abstract' THEN ? ELSE COALESCE(full_text, ?) END,
                full_text_source = CASE WHEN ? = 1 AND full_text_source = 'abstract' THEN ? ELSE COALESCE(full_text_source, ?) END,
                word_count = CASE WHEN ? = 1 AND full_text_source = 'abstract' THEN ? ELSE COALESCE(word_count, ?) END,
                fetched_at = COALESCE(fetched_at, ?), updated_at = ?
             WHERE id = ?`,
            [
                doc.pmcid || null, doc.pmid || null,
                doc.doi ? String(doc.doi).trim().toLowerCase() : null,
                doc.title ? String(doc.title).trim().slice(0, 500) : null,
                doc.sourceBody ? String(doc.sourceBody).trim() : null,
                sanitizePublicationYear(doc.sourceYear),
                doc.sourceUrl ? String(doc.sourceUrl).trim() : null,
                doc.documentLabel || null, doc.evidenceTier || 'guideline',
                Number(Boolean(doc.fullText && ['jats', 'pdf', 'manual'].includes(doc.fullTextSource))), doc.fullText || null, doc.fullText || null,
                Number(Boolean(doc.fullText && ['jats', 'pdf', 'manual'].includes(doc.fullTextSource))), doc.fullTextSource || null, doc.fullTextSource || (doc.fullText ? 'manual' : null),
                Number(Boolean(doc.fullText && ['jats', 'pdf', 'manual'].includes(doc.fullTextSource))), wordCount, wordCount,
                doc.fetchedAt || now, now, existing.id,
            ]
        );
        return existing.id;
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
            doc.doi ? String(doc.doi).trim().toLowerCase() : null,
            doc.title ? String(doc.title).trim().slice(0, 500) : null,
            doc.sourceBody ? String(doc.sourceBody).trim() : null,
            sanitizePublicationYear(doc.sourceYear),
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

async getLocalTopicDocuments(topic, { limit = 12 } = {}) {
    const knowledge = await this.getTopicKnowledge(topic);
    const references = (knowledge?.sourceArticles || []).slice(0, 40);
    const clauses = [];
    const params = [];
    for (const [field, property] of [['pmid', 'pmid'], ['pmcid', 'pmcid'], ['doi', 'doi']]) {
        const ids = [...new Set(references.map((row) => row[property]).filter(Boolean))];
        if (!ids.length) continue;
        clauses.push(`${field} IN (${ids.map(() => '?').join(',')})`);
        params.push(...ids);
    }
    if (!clauses.length) return [];
    return this.all(
        `SELECT id, pmid, pmcid, doi, title, source_body, source_year, source_url,
                document_label, full_text_source, SUBSTR(full_text, 1, 12000) AS text_excerpt
         FROM guideline_documents
         WHERE (${clauses.join(' OR ')}) AND full_text IS NOT NULL AND LENGTH(full_text) > 0
         ORDER BY source_year DESC NULLS LAST, id DESC LIMIT ?`,
        [...params, Math.min(20, Math.max(1, Number(limit) || 12))]
    );
}

/**
 * Documents stored with only an abstract and at least one identifier that can
 * be resolved through Europe PMC. Remaining abstract-only rows are an
 * external-content ceiling (no Europe PMC body for most; persistent PMC HTTP
 * 500s for a subset), not an application failure queue. An abstract of a
 * guideline is scope and methodology rather than its recommendations -- the
 * same gap that made guideline synopses useless.
 *
 * Ordered oldest-touched first so a bounded scheduled batch revisits the
 * ceiling instead of retrying the same rows every tick.
 */
async listGuidelineDocumentsNeedingFullText({ limit = 25 } = {}) {
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 25, 1), 500);
    return this.all(
        `SELECT id, pmcid, pmid, doi, title, source_body, source_year, full_text_source
         FROM guideline_documents
         WHERE (full_text_source = 'abstract' OR full_text IS NULL OR LENGTH(full_text) = 0)
           AND (
                (pmcid IS NOT NULL AND pmcid != '')
                OR (pmid IS NOT NULL AND pmid != '')
                OR (doi IS NOT NULL AND doi != '')
           )
         ORDER BY updated_at ASC NULLS FIRST, id ASC
         LIMIT ?`,
        [safeLimit]
    );
}

/** Attach fetched full text to an existing document row. */
async setGuidelineDocumentFullText(id, fullText, { source = 'jats', pmcid = null } = {}) {
    const text = String(fullText || '');
    if (!id || !text) return false;
    const wordCount = text.trim().split(/\s+/).length;
    const duplicate = pmcid
        ? await this.get('SELECT id FROM guideline_documents WHERE pmcid = ? AND id != ?', [pmcid, id])
        : null;
    const pmcidToStore = duplicate ? null : pmcid;
    await this.run(
        `UPDATE guideline_documents
            SET full_text = ?, full_text_source = ?, word_count = ?,
                pmcid = COALESCE(pmcid, ?),
                fetched_at = ?, updated_at = ?
          WHERE id = ?`,
        [text, source, wordCount, pmcidToStore, new Date().toISOString(), new Date().toISOString(), id]
    );
    return true;
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
                document_label, evidence_tier, full_text_source, word_count, synopsis_generated_at,
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
    return { rows: rows.map(normalizeStoredDocument), total: Number(total?.c || 0) };
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
    return { ...normalizeStoredDocument(rest), synopsis, fullText: includeFullText ? full_text : undefined };
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
            sanitizePublicationYear(guideline.sourceYear),
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

async getGuidelinesByTopic(topic, { status = '', limit = 20, includeRelated = true } = {}) {
    const normalized = this.normalizeTopic(topic);
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 100);
    const statusFilter = String(status || '').trim();
    const staleThreshold = new Date(Date.now() - 365 * 86400000).toISOString();
    // normalizeTopic keeps hyphens, so "iron-deficiency anaemia" and "iron
    // deficiency anaemia" are different storage keys. 335 stored topics carry a
    // hyphen (4,052 rows) and ten exist under both spellings, splitting 259 rows.
    // Rewriting normalizeTopic would orphan every hyphenated key already written,
    // so compare on a hyphen-insensitive form instead: replace() is portable and
    // matches whatever mix of hyphens and spaces each side happens to use.
    const dehyphenate = (value) => String(value || '').replace(/-/g, ' ');
    const keys = [...new Set([
        normalized,
        resolveCanonicalNormalized(String(topic || '').trim(), (s) => this.normalizeTopic(s)),
        ...expandNormalizedTopicKeys(normalized, (s) => this.normalizeTopic(s)),
    ].filter(Boolean).map(dehyphenate))];
    if (!keys.length) return [];

    // Auto-flag stale guidelines on read (all synonym keys)
    const stalePlaceholders = keys.map(() => '?').join(', ');
    await this.run(
        `UPDATE topic_guidelines SET status = 'stale'
         WHERE REPLACE(normalized_topic, '-', ' ') IN (${stalePlaceholders})
           AND status IN ('ai_extracted', 'human_reviewed')
           AND last_checked_at < ?
           AND superseded_by_id IS NULL`,
        [...keys, staleThreshold]
    );

    // Fetch a wider candidate pool so relevant rows beyond the recency-top are reachable.
    const fetchLimit = Math.min(safeLimit * 8, 400);
    const rows = await this.all(
        `SELECT * FROM topic_guidelines
         WHERE REPLACE(normalized_topic, '-', ' ') IN (${stalePlaceholders})
           AND (? = '' OR status = ?)
           AND superseded_by_id IS NULL
         ORDER BY source_year DESC NULLS LAST, updated_at DESC
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
    // Related-topic discovery is on by default for condition-anchored probes.
    // Topics are filed finer than people search (~80 servable AKI recs sit under
    // rhabdomyolysis-AKI, RRT timing, contrast-induced). Exact-name lookup
    // alone leaves the panel empty. Probe words already drop generic task terms
    // (diagnosis, management), so a shared condition token is what widens —
    // not "diagnosis" matching 411 unrelated rows.
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
    // One query per probe word, each with its own share of the pool.
    //
    // OR-ing the words into a single query and taking the newest N let a broad
    // word crowd out a specific one. "aki diagnosis and management" probes for
    // "aki" (65 rows) and "diagnosis" (411): the combined pool, ordered by year
    // and capped, held 10 AKI rows out of 48, and the search returned 2 of the
    // 82 servable AKI recommendations in the table. A per-word share means the
    // discriminating term always contributes, whatever it is paired with.
    const probeWords = topicContentWords(topic).slice(0, 4);
    const refiledIds = new Set();
    if (includeRelated && probeWords.length) {
        const perWord = Math.max(20, Math.ceil(fetchLimit / probeWords.length));
        const seen = new Set(rows.map((r) => r.id));
        for (const word of probeWords) {
            // Two-letter abbreviations ("ra", "ms") must be whole tokens or they
            // prefix-match "raas", "stems", etc.
            const like = word.length <= 2 ? `% ${word} %` : `% ${word}%`;
            const widened = await this.all(
                `SELECT * FROM topic_guidelines
                 WHERE (' ' || REPLACE(normalized_topic, '-', ' ') || ' ') LIKE ?
                   AND (? = '' OR status = ?)
                   AND superseded_by_id IS NULL
                 ORDER BY source_year DESC NULLS LAST, updated_at DESC
                 LIMIT ?`,
                [like, statusFilter, statusFilter, perWord]
            );
            for (const row of widened) {
                if (!seen.has(row.id)) { seen.add(row.id); rows.push(row); }
            }
        }
        // Condition mention in the recommendation itself — rows ingested under a
        // sibling or parent topic (KDIGO CKD) that still talk about this condition
        // (AKI). Do not invent filing; only surface text that already names it.
        const textProbes = [];
        for (const word of probeWords.slice(0, 2)) {
            textProbes.push(word);
            const expansion = synonymExpansionsForToken(word)[0];
            if (expansion) textProbes.push(expansion);
        }
        const perText = Math.max(20, Math.ceil(fetchLimit / Math.max(1, textProbes.length)));
        for (const phrase of [...new Set(textProbes)]) {
            const like = /\s/.test(phrase) || phrase.length <= 3
                ? `% ${phrase} %`
                : `% ${phrase}%`;
            const textHits = await this.all(
                `SELECT * FROM topic_guidelines
                 WHERE (' ' || lower(REPLACE(coalesce(recommendation_text, ''), '-', ' ')) || ' ') LIKE ?
                   AND (? = '' OR status = ?)
                   AND superseded_by_id IS NULL
                 ORDER BY source_year DESC NULLS LAST, updated_at DESC
                 LIMIT ?`,
                [like, statusFilter, statusFilter, perText]
            );
            for (const row of textHits) {
                if (!seen.has(row.id)) { seen.add(row.id); rows.push(row); }
            }
        }

        // Embedding-based re-filing (migration 096). The text probes above only
        // surface rows that already name the condition — 52 KDIGO recs sat in the
        // corpus with none under any AKI topic because retrieval cannot surface
        // what no text names. The backfill embeds each recommendation and files
        // it under its canonical condition cluster; here we simply join that
        // side table for the query's condition group. No vector math at query
        // time. Refiled rows bypass the score>0 floor below (their whole point
        // is not naming the condition literally) but keep their slot in the
        // same ranking, so a weak refiled rec still loses to a strong literal one.
        const conditionGroup = resolveConditionGroupForTopic(topic, (s) => this.normalizeTopic(s));
        if (conditionGroup) {
            // A missing side table (pre-migration test harnesses, degraded
            // environments) means "no refiled rows", not an error — same
            // posture as the guideline_contradictions route.
            try {
                const refiled = await this.all(
                    `SELECT g.* FROM topic_guidelines g
                     JOIN topic_guideline_refiling r ON r.guideline_id = g.id
                     WHERE r.canonical_normalized = ?
                       AND (? = '' OR g.status = ?)
                       AND g.superseded_by_id IS NULL
                     ORDER BY r.similarity DESC
                     LIMIT ?`,
                    [conditionGroup.canonicalNormalized, statusFilter, statusFilter, fetchLimit]
                );
                for (const row of refiled) {
                    if (!seen.has(row.id)) {
                        seen.add(row.id);
                        rows.push(row);
                        refiledIds.add(row.id);
                    }
                }
            } catch (err) {
                if (!/no such table/i.test(String(err?.message || ''))) throw err;
            }
        }
    }

    // Score by term overlap with the topic; floor at > 0 prevents cross-topic noise
    // (rows attributed to this topic via NICE page scrape but containing zero topic words).
    // Embedding-refiled rows (migration 096) are the exception: they were filed under
    // this condition precisely because the text does NOT name it literally.
    const topicWords = topicContentWords(topic);
    const scored = rows
        .filter(isServableGuideline)
        .map(row => ({ row, score: guidelineTermScore(row, topicWords), year: row.source_year || 0 }))
        .filter(({ row, score }) => topicWords.length === 0 || score > 0 || refiledIds.has(row.id));
    scored.sort((a, b) => {
        const ka = rankKey(a);
        const kb = rankKey(b);
        return kb.bucket - ka.bucket || kb.year - ka.year || b.score - a.score;
    });

    // 512 rows across 195 groups repeat a recommendation already stored under the
    // same topic and body -- re-ingesting a document creates a second copy rather
    // than matching the existing row. Collapsing them here is presentational: the
    // same sentence twice is never useful, whatever produced it. Keep the first
    // occurrence, which the sort above already placed best.
    const seenRecommendation = new Set();
    const deduped = [];
    for (const item of scored) {
        const fingerprint = `${bodyKey(item.row)}\u0000${String(item.row.recommendation_text || '').trim().toLowerCase()}`;
        if (seenRecommendation.has(fingerprint)) continue;
        seenRecommendation.add(fingerprint);
        deduped.push(item);
    }

    return diversifyByBody(deduped, safeLimit).map(({ row }) => this.mapGuidelineRow(row));
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
    add('source_year', patch.sourceYear !== undefined ? sanitizePublicationYear(patch.sourceYear) : undefined);
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
    await this.run(`DELETE FROM topic_guideline_refiling WHERE guideline_id = ?`, [id]);
    await this.run(`DELETE FROM topic_guidelines WHERE id = ?`, [id]);
    return { deleted: true };
}

// ─── Embedding re-filing (migration 096) ─────────────────────────────────────

/**
 * Bounded batch of recommendation rows for the embedding backfill, with the
 * existing re-filing hash so unchanged rows can be skipped. LEFT JOIN keeps
 * never-processed rows; the service compares embedded_text_hash per row.
 */
async listGuidelineRefilingCandidates({ limit = 200, offset = 0 } = {}) {
    const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 200, 1), 1000);
    const safeOffset = Math.max(parseInt(String(offset), 10) || 0, 0);
    return this.all(
        `SELECT g.id, g.topic, g.normalized_topic, g.source_body, g.recommendation_text,
                r.embedded_text_hash AS refiling_hash
         FROM topic_guidelines g
         LEFT JOIN topic_guideline_refiling r ON r.guideline_id = g.id
         WHERE g.superseded_by_id IS NULL
         ORDER BY g.id
         LIMIT ? OFFSET ?`,
        [safeLimit, safeOffset]
    );
}

/** One row per guideline: the single best-matching canonical condition. */
async upsertGuidelineRefiling({ guidelineId, canonicalNormalized, similarity, sourceTopicNormalized, textHash }) {
    if (!guidelineId || !canonicalNormalized) return false;
    await this.run(
        `INSERT INTO topic_guideline_refiling
            (guideline_id, canonical_normalized, similarity, source_topic_normalized, embedded_text_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (guideline_id) DO UPDATE SET
            canonical_normalized = EXCLUDED.canonical_normalized,
            similarity = EXCLUDED.similarity,
            source_topic_normalized = EXCLUDED.source_topic_normalized,
            embedded_text_hash = EXCLUDED.embedded_text_hash,
            created_at = EXCLUDED.created_at`,
        [
            guidelineId,
            String(canonicalNormalized),
            Number(similarity) || 0,
            String(sourceTopicNormalized || ''),
            String(textHash || ''),
            new Date().toISOString(),
        ]
    );
    return true;
}
};
