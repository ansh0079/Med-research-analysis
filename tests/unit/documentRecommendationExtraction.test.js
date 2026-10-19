'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { Database } = require('../../database');
const {
    parseIndices,
    numberedBatches,
    trimBackMatter,
    extractDocumentRecommendations,
} = require('../../server/services/guideline/documentRecommendationExtraction');
const { renderTopSourcesDocument } = require('../../server/services/agentHelpers/topSources');

const TEXT = 'Background sentences describe the burden of this disease in the general population. '
    + 'Patients with severe disease should receive corticosteroids for twenty eight days unless contraindicated. '
    + 'The study enrolled adults from several centres across three countries over ten years. '
    + 'Alcohol abstinence reduced mortality and is the single most effective long term intervention. '
    + 'Further work is needed to understand the mechanism of benefit in this population.';

describe('index-only extraction', () => {
    test('parseIndices keeps only numbers that were offered and survives junk', () => {
        const allowed = new Set([1, 3, 4]);
        expect(parseIndices('Sure: [1, 3, 99, "x", 4, 3]', allowed)).toEqual([1, 3, 4]);
        expect(parseIndices('no array here', allowed)).toEqual([]);
        expect(parseIndices('[1, 2', allowed)).toEqual([]);
    });

    test('returns the paper\'s own sentences, never model text', async () => {
        const callModel = jest.fn(async () => '[1, 3]');
        const { items } = await extractDocumentRecommendations({ fullText: TEXT, kind: 'meta-analysis', callModel });
        expect(items.map((i) => i.sentence)).toEqual([
            'Patients with severe disease should receive corticosteroids for twenty eight days unless contraindicated.',
            'Alcohol abstinence reduced mortality and is the single most effective long term intervention.',
        ]);
        expect(callModel.mock.calls[0][0]).toContain('[1] Patients with severe disease');
    });

    test('a hallucinated index outside the batch is dropped', async () => {
        const { items } = await extractDocumentRecommendations({ fullText: TEXT, callModel: async () => '[3, 400, -2]' });
        expect(items).toHaveLength(1);
    });

    test('long text is sent in several batches and a failing model call surfaces', async () => {
        const long = Array.from({ length: 400 }, (_, i) => `Clinicians should consider option number ${i} for every suitable patient presenting.`).join(' ');
        expect(numberedBatches(long.split('. ').map((s) => `${s}.`)).length).toBeGreaterThan(1);
        await expect(extractDocumentRecommendations({ fullText: TEXT, callModel: async () => { throw new Error('boom'); } })).rejects.toThrow('boom');
    });

    test('the reference list at the back is cut off', () => {
        const body = Array.from({ length: 30 }, (_, i) => `Body sentence number ${i} about management of the condition in clinic.`);
        const refs = Array.from({ length: 20 }, (_, i) => `Smith J, Lee K. Trial ${i}. Lancet. 2019;39${i}(1):10-20.`);
        const out = trimBackMatter([...body, ...refs]);
        expect(out.length).toBeLessThan(body.length + refs.length);
        expect(out.slice(0, 30)).toEqual(body);
    });
});

describe('stored extracted recommendations', () => {
    let db;
    beforeAll(async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-recs-'));
        db = new Database(path.join(dir, 'test.db'));
        await db.connect();
    }, 120000);
    afterAll(async () => { await db?.close?.().catch(() => {}); });

    test('save replaces the old set and read returns document order', async () => {
        await db.saveDocumentRecommendations(5, [{ index: 9, sentence: 'Second.' }, { index: 2, sentence: 'First.' }], { model: 'm', promptVersion: 'v' });
        expect(await db.getDocumentRecommendations([5])).toEqual({ 5: ['First.', 'Second.'] });
        await db.saveDocumentRecommendations(5, [{ index: 1, sentence: 'Only.' }]);
        expect(await db.getDocumentRecommendations([5, 6])).toEqual({ 5: ['Only.'] });
    });
});

describe('top-sources document prefers stored extracted recommendations', () => {
    const documents = [{ id: 7, title: 'A meta-analysis of steroids in alcoholic hepatitis', source_year: 2024, text_excerpt: 'Abstract excerpt only.' }];
    test('shows the stored sentences and not the abstract excerpt', () => {
        const { markdown } = renderTopSourcesDocument({
            topic: '', guidelines: [], articles: [], documents, count: 5,
            storedRecs: { 7: ['Steroids should be offered to eligible patients.', 'Abstinence is advised for all patients.'] },
        });
        expect(markdown).toContain('2 recommendations identified in the stored full text, quoted exactly');
        expect(markdown).toContain('2. Abstinence is advised for all patients.');
        expect(markdown).not.toContain('Abstract excerpt only.');
    });
});
