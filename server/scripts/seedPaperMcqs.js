'use strict';

/**
 * seedPaperMcqs.js
 * Generate MCQs grounded in specific paper synopses for each topic.
 *
 * Flow per topic:
 *   1. Fetch paper teaching objects (synopses already generated)
 *   2. Gemini generates 5 MCQs anchored to those papers
 *   3. Claude Sonnet cross-checks against the same synopses
 *   4. Store as paper_mcq teaching object
 *
 * Usage:
 *   node server/scripts/seedPaperMcqs.js [--limit n] [--dry-run] [--force]
 */

const { loadEnv, serverConfig } = require('../../config');
loadEnv();

const db = require('../../database');
const cache = require('../../cache');
const { safeFetch } = require('../utils/fetch');

const args = process.argv.slice(2);
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : 9999;
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function topicSlug(topic) {
    return String(topic || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\s+/g, '-');
}

function paperMcqKey(topic) {
    return `paper-mcq:${topicSlug(topic)}`;
}

function buildPaperContext(papers) {
    return papers.map((p, i) => {
        const paper = p.paper || {};
        const syn = p.synopsis || {};
        return {
            paperIndex: i + 1,
            title: paper.title || 'Untitled',
            journal: paper.journal || '',
            year: paper.pubdate || '',
            studyType: paper.studyType || syn.studyDesign || '',
            mainFindings: syn.mainFindings || syn.takeaway || '',
            bottomLine: syn.bottomLine || '',
            population: syn.population || '',
            intervention: syn.intervention || '',
            outcomes: syn.outcomes || '',
            quizFocusPoints: syn.quizFocusPoints || [],
        };
    });
}

function buildGenerationPrompt(topic, paperContext) {
    return `You are a medical education expert creating MCQs for final-year medical students.
Generate exactly 5 single-best-answer MCQs about "${topic}" grounded in the specific research papers below.

IMPORTANT RULES:
- Each MCQ MUST be anchored to a specific paper finding (reference by paperIndex)
- The correct answer must be directly supported by the paper's findings
- Distractors must be plausible but clearly wrong based on the evidence
- Include the paper reference in the explanation
- Mix difficulty: 1 easy, 2 medium, 2 hard
- Mix types: 2 clinical_application, 1 trial_interpretation, 1 recall, 1 pitfall

SOURCE PAPERS:
${JSON.stringify(paperContext, null, 2)}

Return ONLY valid JSON with no markdown:
{"mcqs":[{
  "type": "multiple_choice",
  "questionType": "clinical_application|trial_interpretation|recall|pitfall",
  "question": "clinical vignette with age, sex, presentation...",
  "options": ["A: ...", "B: ...", "C: ...", "D: ..."],
  "correctAnswer": "A",
  "explanation": "2-3 sentences citing the specific paper finding",
  "difficulty": "easy|medium|hard",
  "paperIndex": 1,
  "sourceReference": "Author et al. Journal Year"
}]}`;
}

function buildCrossCheckPrompt(topic, mcqs, paperContext) {
    const mcqBlock = mcqs.map((q, i) =>
        `MCQ ${i + 1} (Paper ${q.paperIndex || '?'}): ${q.question}\nOptions: ${(q.options || []).join(' | ')}\nCorrect: ${q.correctAnswer}\nExplanation: ${q.explanation || ''}`
    ).join('\n\n');

    return `You are a senior medical educator independently verifying paper-grounded MCQs about "${topic}".

Your job: check each MCQ against the source paper it claims to be based on. Flag any MCQ where:
- The correct answer is NOT supported by the cited paper's findings
- The explanation misrepresents or overclaims what the paper found
- The correct answer is factually wrong regardless of the paper
- A distractor is dangerous or could lead to patient harm
- More than one option is defensibly correct

SOURCE PAPERS:
${JSON.stringify(paperContext, null, 2)}

MCQs TO VERIFY:
${mcqBlock}

Only flag genuine errors. If an MCQ correctly reflects the paper, do NOT flag it.

Return ONLY valid JSON:
{"flags":[{"mcqIndex":1,"flagType":"wrong_answer|overclaim|dangerous_distractor|multiple_correct","detail":"specific reason","suggestedFix":"correction"}]}
Return {"flags":[]} if all MCQs are correct.`;
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
                generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
            }),
        }
    );

    if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error('Gemini ' + res.status + ': ' + t.slice(0, 200));
    }
    const data = await res.json();
    if (data.promptFeedback?.blockReason) throw new Error('Blocked: ' + data.promptFeedback.blockReason);
    // Gemini 2.5 Flash may return multiple parts (thinking + response)
    const parts = data.candidates?.[0]?.content?.parts || [];
    // Take the last text part (response after thinking)
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
    return data.content?.[0]?.text || '';
}

function parseJson(text) {
    try {
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const m = cleaned.match(/\{[\s\S]*\}/);
        return m ? JSON.parse(m[0]) : null;
    } catch { return null; }
}

async function main() {
    console.log('\n=== Paper-Grounded MCQ Seeding ===');
    console.log('Limit: ' + LIMIT + ' | Dry-run: ' + DRY_RUN + ' | Force: ' + FORCE + '\n');

    await db.connect();
    await db.runMigrations();
    await cache.connect();

    // Get all topics that have paper teaching objects
    const topicRows = await db.all(
        `SELECT topic, COUNT(*) as paper_count
         FROM teaching_objects
         WHERE object_type = 'paper'
         GROUP BY topic
         HAVING COUNT(*) >= 2
         ORDER BY topic ASC`
    );

    console.log('Topics with ≥2 papers: ' + topicRows.length + '\n');

    let generated = 0, flagged = 0, clean = 0, skipped = 0, errors = 0;

    for (let i = 0; i < Math.min(topicRows.length, LIMIT); i++) {
        const { topic, paper_count } = topicRows[i];
        const key = paperMcqKey(topic);

        // Skip if already exists
        if (!FORCE) {
            const existing = await db.all(
                `SELECT id FROM teaching_objects WHERE object_key = ? AND object_type = 'paper_mcq' LIMIT 1`,
                [key]
            );
            if (existing.length > 0) { skipped++; continue; }
        }

        // Fetch paper teaching objects for this topic
        const paperRows = await db.all(
            `SELECT object_payload FROM teaching_objects
             WHERE object_type = 'paper' AND topic = ?
             ORDER BY created_at ASC LIMIT 5`,
            [topic]
        );

        const papers = paperRows.map(r => {
            try { return typeof r.object_payload === 'string' ? JSON.parse(r.object_payload) : r.object_payload; }
            catch { return null; }
        }).filter(Boolean);

        if (papers.length < 2) { skipped++; continue; }

        const paperContext = buildPaperContext(papers);

        process.stdout.write('  [' + (i + 1) + '/' + topicRows.length + '] ' + topic + ' (' + papers.length + ' papers) ... ');

        if (DRY_RUN) { console.log('[dry-run]'); continue; }

        try {
            // Step 1: Gemini generates MCQs
            const genPrompt = buildGenerationPrompt(topic, paperContext);
            const genText = await callGemini(genPrompt);
            const genParsed = parseJson(genText);
            let mcqs = genParsed?.mcqs || genParsed?.questions || [];

            if (!Array.isArray(mcqs) || mcqs.length === 0) {
                console.log('SKIP (no MCQs parsed from Gemini)');
                errors++;
                await sleep(1000);
                continue;
            }

            // Trim to 5
            mcqs = mcqs.slice(0, 5);

            await sleep(500);

            // Step 2: Claude Sonnet cross-checks
            const checkPrompt = buildCrossCheckPrompt(topic, mcqs, paperContext);
            const checkText = await callSonnet(checkPrompt);
            const checkParsed = parseJson(checkText);
            const flags = Array.isArray(checkParsed?.flags) ? checkParsed.flags : [];

            // Mark flagged MCQs
            if (flags.length > 0) {
                for (const flag of flags) {
                    const idx = (flag.mcqIndex || 1) - 1;
                    if (idx >= 0 && idx < mcqs.length) {
                        mcqs[idx]._flag = {
                            flagType: flag.flagType,
                            detail: flag.detail,
                            suggestedFix: flag.suggestedFix,
                        };
                    }
                }
            }

            // Store
            const payload = {
                kind: 'paper_mcq',
                mcqs,
                paperCount: papers.length,
                paperTitles: papers.map(p => p.paper?.title || 'Untitled'),
                generatedAt: new Date().toISOString(),
                generator: 'gemini-2.5-flash',
                crossChecker: 'claude-sonnet-4-6',
                crossCheckFlags: flags.length,
            };

            await db.run(
                `INSERT INTO teaching_objects (id, object_key, object_type, topic, normalized_topic, title, object_payload, provider, model, confidence, created_at, updated_at)
                 VALUES (?, ?, 'paper_mcq', ?, ?, ?, ?, 'google', 'gemini-2.5-flash', 0.85, datetime('now'), datetime('now'))`,
                [
                    require('crypto').randomUUID(),
                    key,
                    topic,
                    topicSlug(topic).replace(/-/g, ' '),
                    'Paper MCQs: ' + topic,
                    JSON.stringify(payload),
                ]
            );

            generated++;
            if (flags.length > 0) {
                flagged++;
                console.log('5 MCQs, ' + flags.length + ' flag(s): ' + flags.map(f => f.flagType).join(', '));
            } else {
                clean++;
                console.log('5 MCQs, clean ✓');
            }

            await sleep(600);
        } catch (err) {
            console.log('ERROR: ' + err.message.slice(0, 120));
            errors++;
            await sleep(2000);
        }
    }

    console.log('\n--- Paper MCQ Seeding Complete ---');
    console.log('Generated: ' + generated + ' | Clean: ' + clean + ' | Flagged: ' + flagged + ' | Skipped: ' + skipped + ' | Errors: ' + errors);
    console.log('Total paper MCQ topics: ' + generated + ' of ' + topicRows.length);

    await db.close();
    process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
