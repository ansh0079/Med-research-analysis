'use strict';

const { buildSourceEvidenceBlock } = require('../../server/prompts/contextBuilders');

describe('buildSourceEvidenceBlock token budget', () => {
    const longAbstract = 'A'.repeat(6000);
    const longSection = 'R'.repeat(5000);

    function makeArticle(i) {
        return {
            title: `Study ${i}`,
            abstract: longAbstract,
            pubdate: '2024-01-01',
            source: 'NEJM',
            pubtype: ['Randomized Controlled Trial'],
            pmcrefcount: 100,
            _fullTextIndexed: true,
            _fullTextWordCount: 8000,
            _fullTextSections: {
                methods: longSection,
                results: longSection,
                discussion: longSection,
                conclusion: longSection,
            },
        };
    }

    test('synthesis variant truncates abstracts and caps full-text excerpts', () => {
        const block = buildSourceEvidenceBlock([makeArticle(1)], { variant: 'synthesis' });
        // Abstract capped at 1400, full-text total capped at 2400.
        expect(block.length).toBeLessThan(6000);
        expect(block).not.toContain('A'.repeat(1401));
    });

    test('a 15-study synthesis bundle stays within a bounded size', () => {
        const articles = Array.from({ length: 15 }, (_, i) => makeArticle(i));
        const block = buildSourceEvidenceBlock(articles, { variant: 'synthesis' });
        // ~15 * (1400 abstract + 2400 fulltext + small header) ≈ 60k chars ceiling.
        expect(block.length).toBeLessThan(70000);
    });

    test('default variant still truncates abstracts to 900 chars', () => {
        const block = buildSourceEvidenceBlock([makeArticle(1)], { variant: 'default' });
        expect(block).not.toContain('A'.repeat(901));
    });
});
