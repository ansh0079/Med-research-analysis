'use strict';

/**
 * validateBackfill.js
 * Backfill Claude Sonnet MCQ validation for teaching objects created before
 * real-time validation started (2026-06-11T12:30:00Z).
 *
 * Usage:
 *   node server/scripts/validateBackfill.js [--limit n] [--dry-run]
 *
 * For each MCQ batch:
 *   1. Fetches topic_guidelines rows for the topic (source context)
 *   2. Sends MCQs + guideline context to Claude Sonnet for clinical review
 *   3. Stores result in object_payload._validation
 *   4. Tags object_payload._validationSource = 'backfill'
 */

const { loadEnv, serverConfig } = require('../../config');
loadEnv();

const db = require('../../database');
const cache = require('../../cache');
const { safeFetch } = require('../utils/fetch');

const args = process.argv.slice(2);
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : 9999;
const DRY_RUN = args.includes('--dry-run');

// Teaching objects created before this timestamp are backfill candidates
const REALTIME_CUTOFF = '2026-06-11T12:30:00.000Z';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function buildMcqValidationPrompt(topic, mcqs, guidelines) {
    const compact = mcqs.map((q, i) => ({
        mcqIndex: i + 1,
        question: String(q.question || '').slice(0, 900),
        options: Array.isArray(q.options) ? q.options.slice(0, 5) : [],
        correctAnswer: q.correctAnswer,
        explanation: String(q.explanation || '').slice(0, 600),
        guidelineRef: q.guidelineRef || null,
    }));

    const guidelineContext = guidelines.slice(0, 8).map((g, i) => ({
        index: i + 1,
        source: ((g.source_body || '') + ' ' + (g.source_year || '')).trim(),
        recommendation: String(g.recommendation_text || '').slice(0, 500),
        strength: g.recommendation_strength || null,
    }));

    const hasGuidelines = guidelineContext.length > 0;

    const guidelineSection = hasGuidelines
        ? `SOURCE GUIDELINES FOR THIS TOPIC (${guidelineContext.length} entries):
${JSON.stringify(guidelineContext, null, 2)}

Reject if the keyed answer or explanation directly contradicts any of these guidelines.
Set guidelineSupported = false only if the MCQ conflicts with or is explicitly contradicted by the guidelines above.`
        : `SOURCE GUIDELINES: None available for this topic.

Since no guidelines are provided, do NOT penalise MCQs for lacking guideline grounding.
Evaluate only: clinical correctness, MCQ structure quality, and plausibility of distractors.
Set guidelineSupported = true for all MCQs (no guideline context to check against).`;

    return `You are a strict medical education MCQ reviewer.
Review these ${mcqs.length} single-best-answer MCQs for topic: "${String(topic).slice(0, 200)}"

Reject an MCQ if ANY of the following apply:
- More than one option could reasonably be correct
- The keyed answer is factually incorrect based on established clinical medicine
- Distractors are implausible, not mutually exclusive, or clinically unsafe
- Explanation contains a clear clinical error
- Question stem is ambiguous or uses double negatives

${guidelineSection}

Return ONLY valid JSON with no markdown fences:
{"results":[{"mcqIndex":1,"valid":true,"issues":[],"reason":"brief reason","guidelineSupported":true}]}

MCQS TO REVIEW:
${JSON.stringify(compact, null, 2)}`;
}

async function callClaude(prompt) {
    const apiKey = serverConfig && serverConfig.keys && serverConfig.keys.anthropic;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
    const res = await safeFetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: AbortSignal.timeout(60000),
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 1800,
            temperature: 0.05,
            messages: [{ role: 'user', content: prompt }],
        }),
    });
    if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error('Claude ' + res.status + ': ' + t.slice(0, 200));
    }
    const data = await res.json();
    return (data.content && data.content[0] && data.content[0].text) || '';
}

function parseJson(text) {
    try {
        const m = text.match(/\{[\s\S]*\}/);
        return m ? JSON.parse(m[0]) : null;
    } catch (e) { return null; }
}

async function getGuidelinesForTopic(topic) {
    // topic_guidelines stores normalized_topic with spaces (e.g. "myocardial infarction"),
    // so normalize underscores → spaces before querying.
    const normalized = topic.toLowerCase().replace(/_/g, ' ').trim();
    return db.all(
        `SELECT source_body, source_year, recommendation_text, recommendation_strength, cautions
         FROM topic_guidelines
         WHERE normalized_topic = ?
         ORDER BY id ASC
         LIMIT 10`,
        [normalized]
    ).catch(() => []);
}

async function validateMcqBatch(topic, mcqs, guidelines) {
    const prompt = buildMcqValidationPrompt(topic, mcqs, guidelines);
    const text = await callClaude(prompt);
    const parsed = parseJson(text);
    const results = (parsed && parsed.results) || [];
    const byIndex = new Map(results.map(r => [Number(r.mcqIndex), r]));
    const rejections = [];
    const ungroundedFlags = [];
    for (let i = 1; i <= mcqs.length; i++) {
        const r = byIndex.get(i);
        if (r && r.valid === false) {
            rejections.push({ mcqIndex: i, issues: r.issues || [], reason: String(r.reason || '').slice(0, 300) });
        }
        if (r && r.guidelineSupported === false) {
            ungroundedFlags.push(i);
        }
    }
    return {
        validCount: mcqs.length - rejections.length,
        rejectCount: rejections.length,
        rejections,
        ungroundedFlags,
        guidelineCount: guidelines.length,
    };
}

async function main() {
    console.log('\n=== MCQ Validation Backfill (with guideline context) ===');
    console.log('Cutoff: ' + REALTIME_CUTOFF + ' | Limit: ' + LIMIT + ' | Dry-run: ' + DRY_RUN + '\n');

    await db.connect();
    await db.runMigrations();
    await cache.connect();

    const rows = await db.all(
        `SELECT id, object_key, object_type, topic, normalized_topic, provider, object_payload, created_at
         FROM teaching_objects
         WHERE object_type IN ('guideline_mcq', 'cold_start_mcq')
           AND created_at < ?
         ORDER BY created_at ASC
         LIMIT ?`,
        [REALTIME_CUTOFF, LIMIT]
    );

    const pending = rows.filter(r => {
        try {
            const p = typeof r.object_payload === 'string' ? JSON.parse(r.object_payload) : r.object_payload;
            return !p || !p._validation;
        } catch (e) { return true; }
    });

    console.log('MCQ batches before cutoff: ' + rows.length + ' total, ' + pending.length + ' unvalidated\n');

    let passed = 0, flagged = 0, errors = 0, noGuidelines = 0;

    for (let idx = 0; idx < pending.length; idx++) {
        const row = pending[idx];
        let payload;
        try {
            payload = typeof row.object_payload === 'string' ? JSON.parse(row.object_payload) : row.object_payload;
        } catch (e) { errors++; continue; }

        const mcqs = payload && payload.mcqs;
        if (!Array.isArray(mcqs) || mcqs.length === 0) continue;

        const normalizedTopic = row.normalized_topic || row.topic.toLowerCase().replace(/\s+/g, '_');
        const guidelines = await getGuidelinesForTopic(normalizedTopic);

        process.stdout.write(
            '  [' + (idx + 1) + '/' + pending.length + '] ' +
            row.topic + ' (' + guidelines.length + ' guidelines) ... '
        );

        if (guidelines.length === 0) noGuidelines++;

        try {
            if (DRY_RUN) { console.log('[dry-run]'); continue; }

            const result = await validateMcqBatch(row.topic, mcqs, guidelines);
            console.log(
                'valid: ' + result.validCount + '/' + mcqs.length +
                ', rejected: ' + result.rejectCount +
                (result.ungroundedFlags.length ? ', ungrounded: ' + result.ungroundedFlags.length : '')
            );

            payload._validation = {
                checkedAt: new Date().toISOString(),
                model: 'claude-sonnet-4-6',
                validationSource: 'backfill',
                guidelineCount: result.guidelineCount,
                validCount: result.validCount,
                rejectCount: result.rejectCount,
                rejections: result.rejections,
                ungroundedMcqIndices: result.ungroundedFlags,
            };

            await db.run(
                "UPDATE teaching_objects SET object_payload = ?, updated_at = datetime('now') WHERE id = ?",
                [JSON.stringify(payload), row.id]
            );

            if (result.rejectCount > 0) flagged++; else passed++;
            await sleep(400);
        } catch (err) {
            console.log('ERROR: ' + err.message);
            errors++;
            await sleep(1500);
        }
    }

    console.log('\n--- Backfill complete ---');
    console.log('Clean: ' + passed + ' | Has rejections: ' + flagged + ' | Errors: ' + errors + ' | No guidelines found: ' + noGuidelines);
    console.log('\nRecords created after ' + REALTIME_CUTOFF + ' have real-time validation (Claude cross-check on generation).');
    console.log('Records with _validation.validationSource = "backfill" were validated by this script.');

    await db.close();
    process.exit(0);
}

main().catch(function(err) { console.error('Fatal:', err); process.exit(1); });
