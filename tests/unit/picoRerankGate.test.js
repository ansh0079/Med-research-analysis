'use strict';

/**
 * The model rerank is ~9s of an ~12s search. It earns that on questions with a constraint only the
 * abstracts can check, and mostly reshuffles an already-reasonable order on a broad topic.
 */

const { queryNeedsModelRerank } = require('../../server/services/search/searchPipeline');

afterEach(() => { delete process.env.SEARCH_PICO_RERANK_MODE; });

describe('broad topic queries skip the model call', () => {
    test.each([
        'sepsis fluid resuscitation',
        'acute kidney injury definition',
        'community acquired pneumonia antibiotics',
        'chronic kidney disease anaemia',
        'early goal directed therapy',
        'patients with sepsis',
        'heart failure therapy',
        "crohn's disease biologics",
    ])('%s', (query) => {
        expect(queryNeedsModelRerank(query)).toEqual({ needed: false, reason: 'broad_query' });
    });
});

describe('specific questions keep it', () => {
    test.each([
        ['fluid resuscitation in children with septic shock', 'population'],
        ['anticoagulation in pregnancy', 'population'],
        ['hypertension treatment over 80', 'population'],
        ['delirium prevention in the ICU', 'setting'],
        ['chest pain assessment in primary care', 'setting'],
        ['severe asthma biologics', 'severity'],
        ['refractory status epilepticus', 'severity'],
        ['balanced crystalloids vs saline', 'comparison'],
        ['apixaban versus warfarin', 'comparison'],
        ['atrial fibrillation with chronic kidney disease anticoagulation', 'comorbidity'],
    ])('%s', (query, reason) => {
        expect(queryNeedsModelRerank(query)).toEqual({ needed: true, reason });
    });

    test('a comparison the PICO extractor found counts, even if the words do not show it', () => {
        expect(queryNeedsModelRerank('sepsis steroids', { comparison: 'placebo' }).needed).toBe(true);
    });

    test('SEARCH_PICO_RERANK_MODE=always reranks everything', () => {
        process.env.SEARCH_PICO_RERANK_MODE = 'always';
        expect(queryNeedsModelRerank('sepsis fluid resuscitation').needed).toBe(true);
    });
});
