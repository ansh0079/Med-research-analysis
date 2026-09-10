'use strict';

// Dry-run by default; --apply requires a new backup file before any database writes.
const fs = require('fs');
const { loadEnv } = require('../../config');
loadEnv();
const db = require('../../database');
const { extractPubmedId } = require('../utils/guidelineExtraction');

async function main() {
    const apply = process.argv.includes('--apply');
    const backupIndex = process.argv.indexOf('--backup');
    const backupPath = backupIndex >= 0 ? process.argv[backupIndex + 1] : null;
    if (apply && (!backupPath || backupPath.startsWith('--'))) throw new Error('--apply requires --backup <new-file.json>');
    await db.connect();
    try {
        const rows = await db.all("SELECT id, source_url FROM topic_guidelines WHERE source_url LIKE 'https://pubmed.ncbi.nlm.nih.gov/PMID/%'");
        const repairs = rows.map((row) => ({ ...row, pmid: extractPubmedId(row.source_url) })).filter((r) => r.pmid);
        if (apply && repairs.length) {
            fs.writeFileSync(backupPath, JSON.stringify({ capturedAt: new Date().toISOString(), repairs }, null, 2), { flag: 'wx', mode: 0o600 });
            await db.withTransaction(async () => {
                for (const row of repairs) {
                    await db.run('UPDATE topic_guidelines SET source_url = ? WHERE id = ? AND source_url = ?',
                        [`https://pubmed.ncbi.nlm.nih.gov/${row.pmid}/`, row.id, row.source_url]);
                }
            });
        }
        console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', repairable: repairs.length, backup: apply && repairs.length ? backupPath : null }));
    } finally { await db.close(); }
}
main().catch((err) => { console.error(err.message); process.exitCode = 1; });
