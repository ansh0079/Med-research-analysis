'use strict';

const {
    buildEvidenceBouquet,
    queryMatchScore,
    isOffTopic,
    computeCompositeScore,
} = require('../../server/services/evidenceBouquetService');
const { clinicalQueryAliases } = require('../../server/services/unifiedEvidenceSearch');
const { originalConditionTerms, isCompetingAbbreviationSense } = require('../../server/utils/conditionQuery');

const acsGuideline = {
    uid: 'acs-real',
    title: '2025 ACC/AHA guideline for the management of patients with acute coronary syndromes',
    abstract: 'Recommendations for NSTEMI and STEMI, including dual antiplatelet therapy and PCI.',
    pubdate: '2025',
    journal: 'Circulation',
    pubtype: ['Practice Guideline'],
    _ebmScore: 2,
    pmcrefcount: 40,
};

const acsCancer = {
    uid: 'acs-cancer',
    title: 'American Cancer Society guidelines for colorectal cancer screening intervals',
    abstract: 'ACS screening intervals for colonoscopy and HPV testing in average-risk adults.',
    pubdate: '2023',
    journal: 'CA Cancer J Clin',
    pubtype: ['Practice Guideline'],
    _ebmScore: 2,
    pmcrefcount: 800,
};

const acsCompartment = {
    uid: 'acs-compartment',
    title: 'Fasciotomy for acute compartment syndrome of the tibial limb',
    abstract: 'Orthopaedic timing of fasciotomy in acute compartment syndrome.',
    pubdate: '2021',
    journal: 'J Bone Joint Surg',
    pubtype: ['Review'],
    _ebmScore: 7,
    pmcrefcount: 200,
};

const survivingSepsis = {
    uid: 'surviving-sepsis',
    title: 'Surviving Sepsis Campaign: international guidelines for management of sepsis and septic shock',
    abstract: 'Hour-1 bundle, antibiotics, and fluids for sepsis and septic shock.',
    pubdate: '2021',
    journal: 'Critical Care Medicine',
    pubtype: ['Practice Guideline'],
    _ebmScore: 7,
    _quality: { grade: 'A' },
    pmcrefcount: 5314,
};

const akiConsensus = {
    uid: 'aki-consensus',
    title: 'Acute kidney injury consensus: diagnosis and management in hospitalised adults',
    abstract: 'AKI staging, nephrotoxin avoidance, and indications for renal replacement therapy.',
    pubdate: '2024',
    journal: 'Kidney International',
    pubtype: ['Practice Guideline'],
    _ebmScore: 2,
    pmcrefcount: 90,
};

const immunotherapyToxicity = {
    uid: 'immuno-tox',
    title: 'Diagnosis and management of immunotherapy-related toxicity',
    abstract: 'Immune checkpoint inhibitor toxicity: diagnosis and management of colitis and pneumonitis.',
    pubdate: '2023',
    journal: 'Journal of Clinical Oncology',
    pubtype: ['Review'],
    _ebmScore: 7,
    pmcrefcount: 400,
};

describe('abbreviation search ranking', () => {
    test('ACS expands to acute coronary syndrome for PubMed', () => {
        expect(clinicalQueryAliases('ACS management')).toEqual(
            expect.arrayContaining(['acute coronary syndrome'])
        );
        expect(originalConditionTerms('ACS management')).toEqual(['acs']);
    });

    test('ACS management rejects cancer-society and compartment-syndrome senses', () => {
        expect(isOffTopic(acsCancer, 'ACS management')).toBe(true);
        expect(isOffTopic(acsCompartment, 'ACS management')).toBe(true);
        expect(isOffTopic(acsGuideline, 'ACS management')).toBe(false);
        expect(isCompetingAbbreviationSense(acsCancer, 'ACS management')).toBe(true);
        expect(isOffTopic(survivingSepsis, 'ACS management')).toBe(true);
    });

    test('ACS management ranks the coronary guideline above colliding ACS hits', () => {
        const bouquet = buildEvidenceBouquet(
            [acsCancer, acsCompartment, survivingSepsis, acsGuideline],
            'ACS management',
            { count: 5, specificity: 'moderate', selectionMode: 'relevance' }
        );
        expect(bouquet.topPapers.map((a) => a.uid)).toEqual(['acs-real']);
    });

    test('generic diagnosis/management words cannot outrank the condition', () => {
        expect(isOffTopic(immunotherapyToxicity, 'AKI diagnosis and management')).toBe(true);
        expect(isOffTopic(akiConsensus, 'AKI diagnosis and management')).toBe(false);
        expect(queryMatchScore(akiConsensus, 'AKI diagnosis and management'))
            .toBeGreaterThan(queryMatchScore(immunotherapyToxicity, 'AKI diagnosis and management'));

        const bouquet = buildEvidenceBouquet(
            [immunotherapyToxicity, akiConsensus],
            'AKI diagnosis and management',
            { count: 5, specificity: 'moderate', selectionMode: 'relevance' }
        );
        expect(bouquet.topPapers[0].uid).toBe('aki-consensus');
        expect(bouquet.topPapers.some((a) => a.uid === 'immuno-tox')).toBe(false);
    });

    test('prestige is scaled by query match so Surviving Sepsis cannot win an ACS search', () => {
        const acsMatch = queryMatchScore(acsGuideline, 'ACS management');
        const sepsisOnAcs = queryMatchScore(survivingSepsis, 'ACS management');
        expect(acsMatch).toBeGreaterThan(0.8);
        expect(sepsisOnAcs).toBe(0);

        const acsScore = computeCompositeScore(acsGuideline, { queryMatchScore: acsMatch });
        const sepsisBlind = computeCompositeScore(survivingSepsis);
        const sepsisAware = computeCompositeScore(survivingSepsis, { queryMatchScore: sepsisOnAcs });
        expect(sepsisBlind).toBeGreaterThan(acsScore);
        expect(sepsisAware).toBeLessThan(acsScore);
    });

    test('spelled-out queries still keep the on-topic paper', () => {
        const bouquet = buildEvidenceBouquet(
            [survivingSepsis, acsGuideline],
            'acute coronary syndrome management',
            { count: 5, specificity: 'moderate', selectionMode: 'relevance' }
        );
        expect(bouquet.topPapers[0].uid).toBe('acs-real');
    });
});
