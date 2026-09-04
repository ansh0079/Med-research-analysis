'use strict';

/**
 * End-to-end wiring test for cold-start MCQ generation.
 *
 * Third in the series with topicKnowledgePipeline and paperSynopsisPipeline,
 * closing the last leg of the core loop: topic -> evidence -> synopsis -> MCQs.
 * `mcqGeneratorService` is replaced by `jest.mock` in topicEvolutionService's
 * tests, so the real generator ran at 78% statements with a third of its
 * functions never called.
 *
 * Everything below `generateAndStoreMCQs` runs for real: prompt construction,
 * the AI proxy, structured-output validation, numeric grounding, diversity
 * enforcement and the teaching-object upsert. Only `fetchImpl` is stubbed.
 * Do not jest.mock our own modules here.
 */

const { createAiService } = require('../../server/services/ai/aiService');
const { generateAndStoreMCQs } = require('../../server/services/learning/mcqGeneratorService');
const { clearInFlightRequests } = require('../../server/services/externalApiProxy');

const TOPIC = 'sepsis corticosteroids';

const SOURCE_ARTICLES = [
    {
        uid: '29490185',
        title: 'Hydrocortisone plus Fludrocortisone for Adults with Septic Shock',
        abstract: 'Among adults with septic shock, 90-day all-cause mortality was 43.0% with hydrocortisone plus fludrocortisone and 49.1% with placebo. Vasopressor-free days were higher in the treatment group.',
        journal: 'N Engl J Med',
        pubdate: '2018/03/01',
    },
];

const KNOWLEDGE = {
    mentorMessage: 'Steroids are reserved for vasopressor-dependent septic shock.',
    teachingPoints: [{ point: 'Hydrocortisone speeds shock reversal.', sourceIndex: 1 }],
    mcqAngles: ['When to start hydrocortisone in septic shock'],
};

/** A spread of types and difficulties, so diversity selection has real choices. */
function mcq(i, type, difficulty, extra = {}) {
    return {
        question: `A patient with septic shock is on noradrenaline. Scenario ${i}: what is the next step?`,
        options: ['A: Start hydrocortisone', 'B: Withhold steroids', 'C: Increase fluids only', 'D: Start antibiotics only'],
        correctAnswer: 'A',
        explanation: 'Hydrocortisone is indicated in vasopressor-dependent septic shock [1].',
        type,
        difficulty,
        ...extra,
    };
}

const QUESTIONS = [
    mcq(1, 'recall', 'easy'),
    mcq(2, 'clinical_application', 'medium'),
    mcq(3, 'clinical_application', 'medium'),
    mcq(4, 'guideline', 'easy'),
    mcq(5, 'pitfall', 'hard'),
];

/**
 * getSharedAiService caches per serverConfig object identity. createAiService
 * builds a fresh instance every call, so each test gets its own fetchImpl --
 * but keep the config per-test anyway to stay consistent with the sibling files.
 */
const serverConfig = (keys = { gemini: 'test-gemini-key' }) => ({ keys });

function makeFetch({ payload = { questions: QUESTIONS }, finishReason = 'STOP', onCall } = {}) {
    const calls = [];
    const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const fetchImpl = async (url, options = {}) => {
        const u = String(url);
        calls.push({ url: u, options });
        if (onCall) onCall(u, options);
        const res = (body, ok = true, status = 200) => ({
            ok, status,
            headers: new Map(),
            json: async () => body,
            text: async () => JSON.stringify(body),
        });
        if (u.includes('generativelanguage.googleapis.com')) {
            return res({ candidates: [{ finishReason, content: { parts: [{ text }] } }] });
        }
        if (u.includes('api.anthropic.com')) {
            return res({ content: [{ text }], stop_reason: 'end_turn' });
        }
        return res({}, false, 503);
    };
    return { fetchImpl, calls };
}

function makeDb(overrides = {}) {
    const upserts = [];
    const deletes = [];
    return {
        upserts,
        deletes,
        normalizeTopic: (t) => String(t || '').trim().toLowerCase(),
        getTeachingObjectByKey: async () => null,
        deleteTeachingObject: async (key) => { deletes.push(key); },
        upsertTeachingObject: async (obj) => { upserts.push(obj); return obj; },
        ...overrides,
    };
}

const aiFor = (fetchImpl, keys) => createAiService({ serverConfig: serverConfig(keys), fetchImpl });

describe('MCQ generation pipeline (real modules, stubbed network)', () => {
    beforeEach(() => {
        clearInFlightRequests();
    });

    test('generates, selects and stores MCQs as a cold_start_mcq object', async () => {
        const { fetchImpl } = makeFetch();
        const db = makeDb();

        const result = await generateAndStoreMCQs(db, aiFor(fetchImpl), TOPIC, KNOWLEDGE, { sourceArticles: SOURCE_ARTICLES });

        expect(result.count).toBeGreaterThan(0);
        expect(db.upserts).toHaveLength(1);
        expect(db.upserts[0].objectType).toBe('cold_start_mcq');
        expect(db.upserts[0].payload.mcqs.length).toBe(result.count);
        expect(db.upserts[0].topic).toBe('sepsis corticosteroids');
    });

    test('stores the topic normalized, so lookups by topic can find it', async () => {
        const { fetchImpl } = makeFetch();
        const db = makeDb({ normalizeTopic: (t) => String(t).trim().toLowerCase() });

        await generateAndStoreMCQs(db, aiFor(fetchImpl), '  Sepsis Corticosteroids  ', KNOWLEDGE, { sourceArticles: SOURCE_ARTICLES });

        expect(db.upserts[0].topic).toBe('sepsis corticosteroids');
    });

    test('drops questions whose numbers are not in the source articles, keeping the rest', async () => {
        // One invented statistic must not discard an otherwise valid batch, but it
        // must not be stored either.
        const withFabrication = [
            ...QUESTIONS,
            mcq(6, 'recall', 'easy', {
                explanation: 'Mortality fell from 91.7% to 3.2% in the steroid arm [1].',
            }),
        ];
        const { fetchImpl } = makeFetch({ payload: { questions: withFabrication } });
        const db = makeDb();

        const result = await generateAndStoreMCQs(db, aiFor(fetchImpl), TOPIC, KNOWLEDGE, { sourceArticles: SOURCE_ARTICLES });

        const stored = JSON.stringify(db.upserts[0].payload.mcqs);
        expect(stored).not.toContain('91.7');
        expect(result.count).toBeGreaterThan(0);
    });

    test('sends a timeout in the shape safeFetch reads', async () => {
        // safeFetch overwrites `signal`, so a timeout passed that way is dropped
        // and the call silently falls back to the 30s default.
        let seen = null;
        const { fetchImpl } = makeFetch({
            onCall: (url, options) => { if (url.includes('generativelanguage')) seen = options; },
        });

        await generateAndStoreMCQs(makeDb(), aiFor(fetchImpl), TOPIC, KNOWLEDGE, { sourceArticles: SOURCE_ARTICLES });

        expect(typeof seen.timeout).toBe('number');
        expect(seen.signal).toBeUndefined();
    });

    test('refuses a truncated response rather than storing a partial question set', async () => {
        const { fetchImpl } = makeFetch({
            payload: JSON.stringify({ questions: QUESTIONS }).slice(0, 150),
            finishReason: 'MAX_TOKENS',
        });
        const db = makeDb();

        await expect(generateAndStoreMCQs(db, aiFor(fetchImpl), TOPIC, KNOWLEDGE, { sourceArticles: SOURCE_ARTICLES }))
            .rejects.toThrow(/finishReason: MAX_TOKENS/);

        expect(db.upserts).toHaveLength(0);
    });

    test('rejects an empty question set instead of storing zero MCQs', async () => {
        const { fetchImpl } = makeFetch({ payload: { questions: [] } });
        const db = makeDb();

        await expect(generateAndStoreMCQs(db, aiFor(fetchImpl), TOPIC, KNOWLEDGE, { sourceArticles: SOURCE_ARTICLES }))
            .rejects.toThrow();

        expect(db.upserts).toHaveLength(0);
    });

    test('skips regeneration when recent high-quality MCQs already exist', async () => {
        const { fetchImpl, calls } = makeFetch();
        const db = makeDb({
            getTeachingObjectByKey: async () => ({
                objectKey: 'existing',
                confidence: 0.85,
                generatedAt: new Date().toISOString(),
                payload: { mcqs: [mcq(1, 'recall', 'easy')] },
            }),
        });

        const result = await generateAndStoreMCQs(db, aiFor(fetchImpl), TOPIC, KNOWLEDGE, { sourceArticles: SOURCE_ARTICLES });

        expect(result.skipped).toBe(true);
        expect(db.upserts).toHaveLength(0);
        expect(calls.filter((c) => c.url.includes('generativelanguage'))).toHaveLength(0);
    });

    test('regenerates when the existing set is old and low confidence', async () => {
        const old = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();
        const { fetchImpl } = makeFetch();
        const db = makeDb({
            getTeachingObjectByKey: async () => ({
                objectKey: 'stale-key',
                confidence: 0.4,
                generatedAt: old,
                payload: { mcqs: [mcq(1, 'recall', 'easy')] },
            }),
        });

        const result = await generateAndStoreMCQs(db, aiFor(fetchImpl), TOPIC, KNOWLEDGE, { sourceArticles: SOURCE_ARTICLES });

        expect(result.skipped).toBeUndefined();
        expect(db.deletes).toContain('stale-key');
        expect(db.upserts).toHaveLength(1);
    });

    test('still stores MCQs when deleting the stale object fails', async () => {
        // The delete is best-effort; losing it must not cost the regeneration.
        const old = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();
        const { fetchImpl } = makeFetch();
        const db = makeDb({
            getTeachingObjectByKey: async () => ({
                objectKey: 'stale-key', confidence: 0.4, generatedAt: old,
                payload: { mcqs: [mcq(1, 'recall', 'easy')] },
            }),
            deleteTeachingObject: async () => { throw new Error('delete failed'); },
        });

        const result = await generateAndStoreMCQs(db, aiFor(fetchImpl), TOPIC, KNOWLEDGE, { sourceArticles: SOURCE_ARTICLES });

        expect(result.count).toBeGreaterThan(0);
        expect(db.upserts).toHaveLength(1);
    });

    test('records a confidence score reflecting the diversity actually achieved', async () => {
        const { fetchImpl } = makeFetch();
        const db = makeDb();

        const result = await generateAndStoreMCQs(db, aiFor(fetchImpl), TOPIC, KNOWLEDGE, { sourceArticles: SOURCE_ARTICLES });

        expect(result.confidence).toBeGreaterThanOrEqual(0.65);
        expect(db.upserts[0].confidence).toBe(result.confidence);
        expect(result.diversityReport).toBeTruthy();
    });
});
