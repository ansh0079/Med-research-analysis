const { updateCard, getDueCards, countDueCards, listAllCardsGroupedByTopic } = require('../../server/services/spacedRepService');

function buildMockDb(initialRows = []) {
    const rows = [...initialRows];
    return {
        _rows: rows,
        async get(sql, params) {
            const [userId, normalizedTopic, outlineNodeId] = params;
            return rows.find((r) => r.user_id === userId && r.normalized_topic === normalizedTopic && r.outline_node_id === outlineNodeId) || null;
        },
        async run(sql, params) {
            if (sql.startsWith('UPDATE')) {
                const [stability, difficulty, state, lapses, intervalDays, easiness, repetitions, dueAt, userId, normalizedTopic, outlineNodeId] = params;
                const row = rows.find((r) => r.user_id === userId && r.normalized_topic === normalizedTopic && r.outline_node_id === outlineNodeId);
                Object.assign(row, { stability, difficulty, state, lapses, interval_days: intervalDays, easiness, repetitions, due_at: dueAt, last_reviewed_at: 'now' });
            } else {
                const [userId, topic, normalizedTopic, outlineNodeId, outlineLabel, stability, difficulty, state, lapses, intervalDays, easiness, repetitions, dueAt] = params;
                rows.push({
                    user_id: userId, topic, normalized_topic: normalizedTopic, outline_node_id: outlineNodeId, outline_label: outlineLabel,
                    stability, difficulty, state, lapses, interval_days: intervalDays, easiness, repetitions, due_at: dueAt, last_reviewed_at: 'now',
                });
            }
        },
        async all(sql, params) {
            const userId = params[0];
            return rows.filter((r) => r.user_id === userId);
        },
    };
}

describe('spacedRepService (FSRS-backed)', () => {
    test('updateCard creates a new FSRS card on first attempt', async () => {
        const db = buildMockDb();
        await updateCard(db, {
            userId: 'u1', topic: 'ARDS', normalizedTopic: 'ards', outlineNodeId: 'tp-1',
            outlineLabel: 'Lung protective ventilation', isCorrect: true, timeMs: 5000,
        });
        expect(db._rows).toHaveLength(1);
        const card = db._rows[0];
        expect(card.stability).toBeGreaterThan(0);
        expect(card.difficulty).toBeGreaterThanOrEqual(1);
        expect(card.difficulty).toBeLessThanOrEqual(10);
        expect(card.state).toBe('review');
        expect(card.lapses).toBe(0);
    });

    test('updateCard on an incorrect answer marks the card relearning with a short due date', async () => {
        const db = buildMockDb();
        await updateCard(db, {
            userId: 'u1', topic: 'ARDS', normalizedTopic: 'ards', outlineNodeId: 'tp-1',
            outlineLabel: null, isCorrect: false, timeMs: null,
        });
        const card = db._rows[0];
        expect(card.state).toBe('relearning');
        expect(card.lapses).toBe(1);
        expect(card.interval_days).toBeLessThanOrEqual(1);
    });

    test('updateCard is idempotent per (user, topic, node) — updates in place rather than duplicating', async () => {
        const db = buildMockDb();
        await updateCard(db, { userId: 'u1', topic: 'ARDS', normalizedTopic: 'ards', outlineNodeId: 'tp-1', isCorrect: true, timeMs: 5000 });
        await updateCard(db, { userId: 'u1', topic: 'ARDS', normalizedTopic: 'ards', outlineNodeId: 'tp-1', isCorrect: true, timeMs: 5000 });
        expect(db._rows).toHaveLength(1);
        expect(db._rows[0].repetitions).toBe(2);
    });

    test('countDueCards counts only cards due now', async () => {
        const past = new Date(Date.now() - 86400000).toISOString().replace('T', ' ').slice(0, 19);
        const future = new Date(Date.now() + 86400000 * 30).toISOString().replace('T', ' ').slice(0, 19);
        const db = buildMockDb([
            { user_id: 'u1', due_at: past },
            { user_id: 'u1', due_at: future },
        ]);
        // countDueCards uses db.get with a raw SQL COUNT — simulate that separately
        db.get = async () => ({ cnt: db._rows.filter((r) => r.due_at <= new Date().toISOString().replace('T', ' ').slice(0, 19)).length });
        const count = await countDueCards(db, 'u1');
        expect(count).toBe(1);
    });

    test('getDueCards returns FSRS fields (stability, difficulty, state, lapses)', async () => {
        const db = buildMockDb();
        await updateCard(db, { userId: 'u1', topic: 'ARDS', normalizedTopic: 'ards', outlineNodeId: 'tp-1', isCorrect: true, timeMs: 5000 });
        db.all = async () => db._rows;
        const cards = await getDueCards(db, 'u1');
        expect(cards).toHaveLength(1);
        expect(cards[0]).toHaveProperty('stability');
        expect(cards[0]).toHaveProperty('difficulty');
        expect(cards[0]).toHaveProperty('state');
        expect(cards[0]).toHaveProperty('lapses');
    });

    test('listAllCardsGroupedByTopic includes a live retrievability estimate', async () => {
        const db = buildMockDb();
        await updateCard(db, { userId: 'u1', topic: 'ARDS', normalizedTopic: 'ards', outlineNodeId: 'tp-1', isCorrect: true, timeMs: 5000 });
        db._rows[0].last_reviewed_at = new Date(Date.now() - 2 * 86400000).toISOString().replace('T', ' ').slice(0, 19);
        db.all = async () => db._rows;
        const topics = await listAllCardsGroupedByTopic(db, 'u1');
        expect(topics).toHaveLength(1);
        expect(topics[0].cards[0].retrievability).not.toBeNull();
        expect(topics[0].cards[0].retrievability).toBeGreaterThan(0);
        expect(topics[0].cards[0].retrievability).toBeLessThanOrEqual(1);
    });
});
