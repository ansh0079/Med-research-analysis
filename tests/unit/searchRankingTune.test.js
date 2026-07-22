'use strict';

const {
    buildEvidenceBouquet,
    classifyArchetype,
    isRCT,
    classifyQueryIntent,
    intentArchetypeBias,
    topicalMatchWeight,
} = require('../../server/services/evidenceBouquetService');

describe('search ranking tune', () => {
    test('isRCT treats EBM 6 (RCT) and 5 (controlled trial) as trials', () => {
        expect(isRCT({ _ebmScore: 6, title: 'A study', pubtype: [] })).toBe(true);
        expect(isRCT({ _ebmScore: 5, title: 'A study', pubtype: [] })).toBe(true);
        expect(isRCT({ _ebmScore: 4, title: 'A study', pubtype: [] })).toBe(false);
        expect(classifyArchetype({
            title: 'Outcomes in a multicenter randomized study',
            abstract: 'Adults with disease received therapy.',
            pubdate: '2018',
            pubtype: [],
            _ebmScore: 6,
            pmcrefcount: 500,
        })).toMatch(/rct|management_trial|landmark_rct/);
    });

    test('topical match weight is stronger than previous moderate default of 16', () => {
        expect(topicalMatchWeight('moderate')).toBeGreaterThanOrEqual(20);
        expect(topicalMatchWeight('strict')).toBeGreaterThanOrEqual(18);
        expect(topicalMatchWeight('broad')).toBeLessThan(10);
    });

    test('therapeutic intent biases landmark RCTs and guidelines over mechanism', () => {
        expect(intentArchetypeBias('therapeutic', 'landmark_rct'))
            .toBeGreaterThan(intentArchetypeBias('therapeutic', 'mechanism'));
        expect(intentArchetypeBias('guideline', 'guideline'))
            .toBeGreaterThan(intentArchetypeBias('guideline', 'mechanism'));
        expect(classifyQueryIntent('treatment of heart failure with SGLT2 inhibitors')).toBe('therapeutic');
    });

    test('relevance mode ranks topical RCT above weakly-matched famous citation magnet', () => {
        const topicalRct = {
            uid: 'topical',
            title: 'SGLT2 inhibitors in heart failure with reduced ejection fraction',
            abstract: 'Randomized trial of SGLT2 inhibitors for heart failure outcomes in adults.',
            pubdate: '2021',
            journal: 'Circulation',
            pubtype: ['Randomized Controlled Trial'],
            _ebmScore: 6,
            pmcrefcount: 80,
        };
        const citationMagnet = {
            uid: 'magnet',
            title: 'Global burden of cardiovascular disease',
            abstract: 'A broad epidemiology overview of cardiovascular mortality worldwide.',
            pubdate: '2019',
            journal: 'The Lancet',
            pubtype: ['Review'],
            _ebmScore: 7,
            pmcrefcount: 5000,
        };

        const relevance = buildEvidenceBouquet([citationMagnet, topicalRct], 'SGLT2 inhibitors heart failure treatment', {
            count: 2,
            specificity: 'moderate',
            selectionMode: 'relevance',
            queryIntent: 'therapeutic',
        });
        expect(relevance.selectionMode).toBe('relevance');
        expect(relevance.topPapers[0].uid).toBe('topical');
    });

    test('diversity mode still pulls a guideline into the teaching bouquet', () => {
        const rct = {
            uid: 'rct1',
            title: 'SGLT2 inhibitors heart failure randomized outcomes',
            abstract: 'Patients with heart failure treated with SGLT2 inhibitors.',
            pubdate: '2020',
            journal: 'N Engl J Med',
            pubtype: ['Randomized Controlled Trial'],
            _ebmScore: 6,
            pmcrefcount: 400,
        };
        const guideline = {
            uid: 'gl1',
            title: 'Heart failure management guideline',
            abstract: 'Society recommendation for heart failure therapy including SGLT2 inhibitors.',
            pubdate: '2022',
            journal: 'Circulation',
            pubtype: ['Practice Guideline'],
            _ebmScore: 2,
            pmcrefcount: 50,
        };
        const filler = {
            uid: 'rev1',
            title: 'Recent review of cardiomyopathy imaging',
            abstract: 'Imaging modalities in cardiomyopathy.',
            pubdate: '2023',
            journal: 'Heart',
            pubtype: ['Review'],
            _ebmScore: 7,
            pmcrefcount: 20,
        };

        const diversity = buildEvidenceBouquet([filler, rct, guideline], 'heart failure treatment SGLT2', {
            count: 3,
            selectionMode: 'diversity',
            preferredArchetypes: ['landmark_rct', 'management_trial', 'guideline', 'recent_review'],
            queryIntent: 'therapeutic',
        });
        expect(diversity.selectionMode).toBe('diversity');
        expect(diversity.topPapers.some((a) => a.uid === 'gl1')).toBe(true);
        expect(diversity.archetypesCovered).toEqual(expect.arrayContaining(['guideline']));
    });
});
