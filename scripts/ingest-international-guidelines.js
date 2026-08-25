#!/usr/bin/env node
/**
 * Ingest international clinical guidelines via PDF → GROBID → AI extraction.
 *
 * For each entry in data/international-guideline-catalog.json:
 *  1. Download PDF from `url` (or skip if only htmlUrl)
 *  2. POST to GROBID to get TEI XML full text
 *  3. Extract ALL body text (not research-paper sections)
 *  4. Chunk text and send to AI to extract graded recommendations
 *  5. Insert into topic_guidelines with correct sourceBody
 *
 * GROBID runs at medsearch-grobid:8070 inside the Docker network.
 *
 * Run inside the worker container:
 *   GROBID_URL=http://medsearch-grobid:8070 node scripts/ingest-international-guidelines.js
 *
 * Env:
 *   GROBID_URL            GROBID endpoint (default: http://medsearch-grobid:8070)
 *   INGEST_DRY_RUN        1 = log, no DB writes
 *   INGEST_SKIP_IF_GTE    skip topics/guideline that already has >= N recs from that body (default 5)
 *   INGEST_GUIDELINE_IDS  comma-separated catalog ids to restrict run
 *   INGEST_CONCURRENCY    parallel guideline downloads (default 1)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const db = require('../database');
const { processPdf, isGrobidAlive } = require('../server/services/grobidClient');
const { createAiService } = require('../server/services/ai/aiService');
const { getProviderCandidates } = require('../server/utils/aiProvider');
const { serverConfig } = require('../config');

const CATALOG_PATH = path.join(__dirname, '..', 'data', 'international-guideline-catalog.json');

const DRY_RUN = process.env.INGEST_DRY_RUN === '1';
const SKIP_IF_GTE = Number(process.env.INGEST_SKIP_IF_GTE || 5);
const GUIDELINE_FILTER = process.env.INGEST_GUIDELINE_IDS
    ? new Set(process.env.INGEST_GUIDELINE_IDS.split(',').map(s => s.trim()))
    : null;
const CONCURRENCY = Math.max(1, Number(process.env.INGEST_CONCURRENCY || 1));

// Override GROBID URL for Docker network
if (!process.env.GROBID_URL) {
    process.env.GROBID_URL = 'http://medsearch-grobid:8070';
}

const RECOMMENDATION_RE = /\b(should|should not|recommend|must|offer|consider|avoid|do not|initiate|start|prescribe|screen|monitor|refer|first-line|second-line|indicated|contraindicated|titrate|discontinue|preferred|preferred treatment|alternative|may be used|is recommended|are recommended|patients should|clinicians should)\b/i;
const MIN_REC_LENGTH = 35;

// ─── HTTP download ────────────────────────────────────────────────────────────

function downloadBuffer(url, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        const proto = url.startsWith('https') ? https : http;
        const req = proto.get(url, {
            timeout: 90000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; MedResearch/1.0; academic-use)',
                'Accept': 'application/pdf,*/*',
            },
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && maxRedirects > 0) {
                const redirectUrl = res.headers.location.startsWith('http')
                    ? res.headers.location
                    : new URL(res.headers.location, url).toString();
                res.resume();
                return resolve(downloadBuffer(redirectUrl, maxRedirects - 1));
            }
            if (res.statusCode !== 200) {
                res.resume();
                return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            }
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        });
        req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout downloading ${url}`)); });
        req.on('error', reject);
    });
}

// ─── HTML fallback for guidelines with no direct PDF URL ─────────────────────

async function fetchGuidelineHtml(htmlUrl) {
    const res = await fetch(htmlUrl, {
        signal: AbortSignal.timeout(30000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MedResearch/1.0; academic-use)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
}

function extractTextFromHtml(html) {
    return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
        .replace(/&#\d+;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// ─── TEI XML → plain text (for guidelines, not research paper sections) ───────

function extractTeiBodyText(teiXml) {
    if (!teiXml) return '';
    // Strip TEI tags but keep text content; skip reference lists
    let inRefs = false;
    const lines = [];
    const segments = teiXml.split(/(<[^>]+>)/);
    for (const seg of segments) {
        if (!seg.startsWith('<')) {
            if (!inRefs && seg.trim().length > 3) lines.push(seg.trim());
            continue;
        }
        const tag = seg.toLowerCase();
        if (tag.startsWith('<listbibl') || tag.startsWith('<div type="references"') || tag.startsWith('<div type="bibliography"')) {
            inRefs = true;
        }
        if (tag.startsWith('</listbibl') || tag.startsWith('</div')) {
            inRefs = false;
        }
    }
    return lines.join(' ').replace(/\s+/g, ' ').trim();
}

// ─── AI extraction ────────────────────────────────────────────────────────────

const EXTRACTION_PROMPT = `You are a clinical guideline analyst. Extract every specific clinical recommendation from this section of a clinical practice guideline.

For each recommendation output a JSON object on its own line:
{"text": "...", "strength": "...", "certainty": "..."}

- "text": the exact recommendation statement (what clinicians should/must/should not do). Include patient population if mentioned. 30–300 chars.
- "strength": one of "strong", "conditional", "expert opinion", or null if not specified.
- "certainty": one of "high", "moderate", "low", "very low", or null if not specified.

Rules:
- Only include actionable recommendations (sentences with should/must/recommend/offer/consider/avoid/initiate/prescribe/first-line/contraindicated).
- Skip background text, epidemiology, definitions, study citations, and committee commentary.
- Skip recommendations that are only about "refer to section X" or "see guideline Y".
- Output ONLY the JSON objects, one per line. No other text.

GUIDELINE TEXT:
`;

async function callAi(aiService, text, sourceId) {
    const candidates = getProviderCandidates({}, serverConfig);
    const errors = [];
    for (const { provider, model } of candidates) {
        try {
            const raw = await aiService.callText(
                EXTRACTION_PROMPT + text.slice(0, 12000),
                provider,
                model,
                { maxOutputTokens: 4096, timeoutMs: 90000 }
            );
            return parseAiResponse(raw);
        } catch (err) {
            errors.push(`${provider}: ${err.message}`);
        }
    }
    throw new Error(`All providers failed for ${sourceId}: ${errors.join('; ')}`);
}

function parseAiResponse(raw) {
    const recs = [];
    for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('{')) continue;
        try {
            const obj = JSON.parse(trimmed);
            const text = (obj.text || obj.recommendation || '').trim();
            if (text.length >= MIN_REC_LENGTH && RECOMMENDATION_RE.test(text)) {
                recs.push({
                    text,
                    strength: obj.strength || null,
                    certainty: obj.certainty || null,
                });
            }
        } catch {
            // skip malformed lines
        }
    }
    return recs;
}

// ─── Chunking ─────────────────────────────────────────────────────────────────

function chunkText(text, chunkSize = 10000, overlap = 500) {
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        chunks.push(text.slice(start, end));
        if (end === text.length) break;
        start = end - overlap;
    }
    return chunks;
}

// ─── Per-guideline ingestion ──────────────────────────────────────────────────

async function getCurrentCount(sourceBody) {
    try {
        const rows = await db.all(
            `SELECT COUNT(*) as cnt FROM topic_guidelines WHERE source_body = $1 AND status = 'ai_extracted'`,
            [sourceBody]
        );
        return rows[0]?.cnt || 0;
    } catch {
        return 0;
    }
}

async function insertRecs(entry, recs, topicName) {
    let inserted = 0;
    for (const rec of recs) {
        if (DRY_RUN) {
            console.log(`  [DRY ${entry.sourceBody}] ${rec.text.slice(0, 90)}...`);
            inserted++;
            continue;
        }
        try {
            await db.createGuideline({
                topic: topicName,
                sourceBody: entry.sourceBody,
                sourceYear: entry.sourceYear || null,
                sourceUrl: entry.url || entry.htmlUrl || null,
                recommendationText: rec.text,
                recommendationStrength: rec.strength,
                recommendationCertainty: rec.certainty,
                population: null,
                intervention: null,
                cautions: null,
                status: 'ai_extracted',
            });
            inserted++;
        } catch (err) {
            if (!err.message?.includes('duplicate') && !err.message?.includes('unique')) {
                console.warn(`    [warn] Insert failed: ${err.message}`);
            }
        }
    }
    return inserted;
}

async function ingestGuideline(entry, aiService) {
    const result = { id: entry.id, inserted: 0, topics: 0, method: null, error: null };

    // Get topics that match this guideline's topic keywords
    const allTopics = await db.all('SELECT display_name FROM curriculum_topics ORDER BY sort_order');
    const matchingTopics = allTopics.filter(t => {
        const name = t.display_name.toLowerCase();
        return entry.topics.some(kw => name.includes(kw.toLowerCase()) || kw.toLowerCase().includes(name.split(':')[0].trim().toLowerCase()));
    });

    if (matchingTopics.length === 0) {
        console.log(`  ${entry.id}: no matching topics`);
        return result;
    }

    // Check if already well-covered
    const currentCount = await getCurrentCount(entry.sourceBody);
    // We don't skip by topic here — we want all matching topics covered

    // Get the guideline text — try HTML first (avoids journal paywalls), then PDF+GROBID
    let bodyText = '';

    if (!bodyText && entry.htmlUrl) {
        try {
            const html = await fetchGuidelineHtml(entry.htmlUrl);
            const extracted = extractTextFromHtml(html);
            // Only accept if substantial (landing pages return < 2KB of useful text)
            if (extracted.length > 3000) {
                bodyText = extracted;
                result.method = 'html';
                console.log(`  ${entry.id}: HTML extracted ${bodyText.length} chars`);
            } else {
                console.log(`  ${entry.id}: HTML too short (${extracted.length} chars), trying PDF...`);
            }
        } catch (err) {
            console.log(`  ${entry.id}: HTML failed (${err.message.slice(0, 60)}), trying PDF...`);
        }
    }

    if (!bodyText && entry.url) {
        // Try PDF download + GROBID
        try {
            console.log(`  ${entry.id}: downloading PDF...`);
            const pdfBuf = await downloadBuffer(entry.url);
            console.log(`  ${entry.id}: PDF ${Math.round(pdfBuf.length / 1024)}KB → GROBID...`);
            const tei = await processPdf(pdfBuf, { grobidUrl: process.env.GROBID_URL, timeoutMs: 120000 });
            bodyText = extractTeiBodyText(tei);
            result.method = 'grobid';
            console.log(`  ${entry.id}: GROBID extracted ${bodyText.length} chars`);
        } catch (err) {
            console.log(`  ${entry.id}: PDF/GROBID failed (${err.message.slice(0, 80)})`);
        }
    }

    if (!bodyText || bodyText.length < 500) {
        result.error = 'no text extracted';
        return result;
    }

    // Extract recs from chunks
    const chunks = chunkText(bodyText, 10000, 500);
    console.log(`  ${entry.id}: ${chunks.length} chunks → AI...`);

    const allRecs = [];
    const seenTexts = new Set();
    for (let i = 0; i < chunks.length; i++) {
        try {
            const recs = await callAi(aiService, chunks[i], entry.id);
            for (const r of recs) {
                if (!seenTexts.has(r.text)) {
                    seenTexts.add(r.text);
                    allRecs.push(r);
                }
            }
        } catch (err) {
            console.warn(`  ${entry.id} chunk ${i + 1}: AI error: ${err.message}`);
        }
        // Small delay between chunks
        if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 200));
    }

    console.log(`  ${entry.id}: ${allRecs.length} unique recs → inserting for ${matchingTopics.length} topics...`);

    for (const topic of matchingTopics) {
        const n = await insertRecs(entry, allRecs, topic.display_name);
        result.inserted += n;
        result.topics++;
    }

    return result;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    await db.connect();

    const alive = await isGrobidAlive();
    if (!alive) {
        console.warn('[warn] GROBID not reachable at', process.env.GROBID_URL, '— will fall back to HTML where available');
    } else {
        console.log('[ok] GROBID alive at', process.env.GROBID_URL);
    }

    const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
    const entries = GUIDELINE_FILTER
        ? catalog.filter(e => GUIDELINE_FILTER.has(e.id))
        : catalog;

    console.log(`[Intl Ingest] ${entries.length} guidelines to process${DRY_RUN ? ' (DRY RUN)' : ''}`);

    const aiService = createAiService({ serverConfig });

    let totalInserted = 0;
    let errors = 0;
    const report = [];

    // Process with limited concurrency
    for (let i = 0; i < entries.length; i += CONCURRENCY) {
        const batch = entries.slice(i, i + CONCURRENCY);
        const results = await Promise.all(batch.map(e => ingestGuideline(e, aiService).catch(err => ({ id: e.id, error: err.message, inserted: 0, topics: 0 }))));
        for (const r of results) {
            if (r.error) {
                console.log(`  ${r.id}: ERROR — ${r.error}`);
                errors++;
            } else {
                console.log(`  ${r.id}: +${r.inserted} recs across ${r.topics} topics (${r.method})`);
            }
            totalInserted += r.inserted;
            report.push(r);
        }
        // Polite delay between batches
        if (i + CONCURRENCY < entries.length) await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`\n[Intl Ingest] Done: ${totalInserted} recs inserted, ${errors} errors`);
    const summary = { runAt: new Date().toISOString(), guidelines: entries.length, inserted: totalInserted, errors, report };
    fs.writeFileSync('/tmp/ingest-intl-report.json', JSON.stringify(summary, null, 2));
    console.log('[Intl Ingest] Report: /tmp/ingest-intl-report.json');
    process.exit(errors > 0 ? 1 : 0);
}

main().catch(err => { console.error('[Intl Ingest] Fatal:', err.message); process.exit(1); });
