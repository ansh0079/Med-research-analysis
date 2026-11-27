'use strict';

/**
 * Load an offline-built pack (per-topic recommendation points + MCQs, each with an exact source quote)
 * as REVIEW-PENDING content. Nothing is published.
 *
 *   node scripts/load_offline_pack.js --file load_pack.json [--apply] [--min-points 3] [--report out.json]
 *
 * Per topic: skips it if any mentor draft already exists unless --replace is given. --replace backs the old draft rows and
 * old MCQ drafts up into offline_pack_replacements, retires the old MCQ drafts (needs_changes, never deleted) once the new batch
 * stored >= --min-mcqs (default 5), and rebuilds the live topic MCQ object. Reviewed or published drafts need --replace-reviewed /
 * --replace-published. Undo a batch with --rollback BATCH_ID [--topic-id ID] [--apply].
 *
 * Per topic: resolves every quote to a
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
const REPLACE = args.includes('--replace');
const REPLACE_PUBLISHED = args.includes('--replace-published');
const REPLACE_REVIEWED = args.includes('--replace-reviewed');
const RETIRE_APPROVED = args.includes('--retire-approved');
const ROLLBACK = arg('--rollback');
const ROLLBACK_TOPIC = arg('--topic-id');
const BACKUP = arg('--backup', `/tmp/load_offline_pack_rollback_${Date.now()}.json`);
const MIN_POINTS = Number(arg('--min-points', 3));
const MIN_MCQS = Number(arg('--min-mcqs', 5));
const REPORT = arg('--report');
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();

async function main() {
    const rep = require('../server/services/offlinePackReplace');
    if (ROLLBACK) {
        const dbr = require('../database');
        await dbr.connect();
        const { promoteTopic } = require('../server/services/mcqDraftPromotionService');
        const result = await rep.rollbackBatch(dbr, {
            batchId: ROLLBACK, topicId: ROLLBACK_TOPIC, apply: APPLY,
            promote: APPLY ? (o) => promoteTopic(dbr, o) : null,
        });
        console.log(JSON.stringify(result, null, 2));
        if (!APPLY) console.log('Dry run: add --apply to restore these topics.');
        await dbr.close?.();
        return;
    }
    if (!FILE) throw new Error('--file required');
    const pack = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    const db = require('../database');
    await db.connect();
    if (REPLACE && APPLY) await rep.ensureReplacementTable(db);
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
    const report = { apply: APPLY, replace: REPLACE, backup: APPLY && REPLACE ? BACKUP : null, topics: [] };
    const backupRows = [];
    let loaded = 0;
    let replaced = 0;
    for (const t of pack.topics) {
        const entry = { topic: t.topic, topicId: t.topicId };
        const mentorRows = await rep.findMentorDrafts(db, t.topicId, t.topic);
        const existing = mentorRows.find((r) => String(r.topic_id) === String(t.topicId)) || mentorRows[0] || null;
        if (existing && !REPLACE) { entry.result = 'skipped: draft already exists'; report.topics.push(entry); continue; }
        if (existing) {
            const guard = rep.replaceGuard(mentorRows, { allowPublished: REPLACE_PUBLISHED, allowReviewed: REPLACE_REVIEWED });
            if (!guard.ok) { entry.result = `skipped: ${guard.reason}`; report.topics.push(entry); continue; }
        }
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
        entry.result = existing ? (APPLY ? 'replaced' : 'would replace') : (APPLY ? 'loaded' : 'would load');
        if (APPLY) {
            const now = new Date().toISOString();
            const used = new Set(points.map((p) => p.cites[0]));
            const page = {
                mentor_intro: t.intro || points[0].claim,
                teaching_points: points,
                sources: [...used].map((k) => {
                    const doc = [...docMeta.values()].find((d) => (d.pmid || `DOC${d.id}`) === k);
                    return { pmid: k, ...(doc ? { documentId: doc.id } : {}), title: doc?.title || k };
                }),
                evidence_check: { points_kept: points.length, built_from: t.records },
            };
            const dbEvidence = { note: 'offline record load 2026-11-26; exact-quote anchors verified against stored text', records: t.records };
            let replacementId = null;
            let oldMcqRows = [];
            if (existing) {
                oldMcqRows = await rep.findMcqDrafts(db, t.topicId, t.topic);
                // Durable copy in the database first; the /tmp file is an extra convenience only.
                replacementId = await rep.backupTopic(db, {
                    batchId: pack.batchId, topicId: existing.topic_id, topic: t.topic, mentorRows, mcqRows: oldMcqRows, now,
                });
                backupRows.push({ topic_id: t.topicId, replacement_id: replacementId, topic_mentor_drafts: mentorRows, evidence_locked_mcq_drafts: oldMcqRows });
                try { fs.writeFileSync(BACKUP, JSON.stringify(backupRows, null, 2)); } catch { /* database copy is authoritative */ }
                await db.run(
                    `UPDATE topic_mentor_drafts
                     SET topic = ?, status = ?, page_json = ?, evidence_json = ?, source_batch = ?,
                         review_decision = NULL, reviewed_by = NULL, reviewed_at = NULL, reviewer_notes = NULL, updated_at = ?
                     WHERE topic_id = ?`,
                    [t.topic, 'needs_review', JSON.stringify(page), JSON.stringify(dbEvidence), pack.batchId, now, existing.topic_id],
                );
                // A second draft row for the same topic (keyed to another id) would resurface the old page: park it.
                for (const extra of mentorRows.filter((r) => r.topic_id !== existing.topic_id)) {
                    await db.run(`UPDATE topic_mentor_drafts SET status = 'needs_evidence', reviewer_notes = ?, updated_at = ? WHERE topic_id = ?`,
                        [`Superseded by offline pack ${pack.batchId}`, now, extra.topic_id]);
                }
                replaced++;
            } else {
                await upsertDrafts(db, [{ topicId: t.topicId, topic: t.topic, status: 'needs_review', page, dbEvidence }], { sourceBatch: pack.batchId, now });
                loaded++;
            }
            let stored = 0; const rejected = [];
            for (const q of questions) {
                try {
                    await storeVerifiedDraft(db, { batchId: pack.batchId, topic: t.topic, curriculumTopicId: t.topicId, sourceObjectKey: `${pack.batchId}:${t.topicId}`, sourceQuestionIndex: q.index, replacement: q.replacement });
                    stored++;
                } catch (e) { rejected.push(e.message.slice(0, 120)); }
            }
            entry.mcqsStored = stored;
            if (rejected.length) entry.mcqsRejected = rejected.slice(0, 3);
            // Retire the earlier MCQ drafts only when the new batch stored enough verified questions.
            if (existing && oldMcqRows.length) {
                if (stored >= MIN_MCQS) {
                    const fresh = await rep.findMcqDrafts(db, t.topicId, t.topic);
                    const retired = await rep.retireOldMcqDrafts(db, { mcqRows: fresh.filter((r) => oldMcqRows.some((o) => o.id === r.id)), keepBatchId: pack.batchId, now, retireApproved: RETIRE_APPROVED });
                    await rep.setRetiredIds(db, replacementId, retired);
                    const { promoteTopic } = require('../server/services/mcqDraftPromotionService');
                    const promo = await promoteTopic(db, { normalizedTopic: rep.normalizeTopic(t.topic), now });
                    entry.mcqsRetired = retired.length;
                    entry.liveMcqsNow = promo.promoted;
                } else {
                    entry.mcqsRetired = 0;
                    entry.note = `old MCQs kept: only ${stored} new verified (need ${MIN_MCQS})`;
                }
            }
        } else if (existing) {
            const oldMcq = await rep.findMcqDrafts(db, t.topicId, t.topic);
            entry.wouldRetireMcqs = oldMcq.filter((r) => r.review_state !== 'approved' || RETIRE_APPROVED).length;
            entry.wouldKeepApprovedMcqs = oldMcq.filter((r) => r.review_state === 'approved' && !RETIRE_APPROVED).length;
            if (questions.length < MIN_MCQS) entry.note = `would keep old MCQs: only ${questions.length} new verified (need ${MIN_MCQS})`;
        }
        report.topics.push(entry);
    }
    report.totals = {
        topics: pack.topics.length,
        loaded,
        replaced,
        wouldLoad: report.topics.filter((x) => x.result === 'would load').length,
        wouldReplace: report.topics.filter((x) => x.result === 'would replace').length,
        skipped: report.topics.filter((x) => x.result.startsWith('skipped')).length,
    };
    if (REPORT) fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report.totals));
    for (const e of report.topics) console.log(`${e.result} | pts ${e.points || '-'} | mcq ${e.mcqs || '-'}${e.mcqsStored != null ? ` stored ${e.mcqsStored}` : ''} | ${e.topic.slice(0, 60)}${e.mcqsRejected ? ' REJ ' + e.mcqsRejected[0] : ''}`);
    await db.close?.();
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
