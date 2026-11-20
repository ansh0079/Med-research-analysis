'use strict';

const { textProvidesSameInformation } = require('./mentorEvidenceClearanceService');

function cleanDoi(value) {
    return String(value || '').trim().toLowerCase()
        .replace(/^https?:\/\/(?:dx\.)?doi\.org\//, '').replace(/\/$/, '');
}

function cleanPmid(value) {
    const text = String(value || '').trim();
    const match = text.match(/(?:pubmed\.ncbi\.nlm\.nih\.gov\/)?(\d{6,9})/i);
    return match ? match[1] : '';
}

function identifiersFromUrl(value) {
    const url = String(value || '').trim();
    const pmid = cleanPmid(url);
    const doiMatch = url.match(/10\.\d{4,9}\/[^?#\s]+/i);
    return { url, pmid, doi: doiMatch ? cleanDoi(doiMatch[0]) : '' };
}

function normalizeEvidenceText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function createIdentifierIndex() {
    return {
        documentIds: new Set(), guidelineIds: new Set(), pmids: new Set(),
        dois: new Set(), urls: new Set(),
    };
}

function addRowIdentifiers(index, row) {
    if (row.document_id != null) index.documentIds.add(String(row.document_id));
    if (row.guideline_id != null) index.guidelineIds.add(String(row.guideline_id));
    const pmid = cleanPmid(row.pmid);
    const doi = cleanDoi(row.doi);
    if (pmid) index.pmids.add(pmid);
    if (doi) index.dois.add(doi);
    if (row.source_url) index.urls.add(String(row.source_url).trim());
}

async function loadStoredFullTextEvidenceIndex(db) {
    const rows = await db.all(
        `SELECT gd.id AS document_id, gd.pmid, gd.doi, gd.source_url,
                gd.full_text, gd.full_text_source, tg.id AS guideline_id
         FROM guideline_documents gd
         LEFT JOIN topic_guidelines tg ON tg.document_id = gd.id
         WHERE length(trim(COALESCE(gd.full_text, ''))) >= 500
           AND COALESCE(gd.full_text_source, '') NOT IN ('abstract', 'bibliographic_abstract')`
    );
    const index = createIdentifierIndex();
    index.recoveredDocuments = new Map();
    for (const row of rows || []) {
        const recovered = String(row.full_text_source || '').includes('recovered');
        if (!recovered) {
            addRowIdentifiers(index, row);
            continue;
        }
        const key = String(row.document_id);
        const document = index.recoveredDocuments.get(key) || {
            identifiers: createIdentifierIndex(),
            fullText: String(row.full_text || ''),
        };
        addRowIdentifiers(document.identifiers, row);
        index.recoveredDocuments.set(key, document);
    }
    return index;
}

function referenceMatchesStoredFullText(reference, index) {
    if (!reference || typeof reference !== 'object') return false;
    if (reference.documentId != null && index.documentIds.has(String(reference.documentId))) return true;
    if (reference.guidelineId != null && index.guidelineIds.has(String(reference.guidelineId))) return true;
    const pmid = cleanPmid(reference.pmid);
    const doi = cleanDoi(reference.doi);
    if (pmid && index.pmids.has(pmid)) return true;
    if (doi && index.dois.has(doi)) return true;
    for (const value of [reference.sourceUrl, reference.url]) {
        const ids = identifiersFromUrl(value);
        if ((ids.url && index.urls.has(ids.url)) || (ids.pmid && index.pmids.has(ids.pmid))
            || (ids.doi && index.dois.has(ids.doi))) return true;
    }
    return false;
}

function matchingRecoveredDocuments(reference, index) {
    const matches = [];
    for (const document of index?.recoveredDocuments?.values?.() || []) {
        if (referenceMatchesStoredFullText(reference, document.identifiers)) matches.push(document);
    }
    return matches;
}

function recoveredDocumentHasExactAnchor(question, document) {
    const anchors = Array.isArray(question?.evidenceAnchors) ? question.evidenceAnchors : [];
    const text = normalizeEvidenceText(document.fullText);
    return anchors.some((anchor) => {
        if (!referenceMatchesStoredFullText(anchor, document.identifiers)) return false;
        const rawQuote = anchor.exactQuote || anchor.quote || anchor.inferredStatement || '';
        const quote = normalizeEvidenceText(rawQuote);
        if (quote.length >= 35 && text.includes(quote)) return true;
        return textProvidesSameInformation(rawQuote, document.fullText).ok;
    });
}

function mcqMatchesStoredFullText(question, index) {
    const recoveryStatus = String(
        question?.evidenceRecovery?.status || question?.evidenceRecoveryStatus || '',
    ).trim().toLowerCase();
    if (recoveryStatus && recoveryStatus !== 'verified') return false;
    const refs = Array.isArray(question?.sourceRefs) ? question.sourceRefs : [];
    if (refs.some((ref) => referenceMatchesStoredFullText(ref, index))) return true;
    if (referenceMatchesStoredFullText(question, index)) return true;
    const uid = String(question?.sourceArticleUid || question?.articleUid || '').trim();
    if (/^pmid:/i.test(uid) && index.pmids.has(cleanPmid(uid))) return true;
    if (/^doi:/i.test(uid) && index.dois.has(cleanDoi(uid.replace(/^doi:/i, '')))) return true;

    const recovered = refs.flatMap((ref) => matchingRecoveredDocuments(ref, index));
    recovered.push(...matchingRecoveredDocuments(question, index));
    if (/^pmid:/i.test(uid)) recovered.push(...matchingRecoveredDocuments({ pmid: uid }, index));
    if (/^doi:/i.test(uid)) recovered.push(...matchingRecoveredDocuments({ doi: uid.replace(/^doi:/i, '') }, index));
    return recovered.some((document) => recoveryStatus === 'verified' || recoveredDocumentHasExactAnchor(question, document));
}

/**
 * The gate is switched on with MCQ_EVIDENCE_GATE=on. Until reviewed, evidence-locked MCQs are
 * loaded, production holds only 'unreviewed' questions and the gate would serve none of them.
 */
function evidenceGateEnabled(env = process.env) {
    return String(env.MCQ_EVIDENCE_GATE || '').trim().toLowerCase() === 'on';
}

/** SQL fragment restricting teaching_objects.review_state for served MCQs. */
function servableReviewStateSql(env = process.env) {
    return evidenceGateEnabled(env)
        ? "review_state IN ('approved', 'verified', 'human_reviewed')"
        : "review_state != 'withdrawn'";
}

/** Loads the full-text index only when the gate is on; null means "do not filter". */
async function loadEvidenceIndexIfEnabled(db, env = process.env) {
    return evidenceGateEnabled(env) ? loadStoredFullTextEvidenceIndex(db) : null;
}

/** True when the question may be served: always when the gate is off. */
function passesEvidenceGate(question, index) {
    return index == null ? true : mcqMatchesStoredFullText(question, index);
}

module.exports = {
    evidenceGateEnabled,
    servableReviewStateSql,
    loadEvidenceIndexIfEnabled,
    passesEvidenceGate,
    cleanDoi,
    cleanPmid,
    loadStoredFullTextEvidenceIndex,
    mcqMatchesStoredFullText,
    normalizeEvidenceText,
    referenceMatchesStoredFullText,
    recoveredDocumentHasExactAnchor,
};
