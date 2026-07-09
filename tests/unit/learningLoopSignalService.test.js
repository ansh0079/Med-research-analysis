const {
    agentFollowUpReward,
    quizOutcomeRewardForAgent,
    synopsisFeedbackReward,
    synopsisRegenerationTargets,
} = require('../../server/services/learningLoopSignalService');

describe('learningLoopSignalService', () => {
    test('maps synopsis feedback reasons to reward and regeneration targets', () => {
        expect(synopsisFeedbackReward('helpful')).toBe(1);
        // Trust/factual complaints abstain (0) — not this arm's fault, caller skips the update.
        expect(synopsisFeedbackReward('not_helpful', 'the dosage is wrong')).toBe(0);
        // A style complaint IS this arm's fault — negative signal.
        expect(synopsisFeedbackReward('not_helpful', 'style too_long hard_to_scan')).toBe(-0.3);
        // Unattributed not_helpful — mild negative.
        expect(synopsisFeedbackReward('not_helpful', '')).toBe(-0.15);
        expect(synopsisRegenerationTargets('bottom line overclaims the evidence and misses citations')).toEqual(
            expect.arrayContaining(['bottomLine', 'clinicalMeaning', 'whatNotToOverclaim', 'fullSynopsis'])
        );
    });

    test('scores follow-up depth and quiz outcomes for implicit agent rewards', () => {
        expect(agentFollowUpReward({ conversationHistory: [], message: 'thanks' })).toBe(0);
        expect(agentFollowUpReward({
            conversationHistory: [{ role: 'assistant', content: 'Answer' }],
            message: 'Can you connect that to the guideline threshold, explain why the alternative is unsafe, and show how it changes the next management step?',
        })).toBe(0.35);
        expect(quizOutcomeRewardForAgent([{ isCorrect: true }, { isCorrect: true }, { isCorrect: false }])).toBe(0.35);
        // A learner failing every question is a negative signal for the teaching strategy, not neutral.
        expect(quizOutcomeRewardForAgent([{ isCorrect: false }, { isCorrect: false }])).toBe(-0.15);
    });
});
