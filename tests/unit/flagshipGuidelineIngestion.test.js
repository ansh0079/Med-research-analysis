'use strict';

const {
    ingestCatalog,
    pubmedAbstract,
    sameDocument,
    xmlText,
} = require('../../scripts/ingest-flagship-guideline-seeds');
const uploadedGuidelines = require('../../server/config/uploadedGuidelines.json');
const { isServableGuideline } = require('../../server/utils/guidelineQuality');

function makeDatabase() {
    const state = { documents: [], guidelines: [], knowledge: new Map() };
    return {
        state,
        normalizeTopic: (value) => String(value || '').toLowerCase().trim().replace(/\s+/g, ' '),
        async upsertGuidelineDocument(document) {
            const existing = state.documents.find((row) =>
                ['pmcid', 'pmid', 'doi', 'sourceUrl'].some((field) =>
                    document[field] && String(row[field]).toLowerCase() === String(document[field]).toLowerCase()));
            if (existing) return existing.id;
            const row = { ...document, id: state.documents.length + 1 };
            state.documents.push(row);
            return row.id;
        },
        async getTopicKnowledge(topic) {
            return state.knowledge.get(topic) || null;
        },
        async upsertTopicKnowledge(topic, knowledge, sourceArticles, status, confidence) {
            const row = { topic, knowledge, sourceArticles, status, confidence };
            state.knowledge.set(topic, row);
            return row;
        },
        async get(_sql, params) {
            const [normalized, text] = params;
            const row = state.guidelines.find((guideline) =>
                this.normalizeTopic(guideline.topic).replace(/-/g, ' ') === normalized &&
                guideline.recommendationText.toLowerCase() === text.toLowerCase());
            return row ? { id: row.id, document_id: row.documentId || null } : null;
        },
        async run(sql, params) {
            if (/UPDATE topic_guidelines SET/.test(sql)) {
                const [documentId, sourceRegion, sourceSpecialty, sourceDomain, , id] = params;
                const row = state.guidelines.find((guideline) => guideline.id === id);
                if (row) Object.assign(row, { documentId, sourceRegion, sourceSpecialty, sourceDomain });
            }
        },
        async createGuideline(guideline) {
            const row = { ...guideline, id: state.guidelines.length + 1 };
            state.guidelines.push(row);
            return row;
        },
    };
}

const CATALOG = {
    topics: [{
        topic: 'Test condition',
        document: {
            title: 'Test guideline', sourceBody: 'Test Society', year: 2026,
            pmid: '123', url: 'https://example.test/guideline',
            sourceRegion: 'Test region',
            sourceSpecialty: 'Test specialty',
            sourceDomain: 'https://example.test',
            license: 'CC BY 4.0',
            licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
            uploadedFileName: 'test-guideline.pdf',
            uploadedFileSha256: 'abc123',
        },
        recommendations: [{
            text: 'Use the tested treatment for eligible patients.',
            population: 'Eligible patients', intervention: 'Tested treatment',
        }],
    }],
};

describe('flagship guideline ingestion', () => {
    test('uploaded guideline recommendations are attributable and servable', () => {
        const [entry] = uploadedGuidelines.topics;
        expect(entry.topic).toBe('STEMI primary PCI reperfusion');
        expect(entry.document).toMatchObject({
            sourceBody: 'CVIT',
            pmcid: 'PMC8789715',
            license: 'CC BY 4.0',
        });
        for (const recommendation of entry.recommendations) {
            expect(isServableGuideline({
                source_body: entry.document.sourceBody,
                recommendation_text: recommendation.text,
            })).toBe(true);
        }
    });

    test('stores documents, topic links, and recommendations idempotently', async () => {
        const database = makeDatabase();
        const enrich = jest.fn(async (document) => ({
            ...document,
            fullText: 'Locally stored guideline body.',
            fullTextSource: 'jats',
        }));

        const first = await ingestCatalog(CATALOG, { database, enrich });
        const second = await ingestCatalog(CATALOG, { database, enrich });

        expect(first).toMatchObject({
            topics: 1, documents: 1, bodies: 1,
            recommendationsCreated: 1, recommendationsExisting: 0, errors: [],
        });
        expect(second).toMatchObject({
            topics: 1, documents: 1, bodies: 1,
            recommendationsCreated: 0, recommendationsExisting: 1, errors: [],
        });
        expect(database.state.documents).toHaveLength(1);
        expect(database.state.guidelines).toHaveLength(1);
        expect(database.state.guidelines[0]).toMatchObject({
            status: 'ai_extracted',
            documentId: 1,
            sourceRegion: 'Test region',
            sourceSpecialty: 'Test specialty',
            sourceDomain: 'https://example.test',
        });
        expect(database.state.knowledge.get('Test condition').sourceArticles).toEqual([
            expect.objectContaining({
                documentId: 1,
                bodyStored: true,
                locallyStored: true,
                license: 'CC BY 4.0',
                uploadedFileName: 'test-guideline.pdf',
                uploadedFileSha256: 'abc123',
            }),
        ]);
    });

    test('matches documents by any stable identifier', () => {
        expect(sameDocument({ pmid: '123' }, { pmid: '123', url: 'x' })).toBe(true);
        expect(sameDocument({ doi: '10.1/ABC' }, { doi: '10.1/abc' })).toBe(true);
        expect(sameDocument({ pmid: '123' }, { pmid: '456' })).toBe(false);
    });

    test('extracts readable text from JATS without reference-list noise', () => {
        expect(xmlText('<article><p>Recommendation &amp; rationale.</p><ref-list><p>Noise</p></ref-list></article>'))
            .toBe('Recommendation & rationale.');
    });

    test('combines labelled PubMed abstract sections', () => {
        const xml = '<Abstract><AbstractText Label="A">First finding.</AbstractText>'
            + '<AbstractText Label="B">Second finding.</AbstractText></Abstract>';
        expect(pubmedAbstract(xml)).toBe('First finding. Second finding.');
    });
});
