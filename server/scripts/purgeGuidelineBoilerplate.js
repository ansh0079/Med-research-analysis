'use strict';

/**
 * Mark duplicated / boilerplate guideline rows as stale so they are not served.
 *
 * A recommendation copied across many unrelated topics is almost always NICE
 * page chrome, not topic-specific guidance.
 *
 * Usage:
 *   node server/scripts/purgeGuidelineBoilerplate.js
 *   node server/scripts/purgeGuidelineBoilerplate.js --apply
 *   node server/scripts/purgeGuidelineBoilerplate.js --min-topics 15 --apply
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { loadEnv } = require('../../config');
loadEnv();

const db = require('../../database');
const {
    BOILERPLATE_TOPIC_SPAN,
    isBoilerplateGuideline,
} = require('../utils/guidelineRelevance');

function argValue(flag, fallback = null) {
    const idx = process.argv.indexOf(flag);
    return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

const apply = process.argv.includes('--apply');
const minTopics = Math.max(3, parseInt(argValue('--min-topics', String(BOILERPLATE_TOPIC_SPAN)), 10) || BOILERPLATE_TOPIC_SPAN);

async function main() {
    await db.connect();
    if (typeof db.runMigrations === 'function') {
        await db.runMigrations().catch(() => null);
    }

    const duplicated = await db.all(
        `SELECT recommendation_text AS text, COUNT(DISTINCT normalized_topic) AS topic_count, COUNT(*) AS row_count
         FROM topic_guidelines
         WHERE superseded_by_id IS NULL
           AND status NOT IN ('stale', 'superseded')
           AND length(coalesce(recommendation_text, '')) >= 40
         GROUP BY recommendation_text
         HAVING COUNT(DISTINCT normalized_topic) > ?
         ORDER BY topic_count DESC
         LIMIT 500`,
        [minTopics]
    );

    const sample = await db.all(
        `SELECT id, topic, recommendation_text AS text, status
         FROM topic_guidelines
         WHERE superseded_by_id IS NULL
           AND status NOT IN ('stale', 'superseded')
         LIMIT 4000`
    );
    const patternHits = (sample || []).filter((row) => isBoilerplateGuideline(row.text));

    console.log(`Duplicate texts spanning >${minTopics} topics: ${duplicated.length}`);
    console.log(`Boilerplate-pattern hits in sample of ${sample.length}: ${patternHits.length}`);
    for (const row of duplicated.slice(0, 8)) {
        console.log(`  ${row.topic_count} topics / ${row.row_count} rows: ${String(row.text).slice(0, 120)}`);
    }

    if (!apply) {
        console.log('Dry-run only. Re-run with --apply to mark matching rows stale.');
        await db.close?.();
        return;
    }

    const now = new Date().toISOString();
    let updated = 0;
    for (const row of duplicated) {
        const result = await db.run(
            `UPDATE topic_guidelines
             SET status = 'stale', updated_at = ?
             WHERE recommendation_text = ?
               AND superseded_by_id IS NULL
               AND status NOT IN ('stale', 'superseded')`,
            [now, row.text]
        );
        updated += Number(result?.changes || result?.rowCount || 0);
    }
    for (const row of patternHits) {
        const result = await db.run(
            `UPDATE topic_guidelines
             SET status = 'stale', updated_at = ?
             WHERE id = ?
               AND status NOT IN ('stale', 'superseded')`,
            [now, row.id]
        );
        updated += Number(result?.changes || result?.rowCount || 0);
    }

    console.log(`Marked ${updated} rows stale.`);
    await db.close?.();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
