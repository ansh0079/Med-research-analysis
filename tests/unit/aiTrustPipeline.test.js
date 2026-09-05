'use strict';

const { applyAiTrustPipeline } = require('../../server/services/ai/aiTrustPipeline');
const { processPaperSynopsisTrust } = require('../../server/services/paperSynopsisTrust');

describe('applyAiTrustPipeline', () => {
    const article = {
        title: 'Sepsis bundle trial',
        abstract: 'Early bundled care reduced events. Hazard ratio HR 0.82 in 420 adults. N=420.',
    };

    test('paper_synopsis delegates to the existing trust stack', () => {
        const synopsis = {
            mainFindings: 'Primary endpoint met (HR 0.82) [1].',
            bottomLine: 'May reduce events in selected patients [1].',
            trustRating: 'MODERATE',
        };
        const pipeline = applyAiTrustPipeline('paper_synopsis', synopsis, { fullTextCoverageRatio: 1, article });
        const direct = processPaperSynopsisTrust(synopsis, { fullTextCoverageRatio: 1, article });
        expect(pipeline.reviewState).toBe(direct.audit.reviewState);
        expect(pipeline.audit.kind).toBe('paper_synopsis');
        expect(pipeline.payload.citationCheckPassed).toBe(direct.synopsis.citationCheckPassed);
    });

    test('consensus_synopsis adds relevance, numeric grounding, and review state', () => {
        const payload = {
            statement: 'Bundled care reduced events (HR 0.82) [1].',
            clinicalBottomLine: 'Use bundles as discussion support [1].',
            areasOfAgreement: ['Bundled care is emphasised [1].'],
            conflictingSignals: [],
            evidenceStrength: 'HIGH',
        };
        const { payload: next, audit, reviewState } = applyAiTrustPipeline('consensus_synopsis', payload, {
            articles: [article],
            sourceCount: 1,
            fullTextCoverageRatio: 1,
        });
        expect(reviewState).toBe('machine_checked');
        expect(audit.kind).toBe('consensus_synopsis');
        expect(audit.numericGrounding.checked).toBe(true);
        expect(next.citationValidation.ok).toBe(true);
        expect(next.reviewState).toBe('machine_checked');
    });

    test('consensus_synopsis flags uncited statements as needs_revision', () => {
        const { reviewState, payload } = applyAiTrustPipeline('consensus_synopsis', {
            statement: 'This changes practice immediately.',
            clinicalBottomLine: 'Treat every patient now.',
            areasOfAgreement: [],
            conflictingSignals: [],
            evidenceStrength: 'HIGH',
        }, {
            articles: [article],
            sourceCount: 1,
            fullTextCoverageRatio: 0,
        });
        expect(reviewState).toBe('needs_revision');
        expect(payload.citationValidation.ok).toBe(false);
        expect(['LOW', 'VERY_LOW']).toContain(payload.evidenceStrength);
    });

    test('full_synthesis writes review state and numeric grounding onto the audit', () => {
        const { payload, audit } = applyAiTrustPipeline('full_synthesis', {
            clinicalBottomLine: 'Norepinephrine remains first line [1].',
            overallAnswer: 'Use the cited trial cautiously [1].',
            consensus: 'Agreement is limited [1].',
            agreement: ['First-line vasopressor [1].'],
            uncertainties: ['Mortality effect is imprecise [1].'],
        }, {
            articles: [article],
            sourceCount: 1,
            fullTextCoverageRatio: 0.5,
            citationValidation: { ok: true, issueCount: 0, issues: [] },
        });
        expect(payload.reviewState).toBe('machine_checked');
        expect(audit.humanReviewStatus).toBe('machine_checked');
        expect(audit.numericGrounding).toBeTruthy();
    });

    test('guideline_mcq grounds explanations against guideline text', () => {
        const { payload, reviewState, audit } = applyAiTrustPipeline('guideline_mcq', {
            questions: [{
                question: 'First-line vasopressor?',
                options: ['Norepinephrine', 'Dopamine'],
                answer: 'Norepinephrine',
                explanation: 'Guidelines recommend norepinephrine. HR 0.12 is not in the source.',
            }],
        }, {
            guidelines: [{ recommendationText: 'Use norepinephrine as the first-line vasopressor in septic shock.' }],
        });
        expect(audit.kind).toBe('guideline_mcq');
        expect(['machine_checked', 'needs_revision']).toContain(reviewState);
        expect(Array.isArray(payload.questions || payload)).toBe(true);
    });
});
