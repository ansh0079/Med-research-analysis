'use strict';

const Sqlite = require('better-sqlite3');
const CaseSessions = require('../../database/mixins/m18-case-sessions');
const { publicCaseSession } = require('../../server/routes/review/cases');
const { recordCaseChoice } = require('../../server/services/caseScenarioService');

function adaptiveDb() {
    const sqlite = new Sqlite(':memory:');
    sqlite.exec(`CREATE TABLE case_sessions (
        id TEXT PRIMARY KEY, user_id TEXT, topic TEXT, normalized_topic TEXT, learning_mode TEXT,
        difficulty TEXT, case_data TEXT, targeted_weaknesses TEXT, evidence_context TEXT,
        evidence_refs TEXT DEFAULT '{}', evidence_status TEXT DEFAULT 'current', evidence_invalidated_at TEXT,
        generation_mode TEXT, arm_id TEXT, status TEXT, current_step INTEGER, responses TEXT,
        total_score INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP, completed_at TEXT
    )`);
    const Base = class {
        normalizeTopic(value) { return String(value).toLowerCase(); }
        async run(sql, params) { return { changes: sqlite.prepare(sql).run(...(params || [])).changes }; }
        async get(sql, params) { return sqlite.prepare(sql).get(...(params || [])); }
        async all(sql, params) { return sqlite.prepare(sql).all(...(params || [])); }
        async withTransaction(fn) { return fn(); }
    };
    return new (CaseSessions(Base))();
}

test('adaptive sessions hide grading fields until the step is answered and accept one response only', async () => {
    const db = adaptiveDb();
    const secretStep = {
        type: 'presentation', narrative: 'Patient presents.', question: 'Next step?', questionType: 'recall',
        options: ['A. One', 'B. Two'], correctAnswer: 'B', explanation: 'Because B.',
        whyOthersWrong: 'A is unsafe.', teachingPoint: 'Choose B.', evidenceSource: 'Guideline 2026',
    };
    const session = await db.createCaseSession({
        userId: 'u1', topic: 'test', caseData: { title: 'Case', steps: [secretStep] },
        evidenceContext: { private: true }, generationMode: 'branching',
    });
    expect(publicCaseSession(session).caseData.steps[0]).not.toHaveProperty('correctAnswer');

    const answered = await db.submitCaseStepResponse(session.id, 0, { selectedAnswer: 'B', isCorrect: true }, {
        nextStep: { ...secretStep, narrative: 'Next presentation.' },
    });
    expect(publicCaseSession(answered).caseData.steps[0]).toHaveProperty('correctAnswer', 'B');
    expect(publicCaseSession(answered).caseData.steps[1]).not.toHaveProperty('correctAnswer');
    await expect(db.submitCaseStepResponse(session.id, 0, { selectedAnswer: 'B' }))
        .rejects.toMatchObject({ code: 'CASE_STEP_CONFLICT', statusCode: 409 });
    expect((await db.getCaseSession(session.id)).caseData.steps).toHaveLength(2);
});

test('legacy terminal choices cannot duplicate attempts on retry', async () => {
    const sqlite = new Sqlite(':memory:');
    sqlite.exec(`
        CREATE TABLE case_scenarios (
            case_id TEXT PRIMARY KEY, user_id TEXT, topic TEXT, difficulty TEXT, vignette TEXT,
            decision_tree TEXT, outcomes TEXT, current_node TEXT, choices_made TEXT,
            created_at TEXT, completed_at TEXT, updated_at TEXT, evidence_status TEXT DEFAULT 'current',
            evidence_invalidated_at TEXT, evidence_snapshot_id TEXT, content_version TEXT, evidence_refs TEXT
        );
        CREATE TABLE case_scenario_attempts (
            user_id TEXT, case_id TEXT, topic TEXT, normalized_topic TEXT, difficulty TEXT,
            score_percentage INTEGER, appropriate_choices INTEGER, total_choices INTEGER,
            outcome_type TEXT, completed_at TEXT
        );
    `);
    const db = {
        normalizeTopic: (value) => String(value).toLowerCase(),
        async run(sql, params) { return { changes: sqlite.prepare(sql).run(...(params || [])).changes }; },
        async get(sql, params) { return sqlite.prepare(sql).get(...(params || [])); },
        async all(sql, params) { return sqlite.prepare(sql).all(...(params || [])); },
    };
    const tree = { start: { options: [{ id: 'b', nextNode: 'outcome_good', isAppropriate: true, feedback: 'Good' }] } };
    await db.run(
        `INSERT INTO case_scenarios (case_id, user_id, topic, difficulty, vignette, decision_tree, outcomes, current_node, choices_made)
         VALUES (?, ?, ?, ?, '{}', ?, ?, 'start', '[]')`,
        ['c1', 'u1', 'topic', 'medium', JSON.stringify(tree), JSON.stringify({ outcome_good: { summary: 'done' } })],
    );
    await expect(recordCaseChoice(db, 'c1', 'u1', 'start', 'b')).resolves.toMatchObject({ isTerminal: true });
    await expect(recordCaseChoice(db, 'c1', 'u1', 'start', 'b'))
        .rejects.toMatchObject({ code: 'CASE_CHOICE_CONFLICT', statusCode: 409 });
    expect((await db.get('SELECT COUNT(*) AS count FROM case_scenario_attempts')).count).toBe(1);
});
