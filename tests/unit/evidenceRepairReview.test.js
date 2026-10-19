'use strict';

const Database = require('better-sqlite3');
const os = require('os');
const path = require('path');
const fs = require('fs');

const {
    listQuestionWorkQueue,
    reviewEvidenceRepairItem,
    EVIDENCE_REPAIR_COHORTS,
} = require('../../server/services/questionIndex/questionIndexReviewService');

const DDL = `
CREATE TABLE question_work_queue (
  object_key TEXT, question_index INTEGER, cohort TEXT, status TEXT, topic TEXT,
  evidence_kind TEXT, reason TEXT, assigned_to TEXT, created_at TEXT, updated_at TEXT, completed_at TEXT
);
CREATE TABLE teaching_objects (
  object_key TEXT, object_type TEXT, topic TEXT, object_payload TEXT
);
CREATE TABLE mcq_review_overrides (
  question_id TEXT PRIMARY KEY, object_key TEXT, question_index INTEGER, action TEXT, verdict TEXT,
  reason TEXT, notes TEXT, suggested_answer TEXT, new_explanation TEXT,
  old_question_json TEXT, new_question_json TEXT, question_hash TEXT, applied_at TEXT, applied_by TEXT
);
CREATE TABLE question_audit (
  object_key TEXT NOT NULL,
  question_index INTEGER NOT NULL,
  question_hash TEXT NOT NULL,
  object_type TEXT NOT NULL,
  topic TEXT,
  content_hash TEXT NOT NULL,
  evidence TEXT,
  pre_flag_reason TEXT,
  in_random_sample INTEGER NOT NULL DEFAULT 0,
  stage1_verdict TEXT, stage1_severity TEXT, stage1_issues TEXT, stage1_model TEXT, stage1_at TEXT,
  stage2_verdict TEXT, stage2_severity TEXT, stage2_issues TEXT, stage2_model TEXT, stage2_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  human_decision TEXT, human_notes TEXT, reviewed_by TEXT, reviewed_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (object_key, question_index)
);
CREATE TABLE question_topic_index (
  object_key TEXT, question_index INTEGER, category TEXT, review_state TEXT,
  assigned_topic_name TEXT, topic_similarity REAL, guideline_support INTEGER, paper_support INTEGER,
  reasons TEXT, evidence_support TEXT, evidence_guideline_ids TEXT, evidence_paper_uids TEXT,
  original_topic TEXT, assigned_curriculum_topic_id TEXT, assigned_cluster_id TEXT,
  reviewed_by TEXT, reviewed_at TEXT, review_notes TEXT
);
`;

function makeDb() {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ev-review-')), 'test.db');
    const sqlite = new Database(file);
    sqlite.exec(DDL);
    sqlite.prepare(
        `INSERT INTO question_work_queue
         (object_key, question_index, cohort, status, topic, evidence_kind, reason, created_at, updated_at)
         VALUES ('obj:sepsis', 0, 'evidence_support_weak', 'pending', 'sepsis', 'dangling_numeric_ref', 'evidence_support_weak', 't', 't')`
    ).run();
    sqlite.prepare(
        `INSERT INTO teaching_objects (object_key, object_type, topic, object_payload)
         VALUES ('obj:sepsis', 'cold_start_mcq', 'sepsis', ?)`
    ).run(JSON.stringify({ mcqs: [{ question: 'Which vasopressor first-line in sepsis?', options: ['a', 'b', 'c', 'd'], explanation: 'Norepinephrine per SSC guidelines.' }] }));
    return {
        sqlite,
        get: (s, p = []) => Promise.resolve().then(() => sqlite.prepare(s).get(...p)),
        all: (s, p = []) => Promise.resolve().then(() => sqlite.prepare(s).all(...p)),
        run: (s, p = []) => Promise.resolve().then(() => sqlite.prepare(s).run(...p)),
    };
}

describe('reviewEvidenceRepairItem', () => {
    test('rejects invalid cohorts and decisions', async () => {
        const db = makeDb();
        await expect(reviewEvidenceRepairItem(db, { objectKey: 'obj:sepsis', questionIndex: 0, cohort: 'topic_repair', decision: 'approved' }))
            .rejects.toThrow(/Invalid evidence repair cohort/);
        await expect(reviewEvidenceRepairItem(db, { objectKey: 'obj:sepsis', questionIndex: 0, cohort: 'evidence_support_weak', decision: 'unreviewed' }))
            .rejects.toThrow(/Invalid review decision/);
        db.sqlite.close();
    });

    test('approved marks the queue row repaired and writes the audit ledger', async () => {
        const db = makeDb();
        const row = await reviewEvidenceRepairItem(db, {
            objectKey: 'obj:sepsis', questionIndex: 0, cohort: 'evidence_support_weak',
            decision: 'approved', notes: 'explanation is evidence enough', userId: 'curator1',
        });
        expect(row.status).toBe('repaired');
        expect(row.completed_at).toBeTruthy();
        expect(row.assigned_to).toBe('curator1');
        const audit = await db.get('SELECT * FROM question_audit WHERE object_key = ?', ['obj:sepsis']);
        expect(audit.human_decision).toBe('approved');
        expect(audit.reviewed_by).toBe('curator1');
        expect(audit.human_notes).toContain('explanation is evidence enough');
        // Ledger row must satisfy the real NOT NULL schema and carry the hashes.
        expect(audit.question_hash).toBeTruthy();
        expect(audit.content_hash).toBeTruthy();
        expect(audit.object_type).toBe('cold_start_mcq');
        expect(audit.updated_at).toBeTruthy();
        db.sqlite.close();
    });

    test('ledger upserts when an audit row already exists', async () => {
        const db = makeDb();
        db.sqlite.prepare(
            `INSERT INTO question_audit
             (object_key, question_index, question_hash, object_type, topic, content_hash, status, updated_at)
             VALUES ('obj:sepsis', 0, 'oldhash', 'cold_start_mcq', 'sepsis', 'oldcontent', 'needs_human', 't')`
        ).run();
        await reviewEvidenceRepairItem(db, {
            objectKey: 'obj:sepsis', questionIndex: 0, cohort: 'evidence_support_weak',
            decision: 'retired', notes: 'stale audit row', userId: 'curator1',
        });
        const rows = await db.all('SELECT * FROM question_audit WHERE object_key = ?', ['obj:sepsis']);
        expect(rows).toHaveLength(1);
        expect(rows[0].human_decision).toBe('retired');
        expect(rows[0].content_hash).not.toBe('oldcontent');
        db.sqlite.close();
    });

    test('retired inserts a withdrawal override and is idempotent', async () => {
        const db = makeDb();
        await reviewEvidenceRepairItem(db, {
            objectKey: 'obj:sepsis', questionIndex: 0, cohort: 'evidence_support_weak',
            decision: 'retired', notes: 'cannot verify citation', userId: 'curator1',
        });
        const withdrawals = await db.all(
            `SELECT * FROM mcq_review_overrides WHERE object_key = 'obj:sepsis' AND action = 'withdraw'`
        );
        expect(withdrawals).toHaveLength(1);
        expect(withdrawals[0].reason).toBe('evidence_support_weak');
        expect(withdrawals[0].applied_by).toBe('curator1');
        // Re-retire must not double-insert (even though the queue row blocks it,
        // test the override guard directly by resetting status).
        db.sqlite.prepare(
            `UPDATE question_work_queue SET status = 'pending' WHERE object_key = 'obj:sepsis'`
        ).run();
        await reviewEvidenceRepairItem(db, {
            objectKey: 'obj:sepsis', questionIndex: 0, cohort: 'evidence_support_weak',
            decision: 'retired', userId: 'curator1',
        });
        const after = await db.all(
            `SELECT * FROM mcq_review_overrides WHERE object_key = 'obj:sepsis' AND action = 'withdraw'`
        );
        expect(after).toHaveLength(1);
        db.sqlite.close();
    });

    test('question_id is globally unique across objects sharing a file suffix', async () => {
        const db = makeDb();
        // Both objects end in ':file3' — the old split(':').pop() derivation
        // produced 'file3#2' for both and crashed on the overrides PRIMARY KEY.
        for (const [key, qid] of [['obj:a:file3', 'paper-mcq:a#2'], ['obj:b:file3', 'paper-mcq:b#2']]) {
            db.sqlite.prepare(
                `INSERT INTO question_work_queue
                 (object_key, question_index, cohort, status, topic, created_at, updated_at)
                 VALUES (?, 2, 'evidence_not_resolvable_in_app_db', 'pending', 'topic', 't', 't')`
            ).run(key);
            db.sqlite.prepare(
                'INSERT INTO teaching_objects (object_key, object_type, topic, object_payload) VALUES (?, ?, ?, ?)'
            ).run(key, 'verified_topic_mcq', 'topic', JSON.stringify({
                mcqs: [null, null, { id: qid, question: 'Shared-suffix collision question?', options: { A: 'x', B: 'y' }, explanation: 'e '.repeat(20) }],
            }));
            await reviewEvidenceRepairItem(db, {
                objectKey: key, questionIndex: 2, cohort: 'evidence_not_resolvable_in_app_db',
                decision: 'retired', userId: 'curator1',
            });
        }
        const rows = await db.all(`SELECT question_id FROM mcq_review_overrides WHERE action = 'withdraw' ORDER BY question_id`);
        expect(rows.map((r) => r.question_id)).toEqual(['paper-mcq:a#2', 'paper-mcq:b#2']);
        db.sqlite.close();
    });

    test('already-completed items are rejected', async () => {
        const db = makeDb();
        await reviewEvidenceRepairItem(db, { objectKey: 'obj:sepsis', questionIndex: 0, cohort: 'evidence_support_weak', decision: 'approved' });
        await expect(reviewEvidenceRepairItem(db, { objectKey: 'obj:sepsis', questionIndex: 0, cohort: 'evidence_support_weak', decision: 'retired' }))
            .rejects.toThrow(/already repaired/);
        db.sqlite.close();
    });

    test('missing queue row throws not found', async () => {
        const db = makeDb();
        await expect(reviewEvidenceRepairItem(db, { objectKey: 'obj:none', questionIndex: 9, cohort: 'evidence_support_weak', decision: 'approved' }))
            .rejects.toThrow(/not found/);
        db.sqlite.close();
    });
});

describe('listQuestionWorkQueue with evidence cohorts', () => {
    test('lists evidence cohort rows with the question payload attached', async () => {
        const db = makeDb();
        const result = await listQuestionWorkQueue(db, { cohort: 'evidence_support_weak', status: 'pending' });
        expect(result.items).toHaveLength(1);
        expect(result.items[0].question.question).toContain('vasopressor');
        expect(result.counts.some((c) => c.cohort === 'evidence_support_weak' && c.count === 1)).toBe(true);
        db.sqlite.close();
    });

    test('both evidence cohorts are accepted; bogus cohorts are not', async () => {
        const db = makeDb();
        for (const cohort of EVIDENCE_REPAIR_COHORTS) {
            await expect(listQuestionWorkQueue(db, { cohort, status: 'pending' })).resolves.toBeTruthy();
        }
        await expect(listQuestionWorkQueue(db, { cohort: 'nonsense', status: 'pending' })).rejects.toThrow(/Invalid/);
        db.sqlite.close();
    });
});
