const logger = require('../config/logger');
const { createAiService, PINNED_MODELS, TEMPERATURE, AI_DISCLAIMER } = require('./aiService');
const {
    filterCitedStringList,
    validateMedicalOutputCitations,
    validateCitationRefs,
} = require('./citationValidator');
const { getCachedPdf } = require('./pdfPreindexService');
const { parseJsonBlock } = require('../utils/parseJson');

function isFreeEvidence(article) {
    return Boolean(article?.isFree || article?.pmcid || article?.fullTextUrl || article?.openAccess || article?.openAccessUrl);
}

function freeTextUrl(article) {
    if (article?.pmcid) return `https://www.ncbi.nlm.nih.gov/pmc/articles/${article.pmcid}/`;
    return article?.fullTextUrl || article?.openAccessUrl || null;
}

function safeString(value, max = 1200) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function selectFreeEvidence(articles = [], limit = 5) {
    const seen = new Set();
    const out = [];
    for (const article of articles) {
        if (!article?.title || !isFreeEvidence(article)) continue;
        const key = String(article.doi || article.pmid || article.uid || article.title).toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(article);
        if (out.length >= limit) break;
    }
    return out;
}

function buildFullTextExcerpt(article) {
    const sections = article?._fullTextSections || {};
    const ordered = ['abstract', 'methods', 'results', 'discussion', 'conclusion'];
    const parts = [];
    for (const key of ordered) {
        const text = safeString(sections[key], key === 'results' ? 1600 : 900);
        if (text) parts.push(`${key.toUpperCase()}: ${text}`);
    }
    return parts.join('\n');
}

async function enrichWithCachedFullText(articles = [], cache, db = null) {
    if (!cache || typeof cache.getAsync !== 'function') return articles;
    return Promise.all(articles.map(async (article) => {
        const cached = await getCachedPdf(article, cache, db).catch((err) => { logger.warn({ err }, 'getCachedPdf failed'); return null; });
        if (!cached || Number(cached.wordCount || 0) < 500) return article;
        return {
            ...article,
            _fullTextIndexed: true,
            _fullTextWordCount: Number(cached.wordCount || 0),
            _fullTextSections: cached.sections || {},
            _fullTextSectionKeys: cached.orderedKeys || Object.keys(cached.sections || {}),
        };
    }));
}

function buildConsensusSynopsisPrompt(topic, articles) {
    const evidence = articles.map((a, i) => {
        const year = safeString(a.pubdate || a.year || 'unknown', 20);
        const journal = safeString(a.source || a.journal || 'unknown', 160);
        const pubtype = Array.isArray(a.pubtype) ? a.pubtype.join(', ') : safeString(a.pubtype || 'unknown', 120);
        const fullTextExcerpt = buildFullTextExcerpt(a);
        return `[FREE PAPER ${i + 1}]
Title: ${safeString(a.title, 260)}
Journal/source: ${journal}
Year: ${year}
Study type: ${pubtype}
PMID: ${a.pmid || 'not provided'}
PMCID/free URL: ${a.pmcid || freeTextUrl(a) || 'not provided'}
DOI: ${a.doi || 'not provided'}
Evidence text source: ${a._fullTextIndexed ? `cached full text (${a._fullTextWordCount || 'unknown'} words)` : 'abstract/snippet only'}
Abstract/snippet: ${safeString(a.abstract || 'No abstract supplied.', 1200)}
${fullTextExcerpt ? `Cached full-text excerpts:\n${fullTextExcerpt}` : ''}`;
    }).join('\n\n');

    return `You are producing a conservative consensus synopsis for a medical doctor.

Scope:
- Topic: "${topic}"
- Use ONLY the supplied free/open-access papers below.
- If the papers do not support consensus, explicitly say "No clear consensus from the supplied free papers."
- Do not present this as a guideline unless a supplied paper is an official guideline or consensus statement.
- Every clinical claim must cite paper indices like [1] or [1, 3].
- Do not invent effect sizes, doses, contraindications, or guideline positions.

FREE/OPEN-ACCESS PAPERS:
${evidence}

Return ONLY valid JSON with this exact shape:
{
  "statement": "2-4 sentence consensus synopsis, using cautious language and inline paper citations",
  "clinicalBottomLine": "one sentence for clinical discussion support, with citations",
  "areasOfAgreement": ["agreement point with citation [1]", "agreement point with citation [2]"],
  "areasOfUncertainty": ["uncertainty or evidence gap with citation [1]"],
  "conflictingSignals": ["conflict or nuance with citations [1, 2]"],
  "evidenceStrength": "HIGH|MODERATE|LOW|VERY_LOW",
  "strengthRationale": "one sentence explaining certainty from study design, consistency, directness and precision",
  "whatNotToOverclaim": ["unsupported overclaim to avoid"],
  "quizFocusPoints": ["concept a doctor should be quizzed on after reading this evidence"]
}`;
}

function normalizeStringArray(value, max = 5) {
    return Array.isArray(value)
        ? value.map((item) => safeString(item, 500)).filter(Boolean).slice(0, max)
        : [];
}

function normalizeSynopsis(raw, topic, freeArticles, provider, model = null) {
    const safe = raw && typeof raw === 'object' ? raw : {};
    const sourceCount = freeArticles.length;
    const normalized = {
        status: 'generated',
        topic,
        evidenceScope: 'free_open_access_only',
        generatedAt: new Date().toISOString(),
        provider,
        model,
        freePaperCount: freeArticles.length,
        includedArticles: freeArticles.map((a, i) => ({
            sourceIndex: i + 1,
            uid: a.uid,
            title: a.title,
            pmid: a.pmid || null,
            pmcid: a.pmcid || null,
            doi: a.doi || null,
            journal: a.source || a.journal || null,
            pubdate: a.pubdate || String(a.year || '') || null,
            freeFullTextUrl: freeTextUrl(a),
            fullTextIndexed: Boolean(a._fullTextIndexed),
            fullTextWordCount: a._fullTextWordCount || null,
            fullTextSections: a._fullTextSectionKeys || [],
        })),
        statement: safeString(safe.statement, 1400) || 'No clear consensus from the supplied free papers.',
        clinicalBottomLine: safeString(safe.clinicalBottomLine, 700),
        areasOfAgreement: filterCitedStringList(normalizeStringArray(safe.areasOfAgreement, 5), { sourceCount }),
        areasOfUncertainty: filterCitedStringList(normalizeStringArray(safe.areasOfUncertainty, 5), { sourceCount }),
        conflictingSignals: filterCitedStringList(normalizeStringArray(safe.conflictingSignals, 5), { sourceCount }),
        evidenceStrength: ['HIGH', 'MODERATE', 'LOW', 'VERY_LOW'].includes(safe.evidenceStrength)
            ? safe.evidenceStrength
            : 'LOW',
        strengthRationale: safeString(safe.strengthRationale, 600),
        whatNotToOverclaim: normalizeStringArray(safe.whatNotToOverclaim, 5),
        quizFocusPoints: normalizeStringArray(safe.quizFocusPoints, 6),
        disclaimer: AI_DISCLAIMER,
    };

    const statementValid = validateCitationRefs(normalized.statement, { sourceCount }).ok;
    if (!statementValid) {
        normalized.statement = 'No defensible cited consensus statement could be generated from the supplied free papers.';
        normalized.evidenceStrength = 'VERY_LOW';
        normalized.areasOfUncertainty = [
            ...normalized.areasOfUncertainty,
            'The generated consensus statement lacked valid source citations and was withheld.',
        ].slice(0, 5);
    }
    if (normalized.clinicalBottomLine && !validateCitationRefs(normalized.clinicalBottomLine, { sourceCount }).ok) {
        normalized.clinicalBottomLine = '';
    }

    normalized.citationValidation = validateMedicalOutputCitations(normalized, {
        sourceCount,
        requiredPaths: ['statement'],
        requiredListPaths: ['areasOfAgreement', 'conflictingSignals'],
    });

    return normalized;
}

async function generateConsensusSynopsis({
    topic,
    articles = [],
    serverConfig,
    fetchImpl,
    cache,
    db = null,
    limit = 5,
} = {}) {
    const freeArticles = await enrichWithCachedFullText(selectFreeEvidence(articles, limit), cache, db);
    if (freeArticles.length < 2) {
        return {
            status: 'insufficient_free_evidence',
            topic,
            evidenceScope: 'free_open_access_only',
            generatedAt: new Date().toISOString(),
            freePaperCount: freeArticles.length,
            includedArticles: freeArticles.map((a, i) => ({
                sourceIndex: i + 1,
                uid: a.uid,
                title: a.title,
                pmid: a.pmid || null,
                pmcid: a.pmcid || null,
                doi: a.doi || null,
                journal: a.source || a.journal || null,
                pubdate: a.pubdate || String(a.year || '') || null,
                freeFullTextUrl: freeTextUrl(a),
                fullTextIndexed: false,
                fullTextWordCount: null,
                fullTextSections: [],
            })),
            statement: 'No consensus synopsis generated because fewer than two free/open-access papers were available in the evidence bouquet.',
            clinicalBottomLine: '',
            areasOfAgreement: [],
            areasOfUncertainty: ['Free/open-access evidence set too small for a defensible consensus synopsis.'],
            conflictingSignals: [],
            evidenceStrength: 'VERY_LOW',
            strengthRationale: 'Insufficient free/open-access evidence in the selected bouquet.',
            whatNotToOverclaim: ['Do not infer consensus from a single free paper.'],
            quizFocusPoints: [],
            disclaimer: AI_DISCLAIMER,
        };
    }

    const provider = serverConfig?.keys?.gemini ? 'gemini' : serverConfig?.keys?.mistral ? 'mistral' : null;
    if (!provider) {
        return {
            status: 'provider_unavailable',
            topic,
            evidenceScope: 'free_open_access_only',
            generatedAt: new Date().toISOString(),
            freePaperCount: freeArticles.length,
            includedArticles: [],
            statement: 'Consensus synopsis unavailable because no built-in LLM provider is configured.',
            clinicalBottomLine: '',
            areasOfAgreement: [],
            areasOfUncertainty: [],
            conflictingSignals: [],
            evidenceStrength: 'VERY_LOW',
            strengthRationale: 'No LLM provider configured.',
            whatNotToOverclaim: [],
            quizFocusPoints: [],
            disclaimer: AI_DISCLAIMER,
        };
    }

    const ai = createAiService({ serverConfig, fetchImpl });
    const prompt = buildConsensusSynopsisPrompt(topic, freeArticles);
    const model = provider === 'gemini' ? PINNED_MODELS.geminiQuality : PINNED_MODELS.mistral;
    const raw = provider === 'gemini'
        ? await ai.callGemini(prompt, model, { temperature: TEMPERATURE.synopsis })
        : await ai.callMistralAI(prompt, model, { temperature: TEMPERATURE.synopsis });
    const parsed = parseJsonBlock(raw);
    if (!parsed) {
        throw new Error('AI returned unparseable consensus synopsis');
    }
    return normalizeSynopsis(parsed, topic, freeArticles, provider, model);
}

async function generateConsensusSynopsisSafe(options, logger = console) {
    try {
        return await generateConsensusSynopsis(options);
    } catch (error) {
        if (logger?.warn) logger.warn({ err: error }, 'Consensus synopsis generation failed');
        return {
            status: 'generation_failed',
            topic: options?.topic || '',
            evidenceScope: 'free_open_access_only',
            generatedAt: new Date().toISOString(),
            freePaperCount: selectFreeEvidence(options?.articles || [], options?.limit || 5).length,
            includedArticles: [],
            statement: 'Consensus synopsis could not be generated for this search.',
            clinicalBottomLine: '',
            areasOfAgreement: [],
            areasOfUncertainty: ['The LLM synopsis step failed; review the primary sources directly.'],
            conflictingSignals: [],
            evidenceStrength: 'VERY_LOW',
            strengthRationale: 'Generation failed.',
            whatNotToOverclaim: ['Do not rely on a failed synopsis generation.'],
            quizFocusPoints: [],
            disclaimer: AI_DISCLAIMER,
        };
    }
}

module.exports = {
    buildConsensusSynopsisPrompt,
    generateConsensusSynopsis,
    generateConsensusSynopsisSafe,
    isFreeEvidence,
    selectFreeEvidence,
};
