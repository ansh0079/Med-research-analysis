// ==========================================
// getConceptHashPValues integration test — real SQLite
// ==========================================

const path = require('path');
const fs = require('fs');
const { Database } = require('../../database');
const { computeConceptHash } = require('../../server/utils/conceptHash');

const TEST_DB_PATH = path.join(__dirname, '__concept_hash_pvalues_test__.db');

describe('getConceptHashPValues (real SQLite)', () => {
    let db;

    beforeAll(async () => {
        if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
        db = new Database(TEST_DB_PATH);
        await db.connect();
        await db.runMigrations();
        await db.run(
            `INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)`,
            ['u-pv', 'pv@example.com', 'hash', 'PValue Test User', 'user']
        );
    });

    afterAll(async () => {
        await db.close();
        if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    });

    beforeEach(async () => {
        await db.run(`DELETE FROM quiz_attempts WHERE user_id = ?`, ['u-pv']);
    });

    async function insertAttempt({ userId, conceptHash, isCorrect }) {
        await db.run(
            `INSERT INTO quiz_attempts (user_id, topic, normalized_topic, question_id, question_type, question_text, user_answer, correct_answer, is_correct, concept_hash, created_at)
             VALUES (?, 'ARDS', 'ards', ?, 'recall', 'q', 'A', 'A', ?, ?, datetime('now'))`,
            [userId, `q-${Math.random()}`, isCorrect ? 1 : 0, conceptHash]
        );
    }

    test('returns empty map for an empty hash list', async () => {
        const result = await db.getConceptHashPValues('ards', []);
        expect(result.size).toBe(0);
    });

    test('omits items with fewer than 3 attempts (not enough signal yet)', async () => {
        const hash = computeConceptHash({ normalizedTopic: 'ards', questionType: 'recall', questionText: 'q text' });
        await insertAttempt({ userId: 'u-pv', conceptHash: hash, isCorrect: true });
        await insertAttempt({ userId: 'u-pv', conceptHash: hash, isCorrect: true });

        const result = await db.getConceptHashPValues('ards', [hash]);
        expect(result.has(hash)).toBe(false);
    });

    test('computes p-value once at least 3 attempts exist', async () => {
        const hash = computeConceptHash({ normalizedTopic: 'ards', questionType: 'recall', questionText: 'q text 2' });
        await insertAttempt({ userId: 'u-pv', conceptHash: hash, isCorrect: true });
        await insertAttempt({ userId: 'u-pv', conceptHash: hash, isCorrect: true });
        await insertAttempt({ userId: 'u-pv', conceptHash: hash, isCorrect: false });
        await insertAttempt({ userId: 'u-pv', conceptHash: hash, isCorrect: false });

        const result = await db.getConceptHashPValues('ards', [hash]);
        expect(result.get(hash)).toBe(0.5);
    });

    test('looks up multiple hashes at once', async () => {
        const hashA = computeConceptHash({ normalizedTopic: 'ards', questionType: 'recall', questionText: 'question A' });
        const hashB = computeConceptHash({ normalizedTopic: 'ards', questionType: 'recall', questionText: 'question B' });
        for (let i = 0; i < 3; i++) await insertAttempt({ userId: 'u-pv', conceptHash: hashA, isCorrect: true });
        for (let i = 0; i < 3; i++) await insertAttempt({ userId: 'u-pv', conceptHash: hashB, isCorrect: false });

        const result = await db.getConceptHashPValues('ards', [hashA, hashB]);
        expect(result.get(hashA)).toBe(1);
        expect(result.get(hashB)).toBe(0);
    });
});
