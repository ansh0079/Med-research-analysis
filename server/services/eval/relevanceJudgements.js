'use strict';

/**
 * The clinician feedback loop: relevance judgements in, held-out evaluation cases out.
 *
 * Every ranking change so far has been unmeasurable, because measuring one needs labels and no
 * labels existed. This module is the path from a clinician's verdict on a real result to a fixture
 * the release gate can read. It enforces the rules that make those labels worth having:
 *
 *  - The person who tuned the ranker may not label its output. A tuner's judgement is recorded with
 *    role 'tuner' and never graduates.
 *  - A scenario graduates only when enough candidates are judged AND every disagreement between
 *    reviewers has been adjudicated. A half-labelled scenario is not a weaker measurement, it is a
 *    biased one, because the unjudged candidates are the ones nobody found.
 *  - A query that appears in a tuning fixture cannot become a held-out case (leakage).
 *  - Inter-rater agreement travels with the export, so a set nobody agrees on cannot be quoted as
 *    evidence that ranking improved.
 *
 * Nothing here writes into the fixture directory on its own: `buildHeldoutFixture` returns the
 * document, and a human decides to commit it.
 */

const logger = require('../../config/logger');
const { isHeldoutLeakage } = require('../evalDatasetPolicy');

const LABELS = Object.freeze(['on_topic', 'adjacent', 'off_topic']);

/** A scenario is measurable once this many of its candidates carry a final label. */
const MIN_CANDIDATES_PER_SCENARIO = 3;
/** Below this, "we agree" is an accident of a small sample rather than a finding. */
const MIN_PAIRS_FOR_AGREEMENT = 10;

class JudgementRejected extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = 'JudgementRejected';
        this.code = code;
        this.details = details;
    }
}

function normalizeQuery(query) {
    return String(query || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function round(value, places = 4) {
    const f = 10 ** places;
    return Math.round(value * f) / f;
}

/* ─────────────────────────────── recording ─────────────────────────────── */

/**
 * Record one reviewer's verdict on one candidate. Re-judging the same candidate replaces that
 * reviewer's own row and leaves every other reviewer's untouched.
 */
async function recordJudgement(db, {
    query,
    articleUid,
    label,
    reviewerId,
    reviewerRole = 'clinician',
    reason = null,
    scenarioId = null,
    intendedSense = null,
    articleTitle = null,
    searchId = null,
    servedRank = null,
    lane = null,
} = {}) {
    const queryText = String(query || '').trim();
    const queryKey = normalizeQuery(queryText);
    const uid = String(articleUid || '').trim();
    const reviewer = String(reviewerId || '').trim();
    if (!queryKey) throw new JudgementRejected('query is required', 'query_required');
    if (!uid) throw new JudgementRejected('articleUid is required', 'article_required');
    if (!reviewer) throw new JudgementRejected('reviewerId is required', 'reviewer_required');
    if (!LABELS.includes(label)) {
        throw new JudgementRejected(`label must be one of ${LABELS.join(', ')}`, 'label_invalid', { label });
    }

    await db.run(
        `INSERT INTO relevance_judgements
            (query_key, query_text, scenario_id, intended_sense, article_uid, article_title,
             label, reason, reviewer_id, reviewer_role, search_id, served_rank, lane, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT (query_key, article_uid, reviewer_id) DO UPDATE SET
            label = excluded.label,
            reason = excluded.reason,
            reviewer_role = excluded.reviewer_role,
            scenario_id = COALESCE(excluded.scenario_id, relevance_judgements.scenario_id),
            intended_sense = COALESCE(excluded.intended_sense, relevance_judgements.intended_sense),
            article_title = COALESCE(excluded.article_title, relevance_judgements.article_title),
            updated_at = CURRENT_TIMESTAMP`,
        [queryKey, queryText, scenarioId, intendedSense, uid, articleTitle,
            label, reason, reviewer, reviewerRole, searchId, servedRank, lane],
    );
    return { queryKey, articleUid: uid, label, reviewerId: reviewer };
}

/** Record the deciding verdict on a candidate two reviewers judged differently. */
async function adjudicate(db, { query, articleUid, finalLabel, adjudicatorId, rationale = null } = {}) {
    const queryKey = normalizeQuery(query);
    const uid = String(articleUid || '').trim();
    const adjudicator = String(adjudicatorId || '').trim();
    if (!queryKey || !uid) throw new JudgementRejected('query and articleUid are required', 'target_required');
    if (!adjudicator) throw new JudgementRejected('adjudicatorId is required', 'adjudicator_required');
    if (!LABELS.includes(finalLabel)) {
        throw new JudgementRejected(`finalLabel must be one of ${LABELS.join(', ')}`, 'label_invalid', { finalLabel });
    }
    await db.run(
        `INSERT INTO relevance_adjudications (query_key, article_uid, final_label, rationale, adjudicator_id)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (query_key, article_uid) DO UPDATE SET
            final_label = excluded.final_label,
            rationale = excluded.rationale,
            adjudicator_id = excluded.adjudicator_id,
            created_at = CURRENT_TIMESTAMP`,
        [queryKey, uid, finalLabel, rationale, adjudicator],
    );
    return { queryKey, articleUid: uid, finalLabel };
}

/* ─────────────────────────────── resolution ─────────────────────────────── */

/**
 * Resolve one candidate's votes into a final label.
 *
 * A tuner's vote is excluded before anything else: it cannot decide, and it cannot create a
 * disagreement either, or a tuner could force any candidate into adjudication.
 */
function resolveCandidate(votes, adjudication) {
    const eligible = votes.filter((v) => v.reviewerRole !== 'tuner');
    const distinct = new Set(eligible.map((v) => v.label));
    if (adjudication) {
        return { label: adjudication.finalLabel, state: 'adjudicated', reviewers: eligible.length, disagreed: distinct.size > 1 };
    }
    if (!eligible.length) return { label: null, state: 'unjudged', reviewers: 0, disagreed: false };
    if (distinct.size > 1) return { label: null, state: 'disagreed', reviewers: eligible.length, disagreed: true };
    return { label: eligible[0].label, state: eligible.length >= 2 ? 'agreed' : 'single_reviewer', reviewers: eligible.length, disagreed: false };
}

/** Cohen's kappa over candidates two eligible reviewers both judged. */
function interRaterAgreement(candidates) {
    const pairs = [];
    for (const candidate of candidates) {
        const eligible = candidate.votes.filter((v) => v.reviewerRole !== 'tuner');
        if (eligible.length >= 2) pairs.push([eligible[0].label, eligible[1].label]);
    }
    const n = pairs.length;
    if (!n) return { pairs: 0, observedAgreement: null, kappa: null, reportable: false };
    const observed = pairs.filter(([a, b]) => a === b).length / n;
    let expected = 0;
    for (const label of LABELS) {
        const pa = pairs.filter(([a]) => a === label).length / n;
        const pb = pairs.filter(([, b]) => b === label).length / n;
        expected += pa * pb;
    }
    const kappa = expected >= 1 ? 1 : (observed - expected) / (1 - expected);
    return {
        pairs: n,
        observedAgreement: round(observed),
        kappa: round(kappa),
        reportable: n >= MIN_PAIRS_FOR_AGREEMENT,
    };
}

/** Every judged scenario with its candidates resolved: the state of the labelling effort. */
async function scenarioStatus(db, { queryKey = null } = {}) {
    const params = [];
    let where = '';
    if (queryKey) { where = 'WHERE query_key = ?'; params.push(normalizeQuery(queryKey)); }
    const rows = await db.all(
        `SELECT query_key, query_text, scenario_id, intended_sense, article_uid, article_title,
                label, reason, reviewer_id, reviewer_role, served_rank, lane
         FROM relevance_judgements ${where} ORDER BY query_key, article_uid, created_at`,
        params,
    );
    const adjRows = await db.all(
        `SELECT query_key, article_uid, final_label, rationale, adjudicator_id
         FROM relevance_adjudications ${where}`,
        params,
    );
    const adjudications = new Map(adjRows.map((r) => [`${r.query_key} ${r.article_uid}`, {
        finalLabel: r.final_label, rationale: r.rationale, adjudicatorId: r.adjudicator_id,
    }]));

    const scenarios = new Map();
    for (const row of rows) {
        if (!scenarios.has(row.query_key)) {
            scenarios.set(row.query_key, {
                queryKey: row.query_key,
                query: row.query_text,
                scenarioId: row.scenario_id || null,
                intendedSense: row.intended_sense || null,
                candidates: new Map(),
                reviewers: new Set(),
            });
        }
        const scenario = scenarios.get(row.query_key);
        if (!scenario.scenarioId && row.scenario_id) scenario.scenarioId = row.scenario_id;
        if (!scenario.intendedSense && row.intended_sense) scenario.intendedSense = row.intended_sense;
        if (!scenario.candidates.has(row.article_uid)) {
            scenario.candidates.set(row.article_uid, {
                articleUid: row.article_uid, title: row.article_title || null,
                servedRank: row.served_rank ?? null, lane: row.lane || null, votes: [],
            });
        }
        scenario.candidates.get(row.article_uid).votes.push({
            label: row.label, reviewerId: row.reviewer_id, reviewerRole: row.reviewer_role, reason: row.reason,
        });
        if (row.reviewer_role !== 'tuner') scenario.reviewers.add(row.reviewer_id);
    }

    return [...scenarios.values()].map((scenario) => {
        const candidates = [...scenario.candidates.values()].map((candidate) => ({
            ...candidate,
            ...resolveCandidate(candidate.votes, adjudications.get(`${scenario.queryKey} ${candidate.articleUid}`)),
        }));
        const resolved = candidates.filter((c) => c.label);
        const unresolved = candidates.filter((c) => !c.label);
        const blockers = [];
        if (resolved.length < MIN_CANDIDATES_PER_SCENARIO) {
            blockers.push(`needs ${MIN_CANDIDATES_PER_SCENARIO} resolved candidates, has ${resolved.length}`);
        }
        if (unresolved.some((c) => c.state === 'disagreed')) blockers.push('unadjudicated disagreement');
        if (scenario.reviewers.size < 2) blockers.push('needs a second reviewer');
        if (!scenario.intendedSense) blockers.push('intendedSense not recorded');
        return {
            queryKey: scenario.queryKey,
            query: scenario.query,
            scenarioId: scenario.scenarioId,
            intendedSense: scenario.intendedSense,
            reviewers: [...scenario.reviewers],
            candidates,
            agreement: interRaterAgreement(candidates),
            graduatable: blockers.length === 0,
            blockers,
        };
    });
}

/* ─────────────────────────────── review queue ─────────────────────────────── */

/**
 * What a reviewer is shown: real results from real searches, not a synthetic list.
 *
 * Candidates come from the evidence snapshots, because those hold exactly the articles that were
 * served, in the order they were served, with the text as it was at the time. Labelling anything
 * else would judge a page the user never saw. Already-judged candidates drop out, so the queue
 * empties as the work is done rather than repeating.
 */
async function pendingCandidates(db, { reviewerId = null, limit = 25, perQuery = 5 } = {}) {
    const snapshots = await db.all(
        `SELECT id, query_text, evidence_items, created_at
         FROM search_evidence_snapshots
         WHERE query_redacted_at IS NULL
         ORDER BY created_at DESC
         LIMIT ?`,
        [Math.max(1, Math.min(200, Number(limit) * 4))],
    );
    const judged = new Set(
        (await db.all(
            reviewerId
                ? 'SELECT query_key, article_uid FROM relevance_judgements WHERE reviewer_id = ?'
                : 'SELECT query_key, article_uid FROM relevance_judgements',
            reviewerId ? [reviewerId] : [],
        )).map((r) => `${r.query_key} ${r.article_uid}`),
    );

    const out = [];
    const seenQueries = new Set();
    for (const row of snapshots) {
        const queryKey = normalizeQuery(row.query_text);
        if (!queryKey || seenQueries.has(queryKey)) continue;
        let items = [];
        try { items = JSON.parse(row.evidence_items || '[]'); } catch { items = []; }
        const candidates = items
            .filter((item) => item?.uid && !judged.has(`${queryKey} ${item.uid}`))
            .slice(0, perQuery)
            .map((item) => ({
                articleUid: item.uid,
                servedRank: item.rank ?? null,
                lane: item.lane || null,
                retracted: Boolean(item.retracted),
            }));
        if (!candidates.length) continue;
        seenQueries.add(queryKey);
        out.push({ queryKey, query: row.query_text, searchId: row.id, servedAt: row.created_at, candidates });
        if (out.length >= limit) break;
    }
    return out;
}

/* ─────────────────────────────── export ─────────────────────────────── */

/**
 * Turn graduatable scenarios into a held-out fixture document.
 *
 * 'adjacent' candidates are carried as neither relevant nor off-topic: they are the cases where a
 * ranker should be neither rewarded nor punished, and folding them either way would manufacture a
 * result. Scenarios that are not graduatable are returned as skipped, with the reason.
 */
async function buildHeldoutFixture(db, { labelledBy, source = 'clinician review queue', now = new Date() } = {}) {
    if (!labelledBy) throw new JudgementRejected('labelledBy is required for provenance', 'provenance_required');
    const scenarios = await scenarioStatus(db);
    const queries = [];
    const skipped = [];
    for (const scenario of scenarios) {
        if (!scenario.graduatable) {
            skipped.push({ query: scenario.query, reasons: scenario.blockers });
            continue;
        }
        if (isHeldoutLeakage(scenario.query)) {
            skipped.push({ query: scenario.query, reasons: ['appears in a tuning fixture (leakage)'] });
            continue;
        }
        queries.push({
            query: scenario.query,
            relevantUids: scenario.candidates.filter((c) => c.label === 'on_topic').map((c) => c.articleUid),
            adjacentUids: scenario.candidates.filter((c) => c.label === 'adjacent').map((c) => c.articleUid),
            offTopicUids: scenario.candidates.filter((c) => c.label === 'off_topic').map((c) => c.articleUid),
            provenance: {
                labelledBy: scenario.reviewers.join(', ') || labelledBy,
                labelledAt: now.toISOString().slice(0, 10),
                source,
                intendedSense: scenario.intendedSense,
            },
            agreement: scenario.agreement,
        });
    }
    const agreement = interRaterAgreement(scenarios.flatMap((s) => s.candidates));
    if (queries.length && !agreement.reportable) {
        logger.warn({ pairs: agreement.pairs }, 'held-out export: inter-rater agreement is not yet reportable');
    }
    return {
        version: 1,
        split: 'heldout',
        generatedAt: now.toISOString(),
        agreement,
        queries,
        skipped,
    };
}

module.exports = {
    LABELS,
    MIN_CANDIDATES_PER_SCENARIO,
    MIN_PAIRS_FOR_AGREEMENT,
    JudgementRejected,
    normalizeQuery,
    recordJudgement,
    adjudicate,
    resolveCandidate,
    interRaterAgreement,
    scenarioStatus,
    pendingCandidates,
    buildHeldoutFixture,
};
