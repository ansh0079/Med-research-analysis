'use strict';

/**
 * Independent held-out evaluation of the ranking path on frozen candidates.
 *
 * Inputs are graduated held-out fixtures (tests/fixtures/heldout/*.json): each case carries its
 * frozen `candidates` and per-candidate `judgments` from independent labelers, with disagreements
 * adjudicated. No provider is called, so a metric cannot move because PubMed was throttled, and a
 * missing candidate set is reported as missing evidence, never as a ranking error.
 *
 * The evaluation is a gate as well as a report. Its status is one of:
 *
 *   no_labels              no graduated case exists
 *   invalid                a fixture is malformed, or a case has unresolved labeler disagreement
 *   insufficient_labels    fewer cases than the agreed minimum
 *   thresholds_not_agreed  no thresholds file with a named approver: the pass bar is set BEFORE
 *                          a candidate is evaluated, and its hash is recorded in every report
 *   failed                 a metric is on the wrong side of its threshold
 *   passed                 all metrics clear their thresholds and the label set is large enough
 *
 * Only 'passed' permits a quality promotion. Missing labels are never read as a passing result.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { loadReleaseGateCases, HELDOUT_DIR } = require('./evalDatasetPolicy');
const {
    validateJudgments,
    validateGraduatedFixture,
    checkAggregateDiversity,
    loadWorksheet,
    RELEVENCE_CLASSES,
} = require('./heldoutWorksheet');

const METRIC_DEFINITIONS_VERSION = 1;
const GAIN = Object.freeze({ 'on-topic': 2, adjacent: 1, 'off-topic': 0 });
const DEFAULT_K = 10;
const MIN_SUBGROUP_N = 10;
// Outside the top-level held-out directory on purpose: every .json file directly in it is loaded as a
// labelled fixture, and a thresholds file is configuration, not labels.
const THRESHOLDS_FILE = path.join(HELDOUT_DIR, 'config', 'thresholds.json');

/* ─────────────────────────── label resolution ─────────────────────────── */

/**
 * Final relevance per candidate. An adjudicated resolution wins; unanimous labelers agree;
 * a single labeler stands only if the case does not require two (see `requireTwoLabelers`);
 * disagreement without adjudication is 'unresolved' and makes the case invalid.
 */
function resolveRelevance(testCase, { requireTwoLabelers = true } = {}) {
    const byCandidate = new Map();
    for (const j of Array.isArray(testCase.judgments) ? testCase.judgments : []) {
        const uid = String(j.candidateUid || j.pmid || '').trim();
        if (!uid) continue;
        const list = byCandidate.get(uid) || [];
        list.push(j);
        byCandidate.set(uid, list);
    }
    const resolutions = new Map();
    for (const r of Array.isArray(testCase.adjudication?.resolutions) ? testCase.adjudication.resolutions : []) {
        resolutions.set(String(r.candidateUid), r);
    }
    const out = new Map();
    for (const [uid, judgments] of byCandidate) {
        const labelers = new Set(judgments.map((j) => String(j.labelledBy || '').trim()));
        const stances = new Set(judgments.map((j) => j.relevance));
        const resolution = resolutions.get(uid);
        if (resolution && RELEVENCE_CLASSES.includes(resolution.finalRelevance)) {
            out.set(uid, { relevance: resolution.finalRelevance, source: 'adjudicated', labelers: labelers.size });
        } else if (stances.size > 1) {
            out.set(uid, { relevance: null, source: 'unresolved', labelers: labelers.size });
        } else if (labelers.size < 2 && requireTwoLabelers) {
            out.set(uid, { relevance: judgments[0].relevance, source: 'single_labeler', labelers: labelers.size });
        } else {
            out.set(uid, { relevance: judgments[0].relevance, source: 'agreed', labelers: labelers.size });
        }
    }
    return out;
}

/** Cohen's kappa over candidates judged by two or more distinct labelers (first two compared). */
function interRaterAgreement(cases) {
    const pairs = [];
    for (const c of cases) {
        const byCandidate = new Map();
        for (const j of Array.isArray(c.judgments) ? c.judgments : []) {
            const uid = String(j.candidateUid || j.pmid || '').trim();
            const list = byCandidate.get(uid) || [];
            if (!list.some((x) => x.labelledBy === j.labelledBy)) list.push(j);
            byCandidate.set(uid, list);
        }
        for (const list of byCandidate.values()) {
            if (list.length >= 2) pairs.push([list[0].relevance, list[1].relevance]);
        }
    }
    if (!pairs.length) return { pairs: 0, observedAgreement: null, kappa: null };
    const n = pairs.length;
    const observed = pairs.filter(([a, b]) => a === b).length / n;
    const expected = RELEVENCE_CLASSES.reduce((sum, cls) => {
        const pa = pairs.filter(([a]) => a === cls).length / n;
        const pb = pairs.filter(([, b]) => b === cls).length / n;
        return sum + pa * pb;
    }, 0);
    const kappa = expected >= 1 ? 1 : (observed - expected) / (1 - expected);
    return { pairs: n, observedAgreement: round(observed), kappa: round(kappa) };
}

/* ───────────────────────────── statistics ───────────────────────────── */

function round(value, digits = 4) {
    return Number.isFinite(value) ? Math.round(value * 10 ** digits) / 10 ** digits : null;
}

/** Wilson score interval for a proportion. */
function wilson(successes, total, z = 1.96) {
    if (!total) return { rate: null, lo: null, hi: null, n: 0 };
    const p = successes / total;
    const denom = 1 + (z * z) / total;
    const centre = (p + (z * z) / (2 * total)) / denom;
    const half = (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) / denom;
    return { rate: round(p), lo: round(Math.max(0, centre - half)), hi: round(Math.min(1, centre + half)), n: total };
}

/** Deterministic PRNG so a report can be reproduced exactly. */
function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Mean with a percentile-bootstrap 95% interval over cases. */
function meanWithInterval(values, { resamples = 2000, seed = 1 } = {}) {
    const xs = values.filter((v) => Number.isFinite(v));
    if (!xs.length) return { mean: null, lo: null, hi: null, n: 0 };
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    if (xs.length === 1) return { mean: round(mean), lo: round(mean), hi: round(mean), n: 1 };
    const rand = mulberry32(seed);
    const means = [];
    for (let i = 0; i < resamples; i++) {
        let sum = 0;
        for (let j = 0; j < xs.length; j++) sum += xs[Math.floor(rand() * xs.length)];
        means.push(sum / xs.length);
    }
    means.sort((a, b) => a - b);
    return { mean: round(mean), lo: round(means[Math.floor(0.025 * resamples)]), hi: round(means[Math.floor(0.975 * resamples)]), n: xs.length };
}

/* ─────────────────────────── ranking on frozen candidates ─────────────────────────── */

/**
 * Run the real eligibility -> bouquet -> lane path on a case's frozen candidates. Nothing is
 * fetched. `rejected` lists candidates eligibility removed, with the reason.
 */
function rankFrozenCandidates(testCase, deps = {}) {
    const {
        filterRelevantArticles,
    } = deps.searchPipeline || require('./search/searchPipeline');
    const { buildEvidenceBouquet } = deps.bouquet || require('./evidenceBouquet/bouquetBuilder');
    const { annotateEvidenceMetadata, rankArticlesWithinLanes, evaluateEligibility } = deps.lanes || require('./search/evidenceLanes');
    const { classifyQueryIntent } = deps.intent || require('./evidenceBouquet/queryIntent');

    const query = String(testCase.query || '');
    const queryMeshTerms = Array.isArray(testCase.queryMeshTerms) ? testCase.queryMeshTerms : [];
    const queryAliases = Array.isArray(testCase.queryAliases) ? testCase.queryAliases : [];
    const candidates = (Array.isArray(testCase.candidates) ? testCase.candidates : [])
        .map((c) => ({ ...c, uid: String(c.uid || c.pmid || '').trim() }))
        .filter((c) => c.uid);

    const eligible = filterRelevantArticles(candidates, { query, specificity: 'moderate', queryMeshTerms, queryAliases });
    const eligibleUids = new Set(eligible.map((a) => a.uid));
    const rejected = candidates
        .filter((c) => !eligibleUids.has(c.uid))
        .map((c) => ({ uid: c.uid, reason: evaluateEligibility(c, { query, queryMeshTerms, queryAliases }).rejectionReason || 'filtered' }));

    const intent = classifyQueryIntent(query);
    const bouquet = buildEvidenceBouquet(eligible, query, {
        count: Math.max(candidates.length, 1), selectionMode: 'relevance', queryAliases, queryIntent: intent,
    });
    const annotated = annotateEvidenceMetadata(bouquet.topPapers, { query, queryMeshTerms, queryAliases });
    const ranked = rankArticlesWithinLanes(annotated, { intent });
    return { ranked: ranked.map((a) => a.uid), rejected };
}

/* ───────────────────────────── per-case metrics ───────────────────────────── */

function dcg(gains, k) {
    return gains.slice(0, k).reduce((sum, g, i) => sum + (2 ** g - 1) / Math.log2(i + 2), 0);
}

/**
 * Metrics for one case. `relevance` is a Map(uid -> class). Cases with no on-topic candidate carry
 * retrievalGap: true and contribute to contamination only, because there is nothing to rank well;
 * that is missing evidence, not a ranking error.
 */
function scoreCase(testCase, { ranked, rejected }, relevance, { k = DEFAULT_K } = {}) {
    const rel = (uid) => relevance.get(uid)?.relevance || null;
    const judged = [...relevance.entries()].filter(([, v]) => v.relevance);
    const onTopic = judged.filter(([, v]) => v.relevance === 'on-topic').map(([uid]) => uid);
    const servedTopK = ranked.slice(0, k);

    const offTopicServed = servedTopK.filter((uid) => rel(uid) === 'off-topic');
    const rejectedOnTopic = rejected.filter((r) => rel(r.uid) === 'on-topic');
    const base = {
        scenarioId: testCase.scenarioId || null,
        query: testCase.query,
        intent: testCase.intent || 'unknown',
        dimension: testCase.dimension || 'unknown',
        family: testCase.family || 'unknown',
        judgedCandidates: judged.length,
        onTopicCandidates: onTopic.length,
        retrievalGap: onTopic.length === 0,
        servedCount: ranked.length,
        contaminated: offTopicServed.length > 0,
        offTopicShare: servedTopK.length ? offTopicServed.length / servedTopK.length : 0,
        rejectedOnTopic: rejectedOnTopic.length,
        rejections: rejected,
    };
    if (base.retrievalGap) return { ...base, ndcg: null, mrr: null, recall: null };

    const servedGains = servedTopK.map((uid) => GAIN[rel(uid)] ?? 0);
    const idealGains = judged.map(([, v]) => GAIN[v.relevance]).sort((a, b) => b - a);
    const ideal = dcg(idealGains, k);
    const firstOnTopic = ranked.findIndex((uid) => rel(uid) === 'on-topic');
    const servedOnTopic = servedTopK.filter((uid) => rel(uid) === 'on-topic').length;
    return {
        ...base,
        ndcg: ideal > 0 ? dcg(servedGains, k) / ideal : 0,
        mrr: firstOnTopic >= 0 ? 1 / (firstOnTopic + 1) : 0,
        recall: servedOnTopic / onTopic.length,
    };
}

/* ─────────────────────────────── aggregation ─────────────────────────────── */

function aggregateMetrics(scored, { seed = 1, resamples = 2000 } = {}) {
    const rankable = scored.filter((s) => !s.retrievalGap);
    const contaminated = scored.filter((s) => s.contaminated).length;
    const onTopicTotal = scored.reduce((n, s) => n + s.onTopicCandidates, 0);
    const rejectedOnTopic = scored.reduce((n, s) => n + s.rejectedOnTopic, 0);
    return {
        cases: scored.length,
        rankableCases: rankable.length,
        // Missing evidence is reported apart from ranking quality so neither hides the other.
        retrievalGapCases: scored.length - rankable.length,
        ndcg10: meanWithInterval(rankable.map((s) => s.ndcg), { seed, resamples }),
        mrr: meanWithInterval(rankable.map((s) => s.mrr), { seed: seed + 1, resamples }),
        recall10: meanWithInterval(rankable.map((s) => s.recall), { seed: seed + 2, resamples }),
        contaminationRate: wilson(contaminated, scored.length),
        falseRejectionRate: wilson(rejectedOnTopic, onTopicTotal),
    };
}

function subgroupReports(scored, field, { minN = MIN_SUBGROUP_N, seed = 1 } = {}) {
    const groups = new Map();
    for (const s of scored) {
        const key = s[field] || 'unknown';
        groups.set(key, [...(groups.get(key) || []), s]);
    }
    return Object.fromEntries([...groups.entries()].sort().map(([key, list]) => [
        key,
        { ...aggregateMetrics(list, { seed, resamples: 1000 }), underpowered: list.length < minN },
    ]));
}

/* ───────────────────────────────── gate ───────────────────────────────── */

function sha256(text) { return crypto.createHash('sha256').update(text).digest('hex'); }

function loadThresholds(file = THRESHOLDS_FILE) {
    if (!fs.existsSync(file)) return { status: 'missing' };
    const raw = fs.readFileSync(file, 'utf8');
    let data;
    try { data = JSON.parse(raw); } catch { return { status: 'invalid', problem: 'thresholds.json is not valid JSON' }; }
    const problems = [];
    if (!String(data.agreedBy || '').trim()) problems.push('agreedBy is required');
    if (!String(data.agreedAt || '').trim()) problems.push('agreedAt is required');
    if (!Number.isInteger(data.minCases) || data.minCases < 1) problems.push('minCases must be a positive integer');
    const metrics = data.metrics || {};
    const REQUIRED = { ndcg10: 'min', mrr: 'min', recall10: 'min', contaminationRate: 'max', falseRejectionRate: 'max' };
    for (const [name, bound] of Object.entries(REQUIRED)) {
        if (!Number.isFinite(metrics[name]?.[bound])) problems.push(`metrics.${name}.${bound} is required`);
    }
    if (problems.length) return { status: 'invalid', problem: problems.join('; ') };
    return { status: 'ok', thresholds: data, hash: sha256(raw) };
}

/**
 * Compare metrics to agreed thresholds. By default the safe end of each interval must clear the bar
 * (`useConfidenceBound`), so a small lucky sample cannot pass.
 */
function judgeAgainstThresholds(metrics, thresholds) {
    const useBound = thresholds.useConfidenceBound !== false;
    const failures = [];
    const check = (name, value, lo, hi, bound, limit) => {
        const point = value;
        const safe = bound === 'min' ? (useBound ? lo : point) : (useBound ? hi : point);
        if (safe == null) { failures.push({ metric: name, reason: 'not measurable' }); return; }
        const ok = bound === 'min' ? safe >= limit : safe <= limit;
        if (!ok) failures.push({ metric: name, [bound]: limit, observed: point, checkedAgainst: useBound ? (bound === 'min' ? 'lower bound' : 'upper bound') : 'point estimate', safeValue: safe });
    };
    const t = thresholds.metrics;
    check('ndcg10', metrics.ndcg10.mean, metrics.ndcg10.lo, metrics.ndcg10.hi, 'min', t.ndcg10.min);
    check('mrr', metrics.mrr.mean, metrics.mrr.lo, metrics.mrr.hi, 'min', t.mrr.min);
    check('recall10', metrics.recall10.mean, metrics.recall10.lo, metrics.recall10.hi, 'min', t.recall10.min);
    check('contaminationRate', metrics.contaminationRate.rate, metrics.contaminationRate.lo, metrics.contaminationRate.hi, 'max', t.contaminationRate.max);
    check('falseRejectionRate', metrics.falseRejectionRate.rate, metrics.falseRejectionRate.lo, metrics.falseRejectionRate.hi, 'max', t.falseRejectionRate.max);
    return failures;
}

function gitSha() {
    if (process.env.GIT_SHA) return process.env.GIT_SHA;
    try {
        return require('child_process').execSync('git rev-parse HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
        return null;
    }
}

function datasetVersions(files) {
    return files.map((file) => {
        const raw = fs.readFileSync(file, 'utf8');
        let version = null;
        try { version = JSON.parse(raw).version ?? null; } catch { /* reported as invalid elsewhere */ }
        return { file: path.basename(file), version, sha256: sha256(raw).slice(0, 16) };
    });
}

/**
 * Evaluate the held-out set. Never throws for a data problem; the problem is the status.
 * @param {object} [options]
 * @param {object} [options.deps] test injection for the ranking path
 * @param {string} [options.heldoutDir] @param {string} [options.fixtureDir] @param {string} [options.thresholdsFile]
 */
function evaluateHeldout(options = {}) {
    const { heldoutDir, fixtureDir, thresholdsFile, deps, k = DEFAULT_K, seed = 1 } = options;
    const provenance = {
        baselineCommit: gitSha(),
        metricDefinitionsVersion: METRIC_DEFINITIONS_VERSION,
        k,
        providerConfig: { mode: 'frozen_candidates', providersCalled: [] },
        flags: {
            laneRetrieval: String(process.env.SEARCH_LANE_RETRIEVAL || 'off'),
            lineageEnforcement: String(process.env.EVIDENCE_LINEAGE_ENFORCEMENT || 'shadow'),
        },
    };
    const report = (status, extra = {}) => ({ status, passed: status === 'passed', provenance, ...extra });

    let loaded;
    try {
        loaded = loadReleaseGateCases({ ...(heldoutDir ? { heldoutDir } : {}), ...(fixtureDir ? { fixtureDir } : {}) });
    } catch (err) {
        return report('invalid', { problems: [err.message] });
    }
    provenance.datasets = datasetVersions(loaded.files);
    if (loaded.cases.length === 0) {
        return report('no_labels', { problems: ['no graduated held-out cases exist; quality promotion is not permitted'], labelledCases: 0 });
    }

    const problems = [];
    const sheet = loadWorksheet();
    for (const file of loaded.files) {
        try {
            problems.push(...validateGraduatedFixture(JSON.parse(fs.readFileSync(file, 'utf8')), sheet));
        } catch (err) {
            problems.push(`${path.basename(file)}: ${err.message}`);
        }
    }
    const diversity = checkAggregateDiversity(loaded.cases, sheet);
    problems.push(...diversity.problems);
    // Subgroup reporting needs each case's stratification cell, which lives on its worksheet scenario.
    const scenarioById = new Map(sheet.scenarios.map((sc) => [sc.id, sc]));
    for (const testCase of loaded.cases) {
        const sc = scenarioById.get(String(testCase.scenarioId || ''));
        if (sc) Object.assign(testCase, { family: sc.family, intent: sc.intent, dimension: sc.dimension });
    }

    const scored = [];
    const unresolved = [];
    for (const testCase of loaded.cases) {
        const label = `case "${testCase.query}"`;
        if (!Array.isArray(testCase.candidates) || testCase.candidates.length < 3) {
            problems.push(`${label}: needs at least 3 frozen candidates`);
            continue;
        }
        const judgedUids = new Set((testCase.judgments || []).map((j) => String(j.candidateUid || j.pmid || '').trim()));
        const candidateUids = new Set(testCase.candidates.map((c) => String(c.uid || c.pmid || '').trim()));
        for (const uid of judgedUids) if (!candidateUids.has(uid)) problems.push(`${label}: judgment for "${uid}" has no matching candidate`);
        problems.push(...validateJudgments(testCase, label));
        const relevance = resolveRelevance(testCase);
        if ([...relevance.values()].some((v) => v.source === 'unresolved')) unresolved.push(testCase.query);
        const unjudged = [...candidateUids].filter((uid) => !judgedUids.has(uid));
        if (unjudged.length) problems.push(`${label}: ${unjudged.length} candidate(s) have no judgment`);
        scored.push(scoreCase(testCase, rankFrozenCandidates(testCase, deps), relevance, { k }));
    }
    for (const q of unresolved) problems.push(`case "${q}" has disagreeing labels without adjudication`);
    if (problems.length) return report('invalid', { problems: [...new Set(problems)], labelledCases: loaded.cases.length });

    const metrics = aggregateMetrics(scored, { seed });
    const agreement = interRaterAgreement(loaded.cases);
    const detail = {
        labelledCases: loaded.cases.length,
        metrics,
        agreement,
        subgroups: {
            intent: subgroupReports(scored, 'intent', { seed }),
            dimension: subgroupReports(scored, 'dimension', { seed }),
            family: subgroupReports(scored, 'family', { seed }),
        },
        cases: scored,
    };

    const th = loadThresholds(thresholdsFile);
    if (th.status !== 'ok') {
        return report('thresholds_not_agreed', { ...detail, problems: [th.status === 'missing' ? 'no agreed thresholds file (tests/fixtures/heldout/config/thresholds.json)' : th.problem] });
    }
    provenance.thresholdsHash = th.hash;
    provenance.thresholdsAgreedBy = th.thresholds.agreedBy;
    provenance.thresholdsAgreedAt = th.thresholds.agreedAt;
    if (scored.length < th.thresholds.minCases) {
        return report('insufficient_labels', { ...detail, problems: [`${scored.length} labelled case(s); the agreed minimum is ${th.thresholds.minCases}`] });
    }
    const failures = judgeAgainstThresholds(metrics, th.thresholds);
    return report(failures.length ? 'failed' : 'passed', { ...detail, failures });
}

module.exports = {
    METRIC_DEFINITIONS_VERSION,
    GAIN,
    THRESHOLDS_FILE,
    resolveRelevance,
    interRaterAgreement,
    wilson,
    meanWithInterval,
    rankFrozenCandidates,
    scoreCase,
    aggregateMetrics,
    subgroupReports,
    loadThresholds,
    judgeAgainstThresholds,
    evaluateHeldout,
};
