const {
    buildClaimGrounding,
    runSynopsisCritic,
    bestEvidenceSpan,
} = require('../../server/services/synopsisGroundingService');

describe('synopsisGroundingService', () => {
    test('matches claim numbers to source evidence spans', () => {
        const grounding = buildClaimGrounding({
            mainFindings: 'Mortality was 12% with intervention versus 20% with control [1].',
            bottomLine: 'Intervention may reduce mortality in the studied population [1].',
        }, {
            uid: 'pmid-1',
            abstract: 'Mortality was 12% with intervention versus 20% with control at 28 days.',
        });

        expect(grounding.checked).toBe(true);
        expect(grounding.claims.find((claim) => claim.field === 'mainFindings')).toMatchObject({
            grounded: true,
            sourceArticleUid: 'pmid-1',
        });
        expect(grounding.issues).toEqual([]);
    });

    test('critic requires revision for ungrounded numbers', () => {
        const grounding = buildClaimGrounding({
            mainFindings: 'Mortality was 12% with intervention [1].',
            bottomLine: 'Intervention may reduce mortality [1].',
        }, {
            uid: 'pmid-2',
            abstract: 'Mortality was 20% with intervention in the abstract.',
        });
        const critic = runSynopsisCritic({}, { claimGrounding: grounding });

        expect(grounding.issues.some((issue) => issue.flag === 'ungrounded_number')).toBe(true);
        expect(critic.status).toBe('needs_revision');
        expect(critic.errorCount).toBeGreaterThan(0);
    });

    test('missing source text is a warning, not a false hard failure', () => {
        const grounding = buildClaimGrounding({
            mainFindings: 'Primary endpoint improved [1].',
        }, { uid: 'pmid-3' });
        const critic = runSynopsisCritic({}, { claimGrounding: grounding });

        expect(grounding.checked).toBe(false);
        expect(grounding.issues).toContainEqual({ field: null, flag: 'source_text_unavailable' });
        expect(critic.status).toBe('watch');
    });

    test('bestEvidenceSpan ranks overlapping source sentences', () => {
        const best = bestEvidenceSpan(
            'Apixaban reduced stroke in atrial fibrillation',
            'The trial enrolled hypertension patients. Apixaban reduced stroke in atrial fibrillation patients.'
        );

        expect(best.span).toMatch(/Apixaban reduced stroke/i);
        expect(best.score).toBeGreaterThan(0.7);
    });
});
