'use strict';

const { buildGrantPrompt } = require('../../server/services/grantService');

describe('grantService', () => {
    const articles = [
        {
            title: 'Metformin and cardiovascular outcomes',
            authors: [{ name: 'Smith J' }],
            journal: 'Lancet',
            pubdate: '2024',
            doi: '10.1000/test',
            abstract: 'Systematic review of metformin safety.',
        },
    ];

    test('buildGrantPrompt includes research question and citation style', () => {
        const prompt = buildGrantPrompt('Does metformin reduce MACE?', articles, 'Vancouver');
        expect(prompt).toContain('Does metformin reduce MACE?');
        expect(prompt).toContain('Vancouver/ICMJE');
        expect(prompt).toContain('Metformin and cardiovascular outcomes');
        expect(prompt).toContain('STRICT JSON');
    });

    test('buildGrantPrompt defaults unknown citation style to provided label', () => {
        const prompt = buildGrantPrompt('Heart failure', articles, 'CustomStyle');
        expect(prompt).toContain('CustomStyle');
    });
});
