'use strict';

const ACCEPTED_TYPES = new Set([
    'guideline', 'consensus', 'consensus guideline', 'practice guideline',
    'randomized controlled trial', 'randomised controlled trial', 'rct', 'trial', 'landmark trial',
    'systematic review', 'meta analysis', 'review', 'review article', 'literature review',
]);

const compact = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const compactText = (value) => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();

function acceptedEvidenceType(source = {}, document = {}) {
    const text = compact([
        source.design, source.type, source.publicationType,
        document.evidence_tier, document.document_label,
    ].filter(Boolean).join(' '));
    return [...ACCEPTED_TYPES].some((type) => text.includes(type));
}

function sourceIdentifiers(source = {}) {
    return [...new Set([
        source.pmid && `pmid:${compact(source.pmid)}`,
        source.pmcid && `pmcid:${compact(source.pmcid)}`,
        source.doi && `doi:${compact(source.doi)}`,
        source.uid && `uid:${compact(source.uid)}`,
    ].filter(Boolean))];
}

function anchorIdentifier(anchor = {}) {
    if (anchor.pmid) return `pmid:${compact(anchor.pmid)}`;
    if (anchor.pmcid) return `pmcid:${compact(anchor.pmcid)}`;
    if (anchor.doi) return `doi:${compact(anchor.doi)}`;
    const raw = anchor.sourceId || anchor.source_id || anchor.uid || '';
    const value = compact(raw);
    if (!value) return '';
    if (/^(pmid|pmcid|doi|uid) /.test(value)) return value.replace(/^([^ ]+) /, '$1:');
    return `uid:${value}`;
}

function anchorsForPoint(point = {}) {
    const value = point.evidenceAnchors || point.evidence_anchors || point.supports || point.evidence;
    return Array.isArray(value) ? value.filter((entry) => entry && typeof entry === 'object') : [];
}

async function findDocument(db, source = {}) {
    const clauses = [];
    const params = [];
    if (source.pmid) { clauses.push('pmid = ?'); params.push(String(source.pmid)); }
    if (source.pmcid) { clauses.push('pmcid = ?'); params.push(String(source.pmcid)); }
    if (source.doi) { clauses.push('LOWER(doi) = LOWER(?)'); params.push(String(source.doi)); }
    if (!clauses.length) return null;
    return db.get(
        `SELECT id, pmid, pmcid, doi, title, document_label, evidence_tier,
                full_text, full_text_source, word_count, source_year, source_url
         FROM guideline_documents WHERE ${clauses.join(' OR ')} LIMIT 1`,
        params,
    );
}

/**
 * Deterministic, no-LLM clearance for mentor pages.
 * Every teaching claim must carry an exact source-text anchor. Merely naming a
 * reliable paper is insufficient: it would allow a correct citation to be
 * attached to a claim the cited paper never made.
 */
async function evaluateMentorEvidenceClearance(db, page = {}) {
    const points = Array.isArray(page.teaching_points) ? page.teaching_points : [];
    const sources = Array.isArray(page.sources) ? page.sources : [];
    const sourceMap = new Map();
    for (const source of sources) {
        for (const id of sourceIdentifiers(source)) sourceMap.set(id, source);
    }

    const failures = [];
    const documents = new Map();
    let verifiedAnchors = 0;
    if (!points.length) failures.push({ code: 'no_teaching_points' });

    for (let pointIndex = 0; pointIndex < points.length; pointIndex++) {
        const point = points[pointIndex] || {};
        if (!String(point.claim || '').trim()) {
            failures.push({ code: 'empty_claim', pointIndex });
            continue;
        }
        const anchors = anchorsForPoint(point);
        if (!anchors.length) {
            failures.push({ code: 'missing_evidence_anchor', pointIndex });
            continue;
        }
        let pointVerified = false;
        for (const anchor of anchors) {
            const id = anchorIdentifier(anchor);
            const source = sourceMap.get(id);
            if (!id || !source) {
                failures.push({ code: 'unresolved_anchor_source', pointIndex, sourceId: id || null });
                continue;
            }
            let document = documents.get(id);
            if (document === undefined) {
                document = await findDocument(db, source);
                documents.set(id, document || null);
            }
            if (!document) {
                failures.push({ code: 'source_not_catalogued', pointIndex, sourceId: id });
                continue;
            }
            if (!acceptedEvidenceType(source, document)) {
                failures.push({ code: 'source_type_not_accepted', pointIndex, sourceId: id });
                continue;
            }
            const quote = compactText(anchor.quote || anchor.supportingQuote || anchor.supporting_text);
            if (quote.length < 40) {
                failures.push({ code: 'supporting_quote_missing_or_too_short', pointIndex, sourceId: id });
                continue;
            }
            const fullText = compactText(document.full_text);
            if (!fullText || !fullText.includes(quote)) {
                failures.push({ code: 'supporting_quote_not_found', pointIndex, sourceId: id });
                continue;
            }
            pointVerified = true;
            verifiedAnchors++;
        }
        if (!pointVerified) failures.push({ code: 'claim_not_verified', pointIndex });
    }

    const uniqueFailures = failures.filter((failure, index) => (
        failures.findIndex((candidate) => JSON.stringify(candidate) === JSON.stringify(failure)) === index
    ));
    return {
        cleared: points.length > 0 && uniqueFailures.length === 0,
        method: 'exact_source_text_anchor_v1',
        claims: points.length,
        verifiedAnchors,
        cataloguedSources: [...documents.values()].filter(Boolean).length,
        failures: uniqueFailures,
    };
}

module.exports = { evaluateMentorEvidenceClearance, acceptedEvidenceType, anchorsForPoint };
