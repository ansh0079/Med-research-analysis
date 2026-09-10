'use strict';

const {
    matchesPopulationFilter,
    stemTerm,
    isOffTopic,
} = require('../../server/services/evidenceBouquet/queryRelevance');
const { shouldReformulateQuery } = require('../../server/services/unifiedEvidenceSearch');
const {
    enforceSourceDiversity,
    sourceDiversityMetrics,
} = require('../../server/services/searchPipeline');
const {
    buildQueryEmbeddingCacheKey,
    clearQueryEmbeddingCache,
    getCachedQueryEmbedding,
    setCachedQueryEmbedding,
    normalizeQueryText,
} = require('../../server/services/vectorSearchService');
const { sourceDiversityAtK } = require('../../server/services/searchQualityEvalService');

describe('2.5 stemmer', () => {
    test('stems regular clinical words without destroying medical tokens', () => {
        expect(stemTerm('treatments')).toBe(stemTerm('treatment'));
        expect(stemTerm('ventilating')).toMatch(/ventil/);
        expect(stemTerm('SGLT2')).toBe('sglt2');
        expect(stemTerm('ARDS')).toBe('ards');
        expect(stemTerm('hepatorenal-syndrome')).toBe('hepatorenal-syndrome');
    });

    test('isOffTopic still accepts exact medical phrase matches', () => {
        expect(isOffTopic({
            title: 'Hepatorenal syndrome diagnosis and management',
            abstract: 'Adults with cirrhosis and AKI.',
        }, 'Hepatorenal syndrome diagnosis and management')).toBe(false);
    });
});

describe('2.6 phrase-aware population filter', () => {
    test('keeps mixed adult+pediatric papers for a pediatric query', () => {
        const article = {
            title: 'Pediatric and adult sepsis resuscitation',
            abstract: 'Includes both adults and children in a pediatric intensive care cohort.',
        };
        expect(matchesPopulationFilter(article, 'pediatric sepsis diagnosis')).toBe(true);
    });

    test('drops adult-only papers for a pediatric query', () => {
        const article = {
            title: 'Adult septic shock trial',
            abstract: 'Elderly adults in the ICU with no minors enrolled.',
        };
        expect(matchesPopulationFilter(article, 'pediatric sepsis')).toBe(false);
    });

    test('keeps pediatric-only papers for a pediatric query', () => {
        const article = {
            title: 'Neonatal sepsis antibiotics',
            abstract: 'Infants and children with early-onset sepsis.',
        };
        expect(matchesPopulationFilter(article, 'pediatric sepsis')).toBe(true);
    });
});

describe('2.7 reformulation gating', () => {
    test('does not skip medical-term queries that are questions', () => {
        expect(shouldReformulateQuery({
            query: 'how should I manage septic shock diagnosis and treatment',
        })).toBe(true);
    });

    test('triggers on low-recall even without question words', () => {
        expect(shouldReformulateQuery({ query: 'sepsis', resultCount: 0 })).toBe(true);
        expect(shouldReformulateQuery({
            query: 'sepsis',
            resultCount: 0,
            alreadyReformulated: true,
        })).toBe(false);
    });

    test('does not reformulate short non-question queries with enough hits', () => {
        expect(shouldReformulateQuery({ query: 'sepsis', resultCount: 12 })).toBe(false);
    });
});

describe('2.8 source diversity', () => {
    test('prevents one source from dominating top-K when alternatives exist', () => {
        const articles = [
            { uid: 'p1', _source: 'pubmed', source: 'JAMA' },
            { uid: 'p2', _source: 'pubmed', source: 'JAMA' },
            { uid: 'p3', _source: 'pubmed', source: 'JAMA' },
            { uid: 'p4', _source: 'pubmed', source: 'JAMA' },
            { uid: 'p5', _source: 'pubmed', source: 'JAMA' },
            { uid: 'o1', _source: 'openalex', source: 'Lancet' },
            { uid: 'o2', _source: 'openalex', source: 'NEJM' },
        ];
        const diversified = enforceSourceDiversity(articles, { topK: 5, maxSourceShare: 0.6 });
        const top5 = diversified.slice(0, 5);
        const pubmedShare = top5.filter((a) => a._source === 'pubmed').length / 5;
        expect(pubmedShare).toBeLessThanOrEqual(0.6 + 1e-9);
        expect(top5.some((a) => a._source === 'openalex')).toBe(true);
    });

    test('gold eval reports source diversity metrics', () => {
        const metrics = sourceDiversityAtK([
            { _source: 'pubmed' },
            { _source: 'pubmed' },
            { _source: 'openalex' },
        ], 3);
        expect(metrics.uniqueSources).toBe(2);
        expect(metrics.sourceDiversityAtK).toBeGreaterThan(0);
        expect(sourceDiversityMetrics([{ _source: 'pubmed' }], 1).uniqueSources).toBe(1);
    });
});

describe('2.3 query embedding cache', () => {
    beforeEach(() => clearQueryEmbeddingCache());

    test('normalizes query text and caches embeddings for 24h', async () => {
        expect(normalizeQueryText('  Sepsis   Shock ')).toBe('sepsis shock');
        expect(buildQueryEmbeddingCacheKey('Sepsis')).toBe(buildQueryEmbeddingCacheKey('sepsis'));
        const embedding = Array.from({ length: 8 }, (_, i) => i);
        const cache = {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
        };
        await setCachedQueryEmbedding(cache, 'sepsis', embedding);
        expect(cache.set).toHaveBeenCalledWith(
            buildQueryEmbeddingCacheKey('sepsis'),
            embedding,
            24 * 60 * 60
        );
        const hit = await getCachedQueryEmbedding(cache, 'SEPSIS');
        expect(hit).toEqual(embedding);
        expect(cache.get).not.toHaveBeenCalled();
    });
});
