'use strict';

/**
 * discoverWellCitedArticles.js
 *
 * For every curriculum topic with no real guideline basis (see
 * tools/data-hygiene/guideline-gap-report.js), find well-cited review/
 * systematic-review articles to ground content in instead. This is the
 * discovery step only: it queries Semantic Scholar for citationCount and
 * ranks candidates, then writes the ranked list to a JSON file. It does NOT
 * generate synopses or MCQs -- that is real, ongoing LLM spend across
 * hundreds of topics and is a separate, explicitly-approved step
 * (see server/scripts/seedPaperMcqs.js for the pattern once articles exist
 * as 'paper' teaching objects).
 *
 * Output: writes one JSON file per run to data/guideline-gap/well-cited-candidates.json
 *   { topic, specialty, priority, candidates: [{ title, year, citationCount, journal, doi, isReview, uid }] }
 *
 * Usage:
 *   node server/scripts/discoverWellCitedArticles.js [--limit n] [--priority high|medium|low|all] [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const { loadEnv, serverConfig } = require('../../config');
loadEnv();

const db = require('../../database');
const { safeFetch } = require('../utils/fetch');

const args = process.argv.slice(2);
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : 9999;
const PRIORITY = args.includes('--priority') ? args[args.indexOf('--priority') + 1] : 'all';
const DRY_RUN = args.includes('--dry-run');

// Candidates per topic to keep for the next (generation) step to choose from.
const CANDIDATES_PER_TOPIC = 5;
// Below this citation count a review article is not "well-cited" enough to
// anchor content in -- it is excluded rather than padding the candidate list.
const MIN_CITATIONS = 20;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function normalizeTopicForQuery(topic) {
    // Strip a colon subtitle and parenthetical detail -- Semantic Scholar's search
    // does better on the core clinical entity than on a long descriptive title.
    return String(topic).split(':')[0].replace(/\([^)]*\)/g, '').trim();
}

async function semanticScholarSearch(query, { limit = 15 } = {}) {
    const apiKey = serverConfig?.keys?.semantic;
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=title,year,citationCount,journal,externalIds,publicationTypes`;
    const headers = apiKey ? { 'x-api-key': apiKey } : {};
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) await sleep(attempt * 1500);
        try {
            const res = await safeFetch(url, { headers, signal: AbortSignal.timeout(20000) });
            if (res.status === 429 || res.status === 503) { lastErr = new Error(`status ${res.status}`); continue; }
            if (!res.ok) throw new Error(`status ${res.status}`);
            const data = await res.json();
            return data.data || [];
        } catch (e) {
            lastErr = e;
        }
    }
    throw lastErr || new Error('semanticScholarSearch failed');
}

async function openAlexSearch(query, { limit = 15 } = {}) {
    const email = process.env.NCBI_EMAIL || '';
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${limit}&select=title,publication_year,cited_by_count,primary_location,type,doi,ids${email ? `&mailto=${encodeURIComponent(email)}` : ''}`;
    const res = await safeFetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`OpenAlex status ${res.status}`);
    const data = await res.json();
    return (data.results || []).map((r) => ({
        title: r.title,
        year: r.publication_year,
        citationCount: r.cited_by_count,
        journal: { name: r.primary_location?.source?.display_name || null },
        externalIds: { DOI: r.doi ? r.doi.replace('https://doi.org/', '') : null, PubMed: r.ids?.pmid ? r.ids.pmid.replace('https://pubmed.ncbi.nlm.nih.gov/', '').replace(/\/$/, '') : null },
        publicationTypes: r.type ? [r.type] : [],
    }));
}

const PUBMED_ESEARCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const PUBMED_ESUMMARY = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi';

/**
 * Fallback with no citation-count signal at all -- used only when both
 * Semantic Scholar and OpenAlex are unavailable (both were blocked by
 * account-level issues -- expired key / exhausted budget -- when this was
 * built, not a code problem). Ranks by review-type + recency instead of
 * citations, and every candidate is flagged uncitationRanked: true so a
 * generation step downstream can require a human check before treating one
 * as "well-cited".
 */
async function pubmedSearch(query, { limit = 15 } = {}) {
    const email = process.env.NCBI_EMAIL || '';
    const searchUrl = `${PUBMED_ESEARCH}?db=pubmed&term=${encodeURIComponent(query)}+AND+review[pt]&retmax=${limit}&sort=relevance&retmode=json${email ? `&email=${encodeURIComponent(email)}` : ''}`;
    const searchRes = await safeFetch(searchUrl, { signal: AbortSignal.timeout(20000) });
    if (!searchRes.ok) throw new Error(`PubMed esearch status ${searchRes.status}`);
    const searchData = await searchRes.json();
    const pmids = searchData.esearchresult?.idlist || [];
    if (!pmids.length) return [];

    const summaryUrl = `${PUBMED_ESUMMARY}?db=pubmed&id=${pmids.join(',')}&retmode=json${email ? `&email=${encodeURIComponent(email)}` : ''}`;
    const summaryRes = await safeFetch(summaryUrl, { signal: AbortSignal.timeout(20000) });
    if (!summaryRes.ok) throw new Error(`PubMed esummary status ${summaryRes.status}`);
    const summaryData = await summaryRes.json();
    const uids = summaryData.result?.uids || [];
    return uids.map((id) => {
        const r = summaryData.result[id];
        return {
            title: r.title,
            year: r.pubdate ? parseInt(String(r.pubdate).slice(0, 4), 10) : null,
            citationCount: null,
            journal: { name: r.fulljournalname || r.source || null },
            externalIds: { DOI: (r.elocationid || '').replace(/^doi:\s*/i, '') || null, PubMed: id },
            publicationTypes: r.pubtype || [],
            uncitationRanked: true,
        };
    });
}

async function searchWellCitedArticles(query, opts) {
    try {
        return { source: 'semantic', papers: await semanticScholarSearch(query, opts) };
    } catch { /* fall through */ }
    try {
        return { source: 'openalex', papers: await openAlexSearch(query, opts) };
    } catch { /* fall through */ }
    return { source: 'pubmed', papers: await pubmedSearch(query, opts) };
}

function isReviewType(paper) {
    const types = (paper.publicationTypes || []).map((t) => String(t).toLowerCase());
    return types.some((t) => t.includes('review'));
}

function rankCandidates(papers) {
    // citationCount is null, not 0, from the PubMed fallback -- do not filter
    // those out by the citation floor, since there is no count to compare.
    return papers
        .filter((p) => p.title && (p.citationCount == null || Number(p.citationCount) >= MIN_CITATIONS))
        .map((p) => ({
            title: p.title,
            year: p.year || null,
            citationCount: p.citationCount == null ? null : Number(p.citationCount),
            journal: p.journal?.name || null,
            doi: p.externalIds?.DOI || null,
            pmid: p.externalIds?.PubMed || null,
            uid: p.externalIds?.PubMed ? `pmid:${p.externalIds.PubMed}` : (p.externalIds?.DOI ? `doi:${p.externalIds.DOI}` : null),
            isReview: isReviewType(p),
            citationRanked: !p.uncitationRanked,
        }))
        // Reviews first (better teaching synopses), then by citation count
        // when known -- ties (including all-null from the PubMed fallback)
        // keep PubMed's own relevance order.
        .sort((a, b) => (Number(b.isReview) - Number(a.isReview)) || ((b.citationCount || 0) - (a.citationCount || 0)))
        .slice(0, CANDIDATES_PER_TOPIC);
}

async function main() {
    await db.connect();

    const gapCsvPath = path.join(__dirname, '../../data/guideline-gap/topics-without-guidelines.csv');
    if (!fs.existsSync(gapCsvPath)) {
        throw new Error(`Gap report not found at ${gapCsvPath} -- run tools/data-hygiene/guideline-gap-report.js first`);
    }
    const csv = fs.readFileSync(gapCsvPath, 'utf8').split('\n').slice(1).filter(Boolean);
    let topics = csv.map((line) => {
        // topic,specialty,total_mcqs,has_paper_synopsis,priority -- topic/specialty may be quoted with escaped quotes.
        const m = line.match(/^"((?:[^"]|"")*)","((?:[^"]|"")*)",(\d+),(\w+),(\w+)$/);
        if (!m) return null;
        return {
            topic: m[1].replace(/""/g, '"'),
            specialty: m[2].replace(/""/g, '"'),
            totalMcqs: parseInt(m[3], 10),
            hasSynopsis: m[4] === 'yes',
            priority: m[5],
        };
    }).filter(Boolean);

    if (PRIORITY !== 'all') topics = topics.filter((t) => t.priority === PRIORITY);
    topics = topics.slice(0, LIMIT);

    console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}discovering well-cited articles for ${topics.length} gap topics (priority=${PRIORITY})`);

    const results = [];
    let withCandidates = 0, withoutCandidates = 0, errors = 0;
    const bySource = {};

    for (let i = 0; i < topics.length; i++) {
        const t = topics[i];
        try {
            const query = `${normalizeTopicForQuery(t.topic)} review`;
            const { source, papers } = await searchWellCitedArticles(query, { limit: 15 });
            bySource[source] = (bySource[source] || 0) + 1;
            const candidates = rankCandidates(papers);
            results.push({ ...t, candidates, discoverySource: source });
            if (candidates.length) withCandidates++; else withoutCandidates++;
            if (i % 25 === 0) {
                console.log(`  [${i + 1}/${topics.length}] ${t.topic.slice(0, 42).padEnd(44)} -> ${candidates.length} via ${source}`);
            }
        } catch (e) {
            errors++;
            results.push({ ...t, candidates: [], error: e.message.slice(0, 120) });
        }
        await sleep(1100); // Public APIs' unauthenticated/low-tier rate limits are tight.
    }

    console.log('\n=== DISCOVERY SUMMARY ===');
    console.log(`topics processed:        ${results.length}`);
    console.log(`with >=1 candidate:      ${withCandidates}`);
    console.log(`with zero candidates:    ${withoutCandidates}`);
    console.log(`errors:                  ${errors}`);
    const totalCandidates = results.reduce((s, r) => s + r.candidates.length, 0);
    console.log(`total candidate articles: ${totalCandidates}`);
    console.log('source used per topic:  ' + JSON.stringify(bySource));
    if (bySource.pubmed) {
        console.log(`\nNOTE: ${bySource.pubmed} topic(s) fell back to PubMed with no citation-count`);
        console.log('signal (Semantic Scholar and OpenAlex were both unavailable at run time --');
        console.log('expired key / exhausted budget, an account issue, not a code issue).');
        console.log('Those candidates are flagged citationRanked: false in the output.');
    }

    if (!DRY_RUN) {
        const outPath = path.join(__dirname, '../../data/guideline-gap/well-cited-candidates.json');
        fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
        console.log(`\nwrote ${outPath}`);
    }

    await db.close();
}

if (require.main === module) {
    main().catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { normalizeTopicForQuery, isReviewType, rankCandidates };
