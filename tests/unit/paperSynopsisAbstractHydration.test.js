'use strict';

const callStructured = jest.fn();

jest.mock('../../server/services/aiService', () => {
    const actual = jest.requireActual('../../server/services/aiService');
    return {
        ...actual,
        getSharedAiService: jest.fn(() => ({ callStructured })),
    };
});

jest.mock('../../server/services/pdfPreindexService', () => ({
    enrichWithCachedFullText: jest.fn(async (articles) => articles),
    enqueuePdfPreindex: jest.fn(),
}));

jest.mock('../../server/services/personalizationBanditService', () => ({
    selectSynopsisStyleArm: jest.fn(async () => null),
    recordBanditReward: jest.fn(),
    POLICY_SYNOPSIS_STYLE: 'synopsis_style',
}));

jest.mock('../../server/services/teachingObjectService', () => ({
    persistPaperTeachingObject: jest.fn(async () => null),
}));

const {
    runPaperSynopsisGeneration,
    SYNOPSIS_NO_SOURCE_TEXT,
} = require('../../server/services/paperSynopsisCore');

const VALID_SYNOPSIS = {
    takeaway: 'Terlipressin can reverse hepatorenal syndrome in selected patients [1]',
    clinicalQuestion: 'Does terlipressin improve renal function in HRS? [1]',
    mainFindings: 'Review summarises diagnostic criteria and terlipressin [1]',
    clinicalMeaning: 'Use current diagnostic criteria before treating [1]',
    bottomLine: 'Treat confirmed HRS with vasoconstrictors when indicated [1]',
    trustRating: 'MODERATE',
    trustRationale: 'Narrative review without new trial data [1]',
    whatNotToOverclaim: ['Do not treat on title alone'],
    quizFocusPoints: ['HRS diagnostic criteria'],
};

describe('paper synopsis abstract hydration', () => {
    const serverConfig = { keys: { gemini: 'test-key' } };

    beforeEach(() => {
        jest.clearAllMocks();
        callStructured.mockResolvedValue(VALID_SYNOPSIS);
    });

    test('throws a clear error when the paper has no abstract or full text', async () => {
        const fetchImpl = jest.fn(async () => ({ ok: false, status: 404, text: async () => '' }));

        await expect(runPaperSynopsisGeneration({
            article: { uid: 'pubmed-37397940', pmid: '37397940', title: 'HRS review' },
            serverConfig,
            fetchImpl,
            cache: { getAsync: jest.fn(), setAsync: jest.fn() },
        })).rejects.toThrow(SYNOPSIS_NO_SOURCE_TEXT);

        expect(callStructured).not.toHaveBeenCalled();
    });

    test('hydrates a PubMed abstract before calling the LLM', async () => {
        const fetchImpl = jest.fn(async () => ({
            ok: true,
            text: async () => `
                <PubmedArticle>
                  <PMID>37397940</PMID>
                  <AbstractText Label="AIM">Hepatorenal syndrome is a severe complication of cirrhosis with recent diagnostic updates.</AbstractText>
                </PubmedArticle>
            `,
        }));

        const result = await runPaperSynopsisGeneration({
            article: {
                uid: 'pubmed-37397940',
                pmid: '37397940',
                title: 'Recent advances in pathophysiology, diagnosis and management of hepatorenal syndrome: A review',
            },
            serverConfig,
            fetchImpl,
            cache: { getAsync: jest.fn().mockResolvedValue(null), setAsync: jest.fn() },
        });

        expect(result.synopsis.bottomLine).toContain('vasoconstrictors');
        expect(callStructured).toHaveBeenCalledTimes(1);
        const prompt = callStructured.mock.calls[0][0];
        expect(prompt).toContain('Hepatorenal syndrome is a severe complication');
        expect(prompt).not.toContain('[No abstract available');
        expect(fetchImpl.mock.calls[0][0]).toContain('efetch.fcgi');
    });
});
