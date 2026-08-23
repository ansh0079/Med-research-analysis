#!/usr/bin/env node
/**
 * Batch guideline ingestion for all curriculum topics.
 *
 * For each topic the script:
 *  1. Searches PubMed for guideline publications (up to 10 results, English only)
 *  2. Fetches full text from PubMed Central for open-access articles
 *  3. Falls back to abstract for non-OA articles
 *  4. Extracts structured recommendations with an AI model
 *  5. Inserts only recommendations that contain a recommendation verb
 *
 * Run on the prod server (needs DATABASE_PATH and AI key env vars):
 *   node scripts/ingest-guidelines.js
 *
 * Options (env):
 *   INGEST_CONCURRENCY   parallel topics (default 3)
 *   INGEST_SKIP_COVERED  skip topics with >= N actionable guidelines (default 3)
 *   INGEST_DRY_RUN       1 = print what would be inserted, don't write
 *   INGEST_TOPIC_FILTER  comma-separated display_names to restrict run
 */

'use strict';

const db = require('../database');
const { fetchWithTimeout: fetch } = require('../server/utils/fetch');
const { serverConfig } = require('../config');
const { createAiService } = require('../server/services/ai/aiService');
const { getProviderCandidates } = require('../server/utils/aiProvider');

// Inline version — avoids dependency on guidelineService export order
async function callFirstHealthyProvider(aiService, srvConfig, prompt, label) {
    const candidates = getProviderCandidates({}, srvConfig);
    for (const candidate of candidates) {
        try {
            return await aiService.callText(prompt, candidate.provider, candidate.model, { maxOutputTokens: 4096, timeoutMs: 60000, jsonMode: true });
        } catch (err) {
            console.warn(`[Ingest] Provider ${candidate.provider} failed for ${label}: ${err.message}`);
        }
    }
    throw new Error(`All AI providers failed for: ${label}`);
}

const CONCURRENCY = Number(process.env.INGEST_CONCURRENCY || 3);
const SKIP_IF_GTE = Number(process.env.INGEST_SKIP_COVERED || 3);
const DRY_RUN = process.env.INGEST_DRY_RUN === '1';
const TOPIC_FILTER = process.env.INGEST_TOPIC_FILTER
    ? new Set(process.env.INGEST_TOPIC_FILTER.split(',').map(s => s.trim().toLowerCase()))
    : null;

const RECOMMENDATION_RE = /\b(should|should not|recommend|recommends|recommended|must|initiate|consider|offer|avoid|do not|start|titrate|discontinue|prescribe|screen|monitor|refer|first-line|second-line|indicated|contraindicated)\b/i;

// Known guideline-body → canonical name mapping (add more as needed)
const JOURNAL_TO_BODY = {
    'Circulation': 'AHA/ACC',
    'J Am Coll Cardiol': 'AHA/ACC',
    'JACC': 'AHA/ACC',
    'Eur Heart J': 'ESC',
    'Lancet': 'Lancet',
    'BMJ': 'BMJ',
    'NEJM': 'AHA/ACC',
    'N Engl J Med': 'NEJM',
    'Chest': 'CHEST/ATS',
    'Am J Respir Crit Care Med': 'ATS',
    'Kidney Int': 'KDIGO',
    'Diabetes Care': 'ADA',
    'J Clin Endocrinol Metab': 'Endocrine Society',
    'Ann Intern Med': 'ACP',
    'Clin Infect Dis': 'IDSA',
    'Gastroenterology': 'AGA',
    'Gut': 'BSG',
    'Hepatology': 'AASLD',
    'Neurology': 'AAN',
    'Stroke': 'AHA/ASA',
    'Blood': 'ASH',
    'J Allergy Clin Immunol': 'AAAAI',
    'Rheumatology (Oxford)': 'BSR',
    'Ann Rheum Dis': 'EULAR',
};

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// Topic names are long and specific ("Mechanical thrombectomy: extended time windows, ASPECT scores, CT perfusion").
// PubMed needs the core clinical term, not the full curriculum title.
function simplifyTopicForSearch(topicName) {
    // Take the part before the first colon, then first 8 words
    const core = topicName.split(/[:–—]/)[0].trim();
    return core.split(/\s+/).slice(0, 8).join(' ');
}

async function fetchPubmedGuidelineIds(topic, ncbiKey, ncbiEmail) {
    const apiKeyParam = ncbiKey ? `&api_key=${ncbiKey}` : '';
    const emailParam = ncbiEmail ? `&tool=medsearch&email=${encodeURIComponent(ncbiEmail)}` : '';
    const searchTerm = simplifyTopicForSearch(topic);
    const guidelineFilter = '(Guideline[pt] OR "Practice Guideline"[pt] OR "Consensus Development Conference"[pt])';
    const langFilter = 'English[lang]';
    const query = `(${searchTerm}) AND ${guidelineFilter} AND ${langFilter}`;
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=10&retmode=json&sort=date${apiKeyParam}${emailParam}`;
    try {
        const res = await fetch(url, { timeout: 15000 });
        if (!res.ok) return [];
        const data = await res.json();
        return data?.esearchresult?.idlist || [];
    } catch (err) {
        console.warn(`[PubMed] search failed for "${topic}": ${err.message}`);
        return [];
    }
}

async function fetchAbstractsBatch(pmids, ncbiKey, ncbiEmail) {
    if (!pmids.length) return [];
    const apiKeyParam = ncbiKey ? `&api_key=${ncbiKey}` : '';
    const emailParam = ncbiEmail ? `&tool=medsearch&email=${encodeURIComponent(ncbiEmail)}` : '';
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmids.join(',')}&rettype=abstract&retmode=xml${apiKeyParam}${emailParam}`;
    try {
        const res = await fetch(url, { timeout: 20000 });
        if (!res.ok) return [];
        const xml = await res.text();
        return parsePubMedXml(xml);
    } catch (err) {
        console.warn(`[PubMed] abstract fetch failed: ${err.message}`);
        return [];
    }
}

function parsePubMedXml(xml) {
    const articles = [];
    const articleBlocks = xml.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) || [];
    for (const block of articleBlocks) {
        const pmid = (block.match(/<PMID[^>]*>(\d+)<\/PMID>/) || [])[1] || '';
        const title = stripXml((block.match(/<ArticleTitle[^>]*>([\s\S]*?)<\/ArticleTitle>/) || [])[1] || '');
        const abstractParts = [...block.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)].map(m => stripXml(m[1]));
        const abstract = abstractParts.join(' ').trim();
        const journal = stripXml((block.match(/<Title>([\s\S]*?)<\/Title>/) || [])[1] || '');
        const year = (block.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/) || [])[1] || '';
        const pmcid = (block.match(/<ArticleId IdType="pmc">(PMC\d+)<\/ArticleId>/) || [])[1] || '';
        articles.push({ pmid, title, abstract, journal, year: year ? Number(year) : null, pmcid });
    }
    return articles;
}

function stripXml(s) {
    return (s || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
}

async function fetchPmcFullText(pmcid, ncbiKey, ncbiEmail) {
    if (!pmcid) return null;
    const apiKeyParam = ncbiKey ? `&api_key=${ncbiKey}` : '';
    const emailParam = ncbiEmail ? `&tool=medsearch&email=${encodeURIComponent(ncbiEmail)}` : '';
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=${pmcid}&rettype=xml&retmode=xml${apiKeyParam}${emailParam}`;
    try {
        const res = await fetch(url, { timeout: 30000 });
        if (!res.ok) return null;
        const xml = await res.text();
        // Extract body text — grab all <p> content from body
        const body = (xml.match(/<body>([\s\S]*?)<\/body>/) || [])[1] || '';
        if (!body) return null;
        const paragraphs = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map(m => stripXml(m[1]));
        // Only keep paragraphs mentioning recommendation verbs — avoids returning 50k chars of methods
        const actionable = paragraphs.filter(p => RECOMMENDATION_RE.test(p) && p.length > 30);
        if (!actionable.length) return null;
        // Cap at 8000 chars to stay within token budget
        let combined = actionable.join('\n');
        if (combined.length > 8000) combined = combined.slice(0, 8000);
        return combined;
    } catch (err) {
        return null;
    }
}

function resolveSourceBody(rec, article) {
    if (rec.sourceBody && rec.sourceBody !== article?.journal && !rec.sourceBody.includes('unknown')) {
        return rec.sourceBody;
    }
    if (article?.journal) {
        for (const [key, val] of Object.entries(JOURNAL_TO_BODY)) {
            if (article.journal.includes(key)) return val;
        }
        return article.journal;
    }
    return rec.sourceBody || 'Unknown';
}

function buildExtractionPrompt(topic, articles) {
    const sections = articles.map((a, i) => {
        const src = a.fullText
            ? `Full text (PMC ${a.pmcid}) — excerpt of recommendation sections:\n${a.fullText}`
            : `Abstract:\n${a.abstract || '(no abstract)'}`;
        return `--- Article ${i + 1} [PMID ${a.pmid}] ---\nTitle: ${a.title}\nJournal: ${a.journal}\nYear: ${a.year || 'unknown'}\n${src}`;
    }).join('\n\n');

    return `You are a clinical guideline extraction specialist. Extract structured clinical recommendations from guideline publications on: "${topic}".

${sections}

Rules:
- Extract ONLY explicit recommendations containing action verbs (should, recommend, must, consider, offer, avoid, initiate, prescribe, screen, monitor, contraindicated, first-line).
- Do NOT extract background statements, definitions, epidemiology, or study descriptions.
- Each recommendation must be a complete actionable clinical statement.
- One article may yield multiple distinct recommendations.
- Use the journal name to infer the issuing organization (e.g. "Circulation" → "AHA/ACC", "Eur Heart J" → "ESC").

Return a JSON array (no markdown fences). Each element:
{
  "pmid": "string PMID of the source article",
  "sourceBody": "issuing organization",
  "sourceYear": integer or null,
  "sourceUrl": "https://pubmed.ncbi.nlm.nih.gov/PMID/",
  "recommendationText": "the specific clinical recommendation, 1-3 sentences",
  "recommendationStrength": "strength if stated (Class I, Strong, Grade A) or null",
  "recommendationCertainty": "level of evidence if stated (Level A, Moderate) or null",
  "population": "target patient population or null",
  "intervention": "intervention or action recommended or null",
  "cautions": "caveats or contraindications or null"
}

Return [] if no actionable recommendations can be extracted.`;
}

async function ingestTopic(topicName, { aiService }) {
    const ncbiKey = serverConfig.keys.ncbi;
    const ncbiEmail = serverConfig.keys.ncbiEmail;

    const pmids = await fetchPubmedGuidelineIds(topicName, ncbiKey, ncbiEmail);
    await sleep(400); // respect NCBI rate limit (3 req/s without key, 10/s with)
    if (!pmids.length) {
        return { topic: topicName, found: 0, inserted: 0, skippedByVerb: 0 };
    }

    const articles = await fetchAbstractsBatch(pmids, ncbiKey, ncbiEmail);
    await sleep(400);

    // Attempt PMC full text for OA articles
    for (const a of articles) {
        if (a.pmcid) {
            a.fullText = await fetchPmcFullText(a.pmcid, ncbiKey, ncbiEmail);
            await sleep(300);
        }
    }

    const usable = articles.filter(a => (a.fullText && a.fullText.length > 30) || (a.abstract && a.abstract.length > 50));
    if (!usable.length) {
        return { topic: topicName, found: pmids.length, inserted: 0, skippedByVerb: 0 };
    }

    const prompt = buildExtractionPrompt(topicName, usable);
    let rawText;
    try {
        rawText = await callFirstHealthyProvider(aiService, serverConfig, prompt, `guideline ingest: ${topicName}`);
    } catch (err) {
        console.error(`[Ingest] AI failed for "${topicName}": ${err.message}`);
        return { topic: topicName, found: pmids.length, inserted: 0, skippedByVerb: 0, error: err.message };
    }

    let recs;
    try {
        // jsonMode should return bare JSON; strip fences as fallback for non-compliant providers
        const cleaned = rawText.replace(/```json?\s*/gi, '').replace(/```\s*/g, '').trim();
        const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : cleaned;
        recs = JSON.parse(jsonStr);
    } catch (parseErr) {
        // Log the first 400 chars of the cleaned text to diagnose
        const preview = rawText.replace(/```json?\s*/gi, '').replace(/```\s*/g, '').trim().slice(0, 400);
        console.warn(`[Ingest] JSON parse failed for "${topicName}" (${parseErr.message}) — cleaned: ${preview}`);
        return { topic: topicName, found: pmids.length, inserted: 0, skippedByVerb: 0 };
    }
    if (!Array.isArray(recs)) return { topic: topicName, found: pmids.length, inserted: 0, skippedByVerb: 0 };

    let inserted = 0;
    let skippedByVerb = 0;
    for (const rec of recs) {
        if (!rec.recommendationText || !rec.sourceBody) continue;
        if (!RECOMMENDATION_RE.test(rec.recommendationText)) {
            skippedByVerb++;
            continue;
        }
        if (rec.recommendationText.trim().length < 25) { skippedByVerb++; continue; }

        const articleForRec = articles.find(a => a.pmid === String(rec.pmid));
        const sourceBody = resolveSourceBody(rec, articleForRec);

        if (DRY_RUN) {
            console.log(`  [DRY] Would insert: [${sourceBody}] ${rec.recommendationText.slice(0, 80)}...`);
            inserted++;
            continue;
        }
        try {
            await db.createGuideline({
                topic: topicName,
                sourceBody,
                sourceYear: rec.sourceYear,
                sourceUrl: rec.sourceUrl || (rec.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${rec.pmid}/` : null),
                recommendationText: rec.recommendationText,
                recommendationStrength: rec.recommendationStrength,
                recommendationCertainty: rec.recommendationCertainty,
                population: rec.population,
                intervention: rec.intervention,
                cautions: rec.cautions,
                status: 'ai_extracted',
            });
            inserted++;
        } catch (err) {
            console.warn(`[Ingest] Insert failed for "${topicName}": ${err.message}`);
        }
    }

    return { topic: topicName, found: pmids.length, inserted, skippedByVerb };
}

async function getTopicsNeedingIngestion() {
    const topics = await db.all(`
        SELECT display_name
        FROM curriculum_topics
        ORDER BY sort_order ASC
    `);

    // Count existing actionable guidelines per topic
    const covered = await db.all(`
        SELECT topic, COUNT(*) as cnt
        FROM topic_guidelines
        WHERE status = 'ai_extracted'
          AND length(recommendation_text) > 25
          AND (
            recommendation_text LIKE '%should%' OR recommendation_text LIKE '%recommend%'
            OR recommendation_text LIKE '%must%' OR recommendation_text LIKE '%initiate%'
            OR recommendation_text LIKE '%consider%' OR recommendation_text LIKE '%offer%'
            OR recommendation_text LIKE '%avoid%' OR recommendation_text LIKE '%first-line%'
            OR recommendation_text LIKE '%contraindicated%' OR recommendation_text LIKE '%prescribed%'
          )
        GROUP BY topic
    `);
    const coveredMap = new Map(covered.map(r => [r.topic?.toLowerCase(), r.cnt]));

    return topics
        .filter(t => {
            if (TOPIC_FILTER && !TOPIC_FILTER.has(t.display_name.toLowerCase())) return false;
            const cnt = coveredMap.get(t.display_name.toLowerCase()) || 0;
            return cnt < SKIP_IF_GTE;
        })
        .map(t => t.display_name);
}

async function runWithConcurrency(items, fn, concurrency) {
    const results = [];
    let idx = 0;
    async function worker() {
        while (idx < items.length) {
            const i = idx++;
            results[i] = await fn(items[i]);
        }
    }
    await Promise.all(Array.from({ length: concurrency }, worker));
    return results;
}

async function main() {
    await db.connect();

    const aiService = createAiService({ serverConfig });

    const topics = await getTopicsNeedingIngestion();
    console.log(`[Ingest] ${topics.length} topics need ingestion (skip threshold: ${SKIP_IF_GTE} actionable guidelines)`);
    if (DRY_RUN) console.log('[Ingest] DRY RUN — nothing will be written');
    if (!topics.length) { console.log('[Ingest] Nothing to do.'); process.exit(0); }

    const startedAt = Date.now();
    let totalInserted = 0;
    let totalSkipped = 0;
    let errors = 0;

    const results = await runWithConcurrency(topics, async (topicName) => {
        process.stdout.write(`  Processing "${topicName}"... `);
        const r = await ingestTopic(topicName, { aiService });
        const label = r.error ? '✗ error' : `+${r.inserted} recs (${r.skippedByVerb} no-verb, ${r.found} pmids)`;
        console.log(label);
        return r;
    }, CONCURRENCY);

    for (const r of results) {
        if (r.error) errors++;
        totalInserted += r.inserted;
        totalSkipped += r.skippedByVerb;
    }

    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    console.log(`\n[Ingest] Done in ${elapsed}s: ${totalInserted} inserted, ${totalSkipped} skipped (no verb), ${errors} errors`);

    // Write a simple report
    const report = {
        runAt: new Date().toISOString(),
        topicsAttempted: topics.length,
        totalInserted,
        totalSkipped,
        errors,
        elapsedSeconds: elapsed,
        details: results,
    };
    require('fs').writeFileSync('/tmp/ingest-guidelines-report.json', JSON.stringify(report, null, 2));
    console.log('[Ingest] Report written to /tmp/ingest-guidelines-report.json');

    process.exit(errors > 0 ? 1 : 0);
}

main().catch(err => {
    console.error('[Ingest] Fatal:', err.message);
    process.exit(1);
});
