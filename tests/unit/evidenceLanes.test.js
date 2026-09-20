'use strict';

const {
    classifyEvidenceLane,
    evaluateEligibility,
    buildSearchPack,
    orderArticlesByEvidenceRank,
    EMPTY_LANE_COPY,
} = require('../../server/services/search/evidenceLanes');

describe('evidence lanes', () => {
    test('classifies guidelines, RCTs, SR/MA, and supporting without global citation gates', () => {
        expect(classifyEvidenceLane({
            title: 'ESC guidelines for ACS',
            pubtype: ['Practice Guideline'],
        })).toBe('guidelines');
        expect(classifyEvidenceLane({
            title: 'A randomized trial of reperfusion',
            pubtype: ['Randomized Controlled Trial'],
            citationCount: 3,
        })).toBe('landmark_trials');
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

    test('eligibility uses curated landmark, concept, and semantic rescue routes', () => {
        const pinned = evaluateEligibility({
            title: 'Duodenal infusion of donor feces',
            _pinnedLandmark: true,
        }, { query: 'fecal microbiota transplant' });
        expect(pinned).toMatchObject({ eligible: true, route: 'curated_landmark' });

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

    test('display order follows evidence rank, not learning rank', () => {
        const ordered = orderArticlesByEvidenceRank([
            { uid: 'learned', _evidenceRank: 3, _learningRank: 1 },
            { uid: 'evidence', _evidenceRank: 1, _learningRank: 4 },
        ]);
        expect(ordered.map((row) => row.uid)).toEqual(['evidence', 'learned']);
    });
});
