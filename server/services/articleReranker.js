/**
 * Article Reranker Service
 *
 * Implements a hybrid reranking stage for clinical search:
 * 1. Extract a structured PICO profile from the case text (cached per caseText hash).
 * 2. Score each retrieved article against the PICO profile using a lightweight LLM batch call.
 * 3. Filter out articles with severe population/severity mismatches.
 * 4. Return articles sorted by clinical relevance.
 *
 * Target: Precision@10 >= 0.75, off-topic rate@10 <= 0.10.
 */

const crypto = require('crypto');
const logger = require('../config/logger');
const { parseJsonBlock, parseJsonArrayBlock } = require('../utils/parseJson');
const { resolveProvider } = require('../utils/aiProvider');

const RERANK_TEMPERATURE = 0.1;
const PICO_CACHE_TTL_SECONDS = 3600; // 1 hour
const MAX_ARTICLES_TO_RERANK = 30;
const MAX_ARTICLES_TO_RETURN = 10;

// Study-type hierarchy for management queries: higher is better
const STUDY_TYPE_RANK = {
    'meta-analysis': 5,
    'systematic review': 5,
    'randomized controlled trial': 4,
    'rct': 4,
    'clinical trial': 4,
    'cohort study': 3,
    'observational study': 3,
    'case-control study': 2,
    'cross-sectional study': 2,
    'case report': 1,
    'case series': 1,
    'expert opinion': 1,
    'review': 2,
    'unknown': 2,
};

function rankForStudyType(studyType) {
    const normalized = String(studyType || 'unknown').toLowerCase().trim();
    for (const [key, rank] of Object.entries(STUDY_TYPE_RANK)) {
        if (normalized.includes(key)) return rank;
    }
    return STUDY_TYPE_RANK.unknown;
}

/**
 * Build a deterministic cache key for the PICO profile of a given case text.
 */
function buildPicoCacheKey(caseText) {
    const hash = crypto.createHash('sha256').update(caseText).digest('hex').slice(0, 16);
    return `pico:profile:${hash}`;
}

/**
 * Build the prompt to extract a structured PICO + clinical context profile from free-text case data.
 */
function buildPicoExtractionPrompt(caseText) {
    return `You are a clinical evidence specialist. Extract the PICO elements and clinical context from the case description below.

Return ONLY valid JSON with no markdown formatting:
{
  "population": "patient population described (age, sex, comorbidities)",
  "intervention": "intervention or exposure mentioned",
  "comparison": "comparator or alternative if stated",
  "outcome": "desired outcomes or endpoints",
  "ageRange": "specific age range e.g. '65-80 years' or 'adults' or 'children'",
  "severity": "disease severity markers e.g. 'severe ARDS (PaO2/FiO2 < 100)', 'mild', 'hospitalised'",
  "setting": "care setting e.g. 'ICU', 'emergency department', 'outpatient', 'community'",
  "queryIntent": "management | diagnosis | prognosis | mechanism | epidemiology"
}

If an element is not mentioned, use an empty string. Be concise.

Case text:
${caseText.slice(0, 2000)}`;
}

/**
 * Extract a structured PICO profile from case text.
 * Caches the result for 1 hour to avoid repeated LLM calls on identical cases.
 *
 * @param {string} caseText
 * @param {object} options
 * @param {object} options.ai — AI service with callGemini / callMistralAI
 * @param {object} options.cache — cache with get/set
 * @param {object} options.serverConfig
 * @param {Function} [options.logWarn]
 * @returns {Promise<object>} picoProfile
 */
async function extractPicoProfile(caseText, { ai, cache, serverConfig, logWarn }) {
    if (!caseText || typeof caseText !== 'string') {
        return {};
    }

    const cacheKey = buildPicoCacheKey(caseText);

    // Try cache first
    if (cache) {
        try {
            const cached = await cache.get(cacheKey);
            if (cached) {
                logger.debug({ cacheKey }, 'PICO profile cache hit');
                return cached;
            }
        } catch (err) {
            logWarn?.({ err, cacheKey }, 'PICO profile cache read failed');
        }
    }

    const prompt = buildPicoExtractionPrompt(caseText);
    const { provider, model } = resolveProvider({ provider: 'auto' }, serverConfig);

    if (!provider || !ai) {
        logWarn?.({ provider }, 'No AI provider available for PICO extraction; returning empty profile');
        return {};
    }

    let rawText;
    const started = Date.now();
    try {
        // callText routes to the resolved provider (claude/gemini/mistral). A bare
        // gemini/else split previously sent claude models to the Mistral endpoint.
        rawText = await ai.callText(prompt, provider, model, { temperature: RERANK_TEMPERATURE, maxOutputTokens: 512 });
    } catch (err) {
        logWarn?.({ err, provider, model, durationMs: Date.now() - started }, 'PICO extraction LLM call failed');
        return {};
    }

    const parsed = parseJsonBlock(rawText);
    if (!parsed || typeof parsed !== 'object') {
        logWarn?.({ rawPreview: String(rawText).slice(0, 200) }, 'PICO extraction returned unparseable JSON');
        return {};
    }

    const profile = {
        population: String(parsed.population || ''),
        intervention: String(parsed.intervention || ''),
        comparison: String(parsed.comparison || ''),
        outcome: String(parsed.outcome || ''),
        ageRange: String(parsed.ageRange || ''),
        severity: String(parsed.severity || ''),
        setting: String(parsed.setting || ''),
        queryIntent: String(parsed.queryIntent || 'management'),
    };

    // Cache successful extraction
    if (cache) {
        try {
            await cache.set(cacheKey, profile, PICO_CACHE_TTL_SECONDS);
        } catch (err) {
            logWarn?.({ err, cacheKey }, 'PICO profile cache write failed');
        }
    }

    return profile;
}

/**
 * Build the batch scoring prompt that asks the LLM to score every article against the PICO profile.
 */
function buildBatchScoringPrompt(picoProfile, articles) {
    const articleBlocks = articles.map((a, idx) => {
        const studyType = a.pubtype?.[0] || a.studyType || 'unknown';
        return `[ARTICLE ${idx + 1}]
Title: ${(a.title || '').slice(0, 300)}
Study type: ${studyType}
Year: ${a.year || a.pubdate || 'unknown'}
Abstract: ${(a.abstract || 'No abstract').slice(0, 800)}`;
    }).join('\n\n');

    return `You are a systematic review methodologist. Score each article below for clinical relevance to the patient case.

PATIENT CASE PROFILE:
- Population: ${picoProfile.population || 'Not specified'}
- Intervention/Exposure: ${picoProfile.intervention || 'Not specified'}
- Comparison: ${picoProfile.comparison || 'Not specified'}
- Outcome: ${picoProfile.outcome || 'Not specified'}
- Age range: ${picoProfile.ageRange || 'Not specified'}
- Severity: ${picoProfile.severity || 'Not specified'}
- Setting: ${picoProfile.setting || 'Not specified'}
- Query intent: ${picoProfile.queryIntent || 'management'}

For each article, return a JSON object with these exact fields:
- articleIndex: integer (1-based)
- populationMatch: number 0.0–1.0 (does the study population match the case?)
- interventionMatch: number 0.0–1.0 (does the intervention match?)
- outcomeMatch: number 0.0–1.0 (are the outcomes aligned?)
- studyDesignScore: number 0.0–1.0 (RCTs/meta-analyses score higher for management queries; case reports score lower)
- overallScore: number 0.0–1.0 (composite relevance)
- exclusionFlags: array of strings. Possible values: "population_mismatch" (age/severity/setting diverges significantly), "outcome_mismatch" (outcomes are irrelevant), "design_too_weak" (case report/expert opinion for a management query). Empty array if no exclusions.
- rationale: one sentence explaining the score.

Return ONLY a JSON array. No markdown, no explanation outside the JSON.

${articleBlocks}`;
}

/**
 * Parse the LLM batch-scoring response into structured score objects.
 */
function parseBatchScores(rawText, articleCount) {
    const parsed = parseJsonArrayBlock(rawText);
    if (!Array.isArray(parsed)) {
        return null;
    }

    const scores = [];
    for (const item of parsed) {
        if (!item || typeof item !== 'object') continue;
        const idx = Number(item.articleIndex);
        if (!Number.isInteger(idx) || idx < 1 || idx > articleCount) continue;

        scores.push({
            articleIndex: idx,
            populationMatch: clamp01(Number(item.populationMatch)),
            interventionMatch: clamp01(Number(item.interventionMatch)),
            outcomeMatch: clamp01(Number(item.outcomeMatch)),
            studyDesignScore: clamp01(Number(item.studyDesignScore)),
            overallScore: clamp01(Number(item.overallScore)),
            exclusionFlags: Array.isArray(item.exclusionFlags)
                ? item.exclusionFlags.filter((f) => typeof f === 'string')
                : [],
            rationale: String(item.rationale || ''),
        });
    }

    return scores;
}

function clamp01(n) {
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.5;
}

/**
 * Compute a heuristic fallback score when the LLM reranker is unavailable.
 * Uses keyword overlap + study type appropriateness.
 */
function computeHeuristicScore(article, picoProfile) {
    const text = `${article.title || ''} ${article.abstract || ''}`.toLowerCase();
    const keywords = [
        picoProfile.population,
        picoProfile.intervention,
        picoProfile.outcome,
        picoProfile.severity,
        picoProfile.setting,
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);

    const uniqueKeywords = [...new Set(keywords)];
    let hits = 0;
    for (const kw of uniqueKeywords) {
        if (text.includes(kw)) hits++;
    }
    const keywordScore = uniqueKeywords.length > 0 ? hits / uniqueKeywords.length : 0.5;

    const studyType = article.pubtype?.[0] || article.studyType || 'unknown';
    const designRank = rankForStudyType(studyType);
    const isManagementQuery = (picoProfile.queryIntent || 'management') === 'management';
    const designScore = isManagementQuery ? designRank / 5 : designRank / 5;

    const overallScore = keywordScore * 0.6 + designScore * 0.4;

    return {
        articleIndex: -1,
        populationMatch: keywordScore,
        interventionMatch: keywordScore,
        outcomeMatch: keywordScore,
        studyDesignScore: designScore,
        overallScore,
        exclusionFlags: [],
        rationale: `Heuristic: keyword overlap ${Math.round(keywordScore * 100)}%, design rank ${designRank}/5`,
    };
}

/**
 * Rerank articles by PICO relevance.
 *
 * @param {object[]} articles — raw article objects from search
 * @param {object} picoProfile — output from extractPicoProfile
 * @param {object} options
 * @param {object} options.ai — AI service
 * @param {object} options.serverConfig
 * @param {Function} [options.logWarn]
 * @returns {Promise<object[]>} articles augmented with `_rerank` score object, sorted descending
 */
async function rerankArticlesByPico(articles, picoProfile, { ai, serverConfig, logWarn }) {
    if (!Array.isArray(articles) || articles.length === 0) {
        return [];
    }

    const safeArticles = articles.slice(0, MAX_ARTICLES_TO_RERANK);
    const isEmptyProfile = !picoProfile || Object.values(picoProfile).every((v) => !v);

    // If no meaningful PICO profile, fall back to heuristic + study type sorting
    if (isEmptyProfile || !ai) {
        logWarn?.({ articleCount: safeArticles.length }, 'No PICO profile or AI service; using heuristic fallback');
        return safeArticles
            .map((article) => ({
                ...article,
                _rerank: computeHeuristicScore(article, picoProfile || {}),
            }))
            .sort((a, b) => b._rerank.overallScore - a._rerank.overallScore);
    }

    const prompt = buildBatchScoringPrompt(picoProfile, safeArticles);
    const { provider, model } = resolveProvider({ provider: 'auto' }, serverConfig);

    let scores = null;
    const started = Date.now();
    try {
        // callText routes to the resolved provider (claude/gemini/mistral). A bare
        // gemini/else split previously sent claude models to the Mistral endpoint.
        const rawText = await ai.callText(prompt, provider, model, { temperature: RERANK_TEMPERATURE, maxOutputTokens: 2048 });
        scores = parseBatchScores(rawText, safeArticles.length);
        if (!scores || scores.length === 0) {
            logWarn?.({ rawPreview: String(rawText).slice(0, 200) }, 'Reranker returned no parseable scores');
        }
    } catch (err) {
        logWarn?.({ err, provider, model, durationMs: Date.now() - started }, 'Reranker LLM call failed; falling back to heuristic');
    }

    // If LLM scoring failed, use heuristic fallback
    if (!scores) {
        return safeArticles
            .map((article) => ({
                ...article,
                _rerank: computeHeuristicScore(article, picoProfile),
            }))
            .sort((a, b) => b._rerank.overallScore - a._rerank.overallScore);
    }

    // Build a map of articleIndex -> score
    const scoreMap = new Map(scores.map((s) => [s.articleIndex, s]));

    const augmented = safeArticles.map((article, idx) => {
        const score = scoreMap.get(idx + 1);
        if (score) {
            return { ...article, _rerank: score };
        }
        // If an article wasn't scored by the LLM, use heuristic
        return { ...article, _rerank: computeHeuristicScore(article, picoProfile) };
    });

    // Sort by overallScore descending
    augmented.sort((a, b) => b._rerank.overallScore - a._rerank.overallScore);

    return augmented;
}

/**
 * Filter out articles with severe mismatches and return the top N.
 *
 * @param {object[]} rerankedArticles — articles with `_rerank` property
 * @param {object} [options]
 * @param {number} [options.topN=10]
 * @param {boolean} [options.strictPopulation=true] — discard articles flagged population_mismatch
 * @returns {object[]} filtered and sliced articles
 */
function selectTopRerankedArticles(rerankedArticles, { topN = MAX_ARTICLES_TO_RETURN, strictPopulation = true } = {}) {
    if (!Array.isArray(rerankedArticles)) return [];

    let filtered = rerankedArticles;
    if (strictPopulation) {
        filtered = rerankedArticles.filter((a) => {
            const flags = a._rerank?.exclusionFlags || [];
            return !flags.includes('population_mismatch');
        });
    }

    // If nothing passes, always relax. If very few pass (<3) and we started with many (>=6), relax.
    if (filtered.length === 0 || (filtered.length < 3 && rerankedArticles.length >= 6)) {
        filtered = rerankedArticles;
    }

    return filtered.slice(0, topN);
}

module.exports = {
    extractPicoProfile,
    rerankArticlesByPico,
    selectTopRerankedArticles,
    computeHeuristicScore,
    rankForStudyType,
    buildPicoCacheKey,
    // Constants for testing / tuning
    MAX_ARTICLES_TO_RERANK,
    MAX_ARTICLES_TO_RETURN,
};
