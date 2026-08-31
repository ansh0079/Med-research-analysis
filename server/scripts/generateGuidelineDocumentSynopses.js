'use strict';

/**
 * generateGuidelineDocumentSynopses.js
 *
 * Generate a per-document synopsis for guideline_documents rows.
 *
 * 161 raw guideline/trial documents were ingested with full_text but no
 * reader-facing summary -- teaching_objects only ever held a per-topic rollup
 * (guideline_summary), never a synopsis of an individual document. The
 * existing recommendation-level extraction (topic_guidelines, 16,993 rows) is
 * not usable as a substitute here: its document_id link back to
 * guideline_documents was populated for only 1 of the 161 documents, and it
 * carries a freeform source_url/source_body rather than a canonical
 * pmcid/doi, so there is no reliable join to backfill that link cheaply.
 * This generates directly from full_text instead.
 *
 * Output shape (stored in guideline_documents.synopsis_json):
 *   {
 *     scope: string,               -- what population/condition/setting this document covers
 *     keyRecommendations: [        -- 3-8 of the most clinically load-bearing points
 *       { text, strength: 'strong'|'conditional'|'not_graded', population }
 *     ],
 *     clinicalBottomLine: string,  -- one or two sentences a clinician could act on
 *     notableCaveats: [string],    -- limitations, populations excluded, conflicting evidence flagged in the text
 *   }
 *
 * Usage:
 *   node server/scripts/generateGuidelineDocumentSynopses.js [--limit n] [--dry-run] [--force] [--id <id>]
 */

const { loadEnv, serverConfig } = require('../../config');
loadEnv();

const db = require('../../database');
const { safeFetch } = require('../utils/fetch');

const args = process.argv.slice(2);
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : 9999;
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');
const ONLY_ID = args.includes('--id') ? args[args.indexOf('--id') + 1] : null;

// Full text is capped rather than sent whole -- the longest document is
// ~35k words. This keeps cost and latency bounded; the model is told the
// text may be truncated so it does not fabricate closing sections it never saw.
const MAX_CHARS = 60000; // ~15k tokens

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

const PROVIDER = args.includes('--provider') ? args[args.indexOf('--provider') + 1] : 'gemini';

async function callSonnet(prompt) {
    const apiKey = serverConfig?.keys?.anthropic;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
    const res = await safeFetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        timeout: 90000,
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 1500,
            temperature: 0.1,
            messages: [{ role: 'user', content: prompt }],
        }),
    });
    if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`Sonnet ${res.status}: ${t.slice(0, 300)}`);
    }
    const data = await res.json();
    return data.content?.[0]?.text || '';
}

async function callGemini(prompt) {
    const apiKey = serverConfig?.keys?.gemini;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set');
    const res = await safeFetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        {
            method: 'POST',
            timeout: 90000,
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
            }),
        }
    );
    if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`Gemini ${res.status}: ${t.slice(0, 300)}`);
    }
    const data = await res.json();
    if (data.promptFeedback?.blockReason) throw new Error(`Blocked: ${data.promptFeedback.blockReason}`);
    const parts = data.candidates?.[0]?.content?.parts || [];
    for (let i = parts.length - 1; i >= 0; i--) {
        if (parts[i].text) return parts[i].text;
    }
    return '';
}

async function callLlm(prompt) {
    return PROVIDER === 'anthropic' ? callSonnet(prompt) : callGemini(prompt);
}

function parseJson(text) {
    try {
        const cleaned = String(text).replace(/```json/gi, '').replace(/```/g, '').trim();
        const m = cleaned.match(/\{[\s\S]*\}/);
        return m ? JSON.parse(m[0]) : null;
    } catch {
        return null;
    }
}

function buildPrompt(doc) {
    const truncated = doc.full_text.length > MAX_CHARS;
    const text = doc.full_text.slice(0, MAX_CHARS);
    const truncationNote = truncated
        ? '- This document has been truncated to its first portion. Do not claim knowledge of a conclusion or recommendation appearing only in a section you cannot see; if the visible portion appears to be introduction/methods only, note that in clinicalBottomLine instead of guessing.'
        : '';
    return [
        'You are summarising a clinical guideline/consensus/trial document for a medical education platform.',
        'Read the document below and produce ONLY a JSON object (no prose, no markdown fences) with this exact shape:',
        '',
        '{',
        '  "scope": "one sentence: what population, condition, or clinical setting this document addresses",',
        '  "keyRecommendations": [',
        '    { "text": "the specific, actionable recommendation, in the document\'s own clinical terms", "strength": "strong" | "conditional" | "not_graded", "population": "who it applies to, or null if general" }',
        '  ],',
        '  "clinicalBottomLine": "one or two sentences a clinician could act on directly",',
        '  "notableCaveats": ["limitations, excluded populations, or conflicting evidence the document itself flags"]',
        '}',
        '',
        'Rules:',
        '- keyRecommendations: 3 to 8 entries, the most clinically load-bearing points only. Do not pad to reach a count.',
        '- "strength": use "strong" only if the document itself grades it that way (e.g. GRADE strong, Class I); "conditional" for weak/conditional/Class IIa-b; "not_graded" if the document states no formal grade or none is given.',
        '- Do not invent a recommendation the text does not state. If the document is a single-topic trial report rather than a multi-recommendation guideline, keyRecommendations may have as few as 1 entry -- the trial\'s main finding, stated as a recommendation only if the document itself frames it that way, otherwise as the finding.',
        '- notableCaveats can be an empty array if the document states none.',
        '- If this document is a correction/erratum notice with no clinical content of its own (only',
        '  amending a prior publication), keyRecommendations may be an empty array -- state that plainly',
        '  in clinicalBottomLine (containing the word "correction" or "erratum") rather than fabricating a recommendation.',
        truncationNote,
        '',
        `DOCUMENT TITLE: ${doc.title}`,
        `SOURCE: ${doc.source_body || 'unknown'}, ${doc.source_year || 'year unknown'}`,
        'DOCUMENT TEXT:',
        text,
    ].filter(Boolean).join('\n');
}

function validate(parsed) {
    if (!parsed || typeof parsed !== 'object') return 'not an object';
    if (typeof parsed.scope !== 'string' || !parsed.scope.trim()) return 'missing scope';
    if (!Array.isArray(parsed.keyRecommendations)) return 'missing keyRecommendations';
    // Some ingested documents are genuinely thin -- an erratum notice, or a
    // full_text that only captured the abstract/introduction of a longer
    // guideline. The prompt already tells the model not to fabricate a
    // recommendation to fill the array, so an empty array plus a
    // clinicalBottomLine that says as much (checked below, both required
    // regardless) is a correct output, not a failure to force a retry on.
    for (const r of parsed.keyRecommendations) {
        if (!r || typeof r.text !== 'string' || !r.text.trim()) return 'a recommendation is missing text';
        if (!['strong', 'conditional', 'not_graded'].includes(r.strength)) return `invalid strength: ${r.strength}`;
    }
    if (typeof parsed.clinicalBottomLine !== 'string' || !parsed.clinicalBottomLine.trim()) return 'missing clinicalBottomLine';
    if (!Array.isArray(parsed.notableCaveats)) return 'notableCaveats must be an array';
    return null;
}

async function main() {
    await db.connect();

    const where = [];
    const params = [];
    if (ONLY_ID) { where.push('id = ?'); params.push(ONLY_ID); }
    else if (!FORCE) { where.push('synopsis_json IS NULL'); }
    const sql = `SELECT id, title, source_body, source_year, full_text FROM guideline_documents
                 ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                 ORDER BY id LIMIT ${LIMIT}`;
    const rows = await db.all(sql, params);

    console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}${rows.length} document(s) to process`);

    let ok = 0;
    let failed = 0;
    for (const doc of rows) {
        try {
            const prompt = buildPrompt(doc);
            const text = await callLlm(prompt);
            const parsed = parseJson(text);
            const err = validate(parsed);
            if (err) {
                console.log(`  FAIL  [${doc.id}] ${doc.title.slice(0, 60)} -- ${err}`);
                failed++;
                await sleep(400);
                continue;
            }
            console.log(`  OK    [${doc.id}] ${doc.title.slice(0, 60)} -- ${parsed.keyRecommendations.length} recs`);
            ok++;
            if (!DRY_RUN) {
                await db.run(
                    'UPDATE guideline_documents SET synopsis_json = ?, synopsis_generated_at = ?, synopsis_model = ? WHERE id = ?',
                    [JSON.stringify(parsed), new Date().toISOString(), PROVIDER === 'anthropic' ? 'claude-sonnet-4-6' : 'gemini-2.5-flash', doc.id]
                );
            }
        } catch (e) {
            console.log(`  ERROR [${doc.id}] ${doc.title.slice(0, 60)} -- ${e.message.slice(0, 120)}`);
            failed++;
        }
        await sleep(400);
    }

    console.log(`\ndone: ${ok} succeeded, ${failed} failed`);
    await db.close();
}

if (require.main === module) {
    main().catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { buildPrompt, validate, parseJson };
