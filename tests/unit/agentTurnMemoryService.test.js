const {
    mergeSnapshots,
    mergeBreakthroughMoments,
    mergeEvidenceAnchors,
    mergeConversationSummary,
    persistAgentTurnMemory,
    isTrivialAgentTurn,
    isSessionEndingTurn,
    reflectOnAgentSession,
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

    test('mergeBreakthroughMoments dedupes and caps entries', () => {
        const merged = mergeBreakthroughMoments(
            [{ moment: 'Plateau pressure clicked', at: '2026-06-01T00:00:00.000Z' }],
            ['Plateau pressure clicked', { moment: 'PEEP driving pressure distinction', at: '2026-06-02T00:00:00.000Z' }]
        );
        expect(merged).toHaveLength(2);
        expect(merged[0].moment).toContain('Plateau pressure');
    });

    test('mergeSnapshots carries breakthrough moments forward', () => {
        const merged = mergeSnapshots(
            { breakthroughMoments: [{ moment: 'Old insight', at: '2026-06-01T00:00:00.000Z' }] },
            { breakthroughMoments: [{ moment: 'New insight', at: '2026-06-02T00:00:00.000Z' }] }
        );
        expect(merged.breakthroughMoments).toHaveLength(2);
    });

    test('mergeEvidenceAnchors dedupes source-backed memory anchors', () => {
        const merged = mergeEvidenceAnchors(
            [{ type: 'paper', uid: 'pmid-1', title: 'ARDSNet low tidal volume trial' }],
            [
                { type: 'paper', uid: 'pmid-1', title: 'Duplicate title' },
                { type: 'guideline', title: 'Use lung protective ventilation', source: 'ATS 2024' },
            ]
        );

        expect(merged).toHaveLength(2);
        expect(merged[0]).toMatchObject({ type: 'paper', uid: 'pmid-1' });
        expect(merged[1]).toMatchObject({ type: 'guideline', source: 'ATS 2024' });
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

    test('isSessionEndingTurn detects explicit and heuristic endings', () => {
        expect(isSessionEndingTurn('thanks for the help')).toBe(true);
        expect(isSessionEndingTurn('Can you explain PEEP?', { sessionEnd: true })).toBe(true);
        expect(isSessionEndingTurn('What is the mortality benefit?', { sessionFeedback: { score: 2, totalQuestions: 5 } })).toBe(true);
        expect(isSessionEndingTurn('How does prone positioning work in ARDS?')).toBe(false);
    });

    test('reflectOnAgentSession persists fallback reflection without AI', async () => {
        const db = {
            updateAgentConversationMemory: jest.fn().mockResolvedValue(true),
            recordLearningEvent: jest.fn().mockResolvedValue(true),
        };

        const result = await reflectOnAgentSession({
            db,
            ai: null,
            userId: 'u1',
            topic: 'ARDS',
            conversationId: 9,
            conversationSummary: '- Discussed PEEP\n- Still weak on driving pressure',
            conversationHistory: [
                { role: 'user', content: 'Explain driving pressure' },
                { role: 'assistant', content: 'Driving pressure is plateau minus PEEP.' },
            ],
        });

        expect(result.reflection.reflectionSummary).toContain('ARDS');
        expect(db.updateAgentConversationMemory).toHaveBeenCalled();
        expect(db.recordLearningEvent).toHaveBeenCalledWith(expect.objectContaining({
            eventType: 'agent_session_reflection',
        }));
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
