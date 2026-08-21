const {
    claimMeetsVerifiedFloor,
    claimEligibleForQuestionType,
    isHighStakesQuestionType,
    isHighCertaintyQuizEligible,
    HIGH_STAKES_QTYPES,
} = require('../../server/services/paperSynopsisTrust');
const { abilityToQuizDifficulty } = require('../../server/services/adaptiveItemSelectionService');

describe('Phase 3 claim-tier stakes gate', () => {
    test('high-stakes question types are guideline / clinical_application / trial_interpretation', () => {
        expect(HIGH_STAKES_QTYPES).toEqual(expect.arrayContaining([
            'guideline',
            'clinical_application',
            'trial_interpretation',
        ]));
        expect(isHighStakesQuestionType('guideline')).toBe(true);
        expect(isHighStakesQuestionType('recall')).toBe(false);
        expect(isHighStakesQuestionType('pitfall')).toBe(false);
    });

    test('verified floor accepts guideline_supported, source_verified, human_reviewed', () => {
        expect(claimMeetsVerifiedFloor({ verificationStatus: 'guideline_supported' })).toBe(true);
        expect(claimMeetsVerifiedFloor({ verificationStatus: 'source_verified' })).toBe(true);
        expect(claimMeetsVerifiedFloor({ verificationStatus: 'human_reviewed' })).toBe(true);
        expect(claimMeetsVerifiedFloor({ reviewState: 'human_reviewed', verificationStatus: 'abstract_only' })).toBe(true);
        expect(claimMeetsVerifiedFloor({ verificationStatus: 'abstract_only' })).toBe(false);
        expect(claimMeetsVerifiedFloor({ verificationStatus: 'unverified' })).toBe(false);
        expect(claimMeetsVerifiedFloor({ verificationStatus: 'agent_draft' })).toBe(false);
        expect(claimMeetsVerifiedFloor({ validationStatus: 'llm_validated' })).toBe(true);
        expect(claimMeetsVerifiedFloor({ validationStatus: 'unvalidated' })).toBe(false);
    });

    test('high-stakes Q types require verified floor; recall does not', () => {
        const abstractClaim = { verificationStatus: 'abstract_only', conceptKey: 'limitations' };
        expect(isHighCertaintyQuizEligible(abstractClaim)).toBe(true);
        expect(claimEligibleForQuestionType(abstractClaim, 'recall')).toBe(true);
        expect(claimEligibleForQuestionType(abstractClaim, 'guideline')).toBe(false);
        expect(claimEligibleForQuestionType(abstractClaim, 'clinical_application')).toBe(false);
        expect(claimEligibleForQuestionType({
            verificationStatus: 'guideline_supported',
            conceptKey: 'clinical_bottom_line',
        }, 'guideline')).toBe(true);
    });

    test('needs_revision blocks all question types', () => {
        const claim = { verificationStatus: 'source_verified', reviewState: 'needs_revision' };
        expect(claimEligibleForQuestionType(claim, 'recall')).toBe(false);
        expect(claimEligibleForQuestionType(claim, 'guideline')).toBe(false);
    });
});

describe('Phase 3 ability → quiz difficulty', () => {
    test('maps ability bands to easy/medium/mixed/hard', () => {
        expect(abilityToQuizDifficulty(0.2)).toBe('easy');
        expect(abilityToQuizDifficulty(0.45)).toBe('medium');
        expect(abilityToQuizDifficulty(0.65)).toBe('mixed');
        expect(abilityToQuizDifficulty(0.9)).toBe('hard');
        expect(abilityToQuizDifficulty(null)).toBe('medium');
    });
});
