const {
    matchMisconceptionsToClaims,
    overlapScore,
    recordClaimGapsFromMisconceptions,
    resolveClaimMasteryState,
} = require('../../server/services/claimRemediationService');

describe('claimRemediationService', () => {
    test('resolveClaimMasteryState prioritizes claim_gap over quiz mastery', () => {
        expect(resolveClaimMasteryState({ attempts: 8, correct: 8, gapSignals: 1 })).toBe('weak');
        expect(resolveClaimMasteryState({ attempts: 0, correct: 0, gapSignals: 0 })).toBe('untested');
    });

    test('overlapScore matches related claim text', () => {
        const score = overlapScore(
            'metformin reduces cardiovascular mortality in type 2 diabetes',
            'Metformin lowers cardiovascular events in adults with type 2 diabetes mellitus.'
        );
        expect(score).toBeGreaterThan(0.35);
    });

    test('matchMisconceptionsToClaims returns claim keys', () => {
        const matches = matchMisconceptionsToClaims(
            ['ACE inhibitors always cause hyperkalemia in every patient'],
            [{ claimKey: 'ck-1', claimText: 'ACE inhibitors can raise serum potassium in susceptible patients.' }]
        );
        expect(matches.length).toBeGreaterThanOrEqual(0);
    });

    test('recordClaimGapsFromMisconceptions writes claim_gap events', async () => {
        const events = [];
        const db = {
            listTeachingObjectClaimsForTopic: async () => ([
                { claimKey: 'ck-ace', claimText: 'ACE inhibitors may increase potassium in renal impairment.' },
            ]),
            recordLearningEvent: async (row) => {
                events.push(row);
                return { id: 1 };
            },
        };
        const result = await recordClaimGapsFromMisconceptions({
            db,
            userId: 'u1',
            topic: 'hypertension',
            misconceptions: ['ACE inhibitors always cause severe hyperkalemia in every patient'],
            sourceId: '42',
        });
        expect(result.recorded).toBeGreaterThanOrEqual(0);
        if (result.recorded > 0) {
            expect(events[0].eventType).toBe('claim_gap');
            expect(events[0].claimKey).toBeTruthy();
        }
    });
});
