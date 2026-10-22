'use strict';

/**
 * Synchronize all 1,875 published mentor drafts from topic-drafts/*.json
 * into topic_mentor_drafts and topic_knowledge in the database (PostgreSQL or SQLite).
 *
 * Usage:
 *   node server/scripts/syncAllMentorDraftsToProd.js [--apply]
 */

const fs = require('fs');
const path = require('path');
const { loadEnv } = require('../../config');
loadEnv();

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');

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

(async () => {
    const draftsDir = path.join(__dirname, '../../topic-drafts');
    const allDrafts = [];

    for (const rf of RANGE_FILES) {
        const fullPath = path.join(draftsDir, rf);
        if (!fs.existsSync(fullPath)) {
            console.warn(`Warning: Range file missing: ${rf}`);
            continue;
        }
        const items = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        for (const item of items) {
            item._sourceBatch = rf.replace('.json', '');
            allDrafts.push(item);
        }
    }

    console.log(`Loaded ${allDrafts.length} drafts across ${RANGE_FILES.length} files. Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);
    if (!APPLY) {
        console.log('Dry run complete. Run with --apply to write to database.');
        process.exit(0);
    }

    const db = require('../../database');
    const { draftToKnowledge } = require('../services/topicMentorDrafts');
    await db.connect();

    let draftUpserted = 0;
    let knowledgeUpserted = 0;
    const now = new Date().toISOString();

    for (const d of allDrafts) {
        const topicId = String(d.topicId || '').trim();
        const topic = String(d.topic || '').trim();
        const cluster = d.cluster || null;
        const page = d.page;
        if (!topicId || !topic || !page) continue;

        const pageJson = JSON.stringify(page);
        const evidenceJson = JSON.stringify(d.dbEvidence || {});
        const sourceBatch = d._sourceBatch || null;
        const pubAt = d.publishedAt || now;

        // 1. Upsert into topic_mentor_drafts
        const existingDraft = await db.get('SELECT topic_id, status FROM topic_mentor_drafts WHERE topic_id = ?', [topicId]);
        if (existingDraft) {
            await db.run(
                `UPDATE topic_mentor_drafts
                 SET topic = ?, cluster = ?, status = 'published', page_json = ?, evidence_json = ?,
                     source_batch = ?, published_at = ?, updated_at = ?
                 WHERE topic_id = ?`,
                [topic, cluster, pageJson, evidenceJson, sourceBatch, pubAt, now, topicId]
            );
        } else {
            await db.run(
                `INSERT INTO topic_mentor_drafts
                 (topic_id, topic, cluster, status, page_json, evidence_json, source_batch, published_at, created_at, updated_at)
                 VALUES (?, ?, ?, 'published', ?, ?, ?, ?, ?, ?)`,
                [topicId, topic, cluster, pageJson, evidenceJson, sourceBatch, pubAt, now, now]
            );
        }
        draftUpserted++;

        // 2. Upsert into topic_knowledge if teaching points exist
        if (Array.isArray(page.teaching_points) && page.teaching_points.length > 0) {
            const { knowledge, sourceArticles } = draftToKnowledge(page);
            try {
                await db.upsertTopicKnowledge(topic, knowledge, sourceArticles, 'human_reviewed', 0.95);
                knowledgeUpserted++;
            } catch (err) {
                console.warn(`Warning: failed to upsert topic_knowledge for "${topic}":`, err.message);
            }
        }

        if (draftUpserted % 250 === 0) {
            console.log(`Progress: ${draftUpserted} / ${allDrafts.length} drafts processed...`);
        }
    }

    console.log(`\nSync finished successfully!`);
    console.log(`  topic_mentor_drafts upserted: ${draftUpserted}`);
    console.log(`  topic_knowledge upserted:     ${knowledgeUpserted}`);

    await db.close();
    process.exit(0);
})().catch((err) => {
    console.error('Fatal sync error:', err);
    process.exit(1);
});
