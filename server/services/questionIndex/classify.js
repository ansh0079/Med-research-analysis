'use strict';

// The pure part of the question-to-topic index: given vectors, decide which topic each question and each
// guideline recommendation belongs to, and how sure that is. No database, no network, so the rules can
// be tested exactly and tuned from a dry run.
//
// One topic space for everything. Questions were generated from whatever guideline rows were filed under
// a topic, and those rows are often misfiled; so the filed topic is evidence, not an answer. Questions
// and recommendations are both placed by what they say, then a question is checked against the
// recommendations that belong to the topic it was placed in.
//
// Vectors are unit length, so a dot product is the cosine.

const DEFAULT_THRESHOLDS = Object.freeze({
    // Placing a question on a topic.
    minTopicSimilarity: 0.62,       // below this it is not recognisably about any topic: unassignable
    alignedTopicSimilarity: 0.64,   // a clear match to the topic
    alignedMargin: 0.05,            // a MOVE must also beat the best other subject by this much
    // Support from the topic's guideline recommendations.
    alignedSupport: 0.65,           // a recommendation of that topic says what the question asks
    minSupport: 0.55,               // below this no guideline of the topic supports it
    // The embedding and the filed topic are two independent signals. When they agree, or the filed topic is
    // within this much of the best match, the question stays where it was filed and needs no margin.
    keepFiledTolerance: 0.03,
    // A guideline recommendation's own placement margin (it has no filed-topic signal).
    guidelineMargin: 0.015,
    // A question that has to move needs more proof than one that stays.
    moveExtraSimilarity: 0.03,
    // Topics this close are one subject: margins and guideline support are measured across the cluster.
    clusterSimilarity: 0.85,
});

function dot(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i += 1) sum += a[i] * b[i];
    return sum;
}

/** Indices of the `k` highest scores, best first. Linear scan with a small sorted buffer. */
function topK(scores, k) {
    const best = [];
    for (let i = 0; i < scores.length; i += 1) {
        const s = scores[i];
        if (best.length < k || s > best[best.length - 1].score) {
            let pos = best.length;
            while (pos > 0 && best[pos - 1].score < s) pos -= 1;
            best.splice(pos, 0, { index: i, score: s });
            if (best.length > k) best.pop();
        }
    }
    return best;
}

/**
 * Group near-duplicate topics ("Trigeminal neuralgia" and "Trigeminal neuralgia: carbamazepine optimisation").
 * A topic joins the first earlier cluster whose seed it is at least `minSimilarity` close to. Returns the
 * cluster number of each topic. Without this a topic's twin is always the runner-up, so no match can ever
 * look clear, and the guideline rows are split between the twins.
 */
function clusterTopics(topicVecs, minSimilarity = DEFAULT_THRESHOLDS.clusterSimilarity) {
    const clusterOf = new Int32Array(topicVecs.length).fill(-1);
    const seeds = [];
    for (let i = 0; i < topicVecs.length; i += 1) {
        let joined = -1;
        for (let c = 0; c < seeds.length; c += 1) {
            if (dot(topicVecs[i], topicVecs[seeds[c]]) >= minSimilarity) { joined = c; break; }
        }
        if (joined < 0) { seeds.push(i); joined = seeds.length - 1; }
        clusterOf[i] = joined;
    }
    return clusterOf;
}

/**
 * For one vector: its best topic and the best topic in a DIFFERENT cluster (the real competitor).
 * With no `clusterOf` every topic is its own cluster.
 */
function placeOnTopic(vec, topicVecs, clusterOf = null) {
    const scores = new Float32Array(topicVecs.length);
    for (let t = 0; t < topicVecs.length; t += 1) scores[t] = dot(vec, topicVecs[t]);
    const [first] = topK(scores, 1);
    if (!first) return { topicIndex: -1, similarity: 0, runnerUpIndex: -1, runnerUpSimilarity: 0, margin: 0 };
    let runner = null;
    for (let t = 0; t < scores.length; t += 1) {
        if (t === first.index) continue;
        if (clusterOf && clusterOf[t] === clusterOf[first.index]) continue;
        if (!runner || scores[t] > runner.score) runner = { index: t, score: scores[t] };
    }
    return {
        topicIndex: first.index,
        similarity: first.score,
        runnerUpIndex: runner ? runner.index : -1,
        runnerUpSimilarity: runner ? runner.score : 0,
        margin: first.score - (runner ? runner.score : 0),
    };
}

/** Place every guideline recommendation on its best topic. */
function placeRecommendations(recVecs, topicVecs, clusterOf = null) {
    return recVecs.map((vec) => placeOnTopic(vec, topicVecs, clusterOf));
}

/**
 * The topic's recommendations that best support this question.
 * `recsByTopic[t]` is the list of recommendation indices placed on topic t.
 */
function supportFor(qVec, topicIndex, recsByTopic, recVecs, n = 3) {
    const recIndices = recsByTopic.get(topicIndex) || [];
    const scored = new Float32Array(recIndices.length);
    for (let i = 0; i < recIndices.length; i += 1) scored[i] = dot(qVec, recVecs[recIndices[i]]);
    return topK(scored, n).map((hit) => ({ recIndex: recIndices[hit.index], similarity: hit.score }));
}

/**
 * Decide one question.
 *   aligned       - recognisably about one topic, clearly ahead of the next, and supported by a guideline
 *                   recommendation of that topic
 *   unclear       - about a topic, but the match is close, or nothing of that topic's guidelines backs it
 *   unassignable  - not recognisably about any topic
 */
function classifyQuestion({ placement, support, originalTopicIndex = -1, thresholds = DEFAULT_THRESHOLDS }) {
    const t = thresholds;
    const reasons = [];
    const sameAsFiled = placement.topicIndex === originalTopicIndex;
    const bestSupport = support.length ? support[0].similarity : 0;

    if (placement.topicIndex < 0 || placement.similarity < t.minTopicSimilarity) {
        return { category: 'unassignable', reasons: ['not_recognisably_about_a_topic'], sameAsFiled, bestSupport };
    }

    // Moving a question off the topic it was filed under needs more proof than leaving it.
    const need = sameAsFiled ? 0 : t.moveExtraSimilarity;
    const clearMatch = placement.similarity >= t.alignedTopicSimilarity + need;
    // Staying needs no margin (the filing already agrees); moving needs a clear lead over the best other subject.
    const clearMargin = sameAsFiled || placement.margin >= t.alignedMargin + need / 2;
    const supported = bestSupport >= t.alignedSupport;

    if (!clearMatch) reasons.push(sameAsFiled ? 'weak_topic_match' : 'weak_match_for_a_move');
    if (!clearMargin) reasons.push('close_runner_up');
    if (!supported) reasons.push(bestSupport >= t.minSupport ? 'weak_guideline_support' : 'no_guideline_support');

    if (clearMatch && clearMargin && supported) {
        return { category: 'aligned', reasons: [sameAsFiled ? 'confirmed_filed_topic' : 'moved_to_better_topic'], sameAsFiled, bestSupport };
    }
    return { category: 'unclear', reasons, sameAsFiled, bestSupport };
}

/**
 * Group recommendation indices by the topic (or, with `clusterOf`, the topic cluster) they were placed on,
 * ignoring weak placements. Look a topic up with `clusterOf[topicIndex]` when grouping by cluster.
 */
function groupRecommendationsByTopic(recPlacements, minSimilarity = DEFAULT_THRESHOLDS.minTopicSimilarity, clusterOf = null) {
    const byTopic = new Map();
    recPlacements.forEach((p, i) => {
        if (p.topicIndex < 0 || p.similarity < minSimilarity) return;
        const key = clusterOf ? clusterOf[p.topicIndex] : p.topicIndex;
        if (!byTopic.has(key)) byTopic.set(key, []);
        byTopic.get(key).push(i);
    });
    return byTopic;
}

module.exports = {
    DEFAULT_THRESHOLDS,
    dot,
    topK,
    placeOnTopic,
    clusterTopics,
    placeRecommendations,
    supportFor,
    classifyQuestion,
    groupRecommendationsByTopic,
};
