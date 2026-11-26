'use strict';

/**
 * Operator tool for the evidence-locked MCQ review workflow.
 *
 *   Export drafts for clinicians (CSV, opens in Excel):
 *     node scripts/review_and_promote_mcq_drafts.js --export drafts.csv [--state unreviewed] [--topic "..."]
 *   Apply a clinician's decisions (CSV with columns draft_id, decision, notes; decision = approved | rejected | needs_changes):
 *     node scripts/review_and_promote_mcq_drafts.js --decisions reviewed.csv --reviewer "Dr Name" [--apply]
 *   Promote drafts into the live verified_topic_mcq objects (approved ones, plus unreviewed ones labelled needs_review
 *   unless MCQ_PROMOTE_UNREVIEWED=off):
 *     node scripts/review_and_promote_mcq_drafts.js --promote [--topic "..."] [--apply]
 *
 * Every step but --export is a dry run unless --apply is given.
 */

const fs = require('fs');
const { loadEnv } = require('../config');
loadEnv();
const { listMcqDrafts, getMcqDraft, reviewMcqDraft, promotePendingTopics, DECISIONS } = require('../server/services/mcqDraftPromotionService');
const { verifyExactAnchors } = require('../server/services/evidenceLockedMcqDraftService');

const args = process.argv.slice(2);
const arg = (name, fallback = null) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const APPLY = args.includes('--apply');

function csvCell(value) {
    const text = String(value ?? '');
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (quoted) {
            if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch;
        } else if (ch === '"') quoted = true;
        else if (ch === ',') { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i + 1] === '\n') i++;
            row.push(cell); rows.push(row); row = []; cell = '';
        } else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    const [header = [], ...body] = rows.filter((r) => r.some((c) => c.trim()));
    const keys = header.map((h) => h.trim().toLowerCase().replace(/^﻿/, ''));
    return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] || '').trim()])));
}

async function exportDrafts(db, file) {
    const header = ['draft_id', 'topic', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct', 'explanation',
        'answer_quote', 'explanation_quotes', 'documents', 'current_state', 'decision', 'notes'];
    const lines = [header.join(',')];
    let offset = 0;
    for (;;) {
        const { items } = await listMcqDrafts(db, { state: arg('--state', 'unreviewed'), topic: arg('--topic', ''), limit: 200, offset });
        if (!items.length) break;
        for (const d of items) {
            const q = d.question;
            const check = await verifyExactAnchors(db, q);
            const docs = [...check.documents.values()].filter(Boolean).map((doc) => `${doc.id}${doc.pmid ? ` PMID ${doc.pmid}` : ''}: ${doc.title || ''}`);
            lines.push([d.id, d.topic, q.question, ...(q.options || []).slice(0, 4), q.correctAnswer, q.explanation,
                q.answerEvidenceAnchor?.exactQuote, (q.explanationEvidenceAnchors || []).map((a) => a.exactQuote).join(' | '),
                docs.join(' | '), check.ok ? d.reviewState : `${d.reviewState} (evidence fails: ${check.errors.join('; ')})`, '', '']
                .map(csvCell).join(','));
        }
        offset += items.length;
    }
    fs.writeFileSync(file, `﻿${lines.join('\r\n')}\r\n`, 'utf8');
    console.log(`exported ${lines.length - 1} drafts to ${file}`);
}

async function applyDecisions(db, file) {
    const reviewer = arg('--reviewer');
    if (!reviewer) throw new Error('--reviewer "<name>" is required with --decisions');
    const counts = { rows: 0, blank: 0, invalid: 0, notFound: 0, applied: 0, refused: 0 };
    for (const rec of parseCsv(fs.readFileSync(file, 'utf8'))) {
        counts.rows++;
        const decision = String(rec.decision || '').toLowerCase().replace(/\s+/g, '_');
        if (!decision) { counts.blank++; continue; }
        if (!DECISIONS.includes(decision)) { counts.invalid++; console.log(`  draft ${rec.draft_id}: unknown decision "${rec.decision}"`); continue; }
        const draft = await getMcqDraft(db, rec.draft_id);
        if (!draft) { counts.notFound++; continue; }
        if (!APPLY) {
            if (decision === 'approved') {
                const check = await verifyExactAnchors(db, draft.question);
                if (!check.ok) { counts.refused++; console.log(`  draft ${draft.id}: approval would be refused (${check.errors[0]})`); continue; }
            }
            counts.applied++;
            continue;
        }
        try {
            await reviewMcqDraft(db, { draftId: draft.id, decision, notes: rec.notes, userId: reviewer });
            counts.applied++;
        } catch (err) { counts.refused++; console.log(`  draft ${draft.id}: ${err.message}`); }
    }
    console.log(JSON.stringify({ apply: APPLY, ...counts }, null, 2));
}

async function main() {
    const db = require('../database');
    await db.connect();
    if (arg('--export')) await exportDrafts(db, arg('--export'));
    else if (arg('--decisions')) await applyDecisions(db, arg('--decisions'));
    else if (args.includes('--promote')) {
        const result = await promotePendingTopics(db, { topic: arg('--topic', ''), apply: APPLY });
        console.log(JSON.stringify({ apply: APPLY, topics: result.topics, promoted: result.promoted, sentBack: result.sentBack }, null, 2));
        for (const r of result.results) console.log(`  ${r.objectKey}: ${r.promoted} questions${r.sentBack.length ? `, ${r.sentBack.length} sent back` : ''}`);
    } else throw new Error('use --export, --decisions or --promote');
    await db.close?.();
}

main().catch((err) => { console.error(err.message || err); process.exitCode = 1; });
