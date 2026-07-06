const logger = require('../config/logger');
const { createAiService, PINNED_MODELS, TEMPERATURE, AI_DISCLAIMER } = require('./aiService');
const { resolveProvider } = require('../utils/aiProvider');
const {
    filterCitedStringList,
    validateMedicalOutputCitations,
    validateCitationRefs,
} = require('./citationValidator');
const { getCachedPdf } = require('./pdfPreindexService');
const { validateAiOutput } = require('./aiOutputValidation');

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

function selectAbstractEvidence(articles = [], limit = 5) {
    const seen = new Set();
    const out = [];
    for (const article of articles) {
        if (!article?.title || !article?.abstract) continue;
        if (isFreeEvidence(article)) continue; // only non-free
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
    const sectionLimits = { abstract: 2200, methods: 5000, results: 8000, discussion: 5000, conclusion: 3000 };
    for (const key of ordered) {
        const text = safeString(sections[key], sectionLimits[key] || 4000);
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

function formatArticleForPrompt(a, index, labelPrefix) {
    const year = safeString(a.pubdate || a.year || 'unknown', 20);
    const journal = safeString(a.source || a.journal || 'unknown', 160);
    const pubtype = Array.isArray(a.pubtype) ? a.pubtype.join(', ') : safeString(a.pubtype || 'unknown', 120);
    const fullTextExcerpt = buildFullTextExcerpt(a);
    const ebmScore = a._ebmScore != null ? String(a._ebmScore) : 'N/A';
    return `[${labelPrefix} ${index}]
Title: ${safeString(a.title, 260)}
Journal/source: ${journal}
Year: ${year}
Study type: ${pubtype}
EBM score: ${ebmScore}
PMID: ${a.pmid || 'not provided'}
PMCID/free URL: ${a.pmcid || freeTextUrl(a) || 'not provided'}
DOI: ${a.doi || 'not provided'}
Evidence text source: ${a._fullTextIndexed ? `cached full text (${a._fullTextWordCount || 'unknown'} words)` : 'abstract/snippet only'}
Abstract/snippet: ${safeString(a.abstract || 'No abstract supplied.', 1200)}
${fullTextExcerpt ? `Cached full-text excerpts:\n${fullTextExcerpt}` : ''}`;
}

function buildConsensusSynopsisPrompt(topic, freeArticles, abstractArticles, guidelines, topicKnowledge) {
    const freeEvidence = freeArticles.map((a, i) => formatArticleForPrompt(a, i + 1, 'FREE PAPER')).join('\n\n');
    const abstractEvidence = abstractArticles.map((a, i) => formatArticleForPrompt(a, freeArticles.length + i + 1, 'ABSTRACT ONLY')).join('\n\n');

    let guidelineSection = '';
    if (guidelines && guidelines.length > 0) {
        guidelineSection = `
Relevant clinical guidelines:
${guidelines.map((g, i) => `${i + 1}. ${safeString(g.sourceBody, 80)} ${g.sourceYear || ''} — ${safeString(g.recommendationText, 400)}${g.recommendationStrength ? ` (Strength: ${g.recommendationStrength})` : ''}${g.recommendationCertainty ? ` (Certainty: ${g.recommendationCertainty})` : ''}`).join('\n')}
`;
    }

    let knowledgeSection = '';
    if (topicKnowledge && topicKnowledge.knowledge) {
        knowledgeSection = `
Curated topic knowledge:
${safeString(topicKnowledge.knowledge, 2000)}
${Array.isArray(topicKnowledge.sourceArticles) && topicKnowledge.sourceArticles.length > 0 ? `Seminal papers: ${topicKnowledge.sourceArticles.join('; ')}` : ''}
`;
    }

    return `You are producing a conservative consensus synopsis for a medical doctor.

Scope:
- Topic: "${topic}"
- Use the supplied free/open-access papers and abstract-only papers below.
- For [ABSTRACT ONLY] papers, you have only the abstract — do not infer detailed effect sizes, subgroup results, or precise confidence intervals from them.
- If the papers do not support consensus, explicitly say "No clear consensus from the supplied papers."
- Do not present this as a guideline unless a supplied paper is an official guideline or consensus statement.
- Every clinical claim must cite paper indices like [1] or [1, 3].
- Do not invent effect sizes, doses, contraindications, or guideline positions.
- Weight papers by their EBM score (higher = stronger study design) when judging consensus strength.

${freeEvidence ? `FREE/OPEN-ACCESS PAPERS:\n${freeEvidence}\n` : ''}${abstractEvidence ? `ABSTRACT-ONLY PAPERS:\n${abstractEvidence}\n` : ''}${guidelineSection}${knowledgeSection}
Return ONLY valid JSON with this exact shape:
{
  "statement": "2-4 sentence consensus synopsis, using cautious language and inline paper citations",
  "clinicalBottomLine": "one sentence for clinical discussion support, with citations",
  "areasOfAgreement": ["agreement point with citation [1]", "agreement point with citation [2]"],
  "areasOfUncertainty": ["uncertainty or evidence gap with citation [1]"],
  "conflictingSignals": ["conflict or nuance with citations [1, 2]"],
  "evidenceStrength": "HIGH|MODERATE|LOW|VERY_LOW",
  "strengthRationale": "one sentence explaining certainty from study design, consistency, directness and precision",
  "guidelineAlignment": {
    "status": "aligned|conflicting|not_addressed|guideline_stale|no_guideline_supplied",
    "summary": "one cautious sentence comparing supplied evidence with supplied guidelines, or saying no guideline was supplied",
    "guidelineRefs": [1]
  },
  "whatNotToOverclaim": ["unsupported overclaim to avoid"],
  "quizFocusPoints": ["concept a doctor should be quizzed on after reading this evidence"]
}`;
}

function normalizeStringArray(value, max = 5) {
    return Array.isArray(value)
        ? value.map((item) => safeString(item, 500)).filter(Boolean).slice(0, max)
        : [];
}

function normalizeGuidelineAlignment(value, guidelines = []) {
    const safe = value && typeof value === 'object' ? value : {};
    const validStatuses = ['aligned', 'conflicting', 'not_addressed', 'guideline_stale', 'no_guideline_supplied'];
    let status = validStatuses.includes(safe.status) ? safe.status : null;
    if (!status) status = guidelines.length > 0 ? 'not_addressed' : 'no_guideline_supplied';
    return {
        status,
        summary: safeString(safe.summary, 700) || (guidelines.length > 0
            ? 'Guidelines were supplied, but no defensible guideline alignment statement was generated.'
            : 'No guideline context was supplied for this synopsis.'),
        guidelineRefs: Array.isArray(safe.guidelineRefs)
            ? safe.guidelineRefs
                .map((ref) => Number(ref))
                .filter((ref) => Number.isInteger(ref) && ref >= 1 && ref <= guidelines.length)
                .slice(0, 5)
            : [],
    };
}

function normalizeSynopsis(raw, topic, freeArticles, abstractArticles, provider, model = null, guidelines = []) {
    const safe = raw && typeof raw === 'object' ? raw : {};
    const allArticles = [...freeArticles, ...abstractArticles];
    const sourceCount = allArticles.length;
    const normalized = {
        status: 'generated',
        topic,
        evidenceScope: 'free_open_access_and_abstracts',
        generatedAt: new Date().toISOString(),
        provider,
        model,
        freePaperCount: freeArticles.length,
        abstractPaperCount: abstractArticles.length,
        includedArticles: allArticles.map((a, i) => ({
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
            isAbstractOnly: !isFreeEvidence(a),
        })),
        statement: safeString(safe.statement, 1400) || 'No clear consensus from the supplied papers.',
        clinicalBottomLine: safeString(safe.clinicalBottomLine, 700),
        areasOfAgreement: filterCitedStringList(normalizeStringArray(safe.areasOfAgreement, 5), { sourceCount }),
        areasOfUncertainty: filterCitedStringList(normalizeStringArray(safe.areasOfUncertainty, 5), { sourceCount }),
        conflictingSignals: filterCitedStringList(normalizeStringArray(safe.conflictingSignals, 5), { sourceCount }),
        evidenceStrength: ['HIGH', 'MODERATE', 'LOW', 'VERY_LOW'].includes(safe.evidenceStrength)
            ? safe.evidenceStrength
            : 'LOW',
        strengthRationale: safeString(safe.strengthRationale, 600),
        guidelineAlignment: normalizeGuidelineAlignment(safe.guidelineAlignment, guidelines),
        whatNotToOverclaim: normalizeStringArray(safe.whatNotToOverclaim, 5),
        quizFocusPoints: normalizeStringArray(safe.quizFocusPoints, 6),
        disclaimer: AI_DISCLAIMER,
    };

    const statementValid = validateCitationRefs(normalized.statement, { sourceCount }).ok;
    if (!statementValid) {
        normalized.statement = 'No defensible cited consensus statement could be generated from the supplied papers.';
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
    limit = 8,
    abstractLimit = 8,
    preEnrichedArticles = null,
} = {}) {
    let freeArticles;
    let abstractArticles;
    if (preEnrichedArticles && Array.isArray(preEnrichedArticles.freeArticles) && Array.isArray(preEnrichedArticles.abstractArticles)) {
        freeArticles = preEnrichedArticles.freeArticles;
        abstractArticles = preEnrichedArticles.abstractArticles;
    } else {
        freeArticles = await enrichWithCachedFullText(selectFreeEvidence(articles, limit), cache, db);
        abstractArticles = selectAbstractEvidence(articles, abstractLimit);
    }

    if (freeArticles.length < 2 && abstractArticles.length < 2) {
        return {
            status: 'insufficient_free_evidence',
            topic,
            evidenceScope: 'free_open_access_and_abstracts',
            generatedAt: new Date().toISOString(),
            freePaperCount: freeArticles.length,
            abstractPaperCount: abstractArticles.length,
            includedArticles: [...freeArticles, ...abstractArticles].map((a, i) => ({
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
                isAbstractOnly: !isFreeEvidence(a),
            })),
            statement: 'No consensus synopsis generated because fewer than two papers were available in the evidence bouquet.',
            clinicalBottomLine: '',
            areasOfAgreement: [],
            areasOfUncertainty: ['Evidence set too small for a defensible consensus synopsis.'],
            conflictingSignals: [],
            evidenceStrength: 'VERY_LOW',
            strengthRationale: 'Insufficient evidence in the selected bouquet.',
            guidelineAlignment: normalizeGuidelineAlignment(null, []),
            whatNotToOverclaim: ['Do not infer consensus from a single paper.'],
            quizFocusPoints: [],
            disclaimer: AI_DISCLAIMER,
        };
    }

    const { provider, model: resolvedModel } = resolveProvider({ provider: 'auto', model: PINNED_MODELS.geminiQuality }, serverConfig);
    if (!provider) {
        return {
            status: 'provider_unavailable',
            topic,
            evidenceScope: 'free_open_access_and_abstracts',
            generatedAt: new Date().toISOString(),
            freePaperCount: freeArticles.length,
            abstractPaperCount: abstractArticles.length,
            includedArticles: [],
            statement: 'Consensus synopsis unavailable because no built-in LLM provider is configured.',
            clinicalBottomLine: '',
            areasOfAgreement: [],
            areasOfUncertainty: [],
            conflictingSignals: [],
            evidenceStrength: 'VERY_LOW',
            strengthRationale: 'No LLM provider configured.',
            guidelineAlignment: normalizeGuidelineAlignment(null, []),
            whatNotToOverclaim: [],
            quizFocusPoints: [],
            disclaimer: AI_DISCLAIMER,
        };
    }

    let guidelines = [];
    let topicKnowledge = null;
    if (db) {
        try {
            if (typeof db.getGuidelinesByTopic === 'function') {
                guidelines = await db.getGuidelinesByTopic(topic, { limit: 3 });
            }
        } catch (err) {
            logger.debug({ err, topic }, 'Failed to load guidelines for synopsis');
        }
        try {
            if (typeof db.getTopicKnowledge === 'function') {
                topicKnowledge = await db.getTopicKnowledge(topic);
            }
        } catch (err) {
            logger.debug({ err, topic }, 'Failed to load topic knowledge for synopsis');
        }
    }

    const ai = createAiService({ serverConfig, fetchImpl });
    const prompt = buildConsensusSynopsisPrompt(topic, freeArticles, abstractArticles, guidelines, topicKnowledge);
    const model = resolvedModel;
    const parsed = await ai.callStructured(prompt, provider, model, {
        temperature: TEMPERATURE.synopsis,
        maxOutputTokens: 2200,
        usage: { operation: 'consensus_synopsis', topic },
        allowBudgetSkip: true,
    });
    if (!parsed) {
        throw new Error('Consensus synopsis skipped — LLM budget exhausted');
    }
    const validated = validateAiOutput('consensus_synopsis', parsed, { allowDegrade: true });
    const synopsisPayload = validated.ok ? validated.data : validated.degraded;
    if (!validated.ok && !synopsisPayload) {
        throw new Error(`Consensus synopsis validation failed: ${(validated.errors || []).join('; ')}`);
    }
    return normalizeSynopsis(synopsisPayload, topic, freeArticles, abstractArticles, provider, model, guidelines);
}

async function generateConsensusSynopsisSafe(options, logger = console) {
    try {
        return await generateConsensusSynopsis(options);
    } catch (error) {
        if (logger?.warn) logger.warn({ err: error }, 'Consensus synopsis generation failed');
        const freeCount = selectFreeEvidence(options?.articles || [], options?.limit || 8).length;
        const abstractCount = selectAbstractEvidence(options?.articles || [], options?.abstractLimit || 5).length;
        return {
            status: 'generation_failed',
            topic: options?.topic || '',
            evidenceScope: 'free_open_access_and_abstracts',
            generatedAt: new Date().toISOString(),
            freePaperCount: freeCount,
            abstractPaperCount: abstractCount,
            includedArticles: [],
            statement: 'Consensus synopsis could not be generated for this search.',
            clinicalBottomLine: '',
            areasOfAgreement: [],
            areasOfUncertainty: ['The LLM synopsis step failed; review the primary sources directly.'],
            conflictingSignals: [],
            evidenceStrength: 'VERY_LOW',
            strengthRationale: 'Generation failed.',
            guidelineAlignment: normalizeGuidelineAlignment(null, []),
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
    selectAbstractEvidence,
    enrichWithCachedFullText,
    normalizeGuidelineAlignment,
};
