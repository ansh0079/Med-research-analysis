#!/usr/bin/env node
'use strict';

/**
 * Download guideline text for Clinical_Guidelines_Index URLs and store locally.
 *
 * PMC / PubMed: Europe PMC JATS when inPMC=Y, otherwise the abstract.
 * NICE / WHO / other HTML: public page text as fullTextSource=manual.
 * Title-only rows are skipped. HTTP 404/500 after retry is a content ceiling,
 * not an application failure.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { loadEnv } = require('../config');
loadEnv();
const db = require('../database');

const INDEX = path.join(__dirname, '../outputs/clinical-guidelines-index/index-rows.json');
const REPORT = path.join(__dirname, '../outputs/clinical-guidelines-index/download-report.json');
const EPMC = 'https://www.ebi.ac.uk/europepmc/webservices/rest';
const UA = 'SignalMD/2.0 (guideline-index download; academic-use; +https://signalmd.co)';
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = Number(process.env.LIMIT || 0);
const PAUSE_MS = Number(process.env.PAUSE_MS || 500);
const MIN_JATS = 2000;
const MIN_HTML = 3000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function httpGet(url, { timeout = 45000 } = {}) {
    return new Promise((resolve, reject) => {
        const target = new URL(url);
        const lib = target.protocol === 'http:' ? http : https;
        const req = lib.get(url, {
            headers: { 'User-Agent': UA, Accept: 'text/html,application/json,application/xml;q=0.9,*/*;q=0.8' },
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
                const err = new Error(`HTTP ${res.statusCode} for ${url}`);
                err.statusCode = res.statusCode;
                reject(err);
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
        .replace(/&#x27;|&apos;/g, "'").replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ').trim();
}

function htmlText(html) {
    return String(html || '')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
        .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/\s+/g, ' ').trim();
}

function parseNiceRecommendations(html) {
    const recs = [];
    const itemRe = /<(?:p|li)([^>]*)>((?:[^<]|<(?!\/(?:p|li)>))*?)<\/(?:p|li)>/gi;
    const verb = /\b(should|should not|recommend|must|offer|consider|avoid|do not|initiate|start|prescribe|screen|monitor|refer|first-line|second-line|indicated|contraindicated)\b/i;
    let m;
    while ((m = itemRe.exec(html)) !== null) {
        const text = htmlText(m[2]);
        if (text.length < 30 || !verb.test(text)) continue;
        if (/\bthis guideline\b|\bmore information\b|\bsee also\b/i.test(text) && text.length < 100) continue;
        recs.push(text);
    }
    return [...new Set(recs)].slice(0, 40);
}

function pmidFromUrl(url) {
    const m = String(url || '').match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i);
    return m ? m[1] : null;
}

function pmcidFromUrl(url) {
    const m = String(url || '').match(/pmc\.ncbi\.nlm\.nih\.gov\/articles\/(PMC\d+)/i);
    return m ? m[1].toUpperCase() : null;
}

function niceRef(url) {
    const m = String(url || '').match(/nice\.org\.uk\/guidance\/((?:ng|cg)\d+)/i);
    return m ? m[1].toLowerCase() : null;
}

function identities(doc) {
    return new Set([doc.pmcid, doc.pmid, doc.doi, doc.url, doc.sourceUrl]
        .filter(Boolean).map((value) => String(value).trim().toLowerCase()));
}

function sameDocument(left, right) {
    const a = identities(left);
    if (![...identities(right)].some((value) => a.has(value))) {
        const lt = String(left.title || '').trim().toLowerCase();
        const rt = String(right.title || '').trim().toLowerCase();
        return Boolean(lt && rt && lt === rt);
    }
    return true;
}

async function fromEuropePmc({ pmid, pmcid }) {
    const query = pmcid
        ? `PMCID:${pmcid}`
        : pmid ? `EXT_ID:${pmid} AND SRC:MED` : null;
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
        } catch {
            /* abstract-only ceiling */
        }
    }
    return {
        pmcid: id,
        pmid: hit.pmid || pmid || null,
        doi: hit.doi || null,
        title: hit.title || null,
        sourceBody: hit.journalTitle || null,
        year: hit.pubYear ? Number(hit.pubYear) : null,
        url: hit.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${hit.pmid}/` : (id ? `https://pmc.ncbi.nlm.nih.gov/articles/${id}/` : null),
        fullText,
        fullTextSource,
    };
}

async function fromHtml(url, title, sourceBody) {
    const html = await httpGet(url);
    let text = htmlText(html);
    const ref = niceRef(url);
    let recs = [];
    if (ref) {
        const chapters = [
            `https://www.nice.org.uk/guidance/${ref}/chapter/Recommendations`,
            `https://www.nice.org.uk/guidance/${ref}/chapter/1-recommendations`,
        ];
        for (const chapter of chapters) {
            try {
                const chapterHtml = await httpGet(chapter);
                recs = parseNiceRecommendations(chapterHtml);
                const chapterText = htmlText(chapterHtml);
                if (chapterText.length > text.length) text = chapterText;
                if (recs.length) break;
            } catch { /* try next chapter */ }
        }
    }
    const usable = text.length >= MIN_HTML;
    return {
        title,
        sourceBody,
        url,
        fullText: usable ? text : (text.length >= 400 ? text : null),
        fullTextSource: usable ? 'manual' : (text.length >= 400 ? 'abstract' : null),
        recs,
        year: null,
        pmid: null,
        pmcid: null,
        doi: null,
    };
}

async function alreadyFull(row) {
    const pmid = pmidFromUrl(row.url);
    const pmcid = pmcidFromUrl(row.url);
    if (pmcid) {
        const hit = await db.getGuidelineDocumentByPmcid(pmcid).catch(() => null);
        if (hit?.full_text_source === 'jats' && Number(hit.word_count || 0) >= 500) return hit;
    }
    if (pmid) {
        const hit = await db.get('SELECT * FROM guideline_documents WHERE pmid = ? LIMIT 1', [pmid]).catch(() => null);
        if (hit?.full_text_source === 'jats' && Number(hit.word_count || 0) >= 500) return hit;
    }
    if (row.url) {
        const hit = await db.get('SELECT * FROM guideline_documents WHERE source_url = ? LIMIT 1', [row.url]).catch(() => null);
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
        evidenceType: 'clinical_practice_guideline',
        locallyStored: true,
        bodyStored: Boolean(stored.fullText && ['jats', 'pdf', 'manual'].includes(stored.fullTextSource)),
    };
    const match = articles.findIndex((item) => sameDocument(item, article));
    if (match >= 0) articles[match] = { ...articles[match], ...article };
    else articles.push(article);
    await db.upsertTopicKnowledge(topic, existing?.knowledge || {}, articles, existing?.status || 'curated_ingested', existing?.confidence ?? 0.95);
}

async function storeNiceRecs(topic, url, recs, documentId) {
    if (!recs.length) return 0;
    let inserted = 0;
    for (const text of recs) {
        try {
            await db.createGuideline({
                topic,
                sourceBody: 'NICE',
                sourceUrl: url,
                recommendationText: text,
                status: 'ai_extracted',
                documentId,
            });
            inserted += 1;
        } catch { /* duplicate or schema */ }
    }
    return inserted;
}

async function downloadRow(row) {
    const url = String(row.url || '').trim();
    if (!url) return { topic: row.topic, action: 'skip_no_url' };

    const existing = await alreadyFull(row);
    if (existing) {
        await attachToTopic(row.topic, {
            documentId: existing.id,
            title: existing.title,
            url: existing.source_url || url,
            pmcid: existing.pmcid,
            pmid: existing.pmid,
            doi: existing.doi,
            year: existing.source_year,
            fullText: existing.full_text,
            fullTextSource: existing.full_text_source,
        });
        return { topic: row.topic, action: 'already_full', source: existing.full_text_source, words: existing.word_count };
    }

    let doc;
    if (/nice\.org\.uk|who\.int|ashpublications\.org/i.test(url)) {
        const body = /nice\.org\.uk/i.test(url) ? 'NICE' : (/who\.int/i.test(url) ? 'WHO' : 'ELN');
        doc = await fromHtml(url, row.guidelineTitle, body);
    } else {
        doc = await fromEuropePmc({
            pmid: pmidFromUrl(url),
            pmcid: pmcidFromUrl(url),
        });
        if (!doc) doc = { title: row.guidelineTitle, url, fullText: null, fullTextSource: null };
        if (!doc.url) doc.url = url;
        if (!doc.title) doc.title = row.guidelineTitle;
    }

    if (DRY_RUN) {
        return {
            topic: row.topic,
            action: 'dry_run',
            source: doc.fullTextSource,
            chars: doc.fullText ? doc.fullText.length : 0,
        };
    }

    const documentId = await db.upsertGuidelineDocument({
        pmcid: doc.pmcid,
        pmid: doc.pmid,
        doi: doc.doi,
        title: doc.title || row.guidelineTitle,
        sourceBody: doc.sourceBody,
        sourceYear: doc.year,
        sourceUrl: doc.url || url,
        documentLabel: 'clinical_practice_guideline',
        evidenceTier: 'guideline',
        fullText: doc.fullText,
        fullTextSource: doc.fullTextSource,
    });
    await attachToTopic(row.topic, { ...doc, documentId });
    let recs = 0;
    if (doc.recs?.length) recs = await storeNiceRecs(row.topic, url, doc.recs, documentId);
    return {
        topic: row.topic,
        action: doc.fullTextSource === 'jats' || doc.fullTextSource === 'manual' ? 'stored_full' : (doc.fullTextSource === 'abstract' ? 'stored_abstract' : 'stored_metadata'),
        source: doc.fullTextSource,
        words: doc.fullText ? doc.fullText.trim().split(/\s+/).length : 0,
        documentId,
        recs,
    };
}

async function main() {
    const rows = JSON.parse(fs.readFileSync(INDEX, 'utf8'))
        .filter((row) => row.url)
        .slice(0, LIMIT > 0 ? LIMIT : undefined);
    await db.connect();
    const results = [];
    try {
        for (let i = 0; i < rows.length; i += 1) {
            const row = rows[i];
            process.stdout.write(`[${i + 1}/${rows.length}] ${row.topic} ... `);
            try {
                const result = await downloadRow(row);
                results.push(result);
                console.log(result.action, result.source || '', result.words || 0);
            } catch (err) {
                const failed = { topic: row.topic, action: 'error', error: String(err.message || err).slice(0, 200) };
                results.push(failed);
                console.log('error', failed.error);
            }
            await sleep(PAUSE_MS);
        }
    } finally {
        const summary = {
            runAt: new Date().toISOString(),
            attempted: results.length,
            alreadyFull: results.filter((r) => r.action === 'already_full').length,
            storedFull: results.filter((r) => r.action === 'stored_full').length,
            storedAbstract: results.filter((r) => r.action === 'stored_abstract').length,
            storedMetadata: results.filter((r) => r.action === 'stored_metadata').length,
            errors: results.filter((r) => r.action === 'error').length,
            results,
        };
        fs.writeFileSync(REPORT, JSON.stringify(summary, null, 2));
        console.log(JSON.stringify({
            attempted: summary.attempted,
            alreadyFull: summary.alreadyFull,
            storedFull: summary.storedFull,
            storedAbstract: summary.storedAbstract,
            storedMetadata: summary.storedMetadata,
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
