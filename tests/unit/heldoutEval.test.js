'use strict';

/**
 * Held-out evaluation: metric maths, uncertainty, subgroup reporting, and the rule that missing or
 * unsuitable labels can never read as a pass. Fixtures are SYNTHETIC and live only in temp
 * directories; nothing here is, or stands in for, clinical labelling.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
    resolveRelevance,
    interRaterAgreement,
    wilson,
    meanWithInterval,
    scoreCase,
    aggregateMetrics,
    subgroupReports,
    loadThresholds,
    judgeAgainstThresholds,
    evaluateHeldout,
    rankFrozenCandidates,
} = require('../../server/services/heldoutEval');
const { loadWorksheet } = require('../../server/services/heldoutWorksheet');

const rel = (entries) => new Map(Object.entries(entries).map(([uid, relevance]) => [uid, { relevance, source: 'agreed' }]));
const judgment = (uid, relevance, by = 'labeler-a') => ({ candidateUid: uid, relevance, labelledBy: by, labelledAt: '2026-09-20' });

describe('label resolution', () => {
    test('an adjudicated resolution wins over disagreeing labelers', () => {
        const out = resolveRelevance({
            judgments: [judgment('a', 'on-topic'), judgment('a', 'adjacent', 'labeler-b')],
            adjudication: { adjudicatedBy: 'dr-c', adjudicatedAt: '2026-09-21', resolutions: [{ candidateUid: 'a', finalRelevance: 'on-topic' }] },
        });
        expect(out.get('a')).toMatchObject({ relevance: 'on-topic', source: 'adjudicated' });
    });

    test('disagreement without adjudication is unresolved, never silently picked', () => {
        const out = resolveRelevance({ judgments: [judgment('a', 'on-topic'), judgment('a', 'off-topic', 'labeler-b')] });
        expect(out.get('a')).toMatchObject({ relevance: null, source: 'unresolved' });
    });

    test('two labelers who agree are agreed; one labeler is marked single_labeler when two are required', () => {
        const out = resolveRelevance({
            judgments: [judgment('a', 'off-topic'), judgment('a', 'off-topic', 'labeler-b'), judgment('b', 'on-topic')],
        });
        expect(out.get('a').source).toBe('agreed');
        expect(out.get('b').source).toBe('single_labeler');
    });
});

describe('inter-rater agreement', () => {
    const cases = (pairs) => [{ judgments: pairs.flatMap(([a, b], i) => [judgment(`c${i}`, a), judgment(`c${i}`, b, 'labeler-b')]) }];

    test('perfect agreement gives kappa 1, chance-level agreement gives kappa near 0', () => {
        expect(interRaterAgreement(cases([['on-topic', 'on-topic'], ['off-topic', 'off-topic'], ['adjacent', 'adjacent']]))).toMatchObject({ pairs: 3, observedAgreement: 1, kappa: 1 });
        const chance = interRaterAgreement(cases([
            ['on-topic', 'on-topic'], ['on-topic', 'off-topic'], ['off-topic', 'on-topic'], ['off-topic', 'off-topic'],
        ]));
        expect(chance.kappa).toBe(0);
    });

    test('with no double-labelled candidates it reports nothing rather than a number', () => {
        expect(interRaterAgreement([{ judgments: [judgment('a', 'on-topic')] }])).toEqual({ pairs: 0, observedAgreement: null, kappa: null });
    });
});

describe('uncertainty', () => {
    test('Wilson interval: 0 of 10 still allows a real rate; 5 of 10 is wide', () => {
        expect(wilson(0, 10)).toMatchObject({ rate: 0, lo: 0 });
        expect(wilson(0, 10).hi).toBeGreaterThan(0.25);
        const half = wilson(5, 10);
        expect(half.lo).toBeCloseTo(0.237, 2);
        expect(half.hi).toBeCloseTo(0.763, 2);
        expect(wilson(0, 0)).toEqual({ rate: null, lo: null, hi: null, n: 0 });
    });

    test('bootstrap interval is reproducible, brackets the mean, and shrinks with more cases', () => {
        const small = [0.2, 0.9, 0.5, 0.7];
        const a = meanWithInterval(small, { seed: 7 });
        expect(meanWithInterval(small, { seed: 7 })).toEqual(a);
        expect(a.lo).toBeLessThanOrEqual(a.mean);
        expect(a.hi).toBeGreaterThanOrEqual(a.mean);
        const large = meanWithInterval(Array.from({ length: 100 }, (_, i) => small[i % 4]), { seed: 7 });
        expect(large.hi - large.lo).toBeLessThan(a.hi - a.lo);
        expect(meanWithInterval([0.5])).toEqual({ mean: 0.5, lo: 0.5, hi: 0.5, n: 1 });
        expect(meanWithInterval([])).toEqual({ mean: null, lo: null, hi: null, n: 0 });
    });
});

describe('per-case metrics', () => {
    const base = { query: 'q', scenarioId: 'S1' };
    const relevance = rel({ a: 'on-topic', b: 'adjacent', c: 'off-topic', d: 'on-topic' });

    test('a perfect ordering has nDCG 1, MRR 1 and full recall', () => {
        const s = scoreCase(base, { ranked: ['a', 'd', 'b', 'c'], rejected: [] }, relevance);
        expect(s).toMatchObject({ ndcg: 1, mrr: 1, recall: 1, retrievalGap: false });
    });

    test('burying the on-topic results lowers nDCG and MRR', () => {
        const s = scoreCase(base, { ranked: ['c', 'b', 'a', 'd'], rejected: [] }, relevance);
        expect(s.ndcg).toBeLessThan(0.85);
        expect(s.mrr).toBeCloseTo(1 / 3, 5);
        expect(s.contaminated).toBe(true);
    });

    test('an off-topic result in the top 10 is contamination; one below 10 is not', () => {
        const ranked = ['a', 'd', 'b', ...Array.from({ length: 8 }, (_, i) => `x${i}`), 'c'];
        expect(scoreCase(base, { ranked, rejected: [] }, relevance, { k: 10 }).contaminated).toBe(false);
        expect(scoreCase(base, { ranked, rejected: [] }, relevance, { k: 12 }).contaminated).toBe(true);
    });

    test('an on-topic candidate removed by eligibility is a false rejection and costs recall', () => {
        const s = scoreCase(base, { ranked: ['a', 'b', 'c'], rejected: [{ uid: 'd', reason: 'off_topic' }] }, relevance);
        expect(s.rejectedOnTopic).toBe(1);
        expect(s.recall).toBe(0.5);
    });

    test('a case with no on-topic candidate is missing evidence: it has no ranking score but still counts for contamination', () => {
        const s = scoreCase(base, { ranked: ['c'], rejected: [] }, rel({ b: 'adjacent', c: 'off-topic' }));
        expect(s).toMatchObject({ retrievalGap: true, ndcg: null, mrr: null, recall: null, contaminated: true });
    });
});

describe('aggregation and subgroups', () => {
    const scored = [
        { intent: 'treatment', dimension: 'rare-condition', family: 'cardiology', retrievalGap: false, ndcg: 1, mrr: 1, recall: 1, contaminated: false, onTopicCandidates: 2, rejectedOnTopic: 0 },
        { intent: 'treatment', dimension: 'rare-condition', family: 'cardiology', retrievalGap: false, ndcg: 0.5, mrr: 0.5, recall: 0.5, contaminated: true, onTopicCandidates: 2, rejectedOnTopic: 1 },
        { intent: 'diagnosis', dimension: 'absent-evidence', family: 'neurology', retrievalGap: true, ndcg: null, mrr: null, recall: null, contaminated: false, onTopicCandidates: 0, rejectedOnTopic: 0 },
    ];

    test('ranking quality excludes missing-evidence cases and reports them separately', () => {
        const m = aggregateMetrics(scored);
        expect(m).toMatchObject({ cases: 3, rankableCases: 2, retrievalGapCases: 1 });
        expect(m.ndcg10.mean).toBe(0.75);
        expect(m.contaminationRate).toMatchObject({ rate: 0.3333, n: 3 });
        expect(m.falseRejectionRate).toMatchObject({ rate: 0.25, n: 4 });
    });

    test('subgroups carry their own n and are flagged underpowered when small', () => {
        const groups = subgroupReports(scored, 'intent');
        expect(groups.treatment).toMatchObject({ cases: 2, underpowered: true });
        expect(groups.diagnosis).toMatchObject({ cases: 1, rankableCases: 0, underpowered: true });
    });
});

describe('thresholds', () => {
    const write = (dir, data) => {
        const file = path.join(dir, 'thresholds.json');
        fs.writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data));
        return file;
    };
    const valid = {
        agreedBy: 'Dr Reviewer', agreedAt: '2026-09-20', minCases: 3,
        metrics: { ndcg10: { min: 0.6 }, mrr: { min: 0.6 }, recall10: { min: 0.6 }, contaminationRate: { max: 0.2 }, falseRejectionRate: { max: 0.2 } },
    };
    let dir;
    beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'heldout-th-')); });

    test('missing, malformed and unattributed thresholds are not accepted', () => {
        expect(loadThresholds(path.join(dir, 'nope.json')).status).toBe('missing');
        expect(loadThresholds(write(dir, '{not json')).status).toBe('invalid');
        expect(loadThresholds(write(dir, { ...valid, agreedBy: '' }))).toMatchObject({ status: 'invalid', problem: expect.stringContaining('agreedBy') });
        expect(loadThresholds(write(dir, { ...valid, metrics: { ...valid.metrics, mrr: {} } })).problem).toContain('metrics.mrr.min');
    });

    test('an agreed file loads with a content hash so any later edit is visible in reports', () => {
        const a = loadThresholds(write(dir, valid));
        expect(a.status).toBe('ok');
        const b = loadThresholds(write(dir, { ...valid, metrics: { ...valid.metrics, ndcg10: { min: 0.1 } } }));
        expect(b.hash).not.toBe(a.hash);
    });

    test('by default the safe end of each interval must clear the bar, so a lucky small sample cannot pass', () => {
        const metrics = {
            ndcg10: { mean: 0.7, lo: 0.4, hi: 0.9 }, mrr: { mean: 0.8, lo: 0.7, hi: 0.9 }, recall10: { mean: 0.8, lo: 0.7, hi: 0.9 },
            contaminationRate: { rate: 0.1, lo: 0.02, hi: 0.4 }, falseRejectionRate: { rate: 0.05, lo: 0, hi: 0.15 },
        };
        const failures = judgeAgainstThresholds(metrics, valid);
        expect(failures.map((f) => f.metric).sort()).toEqual(['contaminationRate', 'ndcg10']);
        expect(judgeAgainstThresholds(metrics, { ...valid, useConfidenceBound: false })).toEqual([]);
    });

    test('an unmeasurable metric fails rather than passing', () => {
        const nulls = { mean: null, lo: null, hi: null };
        const failures = judgeAgainstThresholds({
            ndcg10: nulls, mrr: nulls, recall10: nulls, contaminationRate: { rate: null, lo: null, hi: null }, falseRejectionRate: { rate: null, lo: null, hi: null },
        }, valid);
        expect(failures).toHaveLength(5);
    });
});

/* ───────────── evaluateHeldout end to end on synthetic temp fixtures ───────────── */

const SCENARIO_IDS = [
    'S-TX-AMB-01', 'S-TX-POP-01', 'S-TX-RAR-01', 'S-DX-ABS-01', 'S-PG-RAR-01', 'S-PV-NMT-01', 'S-AE-CNF-01', 'S-ES-POP-01',
];

function buildCase(scenario, { good = true } = {}) {
    const q = scenario.query;
    const candidates = [
        { uid: `${scenario.id}-on1`, title: `${q}: randomized controlled trial`, abstract: `${q}. A randomized trial.`, year: 2021, pubtype: ['Randomized Controlled Trial'] },
        { uid: `${scenario.id}-on2`, title: `${q}: guideline recommendations`, abstract: `${q} guideline.`, year: 2022, pubtype: ['Practice Guideline'] },
        { uid: `${scenario.id}-adj`, title: `${q} in a related population`, abstract: `Related to ${q}.`, year: 2019, pubtype: ['Cohort Studies'] },
        { uid: `${scenario.id}-off`, title: 'Semiconductor packaging yields', abstract: 'Unrelated engineering paper.', year: 2020, pubtype: [] },
    ];
    const both = (uid, relevance) => [judgment(uid, relevance), judgment(uid, relevance, 'labeler-b')];
    return {
        query: q,
        scenarioId: scenario.id,
        candidates,
        judgments: [
            ...both(`${scenario.id}-on1`, 'on-topic'), ...both(`${scenario.id}-on2`, 'on-topic'),
            ...both(`${scenario.id}-adj`, 'adjacent'), ...both(`${scenario.id}-off`, good ? 'off-topic' : 'on-topic'),
        ],
        provenance: { labelledBy: 'labeler-a; labeler-b', labelledAt: '2026-09-20', source: 'synthetic test fixture', intendedSense: scenario.intendedSense },
    };
}

function makeDirs({ cases, thresholds, tuning = [], split = 'heldout' } = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'heldout-eval-'));
    const heldoutDir = path.join(root, 'heldout');
    fs.mkdirSync(heldoutDir);
    fs.writeFileSync(path.join(root, 'tuning.json'), JSON.stringify({ version: 1, split: 'tuning', queries: tuning }));
    if (cases) fs.writeFileSync(path.join(heldoutDir, 'graduated.json'), JSON.stringify({ version: 1, split, queries: cases }));
    // Thresholds are configuration, not a fixture: kept outside the directory the gate loads labels from.
    fs.mkdirSync(path.join(heldoutDir, 'config'));
    let thresholdsFile = path.join(heldoutDir, 'config', 'thresholds.json');
    if (thresholds) fs.writeFileSync(thresholdsFile, JSON.stringify(thresholds));
    else thresholdsFile = path.join(heldoutDir, 'config', 'absent-thresholds.json');
    return { fixtureDir: root, heldoutDir, thresholdsFile };
}

const sheet = loadWorksheet();
const scenarios = SCENARIO_IDS.map((id) => sheet.scenarios.find((s) => s.id === id));
const goodCases = () => scenarios.map((s) => buildCase(s));
const LENIENT = {
    agreedBy: 'Dr Reviewer', agreedAt: '2026-09-19', minCases: 8, useConfidenceBound: false,
    metrics: { ndcg10: { min: 0.5 }, mrr: { min: 0.5 }, recall10: { min: 0.5 }, contaminationRate: { max: 0.5 }, falseRejectionRate: { max: 0.5 } },
};

describe('evaluateHeldout: missing or unsuitable labels are never a pass', () => {
    test('the synthetic fixtures are all worksheet scenarios (guards the tests themselves)', () => {
        expect(scenarios.every(Boolean)).toBe(true);
    });

    test('no held-out cases: no_labels', () => {
        const report = evaluateHeldout(makeDirs({ cases: null }));
        expect(report).toMatchObject({ status: 'no_labels', passed: false, labelledCases: 0 });
    });

    test('a tuning-split fixture in the held-out directory is invalid', () => {
        const report = evaluateHeldout(makeDirs({ cases: goodCases(), split: 'tuning', thresholds: LENIENT }));
        expect(report.status).toBe('invalid');
        expect(report.problems.join(' ')).toMatch(/heldout/);
    });

    test('a held-out query that also appears in a tuning fixture is invalid (leakage)', () => {
        const cases = goodCases();
        const report = evaluateHeldout(makeDirs({ cases, thresholds: LENIENT, tuning: [{ query: cases[0].query }] }));
        expect(report.status).toBe('invalid');
        expect(report.problems.join(' ')).toMatch(/tuning fixture/);
    });

    test('labeler disagreement without adjudication is invalid', () => {
        const cases = goodCases();
        cases[0].judgments.push(judgment(`${cases[0].scenarioId}-on1`, 'off-topic', 'labeler-c'));
        const report = evaluateHeldout(makeDirs({ cases, thresholds: LENIENT }));
        expect(report.status).toBe('invalid');
        expect(report.problems.join(' ')).toMatch(/disagree/);
    });

    test('a case with fewer than three frozen candidates, or an unjudged candidate, is invalid', () => {
        const few = goodCases();
        few[0].candidates = few[0].candidates.slice(0, 2);
        expect(evaluateHeldout(makeDirs({ cases: few, thresholds: LENIENT })).problems.join(' ')).toMatch(/at least 3 frozen candidates/);

        const unjudged = goodCases();
        unjudged[0].judgments = unjudged[0].judgments.filter((j) => !j.candidateUid.endsWith('-adj'));
        expect(evaluateHeldout(makeDirs({ cases: unjudged, thresholds: LENIENT })).problems.join(' ')).toMatch(/no judgment/);
    });

    test('a case that is not a worksheet scenario is invalid', () => {
        const cases = goodCases();
        cases[0].scenarioId = 'S-MADE-UP';
        expect(evaluateHeldout(makeDirs({ cases, thresholds: LENIENT })).status).toBe('invalid');
    });

    test('valid labels but no agreed thresholds: thresholds_not_agreed, with the metrics still reported', () => {
        const report = evaluateHeldout(makeDirs({ cases: goodCases() }));
        expect(report).toMatchObject({ status: 'thresholds_not_agreed', passed: false, labelledCases: 8 });
        expect(report.metrics.cases).toBe(8);
        expect(report.problems[0]).toMatch(/no agreed thresholds/);
    });

    test('fewer cases than the agreed minimum: insufficient_labels', () => {
        const report = evaluateHeldout(makeDirs({ cases: goodCases(), thresholds: { ...LENIENT, minCases: 100 } }));
        expect(report).toMatchObject({ status: 'insufficient_labels', passed: false });
        expect(report.problems[0]).toMatch(/8 labelled case\(s\).*100/);
    });

    test('a ranker that serves a labeller-judged off-topic result fails on contamination', () => {
        const cases = scenarios.map((s) => buildCase(s, { good: false }));
        // The "off" candidate is judged on-topic here, so flip the judgement of a query-matching
        // candidate to off-topic to force a genuinely contaminated result.
        for (const c of cases) c.judgments = c.judgments.map((j) => (j.candidateUid.endsWith('-adj') ? { ...j, relevance: 'off-topic' } : j));
        const strict = { ...LENIENT, metrics: { ...LENIENT.metrics, contaminationRate: { max: 0.05 } } };
        const report = evaluateHeldout(makeDirs({ cases, thresholds: strict }));
        expect(report.status).toBe('failed');
        expect(report.failures.map((f) => f.metric)).toContain('contaminationRate');
    });

    test('adequate labels, agreed thresholds and a ranker that clears them: passed, with full provenance', () => {
        const dirs = makeDirs({ cases: goodCases(), thresholds: LENIENT });
        const report = evaluateHeldout(dirs);
        expect(report.problems ?? []).toEqual([]);
        expect(report).toMatchObject({ status: 'passed', passed: true, labelledCases: 8 });
        expect(report.metrics.rankableCases).toBe(8);
        expect(report.agreement).toMatchObject({ kappa: 1 });
        expect(report.provenance).toMatchObject({
            metricDefinitionsVersion: 1,
            providerConfig: { mode: 'frozen_candidates', providersCalled: [] },
            thresholdsAgreedBy: 'Dr Reviewer',
        });
        expect(report.provenance.thresholdsHash).toMatch(/^[0-9a-f]{64}$/);
        expect(report.provenance.datasets[0]).toMatchObject({ file: 'graduated.json', version: 1 });
        expect(Object.keys(report.subgroups)).toEqual(['intent', 'dimension', 'family']);
        expect(report.subgroups.intent.treatment.underpowered).toBe(true);
    });

    test('the same input gives the same report every time', () => {
        const dirs = makeDirs({ cases: goodCases(), thresholds: LENIENT });
        const strip = (r) => ({ ...r, provenance: { ...r.provenance, baselineCommit: null } });
        expect(strip(evaluateHeldout(dirs))).toEqual(strip(evaluateHeldout(dirs)));
    });

    test('the absent-evidence scenario is reported as missing evidence, not a ranking failure', () => {
        const cases = goodCases();
        const absent = cases.find((c) => c.scenarioId === 'S-DX-ABS-01');
        absent.judgments = absent.judgments.map((j) => ({ ...j, relevance: j.candidateUid.endsWith('-off') ? 'off-topic' : 'adjacent' }));
        const report = evaluateHeldout(makeDirs({ cases, thresholds: LENIENT }));
        expect(report.metrics).toMatchObject({ cases: 8, rankableCases: 7, retrievalGapCases: 1 });
        expect(report.status).toBe('passed');
    });
});

describe('the ranking path on frozen candidates', () => {
    test('runs offline and removes clearly off-topic candidates through eligibility, with a reason', () => {
        const c = buildCase(scenarios[0]);
        const { ranked, rejected } = rankFrozenCandidates(c);
        expect(ranked).toEqual(expect.arrayContaining([`${c.scenarioId}-on1`, `${c.scenarioId}-on2`]));
        expect(ranked).not.toContain(`${c.scenarioId}-off`);
        expect(rejected).toEqual([{ uid: `${c.scenarioId}-off`, reason: 'off_topic' }]);
    });
});
