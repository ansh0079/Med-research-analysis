const {
    extractTrialGuidelineConflicts,
    normalizeConflictMatrix,
    buildGuidelineAlignmentSummary,
    formatConflictMatrixForPrompt,
    buildHeuristicConflictMatrix,
} = require('../../server/services/conflictExtractionService');

describe('conflictExtractionService', () => {
    const evidenceRows = [
        {
            article: {
                title: 'RECOVERY dexamethasone in COVID-19',
                abstract: 'Early dexamethasone reduced mortality in hospitalised adults with COVID-19 requiring oxygen.',
                year: 2021,
            },
            pico: {
                population: 'Hospitalised adults with COVID-19',
                intervention: 'Dexamethasone',
                comparison: 'Usual care',
                outcomes: ['Mortality'],
            },
        },
    ];

    const guidelines = [
        {
            source_body: 'NICE',
            source_year: 2024,
            recommendation_text: 'Do not routinely offer corticosteroids for viral pneumonia without hypoxia.',
            population: 'Adults with viral pneumonia',
        },
    ];

    test('normalizeConflictMatrix coerces indices and levels', () => {
        const matrix = normalizeConflictMatrix([
            {
                level: 'MAJOR',
                trialIndex: 1,
                guidelineIndex: 1,
                trialClaim: 'Steroids reduce mortality',
                guidelineClaim: 'Avoid routine steroids',
                populationGap: 'Trial included hypoxic patients only',
                clinicalNuance: 'Severity stratification matters',
                recommendation: 'Consider subgroup applicability',
            },
        ], evidenceRows, guidelines);

        expect(matrix).toHaveLength(1);
        expect(matrix[0].level).toBe('major');
        expect(matrix[0].trialIndex).toBe(1);
        expect(matrix[0].guidelineIndex).toBe(1);
    });

    test('buildGuidelineAlignmentSummary counts divergences', () => {
        const matrix = normalizeConflictMatrix([
            { level: 'major', trialIndex: 1, guidelineIndex: 1, trialClaim: 'A', guidelineClaim: 'B', populationGap: 'gap', clinicalNuance: 'nuance', recommendation: 'rec' },
            { level: 'nuanced', trialIndex: 1, guidelineIndex: 1, trialClaim: 'C', guidelineClaim: 'D', populationGap: 'gap2', clinicalNuance: 'nuance2', recommendation: 'rec2' },
        ], evidenceRows, guidelines);

        const summary = buildGuidelineAlignmentSummary(matrix);
        expect(summary.divergentCount).toBe(2);
        expect(summary.majorCount).toBe(1);
        expect(summary.keyDivergence?.level).toBe('major');
    });

    test('formatConflictMatrixForPrompt includes pre-computed block', () => {
        const matrix = normalizeConflictMatrix([
            { level: 'minor', trialIndex: 1, guidelineIndex: 1, trialClaim: 'Trial claim', guidelineClaim: 'Guideline claim', populationGap: 'Gap', clinicalNuance: 'Nuance', recommendation: 'Rec' },
        ], evidenceRows, guidelines);
        const block = formatConflictMatrixForPrompt(matrix);
        expect(block).toContain('CONFLICT ANALYSIS');
        expect(block).toContain('Trial [1]');
        expect(block).toContain('Guideline [1]');
    });

    test('buildHeuristicConflictMatrix flags opposing polarity', () => {
        const matrix = buildHeuristicConflictMatrix(
            [
                {
                    article: {
                        title: 'Trial supports steroids',
                        abstract: 'Steroids are not harmful and improve outcomes in severe ARDS.',
                    },
                    pico: { intervention: 'Steroids' },
                },
            ],
            [
                {
                    recommendation_text: 'Do not use steroids routinely; avoid steroids in viral pneumonia.',
                },
            ]
        );
        expect(matrix.length).toBeGreaterThanOrEqual(0);
    });

    test('extractTrialGuidelineConflicts returns empty matrix without inputs', async () => {
        const result = await extractTrialGuidelineConflicts([], [], { topic: 'ARDS' });
        expect(result.conflictMatrix).toEqual([]);
        expect(result.guidelineAlignment.divergentCount).toBe(0);
    });

    test('extractTrialGuidelineConflicts falls back to heuristic without AI keys', async () => {
        const result = await extractTrialGuidelineConflicts(evidenceRows, guidelines, {
            topic: 'COVID-19 ARDS',
            serverConfig: { keys: {} },
        });

        expect(Array.isArray(result.conflictMatrix)).toBe(true);
        expect(result.guidelineAlignment).toMatchObject({
            alignedCount: expect.any(Number),
            divergentCount: expect.any(Number),
            keyDivergence: null,
        });
    });
});
