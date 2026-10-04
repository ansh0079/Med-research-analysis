'use strict';

// Builds the question-to-topic index (migration 109): reads the stored questions, the curriculum topics,
// the guideline recommendations and the paper objects, places questions and recommendations in one topic
// space, and returns (and optionally writes) the result.
//
// SQL here is deliberately plain (no JSON operators): payloads are parsed in JS so the same code runs on
// SQLite in tests and Postgres in production.

const crypto = require('crypto');
const classify = require('./classify');

const CLASSIFIER_VERSION = 'embed-v2';
const MCQ_TYPES = ['guideline_mcq', 'cold_start_mcq', 'paper_mcq', 'live_quiz_mcq'];

const sha = (text) => crypto.createHash('sha256').update(String(text)).digest('hex');
const clean = (text) => String(text || '').replace(/\s+/g, ' ').trim();

function parsePayload(value) {
    if (value && typeof value === 'object') return value;
    try { return JSON.parse(value); } catch { return null; }
}

/** The option text for the keyed answer, whether the key is a letter, an index or the text itself. */
function correctOptionText(question) {
    const options = Array.isArray(question.options) ? question.options : [];
    const key = question.correctAnswer ?? question.correct;
    let option = null;
    if (typeof key === 'number') option = options[key];
    else if (typeof key === 'string' && /^[A-Da-d]$/.test(key.trim())) option = options[key.trim().toUpperCase().charCodeAt(0) - 65];
    else if (typeof key === 'string') option = key;
    return clean(String(option || '').replace(/^[A-D]\s*[:.)]\s*/i, ''));
}

/** What a question is about: stem, keyed answer and explanation. Wrong options add noise, so they are left out. */
function questionText(question) {
    return clean(`${question.question || ''} ${correctOptionText(question)} ${question.explanation || ''}`).slice(0, 1500);
}

/** Stable identity for a question's wording, so the same question in two batches is one thing. */
function questionHash(question) {
    return sha(clean(question.question).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()).slice(0, 24);
}

/** One entry per question inside the stored batches. */
function flattenQuestions(objects) {
    const out = [];
    for (const object of objects) {
        const payload = parsePayload(object.object_payload);
        const mcqs = Array.isArray(payload?.mcqs) ? payload.mcqs : [];
        mcqs.forEach((question, index) => {
            if (!question?.question) return;
            out.push({
                objectKey: object.object_key,
                objectType: object.object_type,
                questionIndex: index,
                originalTopic: object.normalized_topic || null,
                originalCurriculumTopicId: object.curriculum_topic_id == null ? null : String(object.curriculum_topic_id),
                hash: questionHash(question),
                text: questionText(question),
                stem: clean(question.question).slice(0, 300),
            });
        });
    }
    return out;
}

function topicText(topic) {
    return clean(`${topic.display_name}. ${topic.suggested_query || ''}. ${topic.specialty || ''}`).slice(0, 400);
}

function recommendationText(rec) {
    return clean(`${rec.source_body || ''}. ${rec.recommendation_text || ''}`).slice(0, 800);
}

/** Choose one stable display topic for every semantic cluster. Prefer a concise
 * descriptive clinical name over an acronym or a longer task-specific duplicate. */
function canonicalTopicIndex(indices, topics) {
    const acronym = (name) => {
        const compact = String(name || '').replace(/[^A-Za-z]/g, '');
        return compact.length >= 2 && compact.length <= 8 && compact === compact.toUpperCase();
    };
    return [...indices].sort((a, b) => {
        const left = String(topics[a]?.display_name || '').trim();
        const right = String(topics[b]?.display_name || '').trim();
        const acronymDifference = Number(acronym(left)) - Number(acronym(right));
        if (acronymDifference) return acronymDifference;
        const wordDifference = left.split(/\s+/).length - right.split(/\s+/).length;
        if (wordDifference) return wordDifference;
        const lengthDifference = left.length - right.length;
        return lengthDifference || left.localeCompare(right);
    })[0];
}

async function loadSources(db) {
    const placeholders = MCQ_TYPES.map(() => '?').join(',');
    const [objects, topics, recs, papers] = await Promise.all([
        db.all(`SELECT object_key, object_type, normalized_topic, curriculum_topic_id, object_payload FROM teaching_objects WHERE object_type IN (${placeholders})`, MCQ_TYPES),
        db.all('SELECT id, display_name, suggested_query, specialty FROM curriculum_topics', []),
        db.all('SELECT id, normalized_topic, source_body, recommendation_text FROM topic_guidelines WHERE superseded_by_id IS NULL', []),
        db.all("SELECT article_uid, title, curriculum_topic_id FROM teaching_objects WHERE object_type = 'paper' AND article_uid IS NOT NULL AND title IS NOT NULL AND curriculum_topic_id IS NOT NULL", []),
    ]);
    return {
        questions: flattenQuestions(objects),
        topics: topics.map((t) => ({ ...t, id: String(t.id) })),
        recs: recs.filter((r) => clean(r.recommendation_text).length >= 30),
        papers: papers.map((p) => ({ ...p, curriculum_topic_id: String(p.curriculum_topic_id) })),
    };
}

/**
 * Run the whole placement. `embed(texts, label)` returns one unit vector per text.
 * Returns { questions, guidelines, stats } with one result per question and per recommendation.
 */
async function buildIndex({ sources, embed, thresholds = classify.DEFAULT_THRESHOLDS, onStage = () => {} }) {
    const { questions, topics, recs, papers } = sources;

    onStage('topics', topics.length);
    const topicVecs = await embed(topics.map(topicText), 'topics');
    onStage('guidelines', recs.length);
    const recVecs = await embed(recs.map(recommendationText), 'guidelines');
    onStage('questions', questions.length);
    // The same question in several batches is embedded once.
    const uniqueByHash = new Map();
    for (const q of questions) if (!uniqueByHash.has(q.hash)) uniqueByHash.set(q.hash, q.text);
    const hashes = [...uniqueByHash.keys()];
    const qVecList = await embed(hashes.map((h) => uniqueByHash.get(h)), 'questions');
    const qVecByHash = new Map(hashes.map((h, i) => [h, qVecList[i]]));
    onStage('papers', papers.length);
    const paperVecs = await embed(papers.map((p) => clean(p.title).slice(0, 300)), 'papers');

    // Near-duplicate topics are one subject: margins and guideline support are measured across the cluster.
    const clusterOf = classify.clusterTopics(topicVecs, thresholds.clusterSimilarity);
    const membersByCluster = new Map();
    topics.forEach((_, i) => {
        if (!membersByCluster.has(clusterOf[i])) membersByCluster.set(clusterOf[i], []);
        membersByCluster.get(clusterOf[i]).push(i);
    });
    const canonicalIndexByCluster = new Map([...membersByCluster].map(([cluster, indices]) => [cluster, canonicalTopicIndex(indices, topics)]));
    const canonicalIndexOfTopic = (i) => canonicalIndexByCluster.get(clusterOf[i]);
    const clusterIdOfTopic = (i) => topics[canonicalIndexOfTopic(i)].id;
    const recPlacements = classify.placeRecommendations(recVecs, topicVecs, clusterOf);
    const recsByCluster = classify.groupRecommendationsByTopic(recPlacements, thresholds.minTopicSimilarity, clusterOf);
    const topicIndexById = new Map(topics.map((t, i) => [t.id, i]));
    const papersByCluster = new Map();
    papers.forEach((p, i) => {
        const t = topicIndexById.get(p.curriculum_topic_id);
        if (t === undefined) return;
        if (!papersByCluster.has(clusterOf[t])) papersByCluster.set(clusterOf[t], []);
        papersByCluster.get(clusterOf[t]).push(i);
    });

    const guidelines = recs.map((rec, i) => {
        const p = recPlacements[i];
        const assigned = p.topicIndex >= 0 && p.similarity >= thresholds.minTopicSimilarity;
        return {
            guidelineId: String(rec.id),
            originalTopic: rec.normalized_topic || null,
            assignedCurriculumTopicId: assigned ? topics[canonicalIndexOfTopic(p.topicIndex)].id : null,
            assignedTopicName: assigned ? topics[canonicalIndexOfTopic(p.topicIndex)].display_name : null,
            assignedClusterId: assigned ? clusterIdOfTopic(p.topicIndex) : null,
            topicSimilarity: p.similarity,
            runnerUpSimilarity: p.runnerUpSimilarity,
            // A recommendation has no second signal (it is filed under free text, not a topic), so it needs a margin.
            category: !assigned ? 'unassignable' : (p.similarity >= thresholds.alignedTopicSimilarity && p.margin >= thresholds.guidelineMargin ? 'aligned' : 'unclear'),
        };
    });

    const results = questions.map((q) => {
        const vec = qVecByHash.get(q.hash);
        let placement = classify.placeOnTopic(vec, topicVecs, clusterOf);
        let originalTopicIndex = q.originalCurriculumTopicId == null ? -1 : (topicIndexById.get(q.originalCurriculumTopicId) ?? -1);
        if (originalTopicIndex >= 0 && placement.topicIndex >= 0 && originalTopicIndex !== placement.topicIndex) {
            if (clusterOf[originalTopicIndex] === clusterOf[placement.topicIndex]) {
                // Filed under a twin of the topic it was placed on: that is staying, not moving.
                originalTopicIndex = placement.topicIndex;
            } else {
                // The embedding and the filing are two independent signals. If the filed topic is nearly as good a
                // match as the best one, they agree closely enough: keep the question where it was filed.
                const filedSimilarity = classify.dot(vec, topicVecs[originalTopicIndex]);
                if (placement.similarity - filedSimilarity <= thresholds.keepFiledTolerance) {
                    placement = {
                        topicIndex: originalTopicIndex,
                        similarity: filedSimilarity,
                        runnerUpIndex: placement.topicIndex,
                        runnerUpSimilarity: placement.similarity,
                        margin: filedSimilarity - placement.similarity,
                    };
                }
            }
        }
        let paperLinks = [];
        let paperSupport = 0;
        if (placement.topicIndex >= 0) {
            const candidates = papersByCluster.get(clusterOf[placement.topicIndex]) || [];
            const scored = new Float32Array(candidates.length);
            for (let i = 0; i < candidates.length; i += 1) scored[i] = classify.dot(vec, paperVecs[candidates[i]]);
            const hits = classify.topK(scored, 3);
            paperSupport = hits[0]?.score || 0;
            paperLinks = hits.filter((hit) => hit.score >= thresholds.minPaperSupport).map((hit) => papers[candidates[hit.index]].article_uid);
        }
        const support = placement.topicIndex >= 0 ? classify.supportFor(vec, clusterOf[placement.topicIndex], recsByCluster, recVecs, 3) : [];
        const decision = classify.classifyQuestion({ placement, support, paperSupport, originalTopicIndex, thresholds });
        const assigned = placement.topicIndex >= 0 && placement.similarity >= thresholds.minTopicSimilarity;
        // Dual-link close-call unclear questions that have adequate evidence support.
        let dual = null;
        if (
            decision.category === 'unclear'
            && placement.topicIndex >= 0
            && placement.runnerUpIndex >= 0
            && (placement.margin <= (thresholds.dualLinkMargin || thresholds.alignedMargin || 0.05))
            && (decision.evidenceSupport !== 'none')
        ) {
            const primaryCluster = clusterOf[placement.topicIndex];
            const secondaryCluster = clusterOf[placement.runnerUpIndex];
            const supportPrimary = support.length ? support[0].similarity : 0;
            const supportSecondaryList = classify.supportFor(vec, secondaryCluster, recsByCluster, recVecs, 3);
            const supportSecondary = supportSecondaryList.length ? supportSecondaryList[0].similarity : 0;
            // Pick the better-supported topic as primary; tie-break on similarity.
            const preferRunnerUp =
                (supportSecondary > supportPrimary + 1e-6)
                || (Math.abs(supportSecondary - supportPrimary) <= 1e-6 && placement.runnerUpSimilarity > placement.similarity);
            const primaryIndex = preferRunnerUp ? placement.runnerUpIndex : placement.topicIndex;
            const secondaryIndex = preferRunnerUp ? placement.topicIndex : placement.runnerUpIndex;
            const primarySim = preferRunnerUp ? placement.runnerUpSimilarity : placement.similarity;
            const secondarySim = preferRunnerUp ? placement.similarity : placement.runnerUpSimilarity;
            const primarySupp = preferRunnerUp ? supportSecondary : supportPrimary;
            const secondarySupp = preferRunnerUp ? supportPrimary : supportSecondary;
            dual = {
                assignedCurriculumTopicId: topics[canonicalIndexOfTopic(primaryIndex)].id,
                assignedTopicName: topics[canonicalIndexOfTopic(primaryIndex)].display_name,
                assignedClusterId: clusterIdOfTopic(primaryIndex),
                topicSimilarity: primarySim,
                runnerUpCurriculumTopicId: topics[secondaryIndex].id,
                runnerUpSimilarity: secondarySim,
                guidelineSupport: primarySupp,
                secondaryCurriculumTopicId: topics[secondaryIndex].id,
                secondaryTopicName: topics[secondaryIndex].display_name,
                secondaryClusterId: clusterIdOfTopic(secondaryIndex),
                secondaryGuidelineSupport: secondarySupp,
                category: 'dual_linked',
                topicCategory: 'aligned',
                evidenceSupport: decision.evidenceSupport,
                dualLinkReason: 'close_runner_up',
            };
        }
        const base = {
            objectKey: q.objectKey,
            questionIndex: q.questionIndex,
            questionHash: q.hash,
            objectType: q.objectType,
            stem: q.stem,
            originalTopic: q.originalTopic,
            originalCurriculumTopicId: q.originalCurriculumTopicId,
            assignedCurriculumTopicId: assigned ? topics[canonicalIndexOfTopic(placement.topicIndex)].id : null,
            assignedTopicName: assigned ? topics[canonicalIndexOfTopic(placement.topicIndex)].display_name : null,
            assignedClusterId: assigned ? clusterIdOfTopic(placement.topicIndex) : null,
            topicSimilarity: placement.similarity,
            runnerUpCurriculumTopicId: placement.runnerUpIndex >= 0 ? topics[placement.runnerUpIndex].id : null,
            runnerUpSimilarity: placement.runnerUpSimilarity,
            guidelineSupport: decision.bestSupport,
            paperSupport: decision.paperSupport,
            topicCategory: decision.topicCategory,
            evidenceSupport: decision.evidenceSupport,
            category: decision.category,
            reasons: decision.reasons,
            sameAsFiled: decision.sameAsFiled,
            evidenceGuidelineIds: decision.bestSupport >= thresholds.minSupport ? support.map((s) => String(recs[s.recIndex].id)) : [],
            evidencePaperUids: decision.paperSupport >= thresholds.minPaperSupport ? paperLinks : [],
        };
        if (dual) {
            return {
                ...base,
                assignedCurriculumTopicId: dual.assignedCurriculumTopicId,
                assignedTopicName: dual.assignedTopicName,
                assignedClusterId: dual.assignedClusterId,
                topicSimilarity: dual.topicSimilarity,
                runnerUpCurriculumTopicId: dual.runnerUpCurriculumTopicId,
                runnerUpSimilarity: dual.runnerUpSimilarity,
                guidelineSupport: dual.guidelineSupport,
                topicCategory: dual.topicCategory,
                evidenceSupport: dual.evidenceSupport,
                category: dual.category,
                reasons: [...new Set([...(base.reasons || []), 'dual_link_close_call'])],
                secondaryCurriculumTopicId: dual.secondaryCurriculumTopicId,
                secondaryTopicName: dual.secondaryTopicName,
                secondaryClusterId: dual.secondaryClusterId,
                secondarySimilarity: dual.secondarySimilarity,
                secondaryGuidelineSupport: dual.secondaryGuidelineSupport,
                dualLinkReason: dual.dualLinkReason,
            };
        }
        return base;
    });

    const stats = summarise(results, guidelines);
    stats.topicPairBands = sampleTopicPairs(topics, topicVecs);
    stats.topics = topics.length;
    stats.topicClusters = new Set(clusterOf).size;
    stats.reasons = results.reduce((acc, q) => { for (const r of q.reasons) acc[r] = (acc[r] || 0) + 1; return acc; }, {});
    const topicClusters = topics.map((t, i) => ({ curriculumTopicId: t.id, clusterId: clusterIdOfTopic(i) }));
    return { questions: results, guidelines, topicClusters, stats };
}

/** Each topic's nearest other topic, sampled by similarity band, so the clustering threshold can be judged by reading pairs. */
function sampleTopicPairs(topics, topicVecs, perBand = 6) {
    const bands = [[0.80, 0.84], [0.84, 0.88], [0.88, 0.92], [0.92, 1.01]];
    const out = Object.fromEntries(bands.map(([lo, hi]) => [`${lo}-${hi}`, { count: 0, pairs: [] }]));
    for (let i = 0; i < topicVecs.length; i += 1) {
        let best = -1;
        let bestSim = -1;
        for (let j = 0; j < topicVecs.length; j += 1) {
            if (j === i) continue;
            const s = classify.dot(topicVecs[i], topicVecs[j]);
            if (s > bestSim) { bestSim = s; best = j; }
        }
        for (const [lo, hi] of bands) {
            if (bestSim >= lo && bestSim < hi) {
                const slot = out[`${lo}-${hi}`];
                slot.count += 1;
                if (slot.count % 7 === 1 && slot.pairs.length < perBand) slot.pairs.push([topics[i].display_name, topics[best].display_name, Number(bestSim.toFixed(3))]);
            }
        }
    }
    return out;
}

function count(list, key) {
    const out = {};
    for (const item of list) out[item[key]] = (out[item[key]] || 0) + 1;
    return out;
}

function summarise(questions, guidelines) {
    const aligned = questions.filter((q) => q.category === 'aligned');
    return {
        questions: questions.length,
        byCategory: count(questions, 'category'),
        byType: Object.fromEntries(Object.entries(questions.reduce((acc, q) => {
            acc[q.objectType] = acc[q.objectType] || {};
            acc[q.objectType][q.category] = (acc[q.objectType][q.category] || 0) + 1;
            return acc;
        }, {}))),
        alignedStayedOnFiledTopic: aligned.filter((q) => q.sameAsFiled).length,
        alignedMovedToAnotherTopic: aligned.filter((q) => !q.sameAsFiled).length,
        topicsWithAlignedQuestions: new Set(aligned.map((q) => q.assignedCurriculumTopicId)).size,
        guidelines: guidelines.length,
        guidelinesByCategory: count(guidelines, 'category'),
        guidelinesMovedFromFiledTopic: guidelines.filter((g) => g.category !== 'unassignable' && g.originalTopic).length,
    };
}

/** Replace the index with `built`. Idempotent: rows are keyed by (object, question position). */
async function writeIndex(db, built, { now = new Date().toISOString() } = {}) {
    const upsertQuestion = `INSERT INTO question_topic_index (
            object_key, question_index, question_hash, object_type, original_topic, original_curriculum_topic_id,
            assigned_curriculum_topic_id, assigned_topic_name, assigned_cluster_id, topic_similarity, runner_up_curriculum_topic_id,
            runner_up_similarity, guideline_support, paper_support, topic_category, evidence_support, category, reasons,
            evidence_guideline_ids, evidence_paper_uids, secondary_curriculum_topic_id, secondary_topic_name, secondary_cluster_id,
            secondary_similarity, secondary_guideline_support, dual_link_reason,
            classifier_version, classified_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (object_key, question_index) DO UPDATE SET
            question_hash = excluded.question_hash, object_type = excluded.object_type,
            original_topic = excluded.original_topic, original_curriculum_topic_id = excluded.original_curriculum_topic_id,
            assigned_curriculum_topic_id = excluded.assigned_curriculum_topic_id, assigned_topic_name = excluded.assigned_topic_name,
            assigned_cluster_id = excluded.assigned_cluster_id,
            topic_similarity = excluded.topic_similarity, runner_up_curriculum_topic_id = excluded.runner_up_curriculum_topic_id,
            runner_up_similarity = excluded.runner_up_similarity, guideline_support = excluded.guideline_support,
            paper_support = excluded.paper_support, topic_category = excluded.topic_category,
            evidence_support = excluded.evidence_support,
            category = excluded.category, reasons = excluded.reasons, evidence_guideline_ids = excluded.evidence_guideline_ids,
            evidence_paper_uids = excluded.evidence_paper_uids,
            secondary_curriculum_topic_id = excluded.secondary_curriculum_topic_id,
            secondary_topic_name = excluded.secondary_topic_name,
            secondary_cluster_id = excluded.secondary_cluster_id,
            secondary_similarity = excluded.secondary_similarity,
            secondary_guideline_support = excluded.secondary_guideline_support,
            dual_link_reason = excluded.dual_link_reason,
            classifier_version = excluded.classifier_version,
            classified_at = excluded.classified_at`;
    for (const q of built.questions) {
        await db.run(upsertQuestion, [
            q.objectKey, q.questionIndex, q.questionHash, q.objectType, q.originalTopic, q.originalCurriculumTopicId,
            q.assignedCurriculumTopicId, q.assignedTopicName, q.assignedClusterId, q.topicSimilarity, q.runnerUpCurriculumTopicId,
            q.runnerUpSimilarity, q.guidelineSupport, q.paperSupport, q.topicCategory, q.evidenceSupport, q.category, JSON.stringify(q.reasons || []),
            JSON.stringify(q.evidenceGuidelineIds || []), JSON.stringify(q.evidencePaperUids || []),
            q.secondaryCurriculumTopicId || null, q.secondaryTopicName || null, q.secondaryClusterId || null,
            q.secondarySimilarity || null, q.secondaryGuidelineSupport || null, q.dualLinkReason || null,
            CLASSIFIER_VERSION, now,
        ]);
    }
    const upsertGuideline = `INSERT INTO guideline_topic_index (
            guideline_id, original_topic, assigned_curriculum_topic_id, assigned_topic_name, assigned_cluster_id, topic_similarity,
            runner_up_similarity, category, classifier_version, classified_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (guideline_id) DO UPDATE SET
            original_topic = excluded.original_topic, assigned_curriculum_topic_id = excluded.assigned_curriculum_topic_id,
            assigned_topic_name = excluded.assigned_topic_name, assigned_cluster_id = excluded.assigned_cluster_id,
            topic_similarity = excluded.topic_similarity,
            runner_up_similarity = excluded.runner_up_similarity, category = excluded.category,
            classifier_version = excluded.classifier_version, classified_at = excluded.classified_at`;
    for (const g of built.guidelines) {
        await db.run(upsertGuideline, [
            g.guidelineId, g.originalTopic, g.assignedCurriculumTopicId, g.assignedTopicName, g.assignedClusterId, g.topicSimilarity,
            g.runnerUpSimilarity, g.category, CLASSIFIER_VERSION, now,
        ]);
    }
    for (const c of built.topicClusters || []) {
        await db.run(
            `INSERT INTO topic_cluster_index (curriculum_topic_id, cluster_id, classifier_version, classified_at) VALUES (?, ?, ?, ?)
             ON CONFLICT (curriculum_topic_id) DO UPDATE SET cluster_id = excluded.cluster_id, classifier_version = excluded.classifier_version, classified_at = excluded.classified_at`,
            [c.curriculumTopicId, c.clusterId, CLASSIFIER_VERSION, now],
        );
    }
    await db.run('UPDATE question_index_dirty SET processed_at = ? WHERE processed_at IS NULL', [now]).catch(() => null);
    return { questions: built.questions.length, guidelines: built.guidelines.length, topics: (built.topicClusters || []).length };
}

module.exports = {
    CLASSIFIER_VERSION,
    MCQ_TYPES,
    questionText,
    questionHash,
    correctOptionText,
    flattenQuestions,
    loadSources,
    buildIndex,
    writeIndex,
    summarise,
    canonicalTopicIndex,
};
