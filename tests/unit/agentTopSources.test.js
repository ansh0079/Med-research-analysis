'use strict';

const {
    isTopSourcesRequest,
    requestedSourceCount,
    articleDesign,
    collectCandidates,
    buildTopSourcesBlock,
} = require('../../server/services/agentHelpers/topSources');

describe('top-sources requests', () => {
    test.each([
        'give me the top 5 guidelines or meta-analyses in alcoholic liver disease',
        'what are the best reviews on ALD',
        'summarise the key guidelines for alcoholic hepatitis',
        'top five systematic reviews',
    ])('recognises "%s"', (msg) => expect(isTopSourcesRequest(msg)).toBe(true));

    test.each([
        'fatty liver disease',
        'explain the pathophysiology of ALD',
        'quiz me on alcoholic hepatitis',
        'what is the best treatment for ascites',
    ])('ignores "%s"', (msg) => expect(isTopSourcesRequest(msg)).toBe(false));

    test('reads a requested count, defaulting to 5 and clamping to 3-10', () => {
        expect(requestedSourceCount('top 7 guidelines')).toBe(7);
        expect(requestedSourceCount('top three reviews')).toBe(3);
        expect(requestedSourceCount('top 50 guidelines')).toBe(10);
        expect(requestedSourceCount('best guidelines')).toBe(5);
    });
});

describe('top-sources ranking', () => {
    const guidelines = [
        { sourceBody: 'EASL', sourceYear: 2018, recommendationText: 'Abstinence is the cornerstone.' },
        { sourceBody: 'EASL', sourceYear: 2018, recommendationText: 'duplicate body+year' },
        { sourceBody: 'AASLD', sourceYear: 2019, recommendationText: 'Corticosteroids for severe AH.' },
    ];
    const articles = [
        { uid: 'a1', title: 'Corticosteroids in alcoholic hepatitis: a meta-analysis', pubdate: '2023', publicationTypes: ['Meta-Analysis'] },
        { uid: 'a2', title: 'A narrative review of ALD', pubdate: '2015', publicationTypes: ['Review'] },
        { uid: 'a3', title: 'Randomised trial of something', pubdate: '2024', publicationTypes: ['Randomized Controlled Trial'] },
    ];

    test('classifies design and drops trials', () => {
        expect(articleDesign(articles[0])).toBe('meta-analysis');
        expect(articleDesign(articles[1])).toBe('review');
        expect(articleDesign(articles[2])).toBeNull();
    });

    test('groups guideline rows into one source, ranks guidelines above reviews, and excludes non-review articles', () => {
        const out = collectCandidates({ guidelines, articles });
        expect(out.map((c) => c.kind)).toEqual(['guideline', 'guideline', 'meta-analysis', 'review']);
        const easl = out.filter((c) => c.label.startsWith('EASL'));
        expect(easl).toHaveLength(1);
        expect(easl[0].points).toEqual(['Abstinence is the cornerstone.', 'duplicate body+year']);
    });

    test('keeps rows of one document together by document id', () => {
        const out = collectCandidates({
            guidelines: [
                { sourceBody: 'NICE', sourceYear: 2020, documentId: 7, recommendationText: 'Point A' },
                { sourceBody: 'NICE', sourceYear: 2020, documentId: 8, recommendationText: 'Other document' },
                { sourceBody: 'NICE', sourceYear: 2020, documentId: 7, recommendationText: 'Point B' },
            ],
        });
        expect(out).toHaveLength(2);
        expect(out.find((c) => c.points.includes('Point A')).points).toEqual(['Point A', 'Point B']);
    });

    test('block lists every stored recommendation of each chosen source and nothing outside the choice', () => {
        const block = buildTopSourcesBlock({ topic: 'alcoholic liver disease', guidelines, articles, count: 2 });
        expect(block).toContain('S1.');
        expect(block).toContain('Abstinence is the cornerstone.');
        expect(block).toContain('duplicate body+year');
        expect(block).toContain('Corticosteroids for severe AH.');
        expect(block).not.toContain('narrative review of ALD');
        expect(block).not.toContain('Randomised trial of something');
        expect(block).toContain('EVERY recommendation');
    });

    test('says when fewer sources are stored than requested', () => {
        const block = buildTopSourcesBlock({ topic: 'x', guidelines: [guidelines[0]], articles: [], count: 5 });
        expect(block).toContain('Only 1 are stored');
    });

    test('with nothing stored it says so instead of listing sources', () => {
        const block = buildTopSourcesBlock({ topic: 'x', guidelines: [], articles: [], count: 5 });
        expect(block).toContain('No guideline, review or meta-analysis is stored');
        expect(block).not.toContain('S1.');
    });
});
