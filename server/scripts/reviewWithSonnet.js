'use strict';

/**
 * reviewWithSonnet.js
 * Claude Sonnet knowledge-based MCQ reviewer — no guideline dependency.
 * Used as a third reviewer for cold-start MCQs that lack guideline context.
 *
 * Usage:
 *   node server/scripts/reviewWithSonnet.js [--topics "topic1,topic2"] [--all-unreviewed] [--dry-run]
 *
 * --topics          Comma-separated list of specific topics to review
 * --all-unreviewed  Review all cold_start_mcq records with no reviewProvider
 * --dry-run         Print what would happen without writing
 *
 * Stores: reviewFlags, reviewedAt, reviewProvider: 'claude-sonnet-4-6' in object_payload
 * Compatible with the existing Haiku reviewFlags format.
 */

const { loadEnv, serverConfig } = require('../../config');
loadEnv();

const db = require('../../database');
const cache = require('../../cache');
const { safeFetch } = require('../utils/fetch');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ALL_UNREVIEWED = args.includes('--all-unreviewed');

const topicsArg = args.includes('--topics')
    ? args[args.indexOf('--topics') + 1].split(',').map(t => t.trim()).filter(Boolean)
    : [];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function buildSonnetReviewPrompt(topic, mcqs) {
    const mcqBlock = mcqs.map((q, i) =>
        `MCQ ${i + 1}: ${q.question}\nOptions: ${(q.options || []).join(' | ')}\nCorrect: ${q.correctAnswer}\nExplanation: ${String(q.explanation || '').slice(0, 600)}`
    ).join('\n\n');

    return `You are a senior medical educator reviewing single-best-answer MCQs about "${topic}" for a final-year medical student platform.

Review these MCQs using your clinical knowledge. No guidelines are provided — evaluate based on established medicine.

Flag an MCQ only if it has a genuine problem:
- "wrong_answer" — the keyed answer is factually incorrect
- "outdated" — the answer reflects outdated practice (specify what has changed)
- "dangerous_distractor" — an incorrect option could lead to patient harm if chosen in practice
- "misleading_vignette" — the clinical scenario is ambiguous or contradicts the intended answer
- "multiple_correct" — more than one option is defensibly correct

Do NOT flag MCQs that are merely imperfect or could be worded better. Only flag real clinical or structural errors.

MCQs TO REVIEW:
${mcqBlock}

Return ONLY valid JSON starting with { and ending with }. No markdown.
{"flags":[{"mcqIndex":1,"flagType":"wrong_answer","detail":"specific reason","suggestedFix":"how to correct it"}]}
Return {"flags":[]} if all MCQs are correct.`;
}

async function callSonnet(prompt) {
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
            max_tokens: 1500,
            temperature: 0.1,
            messages: [{ role: 'user', content: prompt }],
        }),
    });

    if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error('Sonnet ' + res.status + ': ' + t.slice(0, 200));
    }
    const data = await res.json();
    return (data.content && data.content[0] && data.content[0].text) || '';
}

function parseFlags(text) {
    try {
        const m = text.match(/\{[\s\S]*\}/);
        if (!m) return [];
        const parsed = JSON.parse(m[0]);
        return Array.isArray(parsed.flags) ? parsed.flags : [];
    } catch { return []; }
}

async function main() {
    console.log('\n=== Sonnet MCQ Knowledge Review ===');
    if (DRY_RUN) console.log('Mode: DRY RUN\n');

    await db.connect();
    await db.runMigrations();
    await cache.connect();

    let rows;

    if (topicsArg.length > 0) {
        const placeholders = topicsArg.map(() => '?').join(',');
        rows = await db.all(
            `SELECT id, topic, object_key, object_payload FROM teaching_objects
             WHERE object_type = 'cold_start_mcq' AND topic IN (${placeholders})`,
            topicsArg
        );
    } else if (ALL_UNREVIEWED) {
        rows = await db.all(
            `SELECT id, topic, object_key, object_payload FROM teaching_objects
             WHERE object_type = 'cold_start_mcq'
               AND object_payload NOT LIKE '%reviewProvider%'`
        );
    } else {
        console.error('Specify --topics "t1,t2,..." or --all-unreviewed');
        process.exit(1);
    }

    if (rows.length === 0) {
        console.log('No matching topics found.');
        await db.close();
        process.exit(0);
    }

    console.log('Topics to review: ' + rows.length + '\n');

    let clean = 0, flagged = 0, errors = 0;

    for (const row of rows) {
        let payload;
        try {
            payload = typeof row.object_payload === 'string'
                ? JSON.parse(row.object_payload)
                : row.object_payload;
        } catch { errors++; continue; }

        const mcqs = Array.isArray(payload.mcqs) ? payload.mcqs : [];
        if (mcqs.length === 0) { console.log('  ⚠ ' + row.topic + ': no MCQs — skipping'); continue; }

        process.stdout.write('  ' + row.topic + ' (' + mcqs.length + ' MCQs) ... ');

        if (DRY_RUN) { console.log('[dry-run]'); continue; }

        try {
            const prompt = buildSonnetReviewPrompt(row.topic, mcqs);
            const text = await callSonnet(prompt);
            const flags = parseFlags(text);

            const updatedPayload = {
                ...payload,
                reviewFlags: flags.length > 0 ? flags : (payload.reviewFlags || []),
                reviewedAt: new Date().toISOString(),
                reviewProvider: 'claude-sonnet-4-6',
            };

            await db.run(
                "UPDATE teaching_objects SET object_payload = ?, updated_at = datetime('now') WHERE id = ?",
                [JSON.stringify(updatedPayload), row.id]
            );

            if (flags.length > 0) {
                console.log(flags.length + ' flag(s): ' + flags.map(f => f.flagType).join(', '));
                flagged++;
            } else {
                console.log('clean');
                clean++;
            }

            await sleep(600);
        } catch (err) {
            console.log('ERROR: ' + err.message);
            errors++;
            await sleep(1500);
        }
    }

    console.log('\n--- Done ---');
    console.log('Clean: ' + clean + ' | Flagged: ' + flagged + ' | Errors: ' + errors);

    await db.close();
    process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
