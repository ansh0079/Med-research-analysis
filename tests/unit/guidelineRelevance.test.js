'use strict';

const {
    isBoilerplateGuideline,
    scoreGuidelineForTopic,
    rankGuidelinesForTopic,
    uniqueTokens,
} = require('../../server/utils/guidelineRelevance');
const { buildGuidelineSynopsisPayload, assembleGuidelineSummary } = require('../../server/services/guidelineSeedService');
const { compactTeachingObject } = require('../../server/services/agentHelpers/retrievalContext');
const { buildAgentSystemPrompt } = require('../../server/services/agentHelpers/systemPrompt');

describe('guidelineRelevance', () => {
    test('folds British spelling and keeps short clinical tokens', () => {
        const tokens = uniqueTokens('Subarachnoid haemorrhage: vasospasm, nimodipine, SAH');
        expect(tokens).toEqual(expect.arrayContaining(['subarachnoid', 'hemorrhage', 'vasospasm', 'nimodipine', 'sah']));
    });

    test('drops child-maltreatment recommendations for an SAH topic', () => {
        const ranked = rankGuidelinesForTopic('Subarachnoid haemorrhage: vasospasm, nimodipine', [
            {
                id: 1,
                sourceBody: 'NICE',
                sourceYear: 2024,
                recommendationText: 'Healthcare professionals should follow our general guidelines on child maltreatment and safeguarding in the community.',
            },
            {
                id: 2,
                sourceBody: 'AHA/ASA',
                sourceYear: 2023,
                recommendationText: 'Nimodipine is recommended to reduce poor outcome after aneurysmal subarachnoid haemorrhage and delayed cerebral ischaemia from vasospasm.',
                recommendationStrength: 'Strong',
            },
            {
                id: 3,
                sourceBody: 'NICE',
                sourceYear: 2025,
                recommendationText: 'Refer adults with tremor to a Parkinson specialist if there is diagnostic uncertainty.',
            },
        ], { limit: 8 });

        expect(ranked.map((row) => row.id)).toEqual([2]);
        expect(ranked[0].relevanceScore).toBeGreaterThan(0.4);
    });

    test('drops thrombophilia testing rows for mechanical thrombectomy', () => {
        const ranked = rankGuidelinesForTopic('Mechanical thrombectomy', [
            {
                sourceBody: 'NICE',
                recommendationText: 'Do not offer thrombophilia testing to people with a first unprovoked venous thromboembolism.',
            },
            {
                sourceBody: 'AHA/ASA',
                recommendationText: 'Mechanical thrombectomy is recommended for selected patients with acute ischaemic stroke and large vessel occlusion.',
                recommendationStrength: 'Class I',
            },
        ]);
        expect(ranked).toHaveLength(1);
        expect(ranked[0].recommendationText).toMatch(/thrombectomy/i);
    });

    test('flags NICE chrome as boilerplate', () => {
        expect(isBoilerplateGuideline(
            'Healthcare professionals should follow our general guidelines on providing information.'
        )).toBe(true);
        expect(scoreGuidelineForTopic('CKD anaemia', {
            recommendationText: 'Healthcare professionals should follow our general guidelines on providing information.',
        }).reason).toBe('boilerplate');
    });
});

describe('guideline synopsis assembly', () => {
    test('assembleGuidelineSummary persists ranked payload and skips off-topic sets', async () => {
        const stored = [];
        const db = {
            getGuidelinesByTopic: jest.fn(async () => ([{
                sourceBody: 'EASL',
                sourceYear: 2023,
                recommendationText: 'Terlipressin plus albumin is first-line therapy for hepatorenal syndrome-AKI.',
                recommendationStrength: 'Strong',
            }])),
            upsertTeachingObject: jest.fn(async (object) => {
                stored.push(object);
                return object;
            }),
        };

        const result = await assembleGuidelineSummary(db, 'Hepatorenal syndrome');
        expect(result.status).toBe('stored');
        expect(stored[0].objectType).toBe('guideline_summary');
        expect(stored[0].payload.claimAnchors.length).toBeGreaterThan(0);
        expect(stored[0].confidence).toBeLessThan(0.85);

        db.getGuidelinesByTopic.mockResolvedValueOnce([{
            sourceBody: 'NICE',
            recommendationText: 'Refer adults with tremor to a Parkinson specialist if there is diagnostic uncertainty.',
        }]);
        const skipped = await assembleGuidelineSummary(db, 'Intracerebral haemorrhage: BP targets');
        expect(skipped.status).toBe('insufficient_relevant_guidelines');
        expect(stored).toHaveLength(1);
    });
    test('stores agent-injectable bottom line and guideline-supported claims', () => {
        const built = buildGuidelineSynopsisPayload('Hepatorenal syndrome', [
            {
                id: 10,
                sourceBody: 'EASL',
                sourceYear: 2023,
                recommendationText: 'Terlipressin plus albumin is recommended as first-line pharmacological therapy for hepatorenal syndrome-AKI.',
                recommendationStrength: 'Strong',
            },
            {
                id: 11,
                sourceBody: 'NICE',
                sourceYear: 2024,
                recommendationText: 'Healthcare professionals should follow our general guidelines on child maltreatment recognition.',
            },
        ]);

        expect(built.ok).toBe(true);
        expect(built.payload.clinicalBottomLine).toMatch(/Terlipressin/i);
        expect(built.payload.clinicalBottomLine).not.toMatch(/child maltreatment/i);
        expect(built.payload.claimAnchors).toHaveLength(1);
        expect(built.payload.claimAnchors[0].verificationStatus).toBe('guideline_supported');
        expect(built.payload.synopsis.mainFindings).toMatch(/hepatorenal/i);
    });

    test('refuses to assemble a synopsis from off-topic rows', () => {
        const built = buildGuidelineSynopsisPayload('Intracerebral haemorrhage: BP targets', [
            {
                sourceBody: 'NICE',
                recommendationText: 'Refer adults with tremor to a Parkinson disease specialist if there is diagnostic uncertainty about the cause.',
            },
        ]);
        expect(built.ok).toBe(false);
        expect(built.status).toBe('insufficient_relevant_guidelines');
    });

    test('compactTeachingObject reads guideline_summary payload fields', () => {
        const built = buildGuidelineSynopsisPayload('Hepatorenal syndrome', [{
            sourceBody: 'EASL',
            sourceYear: 2023,
            recommendationText: 'Terlipressin plus albumin is recommended as first-line pharmacological therapy for hepatorenal syndrome-AKI.',
            recommendationStrength: 'Strong',
        }]);
        const line = compactTeachingObject({
            title: 'Guideline summary: Hepatorenal syndrome',
            objectType: 'guideline_summary',
            confidence: 0.72,
            payload: built.payload,
        });
        expect(line).toContain('bottom line:');
        expect(line).toContain('Terlipressin');
        expect(line).toContain('type: guideline_summary');
    });
});

describe('agent guideline prompt casing', () => {
    test('renders camelCase guideline rows without throwing', () => {
        const prompt = buildAgentSystemPrompt(
            { topic: 'Hepatorenal syndrome', knowledge: {} },
            [],
            [{
                sourceBody: 'EASL',
                sourceYear: 2023,
                recommendationText: 'Use terlipressin plus albumin for hepatorenal syndrome-AKI.',
            }],
        );
        expect(prompt).toContain('[G1] EASL (2023)');
        expect(prompt).toContain('terlipressin');
        expect(prompt).not.toContain('undefined');
    });
});
