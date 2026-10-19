'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { Database } = require('../../database');
const { upsertDrafts, listDrafts, getDraft, reviewDraft } = require('../../server/services/topicMentorDrafts');

const draft = (over = {}) => ({
    topicId: 'topic-1',
    topic: 'delirium',
    cluster: 'delirium',
    status: 'draft_pending_clinician_review',
    page: { mentor_intro: 'Intro.', teaching_points: [{ claim: 'A claim.', cites: ['1'] }], sources: [{ pmid: '1' }] },
    dbEvidence: { papersKept: [], papersDropped: [] },
    ...over,
});

describe('topic mentor drafts', () => {
    let db;
    beforeAll(async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mentor-drafts-'));
        db = new Database(path.join(dir, 'test.db'));
        await db.connect();
    }, 120000);
    afterAll(async () => { await db?.close?.().catch(() => {}); });

    test('insert, refresh, list and read back', async () => {
        expect(await upsertDrafts(db, [draft(), draft({ topicId: 'topic-2', topic: 'dengue', status: 'needs_evidence', page: { teaching_points: [], sources: [] } })]))
            .toEqual({ inserted: 2, updated: 0, skippedReviewed: 0 });
        expect(await upsertDrafts(db, [draft({ topic: 'delirium (edited)' })])).toEqual({ inserted: 0, updated: 1, skippedReviewed: 0 });

        const list = await listDrafts(db, {});
        expect(list.items.map((i) => i.topic)).toEqual(['delirium (edited)', 'dengue']);
        expect(list.counts).toEqual({ draft_pending_clinician_review: 1, needs_evidence: 1 });
        expect((await listDrafts(db, { status: 'needs_evidence' })).items).toHaveLength(1);

        const one = await getDraft(db, 'topic-1');
        expect(one.page.teaching_points).toHaveLength(1);
        expect(one.teachingPoints).toBe(1);
    });

    test('a reviewed draft is never overwritten by a reload', async () => {
        const out = await reviewDraft(db, { topicId: 'topic-1', decision: 'needs_changes', notes: 'Add doses.', userId: 7 });
        expect(out.status).toBe('needs_changes');
        expect(out.reviewedBy).toBe('7');
        expect(await upsertDrafts(db, [draft({ topic: 'overwritten' })])).toEqual({ inserted: 0, updated: 0, skippedReviewed: 1 });
        expect((await getDraft(db, 'topic-1')).topic).toBe('delirium (edited)');
    });

    test('invalid decisions, missing drafts and approving an evidence-less draft are refused', async () => {
        await expect(reviewDraft(db, { topicId: 'topic-1', decision: 'maybe' })).rejects.toThrow('Invalid decision');
        await expect(reviewDraft(db, { topicId: 'nope', decision: 'approved' })).rejects.toThrow('not found');
        await expect(reviewDraft(db, { topicId: 'topic-2', decision: 'approved' })).rejects.toThrow('cannot be approved');
    });
});
