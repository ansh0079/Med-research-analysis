'use strict';

/**
 * generatePaperMcqsForZeroCoverageTopics.js
 *
 * Generate paper_mcq for the 188 curriculum topics that lost all MCQ content
 * when the fabricated-citation purge removed it (tools/data-hygiene/
 * remove-fabricated-citation-mcqs.js). 185 of those 188 already have a real
 * paper synopsis ('paper' or 'topic_consensus' teaching objects) to ground
 * generation in -- this targets exactly that set.
 *
 * Differs from seedPaperMcqs.js in three ways, all deliberate:
 *   1. Selects topics by curriculum_topic_id via
 *      data/guideline-gap/zero-mcq-topics.csv, not by grouping the raw
 *      `topic` string -- that string-matching join is what 090 replaced.
 *   2. Allows a topic with as few as 1 paper synopsis, not >=2 -- several of
 *      the 185 only have one.
 *   3. Rejects any generated MCQ containing a fabricated future-dated
 *      citation (hasSuspectFutureCitation) before storing it. This is the
 *      same defect class this batch exists to replace; the check has to run
 *      at generation time, not just be swept up again later.
 *
 * Usage:
 *   node server/scripts/generatePaperMcqsForZeroCoverageTopics.js [--limit n] [--dry-run] [--force]
 */

const fs = require('fs');
const path = require('path');
const { loadEnv, serverConfig } = require('../../config');
loadEnv();

const db = require('../../database');
const { safeFetch } = require('../utils/fetch');
const { hasSuspectFutureCitation } = require('../utils/mcqClaimKey');

const args = process.argv.slice(2);
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : 9999;
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function slug(t) {
    return String(t).toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\s+/g, '-');
}
function paperMcqKey(topic) { return `paper-mcq:${slug(topic)}`; }

function buildPaperContext(papers) {
    return papers.map((p, i) => {
        const paper = p.paper || {};
        const syn = p.synopsis || p.consensusSynopsis || {};
        return {
            paperIndex: i + 1,
            title: paper.title || syn.title || 'Untitled',
            journal: paper.journal || '',
            year: paper.pubdate || '',
            studyType: paper.studyType || syn.studyDesign || '',
            mainFindings: syn.mainFindings || syn.takeaway || '',
            bottomLine: syn.bottomLine || syn.clinicalBottomLine || '',
            population: syn.population || '',
            intervention: syn.intervention || '',
            outcomes: syn.outcomes || '',
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
- Do NOT cite a guideline, society statement, or study by name unless it is one of the
  source papers listed below or a widely established guideline you are certain exists
  (e.g. NICE NG12, ESC 2021 heart failure). Never invent a plausible-sounding guideline
  or attribute a year to one you are not certain of -- if unsure, describe the finding
  without naming a source.

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
                generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
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

function parseJson(text) {
    try {
        const cleaned = String(text).replace(/```json/gi, '').replace(/```/g, '').trim();
        const m = cleaned.match(/\{[\s\S]*\}/);
        return m ? JSON.parse(m[0]) : null;
    } catch {
        return null;
    }
}

async function main() {
    await db.connect();

    const csvPath = path.join(__dirname, '../../data/guideline-gap/zero-mcq-topics.csv');
    if (!fs.existsSync(csvPath)) {
        throw new Error(`${csvPath} not found -- generate it first`);
    }
    const rows = fs.readFileSync(csvPath, 'utf8').split('\n').slice(1).filter(Boolean);
    let targets = rows.map((line) => {
        const m = line.match(/^"((?:[^"]|"")*)","((?:[^"]|"")*)",(\w+),(\w+),"((?:[^"]|"")*)"$/);
        if (!m) return null;
        return { topic: m[1].replace(/""/g, '"'), specialty: m[2].replace(/""/g, '"'), hasPaperSynopsis: m[3] === 'yes' };
    }).filter(Boolean).filter((t) => t.hasPaperSynopsis);

    targets = targets.slice(0, LIMIT);
    console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}${targets.length} topics with a paper synopsis to generate MCQs for`);

    let generated = 0, skipped = 0, errors = 0, rejectedFabricated = 0;

    for (let i = 0; i < targets.length; i++) {
        const { topic } = targets[i];
        const key = paperMcqKey(topic);

        const topicId = await db.resolveCurriculumTopicId(topic);
        if (!topicId) { console.log(`  [${i + 1}/${targets.length}] ${topic.slice(0, 50)} -- SKIP (topic did not resolve)`); skipped++; continue; }

        if (!FORCE) {
            // Dedup by curriculum_topic_id, not object_key -- a handful of
            // pre-existing rows carry an object_key computed from a topic
            // string that no longer matches the row's own `topic` column
            // (a data bug that predates this script), which slug-collides
            // with unrelated topics in this exact target list and would
            // wrongly skip them if checked by key.
            const existing = await db.get(
                `SELECT id FROM teaching_objects WHERE curriculum_topic_id = ? AND object_type = 'paper_mcq'`,
                [topicId]
            );
            if (existing) { skipped++; continue; }
        }

        const objs = await db.getTeachingObjectsByTopicId(topicId, ['paper', 'topic_consensus']);
        const papers = objs.map((o) => o.payload).filter(Boolean);
        if (papers.length < 1) { skipped++; continue; }

        const paperContext = buildPaperContext(papers);
        process.stdout.write(`  [${i + 1}/${targets.length}] ${topic.slice(0, 50).padEnd(52)} (${papers.length} source${papers.length > 1 ? 's' : ''}) ... `);

        if (DRY_RUN) { console.log('[dry-run]'); continue; }

        try {
            const genText = await callGemini(buildGenerationPrompt(topic, paperContext));
            const genParsed = parseJson(genText);
            let mcqs = genParsed?.mcqs || genParsed?.questions || [];

            if (!Array.isArray(mcqs) || mcqs.length === 0) {
                console.log('SKIP (no MCQs parsed)');
                errors++;
                await sleep(800);
                continue;
            }

            const before = mcqs.length;
            mcqs = mcqs.filter((m) => !hasSuspectFutureCitation(m));
            const rejected = before - mcqs.length;
            rejectedFabricated += rejected;

            if (mcqs.length === 0) {
                console.log(`SKIP (all ${before} generated MCQs cited a fabricated guideline)`);
                errors++;
                await sleep(800);
                continue;
            }

            await db.upsertTeachingObject({
                objectKey: key,
                objectType: 'paper_mcq',
                topic,
                title: `Paper MCQs: ${topic}`,
                payload: {
                    kind: 'paper_mcq',
                    mcqs,
                    paperCount: papers.length,
                    generatedAt: new Date().toISOString(),
                    generator: 'gemini-2.5-flash',
                },
                provider: 'google',
                model: 'gemini-2.5-flash',
                confidence: 0.7,
            });

            generated++;
            console.log(`${mcqs.length} MCQs${rejected ? ` (${rejected} rejected for fabricated citation)` : ''} ✓`);
            await sleep(600);
        } catch (err) {
            console.log('ERROR: ' + err.message.slice(0, 120));
            errors++;
            await sleep(1500);
        }
    }

    console.log('\n=== SUMMARY ===');
    console.log(`generated: ${generated}  skipped: ${skipped}  errors: ${errors}  MCQs rejected for fabricated citation: ${rejectedFabricated}`);
    await db.close();
}

if (require.main === module) {
    main().catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { buildGenerationPrompt, buildPaperContext, paperMcqKey };
