#!/usr/bin/env node
'use strict';

/**
 * Evidence-support audit for generated teaching content.
 *
 * Answers, for the content actually stored: is each claim answerable from the
 * passage it cites, and does each question have an answer that is defensible
 * rather than guessable from its shape.
 *
 * This is the structural pass. It runs over the whole corpus, costs nothing per
 * item and needs no model. What it cannot decide -- whether a claim genuinely
 * follows from a passage that shares its vocabulary -- is left to a judged
 * sample, which has to be calibrated against human labels before its numbers
 * mean anything.
 *
 * Usage:
 *   node scripts/audit-evidence-support.js
 *   node scripts/audit-evidence-support.js --limit 2000
 *   node scripts/audit-evidence-support.js --format markdown > report.md
 */

const fs = require('fs');
const path = require('path');
const db = require('../database');
const { auditEvidenceSupport } = require('../server/services/evidenceSupportAuditService');

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
    const i = args.indexOf(name);
    return i === -1 ? fallback : args[i + 1];
};
const limit = Number(flag('--limit', '0')) || 0;
const format = flag('--format', 'table');

const pct = (value) => (value === null || value === undefined ? 'n/a' : `${(value * 100).toFixed(1)}%`);

function renderTable(report) {
    const lines = [];
    const { claims, mcqs } = report;

    lines.push(`Claims audited: ${claims.total}`);
    lines.push(`  with a structural problem: ${claims.affected} (${pct(claims.total ? claims.affected / claims.total : null)})`);
    for (const f of claims.findings) {
        lines.push(`    ${String(f.count).padStart(6)}  ${f.code}`);
        if (f.example) lines.push(`            e.g. ${f.example.claim}`);
    }

    lines.push('');
    lines.push(`Questions audited: ${mcqs.total}`);
    lines.push(`  with a structural problem: ${mcqs.affected} (${pct(mcqs.total ? mcqs.affected / mcqs.total : null)})`);
    for (const f of mcqs.findings) {
        lines.push(`    ${String(f.count).padStart(6)}  ${f.code}`);
    }

    const { cueing } = mcqs;
    lines.push('');
    lines.push('Answer cueing (can the key be picked from form alone?)');
    lines.push(`  key is the single longest option: ${cueing.keyIsLongest} (${pct(cueing.observedRate)})`);
    lines.push(`  rate expected by chance:          ${pct(cueing.chanceRate)}`);
    lines.push(`  questions cued beyond chance:     ${cueing.excessOverChance ?? 'n/a'}`);
    lines.push('');
    lines.push('Structural checks only. A claim with no finding here is not thereby');
    lines.push('supported -- that needs a judged, human-calibrated sample.');
    return lines.join('\n');
}

function renderMarkdown(report) {
    const { claims, mcqs, generatedAt } = report;
    const lines = [`# Evidence-support audit`, '', `Generated ${generatedAt}`, ''];
    lines.push(`## Claims`, '', `${claims.affected} of ${claims.total} carry a structural problem.`, '');
    lines.push('| finding | count |', '| --- | ---: |');
    for (const f of claims.findings) lines.push(`| \`${f.code}\` | ${f.count} |`);
    lines.push('', `## Questions`, '', `${mcqs.affected} of ${mcqs.total} carry a structural problem.`, '');
    lines.push('| finding | count |', '| --- | ---: |');
    for (const f of mcqs.findings) lines.push(`| \`${f.code}\` | ${f.count} |`);
    lines.push('', '## Answer cueing', '');
    lines.push(`Observed ${pct(mcqs.cueing.observedRate)} against a chance rate of ${pct(mcqs.cueing.chanceRate)}`
        + ` — ${mcqs.cueing.excessOverChance} questions cued beyond chance.`);
    lines.push('', '_Structural checks only; an unflagged claim is not thereby supported._');
    return lines.join('\n');
}

(async () => {
    await db.connect();
    const report = await auditEvidenceSupport(db, { limit });

    const outDir = path.resolve(process.cwd(), 'eval-results');
    fs.mkdirSync(outDir, { recursive: true });
    const jsonPath = path.join(outDir, `evidence-support-${Date.now()}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    console.log(format === 'markdown' ? renderMarkdown(report) : renderTable(report));
    console.log(`\nFull report: ${path.relative(process.cwd(), jsonPath)}`);
    process.exit(0);
})().catch((error) => {
    console.error(`audit-evidence-support failed: ${error.message}`);
    process.exit(1);
});
