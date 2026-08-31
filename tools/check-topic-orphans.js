#!/usr/bin/env node
'use strict';

/**
 * Fail when teaching content cannot be reached from the curriculum.
 *
 * `teaching_objects.topic` used to be joined to `curriculum_topics.display_name`
 * by raw string equality. Every seeding pipeline invented its own wording, so 31%
 * of teaching objects and 25% of MCQs silently became unreachable — content the
 * app had paid to generate and could never serve. Migration 090 introduced
 * `topic_aliases` + `teaching_objects.curriculum_topic_id` to fix that.
 *
 * This gate keeps it fixed. Run it against a database after seeding.
 *   node tools/check-topic-orphans.js            # fails on any orphan
 *   ORPHAN_BUDGET=25 node tools/check-topic-orphans.js
 */

const db = require('../database');

const BUDGET = Number(process.env.ORPHAN_BUDGET || 0);

(async () => {
    await db.connect();
    const total = await db.get('SELECT COUNT(*) AS c FROM teaching_objects');
    const orphans = await db.get(
        'SELECT COUNT(*) AS c FROM teaching_objects WHERE curriculum_topic_id IS NULL'
    );
    const n = Number(orphans?.c || 0);
    const t = Number(total?.c || 0);

    if (n > BUDGET) {
        const sample = await db.all(
            'SELECT object_type, topic FROM teaching_objects WHERE curriculum_topic_id IS NULL LIMIT 10'
        );
        console.error(`✖ ${n}/${t} teaching objects have no curriculum topic (budget ${BUDGET}).`);
        console.error('  Unreachable content is content the app cannot serve. Examples:');
        sample.forEach((r) => console.error(`    [${r.object_type}] ${String(r.topic || '(null)').slice(0, 70)}`));
        console.error('\n  Fix: resolve each topic via db.resolveCurriculumTopicId() when writing,');
        console.error('  or add an alias to topic_aliases. Re-run the backfill for existing rows.');
        await db.close();
        process.exit(1);
    }

    console.log(`✔ topic reachability OK — ${t - n}/${t} teaching objects linked to a curriculum topic.`);
    await db.close();
})().catch((err) => {
    console.error('check-topic-orphans failed:', err.message);
    process.exit(1);
});
