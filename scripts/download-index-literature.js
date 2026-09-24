#!/usr/bin/env node
'use strict';

/**
 * Download highly-cited review / meta-analysis documents for the literature index.
 * Title-only rows are resolved with Europe PMC TITLE lookup (no guessed PMIDs).
 * JATS is stored when inPMC=Y; otherwise the abstract. HTTP 404/500 is a ceiling.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { loadEnv } = require('../config');
loadEnv();
const db = require('../database');

const INDEX = path.join(__dirname, '../outputs/highly-cited-literature-index/index-rows.json');
const REPORT = path.join(__dirname, '../outputs/highly-cited-literature-index/download-report.json');
const EPMC = 'https://www.ebi.ac.uk/europepmc/webservices/rest';
const UA = 'SignalMD/2.0 (literature-index download; academic-use)';
const PAUSE_MS = Number(process.env.PAUSE_MS || 500);
const MIN_JATS = 2000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function httpGet(url, { timeout = 45000 } = {}) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: { 'User-Agent': UA, Accept: 'application/json, application/xml;q=0.9,*/*;q=0.8' },
            timeout,
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                res.resume();
                return resolve(httpGet(new URL(res.headers.location, url).toString(), { timeout }));
            }
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const body = Buffer.concat(chunks).toString('utf8');
                if (res.statusCode === 200) return resolve(body);
                reject(Object.assign(new Error(`HTTP ${res.statusCode} for ${url}`), { statusCode: res.statusCode }));
            });
        });
        req.on('timeout', () => req.destroy(new Error(`Timeout for ${url}`)));
        req.on('error', reject);
    });
}

function xmlText(xml) {
    const match = String(xml || '').match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const body = match ? match[1] : String(xml || '');
    return body
        .replace(/<ref-list[\s\S]*?<\/ref-list>/gi, ' ')
        .replace(/<table-wrap[\s\S]*?<\/table-wrap>/gi, ' ')
        .replace(/<fig[\s\S]*?<\/fig>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ').trim();
}

function pmidFromUrl(url) {
    const m = String(url || '').match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i);
    return m ? m[1] : null;
}

function pmcidFromUrl(url) {
    const m = String(url || '').match(/pmc\.ncbi\.nlm\.nih\.gov\/articles\/(PMC\d+)/i);
    return m ? m[1].toUpperCase() : null;
}

function doiFromUrl(url) {
    const m = String(url || '').match(/doi\.org\/(10\.\S+)/i);
    return m ? decodeURIComponent(m[1]).replace(/\/$/, '').toLowerCase() : null;
}

const STOP = new Set(['with', 'from', 'that', 'this', 'than', 'into', 'over', 'after', 'before', 'among', 'between', 'using', 'versus', 'their', 'have', 'been', 'were', 'does', 'for', 'and', 'the', 'review', 'systematic', 'meta', 'analysis', 'article']);

function normTitle(s) {
    return String(s || '').toLowerCase().replace(/<[^>]+>/g, ' ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function titlesMatch(query, hitTitle) {
    const q = normTitle(String(query || '').split('(')[0]);
    const h = normTitle(hitTitle);
    if (!q || !h || q.length < 12) return false;
    if (h.includes(q) || q.includes(h)) return true;
    const qt = q.split(' ').filter((w) => w.length >= 4 && !STOP.has(w));
    const ht = new Set(h.split(' ').filter((w) => w.length >= 4));
    if (qt.length < 3) return false;
    let n = 0;
    for (const w of qt) if (ht.has(w)) n += 1;
    return n / qt.length >= 0.7;
}

function identities(doc) {
    return new Set([doc.pmcid, doc.pmid, doc.doi, doc.url, doc.sourceUrl]
        .filter(Boolean).map((value) => String(value).trim().toLowerCase()));
}

function sameDocument(left, right) {
    const a = identities(left);
    if ([...identities(right)].some((value) => a.has(value))) return true;
    const lt = String(left.title || '').trim().toLowerCase();
    const rt = String(right.title || '').trim().toLowerCase();
    return Boolean(lt && rt && lt === rt);
}

async function searchEuropePmc(query) {
    const raw = await httpGet(`${EPMC}/search?query=${encodeURIComponent(query)}&format=json&resultType=core&pageSize=5`);
    return JSON.parse(raw)?.resultList?.result || [];
}

async function resolveByTitle(title, kind) {
    const core = String(title || '').split('(')[0].replace(/\s+/g, ' ').trim();
    if (core.length < 12) return null;
    const typeClause = /meta/i.test(kind)
        ? ' AND (TITLE:"meta-analysis" OR TITLE:"systematic review" OR PUB_TYPE:"Review")'
        : ' AND PUB_TYPE:"Review"';
    const queries = [
        `TITLE:"${core}"${typeClause}`,
        `TITLE:"${core}"`,
    ];
    for (const query of queries) {
        let hits = [];
        try { hits = await searchEuropePmc(query); } catch { continue; }
        const hit = hits.find((row) => titlesMatch(core, row.title));
        if (hit?.pmid || hit?.pmcid) return hit;
        await sleep(200);
    }
    return null;
}

async function fromEuropePmc({ pmid, pmcid, doi }) {
    const query = pmcid ? `PMCID:${pmcid}`
        : (pmid ? `EXT_ID:${pmid} AND SRC:MED` : (doi ? `DOI:${doi}` : null));
    if (!query) return null;
    const raw = await httpGet(`${EPMC}/search?query=${encodeURIComponent(query)}&format=json&resultType=core&pageSize=1`);
    const hit = JSON.parse(raw)?.resultList?.result?.[0];
    if (!hit) return null;
    const id = hit.pmcid || pmcid || null;
    let fullText = String(hit.abstractText || '').trim() || null;
    let fullTextSource = fullText ? 'abstract' : null;
    if (id && String(hit.inPMC || '').toUpperCase() === 'Y') {
        try {
            const xml = await httpGet(`${EPMC}/${encodeURIComponent(id)}/fullTextXML`);
            const text = xmlText(xml);
            if (text.length >= MIN_JATS && text.length > String(fullText || '').length) {
                fullText = text;
                fullTextSource = 'jats';
            }
        } catch { /* ceiling */ }
    }
    return {
        pmcid: id,
        pmid: hit.pmid || pmid || null,
        doi: hit.doi || null,
        title: hit.title || null,
        sourceBody: hit.journalTitle || null,
        year: hit.pubYear ? Number(hit.pubYear) : null,
        url: hit.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${hit.pmid}/` : null,
        fullText,
        fullTextSource,
    };
}

async function alreadyFull({ pmid, pmcid, url, doi }) {
    if (pmcid) {
        const hit = await db.getGuidelineDocumentByPmcid(pmcid).catch(() => null);
        if (hit?.full_text_source === 'jats' && Number(hit.word_count || 0) >= 500) return hit;
    }
    if (pmid) {
        const hit = await db.get('SELECT * FROM guideline_documents WHERE pmid = ? LIMIT 1', [pmid]);
        if (hit?.full_text_source === 'jats' && Number(hit.word_count || 0) >= 500) return hit;
    }
    if (doi) {
        const hit = await db.get('SELECT * FROM guideline_documents WHERE doi = ? LIMIT 1', [String(doi).toLowerCase()]);
        if (hit?.full_text_source === 'jats' && Number(hit.word_count || 0) >= 500) return hit;
    }
    if (url) {
        const hit = await db.get('SELECT * FROM guideline_documents WHERE source_url = ? LIMIT 1', [url]);
        if (hit && ['jats', 'pdf', 'manual'].includes(hit.full_text_source) && Number(hit.word_count || 0) >= 500) return hit;
    }
    return null;
}

async function attachToTopic(topic, stored) {
    const existing = await db.getTopicKnowledge(topic).catch(() => null);
    const articles = Array.isArray(existing?.sourceArticles) ? [...existing.sourceArticles] : [];
    const article = {
        documentId: stored.documentId,
        title: stored.title,
        url: stored.url,
        pmcid: stored.pmcid || null,
        pmid: stored.pmid || null,
        doi: stored.doi || null,
        year: stored.year || null,
        evidenceType: stored.documentLabel,
        locallyStored: true,
        bodyStored: stored.fullTextSource === 'jats' || stored.fullTextSource === 'manual',
    };
    const match = articles.findIndex((item) => sameDocument(item, article));
    if (match >= 0) articles[match] = { ...articles[match], ...article };
    else articles.push(article);
    await db.upsertTopicKnowledge(topic, existing?.knowledge || {}, articles, existing?.status || 'curated_ingested', existing?.confidence ?? 0.95);
}

async function storeOne({ topic, title, url, pmid, pmcid, doi, documentLabel }) {
    const ids = {
        pmid: pmid || pmidFromUrl(url),
        pmcid: pmcid || pmcidFromUrl(url),
        doi: doi || doiFromUrl(url),
        url,
    };
    if (!ids.pmid && !ids.pmcid && !ids.doi && title) {
        const hit = await resolveByTitle(title, documentLabel);
        if (!hit) return { topic, kind: documentLabel, action: 'unmatched_title', title };
        ids.pmid = hit.pmid || null;
        ids.pmcid = hit.pmcid || null;
        ids.doi = hit.doi || ids.doi;
        if (!ids.url && hit.pmid) ids.url = `https://pubmed.ncbi.nlm.nih.gov/${hit.pmid}/`;
    }
    if (!ids.pmid && !ids.pmcid && !ids.doi && !ids.url) {
        return { topic, kind: documentLabel, action: 'skip_no_url', title };
    }
    const existing = await alreadyFull(ids);
    if (existing) {
        await attachToTopic(topic, {
            documentId: existing.id,
            title: existing.title,
            url: existing.source_url || url,
            pmcid: existing.pmcid,
            pmid: existing.pmid,
            doi: existing.doi,
            year: existing.source_year,
            documentLabel,
            fullTextSource: existing.full_text_source,
        });
        return {
            topic, kind: documentLabel, action: 'already_full',
            source: existing.full_text_source, words: existing.word_count,
            documentId: existing.id, title: existing.title, url: existing.source_url || url,
            pmcid: existing.pmcid, pmid: existing.pmid, doi: existing.doi, year: existing.source_year,
            fullTextSource: existing.full_text_source,
        };
    }
    const doc = await fromEuropePmc(ids) || {
        title, url, pmid: ids.pmid, pmcid: ids.pmcid, fullText: null, fullTextSource: null,
    };
    if (!doc.title) doc.title = title;
    if (!doc.url) doc.url = url;
    const documentId = await db.upsertGuidelineDocument({
        pmcid: doc.pmcid,
        pmid: doc.pmid,
        doi: doc.doi,
        title: doc.title,
        sourceBody: doc.sourceBody,
        sourceYear: doc.year,
        sourceUrl: doc.url,
        documentLabel,
        evidenceTier: 'literature',
        fullText: doc.fullText,
        fullTextSource: doc.fullTextSource,
    });
    await attachToTopic(topic, { ...doc, documentId, documentLabel });
    return {
        topic,
        kind: documentLabel,
        action: doc.fullTextSource === 'jats' ? 'stored_full' : (doc.fullTextSource === 'abstract' ? 'stored_abstract' : 'stored_metadata'),
        source: doc.fullTextSource,
        words: doc.fullText ? doc.fullText.trim().split(/\s+/).length : 0,
        documentId,
        title: doc.title,
        url: doc.url,
        pmcid: doc.pmcid,
        pmid: doc.pmid,
        doi: doc.doi,
        year: doc.year,
        fullTextSource: doc.fullTextSource,
    };
}

async function main() {
    const rows = JSON.parse(fs.readFileSync(INDEX, 'utf8'));
    const jobs = [];
    for (const row of rows) {
        if (row.reviewTitle || row.reviewUrl) {
            jobs.push({
                topic: row.topic,
                title: row.reviewTitle,
                url: row.reviewUrl,
                pmid: row.reviewPmid,
                pmcid: row.reviewPmcid,
                documentLabel: 'review_article',
            });
        }
        if (row.metaTitle || row.metaUrl) {
            jobs.push({
                topic: row.topic,
                title: row.metaTitle,
                url: row.metaUrl,
                pmid: row.metaPmid,
                pmcid: row.metaPmcid,
                documentLabel: 'systematic_review_meta_analysis',
            });
        }
    }
    const cache = new Map();
    await db.connect();
    const results = [];
    try {
        for (let i = 0; i < jobs.length; i += 1) {
            const job = jobs[i];
            const cacheKey = String(job.pmid || job.pmcid || job.url || job.title || '').toLowerCase();
            process.stdout.write(`[${i + 1}/${jobs.length}] ${job.documentLabel} :: ${job.topic} ... `);
            try {
                let result;
                if (cacheKey && cache.has(cacheKey)) {
                    result = { ...cache.get(cacheKey), topic: job.topic, action: `cached_${cache.get(cacheKey).action}` };
                    if (cache.get(cacheKey).documentId) {
                        await attachToTopic(job.topic, {
                            ...cache.get(cacheKey),
                            documentLabel: job.documentLabel,
                        });
                    }
                } else {
                    result = await storeOne(job);
                    if (cacheKey) cache.set(cacheKey, result);
                    await sleep(PAUSE_MS);
                }
                results.push(result);
                console.log(result.action, result.source || '', result.words || 0);
            } catch (err) {
                const failed = { topic: job.topic, kind: job.documentLabel, action: 'error', error: String(err.message || err).slice(0, 200) };
                results.push(failed);
                console.log('error', failed.error);
            }
        }
    } finally {
        const summary = {
            runAt: new Date().toISOString(),
            attempted: results.length,
            alreadyFull: results.filter((r) => String(r.action).includes('already_full')).length,
            storedFull: results.filter((r) => r.action === 'stored_full' || r.action === 'cached_stored_full').length,
            storedAbstract: results.filter((r) => String(r.action).includes('stored_abstract')).length,
            storedMetadata: results.filter((r) => String(r.action).includes('stored_metadata')).length,
            unmatchedTitle: results.filter((r) => r.action === 'unmatched_title').length,
            errors: results.filter((r) => r.action === 'error').length,
            results,
        };
        const CATALOG = path.join(__dirname, '../data/curated-literature-corpus.json');
        try {
            const corpus = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
            let patched = 0;
            for (const r of results) {
                if (!r.pmid || !r.topic || String(r.action).includes('unmatched')) continue;
                const topic = corpus.topics.find((t) => t.topic === r.topic);
                if (!topic) continue;
                for (const doc of topic.documents || []) {
                    if (doc.pmid || doc.pmcid) continue;
                    if (doc.type !== r.kind) continue;
                    if (!titlesMatch(doc.title, r.title) && normTitle(doc.title) !== normTitle(r.title)) continue;
                    doc.pmid = String(r.pmid);
                    doc.url = r.url || `https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`;
                    if (r.pmcid) doc.pmcid = r.pmcid;
                    patched += 1;
                    break;
                }
            }
            if (patched) {
                corpus.updatedAt = new Date().toISOString();
                fs.writeFileSync(CATALOG, JSON.stringify(corpus, null, 2));
            }
            summary.corpusPmidsPatched = patched;
        } catch (err) {
            summary.corpusPatchError = String(err.message || err);
        }
        fs.writeFileSync(REPORT, JSON.stringify(summary, null, 2));
        console.log(JSON.stringify({
            attempted: summary.attempted,
            alreadyFull: summary.alreadyFull,
            storedFull: summary.storedFull,
            storedAbstract: summary.storedAbstract,
            storedMetadata: summary.storedMetadata,
            unmatchedTitle: summary.unmatchedTitle,
            corpusPmidsPatched: summary.corpusPmidsPatched || 0,
            errors: summary.errors,
            report: REPORT,
        }, null, 2));
        await db.close();
    }
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
