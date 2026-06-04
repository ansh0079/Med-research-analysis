const {
    mergeSnapshots,
    mergeConversationSummary,
    persistAgentTurnMemory,
    isTrivialAgentTurn,
} = require('../../server/services/agentTurnMemoryService');

describe('agentTurnMemoryService', () => {
    test('mergeSnapshots unions focus areas and misconceptions', () => {
        const merged = mergeSnapshots(
            { focusAreas: ['A'], misconceptions: ['old'] },
            { focusAreas: ['B'], misconceptions: ['new'], openQuestion: 'Why?' }
        );
        expect(merged.focusAreas).toEqual(expect.arrayContaining(['A', 'B']));
        expect(merged.misconceptions).toEqual(expect.arrayContaining(['old', 'new']));
        expect(merged.openQuestion).toBe('Why?');
    });

    test('mergeConversationSummary works without AI', async () => {
        const summary = await mergeConversationSummary(
            null,
            'Prior bullets',
            'What is ARDS?',
            'ARDS is acute hypoxemic respiratory failure with bilateral infiltrates.',
            'ARDS'
        );
        expect(summary).toContain('Prior bullets');
        expect(summary).toContain('ARDS');
    });

    test('isTrivialAgentTurn skips very short exchanges', () => {
        expect(isTrivialAgentTurn('thanks', 'You are welcome.')).toBe(true);
        expect(isTrivialAgentTurn(
            'Can you explain plateau pressure in ARDS ventilation?',
            'Plateau pressure reflects alveolar pressure during an inspiratory hold and is used to limit ventilator-induced lung injury in ARDS management.'
        )).toBe(false);
    });

    test('persistAgentTurnMemory skips trivial turns without calling AI', async () => {
        const db = {
            updateAgentConversationMemory: jest.fn(),
            recordLearningEvent: jest.fn(),
        };
        const ai = { callGemini: jest.fn() };

        const result = await persistAgentTurnMemory({
            db,
            ai,
            conversationId: 1,
            userId: 'u1',
            topic: 'ARDS',
            userMessage: 'thanks',
            assistantReply: 'You are welcome.',
        });

        expect(result).toEqual({ skipped: true, reason: 'trivial_turn' });
        expect(ai.callGemini).not.toHaveBeenCalled();
        expect(db.updateAgentConversationMemory).not.toHaveBeenCalled();
    });
});
