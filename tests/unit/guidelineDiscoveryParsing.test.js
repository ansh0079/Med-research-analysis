jest.mock('../../server/utils/fetch', () => ({
    fetchWithTimeout: jest.fn(),
    safeFetch: jest.fn(),
}));

const { fetchWithTimeout: fetch } = require('../../server/utils/fetch');
const { discoverGuidelinesForTopic, wasDiscoveryAttempted } = require('../../server/services/guidelineService');

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
    return `<PubmedArticle><PMID>${pmid}</PMID><ArticleTitle>AHA ESC IDSA joint guideline ${pmid}</ArticleTitle>` +
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
            callText: jest.fn().mockResolvedValue(JSON.stringify([
                { pmid: '211', sourceBody: 'AHA', sourceYear: 2024, recommendationText: 'Do the thing.' },
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
            callText: jest.fn().mockResolvedValue(
                '```json\n[{"pmid":"212","sourceBody":"ESC","sourceYear":2023,"recommendationText":"Do it."}]\n```'
            ),
        };

        const result = await discoverGuidelinesForTopic('heart failure main', { db, serverConfig, aiService });

        expect(result).toHaveLength(1);
    });

    test('returns an empty array and does not throw when the AI response is truncated/malformed JSON', async () => {
        mockEsearchThenEfetch({ ids: ['213'], efetchXml: buildAbstractXml('213') });
        const db = makeDb();
        const aiService = {
            callText: jest.fn().mockResolvedValue('[{"sourceBody":"WHO","recommendationText":"Truncated'),
        };

        const result = await discoverGuidelinesForTopic('malaria main', { db, serverConfig, aiService });

        expect(result).toEqual([]);
        expect(db.createGuideline).not.toHaveBeenCalled();
    });

    test('returns an empty array when the AI response contains no array at all', async () => {
        mockEsearchThenEfetch({ ids: ['214'], efetchXml: buildAbstractXml('214') });
        const db = makeDb();
        const aiService = {
            callText: jest.fn().mockResolvedValue('I could not find any guideline recommendations.'),
        };

        const result = await discoverGuidelinesForTopic('rare disease x main', { db, serverConfig, aiService });

        expect(result).toEqual([]);
    });

    test('skips recommendations missing required fields without throwing', async () => {
        mockEsearchThenEfetch({ ids: ['215'], efetchXml: buildAbstractXml('215') });
        const db = makeDb();
        const aiService = {
            callText: jest.fn().mockResolvedValue(JSON.stringify([
                { sourceBody: 'NICE' },
                { recommendationText: 'No source body given.' },
                { pmid: '215', sourceBody: 'IDSA', recommendationText: 'Valid one.' },
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
        const aiService = { callText: jest.fn() };

        const result = await discoverGuidelinesForTopic('extremely obscure topic main', { db, serverConfig, aiService });

        expect(result).toEqual([]);
        expect(aiService.callText).not.toHaveBeenCalled();
    });
});

describe('the empty-topic cache reflects what the model found, not what the DB write returned', () => {
    // db.createGuideline can resolve falsy for a row that committed successfully
    // -- that is exactly what a missing RETURNING clause did on Postgres for
    // every insert across 7 of 10 pilot topics on 2026-09-09 (see
    // guidelineWriteReturnValue.test.js). Gating the empty-cache on
    // inserted.length would poison it for a topic that in fact has guidelines,
    // suppressing re-discovery for EMPTY_CACHE_TTL. It must gate on whether
    // anything was worth writing, independent of the write's return value.

    test('a real candidate whose write returns falsy does not get the topic marked empty', async () => {
        mockEsearchThenEfetch({ ids: ['216'], efetchXml: buildAbstractXml('216') });
        const db = makeDb();
        db.createGuideline = jest.fn().mockResolvedValue(undefined); // the exact bug
        const aiService = {
            callText: jest.fn().mockResolvedValue(JSON.stringify([
                { pmid: '216', sourceBody: 'IDSA', sourceYear: 2024, recommendationText: 'A real recommendation about treatment.' },
            ])),
        };

        const topic = 'pilot topic returning undefined main';
        const result = await discoverGuidelinesForTopic(topic, { db, serverConfig, aiService });

        expect(db.createGuideline).toHaveBeenCalledTimes(1);
        expect(result).toEqual([]); // the array is still empty -- that part of the bug is unavoidable without the DB fix
        expect(wasDiscoveryAttempted(topic, db)).toBe(false); // but it must not be cached as "searched, found nothing"
    });

    test('genuinely nothing to write still marks the topic empty, so re-discovery does not thrash', async () => {
        mockEsearchThenEfetch({ ids: ['217'], efetchXml: buildAbstractXml('217') });
        const db = makeDb();
        const aiService = { callText: jest.fn().mockResolvedValue('[]') };

        const topic = 'pilot topic with nothing to extract main';
        await discoverGuidelinesForTopic(topic, { db, serverConfig, aiService });

        expect(db.createGuideline).not.toHaveBeenCalled();
        expect(wasDiscoveryAttempted(topic, db)).toBe(true);
    });

    test('a candidate rejected by assessGuidelineCandidate (e.g. "Clinical trial") does not count as attempted', async () => {
        mockEsearchThenEfetch({ ids: ['218'], efetchXml: buildAbstractXml('218') });
        const db = makeDb();
        const aiService = {
            callText: jest.fn().mockResolvedValue(JSON.stringify([
                { sourceBody: 'Clinical trial', recommendationText: 'The 90-day mortality rate was 14%.' },
            ])),
        };

        const topic = 'pilot topic only trial rows main';
        await discoverGuidelinesForTopic(topic, { db, serverConfig, aiService });

        expect(db.createGuideline).not.toHaveBeenCalled();
        expect(wasDiscoveryAttempted(topic, db)).toBe(true);
    });
});
