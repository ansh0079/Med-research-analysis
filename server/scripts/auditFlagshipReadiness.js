/**
 * Print a readiness-tier breakdown for all flagship topics.
 *   node server/scripts/auditFlagshipReadiness.js
 *   node server/scripts/auditFlagshipReadiness.js --json
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { loadEnv } = require('../../config');
loadEnv();

const db = require('../../database');
const { loadFlagshipConfig } = require('../services/flagshipTopicOps');
const { collectTopicReadiness } = require('../services/topicReadinessService');

const jsonMode = process.argv.includes('--json');

async function main() {
    await db.connect();
    await db.runMigrations();

    const cfg = loadFlagshipConfig();
    const flagshipNames = new Set(cfg.topics.map((t) => t.topic.toLowerCase().trim()));

    const result = await collectTopicReadiness(db, { limit: 2000 });
    const rows = (result.topics || []).filter((r) =>
        flagshipNames.has((r.displayName || '').toLowerCase().trim())
    );

    const tierOrder = { needs_enrichment: 0, search_ready: 1, learner_ready: 2, flagship: 3 };
    rows.sort((a, b) => (tierOrder[a.tier] ?? 0) - (tierOrder[b.tier] ?? 0));

    if (jsonMode) {
        console.log(JSON.stringify(rows.map((r) => ({
            tier: r.tier,
            name: r.displayName,
            counts: r.counts,
            missing: r.missing,
        })), null, 2));
        await db.close();
        return;
    }

    const byTier = {};
    rows.forEach((r) => { byTier[r.tier] = (byTier[r.tier] || 0) + 1; });

    console.log('\nFLAGSHIP READINESS AUDIT');
    console.log('='.repeat(80));
    console.log(`Total matched: ${rows.length} / ${cfg.topics.length} config topics`);
    Object.entries(byTier).sort((a, b) => (tierOrder[a[0]] ?? 0) - (tierOrder[b[0]] ?? 0))
        .forEach(([tier, n]) => console.log(`  ${tier.padEnd(20)} ${n}`));

    console.log('\n' + '-'.repeat(80));
    console.log('TIER'.padEnd(20) + 'SRC G  CL  TO MCQ  TOPIC');
    console.log('-'.repeat(80));

    for (const r of rows) {
        const c = r.counts || {};
        const src = String(c.sourceArticles || 0).padStart(3);
        const g   = String(c.guidelines     || 0).padStart(2);
        const cl  = String(c.claims         || 0).padStart(3);
        const to  = String(c.teachingObjects|| 0).padStart(3);
        const mcq = String(c.mcqObjects     || 0).padStart(3);
        const tier = r.tier.padEnd(20);
        console.log(`${tier}${src} ${g} ${cl} ${to} ${mcq}  ${r.displayName}`);
    }

    // Topics in config but not matched in curriculum
    const matchedNames = new Set(rows.map((r) => (r.displayName || '').toLowerCase().trim()));
    const unmatched = cfg.topics.filter((t) => !matchedNames.has(t.topic.toLowerCase().trim()));
    if (unmatched.length) {
        console.log('\nNOT MATCHED IN CURRICULUM:');
        unmatched.forEach((t) => console.log(`  [${t.priority}] ${t.topic}`));
    }

    await db.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
