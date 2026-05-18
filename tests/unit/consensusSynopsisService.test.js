const {
    generateConsensusSynopsis,
    generateConsensusSynopsisSafe,
    selectFreeEvidence,
} = require('../../server/services/consensusSynopsisService');

describe('consensusSynopsisService', () => {
    const articles = [
        {
            uid: 'oa-1',
            title: 'Open trial of sepsis bundles',
            abstract: 'Early bundled care was associated with improved process outcomes in adults with sepsis.',
            isFree: true,
            pubdate: '2024',
            source: 'Free Journal',
            pubtype: ['Randomized Controlled Trial'],
            pmid: '1',
        },
        {
            uid: 'pay-1',
            title: 'Paywalled sepsis review',
            abstract: 'Paywalled article.',
            pubdate: '2024',
            source: 'Paywall Journal',
        },
        {
            uid: 'oa-2',
            title: 'Open review of septic shock vasopressors',
            abstract: 'Norepinephrine remained the first line vasopressor in most included guidance and review evidence.',
            openAccess: true,
            openAccessUrl: 'https://example.test/oa-2',
            pubdate: '2025',
            source: 'Open Review',
            pubtype: ['Systematic Review'],
            doi: '10.1/test',
        },
    ];

    test('selectFreeEvidence keeps only free/open access papers', () => {
        const selected = selectFreeEvidence(articles, 5);

        expect(selected.map((a) => a.uid)).toEqual(['oa-1', 'oa-2']);
    });

    test('generates a structured consensus synopsis from built-in LLM output', async () => {
        const fetchImpl = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                candidates: [{
                    content: {
                        parts: [{
                            text: JSON.stringify({
                                statement: 'The supplied free papers support early bundled sepsis care and norepinephrine-first vasopressor strategy [1, 2].',
                                clinicalBottomLine: 'Use the evidence as discussion support for bundled care and vasopressor choice, while checking current local guidance [1, 2].',
                                areasOfAgreement: ['Bundled care is consistently emphasised [1].'],
                                areasOfUncertainty: ['Optimal timing details vary across source types [1, 2].'],
                                conflictingSignals: [],
                                evidenceStrength: 'MODERATE',
                                strengthRationale: 'The set mixes a trial and review evidence.',
                                whatNotToOverclaim: ['Do not claim patient-specific treatment recommendations from this synopsis alone.'],
                                quizFocusPoints: ['Identify what outcome the bundle evidence supports.'],
                            }),
                        }],
                    },
                }],
            }),
        });

        const synopsis = await generateConsensusSynopsis({
            topic: 'sepsis',
            articles,
            serverConfig: { keys: { gemini: 'test-key' } },
            fetchImpl,
        });

        expect(synopsis.status).toBe('generated');
        expect(synopsis.freePaperCount).toBe(2);
        expect(synopsis.includedArticles).toHaveLength(2);
        expect(synopsis.evidenceScope).toBe('free_open_access_only');
        expect(synopsis.statement).toContain('[1, 2]');
        expect(synopsis.evidenceStrength).toBe('MODERATE');
        expect(synopsis.citationValidation.ok).toBe(true);
        expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    test('uses cached full-text sections when available', async () => {
        const fetchImpl = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                candidates: [{
                    content: {
                        parts: [{
                            text: JSON.stringify({
                                statement: 'The supplied full-text papers support cautious synthesis [1, 2].',
                                clinicalBottomLine: 'Interpret the result with source verification [1].',
                                areasOfAgreement: ['Full text was available for one paper [1].'],
                                areasOfUncertainty: ['External validity remains uncertain [2].'],
                                conflictingSignals: [],
                                evidenceStrength: 'LOW',
                                strengthRationale: 'Limited source set.',
                                whatNotToOverclaim: [],
                                quizFocusPoints: [],
                            }),
                        }],
                    },
                }],
            }),
        });
        const cache = {
            getAsync: jest.fn(async (key) => key.includes('pdf:preindex:1')
                ? {
                    wordCount: 2400,
                    sections: {
                        methods: 'Randomised adults with sepsis to early bundle versus usual care.',
                        results: 'The primary process outcome improved, but mortality was not definitively reduced.',
                    },
                    orderedKeys: ['methods', 'results'],
                }
                : null),
        };

        const synopsis = await generateConsensusSynopsis({
            topic: 'sepsis',
            articles,
            serverConfig: { keys: { gemini: 'test-key' } },
            fetchImpl,
            cache,
        });

        const requestBody = JSON.parse(fetchImpl.mock.calls[0][1].body);
        const prompt = requestBody.contents[0].parts[0].text;
        expect(prompt).toContain('cached full text');
        expect(prompt).toContain('mortality was not definitively reduced');
        expect(synopsis.includedArticles[0].fullTextIndexed).toBe(true);
        expect(synopsis.includedArticles[0].fullTextSections).toEqual(['methods', 'results']);
    });

    test('withholds consensus statement when generated claims lack valid citations', async () => {
        const fetchImpl = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                candidates: [{
                    content: {
                        parts: [{
                            text: JSON.stringify({
                                statement: 'The supplied papers prove a practice-changing mortality benefit.',
                                clinicalBottomLine: 'This should change bedside management immediately.',
                                areasOfAgreement: ['Unsupported agreement.'],
                                areasOfUncertainty: ['Evidence gaps remain.'],
                                conflictingSignals: ['Invalid conflict [9].'],
                                evidenceStrength: 'HIGH',
                                strengthRationale: 'Overconfident.',
                                whatNotToOverclaim: [],
                                quizFocusPoints: [],
                            }),
                        }],
                    },
                }],
            }),
        });

        const synopsis = await generateConsensusSynopsis({
            topic: 'sepsis',
            articles,
            serverConfig: { keys: { gemini: 'test-key' } },
            fetchImpl,
        });

        expect(synopsis.statement).toContain('No defensible cited consensus');
        expect(synopsis.clinicalBottomLine).toBe('');
        expect(synopsis.areasOfAgreement).toEqual([]);
        expect(synopsis.conflictingSignals).toEqual([]);
        expect(synopsis.evidenceStrength).toBe('VERY_LOW');
        expect(synopsis.citationValidation.ok).toBe(false);
    });

    test('safe generation returns insufficient evidence state without an LLM call', async () => {
        const fetchImpl = jest.fn();
        const synopsis = await generateConsensusSynopsisSafe({
            topic: 'single paper topic',
            articles: articles.slice(0, 1),
            serverConfig: { keys: { gemini: 'test-key' } },
            fetchImpl,
        });

        expect(synopsis.status).toBe('insufficient_free_evidence');
        expect(synopsis.evidenceStrength).toBe('VERY_LOW');
        expect(fetchImpl).not.toHaveBeenCalled();
    });
});
