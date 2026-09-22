'use strict';

/**
 * What legacy content is allowed to claim.
 *
 * The audit marked 11,703 teaching objects `legacy_unlinked` - generated before snapshots existed,
 * so nobody can produce the sources they were built from. Attaching a snapshot retrospectively would
 * have asserted knowledge we do not have. But marking them changed only the data: they were still
 * served identically to provenanced content. These tests pin the ceiling that marker now carries,
 * and just as importantly, what it must NOT do.
 */

const {
    LEGACY_UNLINKED,
    isLegacyUnlinked,
    isProvable,
    describeProvenance,
    annotateProvenance,
    capVerificationForLegacy,
    capVerificationForContext,
    partitionByProvenance,
} = require('../../server/services/content/legacyContentPolicy');

const ENFORCE = { EVIDENCE_LINEAGE_ENFORCEMENT: 'enforce' };
const SHADOW = {};

const legacy = (over = {}) => ({ objectKey: 'to-1', lineageStatus: LEGACY_UNLINKED, ...over });
const linked = (over = {}) => ({ objectKey: 'to-2', lineageStatus: 'linked', evidenceSnapshotId: 'snap-1', ...over });

describe('recognising content whose sources cannot be produced', () => {
    test('the audit marker is recognised, in either column spelling', () => {
        expect(isLegacyUnlinked(legacy())).toBe(true);
        expect(isLegacyUnlinked({ lineage_status: LEGACY_UNLINKED })).toBe(true);
    });

    test('a row predating the audit is legacy even without the marker', () => {
        // The audit has not necessarily run everywhere; no snapshot and no status is still unprovable.
        expect(isLegacyUnlinked({ objectKey: 'to-3' })).toBe(true);
        expect(isProvable({ objectKey: 'to-3' })).toBe(false);
    });

    test('content with a snapshot is provable', () => {
        expect(isLegacyUnlinked(linked())).toBe(false);
        expect(isProvable(linked())).toBe(true);
    });
});

describe('a reader can tell the difference', () => {
    test('legacy content says so, and says why, without being hidden', () => {
        const described = describeProvenance(legacy());
        expect(described).toMatchObject({ lineage: LEGACY_UNLINKED, provable: false });
        expect(described.reason).toMatch(/before evidence snapshots existed/);
    });

    test('annotating adds provenance and changes nothing else', () => {
        const object = legacy({ payload: { clinicalBottomLine: 'Start all four pillars.' } });
        const annotated = annotateProvenance(object);
        expect(annotated.payload).toEqual(object.payload);
        expect(annotated.provenance.provable).toBe(false);
    });
});

describe('the provenance ceiling', () => {
    test('under enforcement legacy content cannot assert identifiable source text', () => {
        expect(capVerificationForLegacy('guideline_supported', legacy(), ENFORCE)).toBe('unverified');
        expect(capVerificationForLegacy('source_verified', legacy(), ENFORCE)).toBe('unverified');
    });

    test('labels that assert nothing about sources are untouched', () => {
        expect(capVerificationForLegacy('abstract_only', legacy(), ENFORCE)).toBe('abstract_only');
        expect(capVerificationForLegacy('unverified', legacy(), ENFORCE)).toBe('unverified');
    });

    test('provable content keeps its label', () => {
        expect(capVerificationForLegacy('guideline_supported', linked(), ENFORCE)).toBe('guideline_supported');
    });

    test('in shadow, the default, nothing is capped', () => {
        expect(capVerificationForLegacy('guideline_supported', legacy(), SHADOW)).toBe('guideline_supported');
    });
});

describe('a generation inherits the ceiling of what it read', () => {
    test('one unprovable input caps the result, even alongside provable ones', () => {
        expect(capVerificationForContext('guideline_supported', [linked(), legacy()], ENFORCE)).toBe('unverified');
    });

    test('wholly provable context does not cap', () => {
        expect(capVerificationForContext('guideline_supported', [linked(), linked()], ENFORCE)).toBe('guideline_supported');
    });

    test('no context at all is not legacy context', () => {
        // The failure to avoid: treating "read nothing" as "read something unprovable", which would
        // cap every generation that uses no teaching objects.
        expect(capVerificationForContext('guideline_supported', [], ENFORCE)).toBe('guideline_supported');
        expect(capVerificationForContext('guideline_supported', undefined, ENFORCE)).toBe('guideline_supported');
    });

    test('the split keeps legacy content usable rather than withholding it', () => {
        const { provable, legacy: unprovable } = partitionByProvenance([linked(), legacy(), legacy()]);
        expect(provable).toHaveLength(1);
        expect(unprovable).toHaveLength(2);
    });
});

describe('retired content: kept, but not built upon', () => {
    const { LEGACY_RETIRED, isRetired, usableAsContext } = require('../../server/services/content/legacyContentPolicy');
    const retired = (over = {}) => ({ objectKey: 'to-r', lineageStatus: LEGACY_RETIRED, ...over });

    test('retired content is recognised and is still unprovable', () => {
        expect(isRetired(retired())).toBe(true);
        expect(isProvable(retired())).toBe(false);
        expect(isLegacyUnlinked(retired())).toBe(true);
    });

    test('it says why it was retired, rather than just disappearing', () => {
        const described = describeProvenance(retired());
        expect(described.lineage).toBe(LEGACY_RETIRED);
        expect(described.reason).toMatch(/outside the curriculum/);
    });

    test('it is excluded from seeding new generations', () => {
        const usable = usableAsContext([linked(), legacy(), retired()]);
        expect(usable.map((o) => o.objectKey)).toEqual(['to-2', 'to-1']);
    });

    test('ordinary legacy content is still usable as context, because it is often all there is', () => {
        expect(usableAsContext([legacy()])).toHaveLength(1);
    });

    test('retired content still carries the provenance ceiling under enforcement', () => {
        expect(capVerificationForLegacy('guideline_supported', retired(), ENFORCE)).toBe('unverified');
    });
});
