'use strict';

/**
 * Reattach teaching objects that have no curriculum topic.
 *
 * `teaching_objects.curriculum_topic_id` is how content is reached from the
 * curriculum. Rows written before migration 090 -- and any written by a path
 * that did not resolve the topic -- carry NULL, which makes them unreachable:
 * content the app paid to generate and can never serve. tools/check-topic-orphans.js
 * gates against this; production was failing it with 644 orphans.
 *
 * Resolution goes through db.resolveCurriculumTopicId(), the single mapping
 * point (topic_aliases, then curriculum_topics.display_name), so this backfill
 * cannot invent a mapping the readers would not also make. Where a row resolves
 * via its normalised topic, the alias is recorded so the same wording resolves
 * directly next time.
 *
 * Rows whose topic genuinely matches no curriculum topic are left alone by
 * default. REGISTER_MISSING_TOPICS=1 first maps configured flagship aliases,
 * then registers only topics that already own generated teaching content.
 * Plain search-result papers never create curriculum topics on their own.
 *
 *   DRY_RUN=0 node server/scripts/backfillTeachingObjectTopics.js
 *   DRY_RUN=0 LIMIT=500 node server/scripts/backfillTeachingObjectTopics.js
 *   DRY_RUN=0 REGISTER_MISSING_TOPICS=1 node server/scripts/backfillTeachingObjectTopics.js
 */

const path = require('path');
const { loadEnv } = require('../../config');
loadEnv();

const db = require('../../database');
const { loadFlagshipConfig } = require('../services/flagshipTopicOps');
const {
    buildFlagshipMatcher,
    resolveOrRegisterTopic,
} = require('../services/teachingObjectTopicReconciliation');

const DRY_RUN = process.env.DRY_RUN !== '0';
const LIMIT = Number(process.env.LIMIT) > 0 ? Number(process.env.LIMIT) : Infinity;
const REGISTER_MISSING_TOPICS = process.env.REGISTER_MISSING_TOPICS === '1';

async function main() {
    await db.connect();

    const orphans = await db.all(
        `SELECT id, object_type, topic, normalized_topic
           FROM teaching_objects
          WHERE curriculum_topic_id IS NULL
          ORDER BY updated_at DESC NULLS LAST`,
        [],
    );
    const work = orphans.slice(0, LIMIT === Infinity ? orphans.length : LIMIT);
    console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}orphaned teaching objects: ${orphans.length}` +
        (work.length !== orphans.length ? ` (processing ${work.length})` : ''));

    const normalize = (value) => db.normalizeTopic(value);
    const flagshipMatcher = buildFlagshipMatcher(loadFlagshipConfig().topics, normalize);
    const typesByTopic = new Map();
    for (const row of orphans) {
        const topic = row.topic || row.normalized_topic || '';
        if (!typesByTopic.has(topic)) typesByTopic.set(topic, new Set());
        typesByTopic.get(topic).add(row.object_type);
    }
    const resolutionCache = new Map();
    const stats = { scanned: 0, resolved: 0, aliased: 0, registeredTopics: 0, matchedFlagship: 0, unresolved: 0 };
    const unresolvedTopics = new Map();

    for (const row of work) {
        stats.scanned += 1;
        const topic = row.topic || row.normalized_topic || '';
        let resolution = resolutionCache.get(topic);
        if (!resolution) {
            resolution = topic
                ? await resolveOrRegisterTopic(db, topic, typesByTopic.get(topic) || new Set(), flagshipMatcher, {
                    registerMissing: REGISTER_MISSING_TOPICS && !DRY_RUN,
                })
                : { topicId: null, registered: false, matchedFlagship: false };
            resolutionCache.set(topic, resolution);
            if (resolution.registered) stats.registeredTopics += 1;
            if (resolution.matchedFlagship) stats.matchedFlagship += 1;
        }
        const topicId = resolution.topicId;
        if (!topicId) {
            stats.unresolved += 1;
            const key = String(topic || '(null)').slice(0, 80);
            unresolvedTopics.set(key, (unresolvedTopics.get(key) || 0) + 1);
            continue;
        }
        if (!DRY_RUN) {
            await db.run('UPDATE teaching_objects SET curriculum_topic_id = ? WHERE id = ?', [topicId, row.id]);
            // Record the wording so the next reader resolves without the fallback.
            const recorded = await db.recordTopicAlias(topic, topicId, 'backfill', 0.7).catch(() => false);
            if (recorded) stats.aliased += 1;
        }
        stats.resolved += 1;
    }

    const remaining = await db.get('SELECT COUNT(*) AS c FROM teaching_objects WHERE curriculum_topic_id IS NULL');
    console.log(JSON.stringify({ ...stats, orphansRemaining: Number(remaining?.c || 0) }, null, 2));

    if (unresolvedTopics.size) {
        console.log(`\nTopics that match no curriculum topic (${unresolvedTopics.size} distinct) -- left unattached:`);
        [...unresolvedTopics.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)
            .forEach(([t, n]) => console.log(`  ${String(n).padStart(5)}  ${t}`));
        console.log('\n  Fix by adding a curriculum topic or a topic_aliases row, then re-run.');
    }
    if (DRY_RUN) console.log('\nDRY RUN -- nothing written. Re-run with DRY_RUN=0 to apply.');
    else if (!REGISTER_MISSING_TOPICS && stats.unresolved > 0) {
        console.log('\nSet REGISTER_MISSING_TOPICS=1 to map flagship aliases and register generated teaching topics.');
    }
    process.exit(0);
}

main().catch((err) => { console.error('backfill failed:', err.message); process.exit(1); });
