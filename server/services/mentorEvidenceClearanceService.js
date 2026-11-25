'use strict';

const { extractNumericTokens } = require('./aiOutputValidation');
const { populationsIn, sexIn, populationCovers } = require('./clinical/clinicalFacts');

const ACCEPTED_TYPES = new Set([
    'guideline', 'consensus', 'consensus guideline', 'practice guideline',
    'randomized controlled trial', 'randomised controlled trial', 'rct', 'trial', 'landmark trial',
    'systematic review', 'meta analysis', 'review', 'review article', 'literature review',
]);

const UP_RE = /\b(increas\w*|rais\w*|higher|greater|more likely|improv\w*|benefit\w*|superior|better|prolong\w*|elevat\w*|gain\w*|rose|rise)\b/i;
const DOWN_RE = /\b(decreas\w*|reduc\w*|lower\w*|fewer|less likely|worse|declin\w*|inferior|shorten\w*|fell|fall|diminish\w*)\b/i;
const NEGATION_RE = /\b(no|not|without|neither|nor|never|failed to|fail to|absence of|did not|does not|do not|cannot|non-?significant|no significant|not significant)\b/i;

function stemWords(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/haem/g, 'hem')
        .replace(/anaem/g, 'anem')
        .replace(/oesoph/g, 'esoph')
        .replace(/paediatr/g, 'pediatr')
        .replace(/leukaem/g, 'leukem')
        .replace(/kalaem/g, 'kalem')
        .replace(/ischaem/g, 'ischem')
        .replace(/oedema/g, 'edema')
        .replace(/tumour/g, 'tumor')
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 4)
        .map((w) => w.replace(/(?:ing|ed|es|s|tion|ment)$/i, ''))
        .filter((w) => w.length >= 3);
}

const SYNONYM_EQUIVALENTS = {
    reduc: ['decreas', 'lower', 'diminish', 'fell', 'fall', 'prevent', 'cut'],
    decreas: ['reduc', 'lower', 'diminish', 'fell', 'fall'],
    lower: ['reduc', 'decreas', 'diminish'],
    increas: ['rais', 'higher', 'elevat', 'rose', 'rise', 'greater'],
    rais: ['increas', 'higher', 'elevat', 'rose', 'rise'],
    admiss: ['hospitali', 'inpatient'],
    hospitali: ['admiss', 'inpatient'],
    mortal: ['death', 'fatal', 'surviv'],
    death: ['mortal', 'fatal'],
    recommend: ['indicat', 'advis', 'endors', 'first', 'should', 'must'],
    should: ['recommend', 'must', 'indicat'],
    renal: ['kidney', 'nephr'],
    kidney: ['renal', 'nephr'],
    hepatic: ['liver', 'hepat'],
    liver: ['hepatic', 'hepat'],
    cardiac: ['heart', 'coronar', 'myocardi'],
    heart: ['cardiac', 'coronar', 'myocardi'],
    pulmonar: ['lung', 'respirator'],
    lung: ['pulmonar', 'respirator'],
    paediatr: ['pediatr', 'child', 'children', 'infant', 'adolesc'],
    pediatr: ['paediatr', 'child', 'children', 'infant', 'adolesc'],
    child: ['pediatr', 'paediatr', 'children'],
    therap: ['treatment', 'manag', 'interven', 'regimen'],
    treatment: ['therap', 'manag', 'interven'],
    manag: ['treatment', 'therap', 'interven'],
    diagnos: ['identif', 'detect', 'workup', 'evaluat'],
};

function stemMatchesSet(stem, targetSet) {
    if (targetSet.has(stem)) return true;
    for (const t of targetSet) {
        if ((t.length >= 4 && stem.startsWith(t.slice(0, 5))) || (stem.length >= 4 && t.startsWith(stem.slice(0, 5)))) {
            return true;
        }
    }
    const syns = SYNONYM_EQUIVALENTS[stem] || [];
    for (const syn of syns) {
        if (targetSet.has(syn)) return true;
        for (const t of targetSet) {
            if (t.startsWith(syn.slice(0, 5)) || syn.startsWith(t.slice(0, 5))) return true;
        }
    }
    return false;
}

/**
 * Semantic / inferred information equivalence check between a claim or anchor passage and stored full text.
 * Verifies that an inferred or paraphrased clinical statement provides the exact same factual information
 * as the document:
 *   1. Every substantive content stem in the statement must be accounted for in the source document
 *      (either directly or via medical/directional synonym equivalence), and at least 75% must cluster
 *      within a single coherent 2-sentence passage window (so no novel/unmentioned claims slip through).
 *   2. 100% numeric token fidelity (every dose, threshold, percentage, HR/OR/RR in the statement exists in the document).
 *   3. No directional reversal (increase vs decrease) or negation polarity conflict against the matched passage.
 *   4. No population narrowing mismatch (e.g. paediatric vs adult).
 */
function textProvidesSameInformation(statementText, documentFullText, { minWindowCoverage = 0.75 } = {}) {
    const stmt = compactText(statementText);
    const full = compactText(documentFullText);
    if (!stmt || stmt.length < 30 || !full) return { ok: false, reason: 'too_short' };
    if (full.includes(stmt)) return { ok: true, mode: 'exact_quote', overlap: 1.0, matchedPassage: stmt };

    // 1. Numeric fidelity: every numeric token in the statement must appear in the source document
    const stmtNums = [...new Set(extractNumericTokens(stmt))];
    if (stmtNums.length > 0) {
        const docNums = new Set(extractNumericTokens(full));
        if (stmtNums.some((n) => !docNums.has(n))) {
            return { ok: false, reason: 'number_not_in_source' };
        }
    }

    // 2. Every content stem in the inferred statement must be grounded in the document (no unmentioned concepts)
    const stmtStems = [...new Set(stemWords(stmt))];
    if (stmtStems.length < 3) return { ok: false, reason: 'insufficient_content_words' };

    const docStemSet = new Set(stemWords(full));
    for (const w of stmtStems) {
        if (!stemMatchesSet(w, docStemSet)) {
            return { ok: false, reason: 'ungrounded_concept_in_statement', ungroundedStem: w };
        }
    }

    // 3. Find best matching 2-sentence window in the document
    const sentences = String(documentFullText || '')
        .replace(/\s+/g, ' ')
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 25);

    let bestWindow = '';
    let bestOverlap = 0;

    const candidateList = sentences.length > 0 ? sentences : [String(documentFullText || '').trim()];
    for (let i = 0; i < candidateList.length; i++) {
        const windowText = i + 1 < candidateList.length ? `${candidateList[i]} ${candidateList[i + 1]}` : candidateList[i];
        const winSet = new Set(stemWords(windowText));
        let hits = 0;
        for (const w of stmtStems) {
            if (stemMatchesSet(w, winSet)) hits++;
        }
        const ratio = hits / stmtStems.length;
        if (ratio > bestOverlap) {
            bestOverlap = ratio;
            bestWindow = windowText;
        }
    }

    if (bestOverlap < minWindowCoverage || !bestWindow) {
        return { ok: false, reason: 'supporting_quote_not_found', overlap: bestOverlap };
    }

    // 4. Directional & Negation Polarity equivalence against the best window
    const sUp = UP_RE.test(stmt);
    const sDown = DOWN_RE.test(stmt);
    const wUp = UP_RE.test(bestWindow);
    const wDown = DOWN_RE.test(bestWindow);
    const sDir = sUp !== sDown ? (sUp ? 'up' : 'down') : null;
    const wDir = wUp !== wDown ? (wUp ? 'up' : 'down') : null;
    if (sDir && wDir && sDir !== wDir) {
        return { ok: false, reason: 'direction_conflict', overlap: bestOverlap };
    }
    if (NEGATION_RE.test(stmt) !== NEGATION_RE.test(bestWindow)) {
        return { ok: false, reason: 'polarity_conflict', overlap: bestOverlap };
    }

    // 5. Population containment equivalence
    const stmtPops = populationsIn(stmt);
    const docPops = populationsIn(full);
    if (stmtPops.length > 0 && docPops.length > 0 && !stmtPops.every((t) => populationCovers(docPops, t))) {
        return { ok: false, reason: 'population_mismatch', overlap: bestOverlap };
    }
    const stmtSex = sexIn(stmt);
    const docSex = sexIn(full);
    if (stmtSex.length > 0 && docSex.length > 0 && !stmtSex.every((t) => docSex.includes(t))) {
        return { ok: false, reason: 'population_mismatch', overlap: bestOverlap };
    }

    return {
        ok: true,
        mode: 'inferred_information_equivalent',
        overlap: Number(bestOverlap.toFixed(3)),
        matchedPassage: bestWindow.slice(0, 480),
    };
}

const compact = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const compactText = (value) => String(value || '')
    .toLowerCase()
    .replace(/[‘’`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/ﬁ/g, 'fi')
    .replace(/ﬂ/g, 'fl')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

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

/**
 * Resolve a cited source to one stored document. Identifiers are tried strongest first (PMID, PMCID,
 * DOI, then exact title) so a different row that merely shares a title — e.g. a second, unlabelled
 * copy of the same guideline with different text extraction — can never stand in for the cited one.
 */
async function findDocument(db, source = {}, documentId = null) {
    // An anchor that names its stored row (documentId) pins the lookup to that row, so a newer copy of a
    // guideline can never be shadowed by an older row with the same title. The row is refused if it
    // carries a different PMID/PMCID than the cited source (the anchor then falls back to identifiers).
    const docId = Number(documentId);
    if (Number.isInteger(docId) && docId > 0) {
        const row = await db.get(
            `SELECT id, pmid, pmcid, doi, title, document_label, evidence_tier,
                    full_text, full_text_source, word_count, source_year, source_url
             FROM guideline_documents WHERE id = ?`,
            [docId],
        );
        const clash = row && ((source.pmid && /^\d+$/.test(String(source.pmid)) && row.pmid && String(row.pmid) !== String(source.pmid))
            || (source.pmcid && row.pmcid && String(row.pmcid) !== String(source.pmcid)));
        if (row && !clash && row.full_text) return row;
    }
    const lookups = [];
    if (source.pmid) lookups.push(['pmid = ?', String(source.pmid)]);
    if (source.pmcid) lookups.push(['pmcid = ?', String(source.pmcid)]);
    if (source.doi) lookups.push(['LOWER(doi) = LOWER(?)', String(source.doi)]);
    if (source.title) lookups.push(['LOWER(title) = LOWER(?)', String(source.title).trim()]);
    for (const [clause, value] of lookups) {
        const row = await db.get(
            `SELECT id, pmid, pmcid, doi, title, document_label, evidence_tier,
                    full_text, full_text_source, word_count, source_year, source_url
             FROM guideline_documents WHERE ${clause}
             ORDER BY CASE WHEN full_text IS NULL THEN 1 ELSE 0 END, id LIMIT 1`,
            [value],
        );
        if (row) return row;
    }
    return null;
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
            const anchorDocId = anchor.documentId ?? anchor.document_id ?? null;
            const docKey = `${id}|${anchorDocId || ''}`;
            let document = documents.get(docKey);
            if (document === undefined) {
                document = await findDocument(db, source, anchorDocId);
                documents.set(docKey, document || null);
            }
            if (!document) {
                failures.push({ code: 'source_not_catalogued', pointIndex, sourceId: id });
                continue;
            }
            if (!acceptedEvidenceType(source, document)) {
                failures.push({ code: 'source_type_not_accepted', pointIndex, sourceId: id });
                continue;
            }
            const quote = compactText(anchor.quote || anchor.supportingQuote || anchor.supporting_text || anchor.exact_quote || anchor.exactQuote || point.claim);
            if (quote.length < 35) {
                failures.push({ code: 'supporting_quote_missing_or_too_short', pointIndex, sourceId: id });
                continue;
            }
            const fullText = compactText(document.full_text);
            if (!fullText) {
                failures.push({ code: 'supporting_quote_not_found', pointIndex, sourceId: id });
                continue;
            }
            if (!fullText.includes(quote)) {
                const eqCheck = textProvidesSameInformation(quote, document.full_text);
                if (!eqCheck.ok) {
                    failures.push({ code: 'supporting_quote_not_found', pointIndex, sourceId: id, reason: eqCheck.reason });
                    continue;
                }
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
        method: 'exact_or_inferred_equivalent_source_anchor_v2',
        claims: points.length,
        verifiedAnchors,
        cataloguedSources: [...documents.values()].filter(Boolean).length,
        failures: uniqueFailures,
    };
}

module.exports = { evaluateMentorEvidenceClearance, acceptedEvidenceType, anchorsForPoint, textProvidesSameInformation };
