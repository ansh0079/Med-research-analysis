'use strict';

/**
 * Reports approved guideline-topic moves; --write applies them, records a reversible audit row,
 * and marks only dependent summaries/MCQs for regeneration.
 */
const crypto = require('crypto');
const { loadEnv } = require('../../config');
loadEnv();
const db = require('../../database');

const WRITE = process.argv.includes('--write');

(async () => {
    await db.connect();
    if (WRITE) await db.runMigrations();
    const rows = await db.all(
        `SELECT i.guideline_id, i.original_topic, i.assigned_curriculum_topic_id, i.assigned_topic_name,
                g.normalized_topic AS current_normalized_topic
         FROM guideline_topic_index i JOIN topic_guidelines g ON CAST(g.id AS TEXT) = i.guideline_id
         WHERE i.category = 'aligned' AND i.review_state = 'approved' AND i.applied_at IS NULL
           AND COALESCE(g.normalized_topic, '') <> COALESCE(LOWER(i.assigned_topic_name), '')`,
        [],
    );
    console.log(JSON.stringify({ approvedMoves: rows.length, write: WRITE, examples: rows.slice(0, 20) }, null, 2));
    if (!WRITE) return;
    const now = new Date().toISOString();
    for (const row of rows) {
        const newNormalized = db.normalizeTopic(String(row.assigned_topic_name || '').trim());
        await db.run(
            `INSERT INTO guideline_topic_repair_audit
             (id, guideline_id, old_normalized_topic, new_normalized_topic, assigned_curriculum_topic_id, changed_by, changed_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [crypto.randomUUID(), row.guideline_id, row.current_normalized_topic, newNormalized, row.assigned_curriculum_topic_id, 'approved-refiling-script', now],
        );
        await db.run('UPDATE topic_guidelines SET topic = ?, normalized_topic = ?, updated_at = ? WHERE CAST(id AS TEXT) = ?', [row.assigned_topic_name, newNormalized, now, row.guideline_id]);
        await db.run('UPDATE guideline_topic_index SET applied_at = ? WHERE guideline_id = ?', [now, row.guideline_id]);
        await db.run(
            `UPDATE teaching_objects SET review_state = 'needs_revision', updated_at = ?
             WHERE normalized_topic IN (?, ?) AND object_type IN ('guideline_summary', 'guideline_mcq') AND review_state <> 'withdrawn'`,
            [now, row.current_normalized_topic, newNormalized],
        );
    }
    console.log(`Applied ${rows.length} approved moves; dependent summaries and guideline MCQs were queued for revision.`);
})().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
