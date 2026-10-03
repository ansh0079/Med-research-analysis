'use strict';

/**
 * Import curated, source-grounded MCQs from data/curated-topic-mcqs/*.json
 *
 * Usage:
 *   node server/scripts/importCuratedTopicMcqs.js            # dry-run (default)
 *   node server/scripts/importCuratedTopicMcqs.js --apply    # write to DB
 *
 * Storage shape:
 * - teaching_objects row per topic
 *   object_type: 'curated_topic_mcq'
 *   object_key:  'curated-mcq:<topicKey>'
 *   topic:       topicDisplayName
 *   normalized_topic: db.normalizeTopic(topicDisplayName)
 *   review_state: 'unreviewed'
 *   provider: 'manual'
 *   object_payload: { batch, coverageNote, storedRowCount, mcqs: [...], source: meta }
 */

const fs = require('fs');
const path = require('path');
const db = require('../../database');
const logger = require('../config/logger');
const { validateCuratedTopicBlock, transformCuratedQuestionToStored } = require('../services/curatedMcqImportValidation');

function findBatchFiles(rootDir) {
  const dir = path.resolve(rootDir);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => /^batch-\d+\.json$/i.test(f))
    .map((f) => path.join(dir, f))
    .sort();
}

function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

async function run({ apply = false } = {}) {
  const root = path.join(__dirname, '..', '..', 'data', 'curated-topic-mcqs');
  const files = findBatchFiles(root);
  if (!files.length) {
    console.log(`No curated MCQ batches found in ${root}`);
    return { files: 0, topics: 0, questions: 0, written: 0 };
  }

  await db.connect();
  let totalTopics = 0;
  let totalQuestions = 0;
  let written = 0;

  for (const file of files) {
    const json = readJsonFile(file);
    const batchNo = Number(json.batch || 0) || null;
    const topics = Array.isArray(json.topics) ? json.topics : [];
    console.log(`\nBatch ${path.basename(file)}: ${topics.length} topics`);

    for (const t of topics) {
      const { ok, errors } = validateCuratedTopicBlock(t);
      if (!ok) {
        console.log(`  - ${t?.topicKey || '(unknown)'}: INVALID — ${errors.join('; ')}`);
        continue;
      }
      const storedMcqs = t.mcqs.map(transformCuratedQuestionToStored);
      const objectKey = `curated-mcq:${t.topicKey.trim().toLowerCase()}`;
      const payload = {
        batch: batchNo,
        topicKey: t.topicKey,
        topicDisplayName: t.topicDisplayName,
        storedRowCount: Number(t.storedRowCount || 0),
        coverageNote: t.coverageNote || null,
        source: json.source || null,
        method: json.method || null,
        generatedAt: json.generatedAt || null,
        reviewState: json.reviewState || 'unreviewed',
        mcqs: storedMcqs,
      };
      totalTopics += 1;
      totalQuestions += storedMcqs.length;
      if (apply) {
        await db.upsertTeachingObject({
          objectKey,
          objectType: 'curated_topic_mcq',
          topic: t.topicDisplayName,
          // normalizedTopic resolved inside upsertTeachingObject as needed
          provider: 'manual',
          confidence: 0.9,
          payload,
          reviewState: 'unreviewed',
          generatedAt: json.generatedAt || new Date().toISOString(),
        });
        written += 1;
        console.log(`  - ${t.topicDisplayName} (${storedMcqs.length} MCQs) — upserted as ${objectKey}`);
      } else {
        console.log(`  - ${t.topicDisplayName} (${storedMcqs.length} MCQs) — DRY RUN`);
      }
    }
  }

  await db.close();
  console.log('\nSummary:');
  console.log(`  Files:     ${files.length}`);
  console.log(`  Topics:    ${totalTopics}`);
  console.log(`  Questions: ${totalQuestions}`);
  console.log(`  Written:   ${apply ? written : 0} ${apply ? '(applied)' : '(dry-run)'}`);
  return { files: files.length, topics: totalTopics, questions: totalQuestions, written: apply ? written : 0 };
}

if (require.main === module) {
  const apply = process.argv.includes('--apply');
  run({ apply }).catch((err) => {
    logger.error({ err }, 'Curated MCQ import failed');
    process.exit(1);
  });
}

module.exports = { run };

