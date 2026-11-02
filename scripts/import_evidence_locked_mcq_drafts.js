'use strict';

/**
 * Imports MCQs authored in this Codex task. This script makes no network or LLM calls.
 * Every quotation is checked against stored full text before an unreviewed draft is saved.
 * Usage: node scripts/import_evidence_locked_mcq_drafts.js <batch.json>
 */
const fs = require('fs');
const path = require('path');
const db = require('../database');
const { storeVerifiedDraft } = require('../server/services/evidenceLockedMcqDraftService');

async function main() {
    const inputPath = process.argv[2];
    if (!inputPath) throw new Error('Batch JSON path is required');
    const batch = JSON.parse(fs.readFileSync(path.resolve(inputPath), 'utf8'));
    if (!batch.batchId || !Array.isArray(batch.drafts)) throw new Error('batchId and drafts[] are required');
    await db.connect();
    const results = [];
    for (const draft of batch.drafts) {
        const result = await storeVerifiedDraft(db, { ...draft, batchId: batch.batchId });
        await db.run(`UPDATE evidence_locked_mcq_regeneration_queue
            SET status = ?, status_reason = ?, updated_at = ?
            WHERE source_object_key = ? AND source_question_index = ?`,
        ['draft_created', `Unreviewed draft ${result.draftKey}`, new Date().toISOString(),
            draft.sourceObjectKey, Number(draft.sourceQuestionIndex)]).catch(() => null);
        results.push(result);
    }
    console.log(JSON.stringify({ batchId: batch.batchId, imported: results.length, results }, null, 2));
    await db.close();
}

main().catch(async (error) => {
    console.error(error.message);
    if (db?.close) await db.close().catch(() => null);
    process.exitCode = 1;
});
