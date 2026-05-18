/**
 * Pre-seed the topic_knowledge table for the most common medical topics.
 *
 * Run once before launch:
 *   node server/scripts/seedKnowledge.js
 *
 * Optional flags:
 *   --topic "sepsis"          seed a single topic
 *   --force                   re-extract even if knowledge already exists and is fresh
 *   --dry-run                 print prompts but don't call the AI or write to DB
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { loadEnv, serverConfig } = require('../../config');
loadEnv();

const db = require('../../database');
const { createAiService } = require('../services/aiService');
const { buildTopicKnowledgePrompt } = require('../prompts');
const { fetchUnifiedEvidence } = require('../services/unifiedEvidenceSearch');
const { safeFetch } = require('../utils/fetch');

const TOP_TOPICS = [
    // Critical care
    'sepsis', 'septic shock', 'ards', 'mechanical ventilation',
    'acute kidney injury', 'acute liver failure', 'diabetic ketoacidosis',
    // Cardiovascular
    'acute coronary syndrome', 'myocardial infarction', 'heart failure',
    'atrial fibrillation', 'pulmonary embolism', 'deep vein thrombosis',
    'aortic dissection', 'cardiac arrest',
    // Respiratory
    'community acquired pneumonia', 'copd exacerbation', 'asthma exacerbation',
    // Neurology
    'ischaemic stroke', 'haemorrhagic stroke', 'meningitis', 'status epilepticus',
    // Gastroenterology
    'upper gi bleed', 'acute pancreatitis', 'inflammatory bowel disease',
    'liver cirrhosis',
    // Endocrine / metabolic
    'type 2 diabetes management', 'hypertension', 'hypothyroidism',
    'adrenal insufficiency',
    // Infection
    'urinary tract infection', 'cellulitis', 'infective endocarditis',
    'covid 19 management',
    // Rheumatology / immunology
    'rheumatoid arthritis', 'systemic lupus erythematosus',
    // Oncology (supportive)
    'febrile neutropenia', 'hypercalcaemia of malignancy',
    // Anaemia / haematology
    'iron deficiency anaemia', 'venous thromboembolism prevention',
];

const args = process.argv.slice(2);
const topicArg = args.includes('--topic') ? args[args.indexOf('--topic') + 1] : null;
const force = args.includes('--force');
const dryRun = args.includes('--dry-run');

const topics = topicArg ? [topicArg] : TOP_TOPICS;

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function parseJsonBlock(text) {
    const cleaned = (text || '').replace(/```json/g, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    try {
        return JSON.parse(cleaned.slice(start, end + 1).replace(/,\s*([}\]])/g, '$1'));
    } catch {
        return null;
    }
}

async function seedTopic(topic, ai) {
    console.log(`\n── ${topic} ──`);

    if (!force) {
        const existing = await db.getTopicKnowledge(topic);
        const isStale = await db.isTopicKnowledgeStale(topic);
        if (existing && !isStale) {
            console.log(`  ✓ Already fresh (last refreshed: ${existing.lastRefreshedAt}). Skipping.`);
            return;
        }
    }

    console.log(`  Fetching papers…`);
    let articles = [];
    try {
        const raw = await fetchUnifiedEvidence({
            query: topic,
            safeLimit: 10,
            sourceList: ['pubmed'],
            serverConfig,
            fetch: safeFetch,
            vectorList: [],
        });
        articles = raw.slice(0, 8);
    } catch (err) {
        console.warn(`  ⚠ Evidence fetch failed: ${err.message}`);
        return;
    }

    if (articles.length < 2) {
        console.warn(`  ⚠ Only ${articles.length} articles — skipping (need ≥2)`);
        return;
    }

    console.log(`  ${articles.length} articles retrieved. Building knowledge prompt…`);

    const prompt = buildTopicKnowledgePrompt(topic, articles);

    if (dryRun) {
        console.log(`  [DRY RUN] Prompt length: ${prompt.length} chars. Not calling AI.`);
        return;
    }

    let raw;
    try {
        if (serverConfig.keys.gemini) {
            raw = await ai.callGemini(prompt, 'gemini-2.0-flash', { temperature: 0.15 });
        } else if (serverConfig.keys.mistral) {
            raw = await ai.callMistralAI(prompt, 'mistral-small-latest', { temperature: 0.15 });
        } else {
            console.warn(`  ⚠ No AI provider configured (set GEMINI_API_KEY or MISTRAL_API_KEY).`);
            return;
        }
    } catch (err) {
        console.warn(`  ⚠ AI call failed: ${err.message}`);
        return;
    }

    const knowledge = parseJsonBlock(raw);
    if (!knowledge?.mentorMessage) {
        console.warn(`  ⚠ AI response did not contain valid knowledge JSON. Skipping.`);
        return;
    }

    const sourceArticles = articles.map((a, i) => ({
        sourceIndex: i + 1,
        uid: a.uid,
        title: a.title,
        doi: a.doi || null,
        pmid: a.pmid || null,
        source: a.source || null,
        pubdate: a.pubdate || null,
    }));

    await db.upsertTopicKnowledge(topic, knowledge, sourceArticles, 'ai_generated', 0.65);
    console.log(`  ✅ Stored. Seminal papers: ${(knowledge.seminalPapers || []).length}, Teaching points: ${(knowledge.teachingPoints || []).length}`);
}

async function main() {
    console.log('Connecting to database…');
    await db.connect();
    await db.runMigrations();

    const ai = createAiService({ serverConfig, fetchImpl: safeFetch });

    console.log(`\nSeeding ${topics.length} topic(s)${force ? ' (force refresh)' : ''}${dryRun ? ' (DRY RUN)' : ''}…`);

    for (const topic of topics) {
        await seedTopic(topic, ai);
        await sleep(2000); // rate-limit headroom between topics
    }

    console.log('\n✅ Seeding complete.');
    await db.close();
    process.exit(0);
}

main().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
