const {
    buildPaperTeachingObject,
    buildConsensusTeachingObject,
    teachingObjectsToQuizContext,
    buildEvidenceMap,
} = require('../../server/services/teachingObjectService');

describe('teachingObjectService', () => {
    test('builds a reusable paper teaching object from a synopsis', () => {
        const object = buildPaperTeachingObject({
            topic: 'COPD exacerbation',
            article: {
                uid: 'pmid-1',
                title: 'Extracorporeal carbon dioxide removal for COPD',
                pubtype: ['Randomized Controlled Trial'],
                pmid: '1',
                isFree: true,
            },
            synopsisResult: {
                provider: 'gemini',
                model: 'flash',
                timestamp: '2026-05-18T00:00:00.000Z',
                synopsis: {
                    population: 'Adults with COPD exacerbation',
                    intervention: 'ECCO2R',
                    comparator: 'Usual care',
                    primaryOutcome: 'Avoidance of invasive ventilation',
                    mainFindings: 'No clear benefit.',
                    bottomLine: 'Do not overgeneralise this to all COPD exacerbations.',
                    trustRating: 'MODERATE',
                    quizFocusPoints: ['Identify the population studied.'],
                    whatNotToOverclaim: ['Do not infer mortality benefit.'],
                },
            },
        });

        expect(object.objectKey).toBe('paper:pmid-1');
        expect(object.objectType).toBe('paper');
        expect(object.confidence).toBeGreaterThan(0.6);
        expect(object.payload.pico.outcomes).toContain('Avoidance of invasive ventilation');
        expect(object.payload.quizSeed.focusPoints).toContain('Identify the population studied.');
        expect(object.payload.claimAnchors.length).toBeGreaterThanOrEqual(3);
        expect(object.payload.claimAnchors[0]).toMatchObject({
            sourcePath: 'synopsis.bottomLine',
            conceptKey: 'clinical_bottom_line',
            verificationStatus: 'source_verified',
        });
        expect(object.payload.claimAnchors[0].claimKey).toHaveLength(24);
    });

    test('turns consensus outputs into quiz context', () => {
        const object = buildConsensusTeachingObject({
            topic: 'sepsis',
            consensusSynopsis: {
                generatedAt: '2026-05-18T00:00:00.000Z',
                evidenceStrength: 'LOW',
                clinicalBottomLine: 'Bundle evidence is supportive but heterogeneous [1, 2].',
                quizFocusPoints: ['Know uncertainty.'],
                whatNotToOverclaim: ['Do not claim universal mortality benefit.'],
            },
            articles: [{ uid: 'a' }, { uid: 'b' }],
        });

        const context = teachingObjectsToQuizContext([{ ...object, payload: object.payload }]);
        expect(context).toContain('Consensus synopsis: sepsis');
        expect(context).toContain('claimKey=');
        expect(object.payload.claimAnchors[0].verificationStatus).toBe('synthesis_inferred');
        expect(context).toContain('Know uncertainty.');
        expect(context).toContain('Do not claim universal mortality benefit.');
    });

    test('evidence map flags stale or decayed topic memory', () => {
        const map = buildEvidenceMap({
            topic: 'GLP-1 agonists',
            topicKnowledge: {
                confidence: 0.9,
                lastRefreshedAt: '2024-01-01T00:00:00.000Z',
                knowledge: { keywords: ['glp-1'] },
            },
            articles: [{ uid: 'x', title: 'New trial', year: 2026, isFree: true }],
            teachingObjects: [],
        });

        expect(map.freshness.volatility).toBe('high');
        expect(map.freshness.confidenceDecay).toBeGreaterThan(0.25);
        expect(map.alerts.stale).toBe(true);
    });
});
