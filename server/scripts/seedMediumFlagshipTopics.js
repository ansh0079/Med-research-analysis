/**
 * Seed the 17 medium-priority flagship topics into the curriculum and generate
 * topic_knowledge using Claude, then run flagship enrichment on them.
 *
 * Usage:
 *   node server/scripts/seedMediumFlagshipTopics.js [--dry-run] [--topic "Name"] [--skip-seed] [--skip-enrich]
 *
 * --skip-seed    skip curriculum_topics + topic_knowledge step (if already seeded)
 * --skip-enrich  skip the flagship enrichment step
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { loadEnv, serverConfig } = require('../../config');
loadEnv();

const db = require('../../database');
const { createAiService, PINNED_MODELS } = require('../services/aiService');
const { safeFetch } = require('../utils/fetch');
const { loadFlagshipConfig } = require('../services/flagshipTopicOps');
const { collectTopicReadiness } = require('../services/topicReadinessService');
const { buildTopicKnowledgePrompt } = require('../prompts');

const CLAUDE_MODEL = PINNED_MODELS.claude;

const DRY_RUN    = process.argv.includes('--dry-run');
const SKIP_SEED  = process.argv.includes('--skip-seed');
const SKIP_ENRICH= process.argv.includes('--skip-enrich');
const TOPIC_ARG  = (() => { const i = process.argv.indexOf('--topic'); return i >= 0 ? process.argv[i + 1] : null; })();

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ─── PubMed abstract fetcher (reused from enrichFlagshipKnowledge) ────────────

const PUBMED_EFETCH  = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
const PUBMED_ESEARCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';

async function fetchAbstracts(pmids) {
    if (!pmids.length) return [];
    const url = `${PUBMED_EFETCH}?db=pubmed&id=${pmids.join(',')}&retmode=xml&rettype=abstract`;
    const res = await safeFetch(url, { timeout: 20000 });
    if (!res.ok) throw new Error(`PubMed efetch ${res.status}`);
    const xml = await res.text();
    const papers = [];
    const artPat = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g;
    let m;
    while ((m = artPat.exec(xml)) !== null) {
        const art = m[1];
        const pmid     = (art.match(/<PMID[^>]*>(\d+)<\/PMID>/) || [])[1] || '';
        const title    = (art.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/) || [])[1]?.replace(/<[^>]+>/g, '').trim() || '';
        const absParts = [];
        const absRe = /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g;
        let am;
        while ((am = absRe.exec(art)) !== null) absParts.push(am[1].replace(/<[^>]+>/g, '').trim());
        const abstract = absParts.join(' ').trim();
        const journal  = (art.match(/<Title>([\s\S]*?)<\/Title>/) || [])[1]?.replace(/<[^>]+>/g, '').trim() || '';
        const year     = (art.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/) || [])[1] || '';
        if (pmid && (title || abstract)) papers.push({ pmid, title, abstract, journal, year, uid: `pmid:${pmid}`, source: journal, pubdate: year });
    }
    return papers;
}

async function pubmedSearchGuidelines(query) {
    const q = `(${query}) AND (practice guideline[pt] OR guideline[ti] OR systematic review[pt] OR meta-analysis[pt])`;
    const url = `${PUBMED_ESEARCH}?db=pubmed&term=${encodeURIComponent(q)}&retmax=6&sort=relevance&retmode=json`;
    const res = await safeFetch(url, { timeout: 15000 });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.esearchresult?.idlist || [];
}

// ─── JSON parser (lenient) ────────────────────────────────────────────────────

function parseJsonArray(raw) {
    if (!raw) return null;
    if (Array.isArray(raw)) return raw;
    const text = String(raw).trim();
    try { const r = JSON.parse(text); if (Array.isArray(r)) return r; for (const v of Object.values(r)) { if (Array.isArray(v) && v.length > 0) return v; } } catch { /* ignore */ }
    const mx = text.match(/\[[\s\S]*\]/);
    if (mx) { try { const r = JSON.parse(mx[0]); if (Array.isArray(r)) return r; } catch { /* ignore */ } }
    return null;
}

function parseJsonObject(raw) {
    if (!raw) return null;
    const text = String(raw).trim();
    try { const r = JSON.parse(text); if (r && typeof r === 'object' && !Array.isArray(r)) return r; } catch { /* ignore */ }
    const mx = text.match(/\{[\s\S]*\}/);
    if (mx) { try { const r = JSON.parse(mx[0]); if (r && typeof r === 'object') return r; } catch { /* ignore */ } }
    return null;
}

// ─── Step A: Seed curriculum_topics + topic_knowledge ────────────────────────

async function seedTopicKnowledge(aiService, flagship) {
    const topicName = flagship.topic;
    const pmids = (flagship.landmarkPmids || []).filter(Boolean);

    console.log(`\n  Seeding curriculum entry…`);

    if (!DRY_RUN) {
        await db.upsertCurriculumSeedTopic({
            displayName: topicName,
            suggestedQuery: (flagship.searchQueries || [])[0] || topicName,
            block: flagship.block || 'General Medicine',
            sortOrder: 2000,
            priority: 'medium',
            volatility: 'moderate',
            seedStatus: 'seeded',
        });
    } else {
        console.log(`    [DRY] Would upsert curriculum topic: ${topicName}`);
    }

    // Fetch abstracts for knowledge generation
    console.log(`  Fetching ${pmids.length} landmark PMIDs for knowledge base…`);
    let papers = [];
    if (pmids.length) {
        try { papers = await fetchAbstracts(pmids.slice(0, 5)); } catch (e) { console.warn(`    ⚠ PubMed fetch failed: ${e.message}`); }
    }

    if (papers.length < 1) {
        console.warn(`    ⚠ No abstracts — will seed minimal stub`);
        papers = [{ title: topicName, abstract: `Evidence-based management of ${topicName}.`, pmid: '', journal: 'Clinical Medicine', year: '2024', uid: null }];
    }

    // Build and call the knowledge prompt
    const prompt = buildTopicKnowledgePrompt(topicName, papers);
    let knowledge = null;

    if (!DRY_RUN) {
        try {
            const { callClaude } = aiService;
            const raw = await callClaude(prompt, CLAUDE_MODEL, { maxOutputTokens: 1200, temperature: 0.2 });
            knowledge = parseJsonObject(raw);
        } catch (e) {
            console.warn(`    ⚠ Claude knowledge extraction failed: ${e.message}`);
        }
    } else {
        console.log(`    [DRY] Would call Claude for topic knowledge`);
        return;
    }

    if (!knowledge?.mentorMessage) {
        console.warn(`    ⚠ Knowledge JSON invalid — using stub`);
        knowledge = {
            mentorMessage: `${topicName} is an important area of clinical medicine with evolving evidence.`,
            teachingPoints: [],
            seminalPapers: [],
            caseGenerationHooks: [],
            mcqAngles: [],
            verifiedAnchors: [],
        };
    }

    const sourceArticles = papers.map((p, i) => ({
        sourceIndex: i + 1,
        uid: p.uid || null,
        title: p.title,
        doi: null,
        pmid: p.pmid || null,
        source: p.journal || null,
        pubdate: p.year || null,
    }));

    await db.upsertTopicKnowledge(topicName, knowledge, sourceArticles, 'ai_generated', 0.75);
    console.log(`    ✓ topic_knowledge seeded (${(knowledge.teachingPoints || []).length} teaching points)`);
}

// ─── Step B: Flagship enrichment (same logic as enrichFlagshipKnowledge) ──────

function normalizeTopic(t) {
    return String(t || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();
}

async function extractClaimsFromPaper({ callClaude }, paper, topicName) {
    const prompt = `You are a medical education expert. Extract 3-4 specific, evidence-based clinical claims from this paper about "${topicName}".

Paper: ${paper.title}
Journal: ${paper.journal} (${paper.year})
PMID: ${paper.pmid}

Abstract:
${paper.abstract || '(no abstract)'}

Return a JSON array:
[{"claimKey":"short-kebab-key","claimText":"Specific clinical claim with evidence (≤200 chars)","evidenceQuote":"Quote from abstract (≤150 chars)"}]

Return ONLY the JSON array.`;

    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const text = await callClaude(prompt, CLAUDE_MODEL, { maxOutputTokens: 800, temperature: 0.2, jsonMode: attempt === 2 });
            const parsed = parseJsonArray(text);
            if (parsed?.length) return parsed.filter((c) => c.claimKey && c.claimText).slice(0, 4);
        } catch (e) {
            if (attempt === 2) console.warn(`      ⚠ claim extraction failed: ${e.message}`);
        }
        if (attempt < 2) await sleep(500);
    }
    return [];
}

async function generateGuidelineMCQs({ callClaude }, topicName, guidelines) {
    if (!guidelines.length) return [];
    const summary = guidelines.slice(0, 5).map((g, i) =>
        `${i + 1}. ${g.title || topicName}: ${(g.recommendations || []).slice(0, 2).map((r) => r.text || r).join('; ')}`
    ).join('\n');
    const prompt = `Generate 3 multiple-choice questions for "${topicName}" based on these guidelines:\n${summary}\n\nReturn JSON array:\n[{"question":"stem","options":{"A":"","B":"","C":"","D":""},"correct":"A","explanation":"why (≤200 chars)"}]\n\nReturn ONLY the JSON array.`;
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const text = await callClaude(prompt, CLAUDE_MODEL, { maxOutputTokens: 1200, temperature: 0.3, jsonMode: attempt === 2 });
            const parsed = parseJsonArray(text);
            if (parsed?.length) return parsed.filter((q) => q.question && q.options && q.correct).slice(0, 4);
        } catch (e) {
            if (attempt === 2) console.warn(`      ⚠ MCQ generation failed: ${e.message}`);
        }
        if (attempt < 2) await sleep(500);
    }
    return [];
}

async function extractGuidelineRecommendations({ callClaude }, papers, topicName) {
    if (!papers.length) return [];
    const text = papers.map((p) => `Title: ${p.title}\nAbstract: ${p.abstract}`).join('\n\n---\n\n');
    const prompt = `Extract key clinical practice recommendations for "${topicName}":\n\n${text.slice(0, 3000)}\n\nReturn JSON array:\n[{"recommendation":"Actionable recommendation","strength":"strong|moderate|weak","source":"paper title"}]\n\nReturn ONLY the JSON array.`;
    try {
        const raw = await callClaude(prompt, CLAUDE_MODEL, { maxOutputTokens: 600, temperature: 0.2 });
        return (parseJsonArray(raw) || []).filter((r) => r.recommendation).slice(0, 6);
    } catch { return []; }
}

async function enrichTopic(aiService, flagship) {
    const topicName = flagship.topic;
    const normalized = normalizeTopic(topicName);
    const pmids = (flagship.landmarkPmids || []).filter(Boolean);

    // Paper TOs
    let paperTOsCreated = 0;
    let totalClaimsWritten = 0;
    for (const pmid of pmids.slice(0, 3)) {
        const objectKey = `landmark-paper:${pmid}:${normalized.replace(/\s+/g, '-').slice(0, 40)}`;
        const existing = await db.getTeachingObjectByKey(objectKey).catch(() => null);
        if (existing) { paperTOsCreated++; console.log(`    [skip] PMID ${pmid} — TO exists`); continue; }

        let papers = [];
        try { papers = await fetchAbstracts([pmid]); } catch (e) { console.warn(`    ⚠ PubMed ${pmid}: ${e.message}`); continue; }
        if (!papers.length) { console.warn(`    ⚠ No abstract for ${pmid}`); continue; }
        const paper = papers[0];
        const claims = DRY_RUN ? [] : await extractClaimsFromPaper(aiService, paper, topicName);
        console.log(`    PMID ${pmid}: "${paper.title.slice(0, 55)}…" → ${claims.length} claims`);

        if (!DRY_RUN) {
            await db.upsertTeachingObject({
                objectKey, objectType: 'paper', articleUid: `pmid:${pmid}`,
                topic: topicName, normalizedTopic: normalized, title: paper.title,
                payload: { pmid, title: paper.title, journal: paper.journal, year: paper.year, abstract: paper.abstract?.slice(0, 800), claimAnchors: claims, generatedAt: new Date().toISOString(), generationSource: 'seedMediumFlagshipTopics' },
                provider: 'claude', model: CLAUDE_MODEL, confidence: 0.85,
            });
            paperTOsCreated++;
            totalClaimsWritten += claims.length;
        }
        await sleep(800);
    }

    // Guideline MCQ TO
    const guidelineObjectKey = `guideline-mcq:${topicName.replace(/\s+/g, '-').slice(0, 60)}`;
    const existingGuideline = await db.getTeachingObjectByKey(guidelineObjectKey).catch(() => null);
    if (!existingGuideline) {
        const coreQuery = topicName.split(':')[0].trim();
        let guidelinePmids = [];
        try { guidelinePmids = await pubmedSearchGuidelines(coreQuery); } catch { /* ignore */ }
        let guidelines = [];
        if (guidelinePmids.length && !DRY_RUN) {
            const gPapers = await fetchAbstracts(guidelinePmids.slice(0, 5)).catch(() => []);
            const recommendations = await extractGuidelineRecommendations(aiService, gPapers, topicName);
            for (const gp of gPapers.slice(0, 6)) {
                const recs = recommendations.filter((r) => !r.source || r.source.includes(gp.pmid) || gp.title.toLowerCase().includes((r.source || '').toLowerCase().slice(0, 20)));
                try {
                    await db.createGuideline({
                        topic: topicName, normalizedTopic: normalized, title: gp.title, year: Number(gp.year) || null,
                        source: gp.journal || 'PubMed', pmid: gp.pmid,
                        recommendations: recs.length ? recs : [{ text: `Evidence-based guidance for ${topicName}`, strength: 'moderate' }],
                        status: 'active',
                    });
                } catch { /* ignore dupes */ }
            }
            guidelines = await db.getGuidelinesByTopic(topicName, { limit: 10 }).catch(() => []);
        }
        const mcqs = DRY_RUN ? [] : await generateGuidelineMCQs(aiService, topicName, guidelines);
        console.log(`    Guideline MCQs: ${mcqs.length} (from ${guidelines.length} guidelines)`);
        if (!DRY_RUN && mcqs.length) {
            await db.upsertTeachingObject({
                objectKey: guidelineObjectKey, objectType: 'guideline_mcq',
                topic: topicName, normalizedTopic: normalized, title: `Evidence MCQs: ${topicName}`,
                payload: { mcqs, guidelineCount: guidelines.length, generatedAt: new Date().toISOString(), generationSource: 'seedMediumFlagshipTopics' },
                provider: 'claude', model: CLAUDE_MODEL, confidence: 0.80,
            });
        }
        await sleep(400);
    } else {
        console.log(`    [skip] guideline MCQ TO exists`);
    }

    console.log(`    ✓ Enrich done — paper_TOs=${paperTOsCreated} claims=${totalClaimsWritten}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║  Signal MD — Medium Flagship Topic Seeder        ║');
    console.log('╚═══════════════════════════════════════════════════╝');
    console.log(`  Dry run:     ${DRY_RUN}`);
    console.log(`  Skip seed:   ${SKIP_SEED}`);
    console.log(`  Skip enrich: ${SKIP_ENRICH}`);
    if (TOPIC_ARG) console.log(`  Filter:      ${TOPIC_ARG}`);

    if (!serverConfig.keys?.anthropic) { console.error('❌  ANTHROPIC_API_KEY not set.'); process.exit(1); }

    await db.connect();
    await db.runMigrations();

    const cfg = loadFlagshipConfig();
    const mediumTopics = cfg.topics.filter((t) => t.priority === 'medium');

    const targets = TOPIC_ARG
        ? mediumTopics.filter((t) => t.topic.toLowerCase().includes(TOPIC_ARG.toLowerCase()))
        : mediumTopics;

    if (!targets.length) { console.log('No matching topics.'); await db.close(); return; }
    console.log(`\nTopics to process: ${targets.length}`);

    const { safeFetch: fetchImpl } = require('../utils/fetch');
    const aiService = createAiService({ serverConfig, fetchImpl });

    let seeded = 0, enriched = 0, errors = 0;

    for (const flagship of targets) {
        console.log(`\n[${flagship.topic}]`);

        if (!SKIP_SEED) {
            try {
                await seedTopicKnowledge(aiService, flagship);
                seeded++;
            } catch (e) {
                console.error(`  ✗ Seed failed: ${e.message}`);
                errors++;
                await sleep(1000);
                continue;
            }
            await sleep(600);
        }

        if (!SKIP_ENRICH) {
            try {
                await enrichTopic(aiService, flagship);
                enriched++;
            } catch (e) {
                console.error(`  ✗ Enrich failed: ${e.message}`);
                errors++;
            }
        }

        await sleep(1200);
    }

    console.log('\n' + '='.repeat(60));
    console.log(`Done — seeded: ${seeded}, enriched: ${enriched}, errors: ${errors}`);
    await db.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
