'use strict';

/**
 * extractDocumentRecommendations.js
 *
 * For guideline_documents that have stored full text, ask a model which sentences state a clinical
 * recommendation (it returns sentence numbers only) and store those sentences verbatim in
 * document_recommendations. Each document costs one model call per ~14k characters of text.
 *
 * Usage:
 *   node server/scripts/extractDocumentRecommendations.js --limit <n> [--dry-run] [--force]
 *        [--id <documentId>] [--title <text>]   (--title picks documents whose title contains the text)
 *
 * Refuses to run without --limit or --id: every document is a paid model call.
 */

const { loadEnv, serverConfig } = require('../../config');
loadEnv();

const db = require('../../database');
const { safeFetch } = require('../utils/fetch');
const { getSharedAiService } = require('../services/aiService');
const { getProviderCandidates } = require('../utils/aiProvider');
const { PROMPT_VERSION, extractDocumentRecommendations } = require('../services/guideline/documentRecommendationExtraction');

const args = process.argv.slice(2);
const arg = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
if (!args.includes('--limit') && !args.includes('--id')) {
    console.error('Refusing to run without --limit <n> or --id <documentId>: each document is a paid model call.');
    process.exit(1);
}
const LIMIT = arg('--limit') ? parseInt(arg('--limit'), 10) : 1;
const ONLY_ID = arg('--id') ? Number(arg('--id')) : null;
const TITLE = arg('--title');
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');

function kindOf(title) {
    const t = String(title || '').toLowerCase();
    if (/meta-?analys/.test(t)) return 'meta-analysis';
    if (/systematic review/.test(t)) return 'systematic review';
    if (/guideline|consensus|recommendation/.test(t)) return 'guideline';
    return 'review article';
}

(async () => {
    await db.connect();
    const ai = getSharedAiService({ serverConfig, fetchImpl: safeFetch });
    const candidates = getProviderCandidates({}, serverConfig);
    if (!candidates.length) throw new Error('No AI provider configured');

    let model = null;
    const callModel = async (prompt) => {
        let lastErr = null;
        for (const c of candidates) {
            try {
                const out = await ai.callText(prompt, c.provider, c.model, {
                    temperature: 0, maxOutputTokens: 600, timeoutMs: 90000, usage: { operation: 'document_recommendation_extraction' },
                });
                model = `${c.provider}:${c.model}`;
                return out;
            } catch (err) { lastErr = err; }
        }
        throw lastErr || new Error('all providers failed');
    };

    const where = ["full_text IS NOT NULL", "LENGTH(full_text) > 2000"];
    const params = [];
    if (ONLY_ID) { where.push('id = ?'); params.push(ONLY_ID); }
    if (TITLE) { where.push('LOWER(title) LIKE ?'); params.push(`%${String(TITLE).toLowerCase()}%`); }
    if (!FORCE) where.push('NOT EXISTS (SELECT 1 FROM document_recommendations r WHERE r.document_id = guideline_documents.id)');
    const rows = await db.all(
        `SELECT id, title, full_text FROM guideline_documents WHERE ${where.join(' AND ')} ORDER BY source_year DESC NULLS LAST, id DESC LIMIT ?`,
        [...params, LIMIT],
    );
    console.log(`${rows.length} document(s) to process${DRY_RUN ? ' (dry run)' : ''}`);

    let total = 0;
    for (const d of rows) {
        const kind = kindOf(d.title);
        if (DRY_RUN) { console.log(`#${d.id} [${kind}] ${String(d.title).slice(0, 90)} - ${d.full_text.length} chars`); continue; }
        try {
            const { items, batches, sentences } = await extractDocumentRecommendations({ fullText: d.full_text, kind, title: d.title, callModel });
            await db.saveDocumentRecommendations(d.id, items, { model, promptVersion: PROMPT_VERSION });
            total += items.length;
            console.log(`#${d.id} [${kind}] ${String(d.title).slice(0, 70)}: ${items.length} recommendations from ${sentences} sentences in ${batches} call(s)`);
        } catch (err) {
            console.error(`#${d.id} failed: ${err.message}`);
        }
    }
    console.log(`done, ${total} recommendations stored`);
    process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
