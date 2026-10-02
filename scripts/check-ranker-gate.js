#!/usr/bin/env node
'use strict';

/**
 * Routine ranker promotion check.
 *
 * Exit 1 when a measured check fails.
 * Exit 0 with verdict NOT PROVEN when the window does not yet have enough
 * searches, gold labels, or shadow samples. That is not a pass.
 * RANKER_GATE_STRICT=1 also exits 2 when the result is not proven, so a
 * promotion can refuse to ship on missing evidence.
 */

const fs = require('fs');
const path = require('path');

const root = process.env.SIGNALMD_APP_ROOT || path.resolve(__dirname, '..');
require(path.join(root, 'config')).loadEnv();

const strict = ['1', 'true'].includes(String(process.env.RANKER_GATE_STRICT || '').toLowerCase());

function report(verdict, lines) {
    console.log(`Ranker gate: ${verdict.verdict.toUpperCase()} (exit ${verdict.code})`);
    for (const line of lines) console.log(line);
    if (verdict.verdict === 'not_proven') {
        console.log('Ranking stays in shadow. Missing samples are not a pass.');
    }
    process.exit(verdict.code);
}

async function main() {
    const { rankerGateVerdict } = require(path.join(root, 'server/services/searchRankerPromotionGateService'));
    const hasPg = Boolean(String(process.env.DATABASE_URL || '').trim());
    const sqlitePath = process.env.DATABASE_PATH || path.join(root, 'database', 'app.db');
    if (!hasPg && !fs.existsSync(sqlitePath)) {
        report(rankerGateVerdict({ recommendation: 'hold', checks: [{ id: 'database', status: 'insufficient_data' }] }, { strict }), [
            'No database in this environment, so no ranking sample was measured.',
        ]);
    }

    const db = require(path.join(root, 'database'));
    await db.connect();
    try {
        const { evaluateSearchRankerPromotionGate } = require(path.join(root, 'server/services/searchRankerPromotionGateService'));
        const days = Math.min(90, Math.max(1, Number(process.env.RANKER_GATE_DAYS) || 14));
        const result = await evaluateSearchRankerPromotionGate(db, { days });
        const verdict = rankerGateVerdict(result, { strict });
        const lines = result.checks.map((check) => `  ${check.status.padEnd(18)} ${check.id} = ${check.value ?? 'n/a'} (need ${check.threshold})`);
        report(verdict, lines);
    } finally {
        if (typeof db.close === 'function') await db.close().catch(() => {});
    }
}

main().catch((err) => {
    console.error(`Ranker gate: NOT PROVEN (${err?.message || err})`);
    process.exit(strict ? 2 : 0);
});
