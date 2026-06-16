jest.mock('../../server/utils/fetch', () => ({
    fetchWithTimeout: jest.fn(),
    safeFetch: jest.fn(),
}));

const { fetchWithTimeout: fetch } = require('../../server/utils/fetch');
const { discoverGuidelinesForTopic } = require('../../server/services/guidelineService');

function mockEsearchThenEfetch({ ids, efetchXml }) {
    fetch
        .mockImplementationOnce(async () => ({
            ok: true,
            json: async () => ({ esearchresult: { idlist: ids } }),
        }))
        .mockImplementationOnce(async () => ({
            ok: true,
            json: async () => ({
                result: Object.fromEntries(ids.map(id => [id, { title: `Guideline ${id}`, source: 'Body', pubdate: '2024' }])),
            }),
        }))
        .mockImplementationOnce(async () => ({
            ok: true,
            text: async () => efetchXml,
        }));
}

function buildAbstractXml(pmid) {
    return `<PubmedArticle><PMID>${pmid}</PMID><ArticleTitle>Title ${pmid}</ArticleTitle>` +
        `<Title>Journal</Title><PubDate><Year>2024</Year></PubDate>` +
        `<AbstractText>This is a long enough abstract to pass the 50 character minimum length filter applied by the service.</AbstractText>` +
        `</PubmedArticle>`;
}

function makeDb() {
    return {
        normalizeTopic: (t) => String(t).toLowerCase().trim(),
        createGuideline: jest.fn().mockResolvedValue({ id: 'g1' }),
    };
}

const serverConfig = { keys: { anthropic: 'test-key', ncbi: '', ncbiEmail: '' } };

beforeEach(() => {
    fetch.mockReset();
});

describe('discoverGuidelinesForTopic JSON parsing', () => {
    test('inserts guidelines when the AI returns a clean JSON array', async () => {
        mockEsearchThenEfetch({ ids: ['211'], efetchXml: buildAbstractXml('211') });
        const db = makeDb();
        const aiService = {
            callClaude: jest.fn().mockResolvedValue(JSON.stringify([
                { sourceBody: 'AHA', sourceYear: 2024, recommendationText: 'Do the thing.' },
            ])),
        };

        const result = await discoverGuidelinesForTopic('sepsis main', { db, serverConfig, aiService });

        expect(result).toHaveLength(1);
        expect(db.createGuideline).toHaveBeenCalledWith(expect.objectContaining({ sourceBody: 'AHA' }));
    });

    test('parses a JSON array wrapped in markdown fences', async () => {
        mockEsearchThenEfetch({ ids: ['212'], efetchXml: buildAbstractXml('212') });
        const db = makeDb();
        const aiService = {
            callClaude: jest.fn().mockResolvedValue(
                '```json\n[{"sourceBody":"ESC","sourceYear":2023,"recommendationText":"Do it."}]\n```'
            ),
        };

        const result = await discoverGuidelinesForTopic('heart failure main', { db, serverConfig, aiService });

        expect(result).toHaveLength(1);
    });

    test('returns an empty array and does not throw when the AI response is truncated/malformed JSON', async () => {
        mockEsearchThenEfetch({ ids: ['213'], efetchXml: buildAbstractXml('213') });
        const db = makeDb();
        const aiService = {
            callClaude: jest.fn().mockResolvedValue('[{"sourceBody":"WHO","recommendationText":"Truncated'),
        };

        const result = await discoverGuidelinesForTopic('malaria main', { db, serverConfig, aiService });

        expect(result).toEqual([]);
        expect(db.createGuideline).not.toHaveBeenCalled();
    });

    test('returns an empty array when the AI response contains no array at all', async () => {
        mockEsearchThenEfetch({ ids: ['214'], efetchXml: buildAbstractXml('214') });
        const db = makeDb();
        const aiService = {
            callClaude: jest.fn().mockResolvedValue('I could not find any guideline recommendations.'),
        };

        const result = await discoverGuidelinesForTopic('rare disease x main', { db, serverConfig, aiService });

        expect(result).toEqual([]);
    });

    test('skips recommendations missing required fields without throwing', async () => {
        mockEsearchThenEfetch({ ids: ['215'], efetchXml: buildAbstractXml('215') });
        const db = makeDb();
        const aiService = {
            callClaude: jest.fn().mockResolvedValue(JSON.stringify([
                { sourceBody: 'NICE' },
                { recommendationText: 'No source body given.' },
                { sourceBody: 'IDSA', recommendationText: 'Valid one.' },
            ])),
        };

        const result = await discoverGuidelinesForTopic('uti main', { db, serverConfig, aiService });

        expect(result).toHaveLength(1);
        expect(db.createGuideline).toHaveBeenCalledTimes(1);
    });

    test('returns an empty array when no guideline publications are found on PubMed', async () => {
        fetch.mockImplementationOnce(async () => ({
            ok: true,
            json: async () => ({ esearchresult: { idlist: [] } }),
        }));
        const db = makeDb();
        const aiService = { callClaude: jest.fn() };

        const result = await discoverGuidelinesForTopic('extremely obscure topic main', { db, serverConfig, aiService });

        expect(result).toEqual([]);
        expect(aiService.callClaude).not.toHaveBeenCalled();
    });
});
