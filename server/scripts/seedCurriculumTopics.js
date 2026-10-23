'use strict';

/**
 * Seeds curriculum_topics and topic_aliases for all canonical curriculum topics.
 * Reads the 8 canonical range files (1,875 topics) and populates:
 *   - curricula ('core-clinical-topics')
 *   - curriculum_blocks (by specialty or clinical category)
 *   - curriculum_topics
 *   - topic_aliases (alias -> curriculum_topic_id)
 */

const fs = require('fs');
const path = require('path');
const db = require('../../database');
const { expandNormalizedTopicKeys } = require('../utils/topicSynonyms');

const RANGE_FILES = [
    'topics-0001-0250.json',
    'topics-0251-0500.json',
    'topics-0501-0750.json',
    'topics-0751-1000.json',
    'topics-1001-1250.json',
    'topics-1251-1500.json',
    'topics-1501-1750.json',
    'topics-1751-1875.json'
];

async function main() {
    await db.connect();
    console.log('Connected to database.');

    const candidateDirs = [
        path.join(__dirname, '../topic-drafts'),
        path.join(process.cwd(), 'topic-drafts')
    ];
    const draftsDir = candidateDirs.find((d) => fs.existsSync(d) && fs.existsSync(path.join(d, RANGE_FILES[0])));
    if (!draftsDir) {
        console.error('Could not find topic-drafts directory.');
        process.exit(1);
    }

    const allDrafts = [];
    for (const rf of RANGE_FILES) {
        const fullPath = path.join(draftsDir, rf);
        if (fs.existsSync(fullPath)) {
            const items = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            for (const item of items) {
                allDrafts.push(item);
            }
        }
    }
    console.log(`Loaded ${allDrafts.length} topics from range files.`);

    // 1. Ensure primary curriculum
    let curriculum = await db.get("SELECT id FROM curricula WHERE slug = 'core-clinical-topics'");
    if (!curriculum) {
        await db.run(
            `INSERT INTO curricula (slug, name, exam_stage_label, description, sort_order)
             VALUES ('core-clinical-topics', 'Core Clinical Curriculum', 'General & Specialist Practice', 'Comprehensive medical curriculum covering 1,875 core clinical topics.', 1)`
        );
        curriculum = await db.get("SELECT id FROM curricula WHERE slug = 'core-clinical-topics'");
    }
    const curriculumId = curriculum.id;

    // 2. Ensure default blocks
    const blockCache = new Map();
    async function getBlockId(name) {
        const blockName = (name || 'General Clinical Medicine').trim();
        if (blockCache.has(blockName)) return blockCache.get(blockName);
        let block = await db.get("SELECT id FROM curriculum_blocks WHERE curriculum_id = ? AND name = ?", [curriculumId, blockName]);
        if (!block) {
            await db.run(
                "INSERT INTO curriculum_blocks (curriculum_id, name, sort_order) VALUES (?, ?, ?)",
                [curriculumId, blockName, blockCache.size + 1]
            );
            block = await db.get("SELECT id FROM curriculum_blocks WHERE curriculum_id = ? AND name = ?", [curriculumId, blockName]);
        }
        blockCache.set(blockName, block.id);
        return block.id;
    }

    let topicsInserted = 0;
    let aliasesInserted = 0;

    for (const d of allDrafts) {
        const displayName = (d.topic || '').trim();
        if (!displayName) continue;

        const cluster = d.cluster || null;
        const blockId = await getBlockId(cluster || 'General Clinical Medicine');
        const suggestedQuery = displayName;

        // Upsert curriculum_topic
        let existing = await db.get("SELECT id FROM curriculum_topics WHERE LOWER(display_name) = LOWER(?)", [displayName]);
        let topicId;
        if (existing) {
            topicId = existing.id;
        } else {
            await db.run(
                `INSERT INTO curriculum_topics (block_id, display_name, suggested_query, sort_order, priority, volatility, seed_status)
                 VALUES (?, ?, ?, ?, 'high', 'moderate', 'seeded')`,
                [blockId, displayName, suggestedQuery, topicsInserted + 1]
            );
            const created = await db.get("SELECT id FROM curriculum_topics WHERE LOWER(display_name) = LOWER(?)", [displayName]);
            topicId = created ? created.id : null;
            topicsInserted++;
        }

        if (topicId) {
            // Seed topic_aliases
            const norm = db.normalizeTopic(displayName);
            const aliases = new Set([norm]);
            expandNormalizedTopicKeys(norm, (s) => db.normalizeTopic(s)).forEach((k) => aliases.add(k));

            for (const alias of aliases) {
                if (!alias) continue;
                const existingAlias = await db.get(
                    "SELECT curriculum_topic_id FROM topic_aliases WHERE alias_norm = ?",
                    [alias]
                );
                if (!existingAlias) {
                    await db.run(
                        `INSERT INTO topic_aliases (alias_norm, curriculum_topic_id, confidence, resolution)
                         VALUES (?, ?, 1.0, 'canonical_seed')`,
                        [alias, String(topicId)]
                    );
                    aliasesInserted++;
                }
            }
        }
    }

    console.log(`Seeding complete:`);
    console.log(`  curriculum_topics inserted: ${topicsInserted}`);
    console.log(`  topic_aliases inserted: ${aliasesInserted}`);

    // Verify resolveCurriculumTopicId works now
    const asthmaId = await db.resolveCurriculumTopicId('asthma');
    console.log('Verification: resolveCurriculumTopicId("asthma") =', asthmaId);

    await db.close();
}

main().catch((err) => {
    console.error('Curriculum seed error:', err);
    process.exit(1);
});
