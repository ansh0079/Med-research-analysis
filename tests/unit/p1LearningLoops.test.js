'use strict';

const {
    applyQuizClaimSelectionBandit,
    selectCaseDifficultyArm,
    CASE_DIFFICULTY_ARMS,
    POLICY_QUIZ_CLAIM_SELECTION,
    POLICY_CASE_DIFFICULTY,
    caseDifficultyArmId,
} = require('../../server/services/personalizationBanditService');
const { formatAgentMistakesBlock, buildAgentSystemPrompt } = require('../../server/services/agentHelpers');
const { analyzeConversationQuality } = require('../../server/services/agentSelfImprovementService');
const { attributeQuizAttemptRewards } = require('../../server/services/searchLearningOutcomeService');

describe('P1 quiz claim selection bandit', () => {
    test('ranks candidates and logs quiz_claim_selection decisions', async () => {
        const inserted = [];
        const db = {
            ensurePersonalizationArms: jest.fn().mockResolvedValue(true),
            listPersonalizationArmStates: jest.fn(async (_policy, scope) => {
                if (scope === 'user:u1') {
                    return [
                        { arm_id: 'claim-strong', alpha: 8, beta: 1, pulls: 12 },
                        { arm_id: 'claim-weak', alpha: 1, beta: 4, pulls: 12 },
                    ];
                }
                return [
                    { arm_id: 'claim-strong', alpha: 2, beta: 2, pulls: 4 },
                    { arm_id: 'claim-weak', alpha: 2, beta: 2, pulls: 4 },
                ];
            }),
            insertPersonalizationDecision: jest.fn(async (row) => {
                inserted.push(row);
                return { id: inserted.length };
            }),
        };

        const out = await applyQuizClaimSelectionBandit(db, 'u1', [
            { claimKey: 'claim-weak', claimText: 'Weak claim', priority: 0 },
            { claimKey: 'claim-strong', claimText: 'Strong claim', priority: 2 },
            { claimKey: 'claim-other', claimText: 'Other claim', priority: 1 },
        ], { count: 2, topic: 'ARDS', normalizedTopic: 'ards' });

        expect(out.anchors).toHaveLength(2);
        expect(out.anchors.every((a) => a.claimDecisionId != null)).toBe(true);
        expect(db.insertPersonalizationDecision).toHaveBeenCalled();
        expect(inserted.every((row) => row.policyType === POLICY_QUIZ_CLAIM_SELECTION)).toBe(true);
    });

    test('attributeQuizAttemptRewards updates claim decision when claimDecisionId present', async () => {
        const db = {
            normalizeTopic: (t) => String(t || '').toLowerCase(),
            findRecentSearchImpressionsForAttribution: jest.fn().mockResolvedValue([]),
            updatePersonalizationDecisionReward: jest.fn().mockResolvedValue(true),
            recordPersonalizationArmPull: jest.fn().mockResolvedValue(true),
            all: jest.fn().mockResolvedValue([{ id: 77, arm_id: 'claim-a', delayed_reward: null, policy_type: POLICY_QUIZ_CLAIM_SELECTION }]),
            countPriorQuizAttemptsOnClaim: jest.fn().mockResolvedValue(0),
        };

        const result = await attributeQuizAttemptRewards(db, 'u1', [{
            claimKey: 'claim-a',
            claimDecisionId: 77,
            isCorrect: true,
            id: 1,
        }], 'ARDS');

        expect(result).toEqual(expect.objectContaining({ attributed: 0 }));
        expect(db.updatePersonalizationDecisionReward).toHaveBeenCalledWith(77, expect.objectContaining({
            delayedReward: 1,
            totalReward: 1,
        }));
        expect(db.recordPersonalizationArmPull).toHaveBeenCalled();
    });
});

describe('P1 case difficulty bandit', () => {
    test('selectCaseDifficultyArm returns a known difficulty arm', async () => {
        const db = {
            ensurePersonalizationArms: jest.fn().mockResolvedValue(true),
            listPersonalizationArmStates: jest.fn().mockResolvedValue([
                { arm_id: 'difficulty:hard', alpha: 5, beta: 1, pulls: 10 },
                { arm_id: 'difficulty:easy', alpha: 1, beta: 3, pulls: 10 },
                { arm_id: 'difficulty:medium', alpha: 2, beta: 2, pulls: 10 },
            ]),
        };
        const selected = await selectCaseDifficultyArm(db, 'u1');
        expect(Object.keys(CASE_DIFFICULTY_ARMS)).toContain(selected.armId);
        expect(['easy', 'medium', 'hard']).toContain(selected.difficulty);
        expect(caseDifficultyArmId(selected.difficulty)).toBe(selected.armId);
        expect(selected.armId.startsWith('difficulty:')).toBe(true);
        expect(POLICY_CASE_DIFFICULTY).toBe('case_scenario_outcome');
    });
});

describe('P1 agent mistake injection', () => {
    test('formatAgentMistakesBlock includes avoid/prefer lines', () => {
        const block = formatAgentMistakesBlock([
            { avoidClaim: 'Wrong tidal volume claim', correctVersion: 'Use 6 ml/kg IBW', timesRepeated: 2 },
        ]);
        expect(block).toContain('AVOID PRIOR MISTAKES');
        expect(block).toContain('Wrong tidal volume claim');
        expect(block).toContain('Use 6 ml/kg IBW');
    });

    test('buildAgentSystemPrompt injects mistakes when provided', () => {
        const prompt = buildAgentSystemPrompt(
            { topic: 'ARDS', knowledge: {} },
            [],
            [],
            { profile: { persona: 'learner' }, mastery: null },
            [],
            {},
            {
                agentMistakes: [{ avoidClaim: 'Avoid this framing', correctVersion: 'Prefer this' }],
            }
        );
        expect(prompt).toContain('AVOID PRIOR MISTAKES');
        expect(prompt).toContain('Avoid this framing');
    });

    test('analyzeConversationQuality uses getAgentConversation', async () => {
        const db = {
            getAgentConversation: jest.fn().mockResolvedValue({
                id: 9,
                userId: 'u1',
                topic: 'ARDS',
                messages: [
                    { role: 'assistant', content: 'You should always use high tidal volumes.' },
                    { role: 'user', content: "Actually that's wrong — low tidal volume is preferred." },
                ],
            }),
            normalizeTopic: (t) => String(t || '').toLowerCase(),
            run: jest.fn().mockResolvedValue({ changes: 1 }),
        };

        const result = await analyzeConversationQuality(db, 9);
        expect(db.getAgentConversation).toHaveBeenCalledWith(9);
        expect(result.analyzed).toBe(true);
        expect(result.corrections).toBe(1);
        expect(result.learnedMistakes).toBe(1);
        expect(db.run).toHaveBeenCalled();
    });
});
