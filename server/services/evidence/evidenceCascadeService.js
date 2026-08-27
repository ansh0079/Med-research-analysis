'use strict';

/**
 * Guideline-first evidence resolution.
 *
 * A clinician asking about a topic wants the guideline recommendation before
 * anything else. Only when no guideline exists is a trial the right answer, and
 * only when there is no trial either does ordinary literature become relevant.
 * Retrieval previously made no such distinction: whatever PubMed ranked highest
 * was what got stored and synthesised, so a consensus statement and a single
 * retrospective cohort reached the reader with identical authority.
 *
 * This resolves a topic through an explicit cascade and — critically — reports
 * WHICH tier answered. Callers must propagate `tier` into anything they generate,
 * so a synopsis built on a phase-2 trial is never presented as guidance.
 *
 *   1. guideline  — stored recommendations from a named body
 *   2. trial      — registered trials (ClinicalTrials.gov), completed/phase-3 first
 *   3. literature — caller-supplied articles, ranked by citation weight
 *   4. none       — nothing grounded; caller must mark output ungrounded
 */

const logger = require('../../config/logger');
const { searchTrials } = require('../clinicalTrialsService');
const { safeFetch } = require('../../utils/fetch');

const TIER = Object.freeze({
    GUIDELINE: 'guideline',
    TRIAL: 'trial',
    LITERATURE: 'literature',
    NONE: 'none',
});

// Below this many guideline recommendations a topic is not really "covered" —
// one stray sentence does not constitute guidance worth teaching from.
const DEFAULT_MIN_GUIDELINES = 3;

// Trial designs that carry enough weight to stand in for a guideline.
// Values match parsePhase() / parseStatus() in clinicalTrialsService.
const STRONG_PHASES = new Set(['phase_3', 'phase_4']);
const WEAK_PHASES = new Set(['phase_1', 'early_phase_1']);
const TERMINAL_STATUS = new Set(['terminated', 'suspended', 'withdrawn']);

/**
 * Rank trials so the ones a clinician would actually cite come first:
 * completed phase 3/4 with real enrolment, over early-phase or abandoned work.
 */
function scoreTrial(trial) {
    let score = 0;
    const phase = String(trial?.phase || '');
    const status = String(trial?.status || '').toLowerCase();

    if (STRONG_PHASES.has(phase)) score += 3;
    else if (phase === 'phase_2') score += 1;
    else if (WEAK_PHASES.has(phase)) score -= 1;

    if (status === 'completed') score += 2;
    // A trial that stopped early answers nothing; push it below everything else.
    if (TERMINAL_STATUS.has(status)) score -= 4;

    const n = Number(trial?.enrollmentCount || 0);
    if (n >= 1000) score += 2;
    else if (n >= 200) score += 1;

    if ((trial?.primaryOutcomes || []).length > 0) score += 1;
    return score;
}

function rankTrials(trials, limit) {
    return (Array.isArray(trials) ? trials : [])
        .map((t) => ({ trial: t, score: scoreTrial(t) }))
        // A terminated or early-phase trial is weaker evidence than admitting we
        // have none, so it must not be allowed to satisfy the trial tier.
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ trial, score }) => ({ ...trial, _evidenceScore: score }));
}

/**
 * Citation-weighted ranking for ordinary literature. Falls back to recency when
 * no citation count is available rather than dropping the article entirely.
 */
function rankLiterature(articles, limit) {
    const currentYear = new Date().getFullYear();
    return (Array.isArray(articles) ? articles : [])
        .map((a) => {
            const citations = Number(a?.citationCount ?? a?.citation_count ?? 0);
            const year = Number(a?.year ?? a?.pubYear ?? 0);
            const age = year ? Math.max(0, currentYear - year) : 25;
            // Citations dominate; recency breaks ties and rescues uncited new work.
            const score = Math.log1p(citations) * 10 - age * 0.5;
            return { article: a, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ article, score }) => ({ ...article, _evidenceScore: Number(score.toFixed(2)) }));
}

/**
 * @param {object} db
 * @param {string} topic
 * @param {object}  [opts]
 * @param {number}  [opts.minGuidelines]  guideline count below which we fall through
 * @param {number}  [opts.limit]          max items to return from the winning tier
 * @param {Array}   [opts.articles]       already-retrieved literature for tier 3
 * @param {boolean} [opts.allowTrials]    set false to skip the network call
 * @returns {Promise<{tier: string, guidelines: Array, trials: Array, papers: Array, provenance: object}>}
 */
async function resolveTopicEvidence(db, topic, {
    minGuidelines = DEFAULT_MIN_GUIDELINES,
    limit = 8,
    articles = [],
    allowTrials = true,
    fetchImpl = safeFetch,
} = {}) {
    const trimmed = String(topic || '').trim();
    const empty = {
        tier: TIER.NONE,
        guidelines: [],
        trials: [],
        papers: [],
        provenance: { topic: trimmed, checked: [], reason: 'empty_topic' },
    };
    if (!trimmed) return empty;

    const checked = [];

    // ── Tier 1: stored guideline recommendations ────────────────────────────
    const guidelines = await db.getGuidelinesByTopic(trimmed, { limit })
        .catch((err) => {
            logger.warn({ err, topic: trimmed }, 'evidenceCascade: guideline lookup failed');
            return [];
        });
    checked.push({ tier: TIER.GUIDELINE, found: guidelines.length });

    if (guidelines.length >= minGuidelines) {
        return {
            tier: TIER.GUIDELINE,
            guidelines,
            trials: [],
            papers: [],
            provenance: {
                topic: trimmed,
                checked,
                sourceBodies: [...new Set(guidelines.map((g) => g.sourceBody).filter(Boolean))],
            },
        };
    }

    // ── Tier 2: registered trials ───────────────────────────────────────────
    let trials = [];
    if (allowTrials) {
        try {
            const raw = await searchTrials(trimmed, { pageSize: 25, fetchImpl });
            trials = rankTrials(raw, limit);
        } catch (err) {
            logger.debug({ err, topic: trimmed }, 'evidenceCascade: trial lookup failed');
        }
        checked.push({ tier: TIER.TRIAL, found: trials.length });
    }

    if (trials.length > 0) {
        return {
            tier: TIER.TRIAL,
            // Surface any partial guideline hits alongside, clearly subordinate.
            guidelines,
            trials,
            papers: [],
            provenance: {
                topic: trimmed,
                checked,
                partialGuidelines: guidelines.length,
                note: guidelines.length
                    ? `Only ${guidelines.length} guideline recommendation(s) found (min ${minGuidelines}); trials used as primary evidence.`
                    : 'No guideline found; trials used as primary evidence.',
            },
        };
    }

    // ── Tier 3: citation-ranked literature ──────────────────────────────────
    const papers = rankLiterature(articles, limit);
    checked.push({ tier: TIER.LITERATURE, found: papers.length });
    if (papers.length > 0) {
        return {
            tier: TIER.LITERATURE,
            guidelines,
            trials: [],
            papers,
            provenance: {
                topic: trimmed,
                checked,
                note: 'No guideline or registered trial found; ranked literature used.',
            },
        };
    }

    // ── Tier 4: nothing grounded ────────────────────────────────────────────
    return {
        ...empty,
        guidelines,
        provenance: {
            topic: trimmed,
            checked,
            reason: 'no_grounded_evidence',
            note: 'No grounded evidence. Any generated content must be marked ungrounded.',
        },
    };
}

module.exports = {
    resolveTopicEvidence,
    rankTrials,
    rankLiterature,
    scoreTrial,
    TIER,
    DEFAULT_MIN_GUIDELINES,
};
