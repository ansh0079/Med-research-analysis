'use strict';

const {
    isTopSourcesRequest,
    requestedSourceCount,
    articleDesign,
    collectCandidates,
    buildTopSourcesBlock,
    renderTopSourcesDocument,
    buildComparisonBlock,
    topicRelevance,
} = require('../../server/services/agentHelpers/topSources');

describe('topical relevance of top sources', () => {
    const ald = 'alcoholic liver disease';
    const guidelines = [
        { sourceBody: 'AASLD', sourceYear: 2026, recommendationText: 'Adults with non-alcoholic steatohepatitis and fibrosis should be considered for semaglutide.' },
        { sourceBody: 'Italian Society for Pediatric Endocrinology', sourceYear: 2024, recommendationText: 'Children with obesity should be screened for non-alcoholic fatty liver disease.' },
        { sourceBody: 'World journal of transplantation', sourceYear: 2025, recommendationText: 'Transplant candidacy for alcohol-associated hepatitis in severe liver disease should not be predetermined by abstinence duration.' },
    ];
    const documents = [{ id: 196, title: 'ACG Clinical Guideline: Alcohol-Associated Liver Disease.', source_year: 2024, text_excerpt: 'Alcohol-associated liver disease management abstract.' }];

    test('non-alcoholic fatty liver sources do not match an alcoholic liver disease topic', () => {
        const out = collectCandidates({ topic: ald, guidelines, articles: [], documents });
        const labels = out.map((c) => c.label);
        expect(labels.some((l) => l.includes('AASLD'))).toBe(false);
        expect(labels.some((l) => l.includes('Pediatric'))).toBe(false);
        expect(labels.some((l) => l.includes('World journal of transplantation'))).toBe(true);
        expect(labels.some((l) => l.includes('Alcohol-Associated Liver Disease'))).toBe(true);
    });

    test('topicRelevance counts non-alcoholic as not alcohol and ignores generic words', () => {
        expect(topicRelevance(ald, 'Alcohol-Associated Liver Disease')).toBe(1);
        expect(topicRelevance(ald, 'Nonalcoholic fatty liver disease in children')).toBeLessThan(0.6);
        expect(topicRelevance('heart failure', 'Management of heart failure with reduced ejection fraction')).toBe(1);
        expect(topicRelevance('', 'anything')).toBe(1);
    });

    test('reports fewer sources rather than padding with off-topic ones', () => {
        const { chosen, markdown } = renderTopSourcesDocument({ topic: ald, guidelines, articles: [], documents, count: 5 });
        expect(chosen).toHaveLength(2);
        expect(markdown).toContain('Only 2 of the 5 requested are stored');
    });
});

describe('rendered top-sources document', () => {
    const many = Array.from({ length: 45 }, (_, i) => ({
        sourceBody: 'EASL', sourceYear: 2018, documentId: 1, recommendationText: `Recommendation number ${i + 1} stated in full.`,
    }));
    const other = [{ sourceBody: 'AASLD', sourceYear: 2019, documentId: 2, recommendationText: 'Corticosteroids for severe AH.' }];

    test('lists every stored recommendation verbatim with no cap', () => {
        const { markdown } = renderTopSourcesDocument({ topic: '', guidelines: [...many, ...other], articles: [], count: 5 });
        expect(markdown).toContain('45 stored recommendations');
        for (let i = 1; i <= 45; i++) expect(markdown).toContain(`${i}. Recommendation number ${i} stated in full.`);
        expect(markdown).toContain('1. Corticosteroids for severe AH.');
        expect(markdown).not.toContain('not shown');
    });

    test('reviews show their stored text word for word', () => {
        const { markdown } = renderTopSourcesDocument({
            topic: '', guidelines: [], count: 5, documents: [],
            articles: [{ title: 'Meta-analysis of steroids', pubdate: '2022', publicationTypes: ['Meta-Analysis'], abstract: 'Pooled mortality fell.' }],
        });
        expect(markdown).toContain('> Pooled mortality fell.');
    });

    test('says plainly when nothing is stored', () => {
        const { markdown, chosen } = renderTopSourcesDocument({ topic: 'x', guidelines: [], articles: [], count: 5 });
        expect(chosen).toHaveLength(0);
        expect(markdown).toContain('No guideline, review or meta-analysis is stored');
    });

    test('the model is only asked for a comparison, and only with two or more sources', () => {
        const { chosen } = renderTopSourcesDocument({ topic: '', guidelines: [...many, ...other], articles: [], count: 5 });
        expect(buildComparisonBlock({ topic: '', chosen })).toContain('do not repeat them');
        expect(buildComparisonBlock({ topic: '', chosen: [chosen[0]] })).toBe('');
    });
});

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
        const block = buildTopSourcesBlock({ topic: '', guidelines, articles, count: 2 });
        expect(block).toContain('S1.');
        expect(block).toContain('Abstinence is the cornerstone.');
        expect(block).toContain('duplicate body+year');
        expect(block).toContain('Corticosteroids for severe AH.');
        expect(block).not.toContain('narrative review of ALD');
        expect(block).not.toContain('Randomised trial of something');
        expect(block).toContain('EVERY recommendation');
    });

    test('says when fewer sources are stored than requested', () => {
        const block = buildTopSourcesBlock({ topic: '', guidelines: [guidelines[0]], articles: [], count: 5 });
        expect(block).toContain('Only 1 are stored');
    });

    test('with nothing stored it says so instead of listing sources', () => {
        const block = buildTopSourcesBlock({ topic: 'x', guidelines: [], articles: [], count: 5 });
        expect(block).toContain('No guideline, review or meta-analysis is stored');
        expect(block).not.toContain('S1.');
    });
});
