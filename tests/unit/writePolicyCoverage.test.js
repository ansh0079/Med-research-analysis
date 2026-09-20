'use strict';

const fs = require('fs');
const path = require('path');
const { WRITE_PATHS, writersRequiringPolicy } = require('../../server/services/policy/writePathInventory');
const { evaluateWrite, REASON_CODES } = require('../../server/services/policy/writePolicyEngine');

const MIXIN_DIR = path.join(__dirname, '../../database/mixins');

function mixinSources() {
    return fs.readdirSync(MIXIN_DIR)
        .filter((name) => name.endsWith('.js'))
        .map((name) => fs.readFileSync(path.join(MIXIN_DIR, name), 'utf8'));
}

describe('write-policy coverage', () => {
    test('every writer the inventory marks policyRequired calls applyWritePolicy', () => {
        const sources = mixinSources();
        const unwired = writersRequiringPolicy()
            .map((row) => row.id)
            .filter((id) => !sources.some((src) => src.includes(`writer: '${id}'`)));
        expect(unwired).toEqual([]);
    });

    test('inventory is not padded: every writer has an owner and a family', () => {
        for (const row of WRITE_PATHS) {
            expect(row.family).toBeTruthy();
            expect(row.owners.length).toBeGreaterThan(0);
        }
    });

    test('bridge re-filing rejects task-word keys, missing identity and invalid similarity', () => {
        const base = { guidelineId: 12, canonicalNormalized: 'acute kidney injury', similarity: 0.71 };
        expect(evaluateWrite({ writer: 'upsertGuidelineRefiling', payload: base }).allowed).toBe(true);
        expect(evaluateWrite({ writer: 'upsertGuidelineRefiling', payload: { ...base, guidelineId: null } }).reasons[0].code)
            .toBe(REASON_CODES.IDENTITY_MISSING_SOURCE);
        expect(evaluateWrite({ writer: 'upsertGuidelineRefiling', payload: { ...base, canonicalNormalized: 'management' } }).reasons[0].code)
            .toBe(REASON_CODES.CONCEPT_TASK_WORD_KEY);
        expect(evaluateWrite({ writer: 'upsertGuidelineRefiling', payload: { ...base, similarity: 0 } }).reasons[0].code)
            .toBe(REASON_CODES.BRIDGE_SIMILARITY_INVALID);
        expect(evaluateWrite({ writer: 'upsertGuidelineRefiling', payload: { ...base, similarity: 1.4 } }).allowed).toBe(false);
        expect(evaluateWrite({ writer: 'upsertGuidelineRefiling', payload: { ...base, similarity: 1.0000000000000002 } }).allowed).toBe(true);
        expect(evaluateWrite({
            writer: 'upsertGuidelineRefiling',
            payload: { guidelineId: 12, canonicalNormalized: '', similarity: 0, belowThreshold: true },
        }).allowed).toBe(true);
    });

    test('topic alias rejects a task-word alias and a missing target', () => {
        expect(evaluateWrite({ writer: 'recordTopicAlias', payload: { topic: 'aki', curriculumTopicId: 'c1' } }).allowed).toBe(true);
        expect(evaluateWrite({ writer: 'recordTopicAlias', payload: { topic: 'treatment', curriculumTopicId: 'c1' } }).allowed).toBe(false);
        expect(evaluateWrite({ writer: 'recordTopicAlias', payload: { topic: 'aki', curriculumTopicId: null } }).allowed).toBe(false);
    });

    test('curriculum topic rejects empty and task-word display names', () => {
        expect(evaluateWrite({ writer: 'upsertCurriculumSeedTopic', payload: { displayName: 'Acute kidney injury' } }).allowed).toBe(true);
        expect(evaluateWrite({ writer: 'upsertCurriculumSeedTopic', payload: { displayName: 'Guidelines' } }).allowed).toBe(false);
        expect(evaluateWrite({ writer: 'upsertCurriculumSeedTopic', payload: { displayName: '  ' } }).allowed).toBe(false);
    });

    test('conflict review needs a hash, both claims and a resolved topic', () => {
        const ok = { normalizedTopic: 'heart failure', conflictHash: 'h1', trialClaim: 'SGLT2i reduces death', guidelineClaim: 'Consider SGLT2i' };
        expect(evaluateWrite({ writer: 'upsertTrialGuidelineConflictReview', payload: ok }).allowed).toBe(true);
        expect(evaluateWrite({ writer: 'upsertTrialGuidelineConflictReview', payload: { ...ok, conflictHash: '' } }).allowed).toBe(false);
        expect(evaluateWrite({ writer: 'upsertTrialGuidelineConflictReview', payload: { ...ok, guidelineClaim: '' } }).allowed).toBe(false);
        expect(evaluateWrite({ writer: 'upsertTrialGuidelineConflictReview', payload: { ...ok, normalizedTopic: 'management' } }).allowed).toBe(false);
    });

    test('watch event needs a guideline or claim identity', () => {
        expect(evaluateWrite({ writer: 'insertGuidelineWatchEvent', payload: { guidelineId: 4, normalizedTopic: 'heart failure' } }).allowed).toBe(true);
        expect(evaluateWrite({ writer: 'insertGuidelineWatchEvent', payload: { claimKey: 'c-9' } }).allowed).toBe(true);
        // regional_guideline_divergence events are topic-level: no guidelineId or claimKey.
        expect(evaluateWrite({ writer: 'insertGuidelineWatchEvent', payload: { normalizedTopic: 'heart failure' } }).allowed).toBe(true);
        expect(evaluateWrite({ writer: 'insertGuidelineWatchEvent', payload: { normalizedTopic: 'management' } }).allowed).toBe(false);
        expect(evaluateWrite({ writer: 'insertGuidelineWatchEvent', payload: {} }).allowed).toBe(false);
    });
});
