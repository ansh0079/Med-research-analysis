'use strict';

const fs = require('fs');
const path = require('path');

// Helper to build a teaching object payload with MCQs
function makeQuestion(stem, opts = ['A: a', 'B: b', 'C: c', 'D: d'], correct = 'A', explanation = 'orig exp') {
  return { question: stem, options: opts.slice(), correctAnswer: correct, explanation };
}

async function setupDb(db) {
  await db.connect();
  await db.runMigrations();
  // Ensure base tables exist – schema.sql already created them
}

function writeJsonTmp(obj) {
  const file = path.join(__dirname, `../tmp-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2));
  return file;
}

describe('applyMcqReviewEdits script', () => {
  const DATA_ENV = {
    USE_SQLITE: 'true',
    USE_POSTGRES_MAIN: '',
    DATABASE_URL: '',
    DATABASE_PATH: path.join(__dirname, `../tmp-db-${Date.now()}.db`),
    // Let external sqlite migrator run to set a consistent baseline for runMigrations().
    SKIP_BUILTIN_SQLITE_MIGRATE: '0',
  };

  beforeEach(() => {
    jest.resetModules();
    // Set env for the database singleton before requiring modules
    for (const [k, v] of Object.entries(DATA_ENV)) process.env[k] = v;
    process.env.DATABASE_PATH = path.join(__dirname, `../tmp-db-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  });

  afterEach(async () => {
    const db = require('../../database');
    try { await db.close(); } catch { /* ignore */ }
  });

  test('(a) passes newExplanation and optionEdits to applyCorrection', async () => {
    const db = require('../../database');
    await setupDb(db);

    // Insert one object with a 4-option MCQ, correct A
    const objectKey = 'guideline-mcq:topic-slug';
    const stem = 'Which letter is best?';
    const q0 = makeQuestion(stem, ['A: wrong', 'B: ok', 'C: no', 'D: meh'], 'A', 'old exp');
    await db.run(
      `INSERT INTO teaching_objects (object_key, object_type, review_state, object_payload)
       VALUES (?, 'guideline_mcq', 'unreviewed', ?)`,
      [objectKey, JSON.stringify({ mcqs: [q0] })]
    );

    // Build corrections JSON: change B text, set newExplanation, keep suggestedAnswer B
    const dataPath = writeJsonTmp({
      withdrawals: [],
      corrections: [{
        questionId: 'guideline-mcq:topic-slug#0',
        verdict: 'Wrong answer',
        notes: 'fix',
        suggestedAnswer: 'B',
        source: 'Test Source',
        newExplanation: 'new curated explanation',
        optionEdits: [{ letter: 'B', after: 'better B' }],
      }],
    });

    // Run script with --apply
    process.argv = ['node', 'apply', '--data', dataPath, '--apply'];
    const script = require('../../server/scripts/applyMcqReviewEdits.js');
    const summary = await script.run();
    expect(summary.corrections.matched).toBe(1);

    // Verify teaching_objects was updated and B edited, no extra E added
    await db.connect(); // script.run() closes the singleton; reopen to read
    const row = await db.get('SELECT object_payload FROM teaching_objects WHERE object_key = ?', [objectKey]);
    const payload = JSON.parse(row.object_payload);
    const q = payload.mcqs[0];
    expect(q.explanation).toBe('new curated explanation');
    expect(q.options[1]).toBe('B: better B');
    expect(q.options.length).toBe(4);
    expect(q.correctAnswer).toBe('B');

    // Override row carries new_explanation
    const ovr = await db.get('SELECT * FROM mcq_review_overrides WHERE question_id = ?', ['guideline-mcq:topic-slug#0']);
    expect(ovr).toBeTruthy();
    expect(ovr.action).toBe('correct');
    expect(ovr.new_explanation).toBe('new curated explanation');
  });

  test('(b) optionEdits do not pad to E unless editing beyond last index', async () => {
    const db = require('../../database');
    await setupDb(db);
    const objectKey = 'guideline-mcq:topic2';
    const q0 = makeQuestion('Stem 2?', ['A: a1', 'B: b1', 'C: c1', 'D: d1'], 'A', 'exp');
    await db.run(
      `INSERT INTO teaching_objects (object_key, object_type, review_state, object_payload)
       VALUES (?, 'guideline_mcq', 'unreviewed', ?)`,
      [objectKey, JSON.stringify({ mcqs: [q0] })]
    );
    const dataPath = writeJsonTmp({
      withdrawals: [],
      corrections: [{
        questionId: 'guideline-mcq:topic2#0',
        verdict: 'Wrong answer',
        notes: 'fix',
        suggestedAnswer: 'B',
        source: '',
        optionEdits: [{ letter: 'B', after: 'b2' }], // edit within existing range
      }],
    });
    process.argv = ['node', 'apply', '--data', dataPath, '--apply'];
    const script = require('../../server/scripts/applyMcqReviewEdits.js');
    const summary = await script.run();
    expect(summary.corrections.matched).toBe(1);
    await db.connect();
    const row = await db.get('SELECT object_payload FROM teaching_objects WHERE object_key = ?', [objectKey]);
    const q = JSON.parse(row.object_payload).mcqs[0];
    expect(q.options).toEqual(['A: a1', 'B: b2', 'C: c1', 'D: d1']); // still 4 options, no "E: "
  });

  test('(c) dry-run makes zero writes to overrides and index', async () => {
    const db = require('../../database');
    await setupDb(db);
    const objectKey = 'guideline-mcq:topic3';
    const q0 = makeQuestion('Stem 3?', ['A: a', 'B: b', 'C: c', 'D: d'], 'A', 'exp');
    await db.run(
      `INSERT INTO teaching_objects (object_key, object_type, review_state, object_payload)
       VALUES (?, 'guideline_mcq', 'unreviewed', ?)`,
      [objectKey, JSON.stringify({ mcqs: [q0] })]
    );
    // Seed index row as aligned
    await db.run(
      `INSERT INTO question_topic_index
       (object_key, question_index, question_hash, object_type, assigned_curriculum_topic_id, assigned_topic_name,
        assigned_cluster_id, category, classifier_version, classified_at)
       VALUES (?, 0, ?, 'guideline_mcq', 'TID', 'Topic', 'C1', 'aligned', 'v', 'now')`,
      [objectKey, require('../../server/services/questionIndex/questionIndexService').questionHash(q0)]
    );

    const dataPath = writeJsonTmp({
      withdrawals: [{ questionId: 'guideline-mcq:topic3#0', verdict: 'Unsupported', reason: 'r', notes: 'n' }],
      corrections: [{
        questionId: 'guideline-mcq:topic3#0',
        verdict: 'Wrong answer',
        notes: 'n',
        suggestedAnswer: 'B',
        source: '',
        newExplanation: 'e2',
        optionEdits: [{ letter: 'B', after: 'new b' }],
      }],
    });
    process.argv = ['node', 'apply', '--data', dataPath, '--dry-run'];
    const script = require('../../server/scripts/applyMcqReviewEdits.js');
    const summary = await script.run();
    expect(summary.withdrawals.matched).toBe(1);
    expect(summary.corrections.matched).toBe(1);

    // No override rows
    await db.connect();
    const cnt = await db.get('SELECT COUNT(*) AS n FROM mcq_review_overrides', []);
    expect(cnt.n || cnt.N || 0).toBe(0);
    // Index row remains aligned (no category flip to 'unassignable' in dry-run)
    const idx = await db.get('SELECT review_state, category FROM question_topic_index WHERE object_key = ? AND question_index = 0', [objectKey]);
    expect(idx.category).toBe('aligned');
  });

  test('(d) verdict Outdated applies edits and stores new hash with action correct', async () => {
    const db = require('../../database');
    await setupDb(db);
    const objectKey = 'guideline-mcq:topic4';
    const q0 = makeQuestion('Old stem?', ['A: a', 'B: b'], 'A', 'exp');
    await db.run(
      `INSERT INTO teaching_objects (object_key, object_type, review_state, object_payload)
       VALUES (?, 'guideline_mcq', 'unreviewed', ?)`,
      [objectKey, JSON.stringify({ mcqs: [q0] })]
    );
    const dataPath = writeJsonTmp({
      withdrawals: [],
      corrections: [{
        questionId: 'guideline-mcq:topic4#0',
        verdict: 'Outdated',
        notes: 'update stem and option',
        suggestedAnswer: 'B',
        source: 'Ref',
        stemFix: 'Newer stem?',
        optionEdits: [{ letter: 'B', after: 'new b' }],
        newExplanation: 'updated exp',
      }],
    });
    process.argv = ['node', 'apply', '--data', dataPath, '--apply'];
    const script = require('../../server/scripts/applyMcqReviewEdits.js');
    const summary = await script.run();
    expect(summary.corrections.matched).toBe(1);
    await db.connect();
    const row = await db.get('SELECT object_payload FROM teaching_objects WHERE object_key = ?', [objectKey]);
    const q = JSON.parse(row.object_payload).mcqs[0];
    expect(q.question).toBe('Newer stem?');
    expect(q.options[1]).toBe('B: new b');
    expect(q.correctAnswer).toBe('B');
    expect(q.explanation).toBe('updated exp');
    const hash = require('../../server/services/questionIndex/questionIndexService').questionHash(q);
    const ovr = await db.get('SELECT * FROM mcq_review_overrides WHERE question_id = ?', ['guideline-mcq:topic4#0']);
    expect(ovr.action).toBe('correct');
    expect(ovr.verdict).toBe('Outdated');
    expect(ovr.question_hash).toBe(hash);
  });
});

