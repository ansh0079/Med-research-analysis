'use strict';
const { assessTopicRelevance, classifyImportedDocument } = require('../utils/importEvidenceQuality');

function tokenize(text) {
    return String(text || '').toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 3);
}

function tokenSet(text) {
    return new Set(tokenize(text));
}

function jaccard(a, b) {
    if (!a.size || !b.size) return 0;
    let overlap = 0;
    for (const value of a) if (b.has(value)) overlap += 1;
    return overlap / Math.max(1, a.size + b.size - overlap);
}

function charTrigrams(text) {
    const compact = String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const grams = new Set();
    for (const part of compact.split(/\s+/).filter(Boolean)) {
        const padded = ` ${part} `;
        for (let i = 0; i < Math.max(0, padded.length - 2); i += 1) {
            grams.add(padded.slice(i, i + 3));
        }
    }
    return grams;
}

function articleYear(article = {}) {
    const year = Number(article.year || String(article.pubdate || '').slice(0, 4));
    return Number.isFinite(year) ? year : 0;
}

function mapPubTypesForLocalDocument(doc = {}) {
    const classified = classifyImportedDocument({ title: doc.title });
    const tier = String(doc.evidence_tier || doc.document_label || '').toLowerCase();
    if (classified === 'clinical_practice_guideline' || tier.includes('guideline')) return ['Practice Guideline'];
    if (classified === 'systematic_review_meta_analysis' || tier.includes('meta_analysis')) return ['Systematic Review', 'Meta-Analysis'];
    if (tier.includes('systematic_review')) return ['Systematic Review'];
    if (classified === 'randomized_controlled_trial' || tier.includes('trial')) return ['Randomized Controlled Trial'];
    if (classified === 'review_article' || tier.includes('review')) return ['Review'];
    return [];
}

function localHybridScore(article = {}, query = '') {
    const qTokens = tokenSet(query);
    const titleTokens = tokenSet(article.title);
    const abstractTokens = tokenSet(article.abstract);
    const qTrigrams = charTrigrams(query);
    const textTrigrams = charTrigrams(`${article.title || ''} ${article.abstract || ''}`);
    const citationCount = Number(article.citationCount ?? article.pmcrefcount ?? 0) || 0;
    const year = articleYear(article);
    const age = year ? Math.max(0, new Date().getFullYear() - year) : 20;
    const lexical = (jaccard(qTokens, titleTokens) * 0.55) + (jaccard(qTokens, abstractTokens) * 0.25);
    const semanticLite = jaccard(qTrigrams, textTrigrams) * 0.2;
    const impact = Math.min(0.12, Math.log10(citationCount + 1) / 40);
    const recency = Math.max(0, 1 - (age / 20)) * 0.08;
    const sourceBonus = article._source === 'pubmed' ? 0.03 : (article.documentId ? 0.05 : 0);
    return lexical + semanticLite + impact + recency + sourceBonus;
}

function rankLocalArticlesHybrid(articles = [], query = '', limit = 20) {
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    return (Array.isArray(articles) ? articles : [])
        .map((article) => ({
            ...article,
            _localRetrieval: true,
            _localRetrievalMode: 'hybrid_lexical_semantic_lite',
            _localRetrievalScore: Number(localHybridScore(article, query).toFixed(4)),
        }))
        .sort((a, b) => (b._localRetrievalScore || 0) - (a._localRetrievalScore || 0))
        .slice(0, safeLimit);
}

async function searchLocalArticleCache(db, {
    query,
    limit = 20,
    enabled = String(process.env.LOCAL_RETRIEVAL_ENABLED || 'true').toLowerCase() !== 'false',
} = {}) {
    if (!enabled || (!db?.searchCachedArticlesLocal && !db?.getLocalTopicDocuments && !db?.searchGuidelineDocumentsForTopic) || !query) {
        return { articles: [], used: false, available: Boolean(db?.searchCachedArticlesLocal || db?.getLocalTopicDocuments || db?.searchGuidelineDocumentsForTopic) };
    }
    const fetchLimit = Math.min(Math.max(Number(limit) || 20, 1) * 4, 100);
    const [cached, documents, topicalDocuments] = await Promise.all([
        db.searchCachedArticlesLocal ? db.searchCachedArticlesLocal(query, { limit: fetchLimit }).catch(() => []) : [],
        db.getLocalTopicDocuments ? db.getLocalTopicDocuments(query, { limit: 16 }).catch(() => []) : [],
        db.searchGuidelineDocumentsForTopic ? db.searchGuidelineDocumentsForTopic(query, { limit: 16 }).catch(() => []) : [],
    ]);
    const rawDocs = [...documents, ...topicalDocuments];
    const seenDocIds = new Set();
    const uniqueDocs = rawDocs.filter((doc) => {
        if (!doc) return false;
        const k = doc.id != null ? `id:${doc.id}` : String(doc.pmid || doc.pmcid || doc.doi || doc.title || '');
        if (!k || seenDocIds.has(k)) return false;
        seenDocIds.add(k);
        return true;
    });
    const local = uniqueDocs.map((doc) => ({
        uid: doc.pmid || doc.pmcid || doc.doi || (doc.id != null ? `doc:${doc.id}` : undefined),
        pmid: doc.pmid, pmcid: doc.pmcid, doi: doc.doi, title: doc.title,
        abstract: doc.text_excerpt, pubdate: String(doc.source_year || ''),
        year: doc.source_year || undefined,
        journal: doc.source_body, source: 'local', _source: 'local',
        url: doc.source_url, documentId: doc.id, fullTextSource: doc.full_text_source,
        pubtype: mapPubTypesForLocalDocument(doc),
    })).filter((article) => assessTopicRelevance(query, article).accepted);
    const articles = [...new Map([...cached, ...local].map((article) => [String(article.pmid || article.uid || article.doi), article])).values()];
    const ranked = rankLocalArticlesHybrid(articles, query, limit);
    return {
        articles: ranked,
        used: ranked.length > 0,
        available: true,
        mode: 'hybrid_lexical_semantic_lite',
        candidateCount: Array.isArray(articles) ? articles.length : 0,
    };
}

module.exports = {
    localHybridScore,
    rankLocalArticlesHybrid,
    searchLocalArticleCache,
    mapPubTypesForLocalDocument,
};
