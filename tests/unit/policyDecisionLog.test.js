'use strict';

const { normalizeDecision, recordPolicyDecision } = require('../../server/services/policy/policyDecisionLog');
const { writersRequiringPolicy, findWritePath } = require('../../server/services/policy/writePathInventory');

describe('write-path inventory and policy log', () => {
    test('lists the clinician-facing writers that must go through policy', () => {
        const ids = writersRequiringPolicy().map((row) => row.id);
        expect(ids).toEqual(expect.arrayContaining([
            'upsertTeachingObject',
            'createGuideline',
            'upsertTopicKnowledge',
            'upsertGuidelineRefiling',
        ]));
        expect(findWritePath('createGuideline').family).toBe('guideline');
        expect(findWritePath('upsertTeachingObject').policyRequired).toBe(true);
    });

    test('rejects incomplete policy rows', () => {
        expect(normalizeDecision({ action: 'accept' }).ok).toBe(false);
        expect(normalizeDecision({ writer: 'createGuideline', action: 'maybe' }).ok).toBe(false);
    });

    test('records accept and reject with a reason', async () => {
        const recorded = [];
        const db = {
            recordPolicyDecision: jest.fn(async (row) => {
                recorded.push(row);
                return { id: 'dec-1', ...row };
            }),
        };
        const accepted = await recordPolicyDecision(db, {
            writer: 'createGuideline',
            action: 'accept',
            reason: 'named society guideline with lineage',
            entityType: 'guideline',
            entityId: 'g-1',
        });
        const rejected = await recordPolicyDecision(db, {
            writer: 'createGuideline',
            action: 'reject',
            reason: 'do not fake KDIGO onto AKI',
            entityType: 'guideline',
            entityId: 'g-2',
        });
        expect(accepted.recorded).toBe(true);
        expect(rejected.decision.action).toBe('reject');
        expect(recorded).toHaveLength(2);
    });
});
