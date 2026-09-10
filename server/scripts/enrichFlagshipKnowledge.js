/**
 * Enrich flagship topics from needs_enrichment / search_ready / learner_ready → flagship.
 *
 * For each topic below flagship tier:
 *   1. For each landmark PMID: fetch abstract → use Claude to extract 3-4 key claims
 *      → upsert as a 'paper' teaching_object with claimAnchors (writes teaching_object_claims)
 *   2. Run guideline enrichment (PubMed guideline search + AI MCQ generation)
 *      → writes topic_guidelines + 1 guideline_mcq teaching_object
 *
 * Result per topic: ~3 paper TOs + 1 MCQ TO = 4 teachingObjects, 9-12 claims, ≥1 guideline, ≥1 MCQ
 * → crosses flagship tier (needs: TOs≥3, claims≥8, guidelines≥1, mcqs≥1, src≥3)
 *
 * Usage:
 *   node server/scripts/enrichFlagshipKnowledge.js [--dry-run] [--topic "Name"] [--force]
 *   node server/scripts/enrichFlagshipKnowledge.js --limit 5
 *   node server/scripts/enrichFlagshipKnowledge.js --priority=high --limit=10
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
const { discoverGuidelinesForTopic } = require('../services/guidelineService');
const { isIssuingBodyValue } = require('../utils/guidelineAttribution');

const CLAUDE_MODEL = PINNED_MODELS.claude;

// ─── Args ─────────────────────────────────────────────────────────────────────

function argValue(flag) {
    const argv = process.argv.slice(2);
    const hit = argv.find((a) => a.startsWith(`${flag}=`));
    if (hit) return hit.slice(flag.length + 1);
    const idx = argv.indexOf(flag);
    if (idx >= 0 && argv[idx + 1] && !argv[idx + 1].startsWith('--')) return argv[idx + 1];
    return null;
}

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE   = process.argv.includes('--force');
const TOPIC_FILTER = argValue('--topic');
const QUERY_OVERRIDE = argValue('--query');
const PRIORITY = (argValue('--priority') || '').toLowerCase().trim();
const LIMIT = Number(argValue('--limit') || 50) || 50;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function normalizeTopic(t) {
    return String(t || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();
}

// ─── PubMed helpers ───────────────────────────────────────────────────────────

const PUBMED_EFETCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';

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
        const pmid   = (art.match(/<PMID[^>]*>(\d+)<\/PMID>/) || [])[1] || '';
        const title  = (art.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/) || [])[1]?.replace(/<[^>]+>/g, '').trim() || '';
        const absParts = [];
        const absRe = /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g;
        let am;
        while ((am = absRe.exec(art)) !== null) absParts.push(am[1].replace(/<[^>]+>/g, '').trim());
        const abstract = absParts.join(' ').trim();
        const journal  = (art.match(/<Title>([\s\S]*?)<\/Title>/) || [])[1]?.replace(/<[^>]+>/g, '').trim() || '';
        const year     = (art.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/) || [])[1] || '';
        if (pmid && (title || abstract)) papers.push({ pmid, title, abstract, journal, year });
    }
    return papers;
}

// ─── AI helpers ───────────────────────────────────────────────────────────────

async function extractClaimsFromPaper({ callClaude }, paper, topicName) {
    const prompt = `You are a medical education expert. Extract the 3-4 most important, specific, evidence-based clinical claims from this landmark paper about "${topicName}".

Paper: ${paper.title}
Journal: ${paper.journal} (${paper.year})
PMID: ${paper.pmid}

Abstract:
${paper.abstract || '(no abstract available)'}

Return a JSON array of claim objects. Each claim must be:
- Specific and quantitative where possible (include numbers, percentages, NNT, HR, p-values)
- Grounded in the paper's actual findings (not generic knowledge)
- Clinically actionable

Format:
[
  {
    "claimKey": "short-kebab-claim-key-max-60-chars",
    "claimText": "Specific clinical claim with evidence (1-2 sentences, ≤200 chars)",
    "evidenceQuote": "Relevant quote or stat from abstract (≤150 chars)"
  }
]

Return ONLY the JSON array. No markdown fences.`;

    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const text = await callClaude(prompt, CLAUDE_MODEL, {
                maxOutputTokens: 800,
                temperature: 0.2,
                jsonMode: attempt === 2,
            });
            const parsed = parseJsonArray(text);
            if (parsed && parsed.length) {
                return parsed.filter((c) => c.claimKey && c.claimText).slice(0, 4);
            }
        } catch (e) {
            if (attempt === 2) console.warn(`    ⚠ claim extraction failed: ${e.message}`);
        }
        if (attempt < 2) await sleep(500);
    }
    return [];
}

async function generateGuidelineMCQs({ callClaude }, topicName, guidelines) {
    if (!guidelines.length) return [];
    const guidelineSummary = guidelines.slice(0, 5).map((g, i) =>
        `${i + 1}. ${g.sourceBody} (${g.sourceYear || ''}, ${g.sourceUrl || ''}): ${g.recommendationText}`
    ).join('\n');

    const prompt = `You are a medical education expert. Generate 3 high-quality multiple-choice questions based on these guidelines for "${topicName}".

Guidelines:
${guidelineSummary}

Return a JSON array of MCQ objects:
[
  {
    "question": "Clinical question stem (1-2 sentences)",
    "options": ["A: option", "B: option", "C: option", "D: option"],
    "correctAnswer": "A",
    "explanation": "Why correct (≤200 chars, cite the guideline)"
  }
]

Return ONLY the JSON array.`;

    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const text = await callClaude(prompt, CLAUDE_MODEL, { maxOutputTokens: 1200, temperature: 0.3, jsonMode: attempt === 2 });
            const parsed = parseJsonArray(text);
            if (parsed && parsed.length) {
                return parsed.filter((q) =>
                    typeof q.question === 'string' && q.question.trim() &&
                    Array.isArray(q.options) && q.options.length === 4 &&
                    q.options.every((opt, i) => typeof opt === 'string' && opt.startsWith(`${'ABCD'[i]}:`) && opt.slice(2).trim()) &&
                    /^[A-D]$/.test(q.correctAnswer || '') && typeof q.explanation === 'string' && q.explanation.trim()
                ).slice(0, 4);
            }
        } catch (e) {
            if (attempt === 2) console.warn(`    ⚠ MCQ generation failed: ${e.message}`);
        }
        if (attempt < 2) await sleep(500);
    }
    return [];
}

// ─── JSON parser (lenient) ────────────────────────────────────────────────────

function parseJsonArray(raw) {
    if (!raw) return null;
    if (Array.isArray(raw)) return raw;
    const text = String(raw).trim();
    try {
        const r = JSON.parse(text);
        if (Array.isArray(r)) return r;
        for (const v of Object.values(r)) { if (Array.isArray(v) && v.length > 0) return v; }
    } catch { /* ignore */ }
    const m = text.match(/\[[\s\S]*\]/);
    if (m) {
        try { const r = JSON.parse(m[0]); if (Array.isArray(r)) return r; } catch { /* ignore */ }
    }
    return null;
}

// ─── Main enrichment logic per topic ─────────────────────────────────────────

async function enrichTopic(aiService, flagship, currentTier) {
    const topicName = flagship.topic;
    const normalized = normalizeTopic(topicName);
    const pmids = (flagship.landmarkPmids || []).filter(Boolean);

    console.log(`\n[${currentTier}] ${topicName}`);

    // ── Step 1: Landmark paper TOs with claim extraction ──────────────────────
    let paperTOsCreated = 0;
    let totalClaimsWritten = 0;

    for (const pmid of pmids.slice(0, 3)) {
        const objectKey = `landmark-paper:${pmid}:${normalized.replace(/\s+/g, '-').slice(0, 40)}`;

        if (!FORCE) {
            const existing = await db.getTeachingObjectByKey(objectKey).catch(() => null);
            if (existing) {
                console.log(`  [skip] PMID ${pmid} — paper TO already exists`);
                paperTOsCreated++;
                continue;
            }
        }

        console.log(`  Fetching PMID ${pmid}...`);
        let papers = [];
        try {
            papers = await fetchAbstracts([pmid]);
        } catch (e) {
            console.warn(`  ⚠ PubMed fetch failed for ${pmid}: ${e.message}`);
            continue;
        }

        if (!papers.length) { console.warn(`  ⚠ No abstract for PMID ${pmid}`); continue; }
        const paper = papers[0];

        const claims = DRY_RUN ? [] : await extractClaimsFromPaper(aiService, paper, topicName);
        console.log(`  PMID ${pmid}: "${paper.title.slice(0, 60)}…" → ${claims.length} claims`);

        if (!DRY_RUN) {
            await db.upsertTeachingObject({
                objectKey,
                objectType: 'paper',
                articleUid: `pmid:${pmid}`,
                topic: topicName,
                normalizedTopic: normalized,
                title: paper.title,
                payload: {
                    pmid,
                    title: paper.title,
                    journal: paper.journal,
                    year: paper.year,
                    abstract: paper.abstract?.slice(0, 800),
                    claimAnchors: claims,
                    generatedAt: new Date().toISOString(),
                    generationSource: 'enrichFlagshipKnowledge',
                },
                provider: 'claude',
                model: CLAUDE_MODEL,
                confidence: 0.85,
            });
            paperTOsCreated++;
            totalClaimsWritten += claims.length;
        } else {
            console.log(`  [DRY] Would write paper TO for PMID ${pmid} with ${claims.length} claims`);
        }

        await sleep(800);
    }

    // ── Step 2: Guideline enrichment (guidelines + MCQ teaching object) ────────
    const guidelineObjectKey = `guideline-mcq:${topicName.replace(/\s+/g, '-').slice(0, 60)}`;
    const existingGuideline = await db.getTeachingObjectByKey(guidelineObjectKey).catch(() => null);
    const existingGuidelineRows = (await db.getGuidelinesByTopic(topicName, { limit: 100 }))
        .filter((g) => isIssuingBodyValue(g.sourceBody) && g.recommendationText);

    if (!FORCE && existingGuideline && existingGuidelineRows.length >= 1) {
        console.log(`  [skip] guideline MCQ TO already exists (${existingGuidelineRows.length} guidelines)`);
    } else {
        let guidelines = existingGuidelineRows;
        if (!DRY_RUN && !guidelines.length) {
            await discoverGuidelinesForTopic(topicName, {
                db, serverConfig, aiService, searchQuery: QUERY_OVERRIDE || topicName.split(':')[0].trim(),
            });
            guidelines = (await db.getGuidelinesByTopic(topicName, { limit: 100 }))
                .filter((g) => isIssuingBodyValue(g.sourceBody) && g.recommendationText);
        }

        await sleep(400);

        // Generate MCQs from guidelines
        const mcqs = DRY_RUN ? [] : await generateGuidelineMCQs(aiService, topicName, guidelines);
        console.log(`  Guideline MCQs: ${mcqs.length} (from ${guidelines.length} guidelines)`);

        if (!DRY_RUN && mcqs.length) {
            await db.upsertTeachingObject({
                objectKey: guidelineObjectKey,
                objectType: 'guideline_mcq',
                topic: topicName,
                normalizedTopic: normalized,
                title: `Evidence MCQs: ${topicName}`,
                payload: {
                    mcqs,
                    guidelineCount: guidelines.length,
                    generatedAt: new Date().toISOString(),
                    generationSource: 'enrichFlagshipKnowledge',
                },
                provider: 'claude',
                model: CLAUDE_MODEL,
                confidence: 0.80,
            });
        } else if (DRY_RUN) {
            console.log(`  [DRY] Would write guideline MCQ TO with ${mcqs.length} MCQs`);
        }

        await sleep(400);
    }

    console.log(`  ✓ Done — paper_TOs=${paperTOsCreated} claims_written=${totalClaimsWritten}`);
    return { paperTOsCreated, totalClaimsWritten };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║  Signal MD — Flagship Knowledge Enrichment   ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log(`  Dry run:  ${DRY_RUN}`);
    console.log(`  Force:    ${FORCE}`);
    console.log(`  Limit:    ${LIMIT}`);
    if (TOPIC_FILTER) console.log(`  Filter:   ${TOPIC_FILTER}`);

    if (!serverConfig.keys?.anthropic) {
        console.error('❌  ANTHROPIC_API_KEY not set.');
        process.exit(1);
    }

    await db.connect();
    await db.runMigrations();

    const cfg = loadFlagshipConfig();
    const result = await collectTopicReadiness(db, { limit: 2000 });
    const topicsByName = new Map(
        (result.topics || []).map((r) => [r.displayName?.toLowerCase().trim(), r])
    );

    const { safeFetch: fetchImpl } = require('../utils/fetch');
    const aiService = createAiService({ serverConfig, fetchImpl });

    let flagships = cfg.topics.filter((t) => t.priority === 'high' || t.priority === 'medium');
    if (PRIORITY) {
        flagships = cfg.topics.filter((t) => String(t.priority || '').toLowerCase() === PRIORITY);
    }
    if (TOPIC_FILTER) {
        const f = TOPIC_FILTER.toLowerCase();
        flagships = flagships.filter((t) => t.topic.toLowerCase().includes(f));
    }

    // Filter to below-flagship topics (skip already-flagship unless --force)
    const targets = flagships.filter((t) => {
        const row = topicsByName.get(t.topic.toLowerCase().trim());
        const tier = row?.tier || 'needs_enrichment';
        if (!FORCE && tier === 'flagship') return false;
        return true;
    }).slice(0, LIMIT);

    console.log(`\nTopics to enrich: ${targets.length}`);

    let enriched = 0;
    let errors = 0;

    for (const flagship of targets) {
        const row = topicsByName.get(flagship.topic.toLowerCase().trim());
        const tier = row?.tier || 'needs_enrichment';
        try {
            await enrichTopic(aiService, flagship, tier);
            enriched++;
        } catch (e) {
            console.error(`  ✗ ${flagship.topic}: ${e.message}`);
            errors++;
        }
        await sleep(1000);
    }

    console.log('\n' + '='.repeat(60));
    console.log(`Enrichment complete: ${enriched} succeeded, ${errors} errors`);
    await db.close();
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { generateGuidelineMCQs };
