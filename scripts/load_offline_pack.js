'use strict';

/**
 * Load an offline-built pack (per-topic recommendation points + MCQs, each with an exact source quote)
 * as REVIEW-PENDING content. Nothing is published.
 *
 *   node scripts/load_offline_pack.js --file load_pack.json [--apply] [--min-points 3] [--report out.json]
 *
 * Per topic: skips it if any mentor draft already exists (never overwrites); resolves every quote to a
 * stored guideline_documents row from pack.docs whose full text holds it (whitespace-normalised); drops
 * points/MCQs whose quote is not found; writes the page as topic_mentor_drafts status needs_review and the
 * MCQs through storeVerifiedDraft (re-verifies quotes, review_state unreviewed). Dry run unless --apply.
 */

const fs = require('fs');
const { loadEnv } = require('../config');
loadEnv();

const args = process.argv.slice(2);
const arg = (n, f = null) => (args.includes(n) ? args[args.indexOf(n) + 1] : f);
const FILE = arg('--file');
const APPLY = args.includes('--apply');
const MIN_POINTS = Number(arg('--min-points', 3));
const REPORT = arg('--report');
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();

async function main() {
    if (!FILE) throw new Error('--file required');
    const pack = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    const db = require('../database');
    await db.connect();
    const { upsertDrafts } = require('../server/services/topicMentorDrafts');
    const { storeVerifiedDraft } = require('../server/services/evidenceLockedMcqDraftService');
    const texts = new Map();
    const docMeta = new Map();
    for (const id of pack.docs) {
        const row = await db.get('SELECT id, pmid, pmcid, title, full_text FROM guideline_documents WHERE id = ?', [id]);
        if (row) { texts.set(row.id, norm(row.full_text)); docMeta.set(row.id, row); }
    }
    const find = (quote) => {
        const q = norm(quote);
        if (q.length < 30) return null;
        for (const [id, t] of texts) if (t.includes(q)) return id;
        return null;
    };
    const report = { apply: APPLY, topics: [] };
    let loaded = 0;
    for (const t of pack.topics) {
        const entry = { topic: t.topic, topicId: t.topicId };
        const existing = await db.get('SELECT id FROM topic_mentor_drafts WHERE topic_id = ?', [t.topicId]);
        if (existing) { entry.result = 'skipped: draft already exists'; report.topics.push(entry); continue; }
        const points = [];
        for (const p of t.points) {
            const docId = find(p.quote);
            if (docId == null) continue;
            const m = docMeta.get(docId);
            const key = m.pmid || `DOC${docId}`;
            points.push({
                claim: p.claim, cites: [key], claim_type: 'paraphrase',
                evidence_anchors: [{ pmid: key, uid: `doc:${docId}`, quote: norm(p.quote), documentId: docId, ...(m.pmcid ? { pmcid: m.pmcid } : {}) }],
            });
        }
        const questions = [];
        t.mcqs.forEach((q, i) => {
            const docId = find(q.quote);
            if (docId == null) return;
            const exact = norm(q.quote);
            questions.push({
                index: i,
                replacement: {
                    questionType: 'clinical_application', difficulty: 'medium', question: q.stem, options: q.options,
                    correctAnswer: q.answer, explanation: q.explanation,
                    answerEvidenceAnchor: { documentId: docId, exactQuote: exact },
                    explanationEvidenceAnchors: [{ documentId: docId, exactQuote: exact }],
                },
            });
        });
        entry.points = `${points.length}/${t.points.length}`;
        entry.mcqs = `${questions.length}/${t.mcqs.length}`;
        if (points.length < MIN_POINTS) { entry.result = `skipped: only ${points.length} verified points`; report.topics.push(entry); continue; }
        entry.result = APPLY ? 'loaded' : 'would load';
        if (APPLY) {
            const used = new Set(points.map((p) => p.cites[0]));
            const page = {
                mentor_intro: t.intro || points[0].claim,
                teaching_points: points,
                sources: [...used].map((k) => ({ pmid: k, title: [...docMeta.values()].find((d) => (d.pmid || `DOC${d.id}`) === k)?.title || k })),
                evidence_check: { points_kept: points.length, built_from: t.records },
            };
            await upsertDrafts(db, [{ topicId: t.topicId, topic: t.topic, status: 'needs_review', page, dbEvidence: { note: 'offline record load 2026-11-24; exact-quote anchors verified against stored text', records: t.records } }], { sourceBatch: pack.batchId });
            let stored = 0; const rejected = [];
            for (const q of questions) {
                try {
                    await storeVerifiedDraft(db, { batchId: pack.batchId, topic: t.topic, curriculumTopicId: t.topicId, sourceObjectKey: `${pack.batchId}:${t.topicId}`, sourceQuestionIndex: q.index, replacement: q.replacement });
                    stored++;
                } catch (e) { rejected.push(e.message.slice(0, 120)); }
            }
            entry.mcqsStored = stored;
            if (rejected.length) entry.mcqsRejected = rejected.slice(0, 3);
            loaded++;
        }
        report.topics.push(entry);
    }
    report.totals = { topics: pack.topics.length, loaded, wouldLoad: report.topics.filter((x) => x.result === 'would load').length, skipped: report.topics.filter((x) => x.result.startsWith('skipped')).length };
    if (REPORT) fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report.totals));
    for (const e of report.topics) console.log(`${e.result} | pts ${e.points || '-'} | mcq ${e.mcqs || '-'}${e.mcqsStored != null ? ` stored ${e.mcqsStored}` : ''} | ${e.topic.slice(0, 60)}${e.mcqsRejected ? ' REJ ' + e.mcqsRejected[0] : ''}`);
    await db.close?.();
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
