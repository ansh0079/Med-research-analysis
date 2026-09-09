'use strict';

/**
 * Reclassify stored papers whose study type was never determined.
 *
 * 4,460 of 6,000 paper teaching objects carry studyType "other" (2,227) or no
 * studyType at all (2,233). That makes them unusable for anything that ranks by
 * evidence level -- notably the fallback that should surface a systematic review
 * when a topic has no guideline.
 *
 * The cause is that buildPaperTeachingObject derived studyType from
 * article.pubtype and then stored only the answer, discarding the input. So the
 * classification cannot be recomputed locally; the publication types have to be
 * fetched again. (That is now fixed at the write site -- pubtype is persisted --
 * so this backfill is a one-off for rows written before it.)
 *
 * Two populations, both recoverable:
 *   - 2,572 rows carry a PMID (in the payload or in article_uid). PubMed
 *     esummary returns authoritative pubtype for 200 ids per request.
 *   - 1,886 rows carry a DOI or an OpenAlex work id. OpenAlex returns
 *     type/type_crossref.
 * Only 2 rows of 4,460 have nothing but a title.
 *
 * No LLM is involved: this is a metadata refetch, and the classifier is the same
 * inferStudyType the write path uses, so backfilled rows and new rows agree.
 *
 *   DRY_RUN=0 node server/scripts/backfillPaperStudyType.js
 *   DRY_RUN=0 LIMIT=200 node server/scripts/backfillPaperStudyType.js
 */

const db = require('../../database');
const logger = require('../config/logger');
const { buildProxyService } = require('../services/externalApiProxy');
const { safeFetch } = require('../utils/fetch');

const DRY_RUN = process.env.DRY_RUN !== '0';
const LIMIT = Number(process.env.LIMIT) > 0 ? Number(process.env.LIMIT) : Infinity;
const PUBMED_BATCH = 150;
const OPENALEX_BATCH = 50;

/** Same rules as the write path, so backfilled rows match newly written ones. */
function classify({ pubtype = [], title = '', studyDesign = '' }) {
    const text = [studyDesign, ...(Array.isArray(pubtype) ? pubtype : []), title]
        .filter(Boolean).join(' ').toLowerCase();
    if (/meta|systematic review/.test(text)) return 'meta_analysis';
    if (/random|rct|trial/.test(text)) return 'randomized_trial';
    if (/cohort/.test(text)) return 'cohort';
    if (/case.control/.test(text)) return 'case_control';
    if (/guideline|consensus|statement/.test(text)) return 'guideline_or_statement';
    return 'other';
}

function pmidOf(row) {
    const fromPayload = row.payload?.paper?.pmid;
    if (fromPayload) return String(fromPayload).trim();
    const m = String(row.article_uid || '').match(/^(?:pubmed-|pmid:)(\d+)$/);
    return m ? m[1] : null;
}

function openAlexIdOf(row) {
    const uid = String(row.article_uid || '');
    if (uid.startsWith('https://openalex.org/')) return uid.replace('https://openalex.org/', '');
    return null;
}

function chunk(items, size) {
    const out = [];
    for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
    return out;
}

async function loadCandidates() {
    const rows = await db.all(
        `SELECT id, article_uid, object_payload FROM teaching_objects WHERE object_type = 'paper'`,
        [],
    );
    const candidates = [];
    for (const row of rows) {
        let payload;
        try {
            payload = typeof row.object_payload === 'string'
                ? JSON.parse(row.object_payload)
                : row.object_payload;
        } catch {
            continue;
        }
        const studyType = payload?.paper?.studyType || null;
        // Only rows the classifier never resolved. Anything already typed is
        // left alone -- a backfill that rewrites good data is how you lose it.
        if (studyType && studyType !== 'other') continue;
        candidates.push({ id: row.id, article_uid: row.article_uid, payload });
        if (candidates.length >= LIMIT) break;
    }
    return candidates;
}

async function writeBack(row, pubtype, studyType) {
    const payload = row.payload;
    payload.paper = payload.paper || {};
    payload.paper.pubtype = Array.isArray(pubtype) ? pubtype.slice(0, 12) : [];
    payload.paper.studyType = studyType;
    payload.paper.studyTypeBackfilledAt = new Date().toISOString();
    if (DRY_RUN) return;
    await db.run(
        `UPDATE teaching_objects SET object_payload = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [JSON.stringify(payload), row.id],
    );
}

async function backfillFromPubMed(rows, proxy, stats) {
    const byPmid = new Map();
    for (const row of rows) {
        const pmid = pmidOf(row);
        if (pmid) byPmid.set(pmid, row);
    }
    for (const batch of chunk([...byPmid.keys()], PUBMED_BATCH)) {
        let articles = [];
        try {
            articles = await proxy.pubmedFetchByIds(batch);
        } catch (err) {
            logger.warn({ err, size: batch.length }, 'pubmed batch failed');
            stats.fetchErrors += batch.length;
            continue;
        }
        for (const article of articles) {
            const row = byPmid.get(String(article.pmid));
            if (!row) continue;
            const studyType = classify({
                pubtype: article.pubtype,
                title: article.title || row.payload?.paper?.title,
            });
            await writeBack(row, article.pubtype, studyType);
            stats.byType[studyType] = (stats.byType[studyType] || 0) + 1;
            stats.updated += 1;
            byPmid.delete(String(article.pmid));
        }
    }
    stats.pubmedUnresolved += byPmid.size;
    return new Set([...byPmid.values()].map((r) => r.id));
}

async function backfillFromOpenAlex(rows, stats) {
    const byId = new Map();
    for (const row of rows) {
        const id = openAlexIdOf(row);
        const doi = row.payload?.paper?.doi;
        const key = id || (doi ? `doi:${String(doi).replace(/^https?:\/\/doi\.org\//, '')}` : null);
        if (key) byId.set(key, row);
    }
    for (const batch of chunk([...byId.keys()], OPENALEX_BATCH)) {
        const filter = `openalex_id:${batch.filter((k) => !k.startsWith('doi:')).join('|')}`;
        const doiFilter = `doi:${batch.filter((k) => k.startsWith('doi:')).map((k) => k.slice(4)).join('|')}`;
        const active = batch.some((k) => k.startsWith('doi:')) && batch.every((k) => k.startsWith('doi:'))
            ? doiFilter
            : filter;
        const url = `https://api.openalex.org/works?filter=${encodeURIComponent(active)}&per-page=${OPENALEX_BATCH}&select=id,doi,title,type,type_crossref`;
        let works = [];
        try {
            const res = await safeFetch(url, { timeout: 20000 });
            if (!res.ok) throw new Error(`OpenAlex ${res.status}`);
            works = (await res.json()).results || [];
        } catch (err) {
            logger.warn({ err, size: batch.length }, 'openalex batch failed');
            stats.fetchErrors += batch.length;
            continue;
        }
        for (const work of works) {
            const shortId = String(work.id || '').replace('https://openalex.org/', '');
            const doiKey = work.doi ? `doi:${String(work.doi).replace(/^https?:\/\/doi\.org\//, '')}` : null;
            const row = byId.get(shortId) || (doiKey ? byId.get(doiKey) : null);
            if (!row) continue;
            // OpenAlex types are coarser than PubMed pubtypes but distinguish
            // review from article, which is the distinction the evidence ladder
            // actually needs.
            const types = [work.type, work.type_crossref].filter(Boolean);
            const studyType = classify({ pubtype: types, title: work.title || row.payload?.paper?.title });
            await writeBack(row, types, studyType);
            stats.byType[studyType] = (stats.byType[studyType] || 0) + 1;
            stats.updated += 1;
            byId.delete(shortId);
            if (doiKey) byId.delete(doiKey);
        }
    }
    stats.openalexUnresolved += byId.size;
}

(async () => {
    await db.connect();
    const proxy = buildProxyService({
        serverConfig: {
            keys: {
                pubmed: process.env.PUBMED_API_KEY,
                ncbi: process.env.NCBI_API_KEY,
                openalex: process.env.OPENALEX_API_KEY,
            },
            email: process.env.PUBMED_EMAIL || process.env.CONTACT_EMAIL,
        },
        fetchImpl: safeFetch,
    });

    const candidates = await loadCandidates();
    const stats = {
        candidates: candidates.length,
        updated: 0,
        byType: {},
        fetchErrors: 0,
        pubmedUnresolved: 0,
        openalexUnresolved: 0,
    };
    console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}candidates: ${candidates.length}`);

    const withPmid = candidates.filter((r) => pmidOf(r));
    const leftover = await backfillFromPubMed(withPmid, proxy, stats);
    const rest = candidates.filter((r) => !pmidOf(r) || leftover.has(r.id));
    await backfillFromOpenAlex(rest, stats);

    console.log(JSON.stringify(stats, null, 2));
    if (DRY_RUN) console.log('\nDRY RUN — nothing written. Re-run with DRY_RUN=0 to apply.');
    process.exit(0);
})().catch((err) => {
    console.error('backfill failed:', err.message);
    process.exit(1);
});
