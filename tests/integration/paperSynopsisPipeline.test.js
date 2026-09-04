'use strict';

/**
 * End-to-end wiring test for paper synopsis generation.
 *
 * Companion to topicKnowledgePipeline.test.js, and written for the same reason:
 * `paperSynopsisCore` is replaced by `jest.mock` in every unit test that touches
 * it (aiRoutes, aiGenerationJobService), so the real generator was reached by
 * almost nothing -- 27% statements, 32% of its functions never called. That is
 * the same blind spot that let topic knowledge extraction throw on its first
 * line of work for the entire life of the project without a single test failing.
 *
 * Everything below `runPaperSynopsisGeneration` runs for real: provider
 * selection and fallback, the AI proxy, structured-output validation, cache
 * keying and the guideline/topic-knowledge context lookups. Only `fetchImpl` is
 * stubbed. Do not add jest.mock of our own modules here -- that would recreate
 * exactly the gap this file exists to close.
 */

const { runPaperSynopsisGeneration, getPaperSynopsisCacheKey } = require('../../server/services/ai/paperSynopsisCore');
const { clearInFlightRequests } = require('../../server/services/externalApiProxy');

const ARTICLE = {
    uid: '29490185',
    title: 'Hydrocortisone plus Fludrocortisone for Adults with Septic Shock',
    abstract: 'In this multicentre randomised trial of adults with septic shock, 90-day all-cause mortality was 43.0% in the hydrocortisone plus fludrocortisone group and 49.1% in the placebo group.',
    journal: 'N Engl J Med',
    pubdate: '2018/03/01',
    pubtype: ['Randomized Controlled Trial'],
    doi: '10.1056/NEJMoa1705716',
    pmid: '29490185',
};

const SYNOPSIS = {
    takeaway: 'Combined hydrocortisone and fludrocortisone reduced 90-day mortality in septic shock.',
    clinicalQuestion: 'Do corticosteroids improve survival in septic shock?',
    studyDesign: 'Multicentre double-blind randomised controlled trial',
    population: 'Adults with septic shock on vasopressors',
    intervention: 'Hydrocortisone plus fludrocortisone',
    comparator: 'Placebo',
    mainFindings: '90-day all-cause mortality was 43.0% versus 49.1% with placebo [1].',
    clinicalMeaning: 'Supports steroids in vasopressor-dependent septic shock.',
    limitations: 'Open questions remain about the fludrocortisone contribution.',
    bottomLine: 'Consider combined steroid therapy in vasopressor-dependent septic shock [1].',
    trustRating: 'HIGH',
    trustRationale: 'Large multicentre randomised trial with blinded outcome assessment.',
    quizFocusPoints: ['Which septic shock patients qualify for steroids [1]'],
    whatNotToOverclaim: ['Does not support steroids in sepsis without shock [1]'],
};

/**
 * getSharedAiService caches one instance keyed on serverConfig *object
 * identity*, so a shared config object would hand every later test the first
 * test's fetchImpl. Always build a fresh one.
 */
const serverConfig = (keys = { gemini: 'test-gemini-key', anthropic: 'test-anthropic-key' }) => ({ keys });

function makeFetch({ text = JSON.stringify(SYNOPSIS), finishReason = 'STOP', failAnthropic = false, onCall } = {}) {
    const calls = [];
    const fetchImpl = async (url, options = {}) => {
        const u = String(url);
        calls.push({ url: u, options });
        if (onCall) onCall(u, options);

        const res = (payload, ok = true, status = 200) => ({
            ok, status,
            headers: new Map(),
            json: async () => payload,
            text: async () => JSON.stringify(payload),
        });

        if (u.includes('api.anthropic.com')) {
            if (failAnthropic) {
                return res({ type: 'error', error: { type: 'invalid_request_error', message: 'Your credit balance is too low' } }, false, 400);
            }
            return res({ content: [{ text }], stop_reason: 'end_turn' });
        }
        if (u.includes('generativelanguage.googleapis.com')) {
            return res({ candidates: [{ finishReason, content: { parts: [{ text }] } }] });
        }
        return res({}, false, 503);
    };
    return { fetchImpl, calls };
}

function makeDb(overrides = {}) {
    const events = [];
    return {
        events,
        normalizeTopic: (t) => String(t || '').trim().toLowerCase(),
        getGuidelinesByTopic: async () => [],
        getTopicKnowledge: async () => null,
        getTeachingObjectForArticle: async () => null,
        getSynopsisFeedbackStats: async () => null,
        insertPersonalizationDecision: async () => ({}),
        logEvent: async (name, sessionId, payload) => { events.push({ name, sessionId, payload }); },
        ...overrides,
    };
}

/** In-memory stand-in for the app cache, with the async API the core uses. */
function makeCache() {
    const store = new Map();
    return {
        store,
        getAsync: async (k) => store.get(k) ?? null,
        setAsync: async (k, v) => { store.set(k, v); },
        get: (k) => store.get(k) ?? null,
        set: (k, v) => { store.set(k, v); },
    };
}

describe('paper synopsis pipeline (real modules, stubbed network)', () => {
    beforeEach(() => {
        clearInFlightRequests();
    });

    test('generates and returns a validated synopsis', async () => {
        const { fetchImpl } = makeFetch();

        const result = await runPaperSynopsisGeneration({
            article: ARTICLE,
            serverConfig: serverConfig(),
            fetchImpl,
            cache: makeCache(),
            db: makeDb(),
            topic: 'sepsis corticosteroids',
        });

        expect(result).toBeTruthy();
        expect(result.synopsis.bottomLine).toContain('septic shock');
        // Only the abstract was available, so the model's HIGH is capped to LOW.
        // That cap is a safety property, not an incidental detail.
        expect(result.synopsis.trustRating).toBe('LOW');
        expect(result.audit.provider).toBeTruthy();
    });

    test('blanks high-stakes fields the model left uncited', async () => {
        // bottomLine without a [1] reference is dropped rather than shown, so an
        // unsourced clinical recommendation can never reach a reader.
        const uncited = { ...SYNOPSIS, bottomLine: 'Give steroids to every septic patient.' };
        const { fetchImpl } = makeFetch({ text: JSON.stringify(uncited) });

        const result = await runPaperSynopsisGeneration({
            article: ARTICLE, serverConfig: serverConfig(), fetchImpl, cache: makeCache(), db: makeDb(), topic: 'sepsis corticosteroids',
        });

        expect(result.synopsis.bottomLine).toBe('');
    });

    test('falls back to the next provider when the first one fails', async () => {
        // Prod ran with an out-of-credit Anthropic key and a funded Gemini key.
        // Any path that resolves a single provider up front dies outright there.
        const { fetchImpl, calls } = makeFetch({ failAnthropic: true });

        const result = await runPaperSynopsisGeneration({
            article: ARTICLE,
            serverConfig: serverConfig(),
            fetchImpl,
            cache: makeCache(),
            db: makeDb(),
            topic: 'sepsis corticosteroids',
        });

        expect(result.synopsis.bottomLine).toContain('septic shock');
        expect(calls.some((c) => c.url.includes('api.anthropic.com'))).toBe(true);
        expect(calls.some((c) => c.url.includes('generativelanguage'))).toBe(true);
    });

    test('sends timeouts in the shape safeFetch reads, on every provider', async () => {
        // safeFetch builds its own AbortController and overwrites `signal`, so a
        // timeout passed that way is silently dropped and the call falls back to
        // the 30s default regardless of configuration.
        const seen = [];
        const { fetchImpl } = makeFetch({
            onCall: (url, options) => {
                if (url.includes('anthropic') || url.includes('generativelanguage')) seen.push(options);
            },
        });

        await runPaperSynopsisGeneration({
            article: ARTICLE,
            serverConfig: serverConfig(),
            fetchImpl,
            cache: makeCache(),
            db: makeDb(),
            topic: 'sepsis corticosteroids',
        });

        expect(seen.length).toBeGreaterThan(0);
        for (const options of seen) {
            expect(typeof options.timeout).toBe('number');
            expect(options.signal).toBeUndefined();
        }
    });

    test('serves a repeat request from cache instead of calling the model again', async () => {
        const cache = makeCache();
        const db = makeDb();

        const first = makeFetch();
        await runPaperSynopsisGeneration({
            article: ARTICLE, serverConfig: serverConfig(), fetchImpl: first.fetchImpl, cache, db, topic: 'sepsis corticosteroids',
        });
        const firstLlmCalls = first.calls.filter((c) => c.url.includes('anthropic') || c.url.includes('generativelanguage')).length;
        expect(firstLlmCalls).toBeGreaterThan(0);

        const second = makeFetch();
        const cached = await runPaperSynopsisGeneration({
            article: ARTICLE, serverConfig: serverConfig(), fetchImpl: second.fetchImpl, cache, db, topic: 'sepsis corticosteroids',
        });

        expect(cached.cached).toBe(true);
        const secondLlmCalls = second.calls.filter((c) => c.url.includes('anthropic') || c.url.includes('generativelanguage')).length;
        expect(secondLlmCalls).toBe(0);
    });

    test('cache key changes with the model, so a model switch cannot serve stale synopses', () => {
        const a = getPaperSynopsisCacheKey(ARTICLE, 'model-a', null, null, '');
        const b = getPaperSynopsisCacheKey(ARTICLE, 'model-b', null, null, '');
        expect(a).not.toBe(b);
    });

    test('rejects a truncated response instead of storing a partial synopsis', async () => {
        const cache = makeCache();
        const { fetchImpl } = makeFetch({
            text: JSON.stringify(SYNOPSIS).slice(0, 120),
            finishReason: 'MAX_TOKENS',
        });

        await expect(runPaperSynopsisGeneration({
            article: ARTICLE,
            serverConfig: serverConfig({ gemini: 'test-gemini-key' }),
            fetchImpl,
            cache,
            db: makeDb(),
            topic: 'sepsis corticosteroids',
        })).rejects.toThrow(/finishReason: MAX_TOKENS/);

        expect(cache.store.size).toBe(0);
    });

    test('rejects a synopsis whose numbers are not in the source text', async () => {
        // The generator refuses numeric claims it cannot find in the abstract.
        // This caught a fabricated figure in this file's own fixture, so it is
        // worth asserting directly rather than trusting it stays wired up.
        const invented = { ...SYNOPSIS, mainFindings: 'Mortality fell from 71.4% to 12.2% at 90 days.' };
        const { fetchImpl } = makeFetch({ text: JSON.stringify(invented) });

        await expect(runPaperSynopsisGeneration({
            article: ARTICLE, serverConfig: serverConfig(), fetchImpl, cache: makeCache(), db: makeDb(), topic: 'sepsis corticosteroids',
        })).rejects.toThrow(/grounding/i);
    });

    test('throws when no provider is configured rather than returning an empty synopsis', async () => {
        const { fetchImpl } = makeFetch();

        await expect(runPaperSynopsisGeneration({
            article: ARTICLE,
            serverConfig: serverConfig({}),
            fetchImpl,
            cache: makeCache(),
            db: makeDb(),
            topic: 'sepsis corticosteroids',
        })).rejects.toThrow(/No AI service configured/);
    });

    test('survives a database whose optional context methods all fail', async () => {
        // These lookups are best-effort context. A failing DB must not take the
        // synopsis with it -- but it also must not fail silently, so the run
        // still has to produce a real synopsis.
        const { fetchImpl } = makeFetch();
        const db = makeDb({
            getGuidelinesByTopic: async () => { throw new Error('db down'); },
            getTopicKnowledge: async () => { throw new Error('db down'); },
            getSynopsisFeedbackStats: async () => { throw new Error('db down'); },
        });

        const result = await runPaperSynopsisGeneration({
            article: ARTICLE, serverConfig: serverConfig(), fetchImpl, cache: makeCache(), db, topic: 'sepsis corticosteroids',
        });

        expect(result.synopsis.bottomLine).toContain('septic shock');
    });
});
