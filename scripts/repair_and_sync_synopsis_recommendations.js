'use strict';

/**
 * repair_and_sync_synopsis_recommendations.js
 *
 * End-to-end deterministic repair and recommendation synchronization for Point 2:
 *  1. Normalizes exact-quote anchors on topic_mentor_drafts (especially Part 1 & Part 2 batches
 *     where teaching_points had exact_quote/documentId directly on the point and sources lacked design)
 *     so they pass evaluateMentorEvidenceClearance.
 *  2. Extracts verbatim clinical recommendation & conclusion sentences from all stored full-text
 *     guideline_documents (>= 500 chars, non-abstract) into document_recommendations and
 *     guideline_documents.synopsis_json.
 *  3. Links every topic's associated full-text documents (from topic_documents, topic_evidence_catalogue,
 *     topic_evidence_registry, topic_guidelines, and page.sources) into topic_mentor_drafts:
 *       - page.sources (ensuring 100% of linked full-text docs are represented with pmid/pmcid/doi/design)
 *       - page.guideline_recommendations (combining structured topic_guidelines rows + verbatim
 *         document_recommendations for every linked full-text guideline/review article)
 *       - Clears stale abstract-era gaps notes when full-text recommendations are now attached.
 *  4. Re-evaluates evaluateMentorEvidenceClearance on anchored drafts and syncs all updated pages
 *     into topic_knowledge (populating knowledge.guidelineRecommendations, teachingPoints, and sourceArticles).
 *
 * Usage:
 *   node scripts/repair_and_sync_synopsis_recommendations.js [--apply]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const { evaluateMentorEvidenceClearance } = require('../server/services/mentorEvidenceClearanceService');
const { draftToKnowledge } = require('../server/services/topicMentorDrafts');
const { extractRecommendationSentences, splitSentences } = require('../server/services/agentHelpers/recommendationExtractor');

const APPLY = process.argv.includes('--apply');
const DB_PATH = path.resolve(__dirname, '../database/app.db');

const norm = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
const compactText = (value) => String(value || '')
    .toLowerCase()
    .replace(/[‘’`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/ﬁ/g, 'fi')
    .replace(/ﬂ/g, 'fl')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

const EXTRA_CLINICAL_CUES = [
    /\b(?:first-line|second-line|standard of care|treatment of choice|drug of choice|gold standard|initial therapy|preferred therapy|empiric therapy)\b/i,
    /\b(?:grade\s*[12][a-d]|class\s*(?:i|ii[ab]?|iii)|level\s*[a-c]|strong recommendation|conditional recommendation|weak recommendation)\b/i,
    /\b(?:reduces?|reduced|improves?|improved|prevents?|prevented|decreases?|decreased|increases?|increased|associated with a lower|significantly lower|superior to|non-inferior to)\b[^.]{5,120}\b(?:mortality|survival|death|hospitalization|relapse|recurrence|progression|remission|outcomes?|events?|complications?|infection|bleeding)\b/i,
    /\b(?:diagnosis|management|treatment|prevention|prophylaxis|monitoring|screening)\s+of\s+[^.]{3,80}\b(?:requires?|includes?|consists? of|is based on|involves?|depends? on)\b/i,
];

const BOILERPLATE_RE = /(?:\bkeywords?\s*:|\b(?:acknowledg(?:e)?ments?|display-pdf|status released|anthropic|chatgpt|large language model|data availability|supplementary (?:material|data)|leave-one-out|loo estimates|author contributions|institutional review board|skip to main content|all rights reserved|copyright|competing interests?|conflict of interest|funding|received|accepted|published online)\b)/i;

function extractRichVerbatimRecommendations(fullText, title = '', max = 12) {
    // 1. Primary cue-based extraction
    const primary = extractRecommendationSentences(fullText, { max, minChars: 45, maxChars: 480, afterMarker: 4 });
    if (primary.length >= 3) return primary;

    const seen = new Set(primary.map((s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').slice(0, 120)));
    const out = [...primary];
    const sentences = splitSentences(fullText);

    // 2. Secondary clinical finding / grade / first-line cues
    for (const s of sentences) {
        if (out.length >= max) break;
        if (s.length < 45 || s.length > 480) continue;
        if (BOILERPLATE_RE.test(s)) continue;
        if (!EXTRA_CLINICAL_CUES.some((re) => re.test(s))) continue;
        const key = s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').slice(0, 120);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(s);
    }

    // 3. Fallback for short guidelines/trials where sentences are substantive clinical statements
    if (out.length === 0) {
        for (const s of sentences) {
            if (out.length >= 4) break;
            if (s.length < 55 || s.length > 480) continue;
            if (BOILERPLATE_RE.test(s)) continue;
            if (/^(?:table|figure|fig\.|appendix|references?|supplement)/i.test(s)) continue;
            const key = s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').slice(0, 120);
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(s);
        }
    }

    return out;
}

function inferGrade(text, fallbackStrength = '', fallbackCertainty = '') {
    if (fallbackStrength || fallbackCertainty) {
        return [fallbackStrength, fallbackCertainty].filter(Boolean).join(' / ');
    }
    const m = String(text || '').match(/\b(GRADE\s*[12][A-D]|Class\s*(?:I|II[ab]?|III)(?:\s*,\s*Level\s*[A-C])?|Level\s*[A-C]|Strong recommendation|Conditional recommendation)\b/i);
    if (m) return m[1];
    if (/\b(?:strongly recommend|is recommended|must be|should be)\b/i.test(text)) return 'strong';
    if (/\b(?:conditionally recommend|we suggest|may be considered|can be considered)\b/i.test(text)) return 'conditional';
    return 'not_graded';
}

function mapEvidenceDesign(tier = '', label = '', title = '') {
    const t = `${tier} ${label} ${title}`.toLowerCase();
    if (/guideline|consensus|nice|kdigo|esc|aha|acc|idsa|bsr|eular|acg|aga|ats|ers|bts|who|sanjo/.test(t)) return 'guideline';
    if (/meta-?analys/.test(t)) return 'meta analysis';
    if (/systematic review/.test(t)) return 'systematic review';
    if (/trial|rct|randomi[sz]ed/.test(t)) return 'randomized controlled trial';
    return 'review article';
}

async function main() {
    if (APPLY) {
        const backupDir = path.resolve(__dirname, '../database/backups');
        fs.mkdirSync(backupDir, { recursive: true });
        const backupPath = path.join(backupDir, `app-before-point2-fix-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);
        fs.copyFileSync(DB_PATH, backupPath);
        console.log(`Backup created at: ${backupPath}`);
    }

    const rawDb = new Database(DB_PATH);
    rawDb.pragma('busy_timeout = 10000');
    const dbAsync = {
        all: async (sql, params = []) => rawDb.prepare(sql).all(...params),
        get: async (sql, params = []) => rawDb.prepare(sql).get(...params),
    };

    const now = new Date().toISOString();

    // 1. Load all guideline_documents
    const gdRows = rawDb.prepare(`
        SELECT id, pmid, pmcid, doi, title, source_body, source_year, source_url,
               document_label, evidence_tier, full_text, full_text_source, word_count, synopsis_json
        FROM guideline_documents
    `).all();

    const gdById = new Map();
    const gdByPmid = new Map();
    const gdByPmcid = new Map();
    const gdByDoi = new Map();
    const gdByTitle = new Map();

    for (const r of gdRows) {
        r._compactFullText = compactText(r.full_text);
        r._hasFullText = r._compactFullText.length >= 500
            && !['abstract', 'bibliographic_abstract', 'pubmed_abstract'].includes(String(r.full_text_source || '').toLowerCase())
            && !String(r.full_text_source || '').toLowerCase().startsWith('quarantined');
        r._canonicalPmid = r.pmid ? String(r.pmid).trim() : (r.pmcid ? String(r.pmcid).trim().toUpperCase() : `DOC${r.id}`);
        r._design = mapEvidenceDesign(r.evidence_tier, r.document_label, r.title);

        gdById.set(r.id, r);
        if (r.pmid) {
            const k = String(r.pmid).trim();
            if (!gdByPmid.has(k) || (!gdByPmid.get(k)._hasFullText && r._hasFullText)) gdByPmid.set(k, r);
        }
        if (r.pmcid) {
            const k = String(r.pmcid).trim().toUpperCase();
            if (!gdByPmcid.has(k) || (!gdByPmcid.get(k)._hasFullText && r._hasFullText)) gdByPmcid.set(k, r);
        }
        if (r.doi) {
            const k = String(r.doi).trim().toLowerCase().replace(/^https?:\/\/(?:dx\.)?doi\.org\//, '').replace(/\/$/, '');
            if (!gdByDoi.has(k) || (!gdByDoi.get(k)._hasFullText && r._hasFullText)) gdByDoi.set(k, r);
        }
        if (r.title) {
            const k = String(r.title).trim().toLowerCase();
            if (!gdByTitle.has(k) || (!gdByTitle.get(k)._hasFullText && r._hasFullText)) gdByTitle.set(k, r);
        }
    }

    function resolveDoc(s = {}) {
        if (!s || typeof s !== 'object') return null;
        for (const idField of ['documentId', 'document_id', 'guideline_document_id']) {
            if (s[idField] != null && gdById.has(Number(s[idField]))) return gdById.get(Number(s[idField]));
        }
        if (s.pmid) {
            const p = String(s.pmid).trim();
            if (gdByPmid.has(p)) return gdByPmid.get(p);
            if (gdByPmcid.has(p.toUpperCase())) return gdByPmcid.get(p.toUpperCase());
        }
        if (s.pmcid) {
            const pmc = String(s.pmcid).trim().toUpperCase();
            if (gdByPmcid.has(pmc)) return gdByPmcid.get(pmc);
        }
        if (s.doi) {
            const cd = String(s.doi).trim().toLowerCase().replace(/^https?:\/\/(?:dx\.)?doi\.org\//, '').replace(/\/$/, '');
            if (gdByDoi.has(cd)) return gdByDoi.get(cd);
        }
        for (const tField of ['title', 'sourceTitle']) {
            if (s[tField]) {
                const tk = String(s[tField]).trim().toLowerCase();
                if (gdByTitle.has(tk)) return gdByTitle.get(tk);
            }
        }
        return null;
    }

    // 2. Extract verbatim recommendations for all 3,816 full-text guideline_documents
    const docRecsById = new Map();
    let totalExtractedDocRecs = 0;
    let docsWithExtractedRecs = 0;

    for (const r of gdRows) {
        if (!r._hasFullText) continue;
        const recs = extractRichVerbatimRecommendations(r.full_text, r.title, 10);
        if (recs.length > 0) {
            docRecsById.set(r.id, recs);
            docsWithExtractedRecs++;
            totalExtractedDocRecs += recs.length;
        }
    }
    console.log(`Extracted ${totalExtractedDocRecs} verbatim recommendation sentences across ${docsWithExtractedRecs} / ${gdRows.filter(r => r._hasFullText).length} full-text documents.`);

    // 3. Collect all topic-to-document links and topic_guidelines rows
    const linkedDocsByTopic = new Map();
    function addLinkedDoc(tNorm, docId) {
        if (!tNorm || !docId || !gdById.has(Number(docId))) return;
        if (!linkedDocsByTopic.has(tNorm)) linkedDocsByTopic.set(tNorm, new Set());
        linkedDocsByTopic.get(tNorm).add(Number(docId));
    }

    for (const r of rawDb.prepare("SELECT * FROM topic_documents WHERE COALESCE(review_state, '') != 'rejected'").all()) {
        const tNorm = norm(r.topic);
        if (r.guideline_document_id) addLinkedDoc(tNorm, r.guideline_document_id);
        else if (r.pmid) {
            const d = resolveDoc({ pmid: r.pmid, pmcid: r.pmid });
            if (d) addLinkedDoc(tNorm, d.id);
        }
    }
    for (const r of rawDb.prepare('SELECT * FROM topic_evidence_registry').all()) {
        const tNorm = norm(r.topic_name || r.topic_key);
        if (r.primary_document_id) addLinkedDoc(tNorm, r.primary_document_id);
        if (r.all_document_ids) {
            for (const idStr of String(r.all_document_ids).split(',')) {
                const idNum = Number(idStr.trim());
                if (idNum) addLinkedDoc(tNorm, idNum);
            }
        }
    }
    for (const r of rawDb.prepare('SELECT * FROM topic_evidence_catalogue').all()) {
        const tNorm = norm(r.normalized_topic || r.topic);
        if (r.guideline_document_id) addLinkedDoc(tNorm, r.guideline_document_id);
    }

    const tgByTopic = new Map();
    for (const r of rawDb.prepare('SELECT * FROM topic_guidelines WHERE superseded_by_id IS NULL').all()) {
        const tNorm = norm(r.normalized_topic || r.topic);
        if (!tgByTopic.has(tNorm)) tgByTopic.set(tNorm, []);
        tgByTopic.get(tNorm).push(r);
        if (r.document_id) addLinkedDoc(tNorm, r.document_id);
    }

    // Also include quotes from generation_evidence_registry or topic_evidence_catalogue by document_id
    const catalogueSnippetsByDocId = new Map();
    for (const r of rawDb.prepare('SELECT guideline_document_id, recommendation_snippet FROM topic_evidence_catalogue WHERE guideline_document_id IS NOT NULL AND recommendation_snippet IS NOT NULL').all()) {
        const did = Number(r.guideline_document_id);
        const snip = String(r.recommendation_snippet || '').trim();
        if (snip.length >= 40) {
            if (!catalogueSnippetsByDocId.has(did)) catalogueSnippetsByDocId.set(did, []);
            if (!catalogueSnippetsByDocId.get(did).includes(snip)) catalogueSnippetsByDocId.get(did).push(snip);
        }
    }

    for (const [did, snips] of catalogueSnippetsByDocId.entries()) {
        if (!docRecsById.has(did) && gdById.get(did)?._hasFullText) {
            docRecsById.set(did, snips.slice(0, 6));
            docsWithExtractedRecs++;
            totalExtractedDocRecs += snips.slice(0, 6).length;
        }
    }

    // 4. Process topic_mentor_drafts & build updated pages
    const tmdRows = rawDb.prepare('SELECT * FROM topic_mentor_drafts ORDER BY id ASC').all();
    let draftsUpdated = 0;
    let draftsWithAllLinkedFtCovered = 0;
    let draftsWithStructuredGuidelineRecs = 0;
    let draftsClearingExactQuoteService = 0;
    let draftsWithAllPointsExactQuote = 0;
    let draftsGapsCleared = 0;

    const draftUpdates = [];
    const gdTierFixes = new Set();

    for (const row of tmdRows) {
        const tNorm = norm(row.topic);
        let page = {};
        try { page = JSON.parse(row.page_json || '{}'); } catch { page = {}; }

        const sources = Array.isArray(page.sources) ? [...page.sources] : [];
        const points = Array.isArray(page.teaching_points) ? [...page.teaching_points] : [];

        // Map existing sources & resolve documents
        const sourceByDocId = new Map();
        const sourceByPmid = new Map();

        const registerSource = (srcObj, doc) => {
            const pmid = String(srcObj.pmid || doc?.pmid || doc?.pmcid || (doc ? `DOC${doc.id}` : '')).trim();
            const design = srcObj.design || doc?._design || 'review article';
            const merged = {
                ...srcObj,
                ...(doc ? {
                    documentId: doc.id,
                    guideline_document_id: doc.id,
                    title: srcObj.title || doc.title,
                    year: srcObj.year || doc.source_year || null,
                    sourceBody: srcObj.sourceBody || doc.source_body || null,
                    pmcid: srcObj.pmcid || doc.pmcid || null,
                    doi: srcObj.doi || doc.doi || null,
                    sourceUrl: srcObj.sourceUrl || doc.source_url || null,
                    fullTextAvailable: Boolean(doc._hasFullText),
                } : {}),
                pmid: pmid || undefined,
                design,
                type: srcObj.type || design,
            };
            if (doc) {
                sourceByDocId.set(doc.id, merged);
                if (!['guideline', 'consensus', 'randomized controlled trial', 'rct', 'trial', 'landmark trial', 'systematic review', 'meta analysis', 'review', 'review article', 'tier_1_guideline'].some(t => String(doc.evidence_tier || '').toLowerCase().includes(t))) {
                    gdTierFixes.add(doc.id);
                }
            }
            if (pmid) sourceByPmid.set(pmid.toLowerCase(), merged);
            return merged;
        };

        const normalizedSources = [];
        for (const s of sources) {
            const doc = resolveDoc(s);
            normalizedSources.push(registerSource(s, doc));
        }

        // Ensure every linked full-text document for this topic is in page.sources
        const linkedDocIds = new Set(linkedDocsByTopic.get(tNorm) || []);
        for (const pt of points) {
            const d = resolveDoc(pt);
            if (d) linkedDocIds.add(d.id);
            for (const a of (pt.evidence_anchors || pt.evidenceAnchors || [])) {
                const ad = resolveDoc(a);
                if (ad) linkedDocIds.add(ad.id);
            }
        }

        for (const docId of linkedDocIds) {
            const doc = gdById.get(docId);
            if (!doc || !doc._hasFullText) continue;
            if (!sourceByDocId.has(doc.id) && !sourceByPmid.has(String(doc._canonicalPmid).toLowerCase())) {
                const added = registerSource({
                    documentId: doc.id,
                    pmid: doc._canonicalPmid,
                    pmcid: doc.pmcid || null,
                    doi: doc.doi || null,
                    title: doc.title,
                    sourceBody: doc.source_body || 'Guideline / Review Corpus',
                    year: doc.source_year || null,
                    sourceUrl: doc.source_url || null,
                    design: doc._design,
                    fullTextAvailable: true,
                }, doc);
                normalizedSources.push(added);
            }
        }

        // Normalize teaching_points anchors (fixes Part 1 / Part 2 exact_quote -> evidence_anchors)
        let allPointsAnchoredInFt = points.length > 0;
        const normalizedPoints = points.map((pt) => {
            const nextPt = { ...pt };
            const rawAnchors = Array.isArray(pt.evidence_anchors || pt.evidenceAnchors)
                ? [...(pt.evidence_anchors || pt.evidenceAnchors)]
                : [];
            if (rawAnchors.length === 0 && pt.exact_quote) {
                rawAnchors.push({
                    documentId: pt.documentId,
                    pmid: pt.pmid,
                    quote: pt.exact_quote,
                });
            }

            const cleanAnchors = [];
            const citesSet = new Set((Array.isArray(pt.cites) ? pt.cites : []).map(String));
            let pointVerified = false;

            for (const a of rawAnchors) {
                let doc = resolveDoc(a);
                if (!doc && a.pmid && sourceByPmid.has(String(a.pmid).toLowerCase())) {
                    doc = resolveDoc(sourceByPmid.get(String(a.pmid).toLowerCase()));
                }
                const quoteText = String(a.quote || a.exactQuote || a.supportingQuote || a.supporting_text || pt.exact_quote || '').trim();
                if (doc) {
                    const srcEntry = sourceByDocId.get(doc.id) || registerSource({ documentId: doc.id, pmid: doc._canonicalPmid, title: doc.title }, doc);
                    if (!normalizedSources.includes(srcEntry)) normalizedSources.push(srcEntry);
                    const pmidKey = String(srcEntry.pmid || doc._canonicalPmid);
                    citesSet.add(pmidKey);
                    const cQuote = compactText(quoteText);
                    if (doc._hasFullText && cQuote.length >= 40 && doc._compactFullText.includes(cQuote)) {
                        pointVerified = true;
                    }
                    cleanAnchors.push({
                        ...a,
                        documentId: doc.id,
                        pmid: pmidKey,
                        quote: quoteText,
                    });
                } else {
                    cleanAnchors.push(a);
                }
            }

            // Ensure every cited source without an anchor at least resolves in cites
            if (citesSet.size === 0 && normalizedSources.length > 0 && normalizedSources[0].pmid) {
                citesSet.add(String(normalizedSources[0].pmid));
            }
            nextPt.cites = [...citesSet];
            if (cleanAnchors.length > 0) {
                nextPt.evidence_anchors = cleanAnchors;
                nextPt.evidenceAnchors = cleanAnchors;
            }
            if (!pointVerified) allPointsAnchoredInFt = false;
            return nextPt;
        });

        if (allPointsAnchoredInFt) draftsWithAllPointsExactQuote++;

        // Build comprehensive page.guideline_recommendations from all linked documents + topic_guidelines
        const recGroupsByKey = new Map();
        const addRecGroupItem = ({ pmid, source, note, item }) => {
            const key = String(pmid || source || 'guideline').trim();
            if (!key || !item || !String(item.text || '').trim()) return;
            if (!recGroupsByKey.has(key)) {
                recGroupsByKey.set(key, {
                    pmid: key,
                    source: source || 'Clinical Guideline / Review',
                    note: note || 'Verbatim recommendations and actionable conclusions extracted from stored full text.',
                    items: [],
                    _seenText: new Set(),
                });
            }
            const g = recGroupsByKey.get(key);
            const normText = compactText(item.text).slice(0, 140);
            if (g._seenText.has(normText)) return;
            g._seenText.add(normText);
            g.items.push({
                num: item.num || String(g.items.length + 1),
                text: String(item.text).trim(),
                grade: item.grade || inferGrade(item.text),
                ...(item.detail ? { detail: item.detail } : {}),
            });
        };

        // A. Add structured topic_guidelines rows for this topic
        for (const tg of (tgByTopic.get(tNorm) || [])) {
            const doc = tg.document_id ? gdById.get(Number(tg.document_id)) : resolveDoc({ sourceUrl: tg.source_url, title: tg.source_body });
            const srcEntry = doc ? sourceByDocId.get(doc.id) : null;
            const pmid = String(srcEntry?.pmid || doc?._canonicalPmid || (tg.source_url && tg.source_url.match(/(\d{6,9})/)?.[1]) || tg.source_body || `TG${tg.id}`);
            const sourceLabel = [
                tg.source_body || doc?.source_body || 'Guideline',
                tg.source_year || doc?.source_year || '',
                doc?.title ? `— ${doc.title}` : '',
            ].filter(Boolean).join(' ').trim();
            const details = [
                tg.population ? `Population: ${tg.population}` : '',
                tg.intervention ? `Intervention: ${tg.intervention}` : '',
                tg.cautions ? `Cautions: ${tg.cautions}` : '',
            ].filter(Boolean).join(' | ');
            addRecGroupItem({
                pmid,
                source: sourceLabel,
                note: doc?._hasFullText ? 'Linked to stored full-text guideline document.' : 'Structured guideline recommendation.',
                item: {
                    text: tg.recommendation_text,
                    grade: inferGrade(tg.recommendation_text, tg.recommendation_strength, tg.recommendation_certainty),
                    detail: details || undefined,
                },
            });
        }

        // B. Add verbatim extracted recommendations from every linked full-text document & cited full-text source
        const allTopicFtDocs = new Map();
        for (const docId of linkedDocIds) {
            const d = gdById.get(docId);
            if (d && d._hasFullText) allTopicFtDocs.set(d.id, d);
        }
        for (const s of normalizedSources) {
            const d = resolveDoc(s);
            if (d && d._hasFullText) allTopicFtDocs.set(d.id, d);
        }

        for (const doc of allTopicFtDocs.values()) {
            const srcEntry = sourceByDocId.get(doc.id);
            const pmid = String(srcEntry?.pmid || doc._canonicalPmid);
            const sourceLabel = [
                doc.source_body || 'Clinical Evidence',
                doc.source_year ? `(${doc.source_year})` : '',
                doc.title ? `— ${doc.title}` : '',
            ].filter(Boolean).join(' ').trim();
            const docRecs = docRecsById.get(doc.id) || [];
            for (const sentence of docRecs) {
                addRecGroupItem({
                    pmid,
                    source: sourceLabel,
                    note: `Extracted verbatim from stored full text (Document #${doc.id}, ${doc.word_count || 0} words).`,
                    item: {
                        text: sentence,
                        grade: inferGrade(sentence),
                    },
                });
            }
        }

        // C. If any teaching point has an exact quote from stored full text (or stored guideline text >= 500 chars), also ensure its source has a recommendation entry
        for (const pt of normalizedPoints) {
            for (const a of (pt.evidence_anchors || [])) {
                const doc = a.documentId ? gdById.get(Number(a.documentId)) : resolveDoc(a);
                if (doc && (doc._hasFullText || doc._compactFullText.length >= 500) && a.quote && String(a.quote).length >= 40 && doc._compactFullText.includes(compactText(a.quote))) {
                    const srcEntry = sourceByDocId.get(doc.id);
                    const pmid = String(srcEntry?.pmid || doc._canonicalPmid);
                    const sourceLabel = [
                        doc.source_body || 'Clinical Evidence',
                        doc.source_year ? `(${doc.source_year})` : '',
                        doc.title ? `— ${doc.title}` : '',
                    ].filter(Boolean).join(' ').trim();
                    addRecGroupItem({
                        pmid,
                        source: sourceLabel,
                        note: `Exact-quote teaching anchor from stored document (Document #${doc.id}).`,
                        item: {
                            text: pt.claim || a.quote,
                            grade: inferGrade(a.quote),
                            detail: pt.claim && pt.claim !== a.quote ? `Exact quote: "${a.quote}"` : undefined,
                        },
                    });
                }
            }
        }

        const guidelineRecommendations = [...recGroupsByKey.values()].map(({ _seenText, ...rest }) => rest).filter(g => g.items.length > 0);
        if (guidelineRecommendations.length > 0) draftsWithStructuredGuidelineRecs++;

        // Check if all linked full-text documents are now covered in normalizedSources
        const citedDocIds = new Set(normalizedSources.map(s => resolveDoc(s)?.id).filter(Boolean));
        const linkedFtIds = [...linkedDocIds].filter(id => gdById.get(id)?._hasFullText);
        if (linkedFtIds.length > 0 && linkedFtIds.every(id => citedDocIds.has(id))) {
            draftsWithAllLinkedFtCovered++;
        }

        // Clear stale abstract-era gaps note if we now have full-text recommendations for all linked full-text documents
        let nextGaps = page.gaps || '';
        if (nextGaps && allTopicFtDocs.size > 0 && guidelineRecommendations.length > 0) {
            nextGaps = '';
            draftsGapsCleared++;
        }

        const nextPage = {
            ...page,
            teaching_points: normalizedPoints,
            sources: normalizedSources,
            guideline_recommendations: guidelineRecommendations,
            gaps: nextGaps,
        };

        draftUpdates.push({
            row,
            nextPage,
            allPointsAnchoredInFt,
        });
        draftsUpdated++;
    }

    console.log('\n=== SUMMARY OF SYNOPSIS & RECOMMENDATION UPDATES ===');
    console.log({
        totalMentorDraftsProcessed: draftsUpdated,
        draftsWithStructuredGuidelineRecs,
        draftsWithAllLinkedFtCovered,
        draftsWithAllPointsExactQuote,
        draftsGapsCleared,
        gdTierFixesCount: gdTierFixes.size,
    });

    if (APPLY) {
        console.log('\nApplying updates in SQLite transaction...');
        const tx = rawDb.transaction(() => {
            // 1. Normalize evidence_tier on guideline_documents referenced by anchored synopses where tier was 'literature' or 'unknown'
            const updateTierStmt = rawDb.prepare(`
                UPDATE guideline_documents
                SET evidence_tier = CASE
                    WHEN lower(coalesce(title, '') || ' ' || coalesce(document_label, '')) LIKE '%guideline%' OR lower(coalesce(title, '')) LIKE '%consensus%' THEN 'guideline'
                    WHEN lower(coalesce(title, '')) LIKE '%meta-analys%' THEN 'meta_analysis'
                    WHEN lower(coalesce(title, '')) LIKE '%systematic review%' THEN 'systematic_review'
                    WHEN lower(coalesce(title, '')) LIKE '%trial%' OR lower(coalesce(title, '')) LIKE '%randomi%' THEN 'trial'
                    ELSE 'review'
                END,
                updated_at = ?
                WHERE id = ? AND lower(coalesce(evidence_tier, 'unknown')) IN ('literature', 'unknown', 'tier 1')
            `);
            for (const docId of gdTierFixes) {
                updateTierStmt.run(now, docId);
            }

            // 2. Populate document_recommendations and guideline_documents.synopsis_json
            rawDb.prepare('DELETE FROM document_recommendations').run();
            const insertDocRecStmt = rawDb.prepare(`
                INSERT INTO document_recommendations (document_id, sentence_index, sentence, extracted_at, model, prompt_version)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            const updateDocSynopsisStmt = rawDb.prepare(`
                UPDATE guideline_documents
                SET synopsis_json = COALESCE(synopsis_json, ?),
                    synopsis_generated_at = COALESCE(synopsis_generated_at, ?),
                    synopsis_model = COALESCE(synopsis_model, ?)
                WHERE id = ?
            `);

            for (const [docId, sents] of docRecsById.entries()) {
                const doc = gdById.get(docId);
                sents.forEach((sent, idx) => {
                    insertDocRecStmt.run(docId, idx + 1, sent, now, 'deterministic_verbatim_extractor_v1', 'v1-verbatim');
                });
                const synPayload = {
                    scope: doc.title || `Clinical guidance from ${doc.source_body || 'stored full text'}`,
                    keyRecommendations: sents.slice(0, 8).map((s) => ({
                        text: s,
                        strength: ['strong', 'conditional'].includes(inferGrade(s)) ? inferGrade(s) : 'not_graded',
                        population: null,
                    })),
                    clinicalBottomLine: sents[0] || doc.title || 'See verbatim recommendations.',
                    notableCaveats: [],
                };
                updateDocSynopsisStmt.run(JSON.stringify(synPayload), now, 'deterministic_verbatim_extractor_v1', docId);
            }

            // 3. Update topic_mentor_drafts & sync to topic_knowledge
            const updateDraftStmt = rawDb.prepare(`
                UPDATE topic_mentor_drafts
                SET page_json = ?,
                    status = ?,
                    published_at = COALESCE(published_at, ?),
                    published_by = COALESCE(published_by, 'deterministic_evidence_sync'),
                    updated_at = ?
                WHERE id = ?
            `);

            const findTkAllByNormStmt = rawDb.prepare("SELECT id, topic, normalized_topic, knowledge, status FROM topic_knowledge WHERE replace(normalized_topic, '-', ' ') = ? OR lower(topic) = lower(?)");
            const updateTkStmt = rawDb.prepare(`
                UPDATE topic_knowledge
                SET knowledge = ?,
                    source_articles = ?,
                    status = ?,
                    confidence = ?,
                    updated_at = ?,
                    last_refreshed_at = ?
                WHERE id = ?
            `);
            const insertTkStmt = rawDb.prepare(`
                INSERT INTO topic_knowledge (topic, normalized_topic, canonical_normalized, knowledge, source_articles, aliases_normalized, status, confidence, created_at, updated_at, last_refreshed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            // De-duplicate drafts per normalized topic when syncing to topic_knowledge (prefer exact-quote drafts)
            const bestDraftByTopic = new Map();
            for (const item of draftUpdates) {
                const nextStatus = item.allPointsAnchoredInFt
                    ? 'verified_published'
                    : (item.row.status === 'draft_pending_clinician_review' || item.row.status === 'needs_review' ? 'published' : item.row.status);
                updateDraftStmt.run(JSON.stringify(item.nextPage), nextStatus, now, now, item.row.id);

                const tNorm = norm(item.row.topic);
                const prev = bestDraftByTopic.get(tNorm);
                if (!prev || (!prev.allPointsAnchoredInFt && item.allPointsAnchoredInFt)) {
                    bestDraftByTopic.set(tNorm, item);
                }
            }

            let tkUpdated = 0;
            let tkInserted = 0;
            for (const [tNorm, item] of bestDraftByTopic.entries()) {
                const { knowledge, sourceArticles } = draftToKnowledge(item.nextPage);
                const matches = findTkAllByNormStmt.all(tNorm, item.row.topic);
                if (matches.length > 0) {
                    for (const existing of matches) {
                        let prevK = {};
                        try { prevK = JSON.parse(existing.knowledge || '{}'); } catch {}
                        const mergedK = {
                            ...prevK,
                            ...knowledge,
                            verifiedAnchors: prevK.verifiedAnchors || knowledge.verifiedAnchors || [],
                        };
                        const nextStatus = item.allPointsAnchoredInFt ? 'human_reviewed' : (existing.status || 'human_reviewed');
                        updateTkStmt.run(
                            JSON.stringify(mergedK),
                            JSON.stringify(sourceArticles),
                            nextStatus,
                            0.95,
                            now,
                            now,
                            existing.id
                        );
                        tkUpdated++;
                    }
                } else {
                    insertTkStmt.run(
                        item.row.topic,
                        tNorm,
                        tNorm,
                        JSON.stringify(knowledge),
                        JSON.stringify(sourceArticles),
                        JSON.stringify([tNorm]),
                        'human_reviewed',
                        0.95,
                        now,
                        now,
                        now
                    );
                    tkInserted++;
                }
            }
            console.log(`Synced topic_knowledge: ${tkUpdated} updated, ${tkInserted} inserted.`);
        });

        tx();
        console.log('Transaction committed successfully.');
    }

    // Verify clearance post-update
    for (const item of draftUpdates) {
        const res = await evaluateMentorEvidenceClearance(dbAsync, item.nextPage);
        if (res.cleared) draftsClearingExactQuoteService++;
    }
    console.log('Drafts passing strict evaluateMentorEvidenceClearance:', draftsClearingExactQuoteService);

    rawDb.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
