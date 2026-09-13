#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const db = require('../database');

const CATALOG = path.join(__dirname, '../data/curated-literature-corpus.json');
const DRY_RUN = process.argv.includes('--dry-run');
const EPMC = 'https://www.ebi.ac.uk/europepmc/webservices/rest';
const UA = 'SignalMD/2.0 (curated literature ingestion)';

function get(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': UA, Accept: 'application/json, application/xml;q=0.9' }, timeout: 30000 }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                res.resume(); return resolve(get(new URL(res.headers.location, url).toString()));
            }
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => res.statusCode === 200
                ? resolve(Buffer.concat(chunks).toString('utf8'))
                : reject(new Error(`HTTP ${res.statusCode} for ${url}`)));
        });
        req.on('timeout', () => req.destroy(new Error(`Timeout for ${url}`)));
        req.on('error', reject);
    });
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

async function enrich(input) {
    const query = input.pmid ? `EXT_ID:${input.pmid} AND SRC:MED`
        : input.doi ? `DOI:${String(input.doi).toLowerCase()}` : null;
    if (!query) return { ...input };
    try {
        // CORE results include abstracts; the default LITE response only carries
        // identifiers and made a successful import look like locally stored text.
        const raw = await get(`${EPMC}/search?query=${encodeURIComponent(query)}&format=json&resultType=core&pageSize=1`);
        const hit = JSON.parse(raw)?.resultList?.result?.[0];
        if (!hit) return { ...input };
        const pmcid = input.pmcid || hit.pmcid || null;
        let body = String(hit.abstractText || '').trim();
        let bodySource = body ? 'abstract' : null;
        // A PMCID means Europe PMC can expose the archived JATS body. Some PMC
        // records report isOpenAccess=N because of reuse terms but remain legally
        // readable from PMC; fetch from the archive and retain its provenance.
        if (pmcid && String(hit.inPMC).toUpperCase() === 'Y') {
            try {
                const jats = await get(`${EPMC}/${encodeURIComponent(pmcid)}/fullTextXML`);
                const text = xmlText(jats);
                if (text.length > body.length) { body = text; bodySource = 'jats'; }
            } catch { /* an abstract is still a valid locally stored body */ }
        }
        return {
            ...input,
            pmcid, pmid: input.pmid || hit.pmid || null,
            doi: input.doi || hit.doi || null,
            title: hit.title || input.title,
            sourceBody: input.sourceBody || hit.journalTitle || null,
            year: input.year || Number(hit.pubYear) || null,
            fullText: body || null, fullTextSource: bodySource,
        };
    } catch (error) {
        console.warn(`[warn] metadata fetch failed for ${input.url}: ${error.message}`);
        return { ...input };
    }
}

function key(doc) {
    return String(doc.pmcid || doc.pmid || doc.doi || doc.url || '').trim().toLowerCase();
}

function identities(doc) {
    return new Set([doc.pmcid, doc.pmid, doc.doi, doc.url]
        .filter(Boolean).map((value) => String(value).trim().toLowerCase()));
}

function sameDocument(left, right) {
    const a = identities(left);
    return [...identities(right)].some((value) => a.has(value));
}

function tier(type) {
    if (type === 'clinical_practice_guideline') return 'guideline';
    if (type === 'randomized_controlled_trial') return 'trial';
    return 'literature';
}

async function main() {
    const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
    if (DRY_RUN) {
        console.log(JSON.stringify({ topics: catalog.topics.length, references: catalog.topics.reduce((n, t) => n + t.documents.length, 0) }));
        return;
    }
    await db.connect();
    const cache = new Map();
    let storedBodies = 0;
    try {
        for (const entry of catalog.topics) {
            const existing = await db.getTopicKnowledge(entry.topic).catch(() => null);
            const articles = Array.isArray(existing?.sourceArticles) ? [...existing.sourceArticles] : [];
            for (const source of entry.documents) {
                const identity = key(source);
                let doc = cache.get(identity);
                if (!doc) { doc = await enrich(source); cache.set(identity, doc); }
                const documentId = await db.upsertGuidelineDocument({
                    pmcid: doc.pmcid, pmid: doc.pmid, doi: doc.doi,
                    title: doc.title, sourceBody: doc.sourceBody, sourceYear: doc.year,
                    sourceUrl: doc.url, documentLabel: doc.type, evidenceTier: tier(doc.type),
                    fullText: doc.fullText, fullTextSource: doc.fullTextSource,
                });
                if (doc.fullText) storedBodies += 1;
                const storedArticle = { documentId, title: doc.title, url: doc.url, pmcid: doc.pmcid || null,
                        pmid: doc.pmid || null, doi: doc.doi || null, year: doc.year || null,
                        evidenceType: doc.type, locallyStored: true, bodyStored: Boolean(doc.fullText) };
                const match = articles.findIndex((article) => sameDocument(article, storedArticle));
                if (match >= 0) articles[match] = { ...articles[match], ...storedArticle };
                else articles.push(storedArticle);
            }
            const deduped = articles.filter((article, index, all) =>
                all.findIndex((candidate) => sameDocument(candidate, article)) === index);
            await db.upsertTopicKnowledge(entry.topic, existing?.knowledge || {}, deduped, 'curated_ingested', 0.95);
        }
        const counts = await db.all(`SELECT document_label, COUNT(*) AS documents,
            SUM(CASE WHEN full_text IS NOT NULL AND LENGTH(TRIM(full_text)) > 0 THEN 1 ELSE 0 END) AS bodies
            FROM guideline_documents GROUP BY document_label ORDER BY document_label`, []);
        console.log(JSON.stringify({ topics: catalog.topics.length, uniqueDocuments: cache.size, fetchedBodies: storedBodies, counts }, null, 2));
    } finally {
        await db.close();
    }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
