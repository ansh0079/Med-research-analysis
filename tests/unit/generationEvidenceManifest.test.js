'use strict';

/**
 * The generation evidence manifest. The hole this closes: guideline recommendations and
 * teaching-object text were built into the quiz prompt, while recording them on the snapshot was
 * best-effort - a failure logged a warning and generation carried on reporting lineage 'linked'.
 * A manifest that cannot account for every input is a provenance state, not a log line.
 */

// The module under test destructures its dependency at load, and this project's jest does not
// hoist jest.mock above requires, so the mock is registered before the require below.
jest.mock('../../server/services/search/searchEvidenceSnapshot', () => ({
    ...jest.requireActual('../../server/services/search/searchEvidenceSnapshot'),
    addEvidenceToSnapshot: jest.fn(async (db, id, articles) => {
        if (db.__fail) throw new Error('snapshot write failed');
        if (db.__forbidden) return { ok: false, reason: 'forbidden' };
        const added = articles
            .filter((a) => !(db.__dropUids || []).includes(a.uid))
            .map((a, i) => ({ uid: a.uid, versionId: `v-${i}-${a.uid}` }));
        (db.__recorded || []).push(...added.map((a) => a.uid));
        return { added };
    }),
}));

const {
    recordGenerationInputs,
    capVerificationForManifest,
    teachingObjectToEvidenceArticle,
    publicManifest,
} = require('../../server/services/search/generationEvidenceManifest');

const guidelineToEvidenceArticle = (g) => ({
    uid: `guideline:${g.id}`, title: `${g.sourceBody} guideline`, abstract: g.recommendationText,
    source: 'guideline', pubtype: ['Practice Guideline'],
});

const guideline = (id) => ({ id, sourceBody: 'ESC', recommendationText: `Recommendation ${id}.` });
const teachingObject = (key) => ({ objectKey: key, title: `Teaching ${key}` });

/** A db whose snapshot write succeeds, recording every article it is given. */
function okDb(recorded = []) {
    return {
        async run() { return { changes: 1 }; },
        async all() { return []; },
        async get() { return {}; },
        __recorded: recorded,
    };
}

const record = (db, over = {}) => recordGenerationInputs(db, {
    snapshotId: 'snap-1', guidelines: [guideline(1)], teachingObjects: [teachingObject('to-1')],
    teachingObjectContext: 'Bottom line: treat.', guidelineToEvidenceArticle, ...over,
});

describe('recording what the prompt will carry', () => {
    test('guidelines and teaching objects are both versioned, and the manifest is complete', async () => {
        const recorded = [];
        const manifest = await record(okDb(recorded));

        expect(manifest.complete).toBe(true);
        expect(manifest.missing).toEqual([]);
        expect(manifest.inputs.map((i) => i.kind).sort()).toEqual(['guideline', 'teaching_object']);
        expect(recorded).toEqual(expect.arrayContaining(['guideline:1', 'teaching_object:to-1']));
        expect(manifest.inputs.every((i) => i.versionId)).toBe(true);
    });

    test('a generation with no extra context has nothing to prove and is complete', async () => {
        const manifest = await record(okDb(), { guidelines: [], teachingObjects: [] });
        expect(manifest).toMatchObject({ complete: true, inputs: [], missing: [] });
    });

    test('teaching objects are versioned on the exact text the prompt received', () => {
        const article = teachingObjectToEvidenceArticle(teachingObject('to-9'), '  Bottom line:   treat  ');
        expect(article.uid).toBe('teaching_object:to-9');
        // Whitespace-normalised, because the version id hashes this text.
        expect(article.abstract).toBe('Bottom line: treat');
    });

    test('teaching objects with no built context are not recorded as empty evidence', async () => {
        const manifest = await record(okDb(), { teachingObjectContext: '   ' });
        expect(manifest.inputs.map((i) => i.kind)).toEqual(['guideline']);
        expect(manifest.complete).toBe(true);
    });
});

describe('an input that cannot be recorded makes the manifest incomplete', () => {
    test('a failed snapshot write is a provenance state, not a warning', async () => {
        const db = okDb(); db.__fail = true;
        const manifest = await record(db);
        expect(manifest.complete).toBe(false);
        expect(manifest.reason).toBe('record_failed');
        expect(manifest.missing.map((m) => m.kind).sort()).toEqual(['guideline', 'teaching_object']);
    });

    test('context with no snapshot to attach it to cannot be proven', async () => {
        const manifest = await record(okDb(), { snapshotId: null });
        expect(manifest).toMatchObject({ complete: false, reason: 'no_snapshot' });
    });

    test('a partially recorded set names exactly what is missing', async () => {
        const db = okDb(); db.__dropUids = ['teaching_object:to-1'];
        const manifest = await record(db);
        expect(manifest.complete).toBe(false);
        expect(manifest.reason).toBe('partially_recorded');
        expect(manifest.missing).toEqual([{ kind: 'teaching_object', uid: 'teaching_object:to-1', reason: 'not_recorded' }]);
        expect(manifest.inputs.map((i) => i.kind)).toEqual(['guideline']);
    });

    test('a rejected snapshot write cannot be reported as complete', async () => {
        const db = okDb(); db.__forbidden = true;
        const manifest = await record(db);
        expect(manifest).toMatchObject({ complete: false, reason: 'record_failed' });
    });

    test('community and topic evidence are versioned, while truncated evidence is incomplete', async () => {
        const manifest = await record(okDb(), {
            communityTopPicks: [{ uid: 'pubmed-8', title: 'Picked paper' }],
            topicKnowledge: { teachingPoints: ['Treat early'] },
        });
        expect(manifest.complete).toBe(true);
        expect(manifest.inputs.map((item) => item.kind)).toEqual(expect.arrayContaining(['community', 'topic_knowledge']));
        const oversized = await record(okDb(), { teachingObjectContext: 'x'.repeat(5000) });
        expect(oversized.complete).toBe(false);
        expect(oversized.missing).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'teaching_object', reason: 'truncated_source' })]));
    });
});

describe('what an incomplete manifest is allowed to claim', () => {
    const incomplete = { complete: false, inputs: [], missing: [] };
    const complete = { complete: true, inputs: [], missing: [] };

    test('under enforcement a provenance-asserting label is capped', () => {
        const env = { EVIDENCE_LINEAGE_ENFORCEMENT: 'enforce' };
        expect(capVerificationForManifest('guideline_supported', incomplete, env)).toBe('unverified');
        expect(capVerificationForManifest('source_verified', incomplete, env)).toBe('unverified');
        // A label that asserts nothing about sources is left alone.
        expect(capVerificationForManifest('abstract_only', incomplete, env)).toBe('abstract_only');
        expect(capVerificationForManifest('guideline_supported', complete, env)).toBe('guideline_supported');
    });

    test('in explicit shadow mode the state is recorded and labels are unchanged', () => {
        expect(capVerificationForManifest('guideline_supported', incomplete, { EVIDENCE_LINEAGE_ENFORCEMENT: 'shadow' })).toBe('guideline_supported');
    });

    test('the public form counts inputs and names missing kinds without leaking ids', () => {
        expect(publicManifest({ complete: false, inputs: [{ kind: 'guideline' }], missing: [{ kind: 'teaching_object', uid: 'x', reason: 'not_recorded' }] }))
            .toEqual({ complete: false, inputs: 1, missing: [{ kind: 'teaching_object', reason: 'not_recorded' }] });
    });
});
