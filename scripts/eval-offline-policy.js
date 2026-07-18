#!/usr/bin/env node
'use strict';

/**
 * Offline IPS / SNIPS + linear value model eval (P4).
 *
 * Usage:
 *   node scripts/eval-offline-policy.js
 *   node scripts/eval-offline-policy.js --days=60
 */

async function main() {
    const args = process.argv.slice(2);
    const days = Math.min(90, Math.max(1, parseInt(args.find((a) => a.startsWith('--days='))?.split('=')[1] || '30', 10) || 30));

    const db = require('../database');
    const { runOfflinePolicyEval } = require('../server/services/offlinePolicyEvalService');
    const { fitLinearValueModel, selectArmByLinearValue, rankArmsByValue } = require('../server/services/contextualValueModel');
    const { loadDecisionsForOfflineEval } = require('../server/services/policyReplayEvaluator');
    const { replayAllArms, replayGatePasses } = require('../server/services/policyReplayEvaluator');

    await db.connect();

    const decisions = await loadDecisionsForOfflineEval(db, 'search_ranking', days);
    const ipsReport = await runOfflinePolicyEval(db, { days });
    const linear = fitLinearValueModel(decisions);
    const replay = await replayAllArms(db, 'search_ranking', days);

    console.log('\nOffline policy eval (P4)');
    console.log(`Days=${days} labelled decisions=${ipsReport.density.n} propensityCoverage=${(ipsReport.density.propensityCoverage * 100).toFixed(1)}%`);
    console.log(`Density gate: ${ipsReport.density.pass ? 'PASS' : 'FAIL'} ${ipsReport.density.reason || ''}`);

    console.log('\nIPS / SNIPS (constant arm policies)');
    for (const row of ipsReport.constantPolicies.slice(0, 6)) {
        const ips = row.ips == null ? 'n/a' : row.ips.toFixed(3);
        const snips = row.snips == null ? 'n/a' : row.snips.toFixed(3);
        console.log(`  ${row.candidateArmId.padEnd(22)} IPS=${ips} SNIPS=${snips} nUsed=${row.nUsed} coverage=${(row.coverage * 100).toFixed(0)}%`);
    }

    if (linear.ok) {
        console.log(`\nLinear value model: n=${linear.n} rmse=${linear.rmse.toFixed(3)}`);
        const demoCtx = { masteryBand: 'weak', streakBand: 'active', hasDangerousMisconception: false };
        const ranked = rankArmsByValue(linear, demoCtx);
        console.log('  Demo context weak/active →', ranked.slice(0, 3).map((r) => `${r.armId}:${r.predictedReward.toFixed(3)}`).join(', '));
        const pick = selectArmByLinearValue(linear, demoCtx, { epsilon: 0 });
        console.log(`  Greedy pick: ${pick.armId}`);

        const contextual = await runOfflinePolicyEval(db, {
            days,
            contextualSelector: (ctx) => selectArmByLinearValue(linear, ctx, { epsilon: 0 }).armId,
        });
        if (contextual.contextual) {
            const c = contextual.contextual;
            console.log(`  Contextual IPS=${c.ips == null ? 'n/a' : c.ips.toFixed(3)} SNIPS=${c.snips == null ? 'n/a' : c.snips.toFixed(3)} nUsed=${c.nUsed}`);
        }
    } else {
        console.log(`\nLinear value model: not fit (${linear.reason})`);
    }

    if (replay.length) {
        console.log('\nBoost-replay ranking (legacy lite evaluator)');
        for (const row of replay.slice(0, 4)) {
            const gate = replayGatePasses(row);
            console.log(`  ${row.candidateArmId.padEnd(22)} mean=${row.meanReward?.toFixed(3)} lift=${row.liftVsBaseline == null ? 'n/a' : (row.liftVsBaseline * 100).toFixed(1) + '%'} gate=${gate.pass ? 'PASS' : 'FAIL'}`);
        }
    }

    const fs = require('fs');
    const path = require('path');
    const outDir = path.join(process.cwd(), 'eval-results');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `offline-policy-${Date.now()}.json`);
    fs.writeFileSync(outPath, JSON.stringify({
        meta: { days, ran: new Date().toISOString() },
        density: ipsReport.density,
        constantPolicies: ipsReport.constantPolicies,
        linear: linear.ok ? { n: linear.n, rmse: linear.rmse, fittedAt: linear.fittedAt } : linear,
        replay,
    }, null, 2));
    console.log(`\nWrote ${outPath}`);

    await db.close?.();
    process.exit(ipsReport.density.pass || ipsReport.density.n === 0 ? 0 : 1);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
