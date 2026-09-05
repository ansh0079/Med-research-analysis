'use strict';

const fs = require('fs');
const path = require('path');
const {
    buildFullTextExcerptsBlock,
    buildSourceEvidenceBlock,
} = require('../../server/prompts/contextBuilders');
const { buildSynopsisPrompt } = require('../../server/prompts/synopsis');

describe('centralized full-text context building', () => {
    test('synopsis.js does not reimplement section assembly', () => {
        const src = fs.readFileSync(path.join(__dirname, '../../server/prompts/synopsis.js'), 'utf8');
        expect(src).toContain('buildFullTextExcerptsBlock');
        expect(src).not.toMatch(/sectionLimits\s*=\s*\{\s*methods/);
    });

    test('buildSourceEvidenceBlock and synopsis share excerpt text', () => {
        const article = {
            title: 'Trial',
            abstract: 'Abstract body.',
            pubdate: '2024 Jan',
            journal: 'JAMA',
            pubtype: ['Randomized Controlled Trial'],
            _fullTextIndexed: true,
            _fullTextWordCount: 9000,
            _fullTextSections: {
                methods: 'multicentre randomized methods protocol '.repeat(10),
                results: 'mortality benefit observed in the primary analysis '.repeat(10),
            },
        };
        const shared = buildFullTextExcerptsBlock(article, { variant: 'synopsis' });
        const prompt = buildSynopsisPrompt(article);
        expect(shared).toContain('METHODS:');
        expect(shared).toContain('RESULTS:');
        expect(prompt).toContain(shared.trim());
        const synthesisBlock = buildSourceEvidenceBlock([article], { variant: 'synthesis' });
        expect(synthesisBlock).toContain('Full-text excerpts');
        expect(synthesisBlock).toContain('STUDY 1');
    });
});
