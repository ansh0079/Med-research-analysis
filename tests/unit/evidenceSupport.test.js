'use strict';

const {
    claimStructureFindings, mcqFormFindings, lexicalOverlap, expectedLongestIsKeyRate,
} = require('../../server/utils/evidenceSupport');

const codes = (findings) => findings.map((f) => f.code);

describe('claimStructureFindings', () => {
    it('passes a claim drawn from its own passage', () => {
        expect(claimStructureFindings({
            claimText: 'Offer oral iron first-line in iron deficiency anaemia.',
            evidenceQuote: 'In iron deficiency anaemia, oral iron should be offered first-line before parenteral therapy.',
        })).toEqual([]);
    });

    it('flags generator failure text stored as a claim', () => {
        // 33 of these are in production, each paired with an unrelated 1964 abstract.
        expect(codes(claimStructureFindings({
            claimText: 'Consensus synopsis could not be generated for this search.',
            evidenceQuote: 'Article 1 May 1964 Pneumococcal Bacteremia with Especial Reference to bacteremic pneumonia.',
        }))).toContain('generator_failure_text');
    });

    it('flags a passage with no vocabulary in common with the claim', () => {
        expect(codes(claimStructureFindings({
            claimText: 'Anticoagulation should be offered when CHA2DS2-VASc exceeds two.',
            evidenceQuote: 'Pneumococcal bacteraemia carried substantial mortality throughout the reported period.',
        }))).toContain('quote_shares_no_vocabulary');
    });

    it('does not flag a faithful restatement that shares few exact words', () => {
        // Low overlap is a reason to ask a judge, not a finding on its own.
        const findings = claimStructureFindings({
            claimText: 'Start anticoagulation in atrial fibrillation when stroke risk is raised.',
            evidenceQuote: 'Patients with atrial fibrillation and elevated thromboembolic risk warrant anticoagulant therapy.',
        });
        expect(codes(findings)).not.toContain('quote_shares_no_vocabulary');
    });

    it('flags markup, absent and stub passages', () => {
        expect(codes(claimStructureFindings({ claimText: 'Offer oxygen.', evidenceQuote: '' })))
            .toContain('no_evidence_quote');
        expect(codes(claimStructureFindings({
            claimText: 'Offer oxygen in severe pneumonia to maintain saturations.',
            evidenceQuote: '<h4>Importance</h4>Whether oxygen improves severe pneumonia outcomes remains unclear.',
        }))).toContain('quote_is_markup');
        expect(codes(claimStructureFindings({ claimText: 'Offer oxygen.', evidenceQuote: 'Oxygen helps.' })))
            .toContain('quote_too_short');
    });
});

describe('lexicalOverlap', () => {
    it('is null when the claim has no content words to compare', () => {
        expect(lexicalOverlap('a to the', 'anything')).toBeNull();
    });
});

describe('mcqFormFindings', () => {
    const SOUND = {
        correctAnswer: 'B',
        options: [
            'A: Standard YEARS algorithm with a D-dimer threshold of 500 ng/mL',
            'B: Pregnancy-adapted YEARS algorithm with trimester-specific cutoffs',
            'C: Immediate CT pulmonary angiography without risk stratification',
            'D: Ventilation-perfusion scintigraphy as the first-line imaging test',
        ],
    };

    it('passes a question whose options are evenly matched', () => {
        expect(mcqFormFindings(SOUND)).toEqual([]);
    });

    it('flags the key being the longest option', () => {
        // 60.6% of production MCQs look like this, against ~25% chance.
        expect(codes(mcqFormFindings({
            correctAnswer: 'B',
            options: [
                'A: Standard YEARS algorithm',
                'B: Pregnancy-adapted YEARS algorithm, which is safe and effective for diagnosing PE in pregnant women',
                'C: Immediate CT angiography',
                'D: V/Q scintigraphy',
            ],
        }))).toContain('key_is_longest_option');
    });

    it('flags a key that names no option', () => {
        expect(codes(mcqFormFindings({ ...SOUND, correctAnswer: 'E' })))
            .toContain('answer_key_not_among_options');
    });

    it('accepts the alternate answer-key field name', () => {
        const { correctAnswer, ...rest } = SOUND;
        expect(mcqFormFindings({ ...rest, correct: correctAnswer })).toEqual([]);
    });

    it('flags missing options and missing keys', () => {
        expect(codes(mcqFormFindings({ correctAnswer: 'A', options: [] })))
            .toContain('fewer_than_two_options');
        expect(codes(mcqFormFindings({ options: SOUND.options }))).toContain('no_answer_key');
    });

    it('flags repeated options', () => {
        expect(codes(mcqFormFindings({
            correctAnswer: 'A',
            options: ['A: Give oxygen', 'B: Give oxygen', 'C: Withhold oxygen', 'D: Observe only'],
        }))).toContain('duplicate_options');
    });
});

describe('expectedLongestIsKeyRate', () => {
    it('is the chance rate the observed rate must be compared against', () => {
        // Production: 10,504 four-option and 998 five-option questions.
        const counts = [...Array(10504).fill(4), ...Array(998).fill(5)];
        expect(expectedLongestIsKeyRate(counts)).toBeCloseTo(0.2457, 3);
    });

    it('is null when there is nothing to compare', () => {
        expect(expectedLongestIsKeyRate([])).toBeNull();
    });
});
