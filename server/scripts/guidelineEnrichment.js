'use strict';

/**
 * guidelineEnrichment.js  (Option B — post-seed guideline enrichment)
 * =====================================================================
 * For each already-seeded curriculum topic:
 *   1. Searches PubMed for practice guidelines (primary)
 *      → Falls back to systematic reviews / meta-analyses / consensus statements
 *   2. Uses Gemini to extract structured recommendations from those papers
 *   3. Stores each recommendation as a topic_guidelines row
 *   4. Generates 4 guideline/evidence-anchored MCQs (guideline_mcq teaching objects)
 *
 * Run AFTER importAndSeedTopics.js.
 * Re-running is safe — topics that already have MCQs are auto-skipped (use --force to override).
 *
 * Usage:
 *   node server/scripts/guidelineEnrichment.js [options]
 *
 * Options:
 *   --limit <n>         Max topics to enrich (default: 100)
 *   --concurrency <n>   Parallel jobs (default: 1)
 *   --topic <name>      Enrich a single specific topic (partial match)
 *   --dry-run           Fetch papers but skip DB writes and MCQ generation
 *   --force             Re-enrich topics that already have MCQs
 *   --mcq-only          Skip paper fetch, only generate MCQs from existing DB guidelines
 */

const { loadEnv, serverConfig } = require('../../config');
loadEnv();

const logger = require('../config/logger');
const db = require('../../database');
const cache = require('../../cache');
const { safeFetch } = require('../utils/fetch');
const { createAiService } = require('../services/aiService');
const { parseJsonArrayBlock, repairJsonCandidate } = require('../utils/parseJson');

// ─── JSON parsing ─────────────────────────────────────────────────────────────

/**
 * Recover a truncated JSON array by finding all complete {...} objects within it.
 * Handles the case where Gemini hits its token limit mid-array (no closing ]).
 */
function recoverTruncatedArray(text) {
    const start = text.indexOf('[');
    if (start === -1) return null;
    const content = text.slice(start + 1); // content after the opening [

    const objects = [];
    let depth = 0;
    let objStart = -1;
    let inString = false;
    let escape = false;

    for (let i = 0; i < content.length; i++) {
        const ch = content[i];
        if (escape)           { escape = false; continue; }
        if (ch === '\\' && inString) { escape = true; continue; }
        if (ch === '"')       { inString = !inString; continue; }
        if (inString)         continue;

        if (ch === '{') {
            if (depth === 0) objStart = i;
            depth++;
        } else if (ch === '}') {
            depth--;
            if (depth === 0 && objStart !== -1) {
                const objStr = content.slice(objStart, i + 1);
                try {
                    objects.push(JSON.parse(objStr));
                } catch { /* skip malformed object */ }
                objStart = -1;
            }
        }
    }
    return objects.length > 0 ? objects : null;
}

/**
 * Lenient JSON array extractor.
 * Handles: plain array, wrapped object, markdown fences, trailing commas, truncated output.
 */
function parseJsonArray(raw) {
    if (!raw) return null;
    if (Array.isArray(raw)) return raw;
    const text = String(raw).trim();

    // 1. Strict parse
    try {
        const r = JSON.parse(text);
        if (Array.isArray(r)) return r;
        if (r && typeof r === 'object') {
            for (const v of Object.values(r)) {
                if (Array.isArray(v) && v.length > 0) return v;
            }
        }
    } catch {
        // ignore parse errors
    }

    // 2. Extract first [...] block (handles markdown fences, trailing commas)
    const block = parseJsonArrayBlock(text);
    if (block && block.length > 0) return block;

    // 3. Repair and retry
    try {
        const repaired = repairJsonCandidate(text);
        if (repaired) {
            const r = JSON.parse(repaired);
            if (Array.isArray(r)) return r;
            if (r && typeof r === 'object') {
                for (const v of Object.values(r)) {
                    if (Array.isArray(v) && v.length > 0) return v;
                }
            }
        }
    } catch {
        // ignore parse errors
    }

    // 4. Recover truncated array — finds all complete {...} objects even without closing ]
    const recovered = recoverTruncatedArray(text);
    if (recovered && recovered.length > 0) return recovered;

    return null;
}

// ─── Configuration ────────────────────────────────────────────────────────────

const PUBMED_ESEARCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const PUBMED_EFETCH  = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
const PUBMED_MAX_PAPERS  = 8;   // papers per search
const GUIDELINE_MCQ_COUNT = 4;  // MCQs per topic
const GUIDELINE_OBJECT_KEY = (n) => `guideline-mcq:${n.replace(/\s+/g, '-')}`;

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = { limit: 100, concurrency: 1, topic: null, dryRun: false, force: false, mcqOnly: false };
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--limit'       && args[i + 1]) opts.limit       = parseInt(args[++i], 10);
        if (args[i] === '--concurrency' && args[i + 1]) opts.concurrency = parseInt(args[++i], 10);
        if (args[i] === '--topic'       && args[i + 1]) opts.topic       = args[++i];
        if (args[i] === '--dry-run')  opts.dryRun  = true;
        if (args[i] === '--force')    opts.force   = true;
        if (args[i] === '--mcq-only') opts.mcqOnly = true;
    }
    return opts;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function normalizeTopic(t) {
    return String(t || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Extract core clinical search term from a verbose topic display name.
 * Strips subtitle (after colon), conjunctions (vs, and, or), trailing punctuation.
 * Keeps enough for a meaningful but not over-specific PubMed query.
 *
 * Examples:
 *   "Mechanical thrombectomy: extended time windows" → "Mechanical thrombectomy"
 *   "Focal vs generalised epilepsy syndromes: anticonvulsant choice" → "focal generalised epilepsy"
 *   "Charcot-Marie-Tooth disease: CMT1A duplication" → "Charcot-Marie-Tooth disease"
 */
// Stop-words to strip from search terms
const STOP_WORDS = new Set(['vs', 'versus', 'and', 'or', 'the', 'for', 'with', 'without',
    'of', 'in', 'to', 'a', 'an', 'its', 'their', 'from', 'by', 'as', 'on', 'at']);

/**
 * Build a compact PubMed search term from a verbose topic name.
 * Drops subtitle (after colon), removes stop words, keeps clinical nouns.
 *
 * "Focal vs generalised epilepsy syndromes: anticonvulsant choice" → "focal generalised epilepsy syndromes"
 * "Mechanical thrombectomy: extended time windows" → "Mechanical thrombectomy"
 * "Charcot-Marie-Tooth disease: CMT1A duplication" → "Charcot-Marie-Tooth disease"
 */
function extractCoreSearchTerm(displayName) {
    // 1. Drop subtitle after colon
    let core = displayName.split(':')[0].trim();
    // 2. Remove parenthetical abbreviation at end e.g. "(TIA)", "(CVST)"
    core = core.replace(/\s*\([A-Z0-9-]{2,8}\)\s*$/, '').trim();
    // 3. Replace separators (vs, /) with space
    core = core.replace(/\bvs\.?\b/gi, ' ').replace(/\//g, ' ');
    // 4. Remove remaining stop words
    core = core.split(/\s+/)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()))
        .join(' ').trim();
    // 5. Cap at 5 content words to avoid over-specification
    const words = core.split(/\s+/);
    if (words.length > 5) core = words.slice(0, 5).join(' ');
    return core;
}

// ─── PubMed helpers ───────────────────────────────────────────────────────────

async function pubmedSearch(query, retmax = PUBMED_MAX_PAPERS) {
    const url = `${PUBMED_ESEARCH}?db=pubmed&term=${encodeURIComponent(query)}&retmax=${retmax}&sort=relevance&retmode=json&usehistory=n`;
    const res = await safeFetch(url, { timeout: 15000 });
    if (!res.ok) throw new Error(`PubMed esearch ${res.status}`);
    const data = await res.json();
    return data?.esearchresult?.idlist || [];
}

async function pubmedFetchAbstracts(ids) {
    if (!ids.length) return [];
    const url = `${PUBMED_EFETCH}?db=pubmed&id=${ids.join(',')}&retmode=xml&rettype=abstract`;
    const res = await safeFetch(url, { timeout: 20000 });
    if (!res.ok) throw new Error(`PubMed efetch ${res.status}`);
    const xml = await res.text();

    const papers = [];
    const artPat = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g;
    let m;
    while ((m = artPat.exec(xml)) !== null) {
        const art = m[1];
        const pmid    = (art.match(/<PMID[^>]*>(\d+)<\/PMID>/)           || [])[1] || '';
        const title   = (art.match(/<ArticleTitle>([^<]+)<\/ArticleTitle>/) || [])[1] || '';
        const year    = (art.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/) || [])[1] || '';
        const journal = (art.match(/<Title>([^<]+)<\/Title>/)             || [])[1] || '';
        const abParts = [];
        const abPat = /<AbstractText[^>]*>([^<]+)<\/AbstractText>/g;
        let ab;
        while ((ab = abPat.exec(art)) !== null) abParts.push(ab[1]);
        const abstract = abParts.join(' ').trim();
        if (title && abstract) papers.push({ pmid, title, abstract, year, journal });
    }
    return papers;
}

/**
 * Two-tier PubMed search:
 *   Tier 1: Practice Guidelines / Consensus (indexed pt filter)
 *   Tier 2: Systematic Reviews + Meta-Analyses + consensus/position statements
 *   Tier 3: Narrative/scoping reviews — catch-all for rare/niche topics
 * Returns { papers, sourceType }
 */
async function searchPubMedEvidence(topicName) {
    const core = extractCoreSearchTerm(topicName);

    // Helper: keyword AND string from core term (drop short words, max 4 keywords)
    const coreWords = core.replace(/[()]/g, '').split(/\s+/)
        .filter((w) => w.length > 3)
        .slice(0, 4)
        .join(' AND ');

    // ── Tier 1: Practice guidelines / consensus conferences ──
    const q1 = `("${core}"[Title/Abstract]) AND (Practice Guideline[pt] OR Guideline[pt] OR Consensus Development Conference[pt])`;
    console.log(`    🔍  [T1] "${core}" — guidelines`);
    const ids1 = await pubmedSearch(q1);
    if (ids1.length) {
        const papers = await pubmedFetchAbstracts(ids1);
        if (papers.length) return { papers, sourceType: 'practice_guideline' };
    }

    await sleep(500);

    // ── Tier 2: Systematic reviews + meta-analyses + consensus/position statements ──
    const q2 = `(${coreWords}[Title]) AND (Systematic Review[pt] OR Meta-Analysis[pt] OR "consensus statement"[Title] OR "position statement"[Title] OR "clinical practice"[Title])`;
    console.log(`    🔍  [T2] "${coreWords}" — systematic reviews / meta-analyses`);
    const ids2 = await pubmedSearch(q2);
    if (ids2.length) {
        const papers = await pubmedFetchAbstracts(ids2);
        if (papers.length) return { papers, sourceType: 'systematic_review' };
    }

    await sleep(500);

    // ── Tier 3: Narrative reviews + scoping reviews (last resort for niche topics) ──
    const q3 = `(${coreWords}[Title]) AND (Review[pt]) AND ("2015"[PDAT]:"3000"[PDAT])`;
    console.log(`    🔍  [T3] "${coreWords}" — review articles (2015+)`);
    const ids3 = await pubmedSearch(q3);
    if (ids3.length) {
        const papers = await pubmedFetchAbstracts(ids3);
        if (papers.length) return { papers, sourceType: 'review_article' };
    }

    return { papers: [], sourceType: null };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalise a recommendation object from any extraction attempt into the full schema.
 * Attempt 2 returns minimal {t, s} — map that to {recommendationText, sourceBody}.
 */
function normaliseExtracted(rec) {
    if (!rec || typeof rec !== 'object') return {};
    return {
        recommendationText: rec.recommendationText || rec.t || rec.text || rec.recommendation || '',
        recommendationStrength: rec.recommendationStrength || rec.strength || null,
        recommendationCertainty: rec.recommendationCertainty || rec.certainty || null,
        sourceBody: rec.sourceBody || rec.s || rec.source || null,
        sourceYear: rec.sourceYear || rec.year ? parseInt(rec.sourceYear || rec.year, 10) || null : null,
        population: rec.population || null,
        intervention: rec.intervention || null,
        cautions: rec.cautions || null,
    };
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

const SOURCE_LABELS = {
    practice_guideline:  'clinical practice guidelines',
    systematic_review:   'systematic reviews and meta-analyses',
    review_article:      'recent review articles',
    abstract_grounded:   'paper abstracts (structured extraction unavailable)',
};

/**
 * Attempt 1 — full schema, free-text mode (best quality, prose-risk).
 */
function buildExtractionPrompt(topic, papers, sourceType) {
    const sourceLabel = SOURCE_LABELS[sourceType] || 'clinical literature';
    const paperBlocks = papers.slice(0, 5).map((p, i) =>
        `[${i + 1}] ${p.journal} ${p.year}\n${p.title}\n${p.abstract.slice(0, 600)}`
    ).join('\n\n');

    return `You are a clinical knowledge extractor. Read the following ${sourceLabel} about "${topic}" and extract specific clinical recommendations.

PAPERS:
${paperBlocks}

EXAMPLE OUTPUT FORMAT:
[
  {"recommendationText":"Patients with X should receive Y within Z hours.","recommendationStrength":"Strong","sourceBody":"AHA/ASA 2022","sourceYear":2022,"population":"Adults with X","intervention":"Y within Z hours"},
  {"recommendationText":"Drug A is preferred over Drug B due to lower risk of W.","recommendationStrength":"Moderate","sourceBody":"NICE 2021","sourceYear":2021,"population":"Adults on anticoagulation","intervention":"Drug A"}
]

Extract 3-5 recommendations covering thresholds, drug choices, timing targets, and key contraindications. Return ONLY the JSON array starting with [ — no preamble, no explanation.`;
}

/**
 * Attempt 2 — minimal 2-field schema with jsonMode, reduces truncation risk.
 * Used as retry when attempt 1 returns prose.
 */
function buildExtractionPromptSimple(topic, papers) {
    const paperBlocks = papers.slice(0, 4).map((p, i) =>
        `[${i + 1}] ${p.title} (${p.journal} ${p.year}): ${p.abstract.slice(0, 400)}`
    ).join('\n');

    return `Extract up to 4 clinical recommendations from these papers about "${topic}".

${paperBlocks}

Return a JSON array. Each item: {"t":"recommendation text","s":"Source name year"}.
Array only, nothing else.`;
}

/**
 * Scenario A fallback — papers found but structured extraction failed.
 * Generate MCQs directly from the raw paper abstracts — grounded in retrieved text,
 * no training-data hallucination.
 */
function buildAbstractMcqPrompt(topic, papers) {
    const paperBlocks = papers.slice(0, 4).map((p, i) =>
        `[${i + 1}] ${p.title} (${p.journal} ${p.year})\n${p.abstract.slice(0, 700)}`
    ).join('\n\n');

    return `You are a clinical educator writing postgraduate MCQs. Read the following papers about "${topic}" and write ${GUIDELINE_MCQ_COUNT} MCQs grounded in what these papers actually state.

PAPERS:
${paperBlocks}

Requirements:
- Every MCQ must be directly grounded in something stated in the papers above
- Clinical vignette with patient demographics and presentation
- 4 options (A-D), exactly one correct
- Explanation must cite what the paper says (mention the journal and year)
- Do NOT invent thresholds or recommendations not present in the papers above

EXAMPLE:
[{"question":"A 55-year-old woman...","options":["A: ...","B: ...","C: ...","D: ..."],"correctAnswer":"A","explanation":"According to [Journal Year], ...","guidelineRef":"Journal Year","questionType":"clinical_application","difficulty":"medium"}]

Return ONLY the JSON array starting with [.`;
}

function buildMcqPrompt(topic, guidelines, sourceType) {
    const sourceLabel = SOURCE_LABELS[sourceType] || 'clinical evidence';
    const guidelineBlocks = guidelines.slice(0, 6).map((g, i) => {
        const body = g.source_body || g.sourceBody || 'Unknown source';
        const text = g.recommendation_text || g.recommendationText || '';
        const strength = g.recommendation_strength || g.recommendationStrength || '';
        return `[${i + 1}] ${body}: ${text}${strength ? ` (${strength})` : ''}`;
    }).join('\n');

    return `Write ${GUIDELINE_MCQ_COUNT} high-yield MCQs for postgraduate medical exams on "${topic}".

Ground each MCQ in the following ${sourceLabel}:
${guidelineBlocks}

Requirements:
- Clinical vignette with patient demographics and presentation
- 4 options (A-D), exactly one correct
- Explanation citing the specific evidence (2-3 sentences)
- Mix: at least one threshold/number, one management decision, one pitfall

EXAMPLE:
[{"question":"A 55-year-old woman...","options":["A: ...","B: ...","C: ...","D: ..."],"correctAnswer":"A","explanation":"According to [source]...","guidelineRef":"source year","questionType":"guideline","difficulty":"medium"}]

Return ONLY the JSON array starting with [.`;
}

// ─── Core enrichment for one topic ───────────────────────────────────────────

async function enrichTopic(topic, ai, opts) {
    const topicName = topic.displayName;
    const normalized = normalizeTopic(topicName);
    const guidelineKey = GUIDELINE_OBJECT_KEY(normalized);

    // Auto-skip already-enriched topics (unless --force)
    if (!opts.force && !opts.mcqOnly) {
        const existing = await db.getTeachingObjectByKey(guidelineKey).catch(() => null);
        if (existing?.payload?.mcqs?.length > 0) {
            console.log(`  ⏭  ${topicName}: already enriched (${existing.payload.mcqs.length} MCQs)`);
            return { status: 'skipped' };
        }
    }

    let guidelines = [];
    let sourceType = 'practice_guideline';
    let sourcePapers = [];   // papers fetched from PubMed — stored in payload
    let fetchedPapers = [];  // kept for abstract-grounded MCQ fallback (Scenario A)

    // ── Step 1: Search PubMed (3-tier) ──
    if (!opts.mcqOnly) {
        let papers = [];
        try {
            const result = await searchPubMedEvidence(topicName);
            papers = result.papers;
            fetchedPapers = papers;   // keep for Scenario A fallback
            sourceType = result.sourceType || 'practice_guideline';
            sourcePapers = papers.map((p) => ({
                pmid: p.pmid,
                title: p.title,
                journal: p.journal,
                year: p.year,
                pubmedUrl: `https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/`,
                sourceType,
            }));
            const tier = SOURCE_LABELS[sourceType] || sourceType;
            console.log(`  📄  ${topicName}: found ${papers.length} paper(s) [${tier}]`);
        } catch (err) {
            console.warn(`  ⚠   ${topicName}: PubMed search failed — ${err.message}`);
            return { status: 'failed', reason: 'pubmed_error' };
        }

        if (!papers.length) {
            console.log(`  ℹ   ${topicName}: no papers found on PubMed (either tier) — skipping`);
            return { status: 'no_evidence' };
        }

        // ── Step 2: Extract recommendations with Gemini (3-attempt strategy) ──
        if (!opts.dryRun) {
            let extracted = [];

            // Attempt 1 — full schema, free-text (best quality)
            try {
                const raw1 = await ai.callGemini(
                    buildExtractionPrompt(topicName, papers, sourceType),
                    undefined,
                    { temperature: 0.2, jsonMode: false, maxOutputTokens: 3000 }
                );
                extracted = parseJsonArray(raw1) || [];
                // Normalise minimal-schema items from any attempt
                extracted = extracted.map(normaliseExtracted);
                if (extracted.length) console.log(`  💡  ${topicName}: extracted ${extracted.length} rec(s) [attempt 1]`);
            } catch { /* fall through */ }

            // Attempt 2 — minimal 2-field schema with jsonMode (avoids prose, avoids truncation)
            if (!extracted.length) {
                await sleep(500);
                try {
                    const raw2 = await ai.callGemini(
                        buildExtractionPromptSimple(topicName, papers),
                        undefined,
                        { temperature: 0.1, jsonMode: true, maxOutputTokens: 1500 }
                    );
                    const parsed2 = parseJsonArray(raw2) || [];
                    extracted = parsed2.map(normaliseExtracted).filter((r) => r.recommendationText);
                    if (extracted.length) console.log(`  💡  ${topicName}: extracted ${extracted.length} rec(s) [attempt 2 — simple schema]`);
                } catch { /* fall through */ }
            }

            if (!extracted.length) {
                console.log(`  ℹ   ${topicName}: no recommendations extractable — will generate MCQs from raw abstracts`);
                // Fall through — Scenario A: abstract-grounded MCQs using fetchedPapers
            }

            // ── Step 3: Store extracted recommendations ──
            const firstPmid = papers[0]?.pmid;
            for (const rec of extracted) {
                if (!rec.recommendationText) continue;
                try {
                    await db.createGuideline({
                        topic: topicName,
                        sourceBody: rec.sourceBody || `AI-extracted from PubMed ${sourceType}`,
                        sourceRegion: 'international',
                        sourceYear: rec.sourceYear ? parseInt(rec.sourceYear, 10) : null,
                        sourceSpecialty: topic.block_name || null,
                        sourceUrl: firstPmid ? `https://pubmed.ncbi.nlm.nih.gov/${firstPmid}/` : null,
                        recommendationText: String(rec.recommendationText).slice(0, 2000),
                        recommendationStrength: rec.recommendationStrength || null,
                        recommendationCertainty: rec.recommendationCertainty || null,
                        population: rec.population || null,
                        intervention: rec.intervention || null,
                        cautions: rec.cautions ? String(rec.cautions) : null,
                        status: 'ai_extracted',
                    });
                } catch (err) {
                    logger.debug({ err, topic: topicName }, 'Failed to store recommendation');
                }
            }
        } else {
            console.log(`  [DRY RUN] Would extract from ${papers.length} papers [${sourceType}]`);
        }
    }

    // ── Step 4a: Load stored guidelines/evidence for MCQ generation ──
    try {
        guidelines = await db.getGuidelinesByTopic(topicName, { limit: 10 });
        if (!Array.isArray(guidelines)) guidelines = [];
    } catch { guidelines = []; }

    // ── Step 4b: Decide MCQ generation path — NO synthesis fallback ──
    //
    //   Scenario A: structured recommendations extracted → MCQs grounded in those recs
    //   Scenario B: no recs extracted but we have raw abstracts → MCQs grounded in paper text
    //   Scenario C: no recs AND no papers (mcqOnly mode or fetch failed) → skip; topic removed from curriculum
    //
    const usingAbstracts = !guidelines.length && fetchedPapers.length > 0;
    const effectiveSourceType = usingAbstracts ? 'abstract_grounded' : sourceType;

    if (!guidelines.length && !fetchedPapers.length) {
        console.log(`  ℹ   ${topicName}: no verified source — no MCQs generated (topic should be removed from curriculum)`);
        return { status: 'no_evidence_in_db' };
    }

    if (usingAbstracts) {
        console.log(`  📄  ${topicName}: no structured recs — generating MCQs from ${fetchedPapers.length} paper abstract(s)`);
        sourceType = 'abstract_grounded';
    }

    // ── Step 5: Generate MCQs ──
    let mcqs = [];
    if (!opts.dryRun) {
        // Attempt MCQ generation — with retry if first attempt returns unparseable output
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                const prompt = usingAbstracts
                    ? buildAbstractMcqPrompt(topicName, fetchedPapers)
                    : buildMcqPrompt(topicName, guidelines, effectiveSourceType);
                const raw = await ai.callGemini(prompt, undefined, {
                    temperature: attempt === 1 ? 0.4 : 0.2,
                    jsonMode: attempt === 2,   // retry with jsonMode on attempt 2
                    maxOutputTokens: 5000,
                });
                mcqs = parseJsonArray(raw) || [];
                if (mcqs.length) break;
                if (attempt === 1) {
                    console.log(`  ↩   ${topicName}: MCQ attempt 1 unparseable — retrying with jsonMode`);
                    await sleep(500);
                }
            } catch (err) {
                if (attempt === 2) console.warn(`  ⚠   ${topicName}: MCQ generation threw — ${err.message}`);
            }
        }

        if (!mcqs.length) {
            console.warn(`  ⚠   ${topicName}: MCQ generation failed after 2 attempts`);
            return { status: 'failed', reason: 'mcq_parse_error' };
        }
        console.log(`  📝  ${topicName}: generated ${mcqs.length} MCQ(s) [${effectiveSourceType}]`);

        const confidenceMap = { practice_guideline: 0.85, systematic_review: 0.75, review_article: 0.65, abstract_grounded: 0.60 };
        await db.upsertTeachingObject({
            objectKey: guidelineKey,
            objectType: 'guideline_mcq',
            topic: topicName,
            normalizedTopic: normalized,
            title: `Evidence MCQs: ${topicName}`,
            payload: {
                mcqs,
                sourceType: effectiveSourceType,
                guidelineCount: guidelines.length,
                // All source papers used to generate these MCQs — stored for UI attribution
                sourcePapers: sourcePapers.map((p) => ({
                    pmid: p.pmid,
                    title: p.title,
                    journal: p.journal,
                    year: p.year,
                    pubmedUrl: p.pubmedUrl,
                })),
                generatedAt: new Date().toISOString(),
                generationSource: 'guidelineEnrichment',
            },
            provider: 'gemini',
            model: 'gemini-2.5-flash',
            confidence: confidenceMap[effectiveSourceType] ?? 0.60,
        });
    } else {
        console.log(`  [DRY RUN] Would generate ${GUIDELINE_MCQ_COUNT} MCQs from ${guidelines.length} guideline(s) / ${fetchedPapers.length} abstract(s)`);
    }

    return { status: 'enriched', guidelineCount: guidelines.length, mcqCount: mcqs.length, sourceType: effectiveSourceType };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    const opts = parseArgs();

    console.log('╔══════════════════════════════════════════════╗');
    console.log('║   Signal MD — Guideline Enrichment Script    ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log(`  Limit:       ${opts.limit}`);
    console.log(`  Concurrency: ${opts.concurrency}`);
    console.log(`  Dry run:     ${opts.dryRun}`);
    console.log(`  Force:       ${opts.force}`);
    console.log(`  MCQ only:    ${opts.mcqOnly}`);
    if (opts.topic) console.log(`  Topic filter: ${opts.topic}`);

    if (!serverConfig.keys.gemini) {
        console.error('❌  GEMINI_API_KEY not set.');
        process.exit(1);
    }

    await db.connect();
    await db.runMigrations();
    await cache.connect();

    const ai = createAiService({ serverConfig, fetchImpl: safeFetch });

    try {
        let allTopics = await db.listCurriculumSeedTopics({
            curriculumSlug: 'specialty-clinical-topics',
            seedStatus: '',
            limit: opts.limit * 3,
            offset: 0,
        });

        // Only enrich topics that were successfully seeded
        allTopics = allTopics.filter((t) =>
            ['seeded', 'seeded_with_warnings'].includes(t.seedStatus || '')
        );

        if (opts.topic) {
            const needle = opts.topic.toLowerCase();
            allTopics = allTopics.filter((t) => t.displayName.toLowerCase().includes(needle));
        }

        allTopics = allTopics.slice(0, opts.limit);

        if (!allTopics.length) {
            console.log('\n⚠  No seeded topics found. Run importAndSeedTopics.js first.');
            return;
        }

        console.log(`\n🔬  Processing ${allTopics.length} topics…\n`);

        const stats = { enriched: 0, skipped: 0, no_evidence: 0, no_evidence_in_db: 0, failed: 0 };
        const bySourceType = { practice_guideline: 0, systematic_review: 0, review_article: 0, abstract_grounded: 0 };

        for (let i = 0; i < allTopics.length; i += opts.concurrency) {
            const batch = allTopics.slice(i, i + opts.concurrency);
            const results = await Promise.all(
                batch.map((t) => enrichTopic(t, ai, opts).catch((err) => {
                    console.error(`  ❌  ${t.displayName}: ${err.message}`);
                    return { status: 'failed' };
                }))
            );
            for (const r of results) {
                stats[r.status] = (stats[r.status] || 0) + 1;
                if (r.sourceType) bySourceType[r.sourceType] = (bySourceType[r.sourceType] || 0) + 1;
            }
            if (i + opts.concurrency < allTopics.length) await sleep(1200);
        }

        console.log('\n📊  Enrichment complete:');
        console.log(`    ✅ Enriched:               ${stats.enriched || 0}`);
        console.log(`       ↳ from guidelines:       ${bySourceType.practice_guideline || 0}`);
        console.log(`       ↳ from sys reviews:      ${bySourceType.systematic_review || 0}`);
        console.log(`       ↳ from reviews:          ${bySourceType.review_article || 0}`);
        console.log(`       ↳ from raw abstracts:    ${bySourceType.abstract_grounded || 0}`);
        console.log(`    ⏭  Skipped (done):          ${stats.skipped || 0}`);
        console.log(`    ℹ  No PubMed papers:        ${stats.no_evidence || 0}`);
        console.log(`    ℹ  No verifiable source:    ${stats.no_evidence_in_db || 0} (remove from curriculum)`);
        console.log(`    ❌ Failed:                  ${stats.failed || 0}`);

    } finally {
        await db.close();
        await cache.close();
    }
}

main().catch((err) => {
    logger.fatal({ err }, 'guidelineEnrichment failed');
    process.exit(1);
});
