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

// `dir` overrides where the batches are read from. In production /app/data is a persistent volume that hides
// the copy baked into the image, so the batches are mounted from the server's checkout instead.
async function run({ apply = false, dir = null } = {}) {
  let db = null;
  const root = dir || path.join(__dirname, '..', '..', 'data', 'curated-topic-mcqs');
  const files = findBatchFiles(root);
  if (!files.length) {
    console.log(`No curated MCQ batches found in ${root}`);
    return { files: 0, topics: 0, questions: 0, written: 0 };
  }

  if (apply) {
    db = require('../../database');
    await db.connect();
  }
  let written = 0;
  const aggregated = new Map(); // topicKey -> merged topic payload

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
      const key = String(t.topicKey || '').trim().toLowerCase();
      if (!key) continue;
      const current = aggregated.get(key) || {
        batch: null,
        topicKey: key,
        topicDisplayName: t.topicDisplayName,
        aliases: [],
        storedRowCount: 0,
        coverageNote: t.coverageNote || null,
        source: json.source || null,
        method: json.method || null,
        generatedAt: json.generatedAt || null,
        reviewState: json.reviewState || 'unreviewed',
        mcqs: [],
      };
      // Merge aliases (unique)
      const aliasSet = new Set(current.aliases);
      (Array.isArray(t.aliases) ? t.aliases : []).forEach((a) => {
        if (typeof a === 'string' && a.trim()) aliasSet.add(a.trim());
      });
      current.aliases = Array.from(aliasSet).slice(0, 50);
      // Merge counts
      current.storedRowCount += Number(t.storedRowCount || 0);
      // Keep first non-null coverage note
      if (!current.coverageNote && t.coverageNote) current.coverageNote = t.coverageNote;
      // Append questions
      const transformed = t.mcqs.map(transformCuratedQuestionToStored);
      current.mcqs.push(...transformed);
      aggregated.set(key, current);
      console.log(`  - ${t.topicDisplayName} (${transformed.length} MCQs) — queued`);
    }
  }

  if (apply && db) await db.close();
  // Apply all aggregated topics
  if (apply) {
    db = require('../../database');
    await db.connect();
    for (const [, payload] of aggregated) {
      const objectKey = `curated-mcq:${payload.topicKey}`;
      await db.upsertTeachingObject({
        objectKey,
        objectType: 'curated_topic_mcq',
        topic: payload.topicDisplayName,
        provider: 'manual',
        confidence: 0.9,
        payload,
        reviewState: 'unreviewed',
        generatedAt: payload.generatedAt || new Date().toISOString(),
      });
      written += 1;
    }
    await db.close();
  }
  // Aggregated summary
  const topicsCount = aggregated.size;
  const questionsCount = Array.from(aggregated.values()).reduce((sum, t) => sum + t.mcqs.length, 0);
  console.log('\nSummary:');
  console.log(`  Files:     ${files.length}`);
  console.log(`  Topics:    ${topicsCount}`);
  console.log(`  Questions: ${questionsCount}`);
  console.log(`  Written:   ${apply ? written : 0} ${apply ? '(applied)' : '(dry-run)'}`);
  return { files: files.length, topics: topicsCount, questions: questionsCount, written: apply ? written : 0 };
}

if (require.main === module) {
  const apply = process.argv.includes('--apply');
  const dirIndex = process.argv.indexOf('--dir');
  const dir = dirIndex >= 0 ? process.argv[dirIndex + 1] : null;
  run({ apply, dir }).catch((err) => {
    console.error('Curated MCQ import failed', err);
    process.exit(1);
  });
}

module.exports = { run };

