#!/usr/bin/env node
/**
 * Phase 1 Search Quality Eval Harness
 *
 * Runs 20 representative queries against both the old client-merge path
 * (/api/pubmed/search) and the new unified RRF path (/api/search), then
 * scores each result set with a simple rubric and prints a side-by-side report.
 *
 * Usage:
 *   node scripts/eval-search-quality.js [--base http://localhost:3001] [--sources pubmed,semantic]
 *
 * Outputs:
 *   - Console table with per-query scores and winner
 *   - eval-results.json with full article lists for manual inspection
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const flag = (name, fallback) => {
    const idx = args.indexOf(name);
    return idx !== -1 ? args[idx + 1] : fallback;
};

const BASE = flag('--base', 'http://localhost:3001');
const SOURCES = flag('--sources', 'pubmed,semantic');
const LIMIT = 10;

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

// ============================================================
// Main
// ============================================================
async function main() {
    console.log(`\nPhase 1 Search Quality Eval`);
    console.log(`Base: ${BASE}   Sources: ${SOURCES}   Limit: ${LIMIT}`);
    console.log(`Queries: ${QUERIES.length}\n`);
    console.log('Running queries...\n');

    const results = [];
    let oldWins = 0, newWins = 0, ties = 0;
    let totalOld = 0, totalNew = 0;

    for (const query of QUERIES) {
        process.stdout.write(`  ${query.slice(0, 50).padEnd(50)} `);
        let oldArticles = [], newArticles = [];
        let oldErr = null, newErr = null;

        try { oldArticles = await fetchOld(query); } catch (e) { oldErr = e.message; }
        try { newArticles = await fetchNew(query); } catch (e) { newErr = e.message; }

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
    console.log('\nDone.\n');

    process.exit(newWins >= oldWins ? 0 : 1);
}

main().catch((err) => {
    console.error('Eval failed:', err.message);
    process.exit(1);
});
