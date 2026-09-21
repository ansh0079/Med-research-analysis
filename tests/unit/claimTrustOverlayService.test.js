'use strict';

const {
    normalizeClaimText,
    textsMatch,
    matchTeachingClaim,
    shouldPreferTeaching,
    overlayTeachingClaimTrust,
    writeThroughTeachingVerification,
} = require('../../server/services/claimTrustOverlayService');

describe('claimTrustOverlayService', () => {
    test('normalizeClaimText collapses punctuation and case', () => {
        expect(normalizeClaimText('  Low-Tidal Volume!! ')).toBe('low tidal volume');
    });

    test('textsMatch tolerates shared prefixes', () => {
        expect(textsMatch(
            'Low tidal volume ventilation reduces mortality in ARDS.',
            'Low tidal volume ventilation reduces mortality in ARDS patients with severe hypoxemia.'
        )).toBe(true);
        expect(textsMatch('short', 'also short')).toBe(false);
    });

    test('matchTeachingClaim prefers claim_key then text', () => {
        const teaching = [
            { claimKey: 'tc-1', claimText: 'Use prone positioning for severe ARDS.', articleUid: 'pmid:1', verificationStatus: 'human_reviewed' },
            { claimKey: 'tc-2', claimText: 'Start norepinephrine early in septic shock.', articleUid: 'pmid:2', verificationStatus: 'source_verified' },
        ];
        expect(matchTeachingClaim(
            { claimKey: 'tc-1', claimText: 'unrelated', sourceIds: [] },
            teaching
        )?.match).toBe('claim_key');
        expect(matchTeachingClaim(
            { claimKey: 'ai-xyz', claimText: 'Start norepinephrine early in septic shock.', sourceIds: ['pmid:2'] },
            teaching
        )?.match).toBe('text');
    });

    test('shouldPreferTeaching overlays curator ladder above unvalidated AI rows', () => {
        expect(shouldPreferTeaching('human_reviewed', 'unvalidated')).toBe(true);
        expect(shouldPreferTeaching('guideline_supported', 'citations_ok')).toBe(true);
        expect(shouldPreferTeaching('agent_draft', 'citations_ok')).toBe(false);
        expect(shouldPreferTeaching('unverified', 'unvalidated')).toBe(false);
    });

    test('overlayTeachingClaimTrust applies teaching verificationStatus to validationStatus', async () => {
        const db = {
            getTeachingClaimByKey: jest.fn(async () => null),
            listTeachingObjectClaimsForTopic: jest.fn(async () => ([
                {
                    claimKey: 'tc-ards',
                    claimText: 'Low tidal volume ventilation improves survival in ARDS.',
                    articleUid: 'pmid:123',
                    verificationStatus: 'human_reviewed',
                },
            ])),
            getTeachingObjectForArticle: jest.fn(async () => null),
        };
        const aiClaims = [{
            claimKey: 'ai-hash-1',
            claimText: 'Low tidal volume ventilation improves survival in ARDS.',
            sourceIds: ['pmid:123'],
            validationStatus: 'unvalidated',
        }];
        const overlaid = await overlayTeachingClaimTrust(db, aiClaims, { topic: 'ARDS' });
        expect(overlaid[0].validationStatus).toBe('human_reviewed');
        expect(overlaid[0].teachingClaimKey).toBe('tc-ards');
        expect(overlaid[0].trustOverlay.applied).toBe(true);
        expect(overlaid[0].trustOverlay.matchedBy).toBe('text');
    });

    test('writeThroughTeachingVerification updates matching AI rows', async () => {
        const runs = [];
        const db = {
            all: jest.fn(async (sql) => {
                if (sql.includes('claim_key = ?')) {
                    return [{
                        id: 9,
                        claim_key: 'ai-hash-1',
                        claim_text: 'Low tidal volume ventilation improves survival in ARDS.',
                        source_ids_json: '["pmid:123"]',
                        validation_status: 'unvalidated',
                    }];
                }
                return [];
            }),
            run: jest.fn(async (sql, params) => {
                runs.push({ sql, params });
                return { changes: 1 };
            }),
            mapAiGenerationClaimRow: (row) => ({
                claimKey: row.claim_key,
                claimText: row.claim_text,
                sourceIds: JSON.parse(row.source_ids_json || '[]'),
                validationStatus: row.validation_status,
            }),
        };
        const result = await writeThroughTeachingVerification(db, {
            claimKey: 'ai-hash-1',
            claimText: 'Low tidal volume ventilation improves survival in ARDS.',
            articleUid: 'pmid:123',
            verificationStatus: 'human_reviewed',
        });
        expect(result.updated).toBe(1);
        expect(runs[0].params[0]).toBe('human_reviewed');
        expect(runs[0].params[1]).toBe(9);
    });
});

describe('candidate lookups do not run one round trip at a time', () => {
    const { overlayTeachingClaimTrust } = require('../../server/services/claimTrustOverlayService');

    /** Records how many lookups were in flight at once, and in what order results were applied. */
    function trackingDb({ delayMs = 5 } = {}) {
        let inFlight = 0;
        const state = { maxConcurrent: 0, calls: 0 };
        const slow = (value) => new Promise((resolve) => {
            inFlight += 1;
            state.calls += 1;
            state.maxConcurrent = Math.max(state.maxConcurrent, inFlight);
            setTimeout(() => { inFlight -= 1; resolve(value); }, delayMs);
        });
        return {
            state,
            getTeachingClaimByKey: (key) => slow({ claimKey: key, verificationStatus: 'guideline_supported' }),
            listTeachingObjectClaimsForTopic: async () => [],
            getTeachingObjectForArticle: () => slow(null),
        };
    }

    const claims = (n) => Array.from({ length: n }, (_, i) => ({ claimKey: `claim-${i}`, sourceIds: [] }));

    test('independent claim lookups overlap instead of queueing behind each other', async () => {
        const db = trackingDb();
        await overlayTeachingClaimTrust(db, claims(8), { topic: 'heart failure' });

        expect(db.state.calls).toBe(8);
        // Sequential awaits would never exceed one in flight; this is the regression that mattered.
        expect(db.state.maxConcurrent).toBeGreaterThan(1);
    });

    test('concurrency stays bounded rather than opening one connection per claim', async () => {
        const db = trackingDb();
        await overlayTeachingClaimTrust(db, claims(40), { topic: 'heart failure' });

        expect(db.state.calls).toBe(40);
        expect(db.state.maxConcurrent).toBeLessThanOrEqual(8);
    });

    test('a failing lookup still leaves the other claims overlaid', async () => {
        const db = trackingDb();
        db.getTeachingClaimByKey = (key) => (key === 'claim-1'
            ? Promise.reject(new Error('db down'))
            : Promise.resolve({ claimKey: key, verificationStatus: 'guideline_supported' }));

        const result = await overlayTeachingClaimTrust(db, claims(3), { topic: 'heart failure' });
        expect(result).toHaveLength(3);
    });
});
