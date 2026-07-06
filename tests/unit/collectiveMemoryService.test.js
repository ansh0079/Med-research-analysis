const { aggregateCollectiveMemory } = require('../../server/services/collectiveMemoryService');

function buildMockDb({ topicRows, questionStats, wrongAnswers, rawAttempts, existingKnowledge }) {
    const updates = [];
    return {
        updates,
        async all(sql) {
            if (sql.includes('GROUP BY normalized_topic')) return topicRows;
            if (sql.includes('GROUP BY concept_hash\n             HAVING total_attempts >= 3') || (sql.includes('GROUP BY concept_hash') && sql.includes('HAVING total_attempts >= 3'))) return questionStats;
            if (sql.includes('is_correct = 0')) return wrongAnswers;
            if (sql.includes('concept_hash IS NOT NULL')) return rawAttempts;
            return [];
        },
        async get() {
            return existingKnowledge;
        },
        async run(sql, params) {
            updates.push({ sql, params });
        },
    };
}

describe('collectiveMemoryService — real discrimination + field-name fix', () => {
    test('writes highDiscrimination/tooEasy/tooHard (not the old *Mcqs names) so synopsis.js can actually read them', async () => {
        // Item A: right-answer group clearly stronger overall -> real discrimination.
        // Item B: p-value in the 0.4-0.75 band but performance is UNRELATED to overall
        // accuracy (the old p-value-band heuristic would have called this
        // "high discrimination" — the real point-biserial correlation should not).
        const rawAttempts = [
            { concept_hash: 'itemA', user_id: 'u1', is_correct: 1 },
            { concept_hash: 'itemA', user_id: 'u2', is_correct: 1 },
            { concept_hash: 'itemA', user_id: 'u3', is_correct: 0 },
            { concept_hash: 'itemA', user_id: 'u4', is_correct: 0 },
            { concept_hash: 'itemB', user_id: 'u1', is_correct: 1 },
            { concept_hash: 'itemB', user_id: 'u2', is_correct: 0 },
            { concept_hash: 'itemB', user_id: 'u3', is_correct: 1 },
            { concept_hash: 'itemB', user_id: 'u4', is_correct: 0 },
            // Extra "other item" attempts so each user has an overall accuracy distinct from just item A/B.
            { concept_hash: 'itemC', user_id: 'u1', is_correct: 1 },
            { concept_hash: 'itemC', user_id: 'u2', is_correct: 1 },
            { concept_hash: 'itemC', user_id: 'u3', is_correct: 0 },
            { concept_hash: 'itemC', user_id: 'u4', is_correct: 0 },
        ];

        const questionStats = [
            { concept_hash: 'itemA', question_text: 'Q about A', question_type: 'recall', total_attempts: 4, correct_count: 2, unique_users: 4 },
            { concept_hash: 'itemB', question_text: 'Q about B', question_type: 'recall', total_attempts: 4, correct_count: 2, unique_users: 4 },
        ];

        const db = buildMockDb({
            topicRows: [{ normalized_topic: 'ards', total_attempts: 12, unique_users: 4 }],
            questionStats,
            wrongAnswers: [],
            rawAttempts,
            existingKnowledge: { topic: 'ARDS', knowledge: '{}' },
        });

        const result = await aggregateCollectiveMemory(db);
        expect(result.topics).toBe(1);

        const updateCall = db.updates.find((u) => u.sql.includes('UPDATE topic_knowledge'));
        expect(updateCall).toBeDefined();
        const writtenKnowledge = JSON.parse(updateCall.params[0]);
        const cm = writtenKnowledge.collective_memory;

        // The field names synopsis.js actually reads — not the old *Mcqs names.
        expect(cm).toHaveProperty('highDiscrimination');
        expect(cm).toHaveProperty('tooEasy');
        expect(cm).toHaveProperty('tooHard');
        expect(cm).not.toHaveProperty('highDiscriminationMcqs');
        expect(cm).not.toHaveProperty('tooEasyMcqs');
        expect(cm).not.toHaveProperty('tooHardMcqs');

        // itemA (u1,u2 strong + right; u3,u4 weak + wrong) should show real discrimination.
        // itemB (right answers uncorrelated with the u1/u2-strong u3/u4-weak split) should not.
        const itemAEntry = [...cm.highDiscrimination, ...cm.flaggedForReview].find((e) => e.conceptHash === 'itemA');
        const itemBInHighDisc = cm.highDiscrimination.find((e) => e.conceptHash === 'itemB');
        expect(itemAEntry).toBeDefined();
        expect(itemAEntry.discrimination).toBeGreaterThan(0.3);
        expect(itemBInHighDisc).toBeUndefined();
    });
});
