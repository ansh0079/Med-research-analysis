#!/usr/bin/env node
/**
 * Phase 1 Search Quality Eval Harness
 *
 * Runs 20 representative queries against both the old client-merge path
 * (/api/pubmed/search) and the new unified RRF path (/api/search), then
 * scores each result set with a simple rubric and prints a side-by-side report.
 *
 * Usage:
 *   node scripts/eval-search-quality.js [--base http://localhost:3002] [--sources pubmed,semantic]
 *
 * Outputs:
 *   - Console table with per-query scores and winner
 *   - eval-results.json with full article lists for manual inspection
 */

const fs = require('fs');
const path = require('path');
const { evaluateSearchResults, summarizeSearchEval } = require('../server/services/searchQualityEvalService');
const { compareSummaryToBaseline } = require('../server/services/searchQualityRegression');
const { loadSearchGoldFixture } = require('./load-search-gold-fixture');

const args = process.argv.slice(2);
const flag = (name, fallback) => {
    // Prefer the last occurrence so CLI overrides npm-script defaults
    // (e.g. `npm run eval:search-quality:gold -- --base https://signalmd.co`).
    let value = fallback;
    for (let i = 0; i < args.length; i += 1) {
        if (args[i] === name && args[i + 1] != null) value = args[i + 1];
    }
    return value;
};

const BASE = flag('--base', 'http://localhost:3002');
const SOURCES = flag('--sources', 'pubmed,semantic');
const LIMIT = 10;
const GOLD = flag('--gold', null);
const BASELINE_PATH = flag('--baseline', 'tests/fixtures/search-quality-baseline.json');

function loadBaselineSpec() {
    const fullPath = path.resolve(process.cwd(), BASELINE_PATH);
    if (!fs.existsSync(fullPath)) return null;
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function evaluateAbsoluteGates(summary, baselineSpec = {}) {
    const gates = baselineSpec.absoluteGates || {};
    const checks = [];
    if (gates.landmarkHitRateMin != null && summary.landmarkHitRate != null) {
        checks.push({
            label: 'landmarkHitRateMin',
            current: summary.landmarkHitRate,
            threshold: gates.landmarkHitRateMin,
            pass: summary.landmarkHitRate >= gates.landmarkHitRateMin,
        });
    }
    if (gates.offTopicRateAtKMax != null) {
        checks.push({
            label: 'offTopicRateAtKMax',
            current: summary.offTopicRateAtK,
            threshold: gates.offTopicRateAtKMax,
            pass: summary.offTopicRateAtK <= gates.offTopicRateAtKMax,
        });
    }
    if (gates.guidelineHitRateMin != null && summary.guidelineHitRate != null) {
        checks.push({
            label: 'guidelineHitRateMin',
            current: summary.guidelineHitRate,
            threshold: gates.guidelineHitRateMin,
            pass: summary.guidelineHitRate >= gates.guidelineHitRateMin,
        });
    }
    if (gates.managementIntentHitRateMin != null && summary.managementIntentHitRate != null) {
        checks.push({
            label: 'managementIntentHitRateMin',
            current: summary.managementIntentHitRate,
            threshold: gates.managementIntentHitRateMin,
            pass: summary.managementIntentHitRate >= gates.managementIntentHitRateMin,
        });
    }
    if (gates.diagnosisIntentHitRateMin != null && summary.diagnosisIntentHitRate != null) {
        checks.push({
            label: 'diagnosisIntentHitRateMin',
            current: summary.diagnosisIntentHitRate,
            threshold: gates.diagnosisIntentHitRateMin,
            pass: summary.diagnosisIntentHitRate >= gates.diagnosisIntentHitRateMin,
        });
    }
    if (gates.requiredTypeCoverageMin != null && summary.requiredTypeCoverage != null) {
        checks.push({
            label: 'requiredTypeCoverageMin',
            current: summary.requiredTypeCoverage,
            threshold: gates.requiredTypeCoverageMin,
            pass: summary.requiredTypeCoverage >= gates.requiredTypeCoverageMin,
        });
    }
    const failingChecks = checks.filter((row) => !row.pass);
    return { pass: failingChecks.length === 0, checks, failingChecks };
}

function buildGoldSearchUrl(spec, k) {
    const sources = spec.sources || SOURCES;
    const params = new URLSearchParams({
        q: spec.query,
        sources: String(sources),
        limit: String(k),
        intelligence: 'async',
    });
    if (spec.specificity) params.set('specificity', String(spec.specificity));
    if (Array.isArray(spec.parsedStudyTypes) && spec.parsedStudyTypes.length) {
        params.set('parsedStudyTypes', JSON.stringify(spec.parsedStudyTypes));
    }
    if (Array.isArray(spec.parsedYearFilters) && spec.parsedYearFilters.length) {
        params.set('parsedYearFilters', JSON.stringify(spec.parsedYearFilters));
    }
    return `${BASE}/api/search?${params.toString()}`;
}

// ============================================================
// 20 representative medical queries spanning different scenarios
// ============================================================
const QUERIES = [
    // High-specificity clinical
    'SGLT2 inhibitors heart failure reduced ejection fraction',
    'GLP-1 agonists cardiovascular outcomes type 2 diabetes',
    'pembrolizumab non-small cell lung cancer PD-L1',
    'aspirin low-dose primary prevention cardiovascular',
    'CRISPR gene therapy sickle cell disease',

    // Epidemiology / public health
    'COVID-19 long COVID neurological symptoms',
    'childhood obesity prevention intervention',
    'antibiotic resistance mechanisms gram-negative bacteria',
    'social determinants health mortality disparity',
    'air pollution PM2.5 cardiovascular mortality',

    // Broad / ambiguous (tests recall)
    'depression treatment',
    'hypertension management',
    'cancer immunotherapy',
    'stroke rehabilitation',
    'pain management opioid alternatives',

    // Emerging / recent
    'mRNA vaccine mechanism innate immunity',
    'microbiome gut-brain axis mental health',
    'artificial intelligence radiology diagnosis',
    'CAR-T cell therapy B-cell lymphoma',
    'Alzheimer disease amyloid tau biomarkers',
];

// ============================================================
// Scoring rubric (0–100 per result set)
// ============================================================

const EBM_SCORES = {
    'systematic review': 7, 'meta-analysis': 7, 'meta analysis': 7,
    'randomized controlled trial': 6, 'randomised controlled trial': 6, 'rct': 6,
    'controlled clinical trial': 5, 'clinical trial': 5,
    'cohort study': 4, 'cohort': 4,
    'case-control': 3, 'case control': 3,
    'cross-sectional': 2, 'cross sectional': 2,
    'case report': 1, 'case series': 1,
    'editorial': 0, 'letter': 0, 'comment': 0,
};

function ebmScore(article) {
    const types = [
        ...(Array.isArray(article.pubtype) ? article.pubtype : []),
        article.studyDesign || '',
    ].map((t) => (t || '').toLowerCase());
    let best = -1;
    for (const [kw, score] of Object.entries(EBM_SCORES)) {
        if (types.some((t) => t.includes(kw))) best = Math.max(best, score);
    }
    return best >= 0 ? best : 2;
}

function scoreResultSet(articles, query) {
    if (!articles.length) return { total: 0, breakdown: {} };

    const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 3);

    // 1. EBM pyramid score (0–30): avg EBM level of top-10 articles, normalised
    const avgEbm = articles.slice(0, 10).reduce((s, a) => s + ebmScore(a), 0) / Math.min(articles.length, 10);
    const ebmPoints = Math.round((avgEbm / 7) * 30);

    // 2. Relevance (0–40): % of articles whose title contains at least one query term
    const relevant = articles.filter((a) => {
        const title = (a.title || '').toLowerCase();
        return queryTerms.some((t) => title.includes(t));
    });
    const relevancePoints = Math.round((relevant.length / articles.length) * 40);

    // 3. Recency (0–15): % of articles published 2020 or later
    const recentThreshold = 2020;
    const recent = articles.filter((a) => {
        const year = parseInt(a.pubdate || a.year || '0', 10);
        return year >= recentThreshold;
    });
    const recencyPoints = Math.round((recent.length / articles.length) * 15);

    // 4. Dedup quality (0–10): unique title ratio (lower = more dups slipped through)
    const titles = articles.map((a) => (a.title || '').toLowerCase().slice(0, 60));
    const uniqueTitles = new Set(titles);
    const dedupPoints = Math.round((uniqueTitles.size / articles.length) * 10);

    // 5. Source diversity (0–5): bonus for multiple _source values
    const sources = new Set(articles.map((a) => a._source).filter(Boolean));
    const diversityPoints = Math.min(5, (sources.size - 1) * 2);

    const total = ebmPoints + relevancePoints + recencyPoints + dedupPoints + diversityPoints;
    return {
        total,
        breakdown: { ebm: ebmPoints, relevance: relevancePoints, recency: recencyPoints, dedup: dedupPoints, diversity: diversityPoints },
        counts: { total: articles.length, relevant: relevant.length, recent: recent.length },
    };
}

// ============================================================
// HTTP fetch helper
// ============================================================
async function fetchJSON(url) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
    return res.json();
}

async function fetchOld(query) {
    // Old path: per-source parallel fetch (PubMed only for baseline)
    const url = `${BASE}/api/pubmed/search?query=${encodeURIComponent(query)}&max=${LIMIT}`;
    const data = await fetchJSON(url);
    return Array.isArray(data.articles) ? data.articles : [];
}

async function fetchNew(query) {
    // New path: unified RRF endpoint with multi-source fusion
    const url = `${BASE}/api/search?q=${encodeURIComponent(query)}&sources=${SOURCES}&limit=${LIMIT}`;
    const data = await fetchJSON(url);
    return Array.isArray(data.articles) ? data.articles : [];
}

async function runGoldEval(goldPath) {
    const fixture = loadSearchGoldFixture(goldPath);
    const queries = Array.isArray(fixture.queries) ? fixture.queries : [];
    const k = Number(fixture.k || LIMIT);
    if (queries.length === 0) {
        throw new Error(`No labelled queries found in ${goldPath}`);
    }

    console.log(`\nLabelled Search Quality Eval (Phase 2)`);
    console.log(`Base: ${BASE}   Fixture: ${goldPath}   Queries: ${queries.length}   K: ${k}`);
    if (fixture.expansionQueryCount) {
        console.log(`Expansion queries: ${fixture.expansionQueryCount}   Overrides: ${fixture.overrideCount || 0}`);
    }
    console.log('');

    const rows = [];
    for (const spec of queries) {
        const url = buildGoldSearchUrl(spec, k);
        process.stdout.write(`  ${spec.query.slice(0, 64).padEnd(64)} `);
        try {
            const data = await fetchJSON(url);
            const articles = Array.isArray(data.articles) ? data.articles : [];
            const metrics = evaluateSearchResults({ ...spec, k }, articles, { k });
            rows.push(metrics);
            console.log(`P5=${metrics.precisionAt5.toFixed(2)} R@${k}=${metrics.recallAtK.toFixed(2)} MRR=${metrics.mrr.toFixed(2)} off=${metrics.offTopicRateAtK.toFixed(2)} lm=${metrics.landmarkHit == null ? '-' : metrics.landmarkHit ? 'Y' : 'N'}`);
        } catch (err) {
            rows.push({
                query: spec.query,
                category: spec.category || 'landmark_rct',
                k,
                resultCount: 0,
                relevantTotal: (spec.relevantUids || []).length,
                relevantHits: 0,
                offTopicHits: 0,
                precisionAtK: 0,
                precisionAt5: 0,
                recallAtK: 0,
                recallProxy: 0,
                offTopicRateAtK: 1,
                mrr: 0,
                ndcgAtK: 0,
                requiredTypeCoverage: 0,
                anyRelevantHit: false,
                landmarkHit: spec.category === 'guideline' ? null : false,
                guidelineHit: spec.category === 'guideline' ? false : null,
                missingRelevantUids: spec.relevantUids || [],
                hitUids: [],
                error: err.message,
            });
            console.log(`ERROR ${err.message}`);
        }
        await new Promise((r) => setTimeout(r, 300));
    }

    const summary = summarizeSearchEval(rows);
    const baselineSpec = loadBaselineSpec();
    const regression = baselineSpec ? compareSummaryToBaseline(summary, baselineSpec) : null;
    const absoluteGates = baselineSpec ? evaluateAbsoluteGates(summary, baselineSpec) : null;

    console.log('\nSUMMARY');
    console.log(`Queries: ${summary.queryCount} (landmark ${summary.landmarkQueryCount}, guideline ${summary.guidelineQueryCount}, management ${summary.managementIntentQueryCount || 0}, diagnosis ${summary.diagnosisIntentQueryCount || 0})`);
    console.log(`Precision@5: ${summary.precisionAt5.toFixed(3)}`);
    console.log(`Recall@${k}: ${summary.recallAtK.toFixed(3)}`);
    console.log(`Recall proxy: ${summary.recallProxy.toFixed(3)}`);
    console.log(`Any-relevant hit rate: ${summary.anyRelevantHitRate.toFixed(3)}`);
    console.log(`MRR: ${summary.mrr.toFixed(3)}`);
    console.log(`nDCG@${k}: ${summary.ndcgAtK.toFixed(3)}`);
    console.log(`Off-topic@${k}: ${summary.offTopicRateAtK.toFixed(3)} (${summary.offTopicQueryCount} queries with off-topic hits)`);
    console.log(`Landmark hit rate: ${summary.landmarkHitRate == null ? 'n/a' : summary.landmarkHitRate.toFixed(3)}`);
    console.log(`Guideline hit rate: ${summary.guidelineHitRate == null ? 'n/a' : summary.guidelineHitRate.toFixed(3)}`);
    console.log(`Management intent hit rate: ${summary.managementIntentHitRate == null ? 'n/a' : summary.managementIntentHitRate.toFixed(3)}`);
    console.log(`Diagnosis intent hit rate: ${summary.diagnosisIntentHitRate == null ? 'n/a' : summary.diagnosisIntentHitRate.toFixed(3)}`);
    console.log(`Type coverage: ${summary.requiredTypeCoverage.toFixed(3)}`);
    if (summary.failingQueries.length) {
        console.log('\nFailing queries:');
        summary.failingQueries.forEach((q) => console.log(`  - ${q}`));
    }
    if (summary.landmarkMisses?.length) {
        console.log('\nLandmark misses:');
        summary.landmarkMisses.slice(0, 12).forEach((q) => console.log(`  - ${q}`));
    }
    if (regression) {
        console.log('\nREGRESSION VS BASELINE');
        regression.checks.forEach((row) => {
            const delta = row.delta == null ? 'n/a' : row.delta.toFixed(3);
            console.log(`  ${row.pass ? 'PASS' : 'FAIL'} ${row.label}: ${row.current.toFixed(3)} (baseline ${row.baseline.toFixed(3)}, delta ${delta})`);
        });
    }
    if (absoluteGates?.checks?.length) {
        console.log('\nABSOLUTE GATES');
        absoluteGates.checks.forEach((row) => {
            console.log(`  ${row.pass ? 'PASS' : 'FAIL'} ${row.label}: ${row.current.toFixed(3)} threshold ${row.threshold}`);
        });
    }

    const outDir = path.join(process.cwd(), 'eval-results');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `search-quality-gold-${Date.now()}.json`);
    fs.writeFileSync(outPath, JSON.stringify({
        meta: {
            base: BASE,
            fixture: goldPath,
            queryCount: queries.length,
            k,
            ran: new Date().toISOString(),
            expansionQueryCount: fixture.expansionQueryCount || 0,
        },
        summary,
        regression,
        absoluteGates,
        results: rows,
    }, null, 2));
    console.log(`\nFull labelled results written to ${outPath}`);

    const regressionPass = regression ? regression.pass : true;
    const absolutePass = absoluteGates ? absoluteGates.pass : true;
    const usableResultCount = rows.reduce((sum, row) => sum + Number(row.resultCount || 0), 0);
    const allRequestsFailed = rows.length > 0 && rows.every((row) => row.error);
    if (usableResultCount === 0 || allRequestsFailed) {
        console.log('\nGate => FAIL (no usable search results; check --base and server availability)');
        process.exit(1);
    }
    const pass = regressionPass && absolutePass;
    console.log(`\nGate => ${pass ? 'PASS' : 'FAIL'} (regression=${regressionPass ? 'pass' : 'fail'}, absolute=${absolutePass ? 'pass' : 'fail'})`);
    process.exit(pass ? 0 : 1);
}

// ============================================================
// Main
// ============================================================
async function main() {
    if (GOLD) {
        return runGoldEval(GOLD);
    }

    console.log(`\nPhase 1 Search Quality Eval`);
    console.log(`Base: ${BASE}   Sources: ${SOURCES}   Limit: ${LIMIT}`);
    console.log(`Queries: ${QUERIES.length}\n`);
    console.log('Running queries...\n');

    const results = [];
    let oldWins = 0, newWins = 0, ties = 0;
    let totalOld = 0, totalNew = 0;
    let totalNewArticles = 0;
    let newFetchFailures = 0;

    for (const query of QUERIES) {
        process.stdout.write(`  ${query.slice(0, 50).padEnd(50)} `);
        let oldArticles = [], newArticles = [];
        let oldErr = null, newErr = null;

        try { oldArticles = await fetchOld(query); } catch (e) { oldErr = e.message; }
        try { newArticles = await fetchNew(query); } catch (e) { newErr = e.message; }
        if (newErr) newFetchFailures++;
        totalNewArticles += Array.isArray(newArticles) ? newArticles.length : 0;

        const oldScore = oldErr ? { total: 0, breakdown: {}, counts: {} } : scoreResultSet(oldArticles, query);
        const newScore = newErr ? { total: 0, breakdown: {}, counts: {} } : scoreResultSet(newArticles, query);

        const diff = newScore.total - oldScore.total;
        const winner = diff > 2 ? 'NEW' : diff < -2 ? 'OLD' : 'TIE';
        if (winner === 'NEW') newWins++; else if (winner === 'OLD') oldWins++; else ties++;
        totalOld += oldScore.total;
        totalNew += newScore.total;

        const winLabel = winner === 'NEW' ? '✓ NEW' : winner === 'OLD' ? '✗ OLD' : '= TIE';
        console.log(`old=${String(oldScore.total).padStart(3)}  new=${String(newScore.total).padStart(3)}  ${winLabel}`);

        results.push({
            query,
            old: { score: oldScore, articles: oldArticles.slice(0, 5).map((a) => ({ title: a.title, year: a.pubdate || a.year, source: a._source, ebm: ebmScore(a) })), error: oldErr },
            new: { score: newScore, articles: newArticles.slice(0, 5).map((a) => ({ title: a.title, year: a.pubdate || a.year, source: a._source, ebm: ebmScore(a) })), error: newErr },
            winner,
            diff,
        });

        // Small delay to avoid rate-limiting
        await new Promise((r) => setTimeout(r, 300));
    }

    // ============================================================
    // Summary
    // ============================================================
    const avgOld = Math.round(totalOld / QUERIES.length);
    const avgNew = Math.round(totalNew / QUERIES.length);
    const improvement = totalOld > 0 ? (((totalNew - totalOld) / totalOld) * 100).toFixed(1) : 'N/A';

    console.log('\n' + '─'.repeat(72));
    console.log('SUMMARY');
    console.log('─'.repeat(72));
    console.log(`Avg score  —  old: ${avgOld}/100   new: ${avgNew}/100   improvement: ${improvement}%`);
    console.log(`Wins       —  new: ${newWins}   old: ${oldWins}   ties: ${ties}`);
    console.log('─'.repeat(72));

    // Score breakdown by dimension
    console.log('\nBreakdown (avg per dimension, new path):');
    const dims = ['ebm', 'relevance', 'recency', 'dedup', 'diversity'];
    const maxDim = { ebm: 30, relevance: 40, recency: 15, dedup: 10, diversity: 5 };
    for (const dim of dims) {
        const avg = Math.round(results.reduce((s, r) => s + (r.new.score.breakdown[dim] ?? 0), 0) / results.length);
        const bar = '█'.repeat(Math.round((avg / maxDim[dim]) * 20));
        console.log(`  ${dim.padEnd(10)} ${String(avg).padStart(2)}/${maxDim[dim]}  ${bar}`);
    }

    // Worst regressions
    const regressions = results.filter((r) => r.winner === 'OLD').sort((a, b) => a.diff - b.diff);
    if (regressions.length > 0) {
        console.log('\nQueries where OLD path won (investigate):');
        regressions.forEach((r) => {
            console.log(`  [-${Math.abs(r.diff)}]  ${r.query}`);
        });
    }

    // Write full results
    const outPath = path.join(__dirname, '..', 'eval-results.json');
    fs.writeFileSync(outPath, JSON.stringify({ meta: { base: BASE, sources: SOURCES, limit: LIMIT, ran: new Date().toISOString(), avgOld, avgNew, improvement, newWins, oldWins, ties }, results }, null, 2));
    console.log(`\nFull results written to eval-results.json`);
    if (totalNewArticles === 0 || newFetchFailures === QUERIES.length) {
        console.log('\nGate => FAIL (no usable unified-search results; check --base and server availability)\n');
        process.exit(1);
    }
    console.log('\nDone.\n');

    process.exit(newWins >= oldWins ? 0 : 1);
}

main().catch((err) => {
    console.error('Eval failed:', err.message);
    process.exit(1);
});
