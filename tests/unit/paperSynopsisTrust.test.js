const {
    processPaperSynopsisTrust,
    applyAbstractOnlyConfidence,
    isHighCertaintyQuizEligible,
    resolveReviewState,
    isAbstractOnlySource,
} = require('../../server/services/paperSynopsisTrust');

describe('paperSynopsisTrust', () => {
    test('detects abstract-only from full-text coverage', () => {
        expect(isAbstractOnlySource(0)).toBe(true);
        expect(isAbstractOnlySource(1)).toBe(false);
    });

    test('validates [1] citations and sets machine_checked review state', () => {
        const { synopsis, audit } = processPaperSynopsisTrust({
            mainFindings: 'Primary endpoint met (HR 0.82) [1].',
            bottomLine: 'May reduce events in selected patients [1].',
            trustRating: 'MODERATE',
        }, { fullTextCoverageRatio: 1 });

        expect(audit.citationValidation.ok).toBe(true);
        expect(audit.reviewState).toBe('machine_checked');
        expect(synopsis.citationCheckPassed).toBe(true);
    });

    test('caps trust and flags needs_revision when citations missing', () => {
        const { synopsis, audit } = processPaperSynopsisTrust({
            mainFindings: 'Primary endpoint met without citation.',
            bottomLine: 'Practice should change immediately.',
            trustRating: 'HIGH',
        }, { fullTextCoverageRatio: 0 });

        expect(audit.abstractOnly).toBe(true);
        expect(audit.sourceMode).toBe('abstract_only');
        expect(['LOW', 'VERY_LOW']).toContain(synopsis.trustRating);
        expect(audit.reviewState).toBe('needs_revision');
        expect(synopsis.trustRationale).toMatch(/Abstract-only source/i);
    });

    test('caps abstract-only claim confidence by concept', () => {
        expect(applyAbstractOnlyConfidence(0.85, 'clinical_bottom_line', true)).toBeLessThanOrEqual(0.42);
        expect(applyAbstractOnlyConfidence(0.85, 'quiz_focus', true)).toBeLessThanOrEqual(0.32);
        expect(applyAbstractOnlyConfidence(0.85, 'clinical_bottom_line', false)).toBe(0.85);
    });

    test('blocks abstract-only high-certainty quiz concepts', () => {
        expect(isHighCertaintyQuizEligible({
            verificationStatus: 'abstract_only',
            conceptKey: 'clinical_bottom_line',
            reviewState: 'machine_checked',
        })).toBe(false);
        expect(isHighCertaintyQuizEligible({
            verificationStatus: 'abstract_only',
            conceptKey: 'limitations',
            reviewState: 'machine_checked',
        })).toBe(true);
        expect(isHighCertaintyQuizEligible({
            verificationStatus: 'source_verified',
            conceptKey: 'clinical_bottom_line',
            reviewState: 'machine_checked',
        })).toBe(true);
    });

    test('preserves human_reviewed review state', () => {
        expect(resolveReviewState({
            citationValidation: { ok: true },
            abstractOnly: true,
            priorReviewState: 'human_reviewed',
        })).toBe('human_reviewed');
    });
});
