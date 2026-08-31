'use strict';

/**
 * clinicalQaMcqSample.js
 *
 * Systematic clinical accuracy review of a stratified MCQ sample.
 *
 * A manual 12-question review earlier found a real defect rate of roughly
 * 1 in 6 (a wrong answer on post-extubation cuff-leak management, a wrong
 * drug dose in a stem) -- above any reasonable beta bar, but a sample of 12
 * proves nothing about 11,246 questions. This runs the same kind of review
 * at a size that does: an LLM clinical-accuracy check against each sampled
 * question's own stated correct answer and explanation, independent of
 * whether the question structurally validates (it already does -- see the
 * payload-shape fixes earlier this session).
 *
 * This does NOT rewrite content. It writes a verdict per question to
 * quiz_validation_results (built for exactly this, previously empty) so a
 * human reviewer can triage flagged rows, and prints a defect-rate summary
 * by object_type and specialty.
 *
 * Usage:
 *   node server/scripts/clinicalQaMcqSample.js [--sample n] [--seed n] [--dry-run] [--provider gemini|anthropic]
 */

const crypto = require('crypto');
const { loadEnv, serverConfig } = require('../../config');
loadEnv();

const db = require('../../database');
const { safeFetch } = require('../utils/fetch');

const args = process.argv.slice(2);
const SAMPLE_SIZE = args.includes('--sample') ? parseInt(args[args.indexOf('--sample') + 1], 10) : 300;
const SEED = args.includes('--seed') ? parseInt(args[args.indexOf('--seed') + 1], 10) : 42;
const DRY_RUN = args.includes('--dry-run');
const PROVIDER = args.includes('--provider') ? args[args.indexOf('--provider') + 1] : 'gemini';

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// Deterministic PRNG so --seed reproduces the same sample across runs.
function mulberry32(a) {
    return function seeded() {
        let t = (a += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function stableQuestionId(topic, objectType, question, correctAnswer) {
    return crypto.createHash('sha1').update(`${topic}|${objectType}|${question}|${correctAnswer}`).digest('hex').slice(0, 16);
}

async function callGemini(prompt) {
    const apiKey = serverConfig?.keys?.gemini;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set');
    const res = await safeFetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        {
            method: 'POST',
            timeout: 60000,
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
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

async function callSonnet(prompt) {
    const apiKey = serverConfig?.keys?.anthropic;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
    const res = await safeFetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        timeout: 60000,
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 1200,
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

function buildReviewPrompt(mcq, topic) {
    const options = Array.isArray(mcq.options) ? mcq.options.join('\n') : JSON.stringify(mcq.options);
    return [
        'You are a clinical accuracy reviewer for a medical education platform. You are reviewing a single',
        'multiple-choice question that has already been checked for structural validity -- your job is ONLY',
        'to judge whether it is clinically correct as written.',
        '',
        'Produce ONLY a JSON object (no prose, no markdown fences):',
        '{',
        '  "verdict": "correct" | "flagged",',
        '  "issues": ["specific problem, e.g. wrong stated answer / wrong dose in stem / two defensible options / outdated guidance"],',
        '  "confidence": "high" | "medium" | "low"',
        '}',
        '',
        'Flag the question if: the stated correct answer is not what current clinical practice would consider',
        'correct, a dose/value/criterion stated in the stem or an option is factually wrong, more than one option',
        'is defensibly correct, or the explanation contains a factual error -- even if the chosen answer letter is',
        'right. Do not flag for style, difficulty, or because you would have written it differently. If genuinely',
        'uncertain rather than confident it is wrong, use "correct" with confidence "low" rather than flagging.',
        '',
        `TOPIC: ${topic}`,
        `QUESTION: ${mcq.question}`,
        `OPTIONS:\n${options}`,
        `STATED CORRECT ANSWER: ${mcq.correctAnswer}`,
        `EXPLANATION GIVEN: ${mcq.explanation || '(none provided)'}`,
    ].join('\n');
}

async function main() {
    await db.connect();

    const rows = await db.all(
        `SELECT ct.specialty, t.object_type, t.topic, t.object_payload
         FROM teaching_objects t
         LEFT JOIN curriculum_topics ct ON ct.id = t.curriculum_topic_id
         WHERE t.object_type IN ('guideline_mcq', 'paper_mcq', 'cold_start_mcq')`
    );

    // Flatten to individual MCQs, tagged with their origin.
    const pool = [];
    for (const row of rows) {
        let payload;
        try { payload = JSON.parse(row.object_payload || '{}'); } catch { continue; }
        for (const m of (payload.mcqs || [])) {
            if (!m.question || !m.options || !m.correctAnswer) continue;
            pool.push({ specialty: row.specialty || '(none)', objectType: row.object_type, topic: row.topic, mcq: m });
        }
    }

    // Proportional stratified sample by object_type, deterministic via seeded shuffle.
    const rand = mulberry32(SEED);
    const byType = {};
    for (const item of pool) {
        (byType[item.objectType] = byType[item.objectType] || []).push(item);
    }
    const sample = [];
    for (const [type, items] of Object.entries(byType)) {
        const shuffled = [...items];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const n = Math.round((items.length / pool.length) * SAMPLE_SIZE);
        sample.push(...shuffled.slice(0, n));
    }

    console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}pool: ${pool.length} MCQs -- sampling ${sample.length} (target ${SAMPLE_SIZE}), provider=${PROVIDER}`);

    const results = { total: 0, flagged: 0, byType: {}, bySpecialty: {} };
    const flaggedDetail = [];

    for (const item of sample) {
        const { objectType, topic, specialty, mcq } = item;
        results.byType[objectType] = results.byType[objectType] || { total: 0, flagged: 0 };
        results.bySpecialty[specialty] = results.bySpecialty[specialty] || { total: 0, flagged: 0 };

        let verdict = 'error', issues = [], confidence = 'low';
        try {
            const text = await callLlm(buildReviewPrompt(mcq, topic));
            const parsed = parseJson(text);
            if (parsed && ['correct', 'flagged'].includes(parsed.verdict)) {
                verdict = parsed.verdict;
                issues = Array.isArray(parsed.issues) ? parsed.issues : [];
                confidence = parsed.confidence || 'medium';
            }
        } catch (e) {
            issues = [`review call failed: ${e.message.slice(0, 100)}`];
        }

        results.total++;
        results.byType[objectType].total++;
        results.bySpecialty[specialty].total++;
        if (verdict === 'flagged') {
            results.flagged++;
            results.byType[objectType].flagged++;
            results.bySpecialty[specialty].flagged++;
            flaggedDetail.push({ topic, objectType, specialty, question: mcq.question, correctAnswer: mcq.correctAnswer, issues, confidence });
        }

        if (!DRY_RUN) {
            const questionId = stableQuestionId(topic, objectType, mcq.question, mcq.correctAnswer);
            await db.run(
                `INSERT INTO quiz_validation_results
                    (id, question_id, topic, normalized_topic, generation_job_key, validator_version, status, rejection_reasons, source_provider, source_model, validated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT DO NOTHING`,
                [
                    crypto.randomUUID(), questionId, topic, db.normalizeTopic(topic), 'clinical-qa-sample',
                    1, verdict === 'flagged' ? 'rejected' : verdict === 'error' ? 'error' : 'approved',
                    JSON.stringify(issues), PROVIDER, PROVIDER === 'anthropic' ? 'claude-sonnet-4-6' : 'gemini-2.5-flash',
                    new Date().toISOString(),
                ]
            );
        }
        await sleep(350);
    }

    console.log('\n=== RESULTS ===');
    console.log(`total reviewed: ${results.total}   flagged: ${results.flagged}  (${(100 * results.flagged / results.total).toFixed(1)}%)`);
    console.log('\nby object_type:');
    Object.entries(results.byType).forEach(([k, v]) => console.log(`  ${k.padEnd(16)} ${v.flagged}/${v.total}  (${(100 * v.flagged / v.total).toFixed(1)}%)`));
    console.log('\nby specialty:');
    Object.entries(results.bySpecialty).sort((a, b) => b[1].flagged - a[1].flagged).forEach(([k, v]) => {
        if (v.flagged > 0) console.log(`  ${k.padEnd(28)} ${v.flagged}/${v.total}`);
    });

    if (flaggedDetail.length) {
        console.log('\n=== FLAGGED QUESTIONS ===');
        flaggedDetail.forEach((f, i) => {
            console.log(`\n${i + 1}. [${f.objectType}] ${f.topic} (${f.specialty})`);
            console.log(`   Q: ${f.question.slice(0, 140)}`);
            console.log(`   stated answer: ${f.correctAnswer}   confidence: ${f.confidence}`);
            console.log(`   issues: ${f.issues.join(' | ')}`);
        });
    }

    await db.close();
}

if (require.main === module) {
    main().catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { buildReviewPrompt, stableQuestionId, mulberry32 };
