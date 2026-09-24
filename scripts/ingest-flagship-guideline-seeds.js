#!/usr/bin/env node
'use strict';

const fs = require('fs');
const https = require('https');
const path = require('path');
const db = require('../database');

const DEFAULT_CATALOG = path.join(__dirname, '../data/flagship-clinical-guideline-seeds.json');
const EPMC = 'https://www.ebi.ac.uk/europepmc/webservices/rest';
const PUBMED_EFETCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
const PMC_BIOC = 'https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_xml';
const USER_AGENT = 'SignalMD/2.0 (flagship guideline ingestion)';

function argValue(flag, argv = process.argv.slice(2)) {
    const hit = argv.find((value) => value.startsWith(`${flag}=`));
    if (hit) return hit.slice(flag.length + 1);
    const index = argv.indexOf(flag);
    return index >= 0 && argv[index + 1] && !argv[index + 1].startsWith('--')
        ? argv[index + 1]
        : null;
}

function request(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: { 'User-Agent': USER_AGENT, Accept: 'application/json, application/xml;q=0.9' },
            timeout: 30000,
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                res.resume();
                resolve(request(new URL(res.headers.location, url).toString()));
                return;
            }
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                if (res.statusCode === 200) resolve(Buffer.concat(chunks).toString('utf8'));
                else reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            });
        });
        req.on('timeout', () => req.destroy(new Error(`Timeout for ${url}`)));
        req.on('error', reject);
    });
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestWithRetry(url, get = request, attempts = 4) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            return await get(url);
        } catch (error) {
            lastError = error;
            const retryable = /HTTP (429|5\d\d)|Timeout/i.test(String(error.message || ''));
            if (!retryable || attempt === attempts) break;
            await sleep(750 * (2 ** (attempt - 1)));
        }
    }
    throw lastError;
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

function pubmedAbstract(xml) {
    const parts = [];
    const pattern = /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/gi;
    let match;
    while ((match = pattern.exec(String(xml || ''))) !== null) parts.push(match[1]);
    return xmlText(parts.join(' '));
}

async function fetchNcbiBody(input, get = request) {
    if (input.pmcid) {
        try {
            const body = xmlText(await requestWithRetry(
                `${PMC_BIOC}/${encodeURIComponent(input.pmcid)}/unicode`,
                get
            ));
            if (body.length >= 500) return { fullText: body, fullTextSource: 'jats' };
        } catch {
            // Fall through to the indexed abstract.
        }
    }
    if (input.pmid) {
        const xml = await requestWithRetry(
            `${PUBMED_EFETCH}?db=pubmed&id=${encodeURIComponent(input.pmid)}&retmode=xml&rettype=abstract`,
            get
        );
        const abstract = pubmedAbstract(xml);
        if (abstract) return { fullText: abstract, fullTextSource: 'abstract' };
    }
    return null;
}

async function enrichDocument(input, { get = request, skipNetwork = false } = {}) {
    if (skipNetwork || input.allowFullTextFetch === false) return { ...input };
    try {
        const ncbiBody = await fetchNcbiBody(input, get);
        if (ncbiBody) return { ...input, ...ncbiBody };
    } catch {
        // Europe PMC below is the metadata and content fallback.
    }
    const query = input.pmid
        ? `EXT_ID:${input.pmid} AND SRC:MED`
        : input.doi ? `DOI:${String(input.doi).toLowerCase()}` : null;
    if (!query) return { ...input };

    try {
        const raw = await requestWithRetry(
            `${EPMC}/search?query=${encodeURIComponent(query)}&format=json&resultType=core&pageSize=1`,
            get
        );
        const hit = JSON.parse(raw)?.resultList?.result?.[0];
        if (!hit) return { ...input };

        const pmcid = input.pmcid || hit.pmcid || null;
        let fullText = String(hit.abstractText || '').trim();
        let fullTextSource = fullText ? 'abstract' : null;
        if (pmcid && String(hit.inPMC).toUpperCase() === 'Y') {
            try {
                const jats = xmlText(await requestWithRetry(`${EPMC}/${encodeURIComponent(pmcid)}/fullTextXML`, get));
                if (jats.length > fullText.length) {
                    fullText = jats;
                    fullTextSource = 'jats';
                }
            } catch {
                // The abstract remains a valid local copy if archived JATS is unavailable.
            }
        }
        return {
            ...input,
            pmcid,
            pmid: input.pmid || hit.pmid || null,
            doi: input.doi || hit.doi || null,
            title: input.title || hit.title || null,
            sourceBody: input.sourceBody || hit.journalTitle || null,
            year: input.year || Number(hit.pubYear) || null,
            fullText: fullText || null,
            fullTextSource,
        };
    } catch (error) {
        console.warn(`[warn] metadata fetch failed for ${input.url}: ${error.message}`);
        return { ...input };
    }
}

function identities(document) {
    return new Set([document.pmcid, document.pmid, document.doi, document.url]
        .filter(Boolean)
        .map((value) => String(value).trim().toLowerCase()));
}

function sameDocument(left, right) {
    const leftIds = identities(left);
    return [...identities(right)].some((identity) => leftIds.has(identity));
}

function sourceArticle(document, documentId) {
    return {
        documentId,
        title: document.title,
        url: document.url,
        pmcid: document.pmcid || null,
        pmid: document.pmid || null,
        doi: document.doi || null,
        year: document.year || null,
        evidenceType: 'clinical_practice_guideline',
        locallyStored: true,
        bodyStored: Boolean(document.fullText),
        license: document.license || null,
        licenseUrl: document.licenseUrl || null,
        uploadedFileName: document.uploadedFileName || null,
        uploadedFileSha256: document.uploadedFileSha256 || null,
    };
}

async function recommendationExists(database, topic, text) {
    const normalized = database.normalizeTopic(topic).replace(/-/g, ' ');
    return database.get(
        `SELECT id, document_id FROM topic_guidelines
         WHERE REPLACE(normalized_topic, '-', ' ') = ?
           AND LOWER(TRIM(recommendation_text)) = LOWER(TRIM(?))
           AND superseded_by_id IS NULL
         LIMIT 1`,
        [normalized, text]
    );
}

async function ingestCatalog(catalog, {
    database = db,
    enrich = enrichDocument,
    topicFilter = '',
    skipNetwork = false,
} = {}) {
    const selected = catalog.topics.filter((entry) =>
        !topicFilter || entry.topic.toLowerCase().includes(topicFilter.toLowerCase()));
    const totals = {
        topics: selected.length,
        documents: 0,
        bodies: 0,
        recommendationsCreated: 0,
        recommendationsExisting: 0,
        errors: [],
    };

    for (const entry of selected) {
        try {
            const document = await enrich(entry.document, { skipNetwork });
            const documentId = await database.upsertGuidelineDocument({
                pmcid: document.pmcid,
                pmid: document.pmid,
                doi: document.doi,
                title: document.title,
                sourceBody: document.sourceBody,
                sourceYear: document.year,
                sourceUrl: document.url,
                documentLabel: 'clinical_practice_guideline',
                evidenceTier: 'guideline',
                fullText: document.fullText,
                fullTextSource: document.fullTextSource,
            });
            totals.documents += 1;
            if (document.fullText) totals.bodies += 1;

            const existingKnowledge = await database.getTopicKnowledge(entry.topic).catch(() => null);
            const articles = Array.isArray(existingKnowledge?.sourceArticles)
                ? [...existingKnowledge.sourceArticles]
                : [];
            const article = sourceArticle(document, documentId);
            const match = articles.findIndex((candidate) => sameDocument(candidate, article));
            if (match >= 0) articles[match] = { ...articles[match], ...article };
            else articles.push(article);
            const deduped = articles.filter((candidate, index, all) =>
                all.findIndex((other) => sameDocument(candidate, other)) === index);
            await database.upsertTopicKnowledge(
                entry.topic,
                existingKnowledge?.knowledge || {},
                deduped,
                existingKnowledge?.status || 'curated_ingested',
                existingKnowledge?.confidence ?? 0.95
            );

            for (const recommendation of entry.recommendations) {
                const existing = await recommendationExists(database, entry.topic, recommendation.text);
                if (existing) {
                    await database.run(
                        `UPDATE topic_guidelines SET
                            document_id = COALESCE(document_id, ?),
                            source_region = COALESCE(source_region, ?),
                            source_specialty = COALESCE(source_specialty, ?),
                            source_domain = COALESCE(source_domain, ?),
                            updated_at = ?
                         WHERE id = ?`,
                        [documentId || null, document.sourceRegion || null,
                            document.sourceSpecialty || null, document.sourceDomain || null,
                            new Date().toISOString(), existing.id]
                    );
                    totals.recommendationsExisting += 1;
                    continue;
                }
                await database.createGuideline({
                    topic: entry.topic,
                    sourceBody: document.sourceBody,
                    sourceRegion: document.sourceRegion,
                    sourceYear: document.year,
                    sourceUrl: document.url,
                    sourceSpecialty: document.sourceSpecialty,
                    sourceDomain: document.sourceDomain,
                    recommendationText: recommendation.text,
                    recommendationStrength: recommendation.strength,
                    recommendationCertainty: recommendation.certainty,
                    population: recommendation.population,
                    intervention: recommendation.intervention,
                    cautions: recommendation.cautions,
                    status: 'ai_extracted',
                    documentId,
                });
                totals.recommendationsCreated += 1;
            }
        } catch (error) {
            totals.errors.push({ topic: entry.topic, error: error.message });
        }
        if (!skipNetwork) await sleep(400);
    }
    return totals;
}

async function main() {
    const argv = process.argv.slice(2);
    const dryRun = argv.includes('--dry-run');
    const skipNetwork = argv.includes('--skip-network');
    const topicFilter = argValue('--topic', argv) || '';
    const catalogArg = argValue('--catalog', argv);
    const catalogPath = catalogArg ? path.resolve(process.cwd(), catalogArg) : DEFAULT_CATALOG;
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    const selected = catalog.topics.filter((entry) =>
        !topicFilter || entry.topic.toLowerCase().includes(topicFilter.toLowerCase()));

    if (dryRun) {
        console.log(JSON.stringify({
            catalog: catalogPath,
            topics: selected.length,
            documents: selected.length,
            recommendations: selected.reduce((count, entry) => count + entry.recommendations.length, 0),
            reviewStatus: 'ai_extracted',
        }, null, 2));
        return;
    }

    await db.connect();
    await db.runMigrations();
    try {
        const result = await ingestCatalog(catalog, { database: db, topicFilter, skipNetwork });
        console.log(JSON.stringify({ catalog: catalogPath, ...result }, null, 2));
        if (result.errors.length) process.exitCode = 1;
    } finally {
        await db.close();
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

module.exports = {
    enrichDocument,
    fetchNcbiBody,
    ingestCatalog,
    pubmedAbstract,
    requestWithRetry,
    sameDocument,
    sourceArticle,
    xmlText,
};
