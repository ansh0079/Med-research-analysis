'use strict';

/**
 * Claim–evidence relevance scoring.
 * Sync path: keyword overlap against title/abstract + cached full-text sections.
 * Async path: embedding cosine when keys are available, blended with keyword score.
 */

const STOPWORDS = new Set([
    'the', 'and', 'that', 'this', 'with', 'from', 'have', 'been', 'were', 'was',
    'their', 'there', 'which', 'into', 'about', 'after', 'before', 'between',
    'through', 'during', 'without', 'within', 'among', 'these', 'those', 'than',
    'then', 'also', 'only', 'other', 'such', 'more', 'most', 'some', 'when',
    'where', 'what', 'while', 'would', 'could', 'should', 'using', 'based',
]);

const DEFAULT_THRESHOLD = Number(process.env.CITATION_RELEVANCE_MIN_SCORE || 0.25);

function tokenize(text) {
    return String(text || '')
        .toLowerCase()
        .split(/[^a-z0-9%+-]+/)
        .filter((w) => w.length > 3 && !STOPWORDS.has(w))
        .slice(0, 40);
}

function articleEvidenceText(article = {}) {
    const sectionText = Array.isArray(article._fullTextSections)
        ? article._fullTextSections.map((s) => (typeof s === 'string' ? s : s?.text || s?.content || '')).join(' ')
        : (article._fullTextSections && typeof article._fullTextSections === 'object'
            ? Object.values(article._fullTextSections).map((v) => String(v || '')).join(' ')
            : '');
    const sectionKeys = Array.isArray(article._fullTextSectionKeys)
        ? article._fullTextSectionKeys.join(' ')
        : '';
    return [
        article.title || '',
        article.abstract || '',
        sectionText,
        sectionKeys,
    ].join(' ').replace(/\s+/g, ' ').trim();
}

function cosineSimilarity(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) return 0;
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i += 1) {
        const x = Number(a[i]) || 0;
        const y = Number(b[i]) || 0;
        dot += x * y;
        na += x * x;
        nb += y * y;
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom > 0 ? dot / denom : 0;
}

/**
 * Sync keyword / lexical relevance against title, abstract, and full-text excerpts.
 * @returns {{ valid: boolean, relevanceScore: number, reason: string, method: 'keyword'|'unavailable' }}
 */
function scoreClaimSourceRelevanceSync(claimText, article, { threshold = DEFAULT_THRESHOLD } = {}) {
    if (!article) {
        return { valid: false, relevanceScore: 0, reason: 'Source index out of bounds', method: 'unavailable' };
    }

    const evidence = articleEvidenceText(article).toLowerCase();
    if (evidence.length < 20) {
        return {
            valid: true,
            relevanceScore: 0.5,
            reason: 'Abstract not available for validation',
            method: 'keyword',
        };
    }

    const claimWords = tokenize(claimText);
    if (claimWords.length === 0) {
        return { valid: false, relevanceScore: 0, reason: 'Claim too short for validation', method: 'keyword' };
    }

    const overlap = claimWords.filter((word) => evidence.includes(word)).length;
    const relevanceScore = Math.round((overlap / claimWords.length) * 100) / 100;
    const minScore = Number(threshold);
    return {
        valid: relevanceScore > minScore,
        relevanceScore,
        reason: relevanceScore <= minScore
            ? `Low claim–evidence overlap (${Math.round(relevanceScore * 100)}%) with cited source`
            : 'Acceptable relevance',
        method: 'keyword',
    };
}

/**
 * Async relevance: embedding cosine blended with keyword score when embeddings work.
 * Falls back to sync keyword scoring.
 */
async function scoreClaimSourceRelevance(claimText, article, {
    keys = null,
    threshold = DEFAULT_THRESHOLD,
} = {}) {
    const keyword = scoreClaimSourceRelevanceSync(claimText, article, { threshold });
    if (!keys || (!keys.openaiKey && !keys.huggingfaceKey && !keys.openai && !keys.huggingface)) {
        return keyword;
    }

    try {
        const { generateEmbedding, articleToEmbedText } = require('../embeddings');
        const embedKeys = {
            openaiKey: keys.openaiKey || keys.openai || null,
            huggingfaceKey: keys.huggingfaceKey || keys.huggingface || null,
        };
        const evidenceForEmbed = articleEvidenceText(article) || articleToEmbedText(article);
        const [claimEmb, articleEmb] = await Promise.all([
            generateEmbedding(String(claimText || '').slice(0, 2000), embedKeys),
            generateEmbedding(String(evidenceForEmbed || '').slice(0, 4000), embedKeys),
        ]);
        const cosine = cosineSimilarity(claimEmb, articleEmb);
        // Prefer the stronger of lexical vs embedding signal; require either to clear threshold.
        const relevanceScore = Math.round(Math.max(keyword.relevanceScore, cosine) * 100) / 100;
        const minScore = Number(threshold);
        return {
            valid: relevanceScore > minScore,
            relevanceScore,
            reason: relevanceScore <= minScore
                ? `Low claim–evidence similarity (${Math.round(relevanceScore * 100)}%) with cited source`
                : 'Acceptable relevance',
            method: cosine >= keyword.relevanceScore ? 'embedding' : 'keyword+embedding',
            keywordScore: keyword.relevanceScore,
            embeddingScore: Math.round(cosine * 100) / 100,
        };
    } catch {
        return keyword;
    }
}

module.exports = {
    DEFAULT_THRESHOLD,
    tokenize,
    articleEvidenceText,
    cosineSimilarity,
    scoreClaimSourceRelevanceSync,
    scoreClaimSourceRelevance,
};
