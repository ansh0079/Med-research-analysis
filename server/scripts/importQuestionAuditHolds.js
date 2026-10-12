'use strict';

const fs = require('fs');
const path = require('path');
const { loadEnv } = require('../../config');
const db = require('../../database');
const { questionHash } = require('../services/questionIndex/questionIndexService');
const { contentHash } = require('../services/questionAudit/questionAuditService');

loadEnv();

function parseCsv(text) {
    const rows = []; let row = []; let cell = ''; let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        if (quoted) {
            if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
            else if (ch === '"') quoted = false;
            else cell += ch;
        } else if (ch === '"') quoted = true;
        else if (ch === ',') { row.push(cell); cell = ''; }
        else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
        else cell += ch;
    }
    if (row.length || cell) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
    const headers = rows.shift();
    return rows.filter((r) => r.some(Boolean)).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] || ''])));
}

async function main() {
    const file = process.argv[2] || path.join(__dirname, '../../data/question-audit-holds-2026-10-04.csv');
    const entries = parseCsv(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
    await db.connect();
    let inserted = 0; let updated = 0; let missing = 0; let alreadyDecided = 0;
    for (const entry of entries) {
        const objectKey = entry.object_key;
        const questionIndex = Number(entry.question_index);
        const object = await db.get('SELECT object_type, topic, object_payload FROM teaching_objects WHERE object_key = ?', [objectKey]);
        let payload;
        try { payload = JSON.parse(object?.object_payload || '{}'); } catch { payload = {}; }
        const question = payload?.mcqs?.[questionIndex];
        if (!object || !question?.question) { missing += 1; continue; }
        const existing = await db.get('SELECT human_decision FROM question_audit WHERE object_key = ? AND question_index = ?', [objectKey, questionIndex]);
        if (existing?.human_decision) { alreadyDecided += 1; continue; }
        const now = new Date().toISOString();
        const reason = String(entry.pre_flag_reason || 'evidence_consistency_review').slice(0, 2000);
        if (!existing) {
            await db.run(
                `INSERT INTO question_audit (object_key, question_index, question_hash, object_type, topic, content_hash,
                    pre_flag_reason, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'needs_human', ?)`,
                [objectKey, questionIndex, questionHash(question), object.object_type, object.topic || '', contentHash(question), reason, now],
            );
            inserted += 1;
        } else {
            await db.run(
                `UPDATE question_audit SET question_hash = ?, object_type = ?, topic = ?, content_hash = ?,
                    pre_flag_reason = ?, status = 'needs_human', updated_at = ? WHERE object_key = ? AND question_index = ?`,
                [questionHash(question), object.object_type, object.topic || '', contentHash(question), reason, now, objectKey, questionIndex],
            );
            updated += 1;
        }
    }
    console.log(JSON.stringify({ source: path.resolve(file), requested: entries.length, inserted, updated, missing, alreadyDecided }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.close?.());
