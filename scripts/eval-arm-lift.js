#!/usr/bin/env node
'use strict';

/**
 * Offline arm-lift report for search / quiz / synopsis / teaching-strategy bandits.
 *
 * Reads personalization_decisions (+ optional learning_events) and summarizes
 * mean total reward by policy × arm. Use this to decide when to leave
 * observe_only mode.
 *
 * Usage:
 *   node scripts/eval-arm-lift.js
 *   node scripts/eval-arm-lift.js --days=30 --format=markdown
 *   node scripts/eval-arm-lift.js --strict   # exit 1 if any policy has <5 rewarded decisions
 */

const path = require('path');

const days = Number((process.argv.find((a) => a.startsWith('--days=')) || '--days=14').split('=')[1]) || 14;
const format = (process.argv.find((a) => a.startsWith('--format=')) || '--format=json').split('=')[1] || 'json';
const strict = process.argv.includes('--strict');

async function main() {
    const db = require(path.join(process.cwd(), 'database'));
    await db.connect();
    try {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        const rows = await db.all(
            `SELECT policy_type, arm_id,
                    COUNT(*) AS decisions,
                    SUM(CASE WHEN total_reward IS NOT NULL THEN 1 ELSE 0 END) AS rewarded,
                    AVG(CASE WHEN total_reward IS NOT NULL THEN total_reward END) AS mean_reward,
                    AVG(immediate_reward) AS mean_immediate,
                    AVG(delayed_reward) AS mean_delayed
             FROM personalization_decisions
             WHERE created_at >= ?
             GROUP BY policy_type, arm_id
             ORDER BY policy_type ASC, rewarded DESC, mean_reward DESC`,
            [since]
        ).catch(() => []);

        const byPolicy = {};
        for (const row of rows || []) {
            const policy = row.policy_type || 'unknown';
            if (!byPolicy[policy]) byPolicy[policy] = [];
            byPolicy[policy].push({
                armId: row.arm_id,
                decisions: Number(row.decisions || 0),
                rewarded: Number(row.rewarded || 0),
                meanReward: row.mean_reward == null ? null : Number(row.mean_reward),
                meanImmediate: row.mean_immediate == null ? null : Number(row.mean_immediate),
                meanDelayed: row.mean_delayed == null ? null : Number(row.mean_delayed),
            });
        }

        const report = {
            generatedAt: new Date().toISOString(),
            windowDays: days,
            policies: byPolicy,
            summary: Object.fromEntries(
                Object.entries(byPolicy).map(([policy, arms]) => [
                    policy,
                    {
                        armCount: arms.length,
                        rewardedDecisions: arms.reduce((s, a) => s + a.rewarded, 0),
                        bestArm: arms
                            .filter((a) => a.rewarded >= 3 && a.meanReward != null)
                            .sort((a, b) => (b.meanReward || 0) - (a.meanReward || 0))[0]?.armId || null,
                    },
                ])
            ),
        };

        if (format === 'markdown') {
            console.log(`# Arm lift report (${days}d)\n`);
            for (const [policy, arms] of Object.entries(byPolicy)) {
                console.log(`## ${policy}`);
                console.log('| Arm | Decisions | Rewarded | Mean reward |');
                console.log('|---|---:|---:|---:|');
                for (const arm of arms) {
                    console.log(`| ${arm.armId} | ${arm.decisions} | ${arm.rewarded} | ${arm.meanReward == null ? '—' : arm.meanReward.toFixed(3)} |`);
                }
                console.log('');
            }
        } else {
            console.log(JSON.stringify(report, null, 2));
        }

        if (strict) {
            const thin = Object.entries(report.summary)
                .filter(([, s]) => s.rewardedDecisions < 5)
                .map(([policy]) => policy);
            if (thin.length) {
                console.error(`Strict mode: insufficient rewarded decisions for: ${thin.join(', ')}`);
                process.exitCode = 1;
            }
        }
    } finally {
        await db.close?.().catch(() => null);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
