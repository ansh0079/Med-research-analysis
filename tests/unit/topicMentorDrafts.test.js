'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { Database } = require('../../database');
const { upsertDrafts, listDrafts, getDraft, reviewDraft, publishDraft, draftToKnowledge } = require('../../server/services/topicMentorDrafts');

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
        expect(list.items[0].page.teaching_points).toHaveLength(1);

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

    test('draft maps onto the knowledge shape with 1-based source indices', () => {
        const { knowledge, sourceArticles } = draftToKnowledge({
            mentor_intro: 'Intro.',
            teaching_points: [{ claim: 'A.', cites: ['22', '11'] }, { claim: 'B.', cites: ['22'] }],
            uncertainties: ['U.'], mcq_angles: ['M.'], case_hooks: ['C.'], gaps: 'G.',
            sources: [{ pmid: '11', title: 'Meta', design: 'meta-analysis', year: '2024' }, { pmid: '22', title: 'Guide', design: 'guideline', year: '2025' }],
        });
        expect(sourceArticles.map((s) => s.uid)).toEqual(['pmid:11', 'pmid:22']);
        expect(knowledge.teachingPoints[0]).toMatchObject({ sourceIndices: [2, 1], confidence: 'HIGH' });
        expect(knowledge.teachingPoints[1].sourceIndices).toEqual([2]);
        expect(knowledge.mentorMessage).toBe('Intro.');
        expect(knowledge.controversies[0].issue).toBe('U.');
    });

    test('textbook points follow the cited points and are labelled as standard reference with no sources', () => {
        const page = { mentor_intro: 'x', sources: [{ pmid: '1', title: 't', design: 'guideline', year: 2024 }], teaching_points: [{ claim: 'cited', cites: ['1'] }],
            standard_knowledge: [{ claim: 'textbook fact', basis: 'textbook' }], case_hooks: [], mcq_angles: [], uncertainties: [], gaps: '' };
        const { knowledge } = draftToKnowledge(page);
        expect(knowledge.teachingPoints.map((t) => t.claim)).toEqual(['cited', 'textbook fact']);
        expect(knowledge.teachingPoints[1]).toMatchObject({ sourceIndices: [], confidence: 'LOW', basis: 'standard_reference' });
    });

    test('publish needs approval, writes human_reviewed knowledge once, and keeps the previous content', async () => {
        await upsertDrafts(db, [draft({ topicId: 'topic-3', topic: 'gout' })]);
        const calls = [];
        const fake = {
            get: (...a) => db.get(...a),
            run: (...a) => db.run(...a),
            getTopicKnowledge: async () => ({ knowledge: { mentorMessage: 'old' }, sourceArticles: [], status: 'ai_generated' }),
            upsertTopicKnowledge: async (...a) => { calls.push(a); return { id: 1 }; },
        };
        await expect(publishDraft(fake, { topicId: 'topic-3' })).rejects.toThrow('only an approved draft');
        await reviewDraft(db, { topicId: 'topic-3', decision: 'approved', userId: 1 });
        const out = await publishDraft(fake, { topicId: 'topic-3', userId: 1 });
        expect(out.status).toBe('published');
        expect(calls).toHaveLength(1);
        expect(calls[0][0]).toBe('gout');
        expect(calls[0][3]).toBe('human_reviewed');
        const row = await db.get('SELECT previous_knowledge_json FROM topic_mentor_drafts WHERE topic_id = ?', ['topic-3']);
        expect(JSON.parse(row.previous_knowledge_json).knowledge.mentorMessage).toBe('old');
        await expect(publishDraft(fake, { topicId: 'topic-3' })).rejects.toThrow('already published');
    });

    test('invalid decisions, missing drafts and approving an evidence-less draft are refused', async () => {
        await expect(reviewDraft(db, { topicId: 'topic-1', decision: 'maybe' })).rejects.toThrow('Invalid decision');
        await expect(reviewDraft(db, { topicId: 'nope', decision: 'approved' })).rejects.toThrow('not found');
        await expect(reviewDraft(db, { topicId: 'topic-2', decision: 'approved' })).rejects.toThrow('cannot be approved');
    });
});
