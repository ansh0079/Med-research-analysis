'use strict';

/**
 * Load an offline evidence-aligned batch (topic-alignment-batch-NN) into the app database as
 * REVIEW-PENDING content. Nothing is published and no MCQ reaches learners from this script.
 *
 *   python -I tools/evidence/prepare_batch_texts.py <batch dir>        # once per batch
 *   node scripts/load_aligned_batch.js --dir <batch dir> [--apply] [--trust-doc-ids] [--report out.json]
 *
 * What it does, per batch:
 *  1. Resolves every evidence anchor to a stored guideline_documents row whose full text contains
 *     the exact quote (whitespace-normalised, case-sensitive): by PMID, then PMCID, then — only with
 *     --trust-doc-ids, i.e. loading into the same database the batch was built from — by documentId.
 *  2. If no stored document holds the quote, ingests the batch's downloaded document
 *     (docs-to-load/<PMCID>.loadtext.txt, written by prepare_batch_texts.py) as a new
 *     guideline_documents row, and uses it only if the quote is in that text.
 *  3. Rewrites anchors to the resolved document ids and drops any synopsis point or MCQ whose quote
 *     cannot be found. A topic needs at least 3 points and 5 MCQs to be loaded at all.
 *  4. Writes mentor pages to topic_mentor_drafts with status needs_review (never published),
 *     MCQs through evidenceLockedMcqDraftService.storeVerifiedDraft (unreviewed drafts, which
 *     re-checks every quote), and topic-document links as unreviewed topic_documents rows.
 *
 * Dry run (the default) reports what would happen and writes nothing.
 */

const fs = require('fs');
const path = require('path');
const { loadEnv } = require('../config');
loadEnv();

const args = process.argv.slice(2);
const arg = (name, fallback = null) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const DIR = arg('--dir');
const APPLY = args.includes('--apply');
const TRUST_DOC_IDS = args.includes('--trust-doc-ids');
const REPORT = arg('--report');
const MIN_POINTS = Number(arg('--min-points', 3));
const MIN_MCQS = Number(arg('--min-mcqs', 5));

const normalizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ABSTRACT_SOURCES = new Set(['abstract', 'bibliographic_abstract', 'pubmed_abstract']);

function readJson(file, fallback) {
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
}

function cleanPmid(value) {
    const m = String(value || '').match(/^\s*(\d{6,9})\s*$/);
    return m ? m[1] : '';
}

function cleanPmcid(value) {
    const m = String(value || '').match(/PMC\d+/i);
    return m ? m[0].toUpperCase() : '';
}

function createDocumentResolver(db, batchDir, catalogue) {
    const textCache = new Map();      // guideline_documents.id -> normalised full text
    const ingested = new Map();       // PMCID -> new guideline_documents.id
    const pending = new Map();        // PMCID -> load text (dry run)
    const meta = new Map();
    for (const row of catalogue) {
        const key = cleanPmcid(row.pmcid) || cleanPmid(row.pmid);
        if (key && !meta.has(key)) meta.set(key, row);
    }
    const stats = { byPmid: 0, byPmcid: 0, byDocId: 0, ingested: 0, wouldIngest: 0, unresolved: 0 };

    async function textOf(id) {
        if (!textCache.has(id)) {
            const row = await db.get('SELECT full_text, full_text_source FROM guideline_documents WHERE id = ?', [id]);
            const usable = row && !ABSTRACT_SOURCES.has(String(row.full_text_source || '').toLowerCase())
                && normalizeText(row.full_text).length >= 500;
            textCache.set(id, usable ? normalizeText(row.full_text) : '');
        }
        return textCache.get(id);
    }

    function loadText(pmcid) {
        const file = path.join(batchDir, 'docs-to-load', `${pmcid}.loadtext.txt`);
        return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    }

    async function ingest(pmcid, pmid, text) {
        if (ingested.has(pmcid)) return ingested.get(pmcid);
        const m = meta.get(pmcid) || meta.get(pmid) || {};
        const now = new Date().toISOString();
        const words = normalizeText(text).split(' ').length;
        // pmcid is unique. A row already holding this PMCID is filled in only when it has no usable full
        // text, is not quarantined, and does not belong to a different PMID; otherwise the anchor stays
        // unresolved rather than overwriting text other anchors may rely on.
        const existing = await db.get('SELECT id, pmid, full_text_source FROM guideline_documents WHERE pmcid = ? ORDER BY id LIMIT 1', [pmcid]);
        if (existing) {
            const otherPaper = existing.pmid && pmid && String(existing.pmid) !== String(pmid);
            if ((await textOf(existing.id)) || otherPaper || String(existing.full_text_source || '').startsWith('quarantined')) {
                ingested.set(pmcid, null);
                return null;
            }
            await db.run('UPDATE guideline_documents SET full_text = ?, full_text_source = ?, word_count = ?, fetched_at = ?, updated_at = ? WHERE id = ?',
                [text, 'jats', words, now, now, existing.id]);
            ingested.set(pmcid, existing.id);
            textCache.set(existing.id, normalizeText(text));
            stats.ingested++;
            return existing.id;
        }
        await db.run(
            `INSERT INTO guideline_documents (pmcid, pmid, doi, title, source_body, source_year, source_url,
                 evidence_tier, full_text, full_text_source, word_count, fetched_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [pmcid, pmid || null, m.doi || null, m.title || pmcid, m.journal || 'Europe PMC',
                Number(m.year) || null, `https://pmc.ncbi.nlm.nih.gov/articles/${pmcid}/`,
                m.evidenceTier || 'review', text, 'jats', words, now, now, now],
        );
        const row = await db.get('SELECT id FROM guideline_documents WHERE pmcid = ? ORDER BY id DESC LIMIT 1', [pmcid]);
        ingested.set(pmcid, row.id);
        textCache.set(row.id, normalizeText(text));
        stats.ingested++;
        return row.id;
    }

    /** Returns the guideline_documents id whose text holds the quote, or null. */
    async function resolve(anchor) {
        const quote = normalizeText(anchor.exactQuote || anchor.quote);
        if (quote.length < 40) return null;
        const pmid = cleanPmid(anchor.pmid);
        const pmcid = cleanPmcid(anchor.pmcid) || cleanPmcid(anchor.pmid);
        if (pmid) {
            const rows = await db.all('SELECT id FROM guideline_documents WHERE pmid = ? ORDER BY id', [pmid]);
            for (const r of rows) if ((await textOf(r.id)).includes(quote)) { stats.byPmid++; return r.id; }
        }
        if (pmcid) {
            const rows = await db.all('SELECT id FROM guideline_documents WHERE pmcid = ? OR pmcid = ? ORDER BY id',
                [pmcid, pmcid.replace(/^PMC/, '')]);
            for (const r of rows) if ((await textOf(r.id)).includes(quote)) { stats.byPmcid++; return r.id; }
        }
        if (TRUST_DOC_IDS && anchor.documentId != null) {
            if ((await textOf(Number(anchor.documentId))).includes(quote)) { stats.byDocId++; return Number(anchor.documentId); }
        }
        if (pmcid) {
            const text = pending.get(pmcid) ?? loadText(pmcid);
            if (text && normalizeText(text).includes(quote)) {
                if (APPLY) return ingest(pmcid, pmid, text);
                if (!pending.has(pmcid)) { pending.set(pmcid, text); stats.wouldIngest++; }
                return `pending:${pmcid}`;
            }
        }
        stats.unresolved++;
        return null;
    }

    return { resolve, stats };
}

async function resolveTopicId(db, draft) {
    const raw = String(draft.topicId || '').trim();
    if (UUID_RE.test(raw)) return raw;
    const topic = String(draft.topic || '').trim();
    const row = await db.get('SELECT id AS topic_id FROM curriculum_topics WHERE display_name = ? LIMIT 1', [topic])
        || await db.get('SELECT id AS topic_id FROM curriculum_topics WHERE LOWER(display_name) = LOWER(?) LIMIT 1', [topic])
        || await db.get('SELECT topic_id FROM topic_mentor_drafts WHERE topic = ? LIMIT 1', [topic])
        || await db.get('SELECT topic_id FROM topic_mentor_drafts WHERE LOWER(topic) = LOWER(?) LIMIT 1', [topic]);
    return row ? String(row.topic_id) : null;
}

async function main() {
    if (!DIR) throw new Error('--dir <batch folder> is required');
    const batchDir = path.resolve(DIR);
    const batchId = path.basename(batchDir);
    const drafts = readJson(path.join(batchDir, 'mentor-drafts.json'), []);
    const mcqs = readJson(path.join(batchDir, 'mcq-drafts.json'), []);
    const links = readJson(path.join(batchDir, 'topic-document-links.json'), []);
    const catalogue = readJson(path.join(batchDir, 'evidence-catalogue.json'), []);

    const db = require('../database');
    await db.connect();
    const { upsertDrafts } = require('../server/services/topicMentorDrafts');
    const { storeVerifiedDraft } = require('../server/services/evidenceLockedMcqDraftService');
    const resolver = createDocumentResolver(db, batchDir, catalogue);
    const pmcidOf = new Map();
    for (const row of [...catalogue, ...links]) {
        const pmcid = cleanPmcid(row.pmcid) || cleanPmcid(row.pmid);
        const pmid = cleanPmid(row.pmid);
        if (pmcid && pmid) pmcidOf.set(pmid, pmcid);
        if (pmcid) pmcidOf.set(pmcid, pmcid);
    }
    const complete = (a) => {
        const key = cleanPmid(a?.pmid) || cleanPmcid(a?.pmid);
        return a && !a.pmcid && pmcidOf.has(key) ? { ...a, pmcid: pmcidOf.get(key) } : a;
    };

    const mcqsByTopic = new Map();
    for (const q of mcqs) {
        if (!mcqsByTopic.has(q.topic)) mcqsByTopic.set(q.topic, []);
        mcqsByTopic.get(q.topic).push(q);
    }

    const report = { batchId, apply: APPLY, topics: [], totals: {} };
    const toLoad = [];
    for (const d of drafts) {
        const entry = { topic: d.topic, packageTopicId: d.topicId };
        entry.topicId = await resolveTopicId(db, d);
        if (!entry.topicId) { entry.result = 'skipped: topic not found in topic_mentor_drafts'; report.topics.push(entry); continue; }

        const points = [];
        for (const p of d.page?.teaching_points || []) {
            const anchors = [];
            for (const a of p.evidence_anchors || []) {
                const id = await resolver.resolve(complete(a));
                if (id != null) anchors.push({ ...a, documentId: id });
            }
            if (anchors.length && anchors.length === (p.evidence_anchors || []).length) points.push({ ...p, evidence_anchors: anchors });
        }
        const questions = [];
        for (const q of mcqsByTopic.get(d.topic) || []) {
            const r = q.replacement || {};
            const answer = await resolver.resolve(complete(r.answerEvidenceAnchor || {}));
            const expl = [];
            for (const a of r.explanationEvidenceAnchors || []) {
                const id = await resolver.resolve(complete(a));
                if (id != null) expl.push({ ...a, documentId: id });
            }
            if (answer == null || !expl.length) continue;
            questions.push({ ...q, replacement: { ...r, answerEvidenceAnchor: { ...r.answerEvidenceAnchor, documentId: answer }, explanationEvidenceAnchors: expl } });
        }
        entry.points = `${points.length}/${(d.page?.teaching_points || []).length}`;
        entry.mcqs = `${questions.length}/${(mcqsByTopic.get(d.topic) || []).length}`;
        if (points.length < MIN_POINTS || questions.length < MIN_MCQS) {
            entry.result = `skipped: needs ${MIN_POINTS}+ verified points and ${MIN_MCQS}+ verified MCQs`;
            report.topics.push(entry);
            continue;
        }
        entry.result = APPLY ? 'loaded' : 'would load';
        toLoad.push({ draft: d, entry, points, questions });
        report.topics.push(entry);
    }

    if (APPLY) {
        for (const item of toLoad) {
            const { draft, entry, points, questions } = item;
            const page = { ...draft.page, teaching_points: points };
            await upsertDrafts(db, [{ ...draft, topicId: entry.topicId, status: 'needs_review', page }], { sourceBatch: batchId });
            let stored = 0;
            const rejected = [];
            for (const q of questions) {
                try {
                    await storeVerifiedDraft(db, {
                        batchId, topic: draft.topic, curriculumTopicId: entry.topicId, sourceObjectKey: q.sourceObjectKey,
                        sourceQuestionIndex: q.sourceQuestionIndex, replacement: q.replacement,
                    });
                    stored++;
                } catch (err) { rejected.push(err.message); }
            }
            entry.mcqsStored = stored;
            if (rejected.length) entry.mcqsRejected = rejected.slice(0, 3);
            for (const l of links.filter((x) => x.topic === draft.topic)) {
                const ids = new Set(points.flatMap((p) => p.evidence_anchors.map((a) => a.documentId)));
                const key = cleanPmid(l.pmid) || cleanPmcid(l.pmcid) || (l.documentId != null ? `DOC${l.documentId}` : '');
                if (!key) continue;
                const res = await db.upsertTopicDocument({
                    topicId: entry.topicId, topic: draft.topic, pmid: key, docKind: l.docKind || null,
                    fit: l.fit || null, sourceBatch: batchId, note: 'aligned batch load: exact-quote anchors verified',
                });
                const docId = [...ids].find(Boolean);
                if (res?.id && docId && ids.size === 1) {
                    await db.run('UPDATE topic_documents SET guideline_document_id = ? WHERE id = ?', [docId, res.id]);
                }
            }
        }
    }

    report.totals = {
        topicsInBatch: drafts.length,
        topicsLoadable: toLoad.length,
        topicsSkipped: drafts.length - toLoad.length,
        points: toLoad.reduce((s, t) => s + t.points.length, 0),
        mcqs: toLoad.reduce((s, t) => s + t.questions.length, 0),
        documents: resolver.stats,
    };
    if (REPORT) fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report.totals, null, 2));
    const skipped = report.topics.filter((t) => t.result.startsWith('skipped'));
    if (skipped.length) {
        console.log(`Skipped ${skipped.length}:`);
        for (const t of skipped.slice(0, 15)) console.log(`  ${t.topic} -> ${t.result} (points ${t.points || '-'}, mcqs ${t.mcqs || '-'})`);
    }
    await db.close?.();
}

main().catch(async (err) => {
    console.error(err);
    process.exitCode = 1;
});
