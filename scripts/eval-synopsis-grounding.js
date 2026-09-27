#!/usr/bin/env node
/**
 * Before/after for synopsis grounding: does writing from verified quotes reduce rejections, and at
 * what cost?
 *
 *   node scripts/eval-synopsis-grounding.js                 30 articles from the local article cache
 *   node scripts/eval-synopsis-grounding.js --n 50 --seed 7
 *   node scripts/eval-synopsis-grounding.js --json
 *
 * Each article is run through both generation paths - the ordinary prompt, and quote-first - and each
 * result is judged by the grounding critic as it was (numbers checked per field against one source
 * sentence) and as it is now (per claim sentence). Nothing is written anywhere; this makes model
 * calls (two or three per article) and reports.
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { loadEnv, serverConfig } = require('../config');
loadEnv();

const Database = require('better-sqlite3');
const { getSharedAiService, TEMPERATURE } = require('../server/services/aiService');
const { resolveProvider } = require('../server/utils/aiProvider');
const { buildSynopsisPrompt } = require('../server/prompts');
const { validateAiOutput, articleEvidenceTextForNumericGrounding, extractNumericTokens } = require('../server/services/aiOutputValidation');
const { buildClaimGrounding, runSynopsisCritic, failClosedGroundingFindings, bestEvidenceSpan, MAJOR_CLAIM_FIELDS } = require('../server/services/synopsisGroundingService');
const { extractEvidenceQuotes } = require('../server/services/ai/synopsisEvidenceQuotes');

function arg(flag, fallback) {
    const i = process.argv.indexOf(flag);
    return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const N = Math.max(1, Math.min(200, Number(arg('--n', 30)) || 30));
const SEED = Number(arg('--seed', 42)) || 42;
const asJson = process.argv.includes('--json');

/** Deterministic shuffle so a rerun judges the same articles. */
function seeded(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

function loadArticles() {
    const db = new Database(path.join(__dirname, '..', 'database', 'app.db'), { readonly: true });
    const rows = db.prepare(`SELECT data FROM article_cache WHERE length(json_extract(data, '$.abstract')) >= 600`).all();
    const articles = rows.map((r) => { try { return JSON.parse(r.data); } catch { return null; } })
        .filter((a) => a && a.title && /\d/.test(a.abstract || '')); // results worth grounding carry numbers
    const rand = seeded(SEED);
    for (let i = articles.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [articles[i], articles[j]] = [articles[j], articles[i]];
    }
    return articles.slice(0, N);
}

/** The critic's number rule as it was before the per-sentence fix: whole field vs one sentence. */
function oldCriticFails(synopsis, article) {
    const source = articleEvidenceTextForNumericGrounding(article);
    for (const field of MAJOR_CLAIM_FIELDS) {
        const value = synopsis?.[field];
        const text = Array.isArray(value) ? value.join(' ') : String(value || '');
        if (!text.trim()) continue;
        const ev = bestEvidenceSpan(text, source);
        if (!ev.span) return true;
        if (extractNumericTokens(text).length && ev.numberCoverage < 1) return true;
    }
    return false;
}

async function generate(article, ai, provider, model, { quoteFirst }) {
    const started = Date.now();
    let quotes = { used: false, quotes: [], dropped: 0 };
    if (quoteFirst) quotes = await extractEvidenceQuotes({ article, ai, provider, model, topic: 'eval' });
    const prompt = buildSynopsisPrompt(article, { topic: '', evidenceQuotes: quotes.used ? quotes.quotes : null });
    let raw;
    try {
        raw = await ai.callStructured(prompt, provider, model, {
            temperature: TEMPERATURE.synopsis,
            usage: { operation: 'synopsis', topic: 'eval' },
        });
    } catch (err) {
        return { ok: false, stage: 'model', error: String(err.message || err).slice(0, 160), ms: Date.now() - started, quotes };
    }
    const validated = validateAiOutput('paper_synopsis', raw, { allowDegrade: false });
    if (!validated.ok) return { ok: false, stage: 'schema', ms: Date.now() - started, quotes };
    const synopsis = validated.data;
    const critic = runSynopsisCritic(synopsis, { claimGrounding: buildClaimGrounding(synopsis, article), abstractOnly: true });
    const newFail = failClosedGroundingFindings(critic);
    if (newFail.length && process.argv.includes('--show-rejections')) {
        const source = articleEvidenceTextForNumericGrounding(article);
        const sourceNums = new Set(extractNumericTokens(source));
        for (const f of newFail) {
            const text = String(synopsis[f.field] || '');
            const missing = extractNumericTokens(text).filter((n) => !sourceNums.has(n));
            process.stderr.write(`\n[${quoteFirst ? 'qf' : 'base'}] ${f.field}: ${text.slice(0, 260)}\n   not in source anywhere: ${missing.join(', ') || '(all present - mis-attributed)'}\n`);
        }
    }
    return {
        ok: true,
        ms: Date.now() - started,
        chars: JSON.stringify(raw).length,
        oldCriticRejects: oldCriticFails(synopsis, article),
        newCriticRejects: newFail.length > 0,
        newFindings: newFail.map((f) => `${f.code}:${f.field}`),
        quotes,
    };
}

function summarise(results) {
    const done = results.filter((r) => r.ok);
    const pct = (n, d) => (d ? `${Math.round((100 * n) / d)}%` : 'n/a');
    const avg = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
    return {
        n: results.length,
        modelOrSchemaFailures: results.length - done.length,
        rejectedByOldCritic: done.filter((r) => r.oldCriticRejects).length,
        rejectedByNewCritic: done.filter((r) => r.newCriticRejects).length,
        servedRateNewCritic: pct(done.filter((r) => !r.newCriticRejects).length, results.length),
        servedRateOldCritic: pct(done.filter((r) => !r.oldCriticRejects).length, results.length),
        avgMs: avg(results.map((r) => r.ms)),
        avgOutputChars: avg(done.map((r) => r.chars)),
    };
}

async function main() {
    const { provider, model } = resolveProvider({ provider: 'auto' }, serverConfig);
    if (!provider) throw new Error('No AI provider configured (.env)');
    const ai = getSharedAiService({ serverConfig, fetchImpl: global.fetch });
    const articles = loadArticles();
    const rows = [];
    for (const [i, article] of articles.entries()) {
        const baseline = await generate(article, ai, provider, model, { quoteFirst: false });
        const quoteFirst = await generate(article, ai, provider, model, { quoteFirst: true });
        rows.push({ uid: article.uid || article.pmid, title: String(article.title).slice(0, 90), baseline, quoteFirst });
        if (!asJson) process.stderr.write(`\r${i + 1}/${articles.length}`);
    }
    const quoteStats = rows.map((r) => r.quoteFirst.quotes).filter(Boolean);
    const report = {
        provider,
        model,
        seed: SEED,
        baseline: summarise(rows.map((r) => r.baseline)),
        quoteFirst: summarise(rows.map((r) => r.quoteFirst)),
        quotes: {
            articlesWithEnoughVerified: quoteStats.filter((q) => q.used).length,
            avgVerified: Math.round((10 * quoteStats.reduce((a, q) => a + q.quotes.length, 0)) / Math.max(1, quoteStats.length)) / 10,
            avgDroppedAsNotVerbatim: Math.round((10 * quoteStats.reduce((a, q) => a + (q.dropped || 0), 0)) / Math.max(1, quoteStats.length)) / 10,
        },
        rows,
    };
    if (asJson) { console.log(JSON.stringify(report, null, 2)); return; }
    process.stderr.write('\n');
    console.log(`Synopsis grounding eval: ${rows.length} articles, ${provider}/${model}, seed ${SEED}\n`);
    const cols = ['n', 'modelOrSchemaFailures', 'rejectedByOldCritic', 'rejectedByNewCritic', 'servedRateOldCritic', 'servedRateNewCritic', 'avgMs', 'avgOutputChars'];
    console.log('metric'.padEnd(24) + 'baseline'.padEnd(14) + 'quote-first');
    for (const c of cols) console.log(c.padEnd(24) + String(report.baseline[c]).padEnd(14) + String(report.quoteFirst[c]));
    console.log(`\nquotes: ${report.quotes.articlesWithEnoughVerified}/${rows.length} articles had enough verified quotes; `
        + `avg ${report.quotes.avgVerified} verified, ${report.quotes.avgDroppedAsNotVerbatim} dropped as not verbatim`);
    const newRejects = rows.filter((r) => r.baseline.newCriticRejects || r.quoteFirst.newCriticRejects);
    if (newRejects.length) {
        console.log('\nstill rejected (new critic):');
        for (const r of newRejects) console.log(`  ${r.uid}  baseline=${r.baseline.newFindings?.join(',') || '-'}  quote-first=${r.quoteFirst.newFindings?.join(',') || '-'}`);
    }
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
