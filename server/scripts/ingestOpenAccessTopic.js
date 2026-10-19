'use strict';

/**
 * ingestOpenAccessTopic.js
 *
 * Find open-access guidelines, systematic reviews, meta-analyses and reviews on one topic in Europe PMC,
 * download their full text (JATS) and store them in guideline_documents, so the mentor can quote their
 * recommendations. Nothing paywalled is fetched: every record must be flagged open access with full text.
 *
 * Usage:
 *   node server/scripts/ingestOpenAccessTopic.js --query "<europe pmc title/abstract query>" [--limit 15]
 *        [--since 2016] [--dry-run]
 *
 * Example:
 *   --query '("alcohol-associated liver disease" OR "alcoholic hepatitis" OR "alcohol-related liver disease")'
 */

const { loadEnv } = require('../../config');
loadEnv();

const db = require('../../database');
const { fetchFullText, getWithRetry } = require('../services/guideline/guidelineFullTextRefresh');

const EPMC = 'https://www.ebi.ac.uk/europepmc/webservices/rest';
const args = process.argv.slice(2);
const arg = (name, fallback = null) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const QUERY = arg('--query');
const LIMIT = parseInt(arg('--limit', '15'), 10);
const SINCE = parseInt(arg('--since', '2016'), 10);
const DRY_RUN = args.includes('--dry-run');
if (!QUERY) {
    console.error('Refusing to run without --query.');
    process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Highest authority first; a record takes the first design it matches.
const DESIGNS = [
    { label: 'Clinical practice guideline', match: /guideline|practice (?:update|parameter)|consensus/i },
    { label: 'Meta-analysis', match: /meta-?analys/i },
    { label: 'Systematic review', match: /systematic review/i },
    { label: 'Review', match: /\breview\b/i },
];

function designOf(rec) {
    const types = [].concat(rec.pubTypeList?.pubType || []).join(' ');
    const hay = `${rec.title || ''} ${types}`;
    return DESIGNS.find((d) => d.match.test(hay)) || null;
}

async function search(typeClause, size) {
    const q = `(${QUERY}) AND OPEN_ACCESS:y AND HAS_FT:y AND PUB_YEAR:[${SINCE} TO 2030] AND (${typeClause}) AND (SRC:MED)`;
    const url = `${EPMC}/search?query=${encodeURIComponent(q)}&resultType=core&format=json&pageSize=${size}`;
    const body = await getWithRetry(url);
    return JSON.parse(body).resultList?.result || [];
}

(async () => {
    await db.connect();
    const pool = new Map();
    const clauses = [
        'PUB_TYPE:"Practice Guideline" OR PUB_TYPE:"Guideline" OR TITLE:"guideline" OR TITLE:"consensus"',
        'PUB_TYPE:"Meta-Analysis" OR TITLE:"meta-analysis"',
        'PUB_TYPE:"Systematic Review" OR TITLE:"systematic review"',
        'PUB_TYPE:"Review" OR TITLE:"review"',
    ];
    for (const c of clauses) {
        for (const rec of await search(c, Math.max(LIMIT, 10))) {
            if (rec.pmcid && !pool.has(rec.pmcid)) pool.set(rec.pmcid, rec);
        }
        await sleep(300);
    }
    // Animal, cell and other preclinical work cannot yield recommendations for patients.
    const PRECLINICAL = /\b(?:animal|preclinical|in vitro|murine|mouse|mice|rodent|rat model|stem cell|zebrafish)\b/i;
    const candidates = [...pool.values()].filter((rec) => !PRECLINICAL.test(String(rec.title || '')))
        .map((rec) => ({ rec, design: designOf(rec) })).filter((x) => x.design)
        .slice(0, LIMIT * 2);
    console.log(`${candidates.length} candidate(s) found${DRY_RUN ? ' (dry run)' : ''}`);

    let stored = 0;
    const ids = [];
    for (const { rec, design } of candidates) {
        if (stored >= LIMIT) break;
        const line = `${rec.pmcid} [${design.label}] ${rec.pubYear} ${String(rec.title).slice(0, 90)}`;
        if (DRY_RUN) { console.log(line); continue; }
        const known = await db.get('SELECT id, full_text_source FROM guideline_documents WHERE pmcid = ? OR pmid = ? LIMIT 1', [rec.pmcid, rec.pmid || '-']);
        if (known && known.full_text_source === 'jats') { console.log(`skip (already stored) ${line}`); continue; }
        try {
            const text = await fetchFullText(rec.pmcid);
            const id = await db.upsertGuidelineDocument({
                pmcid: rec.pmcid,
                pmid: rec.pmid || null,
                doi: rec.doi || null,
                title: String(rec.title || '').replace(/\.$/, '') + '.',
                sourceBody: rec.journalTitle || null,
                sourceYear: rec.pubYear ? Number(rec.pubYear) : null,
                sourceUrl: `https://www.ncbi.nlm.nih.gov/pmc/articles/${rec.pmcid}/`,
                documentLabel: design.label,
                evidenceTier: design.label === 'Clinical practice guideline' ? 'guideline' : 'review',
                fullText: text,
                fullTextSource: 'jats',
            });
            stored += 1;
            ids.push(id);
            console.log(`stored #${id} ${line} (${text.length} chars)`);
        } catch (err) {
            console.log(`skip (${err.message}) ${line}`);
        }
        await sleep(500);
    }
    console.log(`done: ${stored} document(s) stored${ids.length ? `, ids ${ids.join(',')}` : ''}`);
    process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
