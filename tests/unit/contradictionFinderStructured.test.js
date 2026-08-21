const { findContradictionsForClaim } = require('../../server/services/contradictionFinderService');

describe('findContradictionsForClaim structured conflicts', () => {
    test('returns guidelineConflicts from topic matrix even when literature search is empty', async () => {
        const db = {
            normalizeTopic: (t) => String(t).toLowerCase(),
            getContradictionsForTopic: jest.fn(async () => ([
                {
                    id: 1,
                    severity: 'major',
                    contradictionSummary: 'Society A recommends therapy X; Society B advises against therapy X in sepsis',
                    bodyAPosition: 'Use therapy X early in sepsis',
                    bodyBPosition: 'Do not use therapy X routinely',
                    clinicalImplication: 'Reconcile society guidance before protocolizing therapy X',
                    guidelineA: { sourceBody: 'SCCM' },
                    guidelineB: { sourceBody: 'NICE' },
                },
            ])),
            saveClaimContradictionSearch: jest.fn(async () => {}),
        };

        const result = await findContradictionsForClaim(db, {
            claimKey: 'claim-1',
            topic: 'Sepsis',
            claimText: 'Therapy X reduces mortality in sepsis',
            serverConfig: { keys: {} },
            fetchImpl: jest.fn(async () => ({ ok: false })),
        });

        expect(result.guidelineConflicts).toHaveLength(1);
        expect(result.guidelineConflicts[0].severity).toBe('major');
        expect(result.structuredConflictCount).toBe(1);
        expect(db.getContradictionsForTopic).toHaveBeenCalledWith('sepsis');
        expect(Array.isArray(result.articles)).toBe(true);
    });

    test('degrades when guideline_contradictions table unavailable', async () => {
        const db = {
            normalizeTopic: (t) => String(t).toLowerCase(),
            getContradictionsForTopic: jest.fn(async () => {
                throw new Error('no such table: guideline_contradictions');
            }),
        };

        const result = await findContradictionsForClaim(db, {
            claimKey: 'claim-2',
            topic: 'ARDS',
            claimText: 'Low tidal volume ventilation is standard',
            serverConfig: { keys: {} },
            fetchImpl: jest.fn(async () => ({ ok: false })),
        });

        expect(result.guidelineConflicts).toEqual([]);
        expect(result.structuredConflictCount).toBe(0);
        expect(Array.isArray(result.articles)).toBe(true);
    });
});
