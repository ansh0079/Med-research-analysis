'use strict';

/**
 * The question-to-topic index places each stored question, and each guideline recommendation, on the
 * topic it is about, and sorts questions into aligned / unclear / unassignable. Tested with hand-made unit
 * vectors so every rule is exact; the embedding service is not involved.
 */

const fs = require('fs');
const path = require('path');
const Sqlite = require('better-sqlite3');
const classify = require('../../server/services/questionIndex/classify');
const service = require('../../server/services/questionIndex/questionIndexService');

/** Unit vector in 4 dimensions from angles' worth of weights. */
const unit = (...v) => { const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)); return Float32Array.from(v.map((x) => x / n)); };
// Three topics along the axes; a vector close to one axis is "about" that topic.
const TOPICS = [unit(1, 0, 0, 0), unit(0, 1, 0, 0), unit(0, 0, 1, 0)];
const T = { ...classify.DEFAULT_THRESHOLDS, minTopicSimilarity: 0.5, alignedTopicSimilarity: 0.8, alignedMargin: 0.2, alignedSupport: 0.8, minSupport: 0.5, moveExtraSimilarity: 0.05 };

describe('placing vectors on topics', () => {
    test('picks the nearest topic and reports the runner-up and margin', () => {
        const p = classify.placeOnTopic(unit(1, 0.3, 0, 0), TOPICS);
        expect(p.topicIndex).toBe(0);
        expect(p.runnerUpIndex).toBe(1);
        expect(p.margin).toBeCloseTo(p.similarity - p.runnerUpSimilarity, 6);
        expect(p.similarity).toBeGreaterThan(0.9);
    });

    test('topK returns the best first and ignores the rest', () => {
        expect(classify.topK([0.1, 0.9, 0.5, 0.7], 2)).toEqual([{ index: 1, score: 0.9 }, { index: 3, score: 0.7 }]);
        expect(classify.topK([], 3)).toEqual([]);
    });
});

describe('classifying a question', () => {
    const supportOf = (...sims) => sims.map((similarity, recIndex) => ({ recIndex, similarity }));
    const placement = (over = {}) => ({ topicIndex: 0, similarity: 0.9, runnerUpIndex: 1, runnerUpSimilarity: 0.3, margin: 0.6, ...over });

    test('aligned: clearly about the topic, ahead of the runner-up, and a recommendation of the topic backs it', () => {
        const r = classify.classifyQuestion({ placement: placement(), support: supportOf(0.9), originalTopicIndex: 0, thresholds: T });
        expect(r).toMatchObject({ category: 'aligned', reasons: ['confirmed_filed_topic'], sameAsFiled: true });
    });

    test('aligned and moved: placed on a different topic from the one it was filed under', () => {
        const r = classify.classifyQuestion({ placement: placement({ similarity: 0.95 }), support: supportOf(0.9), originalTopicIndex: 2, thresholds: T });
        expect(r).toMatchObject({ category: 'aligned', reasons: ['moved_to_better_topic'], sameAsFiled: false });
    });

    test('a move needs more proof than staying: the same match that confirms a filed topic is unclear if it would move', () => {
        const borderline = placement({ similarity: 0.82, margin: 0.22 });
        expect(classify.classifyQuestion({ placement: borderline, support: supportOf(0.9), originalTopicIndex: 0, thresholds: T }).category).toBe('aligned');
        const moved = classify.classifyQuestion({ placement: borderline, support: supportOf(0.9), originalTopicIndex: 2, thresholds: T });
        expect(moved.category).toBe('unclear');
        expect(moved.reasons).toContain('weak_match_for_a_move');
    });

    test('unclear: a move with a close runner-up (the filing and the embedding disagree and nothing separates them)', () => {
        const r = classify.classifyQuestion({ placement: placement({ margin: 0.05, runnerUpSimilarity: 0.85 }), support: supportOf(0.9), originalTopicIndex: 2, thresholds: T });
        expect(r.category).toBe('unclear');
        expect(r.reasons).toContain('close_runner_up');
    });

    test('staying needs no margin: a close runner-up does not block a question the filing already agrees with', () => {
        const r = classify.classifyQuestion({ placement: placement({ margin: 0.01, runnerUpSimilarity: 0.89 }), support: supportOf(0.9), originalTopicIndex: 0, thresholds: T });
        expect(r).toMatchObject({ category: 'aligned', reasons: ['confirmed_filed_topic'] });
    });

    test('unclear: nothing in the topic\'s guidelines backs it, and the reason says how weak', () => {
        const weak = classify.classifyQuestion({ placement: placement(), support: supportOf(0.6), originalTopicIndex: 0, thresholds: T });
        expect(weak).toMatchObject({ category: 'unclear', reasons: ['weak_guideline_support'] });
        const none = classify.classifyQuestion({ placement: placement(), support: supportOf(0.3), originalTopicIndex: 0, thresholds: T });
        expect(none.reasons).toEqual(['no_guideline_support']);
        expect(classify.classifyQuestion({ placement: placement(), support: [], originalTopicIndex: 0, thresholds: T }).reasons).toEqual(['no_guideline_support']);
    });

    test('unassignable: not recognisably about any topic', () => {
        const r = classify.classifyQuestion({ placement: placement({ similarity: 0.3, margin: 0.05 }), support: [], originalTopicIndex: 0, thresholds: T });
        expect(r).toMatchObject({ category: 'unassignable', reasons: ['not_recognisably_about_a_topic'] });
        expect(classify.classifyQuestion({ placement: placement({ topicIndex: -1 }), support: [], thresholds: T }).category).toBe('unassignable');
    });
});

describe('support comes only from the recommendations that belong to the assigned topic', () => {
    test('a strong match among another topic\'s recommendations does not count', () => {
        const recVecs = [unit(1, 0, 0, 0), unit(0, 1, 0, 0), unit(0.9, 0.1, 0, 0)];
        const placements = classify.placeRecommendations(recVecs, TOPICS);
        const byTopic = classify.groupRecommendationsByTopic(placements, 0.5);
        const q = unit(0, 1, 0, 0); // about topic 1; recommendation 0 is its exact vector's opposite axis
        const support = classify.supportFor(q, 1, byTopic, recVecs, 3);
        expect(support.map((s) => s.recIndex)).toEqual([1]);
        expect(support[0].similarity).toBeCloseTo(1, 5);
    });
});

describe('reading stored questions', () => {
    const q = (over = {}) => ({ question: 'When should RRT start?', options: ['A: early', 'B: late', 'C: never', 'D: always'], correctAnswer: 'B', explanation: 'Late is fine.', ...over });

    test('the text a question is placed by is its stem, keyed answer and explanation, not the wrong options', () => {
        const text = service.questionText(q());
        expect(text).toContain('When should RRT start?');
        expect(text).toContain('late');
        expect(text).toContain('Late is fine.');
        expect(text).not.toContain('never');
    });

    test('the keyed answer is found whether it is a letter, an index or text', () => {
        expect(service.correctOptionText(q({ correctAnswer: 'A' }))).toBe('early');
        expect(service.correctOptionText(q({ correctAnswer: 2 }))).toBe('never');
        expect(service.correctOptionText(q({ correctAnswer: 'always' }))).toBe('always');
    });

    test('the same wording in two batches is one question, regardless of punctuation and case', () => {
        expect(service.questionHash(q())).toBe(service.questionHash(q({ question: 'when should rrt start' })));
        expect(service.questionHash(q())).not.toBe(service.questionHash(q({ question: 'When should dialysis stop?' })));
    });

    test('flattening reads each batch\'s questions with their position and filed topic', () => {
        const flat = service.flattenQuestions([
            { object_key: 'k1', object_type: 'guideline_mcq', normalized_topic: 'rrt timing', curriculum_topic_id: 7, object_payload: JSON.stringify({ mcqs: [q(), q({ question: 'Second?' })] }) },
            { object_key: 'k2', object_type: 'paper_mcq', normalized_topic: 'x', curriculum_topic_id: null, object_payload: 'not json' },
        ]);
        expect(flat.map((f) => [f.objectKey, f.questionIndex, f.originalCurriculumTopicId])).toEqual([['k1', 0, '7'], ['k1', 1, '7']]);
    });
});

describe('the whole pipeline, with fake embeddings', () => {
    // Text decides the vector: each word maps to an axis, so a question about "dialysis" lands on that topic.
    const AXES = { dialysis: 0, anticoagulation: 1, sepsis: 2 };
    const embed = async (texts) => texts.map((t) => {
        const v = [0, 0, 0, 0.01];
        for (const [word, axis] of Object.entries(AXES)) if (String(t).toLowerCase().includes(word)) v[axis] += 1;
        return unit(...v);
    });
    const topics = [
        { id: 'T-dialysis', display_name: 'Dialysis timing', suggested_query: 'dialysis', specialty: 'renal' },
        { id: 'T-anticoag', display_name: 'Anticoagulation', suggested_query: 'anticoagulation', specialty: 'cardiology' },
        { id: 'T-sepsis', display_name: 'Sepsis', suggested_query: 'sepsis', specialty: 'icu' },
    ];
    const recs = [
        { id: 'g1', normalized_topic: 'vte prophylaxis', source_body: 'NICE', recommendation_text: 'Offer anticoagulation to people having hip replacement surgery to prevent clots.' },
        { id: 'g2', normalized_topic: 'dialysis', source_body: 'KDIGO', recommendation_text: 'Do not start dialysis early in the absence of urgent indications in acute kidney injury.' },
    ];
    const question = (text, stem) => ({ question: stem, options: ['A: x', 'B: y'], correctAnswer: 'A', explanation: text });
    const batch = (key, topic, topicId, qs) => ({ object_key: key, object_type: 'guideline_mcq', normalized_topic: topic, curriculum_topic_id: topicId, object_payload: JSON.stringify({ mcqs: qs }) });

    test('a VTE question filed under dialysis moves to anticoagulation, a dialysis one stays, junk is unassignable', async () => {
        const sources = {
            questions: service.flattenQuestions([
                batch('b1', 'rrt timing', 'T-dialysis', [
                    question('Offer anticoagulation after hip replacement.', 'Which anticoagulation is advised after hip surgery?'),
                    question('Delay dialysis unless urgent indications develop.', 'When should dialysis start in AKI?'),
                    question('Nothing relevant here.', 'What colour is the sky?'),
                ]),
            ]),
            topics, recs, papers: [{ article_uid: 'pubmed-1', title: 'Anticoagulation after hip replacement', curriculum_topic_id: 'T-anticoag' }],
        };
        const built = await service.buildIndex({ sources, embed, thresholds: { ...T, alignedTopicSimilarity: 0.7, alignedSupport: 0.7, alignedMargin: 0.1 } });
        const [vte, dialysis, junk] = built.questions;
        expect(vte).toMatchObject({ category: 'aligned', assignedCurriculumTopicId: 'T-anticoag', sameAsFiled: false, originalCurriculumTopicId: 'T-dialysis' });
        expect(vte.evidenceGuidelineIds).toEqual(['g1']);
        expect(vte.evidencePaperUids).toEqual(['pubmed-1']);
        expect(dialysis).toMatchObject({ category: 'aligned', assignedCurriculumTopicId: 'T-dialysis', sameAsFiled: true });
        expect(dialysis.evidenceGuidelineIds).toEqual(['g2']);
        expect(junk.category).toBe('unassignable');
        expect(built.stats.alignedMovedToAnotherTopic).toBe(1);
        expect(built.stats.byCategory).toMatchObject({ aligned: 2, unassignable: 1 });
    });

    test('when the filed topic is nearly as good a match as the best one, the question stays where it was filed', async () => {
        // Two distinct subjects with a question between them that leans to the second (similarity ~0.61 vs ~0.79).
        const near = unit(1, 1.3, 0, 0.01);
        const embedNear = async (texts) => texts.map((t) => (String(t).includes('LEANING') ? near : (String(t).toLowerCase().includes('sepsis') ? unit(0, 1, 0, 0.01) : unit(1, 0, 0, 0.01))));
        const twoTopics = [
            { id: 'T-a', display_name: 'Dialysis timing', suggested_query: 'dialysis', specialty: 'renal' },
            { id: 'T-b', display_name: 'Sepsis', suggested_query: 'sepsis', specialty: 'icu' },
        ];
        const sources = {
            questions: service.flattenQuestions([batch('kb', 'dialysis', 'T-a', [question('LEANING stays.', 'A stem in between the two subjects?')])]),
            topics: twoTopics, recs: [], papers: [],
        };
        const kept = await service.buildIndex({ sources, embed: embedNear, thresholds: { ...T, keepFiledTolerance: 0.5, alignedSupport: 0, minSupport: 0, alignedTopicSimilarity: 0.5 } });
        expect(kept.questions[0]).toMatchObject({ assignedCurriculumTopicId: 'T-a', sameAsFiled: true });
        // With no tolerance the embedding wins and it would move (or be unclear), but never silently stay.
        const strict = await service.buildIndex({ sources, embed: embedNear, thresholds: { ...T, keepFiledTolerance: 0, alignedSupport: 0, minSupport: 0, alignedTopicSimilarity: 0.5 } });
        expect(strict.questions[0].assignedCurriculumTopicId).toBe('T-b');
    });

    test('a guideline recommendation is placed on the topic it is about, not the one it was filed under', async () => {
        const built = await service.buildIndex({ sources: { questions: [], topics, recs, papers: [] }, embed, thresholds: { ...T, alignedTopicSimilarity: 0.7, alignedMargin: 0.1 } });
        const g1 = built.guidelines.find((g) => g.guidelineId === 'g1');
        expect(g1).toMatchObject({ originalTopic: 'vte prophylaxis', assignedCurriculumTopicId: 'T-anticoag', category: 'aligned' });
    });

    test('the same question in two batches is embedded once but indexed in both places', async () => {
        const embedSpy = jest.fn(embed);
        const dup = question('Delay dialysis unless urgent.', 'When should dialysis start?');
        const sources = { questions: service.flattenQuestions([batch('a', 't', 'T-dialysis', [dup]), batch('b', 't', 'T-dialysis', [dup])]), topics, recs, papers: [] };
        const built = await service.buildIndex({ sources, embed: embedSpy, thresholds: T });
        expect(built.questions).toHaveLength(2);
        const embeddedQuestions = embedSpy.mock.calls.find((c) => c[1] === 'questions')?.[0] || embedSpy.mock.calls[2][0];
        expect(embeddedQuestions).toHaveLength(1);
    });
});

describe('writing the index', () => {
    function makeDb() {
        const sqlite = new Sqlite(':memory:');
        sqlite.exec(fs.readFileSync(path.join(__dirname, '../../database/migrations/109_question_topic_index.sql'), 'utf8'));
        return { sqlite, async run(sql, p = []) { return { changes: sqlite.prepare(sql).run(...p).changes }; } };
    }
    const built = () => ({
        questions: [{
            objectKey: 'k', questionIndex: 0, questionHash: 'h', objectType: 'guideline_mcq', originalTopic: 'a', originalCurriculumTopicId: '1',
            assignedCurriculumTopicId: '2', assignedTopicName: 'B', topicSimilarity: 0.9, runnerUpCurriculumTopicId: '3', runnerUpSimilarity: 0.4,
            guidelineSupport: 0.8, category: 'aligned', reasons: ['moved_to_better_topic'], evidenceGuidelineIds: ['g1'], evidencePaperUids: ['p1'],
        }],
        guidelines: [{ guidelineId: 'g1', originalTopic: 'a', assignedCurriculumTopicId: '2', assignedTopicName: 'B', topicSimilarity: 0.8, runnerUpSimilarity: 0.3, category: 'aligned' }],
    });

    test('rows are stored with their evidence links, and writing again replaces rather than duplicates', async () => {
        const db = makeDb();
        await service.writeIndex(db, built());
        const changed = built();
        changed.questions[0].category = 'unclear';
        await service.writeIndex(db, changed);
        const rows = db.sqlite.prepare('SELECT * FROM question_topic_index').all();
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ category: 'unclear', assigned_curriculum_topic_id: '2', classifier_version: service.CLASSIFIER_VERSION });
        expect(JSON.parse(rows[0].evidence_guideline_ids)).toEqual(['g1']);
        expect(db.sqlite.prepare('SELECT COUNT(*) n FROM guideline_topic_index').get().n).toBe(1);
    });
});
