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

describe('numbers are judged one claim sentence at a time', () => {
    const abstract = [
        'In this randomised trial of 1,200 adults with septic shock, 28-day mortality was 31% with balanced crystalloid versus 36% with saline.',
        'Acute kidney injury requiring dialysis occurred in 4.8% and 7.1% of patients, respectively.',
        'No difference was seen in length of stay.',
    ].join(' ');

    test('a field reporting findings from two different sentences of the source is grounded', () => {
        // Rejected before: all four numbers had to sit in ONE source sentence.
        const grounding = buildClaimGrounding({
            mainFindings: 'Mortality was 31% versus 36% [1]. Dialysis was needed in 4.8% versus 7.1% [1].',
        }, { uid: 'pmid-2', abstract });
        expect(grounding.claims[0]).toMatchObject({ field: 'mainFindings', grounded: true });
        expect(grounding.issues.map((i) => i.flag)).not.toContain('ungrounded_number');
    });

    test('a number that is not in the source still fails', () => {
        const grounding = buildClaimGrounding({
            mainFindings: 'Mortality was 31% versus 36% [1]. Dialysis was needed in 2.2% versus 7.1% [1].',
        }, { uid: 'pmid-2', abstract });
        expect(grounding.issues.map((i) => i.flag)).toContain('ungrounded_number');
    });

    test('a real number attached to the wrong finding still fails', () => {
        // 4.8% is in the source, but as dialysis, not mortality.
        const grounding = buildClaimGrounding({
            mainFindings: 'Mortality was 4.8% with balanced crystalloid versus 36% with saline [1].',
        }, { uid: 'pmid-2', abstract });
        expect(grounding.issues.map((i) => i.flag)).toContain('ungrounded_number');
    });
});

describe('a number is grounded by a source sentence about the same thing', () => {
    const abstract = [
        'We enrolled 5,695 participants aged 70 years or older with elevated C-reactive protein.',
        'The rate of the primary end point was 1.22 and 1.99 per 100 person-years in the rosuvastatin and placebo groups (hazard ratio 0.61).',
        'Acute kidney injury requiring dialysis occurred in 4.8% of patients.',
    ].join(' ');

    test('a subgroup descriptor from one sentence and results from another is grounded', () => {
        const grounding = buildClaimGrounding({
            mainFindings: 'Among participants aged 70 years or older, the primary end point rate was 1.22 versus 1.99 per 100 person-years with rosuvastatin (hazard ratio 0.61) [1].',
        }, { uid: 'p', abstract });
        expect(grounding.issues.map((i) => i.flag)).not.toContain('ungrounded_number');
    });

    test("the article's own publication year is grounded by its metadata", () => {
        const grounding = buildClaimGrounding({
            bottomLine: 'These 2002 guidelines recommend early endoscopy for haemorrhage [1].',
        }, { uid: 'g', pubdate: '2002 Jun', abstract: 'Guidelines recommend early endoscopy for upper gastrointestinal haemorrhage.' });
        expect(grounding.issues.map((i) => i.flag)).not.toContain('ungrounded_number');
    });

    test('a real number from an unrelated sentence is still rejected', () => {
        const grounding = buildClaimGrounding({
            mainFindings: 'Rosuvastatin reduced the primary end point by 4.8% [1].',
        }, { uid: 'p', abstract });
        expect(grounding.issues.map((i) => i.flag)).toContain('ungrounded_number');
    });
});
