'use strict';

/**
 * fixPaperMcqs.js
 * Rewrite paper_mcq MCQs that were flagged by the Sonnet cross-checker.
 *
 * Each paper_mcq object stores MCQs as payload.mcqs[].
 * Flagged MCQs have a _flag object: { flagType, detail, suggestedFix }.
 * This script rewrites each flagged MCQ using Gemini (same model that generated it),
 * passing the original paper context so the rewrite stays grounded.
 *
 * Usage:
 *   node server/scripts/fixPaperMcqs.js [--dry-run] [--limit n]
 *
 * After a successful rewrite the _flag is removed and _fixed is set.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { loadEnv, serverConfig } = require('../../config');
loadEnv();

const db = require('../../database');
const cache = require('../../cache');
const { safeFetch } = require('../utils/fetch');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : 9999;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function buildRewritePrompt(topic, mcq, flag, paperContext) {
    const optionsText = (mcq.options || []).map((o, i) =>
        `  ${String.fromCharCode(65 + i)}: ${o}`
    ).join('\n');

    const paperSummary = (paperContext || []).slice(0, 3).map((p, i) =>
        `Paper ${i + 1}: ${p.title || 'Untitled'} — ${p.mainFindings || p.bottomLine || ''}`
    ).join('\n');

    return `You are a senior medical educator correcting a flawed paper-grounded MCQ about "${topic}".

FLAGGED MCQ:
Question: ${mcq.question}

Options:
${optionsText}

Correct answer: ${mcq.correctAnswer}
Explanation: ${mcq.explanation || '(none)'}
Paper cited: Paper ${mcq.paperIndex || '?'} — ${mcq.sourceReference || ''}

FLAG: ${flag.flagType}
REASON: ${flag.detail}
SUGGESTED FIX: ${flag.suggestedFix || '(none)'}

SOURCE PAPERS (for grounding):
${paperSummary}

Rewrite this MCQ to fix the flagged issue. Keep it grounded in the paper evidence.
Return ONLY valid JSON — no markdown:
{
  "question": "...",
  "options": ["A: ...", "B: ...", "C: ...", "D: ..."],
  "correctAnswer": "A",
  "explanation": "2-3 sentences citing the specific paper finding",
  "difficulty": "${mcq.difficulty || 'medium'}",
  "questionType": "${mcq.questionType || 'clinical_application'}"
}`;
}

async function callGemini(prompt) {
    const apiKey = serverConfig?.keys?.gemini;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set');

    const res = await safeFetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        {
            method: 'POST',
            signal: AbortSignal.timeout(60000),
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
            }),
        }
    );

    if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error('Gemini ' + res.status + ': ' + t.slice(0, 200));
    }
    const data = await res.json();
    if (data.promptFeedback?.blockReason) throw new Error('Blocked: ' + data.promptFeedback.blockReason);
    const parts = data.candidates?.[0]?.content?.parts || [];
    for (let i = parts.length - 1; i >= 0; i--) {
        if (parts[i].text) return parts[i].text;
    }
    return '';
}

function parseJson(text) {
    try {
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const m = cleaned.match(/\{[\s\S]*\}/);
        return m ? JSON.parse(m[0]) : null;
    } catch { return null; }
}

async function main() {
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║  Fix Flagged Paper MCQs                    ║');
    console.log('╚══════════════════════════════════════════╝');
    if (DRY_RUN) console.log('Mode: DRY RUN\n');

    await db.connect();
    await db.runMigrations();
    await cache.connect();

    // Find paper_mcq objects that have crossCheckFlags > 0
    const rows = await db.all(
        `SELECT id, topic, object_key, object_payload
         FROM teaching_objects
         WHERE object_type = 'paper_mcq'
           AND (object_payload::jsonb->>'crossCheckFlags')::int > 0
         ORDER BY topic ASC
         LIMIT $1`,
        [LIMIT]
    );

    if (rows.length === 0) {
        console.log('No flagged paper_mcq objects found.');
        await db.close();
        process.exit(0);
    }

    console.log(`Found ${rows.length} paper_mcq batch(es) with flags.\n`);

    let totalFixed = 0, totalFailed = 0, totalSkipped = 0;

    for (const row of rows) {
        let payload;
        try {
            payload = typeof row.object_payload === 'string'
                ? JSON.parse(row.object_payload)
                : row.object_payload;
        } catch {
            console.warn(`  ⚠ Could not parse payload for ${row.topic}`);
            totalFailed++;
            continue;
        }

        const mcqs = Array.isArray(payload.mcqs) ? payload.mcqs : [];
        const flaggedMcqs = mcqs.filter(q => q._flag);

        if (flaggedMcqs.length === 0) {
            totalSkipped++;
            continue;
        }

        // Reconstruct paper context from stored paperTitles (lightweight — no re-fetch needed)
        const paperContext = (payload.paperTitles || []).map((title, i) => ({
            title,
            mainFindings: '',
            bottomLine: '',
        }));

        process.stdout.write(`  ${row.topic} (${flaggedMcqs.length} flag(s)) ... `);

        if (DRY_RUN) {
            flaggedMcqs.forEach(q => {
                const idx = mcqs.indexOf(q) + 1;
                console.log(`\n    [dry-run] MCQ #${idx}: ${q._flag.flagType} — ${q._flag.detail?.slice(0, 80)}`);
            });
            continue;
        }

        let fixedInBatch = 0;

        for (const mcq of flaggedMcqs) {
            const flag = mcq._flag;
            const prompt = buildRewritePrompt(row.topic, mcq, flag, paperContext);

            try {
                const raw = await callGemini(prompt);
                const rewritten = parseJson(raw);

                if (!rewritten?.question || !Array.isArray(rewritten.options)) {
                    console.warn(`\n    ⚠ MCQ #${mcqs.indexOf(mcq) + 1}: bad JSON from Gemini`);
                    totalFailed++;
                    continue;
                }

                // Update MCQ in place: apply rewrite, remove _flag, add _fixed
                const idx = mcqs.indexOf(mcq);
                mcqs[idx] = {
                    ...mcq,
                    question: rewritten.question,
                    options: rewritten.options,
                    correctAnswer: rewritten.correctAnswer || mcq.correctAnswer,
                    explanation: rewritten.explanation || mcq.explanation,
                    difficulty: rewritten.difficulty || mcq.difficulty,
                    questionType: rewritten.questionType || mcq.questionType,
                    _fixed: {
                        fixedAt: new Date().toISOString(),
                        originalFlag: flag,
                        model: 'gemini-2.5-flash',
                    },
                    _flag: undefined,
                };
                // Clean up undefined key
                delete mcqs[idx]._flag;

                fixedInBatch++;
                totalFixed++;
                await sleep(400);
            } catch (err) {
                console.warn(`\n    ⚠ MCQ rewrite failed: ${err.message.slice(0, 100)}`);
                totalFailed++;
                await sleep(1500);
            }
        }

        // Recalculate crossCheckFlags (remaining unfixed flags)
        const remainingFlags = mcqs.filter(q => q._flag).length;
        const updatedPayload = {
            ...payload,
            mcqs,
            crossCheckFlags: remainingFlags,
            fixedAt: new Date().toISOString(),
            fixedCount: fixedInBatch,
        };

        await db.run(
            `UPDATE teaching_objects SET object_payload = $1, updated_at = NOW() WHERE id = $2`,
            [JSON.stringify(updatedPayload), row.id]
        );

        console.log(`fixed ${fixedInBatch}/${flaggedMcqs.length}`);
        await sleep(600);
    }

    console.log('\n--- Fix Paper MCQs Complete ---');
    console.log(`Fixed: ${totalFixed} | Failed: ${totalFailed} | Skipped: ${totalSkipped}`);

    await db.close();
    process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
