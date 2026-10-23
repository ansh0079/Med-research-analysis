'use strict';

/**
 * Batch-verifies all PMIDs referenced in `topic_knowledge.source_articles` and
 * `teaching_objects` against NCBI Entrez `esummary` API.
 *
 * - Writes `database/seeds/verified_pubmed_pmids.json` mapping verified PMIDs
 *   to their canonical PubMed titles so production PostgreSQL can apply the exact
 *   same deterministic sanitization via `scripts/fix-mcq-and-topic-integrity.js`.
 * - Sanitizes local `database/app.db` in place (`node:sqlite`).
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, '..', 'database', 'app.db');
const VERIFIED_JSON_PATH = path.join(__dirname, '..', 'database', 'seeds', 'verified_pubmed_pmids.json');

const STOP = new Set([
    'the', 'and', 'for', 'that', 'this', 'with', 'without', 'management', 'guideline',
    'guidelines', 'study', 'trial', 'trials', 'treatment', 'clinical', 'versus', 'from',
    'after', 'before', 'adults', 'children', 'people', 'disease', 'review', 'systematic',
    'therapy', 'therapies', 'diagnosis', 'randomized', 'randomised', 'phase', 'results',
    'cohort', 'retrospective', 'prospective', 'international', 'system', 'effect',
    'effects', 'outcomes', 'outcome', 'analysis', 'using', 'based', 'associated', 'risk',
    'care', 'practice', 'update', 'updated', 'american', 'european', 'society',
    'association', 'college', 'national', 'world', 'health', 'organization', 'first',
    'line', 'second', 'early', 'late', 'high', 'dose', 'low', 'combined', 'plus', 'alone',
    'open', 'label', 'double', 'blind', 'placebo', 'controlled', 'multicenter', 'multi',
    'institutional', 'report', 'group', 'working', 'task', 'force', 'consensus',
    'statement', 'recommendations', 'recommendation', 'approach', 'approaches', 'new',
    'novel', 'current', 'modern', 'standard', 'optimal', 'initial', 'long', 'term',
    'short', 'year', 'years', 'patients', 'patient'
]);

function domainTokens(s) {
    return new Set(
        String(s || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .split(/\s+/)
            .filter(w => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w))
    );
}

function titlesMatch(expectedTitle, actualPubmedTitle) {
    if (!expectedTitle || !actualPubmedTitle) return false;
    const wordsA = domainTokens(expectedTitle);
    const wordsB = domainTokens(actualPubmedTitle);
    if (wordsA.size === 0 || wordsB.size === 0) return false;

    let overlap = 0;
    for (const w of wordsA) {
        if (wordsB.has(w)) overlap++;
    }
    const minSize = Math.min(wordsA.size, wordsB.size) || 1;
    const ratio = overlap / minSize;
    return (overlap >= 2 && ratio >= 0.34) || (overlap >= 1 && minSize <= 2 && ratio >= 0.5) || ratio >= 0.5;
}

const sleep = ms => new Promise(res => setTimeout(res, ms));

async function fetchPubmedSummariesBatch(pmids, attempt = 1) {
    const body = new URLSearchParams({
        db: 'pubmed',
        retmode: 'json',
        id: pmids.join(',')
    });
    try {
        const res = await fetch('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString()
        });
        if (!res.ok) {
            if (attempt <= 4) {
                await sleep(1000 * attempt);
                return fetchPubmedSummariesBatch(pmids, attempt + 1);
            }
            throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        return data.result || {};
    } catch (err) {
        if (attempt <= 4) {
            await sleep(1000 * attempt);
            return fetchPubmedSummariesBatch(pmids, attempt + 1);
        }
        console.error('Batch esummary failed:', err.message);
        return {};
    }
}

async function main() {
    const db = new DatabaseSync(DB_PATH);

    const tkRows = db.prepare('SELECT id, topic, source_articles FROM topic_knowledge').all();
    const toRows = db.prepare("SELECT id, object_type, object_payload FROM teaching_objects WHERE object_type = 'paper'").all();

    const allPmids = new Set();
    for (const r of tkRows) {
        let arts = [];
        try { arts = JSON.parse(r.source_articles || '[]'); } catch (e) {}
        for (const a of arts) {
            const p = String(a.pmid || a.uid || '').replace(/^(?:pmid|pubmed)[-:]?/i, '').trim();
            if (/^\d+$/.test(p)) allPmids.add(p);
        }
    }
    for (const r of toRows) {
        let p = {};
        try { p = JSON.parse(r.object_payload || '{}'); } catch (e) {}
        const id = String(p.pmid || p.uid || '').replace(/^(?:pmid|pubmed)[-:]?/i, '').trim();
        if (/^\d+$/.test(id)) allPmids.add(id);
    }

    const pmidList = [...allPmids];
    console.log(`Found ${pmidList.length} distinct PMIDs across topic_knowledge and teaching_objects.`);

    const pubmedMap = {};
    const BATCH_SIZE = 200;
    for (let i = 0; i < pmidList.length; i += BATCH_SIZE) {
        const batch = pmidList.slice(i, i + BATCH_SIZE);
        const result = await fetchPubmedSummariesBatch(batch);
        for (const pmid of batch) {
            const item = result[pmid];
            if (item && item.title) {
                pubmedMap[pmid] = String(item.title).trim();
            }
        }
        if ((i / BATCH_SIZE) % 5 === 0 || i + BATCH_SIZE >= pmidList.length) {
            console.log(`Fetched PubMed esummary for ${Math.min(i + BATCH_SIZE, pmidList.length)} / ${pmidList.length} PMIDs...`);
        }
        await sleep(360);
    }

    // Track which (pmid) is genuinely verified for at least one matching article title
    const verifiedPmids = {};
    let tkRowsUpdated = 0;
    let tkArticlesVerified = 0;
    let tkArticlesSanitized = 0;

    const updateTkStmt = db.prepare('UPDATE topic_knowledge SET source_articles = ? WHERE id = ?');

    for (const r of tkRows) {
        let changed = false;
        let arts = [];
        try { arts = JSON.parse(r.source_articles || '[]'); } catch (e) { continue; }
        for (const a of arts) {
            const pmid = String(a.pmid || a.uid || '').replace(/^(?:pmid|pubmed)[-:]?/i, '').trim();
            if (!/^\d+$/.test(pmid)) continue;

            const actualTitle = pubmedMap[pmid];
            if (actualTitle && titlesMatch(a.title, actualTitle)) {
                tkArticlesVerified++;
                verifiedPmids[pmid] = actualTitle;
            } else {
                a.pmid = null;
                if (a.uid && /^(?:pmid|pubmed)[-:]?/i.test(String(a.uid))) {
                    a.uid = `article:title:${encodeURIComponent(String(a.title || '').slice(0, 80))}`;
                }
                changed = true;
                tkArticlesSanitized++;
            }
        }
        if (changed) {
            updateTkStmt.run(JSON.stringify(arts), r.id);
            tkRowsUpdated++;
        }
    }

    let toPaperVerified = 0;
    let toPaperSanitized = 0;
    const updateToStmt = db.prepare('UPDATE teaching_objects SET object_payload = ? WHERE id = ?');

    for (const r of toRows) {
        let payload = {};
        try { payload = JSON.parse(r.object_payload || '{}'); } catch (e) { continue; }
        const pmid = String(payload.pmid || payload.uid || '').replace(/^(?:pmid|pubmed)[-:]?/i, '').trim();
        if (!/^\d+$/.test(pmid)) continue;

        const actualTitle = pubmedMap[pmid];
        if (actualTitle && titlesMatch(payload.title, actualTitle)) {
            toPaperVerified++;
            verifiedPmids[pmid] = actualTitle;
        } else {
            payload.pmid = null;
            if (payload.uid && /^(?:pmid|pubmed)[-:]?/i.test(String(payload.uid))) {
                payload.uid = `article:title:${encodeURIComponent(String(payload.title || '').slice(0, 80))}`;
            }
            updateToStmt.run(JSON.stringify(payload), r.id);
            toPaperSanitized++;
        }
    }

    fs.mkdirSync(path.dirname(VERIFIED_JSON_PATH), { recursive: true });
    fs.writeFileSync(VERIFIED_JSON_PATH, JSON.stringify(verifiedPmids, null, 2));

    console.log('\n=== PubMed PMID Verification Summary ===');
    console.log({
        totalDistinctPmidsChecked: pmidList.length,
        verifiedPmidsSaved: Object.keys(verifiedPmids).length,
        topicKnowledgeRowsUpdated: tkRowsUpdated,
        topicKnowledgeArticlesVerified: tkArticlesVerified,
        topicKnowledgeArticlesSanitized: tkArticlesSanitized,
        teachingObjectsPapersVerified: toPaperVerified,
        teachingObjectsPapersSanitized: toPaperSanitized
    });
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
