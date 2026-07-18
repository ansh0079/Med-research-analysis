/**
 * Backfill topic_knowledge + landmark source_articles for flagship topics.
 * Closes the curriculum-seed ↔ topic_knowledge pipeline gap without requiring AI.
 *
 *   node server/scripts/backfillFlagshipTopicKnowledge.js --dry-run
 *   node server/scripts/backfillFlagshipTopicKnowledge.js --priority=high --limit=5
 *   node server/scripts/backfillFlagshipTopicKnowledge.js --topic "Sepsis and septic shock"
 *   node server/scripts/backfillFlagshipTopicKnowledge.js --force
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { loadEnv } = require('../../config');
loadEnv();

const db = require('../../database');
const {
    loadFlagshipConfig,
    buildLandmarkSourceArticles,
    buildStubKnowledge,
    mergeSourceArticles,
    defaultNormalize,
} = require('../services/flagshipTopicOps');

function argValue(flag) {
    const argv = process.argv.slice(2);
    const hit = argv.find((a) => a.startsWith(`${flag}=`));
    if (hit) return hit.slice(flag.length + 1);
    const idx = argv.indexOf(flag);
    if (idx >= 0) return argv[idx + 1];
    return null;
}

function parseSourceArticles(knowledgeRow) {
    if (!knowledgeRow) return [];
    const raw = knowledgeRow.sourceArticles ?? knowledgeRow.source_articles ?? [];
    if (Array.isArray(raw)) return raw;
    try {
        const parsed = JSON.parse(raw || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

async function main() {
    const dry = process.argv.includes('--dry-run');
    const force = process.argv.includes('--force');
    const priority = argValue('--priority');
    const limit = Number(argValue('--limit') || 0) || null;
    const topicFilter = argValue('--topic');

    await db.connect();
    await db.runMigrations();

    const normalizeFn = (t) => (typeof db.normalizeTopic === 'function' ? db.normalizeTopic(t) : defaultNormalize(t));
    const config = loadFlagshipConfig();
    let flagships = config.topics || [];
    if (priority) flagships = flagships.filter((t) => String(t.priority || '') === priority);
    if (topicFilter) {
        const needle = normalizeFn(topicFilter);
        flagships = flagships.filter((t) => normalizeFn(t.topic).includes(needle) || needle.includes(normalizeFn(t.topic)));
    }
    if (limit) flagships = flagships.slice(0, limit);

    console.log(`Flagship topic_knowledge backfill${dry ? ' (DRY RUN)' : ''}${force ? ' (FORCE)' : ''}`);
    console.log(`Topics in scope: ${flagships.length}`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const flagship of flagships) {
        const topic = flagship.topic;
        const landmarks = buildLandmarkSourceArticles(flagship.landmarkPmids || []);
        if (landmarks.length < 1) {
            console.log(`[skip] "${topic}" — no landmark PMIDs configured`);
            skipped += 1;
            continue;
        }

        const existing = await db.getTopicKnowledge(topic).catch(() => null);
        const existingSources = parseSourceArticles(existing);
        const needsSources = existingSources.length < 3;
        const needsRow = !existing;
        const protectedStatus = ['human_reviewed', 'locked', 'verified'].includes(
            String(existing?.status || '').toLowerCase()
        );

        if (!needsRow && !needsSources && !force) {
            console.log(`[ok] "${topic}" — knowledge present with ${existingSources.length} sources`);
            skipped += 1;
            continue;
        }

        if (protectedStatus && !force) {
            console.log(`[skip] "${topic}" — protected status=${existing.status} (use --force to propose update)`);
            skipped += 1;
            continue;
        }

        const mergedSources = mergeSourceArticles(existingSources, landmarks);
        const knowledge = existing?.knowledge
            ? { ...(typeof existing.knowledge === 'string' ? JSON.parse(existing.knowledge) : existing.knowledge) }
            : buildStubKnowledge(topic, flagship);

        // Ensure aliases include configured flagship aliases for readiness / getTopicKnowledge.
        if (!Array.isArray(knowledge.keywords)) knowledge.keywords = [];
        for (const alias of flagship.aliases || []) {
            if (alias && !knowledge.keywords.includes(alias)) knowledge.keywords.push(alias);
        }
        knowledge.flagshipBackfillAt = new Date().toISOString();

        const status = existing ? 'ai_refreshed' : 'ai_generated';
        const confidence = Math.max(Number(existing?.confidence || 0), existing ? 0.7 : 0.75);

        if (mergedSources.length < 3) {
            console.log(
                `[warn] "${topic}" only ${mergedSources.length} landmark source(s) — add PMIDs in flagshipTopics.json to reach flagship (≥3)`
            );
        }
        console.log(
            `[${needsRow ? 'create' : 'update'}] "${topic}" sources ${existingSources.length} → ${mergedSources.length}`
            + (dry ? ' (dry-run)' : '')
        );

        if (!dry) {
            await db.upsertTopicKnowledge(topic, knowledge, mergedSources, status, confidence);
            if (needsRow) created += 1;
            else updated += 1;
        } else if (needsRow) {
            created += 1;
        } else {
            updated += 1;
        }
    }

    console.log(`\nDone. created=${created} updated=${updated} skipped=${skipped}`);
    await db.close();
}

main().catch(async (err) => {
    console.error(err);
    try { await db.close(); } catch { /* ignore */ }
    process.exit(1);
});
