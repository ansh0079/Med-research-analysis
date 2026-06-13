/**
 * Guideline contradiction detection.
 *
 * Compares guidelines from different bodies on the same topic,
 * uses Gemini to detect semantic contradictions, and stores results.
 *
 * Usage:
 *   node server/scripts/detectGuidelineContradictions.js
 *   node server/scripts/detectGuidelineContradictions.js --topic "heart failure"
 *   node server/scripts/detectGuidelineContradictions.js --dry-run
 *   node server/scripts/detectGuidelineContradictions.js --force
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { loadEnv, serverConfig } = require('../../config');
loadEnv();

const db = require('../../database');
const { createAiService, PINNED_MODELS, TEMPERATURE } = require('../services/aiService');
const { safeFetch } = require('../utils/fetch');
const { parseJsonArrayBlock } = require('../utils/parseJson');
const { setTimeout: sleep } = require('timers/promises');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const topicFlag = args.includes('--topic') ? args[args.indexOf('--topic') + 1] : null;

async function callAI(ai, prompt) {
    if (serverConfig.keys.gemini) {
        return ai.callGemini(prompt, PINNED_MODELS.gemini, { temperature: 0.1 });
    } else if (serverConfig.keys.mistral) {
        return ai.callMistralAI(prompt, PINNED_MODELS.mistral, { temperature: 0.1 });
    }
    throw new Error('No AI provider configured');
}

function buildPrompt(topic, guidelines) {
    const guidelineList = guidelines.map((g, i) =>
        `[G${i + 1}] ${g.source_body}${g.source_year ? ` (${g.source_year})` : ''}${g.recommendation_strength ? `, Strength: ${g.recommendation_strength}` : ''}:
  Recommendation: ${g.recommendation_text}${g.population ? `\n  Population: ${g.population}` : ''}${g.intervention ? `\n  Intervention: ${g.intervention}` : ''}${g.cautions ? `\n  Cautions: ${g.cautions}` : ''}`
    ).join('\n\n');

    return `You are a clinical guideline analyst. Compare ALL the following guideline recommendations on the topic "${topic}" and identify any contradictions between DIFFERENT source bodies.

${guidelineList}

Analyze whether any pair of guidelines from DIFFERENT bodies contradict each other. Consider:
- Different treatment thresholds or targets (e.g., BP target <130 vs <140)
- Conflicting drug or intervention recommendations
- Different risk stratification approaches
- Population scope differences that create practical conflicts
- Timing, duration, or dosing disagreements
- One body recommending something the other cautions against

Return STRICT JSON array of contradictions found. If no contradictions exist, return [].

[{
  "guidelineIndexA": 1,
  "guidelineIndexB": 2,
  "severity": "major",
  "contradictionSummary": "one sentence describing the core disagreement",
  "bodyAPosition": "what body A specifically recommends (1-2 sentences)",
  "bodyBPosition": "what body B specifically recommends (1-2 sentences)",
  "clinicalImplication": "why this matters for a treating physician (1-2 sentences)",
  "confidence": 0.85
}]

Severity levels:
- "major": directly conflicting recommendations that would change patient management
- "minor": different emphasis or thresholds that may affect treatment in edge cases
- "nuanced": different framing or population scope but not directly contradictory

Start response with [ and end with ].`;
}

async function main() {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  Guideline Contradiction Detection            ║');
    console.log('╚══════════════════════════════════════════════╝');
    if (dryRun) console.log('Mode: DRY RUN');
    if (force) console.log('Mode: FORCE (re-process all)');
    if (topicFlag) console.log(`Topic filter: "${topicFlag}"`);

    await db.connect();
    await db.runMigrations();

    const ai = createAiService({ serverConfig, fetchImpl: safeFetch });

    let topicQuery = `
        SELECT normalized_topic, topic, COUNT(DISTINCT source_body) AS body_count
        FROM topic_guidelines
        WHERE superseded_by_id IS NULL AND status != 'superseded'
        GROUP BY normalized_topic, topic
        HAVING COUNT(DISTINCT source_body) >= 2
        ORDER BY COUNT(DISTINCT source_body) DESC`;
    const params = [];

    if (topicFlag) {
        const normalized = db.normalizeTopic(topicFlag);
        topicQuery = `
            SELECT normalized_topic, topic, COUNT(DISTINCT source_body) AS body_count
            FROM topic_guidelines
            WHERE superseded_by_id IS NULL AND status != 'superseded'
              AND normalized_topic = ?
            GROUP BY normalized_topic, topic
            HAVING COUNT(DISTINCT source_body) >= 2`;
        params.push(normalized);
    }

    const topics = await db.all(topicQuery, params);
    console.log(`\nFound ${topics.length} topic(s) with guidelines from 2+ bodies.\n`);

    let totalContradictions = 0;
    let topicsProcessed = 0;
    let topicsSkipped = 0;
    let aiFailed = 0;

    for (const topicRow of topics) {
        const { normalized_topic, topic, body_count } = topicRow;

        if (!force) {
            const existing = await db.all(
                `SELECT COUNT(*) AS cnt FROM guideline_contradictions
                 WHERE normalized_topic = ? AND detected_at > CURRENT_TIMESTAMP - INTERVAL '30 days'`,
                [normalized_topic]
            );
            if (existing[0]?.cnt > 0) {
                topicsSkipped++;
                continue;
            }
        }

        const guidelines = await db.all(
            `SELECT id, topic, source_body, source_year, source_url,
                    recommendation_text, recommendation_strength, recommendation_certainty,
                    population, intervention, cautions
             FROM topic_guidelines
             WHERE normalized_topic = ?
               AND superseded_by_id IS NULL AND status != 'superseded'
             ORDER BY source_body, source_year DESC`,
            [normalized_topic]
        );

        if (guidelines.length < 2) continue;

        const bodies = [...new Set(guidelines.map(g => g.source_body))];
        if (bodies.length < 2) continue;

        topicsProcessed++;
        const progress = `[${topicsProcessed}/${topics.length - topicsSkipped}]`;

        if (dryRun) {
            console.log(`  ${progress} [DRY RUN] "${topic}" — ${guidelines.length} guidelines from ${bodies.join(', ')}`);
            continue;
        }

        const prompt = buildPrompt(topic, guidelines);

        let rawText;
        try {
            rawText = await callAI(ai, prompt);
        } catch (err) {
            console.warn(`  ${progress} "${topic}": AI call failed — ${err.message}`);
            aiFailed++;
            await sleep(1500);
            continue;
        }

        const contradictions = parseJsonArrayBlock(rawText);
        if (!Array.isArray(contradictions)) {
            console.warn(`  ${progress} "${topic}": invalid JSON response`);
            aiFailed++;
            await sleep(1500);
            continue;
        }

        let topicCount = 0;
        for (const c of contradictions) {
            if (!c.guidelineIndexA || !c.guidelineIndexB) continue;
            const gA = guidelines[c.guidelineIndexA - 1];
            const gB = guidelines[c.guidelineIndexB - 1];
            if (!gA || !gB) continue;
            if (gA.source_body === gB.source_body) continue;

            try {
                await db.upsertContradiction({
                    guidelineAId: gA.id,
                    guidelineBId: gB.id,
                    normalizedTopic: normalized_topic,
                    severity: c.severity || 'nuanced',
                    contradictionSummary: String(c.contradictionSummary || '').trim(),
                    bodyAPosition: String(c.bodyAPosition || '').trim(),
                    bodyBPosition: String(c.bodyBPosition || '').trim(),
                    clinicalImplication: String(c.clinicalImplication || '').trim() || null,
                    aiConfidence: Number(c.confidence || 0),
                });
                topicCount++;
                totalContradictions++;
            } catch (err) {
                console.warn(`  ⚠ upsert failed: ${err.message}`);
            }
        }

        const severities = contradictions.filter(c => c.guidelineIndexA && c.guidelineIndexB);
        const major = severities.filter(c => c.severity === 'major').length;
        const minor = severities.filter(c => c.severity === 'minor').length;
        const nuanced = severities.filter(c => c.severity === 'nuanced').length;

        if (topicCount > 0) {
            console.log(`  ${progress} "${topic}": ${topicCount} contradiction(s) [${major ? `${major} major ` : ''}${minor ? `${minor} minor ` : ''}${nuanced ? `${nuanced} nuanced` : ''}] from ${bodies.join(', ')}`);
        } else {
            console.log(`  ${progress} "${topic}": no contradictions (${bodies.length} bodies agree)`);
        }

        await sleep(1500);
    }

    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║  Contradiction Detection Complete              ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log(`  Topics processed: ${topicsProcessed}`);
    console.log(`  Topics skipped (recent): ${topicsSkipped}`);
    console.log(`  Contradictions found: ${totalContradictions}`);
    console.log(`  AI failures: ${aiFailed}`);

    await db.close();
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
