'use strict';
/**
 * Remove MCQs that cite a fabricated future-dated guideline ("WHO 2026",
 * "NICE 2026", "ESICM 2026", a "2025 Dutch cohort study", ...).
 *
 * Detection: any 2026+ year mentioned in the question, explanation,
 * guidelineRef, or sourceReference. Verified against a 356-question clinical
 * QA sample first -- every flagged example manually reviewed in that sample
 * confirmed the cited guideline/study does not exist. This is the same
 * regex used for that finding (future-year-scan.js), now applied as a
 * removal rather than just a count.
 *
 * Removes the matching entries from object_payload.mcqs, not the whole
 * teaching_objects row -- one object commonly mixes flagged and clean
 * questions. A row left with zero mcqs after removal is deleted outright
 * (dead weight, matches the empty-topic cleanup done earlier this session).
 *
 * DRY_RUN=1 reports without writing.
 */
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });
const DRY = process.env.DRY_RUN === '1';

const FUTURE_YEAR = /\b(202[6-9]|20[3-9]\d)\b/;

(async () => {
  const rows = (await p.query(
    "SELECT id, object_type, topic, object_payload FROM teaching_objects WHERE object_type IN ('guideline_mcq','paper_mcq','cold_start_mcq')"
  )).rows;

  let totalMcqs = 0, removedMcqs = 0, rowsTouched = 0, rowsDeleted = 0;
  const byType = {};

  for (const row of rows) {
    const pl = typeof row.object_payload === 'string' ? JSON.parse(row.object_payload) : row.object_payload;
    const mcqs = pl.mcqs || [];
    totalMcqs += mcqs.length;

    const kept = [];
    let touchedThisRow = false;
    for (const m of mcqs) {
      const hay = [m.question, m.explanation, m.guidelineRef, m.sourceReference].filter(Boolean).join(' ');
      if (FUTURE_YEAR.test(hay)) {
        removedMcqs++;
        touchedThisRow = true;
        byType[row.object_type] = (byType[row.object_type] || 0) + 1;
      } else {
        kept.push(m);
      }
    }

    if (!touchedThisRow) continue;
    rowsTouched++;

    if (kept.length === 0) {
      rowsDeleted++;
      if (!DRY) await p.query('DELETE FROM teaching_objects WHERE id = $1', [row.id]);
    } else {
      if (!DRY) {
        const newPayload = { ...pl, mcqs: kept };
        await p.query('UPDATE teaching_objects SET object_payload = $1, updated_at = now() WHERE id = $2', [JSON.stringify(newPayload), row.id]);
      }
    }
  }

  console.log((DRY ? '[DRY RUN] ' : '') + 'total MCQs before: ' + totalMcqs);
  console.log('removed (fabricated citation): ' + removedMcqs + '  (' + (100 * removedMcqs / totalMcqs).toFixed(1) + '%)');
  console.log('by type: ' + JSON.stringify(byType));
  console.log('rows touched: ' + rowsTouched + '  (of which emptied and deleted: ' + rowsDeleted + ')');
  console.log('remaining MCQs: ' + (totalMcqs - removedMcqs));
  await p.end();
})().catch((e) => { console.error(e.stack); process.exit(1); });
