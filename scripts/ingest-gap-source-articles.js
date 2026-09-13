#!/usr/bin/env node
'use strict';

/**
 * Populate topic_knowledge.source_articles and guideline_documents for coverage
 * gap topics. This stores real article/guideline metadata and available
 * abstracts/full text locally so search, synopsis, MCQ, and case workflows can
 * ground themselves without depending on a spreadsheet.
 *
 * It deliberately does not fabricate topic_guidelines recommendations. Use the
 * guideline extraction ingestors for recommendation-level rows.
 *
 * Usage:
 *   node scripts/ingest-gap-source-articles.js --list path/to/topics.csv --dry-run
 *   node scripts/ingest-gap-source-articles.js --list path/to/topics.csv --limit 25
 */

const fs = require('fs');
const https = require('https');
const { assessTopicRelevance, classifyImportedDocument, isUsableImportedSource } = require('../server/utils/importEvidenceQuality');

const { loadEnv } = require('../config');
loadEnv();
const db = require('../database');

const EPMC = 'https://www.ebi.ac.uk/europepmc/webservices/rest';
const UA = 'SignalMD/2.0 (coverage gap source ingestion; +https://signalmd.co)';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIST_PATH = valueAfter('--list') || valueAfter('--topic-list') || process.env.INGEST_TOPIC_LIST_FILE;
const LIMIT = Number(valueAfter('--limit') || process.env.INGEST_MAX_TOPICS || 0);
const ARTICLES_PER_TOPIC = Math.max(1, Number(valueAfter('--articles-per-topic') || process.env.INGEST_ARTICLES_PER_TOPIC || 3));
const MIN_EXISTING = Math.max(0, Number(valueAfter('--min-existing') || process.env.INGEST_MIN_EXISTING_ARTICLES || 1));

function valueAfter(flag) {
    const idx = args.indexOf(flag);
    return idx >= 0 ? args[idx + 1] : null;
}

function parseCsv(text) {
    const rows = [];
    let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        const next = text[i + 1];
        if (quoted && ch === '"' && next === '"') { cell += '"'; i += 1; continue; }
        if (ch === '"') { quoted = !quoted; continue; }
        if (!quoted && ch === ',') { row.push(cell); cell = ''; continue; }
        if (!quoted && (ch === '\n' || ch === '\r')) {
            if (ch === '\r' && next === '\n') i += 1;
            row.push(cell); cell = '';
            if (row.some((v) => String(v).trim())) rows.push(row);
            row = [];
            continue;
        }
        cell += ch;
    }
    row.push(cell);
    if (row.some((v) => String(v).trim())) rows.push(row);
    return rows;
}

function loadTopics(file) {
    if (!file) throw new Error('Usage: --list path/to/topics.csv');
    const raw = fs.readFileSync(file, 'utf8');
    const rows = parseCsv(raw);
    if (!rows.length) return [];
    const header = rows[0].map((v) => String(v).trim().toLowerCase());
    const topicIdx = Math.max(0, header.indexOf('topic'));
    const seen = new Set();
    return rows.slice(1)
        .map((row) => String(row[topicIdx] || '').trim())
        .filter(Boolean)
        .filter((topic) => {
            const key = topic.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

function httpGet(url, { timeout = 30000 } = {}) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': UA, Accept: 'application/json, application/xml;q=0.9' }, timeout }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                res.resume();
                return resolve(httpGet(new URL(res.headers.location, url).toString(), { timeout }));
            }
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const body = Buffer.concat(chunks).toString('utf8');
                if (res.statusCode === 200) resolve(body);
                else reject(new Error(`HTTP ${res.statusCode} for ${url}: ${body.slice(0, 120)}`));
            });
        });
        req.on('timeout', () => req.destroy(new Error(`timeout for ${url}`)));
        req.on('error', reject);
    });
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function coreQuery(topic) {
    return String(topic || '')
        .replace(/\([^)]*\)/g, ' ')
        .split(/[:;–—]/)[0]
        .replace(/\bleukaostasis\b/gi, 'leukostasis')
        .replace(/\bmetylene\b/gi, 'methylene')
        .replace(/\s+/g, ' ')
        .trim();
}

function evidenceQuery(topic) {
    const core = coreQuery(topic);
    return core;
}

async function searchEuropePmc(topic) {
    const core = coreQuery(topic);
    const queries = [
        evidenceQuery(topic),
        `${core} guideline`,
        `${core} systematic review meta-analysis`,
        `${core} randomized trial`,
    ];
    const byId = new Map();
    for (const query of queries) {
        const url = `${EPMC}/search?query=${encodeURIComponent(query)}&format=json&resultType=core&pageSize=${Math.max(ARTICLES_PER_TOPIC * 5, 10)}`;
        try {
            const raw = await httpGet(url);
            const results = JSON.parse(raw)?.resultList?.result || [];
            for (const result of results) {
                const id = String(result.pmid || result.doi || result.pmcid || result.id || '').trim().toLowerCase();
                if (id && !byId.has(id)) byId.set(id, result);
            }
        } catch (error) {
            console.warn(`[warn] Europe PMC query failed for "${topic}" / "${query}": ${error.message}`);
        }
        await sleep(100);
    }
    return rankResults([...byId.values()], topic).slice(0, ARTICLES_PER_TOPIC);
}

function rankResults(results, topic) {
    return results
        .filter((r) => r?.title && (r.pmid || r.doi || r.pmcid))
        .filter((r) => assessTopicRelevance(topic, r).accepted)
        .map((r) => {
            const overlap = assessTopicRelevance(topic, r).matches;
            const types = String(r.pubTypeList?.pubType || r.pubType || '').toLowerCase();
            const title = String(r.title || '').toLowerCase();
            const isGuideline = classifyImportedDocument(r) === 'clinical_practice_guideline';
            const isReview = /systematic review|meta-analysis|review/.test(`${title} ${types}`);
            const isTrial = /randomi[sz]ed|trial/.test(`${title} ${types}`);
            const year = Number(r.pubYear || 0);
            const score = overlap * 8 + Number(isGuideline) * 10 + Number(isReview) * 6 + Number(isTrial) * 3 + Math.max(0, Math.min(4, year - 2020));
            return { r, score };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ r }) => r);
}

function xmlText(xml) {
    return String(xml || '')
        .replace(/<ref-list[\s\S]*?<\/ref-list>/gi, ' ')
        .replace(/<table-wrap[\s\S]*?<\/table-wrap>/gi, ' ')
        .replace(/<fig[\s\S]*?<\/fig>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
        .replace(/&#x27;|&apos;/g, "'").replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ').trim();
}

function documentType(hit) {
    return classifyImportedDocument(hit);
}

function tierFor(type) {
    if (type === 'clinical_practice_guideline') return 'guideline';
    if (type === 'randomized_controlled_trial') return 'trial';
    return 'literature';
}

function articleIdentity(article) {
    return String(article.pmcid || article.pmid || article.doi || article.url || article.uid || '').trim().toLowerCase();
}

function sameArticle(a, b) {
    const ids = new Set([a?.pmcid, a?.pmid, a?.doi, a?.url, a?.uid].filter(Boolean).map((v) => String(v).trim().toLowerCase()));
    return [b?.pmcid, b?.pmid, b?.doi, b?.url, b?.uid].filter(Boolean).some((v) => ids.has(String(v).trim().toLowerCase()));
}

async function materialize(hit) {
    const type = documentType(hit);
    const pmcid = hit.pmcid || null;
    let fullText = String(hit.abstractText || '').trim() || null;
    let fullTextSource = fullText ? 'abstract' : null;
    if (pmcid && String(hit.inPMC || '').toUpperCase() === 'Y') {
        try {
            const xml = await httpGet(`${EPMC}/${encodeURIComponent(pmcid)}/fullTextXML`, { timeout: 40000 });
            const text = xmlText(xml);
            if (text.length > String(fullText || '').length) {
                fullText = text;
                fullTextSource = 'jats';
            }
        } catch {
            // Abstract-only still gives the app a real physical source body.
        }
    }
    return {
        pmcid,
        pmid: hit.pmid || null,
        doi: hit.doi ? String(hit.doi).trim().toLowerCase() : null,
        title: String(hit.title || '').trim(),
        sourceBody: hit.journalTitle || hit.bookOrReportDetails?.publisher || null,
        year: hit.pubYear ? Number(hit.pubYear) : null,
        url: hit.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${hit.pmid}/`
            : hit.doi ? `https://doi.org/${hit.doi}`
                : pmcid ? `https://pmc.ncbi.nlm.nih.gov/articles/${pmcid}/` : null,
        type,
        fullText,
        fullTextSource,
    };
}

async function main() {
    const topics = loadTopics(LIST_PATH).slice(0, LIMIT > 0 ? LIMIT : undefined);
    console.log(JSON.stringify({ dryRun: DRY_RUN, topics: topics.length, articlesPerTopic: ARTICLES_PER_TOPIC, minExisting: MIN_EXISTING }));
    if (!topics.length) return;

    await db.connect();
    let updated = 0;
    let skippedCovered = 0;
    let noCandidates = 0;
    let documentsStored = 0;
    try {
        for (let i = 0; i < topics.length; i += 1) {
            const topic = topics[i];
            const existing = await db.getTopicKnowledge(topic);
            const existingArticles = Array.isArray(existing?.sourceArticles) ? existing.sourceArticles : [];
            if (existingArticles.filter((article) => isUsableImportedSource(topic, article)).length >= MIN_EXISTING) {
                skippedCovered += 1;
                continue;
            }

            let hits = [];
            try {
                hits = await searchEuropePmc(topic);
            } catch (error) {
                console.warn(`[warn] search failed for "${topic}": ${error.message}`);
            }
            if (!hits.length) {
                noCandidates += 1;
                continue;
            }

            const merged = [...existingArticles];
            let changed = false;
            for (const hit of hits) {
                const doc = await materialize(hit);
                if (!articleIdentity(doc) || !doc.fullText) continue;
                const article = {
                    uid: doc.pmid ? `pmid:${doc.pmid}` : (doc.doi ? `doi:${doc.doi}` : doc.pmcid),
                    pmid: doc.pmid,
                    pmcid: doc.pmcid,
                    doi: doc.doi,
                    title: doc.title,
                    source: doc.sourceBody,
                    pubdate: doc.year ? String(doc.year) : null,
                    url: doc.url,
                    evidenceType: doc.type,
                    locallyStored: true,
                    bodyStored: Boolean(doc.fullText),
                    fullTextSource: doc.fullTextSource,
                    relevance: assessTopicRelevance(topic, hit),
                };
                if (!DRY_RUN) {
                    article.documentId = await db.upsertGuidelineDocument({
                        pmcid: doc.pmcid,
                        pmid: doc.pmid,
                        doi: doc.doi,
                        title: doc.title,
                        sourceBody: doc.sourceBody,
                        sourceYear: doc.year,
                        sourceUrl: doc.url,
                        documentLabel: doc.type,
                        evidenceTier: tierFor(doc.type),
                        fullText: doc.fullText,
                        fullTextSource: doc.fullTextSource,
                    });
                    documentsStored += 1;
                }
                const index = merged.findIndex((a) => sameArticle(a, article));
                if (index < 0) merged.push(article);
                else merged[index] = { ...merged[index], ...article };
                changed = true;
            }

            if (changed) {
                updated += 1;
                if (!DRY_RUN) {
                    const knowledge = existing?.knowledge || {};
                    await db.upsertTopicKnowledge(topic, knowledge, merged, existing?.status || 'source_articles_ingested', Number(existing?.confidence || 0));
                }
            }
            if ((i + 1) % 25 === 0) console.log(`[progress] ${i + 1}/${topics.length} topics; updated=${updated}; noCandidates=${noCandidates}`);
            await sleep(250);
        }
        console.log(JSON.stringify({ topics: topics.length, updated, skippedCovered, noCandidates, documentsStored, dryRun: DRY_RUN }, null, 2));
    } finally {
        await db.close();
    }
}

main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
});
