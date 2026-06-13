/**
 * Post-seeding enhancement pipeline.
 *
 * Phases (all run by default, select with flags):
 *   --retry          Phase 1: retry topics that failed during initial seeding
 *   --teaching       Phase 2: build consensus teaching objects + claim anchors
 *   --quality        Phase 3: AI quality-score every synopsis, flag weak ones
 *   --prerequisites  Phase 4: generate topic prerequisite graph
 *   --mcqs           Phase 5: pre-seed 5 cold-start MCQs per topic
 *   --verify         Phase 6: Claude cross-references MCQs + generates 5 guideline MCQs per topic
 *   --synopsis       Phase 7: refresh mentorMessage to incorporate 2-3 top guidelines per topic
 *   --aggregate      Phase 8: aggregate quiz attempt stats per topic → collective_memory
 *   --crosslink      Phase 9: build cross-topic evidence cross-links (shared papers + AI-inferred)
 *   --fix-flags      Phase 6b: rewrite MCQs flagged by Phase 6 using Claude
 *   --verify-guideline  Phase 6c: Gemini cross-checks Claude's guideline MCQs, flags issues, Claude rewrites
 *   --all            run all phases (default if no flags)
 *   --dry-run        print what would happen without writing
 *
 * Usage:
 *   node server/scripts/seedEnhancements.js
 *   node server/scripts/seedEnhancements.js --retry --quality
 *   node server/scripts/seedEnhancements.js --mcqs --dry-run
 *   node server/scripts/seedEnhancements.js --fix-flags
 *   node server/scripts/seedEnhancements.js --fix-flags --dry-run
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { loadEnv, serverConfig } = require('../../config');
loadEnv();

const db = require('../../database');
const { createAiService, PINNED_MODELS, TEMPERATURE } = require('../services/aiService');
const { buildTopicKnowledgePrompt, buildQuizPrompt } = require('../prompts');
const { fetchUnifiedEvidence } = require('../services/unifiedEvidenceSearch');
const { safeFetch } = require('../utils/fetch');
const { buildConsensusTeachingObject } = require('../services/teachingObjectService');
const { parseJsonBlock, parseJsonArrayBlock } = require('../utils/parseJson');

const topicsData = require('./topics.json');
const ALL_TOPICS = topicsData.topics;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');

const hasPhaseFlag = ['--retry', '--teaching', '--quality', '--prerequisites', '--mcqs', '--verify', '--synopsis', '--aggregate', '--crosslink', '--fix-flags', '--verify-guideline'].some(f => args.includes(f));
const runAll = args.includes('--all') || !hasPhaseFlag;

const phases = {
    retry: runAll || args.includes('--retry'),
    teaching: runAll || args.includes('--teaching'),
    quality: runAll || args.includes('--quality'),
    prerequisites: runAll || args.includes('--prerequisites'),
    mcqs: runAll || args.includes('--mcqs'),
    verify: runAll || args.includes('--verify'),
    fixFlags: args.includes('--fix-flags'),           // never runs in --all; must be explicit
    verifyGuideline: args.includes('--verify-guideline'), // never runs in --all; must be explicit
    synopsis: runAll || args.includes('--synopsis'),
    aggregate: runAll || args.includes('--aggregate'),
    crosslink: runAll || args.includes('--crosslink'),
};

const { setTimeout: sleep } = require('timers/promises');

async function callAI(ai, prompt, { temperature = TEMPERATURE.synthesis } = {}) {
    if (serverConfig.keys.gemini) {
        return ai.callGemini(prompt, PINNED_MODELS.gemini, { temperature });
    } else if (serverConfig.keys.mistral) {
        return ai.callMistralAI(prompt, PINNED_MODELS.mistral, { temperature });
    }
    throw new Error('No AI provider configured');
}

// ─── Phase 1: Retry failed topics ───────────────────────────────────────────

async function retryFailedTopics(ai) {
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║  Phase 1: Retry Failed Topics        ║');
    console.log('╚══════════════════════════════════════╝');

    const failed = [];
    for (const topic of ALL_TOPICS) {
        const existing = await db.getTopicKnowledge(topic);
        if (!existing) failed.push(topic);
    }

    if (failed.length === 0) {
        console.log('  ✓ All topics already seeded. Nothing to retry.');
        return { retried: 0, succeeded: 0, failed: 0 };
    }

    console.log(`  Found ${failed.length} unseeded topic(s). Retrying…`);
    let succeeded = 0;
    let failedCount = 0;

    for (const topic of failed) {
        console.log(`\n  ── ${topic} ──`);

        let articles = [];
        try {
            const raw = await fetchUnifiedEvidence({
                query: topic, safeLimit: 10, sourceList: ['pubmed'],
                serverConfig, fetch: safeFetch, vectorList: [],
            });
            articles = raw.slice(0, 8);
        } catch (err) {
            console.warn(`    ⚠ Evidence fetch failed: ${err.message}`);
            failedCount++;
            continue;
        }

        if (articles.length < 2) {
            console.warn(`    ⚠ Only ${articles.length} articles — skipping`);
            failedCount++;
            continue;
        }

        const prompt = buildTopicKnowledgePrompt(topic, articles);
        if (dryRun) {
            console.log(`    [DRY RUN] Would call AI (${prompt.length} chars)`);
            continue;
        }

        try {
            const raw = await callAI(ai, prompt, { temperature: 0.15 });
            const knowledge = parseJsonBlock(raw);
            if (!knowledge?.mentorMessage) {
                console.warn(`    ⚠ Invalid JSON response. Skipping.`);
                failedCount++;
                continue;
            }
            const sourceArticles = articles.map((a, i) => ({
                sourceIndex: i + 1, uid: a.uid, title: a.title,
                doi: a.doi || null, pmid: a.pmid || null,
                source: a.source || null, pubdate: a.pubdate || null,
            }));
            await db.upsertTopicKnowledge(topic, knowledge, sourceArticles, 'ai_generated', 0.65);
            console.log(`    ✅ Stored.`);
            succeeded++;
        } catch (err) {
            console.warn(`    ⚠ AI call failed: ${err.message}`);
            failedCount++;
        }
        await sleep(1500);
    }

    console.log(`\n  Phase 1 complete: ${succeeded} succeeded, ${failedCount} still failed.`);
    return { retried: failed.length, succeeded, failed: failedCount };
}

// ─── Phase 2: Build consensus teaching objects ──────────────────────────────

async function buildTeachingObjects() {
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║  Phase 2: Teaching Objects + Claims   ║');
    console.log('╚══════════════════════════════════════╝');

    let created = 0;
    let skipped = 0;

    for (const topic of ALL_TOPICS) {
        const tk = await db.getTopicKnowledge(topic);
        if (!tk || !tk.knowledge) { skipped++; continue; }

        const objectKey = `topic-consensus:${(tk.normalizedTopic || topic).toLowerCase().replace(/\s+/g, '-')}`;
        const existing = await db.getTeachingObjectByKey(objectKey).catch(() => null);
        if (existing) { skipped++; continue; }

        const k = tk.knowledge;
        const consensusSynopsis = {
            statement: k.mentorMessage || '',
            clinicalBottomLine: k.mentorMessage || '',
            evidenceStrength: inferOverallStrength(k),
            areasOfAgreement: (k.teachingPoints || []).map(tp => tp.claim || tp.text || '').filter(Boolean),
            areasOfUncertainty: (k.controversies || []).map(c => c.issue || '').filter(Boolean),
            whatNotToOverclaim: (k.mcqAngles || []).slice(0, 3),
            quizFocusPoints: (k.mcqAngles || []),
            provider: 'gemini',
            model: PINNED_MODELS.gemini,
            generatedAt: tk.lastRefreshedAt || new Date().toISOString(),
        };

        const sourceArticles = (tk.sourceArticles || []).map(a => ({
            uid: a.uid, title: a.title, abstract: '', doi: a.doi,
            pmid: a.pmid, source: a.source, pubdate: a.pubdate,
        }));

        if (dryRun) {
            console.log(`  [DRY RUN] Would create teaching object for: ${topic}`);
            created++;
            continue;
        }

        try {
            const obj = buildConsensusTeachingObject({
                topic, consensusSynopsis, articles: sourceArticles,
            });
            await db.upsertTeachingObject(obj);
            created++;
        } catch (err) {
            console.warn(`  ⚠ Teaching object failed for "${topic}": ${err.message}`);
        }
    }

    console.log(`  Phase 2 complete: ${created} teaching objects created, ${skipped} skipped.`);
    return { created, skipped };
}

function inferOverallStrength(knowledge) {
    const points = (knowledge.teachingPoints || []);
    const high = points.filter(p => p.confidence === 'HIGH').length;
    if (high >= points.length * 0.6) return 'HIGH';
    if (high >= points.length * 0.3) return 'MODERATE';
    return 'LOW';
}

// ─── Phase 3: Quality scoring ───────────────────────────────────────────────

async function qualityScoreSynopses(ai) {
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║  Phase 3: Quality Scoring             ║');
    console.log('╚══════════════════════════════════════╝');

    const BATCH_SIZE = 5;
    const results = { high: [], medium: [], low: [], failed: [] };
    const seededTopics = [];

    for (const topic of ALL_TOPICS) {
        const tk = await db.getTopicKnowledge(topic);
        if (tk && tk.knowledge) seededTopics.push({ topic, knowledge: tk.knowledge, sourceArticles: tk.sourceArticles });
    }

    console.log(`  Scoring ${seededTopics.length} synopses in batches of ${BATCH_SIZE}…`);

    for (let i = 0; i < seededTopics.length; i += BATCH_SIZE) {
        const batch = seededTopics.slice(i, i + BATCH_SIZE);
        const batchSummary = batch.map(t => {
            const k = t.knowledge;
            return `TOPIC: "${t.topic}"
Mentor message: ${(k.mentorMessage || '').slice(0, 200)}
Teaching points: ${(k.teachingPoints || []).length}
Seminal papers: ${(k.seminalPapers || []).length}
MCQ angles: ${(k.mcqAngles || []).length}
Case hooks: ${(k.caseGenerationHooks || []).length}
Source articles: ${(t.sourceArticles || []).length}
Sample teaching point: ${(k.teachingPoints || [])[0]?.claim?.slice(0, 150) || 'none'}`;
        }).join('\n\n---\n\n');

        const prompt = `You are a medical education quality reviewer. Score each topic synopsis below on three dimensions (1-10 each):

1. **Factuality**: Are claims specific, evidence-grounded, and non-generic? (10 = highly specific with citations, 1 = vague platitudes)
2. **Completeness**: Does it cover key aspects — diagnosis, management, controversies, pitfalls? (10 = comprehensive, 1 = missing major areas)
3. **Source diversity**: Are multiple study types/perspectives represented? (10 = RCTs + guidelines + cohorts, 1 = single source or no diversity)

For each topic, return a score object. Return ONLY valid JSON array:
[
  {
    "topic": "exact topic name",
    "factuality": 8,
    "completeness": 7,
    "sourceDiversity": 6,
    "overall": 7,
    "flag": "none|weak_factuality|weak_completeness|weak_diversity|regenerate",
    "note": "one sentence explaining the lowest dimension"
  }
]

Flag as "regenerate" if overall < 5. Flag specific weakness if any dimension < 5.

SYNOPSES TO SCORE:
${batchSummary}`;

        if (dryRun) {
            console.log(`  [DRY RUN] Would score batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} topics)`);
            continue;
        }

        try {
            const raw = await callAI(ai, prompt, { temperature: 0.1 });
            const scores = parseJsonArrayBlock(raw);
            if (!Array.isArray(scores)) {
                console.warn(`  ⚠ Batch ${Math.floor(i / BATCH_SIZE) + 1}: invalid JSON response`);
                batch.forEach(t => results.failed.push(t.topic));
                continue;
            }
            for (const score of scores) {
                const overall = score.overall || 0;
                if (overall >= 7) results.high.push({ topic: score.topic, ...score });
                else if (overall >= 5) results.medium.push({ topic: score.topic, ...score });
                else results.low.push({ topic: score.topic, ...score });
            }
            process.stdout.write(`  Scored batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(seededTopics.length / BATCH_SIZE)} `);
            process.stdout.write(`(${scores.filter(s => s.overall >= 7).length} high, ${scores.filter(s => s.overall >= 5 && s.overall < 7).length} medium, ${scores.filter(s => s.overall < 5).length} low)\n`);
        } catch (err) {
            console.warn(`  ⚠ Batch scoring failed: ${err.message}`);
            batch.forEach(t => results.failed.push(t.topic));
        }
        await sleep(1200);
    }

    console.log(`\n  Phase 3 complete:`);
    console.log(`    High quality (≥7): ${results.high.length}`);
    console.log(`    Medium quality (5-6): ${results.medium.length}`);
    console.log(`    Low quality (<5 — needs regeneration): ${results.low.length}`);
    console.log(`    Scoring failed: ${results.failed.length}`);

    if (results.low.length > 0) {
        console.log(`\n  ⚠ Topics needing regeneration:`);
        results.low.forEach(s => console.log(`    - ${s.topic} (${s.overall}/10): ${s.note}`));
    }

    return results;
}

// ─── Phase 4: Topic prerequisites ───────────────────────────────────────────

async function generatePrerequisites(ai) {
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║  Phase 4: Topic Prerequisites Graph   ║');
    console.log('╚══════════════════════════════════════╝');

    const seededTopics = [];
    for (const topic of ALL_TOPICS) {
        const tk = await db.getTopicKnowledge(topic);
        if (tk) seededTopics.push(topic);
    }

    // Process in batches of 40 to avoid prompt length issues
    const BATCH = 40;
    const allEdges = [];

    for (let i = 0; i < seededTopics.length; i += BATCH) {
        const batch = seededTopics.slice(i, i + BATCH);
        const batchNum = Math.floor(i / BATCH) + 1;
        const totalBatches = Math.ceil(seededTopics.length / BATCH);
        const topicList = batch.map((t, idx) => `${idx + 1}. ${t}`).join('\n');

        // Include full topic list as reference for cross-batch prerequisites
        const fullList = seededTopics.map(t => t).join(', ');

        const prompt = `You are a medical education curriculum designer. For each topic below, identify prerequisite topics a learner should understand FIRST.

A prerequisite means: "To understand topic B, the learner must first grasp topic A."

Rules:
- Only include STRONG, direct prerequisites (not loose associations)
- Each topic should have 0-3 prerequisites max
- Prerequisites can come from ANY topic in the full list (not just this batch)
- Think: foundational → specific (e.g., "type 2 diabetes management" requires "diabetic ketoacidosis" understanding)
- Cross-specialty links are valid (e.g., "chronic kidney disease" → "electrolyte disturbances")

TOPICS TO PROCESS (batch ${batchNum}/${totalBatches}):
${topicList}

FULL TOPIC LIST (prerequisites must be from this list — use exact names):
${fullList}

Return ONLY valid JSON array:
[
  { "topic": "exact topic name from batch", "requires": ["prerequisite 1", "prerequisite 2"] }
]

Only include topics that HAVE prerequisites. Omit topics with none.`;

        if (dryRun) {
            console.log(`  [DRY RUN] Batch ${batchNum}/${totalBatches} (${batch.length} topics)`);
            continue;
        }

        try {
            const raw = await callAI(ai, prompt, { temperature: 0.1 });
            const edges = parseJsonArrayBlock(raw);
            if (Array.isArray(edges)) {
                const valid = edges.filter(e =>
                    batch.includes(e.topic) &&
                    Array.isArray(e.requires) &&
                    e.requires.every(r => seededTopics.includes(r))
                );
                allEdges.push(...valid);
                console.log(`  Batch ${batchNum}/${totalBatches}: ${valid.length} topics with prerequisites`);
            } else {
                console.warn(`  ⚠ Batch ${batchNum}: invalid JSON`);
            }
        } catch (err) {
            console.warn(`  ⚠ Batch ${batchNum} failed: ${err.message}`);
        }
        await sleep(1500);
    }

    if (dryRun) return { edges: 0 };

    const prereqPath = path.join(__dirname, 'topic-prerequisites.json');
    require('fs').writeFileSync(prereqPath, JSON.stringify(allEdges, null, 2));

    let totalEdges = 0;
    allEdges.forEach(e => { totalEdges += e.requires.length; });

    console.log(`\n  Phase 4 complete: ${allEdges.length} topics with prerequisites, ${totalEdges} total edges.`);
    console.log(`  Saved to: server/scripts/topic-prerequisites.json`);

    const sample = allEdges.slice(0, 8);
    sample.forEach(e => console.log(`    ${e.topic} ← [${e.requires.join(', ')}]`));
    if (allEdges.length > 8) console.log(`    … and ${allEdges.length - 8} more`);

    return { edges: totalEdges, topics: allEdges.length };
}

// ─── Phase 5: Cold-start MCQs ───────────────────────────────────────────────

function buildColdStartMCQPrompt(topic, knowledge) {
    const k = knowledge || {};
    const teachingPoints = (k.teachingPoints || []).map((tp, i) =>
        `${i + 1}. ${tp.claim || tp.text || ''}`
    ).join('\n');
    const mcqAngles = (k.mcqAngles || []).join('; ');
    const seminalPapers = (k.seminalPapers || []).map(p =>
        `- ${p.title}: ${p.clinicalPrinciple || p.whySeminal || ''}`
    ).join('\n');

    return `Generate 5 MCQs about "${topic}" for final-year medical students.

TOPIC KNOWLEDGE: ${k.mentorMessage || ''}
KEY TEACHING POINTS:
${teachingPoints || 'General knowledge'}
MCQ ANGLES: ${mcqAngles || 'Mixed'}

Rules:
- Mix types: recall, clinical_application, guideline, pitfall
- Mix difficulty: 2 easy, 2 medium, 1 hard
- Clinical vignettes: include age, sex, presenting complaint
- 4 options (A-D), exactly one correct
- Do NOT invent drug doses not in the teaching points

Start your response with [ and end with ]. No markdown. No explanation outside the JSON.
[{"type":"multiple_choice","questionType":"recall|clinical_application|guideline|pitfall","question":"...","options":["A: ...","B: ...","C: ...","D: ..."],"correctAnswer":"A","explanation":"2-3 sentences","difficulty":"easy|medium|hard","sourceReference":null}]`;
}

async function seedColdStartMCQs(ai) {
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║  Phase 5: Cold-Start MCQs             ║');
    console.log('╚══════════════════════════════════════╝');

    let generated = 0;
    let skipped = 0;
    let failed = 0;

    for (const topic of ALL_TOPICS) {
        const tk = await db.getTopicKnowledge(topic);
        if (!tk || !tk.knowledge) { skipped++; continue; }

        // Check if cold-start MCQs already exist
        const normalizedTopic = topic.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim();
        const objectKey = `cold-start-mcq:${normalizedTopic.replace(/\s+/g, '-')}`;
        const existing = await db.getTeachingObjectByKey(objectKey).catch(() => null);
        if (existing) { skipped++; continue; }

        const prompt = buildColdStartMCQPrompt(topic, tk.knowledge);

        if (dryRun) {
            console.log(`  [DRY RUN] Would generate 5 MCQs for: ${topic}`);
            generated++;
            continue;
        }

        try {
            const raw = await callAI(ai, prompt, { temperature: TEMPERATURE.quiz });
            const mcqs = parseJsonArrayBlock(raw);
            if (!Array.isArray(mcqs) || mcqs.length === 0) {
                console.warn(`  ⚠ ${topic}: invalid MCQ JSON`);
                failed++;
                await sleep(1000);
                continue;
            }

            await db.upsertTeachingObject({
                objectKey,
                objectType: 'cold_start_mcq',
                topic: normalizedTopic,
                title: `Cold-start MCQs: ${topic}`,
                provider: 'gemini',
                model: PINNED_MODELS.gemini,
                confidence: 0.65,
                generatedAt: new Date().toISOString(),
                payload: {
                    kind: 'cold_start_mcq',
                    topic,
                    normalizedTopic,
                    mcqs: mcqs.slice(0, 5),
                    generatedAt: new Date().toISOString(),
                    trainingStage: 'finals',
                    difficulty: 'mixed',
                },
            });

            generated++;
            process.stdout.write(`  ✅ ${topic} (${mcqs.length} MCQs)\n`);
        } catch (err) {
            console.warn(`  ⚠ ${topic}: ${err.message}`);
            failed++;
        }
        await sleep(1500);
    }

    console.log(`\n  Phase 5 complete: ${generated} topics with MCQs, ${skipped} skipped, ${failed} failed.`);
    return { generated, skipped, failed };
}

// ─── Phase 6: Claude cross-reference + guideline MCQs ───────────────────────

function buildVerifyPrompt(topic, existingMcqs, guidelines) {
    const mcqBlock = existingMcqs.map((q, i) =>
        `MCQ ${i + 1}: ${q.question}\nOptions: ${(q.options || []).join(' | ')}\nCorrect: ${q.correctAnswer}\nExplanation: ${q.explanation || ''}`
    ).join('\n\n');

    const guidelineBlock = guidelines.slice(0, 8).map((g, i) =>
        `[G${i + 1}] ${g.sourceBody} ${g.sourceYear || ''}: ${g.recommendationText}`
    ).join('\n');

    return `You are a senior medical educator reviewing MCQs about "${topic}" for a final-year medical student platform. You have two tasks.

EXISTING MCQs TO REVIEW:
${mcqBlock}

CURRENT CLINICAL GUIDELINES:
${guidelineBlock || 'No specific guidelines available — use general clinical knowledge.'}

═══ TASK 1: Flag any issues in the existing MCQs ═══
For each MCQ that has a problem, include it in the "flags" array. Only flag real issues — do not flag MCQs that are correct.
Flag types: "wrong_answer" | "outdated" | "guideline_conflict" | "dangerous_distractor" | "misleading_vignette"

═══ TASK 2: Generate 5 new guideline-anchored MCQs ═══
Create 5 MCQs that test knowledge of the guidelines above. Each MCQ should:
- Reference a specific guideline recommendation (threshold, drug, indication, or monitoring requirement)
- Use a realistic clinical vignette (age, sex, presentation)
- Have 4 options (A-D), exactly one correct
- Mix difficulty: 2 medium, 2 hard, 1 easy
- Mix types: guideline, clinical_application, pitfall

Start your response with { and end with }. No markdown. No explanation outside the JSON.
{"flags":[{"mcqIndex":1,"flagType":"wrong_answer|outdated|guideline_conflict|dangerous_distractor|misleading_vignette","detail":"specific reason","suggestedFix":"corrected answer or wording"}],"guidelineMcqs":[{"type":"multiple_choice","questionType":"guideline|clinical_application|pitfall","question":"...","options":["A: ...","B: ...","C: ...","D: ..."],"correctAnswer":"A","explanation":"2-3 sentences citing the guideline","guidelineRef":"sourceBody year — recommendation summary","difficulty":"easy|medium|hard"}]}`;
}

async function verifyAndExtendMCQs(ai) {
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║  Phase 6: Claude Verify + Guideline MCQs ║');
    console.log('╚══════════════════════════════════════╝');

    if (!serverConfig.keys.anthropic) {
        console.warn('  ⚠ ANTHROPIC_API_KEY not set. Skipping Phase 6.');
        return { skipped: ALL_TOPICS.length, reason: 'no_key' };
    }

    let verified = 0, flagged = 0, guidelineMcqsCreated = 0, failed = 0, skipped = 0;

    for (const topic of ALL_TOPICS) {
        const normalized = topic.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim();
        const coldStartKey = `cold-start-mcq:${normalized.replace(/\s+/g, '-')}`;
        const guidelineKey = `guideline-mcq:${normalized.replace(/\s+/g, '-')}`;

        // Skip if guideline MCQs already exist
        if (!force) {
            const existing = await db.getTeachingObjectByKey(guidelineKey);
            if (existing?.payload?.mcqs?.length > 0) {
                skipped++;
                continue;
            }
        }

        // Load existing cold-start MCQs
        const coldObj = await db.getTeachingObjectByKey(coldStartKey);
        const existingMcqs = coldObj?.payload?.mcqs || [];

        // Load guidelines for this topic
        const guidelineResult = await db.getGuidelinesByTopic(topic, { limit: 10 });
        const guidelines = guidelineResult?.guidelines || guidelineResult || [];

        if (existingMcqs.length === 0 && guidelines.length === 0) {
            console.log(`  ⚠ ${topic}: no MCQs or guidelines — skipping`);
            skipped++;
            continue;
        }

        if (dryRun) {
            console.log(`  [DRY RUN] ${topic}: would verify ${existingMcqs.length} MCQs, ${guidelines.length} guidelines`);
            continue;
        }

        const prompt = buildVerifyPrompt(topic, existingMcqs, guidelines);

        let rawText;
        try {
            rawText = await ai.callClaude(prompt, 'claude-haiku-4-5-20251001', { temperature: 0.2, maxOutputTokens: 3000 });
        } catch (err) {
            console.warn(`  ⚠ ${topic}: Claude call failed — ${err.message}`);
            failed++;
            await sleep(2000);
            continue;
        }

        // Parse response — expect { flags: [...], guidelineMcqs: [...] }
        let parsed;
        try {
            const t = (rawText || '').trim();
            const cleaned = t.replace(/```json/g, '').replace(/```/g, '').trim();
            const start = cleaned.indexOf('{');
            const end = cleaned.lastIndexOf('}');
            if (start !== -1 && end !== -1) {
                parsed = JSON.parse(cleaned.slice(start, end + 1));
            }
        } catch (parseErr) { void parseErr; }

        if (!parsed) {
            console.warn(`  ⚠ ${topic}: invalid JSON from Claude`);
            failed++;
            await sleep(1000);
            continue;
        }

        const flags = Array.isArray(parsed.flags) ? parsed.flags : [];
        const newMcqs = Array.isArray(parsed.guidelineMcqs) ? parsed.guidelineMcqs : [];

        // Update cold-start object with flags if any
        if (flags.length > 0 && coldObj) {
            const updatedPayload = { ...coldObj.payload, reviewFlags: flags, reviewedAt: new Date().toISOString(), reviewProvider: 'claude-haiku-4-5' };
            await db.upsertTeachingObject({
                objectKey: coldStartKey,
                objectType: 'cold_start_mcq',
                topic,
                payload: updatedPayload,
                provider: coldObj.provider,
                model: coldObj.model,
                confidence: coldObj.confidence,
            });
            flagged += flags.length;
        }

        // Store new guideline MCQs
        if (newMcqs.length > 0) {
            await db.upsertTeachingObject({
                objectKey: guidelineKey,
                objectType: 'guideline_mcq',
                topic,
                title: `Guideline MCQs: ${topic}`,
                payload: { mcqs: newMcqs, guidelineCount: guidelines.length, generatedAt: new Date().toISOString() },
                provider: 'anthropic',
                model: 'claude-haiku-4-5-20251001',
                confidence: 0.85,
            });
            guidelineMcqsCreated += newMcqs.length;
        }

        verified++;
        const flagNote = flags.length > 0 ? ` — ${flags.length} flag(s)` : '';
        console.log(`  ✅ ${topic}: ${newMcqs.length} guideline MCQs${flagNote}`);

        await sleep(800); // ~1.25 req/s, well within Anthropic tier-1 limits
    }

    console.log(`\n  Phase 6 complete: ${verified} topics verified, ${flagged} MCQ flags, ${guidelineMcqsCreated} guideline MCQs created, ${failed} failed, ${skipped} skipped.`);
    return { verified, flagged, guidelineMcqsCreated, failed, skipped };
}

// ─── Phase 7: Guideline-enriched synopsis refresh ───────────────────────────

function pickTopGuidelines(guidelines) {
    // Score each guideline: prefer strong strength + high certainty + recent year
    const strengthScore = { strong: 3, conditional: 2, weak: 1, 'do not use': 0, 'research only': 0 };
    const certaintyScore = { high: 3, guideline: 3, moderate: 2, low: 1, 'very low': 0 };
    const scored = (guidelines || []).map(g => ({
        g,
        score: (strengthScore[g.recommendationStrength] ?? 1)
             + (certaintyScore[g.recommendationCertainty] ?? 1)
             + (g.sourceYear >= 2020 ? 1 : 0),
    }));
    scored.sort((a, b) => b.score - a.score);

    // Take top 3, ensuring source body diversity where possible
    const seen = new Set();
    const picked = [];
    for (const { g } of scored) {
        if (picked.length >= 3) break;
        const body = (g.sourceBody || '').toLowerCase();
        if (!seen.has(body)) {
            seen.add(body);
            picked.push(g);
        }
    }
    // If not enough diverse bodies, fill remainder
    for (const { g } of scored) {
        if (picked.length >= 3) break;
        if (!picked.includes(g)) picked.push(g);
    }
    return picked.slice(0, 3);
}

function buildSynopsisRefreshPrompt(topic, existingKnowledge, topGuidelines) {
    const existing = existingKnowledge || {};
    const currentSynopsis = existing.mentorMessage || '';
    const teachingPoints = (existing.teachingPoints || [])
        .slice(0, 4)
        .map(tp => `- ${tp.claim || tp.text || ''}`)
        .join('\n');

    const guidelineBlock = topGuidelines.map((g, i) =>
        `[GL${i + 1}] ${g.sourceBody}${g.sourceYear ? ` ${g.sourceYear}` : ''}: ${g.recommendationText}`
            + (g.recommendationStrength ? ` (${g.recommendationStrength})` : '')
    ).join('\n');

    return `You are a senior clinical educator updating a medical topic synopsis to incorporate current guidelines.

TOPIC: ${topic}

CURRENT SYNOPSIS (evidence-based, from papers):
${currentSynopsis}

KEY TEACHING POINTS (from papers, do not contradict):
${teachingPoints || 'None available'}

CURRENT GUIDELINES TO INCORPORATE (max 2-3, cite by body name):
${guidelineBlock}

Rewrite the synopsis as a single mentorMessage: 2-3 sentences maximum. Requirements:
- Keep the core evidence-based content from the current synopsis
- Weave in the guideline recommendations naturally — name the guideline body (e.g. "NICE recommends...", "ESC guidelines advise...")
- Do not cite more than 2-3 guidelines
- Be clinically precise, not generic
- Do not add markdown, headers, or bullet points — plain prose only
- Do not invent drug doses or thresholds not mentioned above

Return ONLY a JSON object:
{"mentorMessage": "your 2-3 sentence revised synopsis here"}`;
}

async function refreshSynopsesWithGuidelines(ai) {
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║  Phase 7: Guideline-Enriched Synopsis     ║');
    console.log('╚══════════════════════════════════════════╝');

    let refreshed = 0, skipped = 0, noGuidelines = 0, failed = 0;

    for (const topic of ALL_TOPICS) {
        const existing = await db.getTopicKnowledge(topic);
        if (!existing?.knowledge) {
            console.log(`  ⚠ ${topic}: no existing knowledge — skipping`);
            skipped++;
            continue;
        }

        // Skip if already guideline-enriched (unless --force)
        if (!force && existing.knowledge.guidelineEnrichedAt) {
            skipped++;
            continue;
        }

        const guidelineResult = await db.getGuidelinesByTopic(topic, { limit: 20 });
        const guidelines = guidelineResult?.guidelines || guidelineResult || [];

        if (guidelines.length === 0) {
            noGuidelines++;
            continue;
        }

        const topGuidelines = pickTopGuidelines(guidelines);

        if (dryRun) {
            console.log(`  [DRY RUN] ${topic}: would use ${topGuidelines.length} guidelines (${topGuidelines.map(g => g.sourceBody).join(', ')})`);
            continue;
        }

        const prompt = buildSynopsisRefreshPrompt(topic, existing.knowledge, topGuidelines);

        let rawText;
        try {
            rawText = await ai.callGemini(prompt, PINNED_MODELS.gemini, { temperature: 0.15 });
        } catch (err) {
            console.warn(`  ⚠ ${topic}: Gemini call failed — ${err.message}`);
            failed++;
            await sleep(2000);
            continue;
        }

        // Parse {"mentorMessage": "..."}
        let parsed;
        try {
            const cleaned = (rawText || '').trim().replace(/```json/g, '').replace(/```/g, '').trim();
            const start = cleaned.indexOf('{');
            const end = cleaned.lastIndexOf('}');
            if (start !== -1 && end !== -1) parsed = JSON.parse(cleaned.slice(start, end + 1));
        } catch (parseErr) { void parseErr; }

        if (!parsed?.mentorMessage) {
            console.warn(`  ⚠ ${topic}: invalid response`);
            failed++;
            await sleep(1000);
            continue;
        }

        // Merge updated mentorMessage back into existing knowledge
        const updatedKnowledge = {
            ...existing.knowledge,
            mentorMessage: parsed.mentorMessage,
            guidelineEnrichedAt: new Date().toISOString(),
            guidelineSources: topGuidelines.map(g => `${g.sourceBody} ${g.sourceYear || ''}`.trim()),
        };

        await db.upsertTopicKnowledge(topic, updatedKnowledge, existing.sourceArticles || [], 'ai_generated', 0.75);
        refreshed++;
        console.log(`  ✅ ${topic} (${topGuidelines.map(g => g.sourceBody).join(', ')})`);

        await sleep(1200);
    }

    console.log(`\n  Phase 7 complete: ${refreshed} refreshed, ${skipped} skipped, ${noGuidelines} no guidelines, ${failed} failed.`);
    return { refreshed, skipped, noGuidelines, failed };
}

// ─── Phase 8: Aggregate collective topic memory ──────────────────────────────

async function aggregateTopicMemory() {
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║  Phase 8: Collective Topic Memory         ║');
    console.log('╚══════════════════════════════════════════╝');

    // Get all distinct topics that have quiz attempts
    const topicRows = await db.all(
        `SELECT normalized_topic, COUNT(DISTINCT user_id) as unique_users, COUNT(*) as total_attempts
         FROM quiz_attempts
         GROUP BY normalized_topic
         HAVING unique_users >= 1
         ORDER BY total_attempts DESC`
    );

    if (topicRows.length === 0) {
        console.log('  No quiz attempt data yet. Run the app and get some users first.');
        return { topics: 0 };
    }

    console.log(`  Found ${topicRows.length} topic(s) with attempt data.`);

    let processed = 0;

    for (const row of topicRows) {
        const normalizedTopic = row.normalized_topic;

        // Per-question stats grouped by concept_hash
        const questionStats = await db.all(
            `SELECT concept_hash,
                    MAX(question_text) as question_text,
                    MAX(question_type) as question_type,
                    COUNT(*) as total_attempts,
                    SUM(is_correct) as correct_count,
                    COUNT(DISTINCT user_id) as unique_users
             FROM quiz_attempts
             WHERE normalized_topic = ?
             GROUP BY concept_hash
             HAVING total_attempts >= 3`,
            [normalizedTopic]
        );

        // Wrong answer frequencies (misconceptions)
        const wrongAnswers = await db.all(
            `SELECT concept_hash,
                    MAX(question_text) as question_text,
                    user_answer,
                    COUNT(*) as pick_count,
                    total.total_attempts
             FROM quiz_attempts qa
             JOIN (
                 SELECT concept_hash, COUNT(*) as total_attempts
                 FROM quiz_attempts WHERE normalized_topic = ? GROUP BY concept_hash
             ) total USING (concept_hash)
             WHERE qa.normalized_topic = ? AND qa.is_correct = 0
             GROUP BY concept_hash, user_answer
             HAVING CAST(pick_count AS REAL) / total_attempts >= 0.25
             ORDER BY pick_count DESC`,
            [normalizedTopic, normalizedTopic]
        );

        // Classify questions
        const highDiscrimination = [];
        const tooEasy = [];
        const tooHard = [];

        for (const q of questionStats) {
            const rate = q.total_attempts > 0 ? q.correct_count / q.total_attempts : 0;
            const entry = {
                conceptHash: q.concept_hash,
                questionText: q.question_text,
                questionType: q.question_type,
                correctRate: Math.round(rate * 100),
                totalAttempts: q.total_attempts,
                uniqueUsers: q.unique_users,
            };
            if (rate >= 0.40 && rate <= 0.75) highDiscrimination.push(entry);
            else if (rate > 0.90) tooEasy.push(entry);
            else if (rate < 0.20) tooHard.push(entry);
        }

        // Build misconception fingerprints
        const sharedMisconceptions = wrongAnswers.slice(0, 8).map(w => ({
            conceptHash: w.concept_hash,
            questionText: w.question_text?.slice(0, 200),
            wrongAnswer: w.user_answer,
            pickRate: Math.round((w.pick_count / w.total_attempts) * 100),
        }));

        const collective_memory = {
            interactionCount: Number(row.total_attempts),
            uniqueUsers: Number(row.unique_users),
            highDiscriminationMcqs: highDiscrimination.slice(0, 15),
            tooEasyMcqs: tooEasy.map(q => q.conceptHash),
            tooHardMcqs: tooHard.map(q => q.conceptHash),
            sharedMisconceptions,
            lastAggregatedAt: new Date().toISOString(),
        };

        // Write back to topic_knowledge
        const existing = await db.get(
            `SELECT topic, knowledge FROM topic_knowledge WHERE normalized_topic = ? LIMIT 1`,
            [normalizedTopic]
        );

        if (existing) {
            let knowledge = {};
            try { knowledge = JSON.parse(existing.knowledge || '{}'); } catch (parseErr) { void parseErr; }
            knowledge.collective_memory = collective_memory;

            const path = collective_memory.uniqueUsers >= 50 ? 'hot'
                       : collective_memory.uniqueUsers >= 15 ? 'warm' : 'cold';

            await db.run(
                `UPDATE topic_knowledge SET knowledge = ?, updated_at = ? WHERE normalized_topic = ?`,
                [JSON.stringify(knowledge), new Date().toISOString(), normalizedTopic]
            );
            console.log(`  ✅ ${existing.topic} — ${collective_memory.uniqueUsers} users, ${highDiscrimination.length} good Qs, ${sharedMisconceptions.length} misconceptions [${path}]`);
            processed++;
        }
    }

    console.log(`\n  Phase 8 complete: ${processed} topics updated with collective memory.`);
    return { topics: processed };
}

// ─── Phase 9: Cross-topic evidence cross-links ───────────────────────────────

async function buildCrosslinks(ai) {
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║  Phase 9: Cross-Topic Evidence Cross-links║');
    console.log('╚══════════════════════════════════════════╝');

    // ── Step A: shared paper links (free, no AI) ──────────────────────────────
    console.log('\n  Step A: Building shared-paper cross-links…');

    const knowledgeRows = await db.all(
        `SELECT topic, normalized_topic, knowledge FROM topic_knowledge`
    );

    // Build inverted index: pmid → [{ topic, normalizedTopic }]
    const pmidIndex = new Map(); // pmid → [{ topic, normalizedTopic, title }]
    for (const row of knowledgeRows) {
        let parsed;
        try { parsed = typeof row.knowledge === 'string' ? JSON.parse(row.knowledge) : row.knowledge; }
        catch { continue; }
        const sources = Array.isArray(parsed?.sourceArticles) ? parsed.sourceArticles : [];
        for (const src of sources) {
            if (!src?.pmid) continue;
            const pmid = String(src.pmid);
            if (!pmidIndex.has(pmid)) pmidIndex.set(pmid, []);
            pmidIndex.get(pmid).push({ topic: row.topic, normalizedTopic: row.normalized_topic, title: src.title || null });
        }
    }

    let sharedLinksCreated = 0;
    const totalTopicsForPmid = knowledgeRows.length || 1;

    for (const [pmid, entries] of pmidIndex.entries()) {
        if (entries.length < 2) continue;
        // Normalize strength: 2 topics sharing = 0.3, many topics = up to 0.7
        const rawStrength = 0.3 + Math.min((entries.length - 2) / (totalTopicsForPmid - 2 || 1), 1) * 0.4;
        const strength = Math.round(rawStrength * 100) / 100;
        const title = entries[0].title;

        // Create a link for every pair
        for (let i = 0; i < entries.length; i++) {
            for (let j = i + 1; j < entries.length; j++) {
                const a = entries[i];
                const b = entries[j];
                if (a.normalizedTopic === b.normalizedTopic) continue;
                if (dryRun) {
                    console.log(`  [DRY RUN] shared_paper: "${a.topic}" ↔ "${b.topic}" (pmid ${pmid})`);
                    sharedLinksCreated++;
                    continue;
                }
                try {
                    await db.upsertTopicCrosslink({
                        topicA: a.topic,
                        normalizedTopicA: a.normalizedTopic,
                        topicB: b.topic,
                        normalizedTopicB: b.normalizedTopic,
                        linkType: 'shared_paper',
                        sharedEvidence: JSON.stringify({ pmid, title }),
                        strength,
                        aiRationale: null,
                    });
                    sharedLinksCreated++;
                } catch (err) {
                    console.warn(`  ⚠ upsertTopicCrosslink failed: ${err.message}`);
                }
            }
        }
    }
    console.log(`  Step A complete: ${sharedLinksCreated} shared-paper link(s) upserted.`);

    // ── Step B: AI-inferred links (one Gemini call per topic) ─────────────────
    console.log('\n  Step B: Building AI-inferred cross-links…');

    // Use DB topics (all curriculum_topics) instead of static topics.json
    const dbTopicRows = await db.all(
        `SELECT display_name FROM curriculum_topics ORDER BY sort_order ASC`
    );
    const DB_TOPICS = dbTopicRows.map(r => r.display_name);
    console.log(`  Using ${DB_TOPICS.length} topics from database (${ALL_TOPICS.length} in static file)`);

    let aiLinksCreated = 0;
    let aiSkipped = 0;
    let aiFailed = 0;

    for (const topic of DB_TOPICS) {
        // Skip if already has ≥3 ai_inferred links (unless --force)
        if (!force) {
            const existing = await db.getTopicCrosslinks(db.normalizeTopic(topic), { limit: 50 });
            const aiCount = existing.filter(l => l.linkType === 'ai_inferred').length;
            if (aiCount >= 3) {
                aiSkipped++;
                continue;
            }
        }

        const prompt = `Given the topic "${topic}", identify up to 5 other topics from the list below that share key evidence, drug class, mechanism, or clinical overlap.

FULL TOPIC LIST:
${DB_TOPICS.join(', ')}

Return ONLY valid JSON array:
[{"relatedTopic": "exact topic name from list", "rationale": "one sentence — what they share", "strength": 0.5-1.0}]

Rules:
- Only pick topics from the provided list (exact match)
- strength: 0.9 = same drug/trial underpins both; 0.5 = tangential overlap
- Return [] if no meaningful links exist
- Start response with [ and end with ]`;

        if (dryRun) {
            console.log(`  [DRY RUN] Would call AI for cross-links: "${topic}"`);
            continue;
        }

        let rawText;
        try {
            rawText = await callAI(ai, prompt, { temperature: 0.2 });
        } catch (err) {
            console.warn(`  ⚠ "${topic}": AI call failed — ${err.message}`);
            aiFailed++;
            await sleep(1200);
            continue;
        }

        const links = parseJsonArrayBlock(rawText);
        if (!Array.isArray(links)) {
            console.warn(`  ⚠ "${topic}": invalid JSON array response`);
            aiFailed++;
            await sleep(1200);
            continue;
        }

        const topicSet = new Set(DB_TOPICS);
        let topicLinksCreated = 0;
        for (const link of links) {
            const relatedTopic = String(link.relatedTopic || '').trim();
            if (!relatedTopic || !topicSet.has(relatedTopic)) continue;
            if (relatedTopic === topic) continue;
            const strength = Math.min(Math.max(parseFloat(link.strength) || 0.5, 0.1), 1.0);
            try {
                await db.upsertTopicCrosslink({
                    topicA: topic,
                    normalizedTopicA: db.normalizeTopic(topic),
                    topicB: relatedTopic,
                    normalizedTopicB: db.normalizeTopic(relatedTopic),
                    linkType: 'ai_inferred',
                    sharedEvidence: null,
                    strength,
                    aiRationale: String(link.rationale || '').trim() || null,
                });
                topicLinksCreated++;
                aiLinksCreated++;
            } catch (err) {
                console.warn(`  ⚠ upsertTopicCrosslink failed: ${err.message}`);
            }
        }
        console.log(`  ✅ "${topic}": ${topicLinksCreated} AI-inferred link(s)`);
        await sleep(1200);
    }

    console.log(`\n  Phase 9 complete:`);
    console.log(`    Shared-paper links: ${sharedLinksCreated}`);
    console.log(`    AI-inferred links: ${aiLinksCreated}`);
    console.log(`    Skipped (already linked): ${aiSkipped}`);
    console.log(`    AI calls failed: ${aiFailed}`);
    return { sharedLinksCreated, aiLinksCreated, aiSkipped, aiFailed };
}

// ─── Phase 6c: Gemini cross-checks Claude's guideline MCQs ──────────────────

function buildGuidelineVerifyPrompt(topic, mcqs, guidelines) {
    const mcqBlock = mcqs.map((q, i) =>
        `MCQ ${i + 1}:\n${q.question}\nOptions: ${(q.options || []).join(' | ')}\nCorrect: ${q.correctAnswer}\nExplanation: ${q.explanation || ''}\nGuidelineRef: ${q.guidelineRef || ''}`
    ).join('\n\n');

    const guidelineBlock = guidelines.slice(0, 8).map((g, i) =>
        `[G${i + 1}] ${g.sourceBody} ${g.sourceYear || ''}: ${g.recommendationText}`
    ).join('\n');

    return `You are a senior medical educator independently reviewing guideline-based MCQs about "${topic}" generated by another AI system.

GUIDELINES USED TO GENERATE THESE MCQs:
${guidelineBlock || 'No specific guidelines available — use general clinical knowledge.'}

MCQs TO REVIEW:
${mcqBlock}

Your job: flag any MCQ that has a real clinical or factual error. Be strict — these will be shown to final-year medical students.
Flag types: "wrong_answer" | "guideline_conflict" | "dangerous_distractor" | "misleading_vignette" | "outdated"

Only flag genuine problems. If an MCQ is correct, do not flag it.

Return ONLY valid JSON starting with [ and ending with ]. No markdown. No explanation outside the JSON.
Return an empty array [] if all MCQs are correct.

Schema — array of flags:
[{"mcqIndex":1,"flagType":"wrong_answer","detail":"specific reason the MCQ is wrong","suggestedFix":"how to correct it"}]`;
}

async function verifyGuidelineMCQs(ai) {
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║  Phase 6c: Gemini Verifies Guideline MCQs ║');
    console.log('╚══════════════════════════════════════════╝');

    const rows = await db.all(
        `SELECT id, topic, object_key, object_payload
         FROM teaching_objects
         WHERE object_type = 'guideline_mcq'`
    );

    if (rows.length === 0) {
        console.log('  No guideline MCQ objects found. Run --verify first.');
        return { topics: 0, flagged: 0, skipped: 0, failed: 0 };
    }

    console.log(`  Found ${rows.length} guideline MCQ object(s) to review.\n`);

    let totalFlagged = 0, failed = 0, skipped = 0, processed = 0;

    for (const row of rows) {
        let payload;
        try {
            payload = typeof row.object_payload === 'string' ? JSON.parse(row.object_payload) : row.object_payload;
        } catch {
            console.warn(`  ⚠ Could not parse payload for ${row.topic}`);
            continue;
        }

        const mcqs = Array.isArray(payload.mcqs) ? payload.mcqs : [];
        if (mcqs.length === 0) { skipped++; continue; }

        // Skip if already reviewed by Gemini
        if (!force && payload.geminiReviewedAt) {
            skipped++;
            continue;
        }

        // Load guidelines for context
        const guidelineResult = await db.getGuidelinesByTopic(row.topic, { limit: 8 });
        const guidelines = guidelineResult?.guidelines || guidelineResult || [];

        if (dryRun) {
            console.log(`  [DRY RUN] ${row.topic}: would review ${mcqs.length} guideline MCQs`);
            continue;
        }

        const prompt = buildGuidelineVerifyPrompt(row.topic, mcqs, guidelines);

        let flags = [];
        try {
            const raw = await ai.callGemini(prompt, PINNED_MODELS.geminiQuality, { temperature: 0.1, maxOutputTokens: 1500 });
            flags = parseJsonArrayBlock(raw) || [];
            if (!Array.isArray(flags)) flags = [];
        } catch (err) {
            console.warn(`  ⚠ ${row.topic}: Gemini call failed — ${err.message}`);
            failed++;
            await sleep(2000);
            continue;
        }

        // Rewrite flagged MCQs with Claude
        let rewriteCount = 0;
        for (const flag of flags) {
            const idx = (flag.mcqIndex || 1) - 1;
            if (idx < 0 || idx >= mcqs.length) continue;

            const original = mcqs[idx];
            const fixPrompt = buildFlagFixPrompt(row.topic, original, flag);

            try {
                const raw = await ai.callClaude(fixPrompt, 'claude-haiku-4-5-20251001', { maxOutputTokens: 600 });
                const rewritten = parseJsonBlock(raw);
                if (!rewritten?.question || !Array.isArray(rewritten.options)) continue;

                mcqs[idx] = {
                    ...original,
                    question: rewritten.question,
                    options: rewritten.options,
                    correctAnswer: rewritten.correctAnswer || original.correctAnswer,
                    explanation: rewritten.explanation || original.explanation,
                    questionType: rewritten.questionType || original.questionType,
                    difficulty: rewritten.difficulty || original.difficulty,
                    rewrittenAt: new Date().toISOString(),
                };
                rewriteCount++;
            } catch (err) {
                console.warn(`    ⚠ ${row.topic} MCQ #${flag.mcqIndex}: rewrite failed — ${err.message}`);
            }
            await sleep(500);
        }

        // Save updated payload with review timestamp
        const newPayload = { ...payload, mcqs, geminiReviewedAt: new Date().toISOString() };
        await db.upsertTeachingObject({
            objectKey: row.object_key,
            objectType: 'guideline_mcq',
            topic: row.topic,
            title: `Guideline MCQs: ${row.topic}`,
            payload: newPayload,
            provider: 'anthropic',
            model: 'claude-haiku-4-5-20251001',
            confidence: 0.9,
        });

        totalFlagged += flags.length;
        processed++;
        const flagNote = flags.length > 0 ? ` — ${flags.length} flag(s), ${rewriteCount} rewritten` : ' — clean';
        console.log(`  ✅ ${row.topic}${flagNote}`);

        await sleep(800);
    }

    console.log(`\n  Phase 6c complete: ${processed} topics reviewed, ${totalFlagged} flags found, ${failed} failed, ${skipped} skipped.`);
    return { topics: processed, flagged: totalFlagged, failed, skipped };
}

// ─── Phase 6b: Rewrite flagged MCQs ─────────────────────────────────────────

function buildFlagFixPrompt(topic, mcq, flag) {
    const optionsText = (mcq.options || []).map((o, i) => `  ${String.fromCharCode(65 + i)}: ${o}`).join('\n');
    return `You are a senior medical educator correcting a flawed MCQ about "${topic}".

FLAGGED QUESTION:
${mcq.question}

OPTIONS:
${optionsText}

CORRECT ANSWER: ${mcq.correctAnswer}
EXPLANATION: ${mcq.explanation || '(none)'}

FLAG TYPE: ${flag.flagType}
REASON: ${flag.detail}
SUGGESTED FIX: ${flag.suggestedFix || '(none)'}

Rewrite this MCQ to fix the identified issue while keeping the same clinical concept.
Return ONLY valid JSON starting with { and ending with } — no markdown, no commentary.
Schema:
{
  "question": "...",
  "options": ["A: ...", "B: ...", "C: ...", "D: ..."],
  "correctAnswer": "A",
  "explanation": "...",
  "questionType": "${mcq.questionType || 'recall'}",
  "difficulty": "${mcq.difficulty || 'medium'}"
}`;
}

async function fixFlaggedMCQs(ai) {
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║  Phase 6b: Rewrite Flagged MCQs           ║');
    console.log('╚══════════════════════════════════════════╝');

    // Fetch all cold_start_mcq objects that have review flags
    const flaggedRows = await db.all(
        `SELECT id, topic, object_key, object_payload
         FROM teaching_objects
         WHERE object_type = 'cold_start_mcq'
           AND object_payload LIKE '%reviewFlags%'`
    );

    if (flaggedRows.length === 0) {
        console.log('  No flagged MCQ objects found. Run --verify first.');
        return { topics: 0, fixed: 0, failed: 0 };
    }

    let totalFixed = 0;
    let totalFailed = 0;
    let topicsProcessed = 0;

    console.log(`  Found ${flaggedRows.length} topic(s) with flagged MCQs.\n`);

    for (const row of flaggedRows) {
        let payload;
        try {
            payload = typeof row.object_payload === 'string' ? JSON.parse(row.object_payload) : row.object_payload;
        } catch {
            console.warn(`  ⚠ Could not parse payload for ${row.topic}`);
            continue;
        }

        const mcqs = Array.isArray(payload.mcqs) ? payload.mcqs : [];
        const flags = Array.isArray(payload.reviewFlags) ? payload.reviewFlags : [];

        if (flags.length === 0 || mcqs.length === 0) continue;

        let fixedCount = 0;
        let failCount = 0;

        for (const flag of flags) {
            const idx = (flag.mcqIndex || 1) - 1; // mcqIndex is 1-based
            if (idx < 0 || idx >= mcqs.length) {
                console.warn(`    ⚠ mcqIndex ${flag.mcqIndex} out of range for ${row.topic}`);
                continue;
            }

            const original = mcqs[idx];
            if (!original) continue;

            if (dryRun) {
                console.log(`    [dry-run] Would fix ${row.topic} MCQ #${flag.mcqIndex} (${flag.flagType})`);
                fixedCount++;
                continue;
            }

            const prompt = buildFlagFixPrompt(row.topic, original, flag);
            try {
                const raw = await ai.callClaude(prompt, 'claude-haiku-4-5-20251001', { maxOutputTokens: 600 });
                const rewritten = parseJsonBlock(raw);
                if (!rewritten || !rewritten.question || !Array.isArray(rewritten.options)) {
                    console.warn(`    ⚠ ${row.topic} MCQ #${flag.mcqIndex}: bad JSON from Claude`);
                    failCount++;
                    continue;
                }

                // Merge rewritten fields into original (preserve any extra fields like guidelineRef)
                mcqs[idx] = {
                    ...original,
                    question: rewritten.question,
                    options: rewritten.options,
                    correctAnswer: rewritten.correctAnswer || original.correctAnswer,
                    explanation: rewritten.explanation || original.explanation,
                    questionType: rewritten.questionType || original.questionType,
                    difficulty: rewritten.difficulty || original.difficulty,
                    rewrittenAt: new Date().toISOString(),
                };
                fixedCount++;
            } catch (err) {
                console.warn(`    ⚠ ${row.topic} MCQ #${flag.mcqIndex}: ${err.message}`);
                failCount++;
            }

            await sleep(600);
        }

        if (!dryRun && fixedCount > 0) {
            // Clear flags only if all were processed
            const newPayload = { ...payload, mcqs };
            if (failCount === 0) delete newPayload.reviewFlags;

            await db.upsertTeachingObject({
                objectKey: row.object_key,
                objectType: 'cold_start_mcq',
                topic: row.topic,
                title: `Cold-Start MCQs: ${row.topic}`,
                payload: newPayload,
                provider: payload.provider || 'google',
                model: payload.model || 'gemini',
                confidence: payload.confidence || 0.8,
            });
        }

        totalFixed += fixedCount;
        totalFailed += failCount;
        topicsProcessed++;
        console.log(`  ✅ ${row.topic}: ${fixedCount} fixed, ${failCount} failed`);
    }

    console.log(`\n  Phase 6b complete: ${topicsProcessed} topics, ${totalFixed} MCQs rewritten, ${totalFailed} failed.`);
    return { topics: topicsProcessed, fixed: totalFixed, failed: totalFailed };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║  Medical Research Enhancement Pipeline    ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log(`Phases: ${Object.entries(phases).filter(([, v]) => v).map(([k]) => k).join(', ')}`);
    if (dryRun) console.log('Mode: DRY RUN');

    await db.connect();
    await db.runMigrations();

    const ai = createAiService({ serverConfig, fetchImpl: safeFetch });
    const report = {};

    if (phases.retry) report.retry = await retryFailedTopics(ai);
    if (phases.teaching) report.teaching = await buildTeachingObjects();
    if (phases.quality) report.quality = await qualityScoreSynopses(ai);
    if (phases.prerequisites) report.prerequisites = await generatePrerequisites(ai);
    if (phases.mcqs) report.mcqs = await seedColdStartMCQs(ai);
    if (phases.verify) report.verify = await verifyAndExtendMCQs(ai);
    if (phases.fixFlags) report.fixFlags = await fixFlaggedMCQs(ai);
    if (phases.verifyGuideline) report.verifyGuideline = await verifyGuidelineMCQs(ai);
    if (phases.synopsis) report.synopsis = await refreshSynopsesWithGuidelines(ai);
    if (phases.aggregate) report.aggregate = await aggregateTopicMemory();
    if (phases.crosslink) report.crosslink = await buildCrosslinks(ai);

    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║  Enhancement Pipeline Complete            ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log(JSON.stringify(report, null, 2));

    await db.close();
    process.exit(0);
}

main().catch(err => {
    console.error('Enhancement pipeline failed:', err);
    process.exit(1);
});
