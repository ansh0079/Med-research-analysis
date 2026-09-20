'use strict';

const {
    classifyEvidenceLane,
    evaluateEligibility,
    buildSearchPack,
    orderArticlesByEvidenceRank,
    rankArticlesWithinLanes,
    landmarkCitationCutoff,
    annotateEvidenceMetadata,
    EMPTY_LANE_COPY,
} = require('../../server/services/search/evidenceLanes');

describe('evidence lanes', () => {
    test('classifies guidelines, reviews, and supporting; an RCT is not a landmark without a pin or cutoff', () => {
        expect(classifyEvidenceLane({
            title: 'ESC guidelines for ACS',
            pubtype: ['Practice Guideline'],
        })).toBe('guidelines');
        expect(classifyEvidenceLane({
            title: 'A randomized trial of reperfusion',
            pubtype: ['Randomized Controlled Trial'],
            citationCount: 3,
        })).toBe('supporting');
        expect(classifyEvidenceLane({
            title: 'Systematic review of anticoagulation in PE',
            pubtype: ['Systematic Review'],
        })).toBe('reviews');
        expect(classifyEvidenceLane({
            title: 'Cohort of ward patients with AKI',
            pubtype: ['Observational Study'],
        })).toBe('supporting');
    });

    test('pinned landmarks stay on the trial lane even with historic titles', () => {
        expect(classifyEvidenceLane({
            title: 'Duodenal infusion of donor feces',
            _pinnedLandmark: true,
            pubtype: ['Randomized Controlled Trial'],
        })).toBe('landmark_trials');
    });

    test('landmark cutoff is the top citation quintile of cited RCTs in this set', () => {
        const rcts = [12, 40, 80, 200, 900].map((citationCount, i) => ({
            uid: `rct-${i}`,
            pubtype: ['Randomized Controlled Trial'],
            citationCount,
        }));
        const cutoff = landmarkCitationCutoff(rcts);
        expect(cutoff).toBe(200);
        expect(classifyEvidenceLane(rcts[4], { landmarkCutoff: cutoff })).toBe('landmark_trials');
        expect(classifyEvidenceLane(rcts[0], { landmarkCutoff: cutoff })).toBe('supporting');
        expect(landmarkCitationCutoff(rcts.slice(0, 2))).toBe(Number.POSITIVE_INFINITY);
    });

    test('eligibility uses curated landmark, trial alias, concept, and semantic rescue routes', () => {
        const pinned = evaluateEligibility({
            title: 'Duodenal infusion of donor feces',
            _pinnedLandmark: true,
        }, { query: 'fecal microbiota transplant' });
        expect(pinned).toMatchObject({ eligible: true, route: 'curated_landmark' });

        const alias = evaluateEligibility({
            title: 'Angiotensin-neprilysin inhibition versus enalapril in heart failure',
            authors: [{ name: 'PARADIGM-HF Investigators' }],
        }, {
            query: 'sacubitril valsartan heart failure',
            queryAliases: ['PARADIGM-HF'],
        });
        expect(alias).toMatchObject({ eligible: true, route: 'trial_alias' });

        const concept = evaluateEligibility({
            title: 'Acute coronary syndrome management in the ED',
            abstract: 'ACS reperfusion and antiplatelet therapy.',
        }, { query: 'ACS management' });
        expect(concept).toMatchObject({ eligible: true, route: 'concept' });

        const retracted = evaluateEligibility({
            title: 'ACS trial',
            _retraction: { isRetracted: true },
        }, { query: 'ACS management' });
        expect(retracted).toMatchObject({ eligible: false, rejectionReason: 'retracted' });

        const pediatricPin = evaluateEligibility({
            title: 'Pediatric ACS trial in children',
            abstract: 'Infants and children only.',
            _pinnedLandmark: true,
        }, { query: 'ACS management in adults' });
        expect(pediatricPin).toMatchObject({ eligible: false, rejectionReason: 'population_mismatch' });
    });

    test('semantic rescue needs a MeSH phrase in the title and is capped at two papers', () => {
        const rescued = evaluateEligibility({
            title: 'Kidney injury after sepsis resuscitation',
            abstract: 'ICU cohort.',
        }, { query: 'AKI management', queryMeshTerms: ['Kidney Injury'] });
        expect(rescued).toMatchObject({ eligible: true, route: 'semantic_rescue' });

        const meshOnly = evaluateEligibility({
            title: 'Sepsis bundle outcomes',
            abstract: 'Hour-1 bundle.',
            mesh: ['Acute Kidney Injury'],
        }, { query: 'AKI management', queryMeshTerms: ['Acute Kidney Injury'] });
        expect(meshOnly).toMatchObject({ eligible: false, rejectionReason: 'off_topic' });

        const capped = annotateEvidenceMetadata([
            { uid: '1', title: 'Kidney injury one', _eligibilityRoute: 'semantic_rescue' },
            { uid: '2', title: 'Kidney injury two', _eligibilityRoute: 'semantic_rescue' },
            { uid: '3', title: 'Kidney injury three', _eligibilityRoute: 'semantic_rescue' },
            { uid: '4', title: 'AKI guideline', pubtype: ['Practice Guideline'], _eligibilityRoute: 'concept' },
        ], { query: 'AKI' });
        expect(capped.filter((a) => a._eligibilityRoute === 'semantic_rescue')).toHaveLength(2);
        expect(capped.some((a) => a.uid === '4')).toBe(true);
    });

    test('search pack reports honest empty-lane copy and cascade', () => {
        const pack = buildSearchPack([
            {
                uid: 'rct-1',
                title: 'A randomized trial of reperfusion in ACS',
                pubtype: ['Randomized Controlled Trial'],
                _evidenceLane: 'landmark_trials',
            },
        ]);
        expect(pack.primaryLane).toBe('landmark_trials');
        expect(pack.lanes.guidelines.count).toBe(0);
        expect(pack.lanes.guidelines.emptyState).toBe(EMPTY_LANE_COPY.guidelines);
        expect(pack.cascadeNote).toContain('No verified current guideline');
        expect(pack.cascadeNote).toContain('Landmark trials next');
    });

    test('display order follows evidence rank, not learning rank, independently inside each lane', () => {
        const ordered = orderArticlesByEvidenceRank([
            { uid: 'learned', _evidenceRank: 3, _learningRank: 1 },
            { uid: 'evidence', _evidenceRank: 1, _learningRank: 4 },
        ]);
        expect(ordered.map((row) => row.uid)).toEqual(['evidence', 'learned']);

        const laned = rankArticlesWithinLanes([
            { uid: 'support-hi', _evidenceLane: 'supporting', _evidenceRank: 1 },
            { uid: 'guide-lo', _evidenceLane: 'guidelines', _evidenceRank: 9 },
            { uid: 'guide-hi', _evidenceLane: 'guidelines', _evidenceRank: 2 },
        ]);
        expect(laned.map((row) => row.uid)).toEqual(['guide-hi', 'guide-lo', 'support-hi']);

        const diagnostic = rankArticlesWithinLanes([
            { uid: 'trial', _evidenceLane: 'landmark_trials', _evidenceRank: 1 },
            { uid: 'review', _evidenceLane: 'reviews', _evidenceRank: 2 },
        ], { intent: 'diagnostic' });
        expect(diagnostic.map((row) => row.uid)).toEqual(['review', 'trial']);
    });
});
