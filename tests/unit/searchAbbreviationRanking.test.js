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

    test('PE diagnosis rejects a physical-examination paper', () => {
        const peGuideline = {
            uid: 'pe-real',
            title: 'ESC guidelines on the diagnosis and management of acute pulmonary embolism',
            abstract: 'CTPA, D-dimer and Wells score for pulmonary embolism.',
            pubdate: '2019',
            pubtype: ['Practice Guideline'],
        };
        const physicalExam = {
            uid: 'pe-exam',
            title: 'Physical examination in the diagnosis of chest pain in primary care',
            abstract: 'Physical exam manoeuvres for musculoskeletal chest wall pain.',
            pubdate: '2020',
            pubtype: ['Review'],
            pmcrefcount: 400,
        };
        expect(isCompetingAbbreviationSense(physicalExam, 'PE diagnosis')).toBe(true);
        expect(isOffTopic(physicalExam, 'PE diagnosis')).toBe(true);
        expect(isOffTopic(peGuideline, 'PE diagnosis')).toBe(false);
        const bouquet = buildEvidenceBouquet(
            [physicalExam, peGuideline],
            'PE diagnosis',
            { count: 5, specificity: 'moderate', selectionMode: 'relevance' }
        );
        expect(bouquet.topPapers.map((a) => a.uid)).toEqual(['pe-real']);
    });

    test('SBP management rejects a systolic blood-pressure paper', () => {
        const sbpPeritonitis = {
            uid: 'sbp-real',
            title: 'Diagnosis and treatment of spontaneous bacterial peritonitis',
            abstract: 'Paracentesis and albumin in cirrhosis with ascites.',
            pubdate: '2021',
            pubtype: ['Practice Guideline'],
        };
        const systolic = {
            uid: 'sbp-bp',
            title: 'Systolic blood pressure targets in hypertension management',
            abstract: 'Intensive systolic BP lowering in adults with hypertension.',
            pubdate: '2022',
            pubtype: ['Review'],
            pmcrefcount: 900,
        };
        expect(isOffTopic(systolic, 'SBP management')).toBe(true);
        expect(isOffTopic(sbpPeritonitis, 'SBP management')).toBe(false);
    });

    test('AF, CAP and MI reject competing English-language senses', () => {
        const afib = {
            uid: 'af-real',
            title: 'ESC guidelines for the diagnosis and management of atrial fibrillation',
            abstract: 'Anticoagulation and CHA2DS2-VASc in atrial fibrillation.',
            pubdate: '2024',
            pubtype: ['Practice Guideline'],
        };
        const amniotic = {
            uid: 'af-fluid',
            title: 'Amniotic fluid index in late pregnancy',
            abstract: 'Amniotic fluid volume and perinatal outcomes.',
            pubdate: '2021',
            pubtype: ['Review'],
            pmcrefcount: 300,
        };
        expect(isCompetingAbbreviationSense(amniotic, 'AF management')).toBe(true);
        expect(isOffTopic(amniotic, 'AF management')).toBe(true);
        expect(isOffTopic(afib, 'AF management')).toBe(false);

        const cap = {
            uid: 'cap-real',
            title: 'ATS guidelines for community-acquired pneumonia',
            abstract: 'CURB-65 and pneumococcal therapy in community-acquired pneumonia.',
            pubdate: '2019',
            pubtype: ['Practice Guideline'],
        };
        const pathologists = {
            uid: 'cap-org',
            title: 'College of American Pathologists laboratory accreditation checklist',
            abstract: 'CAP accreditation for anatomic pathology laboratories.',
            pubdate: '2022',
            pubtype: ['Guideline'],
            pmcrefcount: 400,
        };
        expect(isOffTopic(pathologists, 'CAP treatment')).toBe(true);
        expect(isOffTopic(cap, 'CAP treatment')).toBe(false);

        const mi = {
            uid: 'mi-real',
            title: 'Fourth universal definition of myocardial infarction',
            abstract: 'Troponin and STEMI criteria for myocardial infarction.',
            pubdate: '2018',
            pubtype: ['Practice Guideline'],
        };
        const interviewing = {
            uid: 'mi-talk',
            title: 'Motivational interviewing for behaviour change in clinic',
            abstract: 'Motivational interviewing techniques in primary care.',
            pubdate: '2020',
            pubtype: ['Review'],
            pmcrefcount: 500,
        };
        expect(isOffTopic(interviewing, 'MI management')).toBe(true);
        expect(isOffTopic(mi, 'MI management')).toBe(false);
    });
});

describe('resolveQuerySenses (abstention)', () => {
    const { resolveQuerySenses } = require('../../server/utils/conditionQuery');

    test('bare acronym reports the assumed sense and the alternatives instead of guessing silently', () => {
        const r = resolveQuerySenses('ACS management');
        expect(r.status).toBe('ambiguous');
        expect(r.ambiguities[0]).toMatchObject({ token: 'acs', assumed: 'acute coronary syndrome' });
        expect(r.ambiguities[0].alternatives.map((a) => a.label)).toEqual(['american cancer society', 'acute compartment syndrome']);
        expect(r.ambiguities[0].alternatives[0].query).toBe('american cancer society management');
    });

    test('a query that restates the abbreviation ("PE diagnosis") is still ambiguous', () => {
        expect(resolveQuerySenses('PE diagnosis').status).toBe('ambiguous');
    });

    test('an independent cue resolves the sense without a banner', () => {
        expect(resolveQuerySenses('ACS troponin').status).toBe('resolved');
        expect(resolveQuerySenses('PE d-dimer').status).toBe('resolved');
        expect(resolveQuerySenses('ACS cancer screening').resolved[0].sense).toBe('american cancer society');
    });

    test('queries with no ambiguous abbreviation are clear', () => {
        expect(resolveQuerySenses('acute kidney injury management').status).toBe('clear');
        expect(resolveQuerySenses('').status).toBe('clear');
    });
});
