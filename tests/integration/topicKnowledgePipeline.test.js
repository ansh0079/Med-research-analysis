'use strict';

/**
 * End-to-end wiring test for the topic knowledge pipeline.
 *
 * Everything from `extractAndUpsertTopicKnowledge` down runs for real: evidence
 * fetch, provider selection, the AI proxy, fence stripping, JSON parsing, schema
 * validation and the upsert call. Only the network boundary is stubbed.
 *
 * This exists because the unit suite could not see a total failure. Every test
 * that touched this path injected `extractAndUpsertTopicKnowledge` as a stub, so
 * no test ever loaded the real module -- and it had been throwing
 * "intentHintFromDistribution is not a function" on the very first line of work
 * since the initial commit. Topic knowledge extraction had never once run in
 * production while the suite stayed green.
 *
 * Any test here that mocks our own modules defeats the purpose. Stub `fetchImpl`
 * and nothing else.
 */

const { extractAndUpsertTopicKnowledge } = require('../../server/services/topic/topicKnowledgeExtraction');
const { clearInFlightRequests } = require('../../server/services/externalApiProxy');

const TOPIC = 'sepsis corticosteroids';

const KNOWLEDGE = {
    mentorMessage: 'Corticosteroids in septic shock shorten time to shock reversal without a clear mortality benefit [1].',
    teachingPoints: [
        { point: 'Hydrocortisone speeds shock reversal in vasopressor-dependent septic shock.', sourceIndex: 1 },
    ],
    mcqAngles: ['When to start hydrocortisone in septic shock'],
    caseGenerationHooks: ['Vasopressor-dependent septic shock at 12 hours'],
    seminalPapers: [
        {
            sourceIndex: 1,
            title: 'Hydrocortisone plus Fludrocortisone for Adults with Septic Shock',
            whySeminal: 'Showed lower 90-day mortality with combined steroid therapy.',
            clinicalPrinciple: 'Steroids are reserved for vasopressor-dependent shock.',
            evidenceStrength: 'HIGH',
        },
    ],
};

// The pipeline requires at least 2 evidence articles before it will build a guide.
const PUBMED_ARTICLES = [
    {
        uid: '29490185',
        title: 'Hydrocortisone plus Fludrocortisone for Adults with Septic Shock',
        abstract: 'In this multicentre randomised trial of adults with septic shock, 90-day mortality was lower with hydrocortisone plus fludrocortisone than with placebo.',
        journal: 'N Engl J Med',
        pubdate: '2018/03/01',
        pubtype: ['Randomized Controlled Trial'],
        doi: '10.1056/NEJMoa1705716',
        pmid: '29490185',
    },
    {
        uid: '29347874',
        title: 'Adjunctive Glucocorticoid Therapy in Patients with Septic Shock',
        abstract: 'In this randomised trial, hydrocortisone did not reduce 90-day mortality in patients with septic shock undergoing mechanical ventilation, though shock resolved faster.',
        journal: 'N Engl J Med',
        pubdate: '2018/01/19',
        pubtype: ['Randomized Controlled Trial'],
        doi: '10.1056/NEJMoa1705835',
        pmid: '29347874',
    },
];

/** Minimal PubMed esearch/esummary/efetch shapes the proxy understands. */
function pubmedResponse(url) {
    const uids = PUBMED_ARTICLES.map((a) => a.uid);
    if (url.includes('esearch')) {
        return { esearchresult: { idlist: uids, count: String(uids.length) } };
    }
    if (url.includes('esummary')) {
        const result = { uids };
        for (const a of PUBMED_ARTICLES) {
            result[a.uid] = {
                uid: a.uid,
                title: a.title,
                fulljournalname: a.journal,
                pubdate: a.pubdate,
                pubtype: a.pubtype,
                articleids: [
                    { idtype: 'doi', value: a.doi },
                    { idtype: 'pubmed', value: a.pmid },
                ],
            };
        }
        return { result };
    }
    return {};
}

/**
 * @param {object} opts
 * @param {string} opts.geminiText  raw text the Gemini endpoint returns
 * @param {string} [opts.finishReason]
 */
function makeFetch({ geminiText, finishReason = 'STOP', onCall } = {}) {
    const calls = [];
    const fetchImpl = async (url, options = {}) => {
        calls.push({ url: String(url), options });
        if (onCall) onCall(String(url), options);

        const json = (payload) => ({
            ok: true,
            status: 200,
            headers: new Map(),
            json: async () => payload,
            text: async () => JSON.stringify(payload),
        });

        if (String(url).includes('generativelanguage.googleapis.com')) {
            return json({
                candidates: [{ finishReason, content: { parts: [{ text: geminiText }] } }],
            });
        }
        if (String(url).includes('eutils.ncbi.nlm.nih.gov')) {
            const payload = pubmedResponse(String(url));
            return {
                ok: true,
                status: 200,
                headers: new Map(),
                json: async () => payload,
                text: async () => (String(url).includes('efetch') ? '' : JSON.stringify(payload)),
            };
        }
        // Every other source (OpenAlex, Semantic Scholar, Crossref) is optional;
        // failing them here proves the pipeline does not depend on them.
        return { ok: false, status: 503, headers: new Map(), json: async () => ({}), text: async () => '' };
    };
    return { fetchImpl, calls };
}

function makeDb(overrides = {}) {
    const upserts = [];
    return {
        upserts,
        getTopicKnowledge: async () => null,
        getGuidelinesByTopic: async () => [],
        upsertTopicKnowledge: async (topic, knowledge, sourceArticles, provenance, confidence) => {
            upserts.push({ topic, knowledge, sourceArticles, provenance, confidence });
            return { id: 'tk-1' };
        },
        ...overrides,
    };
}

// getSharedAiService caches one instance keyed on serverConfig *object identity*,
// so reusing a single config object across tests would silently hand every later
// test the first test's fetchImpl. Build a fresh object each time.
const serverConfig = (keys = { gemini: 'test-gemini-key', ncbi: 'test-ncbi-key' }) => ({ keys });

describe('topic knowledge pipeline (real modules, stubbed network)', () => {
    beforeEach(() => {
        // The proxy dedupes identical in-flight requests; without this a later
        // test can be served the previous test's response.
        clearInFlightRequests();
    });

    test('runs end to end and upserts validated knowledge', async () => {
        const { fetchImpl } = makeFetch({ geminiText: '```json\n' + JSON.stringify(KNOWLEDGE) + '\n```' });
        const db = makeDb();

        await extractAndUpsertTopicKnowledge({
            topic: TOPIC, serverConfig: serverConfig(), db, fetchImpl,
        });

        expect(db.upserts).toHaveLength(1);
        expect(db.upserts[0].knowledge.mentorMessage).toContain('Corticosteroids');
        expect(db.upserts[0].sourceArticles.length).toBeGreaterThan(0);
    });

    test('sends an explicit output-token budget, not the provider default', async () => {
        // Without this the response is capped at 2500 tokens and the JSON arrives
        // truncated, which surfaced as an unparseable-JSON error in production.
        let generationConfig = null;
        const { fetchImpl } = makeFetch({
            geminiText: JSON.stringify(KNOWLEDGE),
            onCall: (url, options) => {
                if (url.includes('generativelanguage') && options.body) {
                    generationConfig = JSON.parse(options.body).generationConfig;
                }
            },
        });

        await extractAndUpsertTopicKnowledge({
            topic: TOPIC, serverConfig: serverConfig(), db: makeDb(), fetchImpl,
        });

        expect(generationConfig.maxOutputTokens).toBeGreaterThanOrEqual(8192);
        // Thinking tokens count against that budget, so they must be off.
        expect(generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
    });

    test('sends a timeout in the shape safeFetch reads', async () => {
        // safeFetch overwrites `signal`, so a timeout passed that way was dropped
        // and every provider call was pinned to the 30s default.
        let geminiOptions = null;
        const { fetchImpl } = makeFetch({
            geminiText: JSON.stringify(KNOWLEDGE),
            onCall: (url, options) => {
                if (url.includes('generativelanguage')) geminiOptions = options;
            },
        });

        await extractAndUpsertTopicKnowledge({
            topic: TOPIC, serverConfig: serverConfig(), db: makeDb(), fetchImpl,
        });

        expect(geminiOptions.timeout).toBeGreaterThan(30000);
    });

    test('accepts a bare JSON response with no code fence', async () => {
        const { fetchImpl } = makeFetch({ geminiText: JSON.stringify(KNOWLEDGE) });
        const db = makeDb();

        await extractAndUpsertTopicKnowledge({
            topic: TOPIC, serverConfig: serverConfig(), db, fetchImpl,
        });

        expect(db.upserts).toHaveLength(1);
    });

    test('fails loudly when the response was cut off, instead of upserting partial knowledge', async () => {
        const truncated = '```json\n' + JSON.stringify(KNOWLEDGE).slice(0, 200);
        const { fetchImpl } = makeFetch({ geminiText: truncated, finishReason: 'MAX_TOKENS' });
        const db = makeDb();

        // Assert the *cause*, not just that it threw: truncated JSON fails to parse
        // either way, so a bare toThrow() would still pass with the finishReason
        // check removed -- and the error would go back to reading like a
        // formatting fault instead of naming the truncation.
        await expect(extractAndUpsertTopicKnowledge({
            topic: TOPIC, serverConfig: serverConfig(), db, fetchImpl,
        })).rejects.toThrow(/finishReason: MAX_TOKENS/);

        expect(db.upserts).toHaveLength(0);
    });

    test('reports truncation even when the cut-off response still parses as JSON', async () => {
        // The dangerous case: the model stops early but what came back happens to
        // be valid JSON, so nothing downstream notices it is missing content.
        const partial = JSON.stringify({ ...KNOWLEDGE, teachingPoints: KNOWLEDGE.teachingPoints });
        const { fetchImpl } = makeFetch({ geminiText: partial, finishReason: 'MAX_TOKENS' });
        const db = makeDb();

        await expect(extractAndUpsertTopicKnowledge({
            topic: TOPIC, serverConfig: serverConfig(), db, fetchImpl,
        })).rejects.toThrow(/finishReason: MAX_TOKENS/);

        expect(db.upserts).toHaveLength(0);
    });

    test('rejects knowledge that fails shape validation rather than storing it', async () => {
        const bad = { ...KNOWLEDGE, teachingPoints: [] };
        const { fetchImpl } = makeFetch({ geminiText: JSON.stringify(bad) });
        const db = makeDb();

        await expect(extractAndUpsertTopicKnowledge({
            topic: TOPIC, serverConfig: serverConfig(), db, fetchImpl,
        })).rejects.toThrow();

        expect(db.upserts).toHaveLength(0);
    });

    test('does not need OpenAlex or Semantic Scholar to be reachable', async () => {
        // Both return 503 in this harness. PubMed alone must carry the pipeline,
        // which is what makes the beta viable while those accounts are unusable.
        const { fetchImpl, calls } = makeFetch({ geminiText: JSON.stringify(KNOWLEDGE) });
        const db = makeDb();

        await extractAndUpsertTopicKnowledge({
            topic: TOPIC, serverConfig: serverConfig(), db, fetchImpl,
        });

        expect(db.upserts).toHaveLength(1);
        expect(calls.some((c) => c.url.includes('eutils.ncbi.nlm.nih.gov'))).toBe(true);
    });

    test('surfaces a protected-topic upsert as a 409 rather than swallowing it', async () => {
        const { fetchImpl } = makeFetch({ geminiText: JSON.stringify(KNOWLEDGE) });
        const db = makeDb({ upsertTopicKnowledge: async () => ({ protected: true }) });

        await expect(extractAndUpsertTopicKnowledge({
            topic: TOPIC, serverConfig: serverConfig(), db, fetchImpl,
        })).rejects.toMatchObject({ statusCode: 409 });
    });

    test('throws a clear error when no provider key is configured', async () => {
        const { fetchImpl } = makeFetch({ geminiText: JSON.stringify(KNOWLEDGE) });

        await expect(extractAndUpsertTopicKnowledge({
            topic: TOPIC, serverConfig: serverConfig({}), db: makeDb(), fetchImpl,
        })).rejects.toThrow(/No AI provider configured/);
    });
});
