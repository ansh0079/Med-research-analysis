'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');
const { getSharedAiService, PINNED_MODELS } = require('./aiService');
const { resolveProvider } = require('../utils/aiProvider');
const { safeFetch } = require('../utils/fetch');

// ── Flagship config cache (5-min TTL) ────────────────────────────────────────

let _cfgCache = null;
let _cfgCacheAt = 0;
const CFG_TTL_MS = 5 * 60 * 1000;

function loadFlagshipConfigCached(configPath) {
    const now = Date.now();
    if (_cfgCache && now - _cfgCacheAt < CFG_TTL_MS) return _cfgCache;
    const p = configPath || path.join(__dirname, '../config/flagshipTopics.json');
    try {
        _cfgCache = JSON.parse(fs.readFileSync(p, 'utf8'));
        _cfgCacheAt = now;
    } catch (err) {
        logger.warn({ err }, 'flagship config load failed');
        return _cfgCache || { topics: [] };
    }
    return _cfgCache;
}

// ── Stable job key ────────────────────────────────────────────────────────────

function flagshipEnrichJobKey(topic) {
    const n = String(topic || '').trim().toLowerCase();
    return `flagship-enrich:${crypto.createHash('sha256').update(n).digest('hex').slice(0, 40)}`;
}

// ── Flagship topic matching ───────────────────────────────────────────────────

/**
 * Match a search query against the flagship config.
 * Returns the best-matching flagship entry + score, or null if nothing exceeds threshold.
 */
function matchFlagshipTopic(searchQuery, configPath) {
    const cfg = loadFlagshipConfigCached(configPath);
    if (!cfg?.topics?.length) return null;
    const { curriculumMatchesFlagship } = require('./flagshipTopicOps');
    const query = String(searchQuery || '').trim();
    if (!query) return null;

    let best = null;
    let bestScore = 0.55; // minimum Jaccard threshold for fuzzy match
    for (const flagship of cfg.topics) {
        const result = curriculumMatchesFlagship(query, flagship, { fuzzy: true });
        if (result.match && result.score > bestScore) {
            best = { flagship, matchScore: result.score, matchReason: result.reason };
            bestScore = result.score;
        }
    }
    return best;
}

// ── PubMed helpers ────────────────────────────────────────────────────────────

const PUBMED_EFETCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
const PUBMED_ESEARCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';

async function fetchAbstracts(pmids, f) {
    if (!pmids.length) return [];
    const url = `${PUBMED_EFETCH}?db=pubmed&id=${pmids.join(',')}&retmode=xml&rettype=abstract`;
    const res = await f(url, { timeout: 20000 });
    if (!res.ok) throw new Error(`PubMed efetch ${res.status}`);
    const xml = await res.text();
    const papers = [];
    const artPat = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g;
    let m;
    while ((m = artPat.exec(xml)) !== null) {
        const art = m[1];
        const pmid = (art.match(/<PMID[^>]*>(\d+)<\/PMID>/) || [])[1] || '';
        const title = (art.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/) || [])[1]?.replace(/<[^>]+>/g, '').trim() || '';
        const absParts = [];
        const absRe = /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g;
        let am;
        while ((am = absRe.exec(art)) !== null) absParts.push(am[1].replace(/<[^>]+>/g, '').trim());
        const abstract = absParts.join(' ').trim();
        const journal = (art.match(/<Title>([\s\S]*?)<\/Title>/) || [])[1]?.replace(/<[^>]+>/g, '').trim() || '';
        const year = (art.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/) || [])[1] || '';
        if (pmid && (title || abstract)) papers.push({ pmid, title, abstract, journal, year });
    }
    return papers;
}

async function pubmedSearchGuidelines(query, f) {
    const q = `(${query}) AND (practice guideline[pt] OR guideline[ti] OR systematic review[pt] OR meta-analysis[pt])`;
    const url = `${PUBMED_ESEARCH}?db=pubmed&term=${encodeURIComponent(q)}&retmax=6&sort=relevance&retmode=json`;
    try {
        const res = await f(url, { timeout: 15000 });
        if (!res.ok) return [];
        const data = await res.json();
        return data?.esearchresult?.idlist || [];
    } catch { return []; }
}

// ── JSON parser (lenient) ─────────────────────────────────────────────────────

function parseJsonArray(raw) {
    if (!raw) return null;
    if (Array.isArray(raw)) return raw;
    const text = String(raw).trim();
    try {
        const r = JSON.parse(text);
        if (Array.isArray(r)) return r;
        for (const v of Object.values(r)) if (Array.isArray(v) && v.length > 0) return v;
    } catch { /* ignore */ }
    const m = text.match(/\[[\s\S]*\]/);
    if (m) { try { const r = JSON.parse(m[0]); if (Array.isArray(r)) return r; } catch { /* ignore */ } }
    return null;
}

// ── AI call helpers ───────────────────────────────────────────────────────────

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function extractClaimsFromPaper(ai, provider, model, paper, topicName) {
    const prompt = `You are a medical education expert. Extract 3-4 important, specific, evidence-based clinical claims from this landmark paper about "${topicName}".

Paper: ${paper.title}
Journal: ${paper.journal} (${paper.year})
PMID: ${paper.pmid}

Abstract:
${paper.abstract || '(no abstract available)'}

Each claim must be specific and quantitative (include numbers, percentages, NNT, HR, p-values where present) and grounded in the paper's actual findings.

[
  {
    "claimKey": "short-kebab-key-max-60-chars",
    "claimText": "Specific clinical claim with evidence (1-2 sentences, ≤200 chars)",
    "evidenceQuote": "Key stat or quote from abstract (≤150 chars)"
  }
]

Return ONLY the JSON array.`;

    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const text = await ai.callText(prompt, provider, model, { maxOutputTokens: 800, temperature: 0.2 });
            const parsed = parseJsonArray(text);
            if (parsed?.length) return parsed.filter((c) => c.claimKey && c.claimText).slice(0, 4);
        } catch (e) {
            if (attempt === 2) logger.warn({ err: e, topicName, pmid: paper.pmid }, 'flagship_enrich: claim extraction failed');
        }
        if (attempt < 2) await sleep(500);
    }
    return [];
}

async function extractGuidelineRecommendations(ai, provider, model, papers, topicName) {
    if (!papers.length) return [];
    const combined = papers.map((p) => `Title: ${p.title}\nAbstract: ${p.abstract}`).join('\n\n---\n\n');
    const prompt = `Extract key clinical practice recommendations for "${topicName}" from these papers.

${combined.slice(0, 3000)}

Return JSON array:
[{"recommendation": "Specific actionable recommendation", "strength": "strong|moderate|weak", "source": "paper title or PMID"}]

Return ONLY the JSON array.`;

    try {
        const raw = await ai.callText(prompt, provider, model, { maxOutputTokens: 600, temperature: 0.2 });
        const parsed = parseJsonArray(raw);
        return (parsed || []).filter((r) => r.recommendation).slice(0, 6);
    } catch { return []; }
}

async function generateGuidelineMCQs(ai, provider, model, topicName, guidelines) {
    if (!guidelines.length) return [];
    const summary = guidelines.slice(0, 5).map((g, i) =>
        `${i + 1}. ${g.title || topicName} (${g.year || ''}): ${(g.recommendations || []).slice(0, 2).map((r) => r.text || r).join('; ')}`
    ).join('\n');

    const prompt = `Generate 3 high-quality multiple-choice questions from these guidelines for "${topicName}".

Guidelines:
${summary}

Return JSON array:
[{"question": "Clinical question stem", "options": {"A": "...", "B": "...", "C": "...", "D": "..."}, "correct": "A", "explanation": "Why correct (≤200 chars, cite guideline)"}]

Return ONLY the JSON array.`;

    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const text = await ai.callText(prompt, provider, model, { maxOutputTokens: 1200, temperature: 0.3 });
            const parsed = parseJsonArray(text);
            if (parsed?.length) return parsed.filter((q) => q.question && q.options && q.correct).slice(0, 4);
        } catch (e) {
            if (attempt === 2) logger.warn({ err: e, topicName }, 'flagship_enrich: MCQ generation failed');
        }
        if (attempt < 2) await sleep(500);
    }
    return [];
}

// ── Core enrichment ───────────────────────────────────────────────────────────

/**
 * Run flagship enrichment for one topic:
 *   1. Fetch landmark PMID abstracts → extract claims → write paper teaching_objects
 *      (upsertTeachingObject automatically writes claimAnchors → teaching_object_claims)
 *   2. Search PubMed for guidelines → write guideline_mcq teaching_object
 */
async function runFlagshipEnrichForTopic({ db, topic, flagship, serverConfig, fetchImpl }) {
    const topicName = String(topic || flagship?.topic || '').trim();
    if (!topicName) throw new Error('flagship_enrich: topic name required');

    const normalizedTopic = typeof db.normalizeTopic === 'function'
        ? db.normalizeTopic(topicName)
        : topicName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();

    const pmids = (flagship?.landmarkPmids || []).filter(Boolean);
    const f = fetchImpl || safeFetch;
    const ai = getSharedAiService({ serverConfig, fetchImpl: f });
    const { provider, model: resolvedModel } = resolveProvider({}, serverConfig);
    const model = resolvedModel || (PINNED_MODELS && PINNED_MODELS[provider]) || null;

    if (!provider) return { status: 'skipped', reason: 'no_ai_provider', topicName };

    let paperTOsCreated = 0;
    let totalClaimsWritten = 0;

    // Step 1: Landmark paper teaching objects + claims
    for (const pmid of pmids.slice(0, 3)) {
        const objectKey = `landmark-paper:${pmid}:${normalizedTopic.replace(/\s+/g, '-').slice(0, 40)}`;
        const existing = await db.getTeachingObjectByKey(objectKey).catch(() => null);
        if (existing) { paperTOsCreated++; continue; }

        let papers = [];
        try { papers = await fetchAbstracts([pmid], f); }
        catch (e) {
            logger.warn({ err: e, pmid, topicName }, 'flagship_enrich: PubMed fetch failed');
            continue;
        }
        if (!papers.length) continue;
        const paper = papers[0];

        const claims = await extractClaimsFromPaper(ai, provider, model, paper, topicName);
        logger.info({ pmid, topicName, claimCount: claims.length }, 'flagship_enrich: paper claims extracted');

        // upsertTeachingObject automatically persists claimAnchors → teaching_object_claims
        await db.upsertTeachingObject({
            objectKey,
            objectType: 'paper',
            articleUid: `pmid:${pmid}`,
            topic: topicName,
            normalizedTopic,
            title: paper.title,
            payload: {
                pmid,
                title: paper.title,
                journal: paper.journal,
                year: paper.year,
                abstract: paper.abstract?.slice(0, 800),
                claimAnchors: claims,
                generatedAt: new Date().toISOString(),
                generationSource: 'flagship_enrich_job',
            },
            provider,
            model,
            confidence: 0.85,
        });
        paperTOsCreated++;
        totalClaimsWritten += claims.length;
        await sleep(800);
    }

    // Step 2: Guideline enrichment + MCQ teaching object (skip if already exists)
    const guidelineObjectKey = `guideline-mcq:${topicName.replace(/\s+/g, '-').slice(0, 60)}`;
    const existingGuideline = await db.getTeachingObjectByKey(guidelineObjectKey).catch(() => null);
    const existingGuidelineRows = await db.getGuidelinesByTopic(topicName, { limit: 3 }).catch(() => []);

    if (!existingGuideline || existingGuidelineRows.length < 1) {
        const coreQuery = topicName.split(':')[0].trim();
        const guidelinePmids = await pubmedSearchGuidelines(coreQuery, f);
        let guidelines = existingGuidelineRows;

        if (guidelinePmids.length) {
            const gPapers = await fetchAbstracts(guidelinePmids.slice(0, 5), f).catch(() => []);
            const recs = await extractGuidelineRecommendations(ai, provider, model, gPapers, topicName);
            for (const gp of gPapers.slice(0, 6)) {
                const gpRecs = recs.filter((r) =>
                    !r.source || r.source.includes(gp.pmid) || gp.title.toLowerCase().includes((r.source || '').toLowerCase().slice(0, 20))
                );
                try {
                    await db.createGuideline({
                        topic: topicName,
                        normalizedTopic,
                        title: gp.title,
                        year: Number(gp.year) || null,
                        source: gp.journal || 'PubMed',
                        pmid: gp.pmid,
                        recommendations: gpRecs.length
                            ? gpRecs
                            : [{ text: `Evidence-based guidance for ${topicName}`, strength: 'moderate', pmid: gp.pmid }],
                        status: 'active',
                    });
                } catch { /* ignore dupes */ }
            }
            guidelines = await db.getGuidelinesByTopic(topicName, { limit: 10 }).catch(() => []);
        }

        const mcqs = await generateGuidelineMCQs(ai, provider, model, topicName, guidelines);
        if (mcqs.length) {
            await db.upsertTeachingObject({
                objectKey: guidelineObjectKey,
                objectType: 'guideline_mcq',
                topic: topicName,
                normalizedTopic,
                title: `Evidence MCQs: ${topicName}`,
                payload: {
                    mcqs,
                    guidelineCount: guidelines.length,
                    generatedAt: new Date().toISOString(),
                    generationSource: 'flagship_enrich_job',
                },
                provider,
                model,
                confidence: 0.80,
            });
        }
    }

    return { status: 'completed', topicName, paperTOsCreated, totalClaimsWritten };
}

module.exports = {
    flagshipEnrichJobKey,
    loadFlagshipConfigCached,
    matchFlagshipTopic,
    runFlagshipEnrichForTopic,
};
