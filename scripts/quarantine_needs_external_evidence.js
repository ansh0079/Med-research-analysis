'use strict';

/**
 * Quarantine / park topic_evidence_registry status flags for rows marked
 * evidence_status = 'needs_external_evidence' that still carry misleading
 * 'Verified Full-Text Grounded' / 'published' synopsis or mentor_page statuses.
 *
 * Usage:
 *   node scripts/quarantine_needs_external_evidence.js           (dry-run)
 *   node scripts/quarantine_needs_external_evidence.js --apply   (backs up DB + applies)
 */

const fs = require('fs');
const path = require('path');
const { loadEnv } = require('../config');
loadEnv();

const APPLY = process.argv.includes('--apply');

async function main() {
    const db = require('../database');
    await db.connect();

    const rows = await db.all(
        `SELECT topic_key, topic_id, topic_name, evidence_status, primary_document_id,
                synopsis_status, mentor_page_status, mcq_object_ids
         FROM topic_evidence_registry
         WHERE evidence_status = 'needs_external_evidence'
           AND (
               synopsis_status = 'Verified Full-Text Grounded'
               OR mentor_page_status IN ('Verified Full-Text Grounded', 'verified_published', 'published')
           )
         ORDER BY topic_name`
    );

    console.log(JSON.stringify({ apply: APPLY, targetRows: rows.length }));
    for (const r of rows) {
        console.log(`  ${r.topic_key} | doc=${r.primary_document_id} | syn=${r.synopsis_status} | mentor=${r.mentor_page_status} | ${r.topic_name}`);
    }

    if (APPLY && rows.length > 0) {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const dbPath = path.resolve(process.cwd(), db.dbPath || './database/app.db');
        const backupDir = path.join(path.dirname(dbPath), 'backups');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        const backupPath = path.join(backupDir, `app-before-quarantine-needs-ext-${stamp}.db`);
        if (fs.existsSync(dbPath)) {
            fs.copyFileSync(dbPath, backupPath);
            console.log(`Backup created: ${backupPath}`);
        }

        const res = await db.run(
            `UPDATE topic_evidence_registry
             SET synopsis_status = CASE WHEN synopsis_status = 'Verified Full-Text Grounded' THEN 'needs_external_evidence' ELSE synopsis_status END,
                 mentor_page_status = CASE WHEN mentor_page_status IN ('Verified Full-Text Grounded', 'verified_published', 'published') THEN 'needs_external_evidence' ELSE mentor_page_status END
             WHERE evidence_status = 'needs_external_evidence'
               AND (
                   synopsis_status = 'Verified Full-Text Grounded'
                   OR mentor_page_status IN ('Verified Full-Text Grounded', 'verified_published', 'published')
               )`
        );
        console.log(`Updated rows: ${res?.changes ?? res?.rowCount ?? rows.length}`);
    }

    await db.close?.();
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
