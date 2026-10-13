'use strict';

const fs = require('fs');
const path = require('path');
const { loadEnv, serverConfig } = require('../../config');
const db = require('../../database');
const { createAiService } = require('../services/ai/aiService');
const {
    listTargets, syncAuditRows, drawRandomSample, buildEvidence, runStage, auditCounts,
} = require('../services/questionAudit/questionAuditService');

loadEnv();

function arg(name, fallback = null) {
    const hit = process.argv.find((value) => value.startsWith(`${name}=`));
    if (hit) return hit.slice(name.length + 1);
    const index = process.argv.indexOf(name);
    return index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')
        ? process.argv[index + 1] : fallback;
}

function optionValues(options) {
    if (Array.isArray(options)) return options.map((value) => String(value || '').trim());
    if (options && typeof options === 'object') return Object.values(options).map((value) => String(value || '').trim());
    return [];
}

function structuralIssues(question = {}) {
    const issues = [];
    const stem = String(question.question || '').trim();
    const options = optionValues(question.options);
    const keyed = String(question.correctAnswer ?? question.correct ?? '').trim();
    if (stem.length < 15) issues.push('missing_or_short_stem');
    if (options.length < 3 || options.length > 6 || options.some((value) => !value)) issues.push('invalid_options');
    if (new Set(options.map((value) => value.toLowerCase())).size !== options.length) issues.push('duplicate_options');
    if (!keyed) issues.push('missing_keyed_answer');
    else {
        const letterIndex = /^[A-F]$/i.test(keyed) ? keyed.toUpperCase().charCodeAt(0) - 65 : -1;
        const textMatches = options.filter((value) => value.toLowerCase() === keyed.toLowerCase()).length;
        if (!(letterIndex >= 0 && letterIndex < options.length) && textMatches !== 1) issues.push('key_does_not_identify_one_option');
    }
    if (!String(question.explanation || '').trim()) issues.push('missing_explanation');
    return issues;
}

async function preflight(targets, concurrency = 12) {
    let cursor = 0;
    const result = { checked: 0, structurallyInvalid: 0, evidenceUnavailable: 0, newlyHeld: 0 };
    const worker = async () => {
        while (cursor < targets.length) {
            const target = targets[cursor++];
            const existing = await db.get(
                'SELECT human_decision, pre_flag_reason FROM question_audit WHERE object_key = ? AND question_index = ?',
                [target.objectKey, target.questionIndex],
            );
            if (existing?.human_decision) { result.checked += 1; continue; }
            const structure = structuralIssues(target.question);
            const evidence = await buildEvidence(db, {
                object_key: target.objectKey, question_index: target.questionIndex, object_type: target.objectType,
            }, target.question);
            const usable = evidence.filter((item) => String(item?.text || '').trim().length >= 20);
            const findings = [];
            if (structure.length) { findings.push(...structure); result.structurallyInvalid += 1; }
            if (!usable.length) { findings.push('no_retrievable_evidence'); result.evidenceUnavailable += 1; }
            const reason = findings.length ? `automated_preflight:${findings.join('|')}` : null;
            const retainedReason = existing?.pre_flag_reason || reason;
            if (!existing?.pre_flag_reason && reason) result.newlyHeld += 1;
            await db.run(
                `UPDATE question_audit SET evidence = ?, pre_flag_reason = ?, status = CASE WHEN ? IS NOT NULL THEN 'needs_human' ELSE status END,
                    updated_at = ? WHERE object_key = ? AND question_index = ?`,
                [JSON.stringify(evidence), retainedReason, retainedReason, new Date().toISOString(), target.objectKey, target.questionIndex],
            );
            result.checked += 1;
        }
    };
    await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
    return result;
}

async function exportReport(file) {
    const rows = await db.all(`SELECT status, stage1_verdict, stage1_severity, stage2_verdict, stage2_severity,
        human_decision, pre_flag_reason, COUNT(*) AS questions
        FROM question_audit GROUP BY 1,2,3,4,5,6,7 ORDER BY questions DESC`, []);
    const payload = { generatedAt: new Date().toISOString(), counts: await auditCounts(db), breakdown: rows };
    fs.writeFileSync(file, JSON.stringify(payload, null, 2));
    return payload;
}

async function main() {
    const action = arg('--action', 'status');
    await db.connect();
    await db.runMigrations();
    if (action === 'sync' || action === 'all') {
        const targets = await listTargets(db);
        console.log(JSON.stringify({ sync: await syncAuditRows(db, targets) }));
        console.log(JSON.stringify({ sample: await drawRandomSample(db, { size: Number(arg('--sample', 200)) }) }));
        console.log(JSON.stringify({ preflight: await preflight(targets, Number(arg('--concurrency', 12))) }));
    }
    if (action === 'stage1' || action === 'stage2' || action === 'all') {
        const stage = action === 'stage2' ? 2 : 1;
        const ai = createAiService({ serverConfig });
        const result = await runStage(db, ai, {
            stage,
            budgetUsd: Number(arg('--budget-usd', 10)),
            limit: Number(arg('--limit', 100000)),
            concurrency: Number(arg('--concurrency', 6)),
            maxCapPctUsed: Number(arg('--max-cap-pct', 85)),
        });
        console.log(JSON.stringify({ review: result }));
    }
    const destination = path.resolve(arg('--report', '/tmp/signal-md-full-question-audit.json'));
    console.log(JSON.stringify({ report: await exportReport(destination), destination }));
}

if (require.main === module) {
    main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.close?.());
}

module.exports = { optionValues, structuralIssues };
