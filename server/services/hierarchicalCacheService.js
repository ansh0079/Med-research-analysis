'use strict';

/**
 * Hierarchical Caching Service
 * 
 * Implements multi-level caching to reduce redundant synthesis regeneration:
 * - Level 1: Topic-level summaries (long TTL, 7 days)
 * - Level 2: Article-specific insights (medium TTL, 48 hours)
 * - Level 3: Full synthesis (short TTL, 24 hours, invalidated only by NEW articles)
 */

const crypto = require('crypto');

const CACHE_TTL = {
    topicSummary: 7 * 24 * 3600,      // 7 days
    articleInsight: 48 * 3600,         // 48 hours
    fullSynthesis: 24 * 3600,          // 24 hours
    incrementalUpdate: 12 * 3600       // 12 hours
};

function topicSummaryKey(topic) {
    const normalized = String(topic || '').toLowerCase().replace(/\s+/g, '-');
    return `cache:l1:topic-summary:${normalized}`;
}

function articleInsightKey(articleUid) {
    return `cache:l2:article:${articleUid}`;
}

function synthesisKey(topic, mostRecentArticleUid) {
    const topicNorm = String(topic || '').toLowerCase().replace(/\s+/g, '-');
    return `cache:l3:synthesis:${topicNorm}:latest:${mostRecentArticleUid}`;
}

function incrementalUpdateKey(topic, updateHash) {
    const topicNorm = String(topic || '').toLowerCase().replace(/\s+/g, '-');
    return `cache:incremental:${topicNorm}:${updateHash}`;
}

/**
 * Attempts to retrieve synthesis from hierarchical cache
 */
async function getHierarchicalSynthesis(cache, topic, articles) {
    if (!cache || !Array.isArray(articles) || articles.length === 0) {
        return { hit: false, level: null, data: null };
    }
    
    // Sort articles by date to identify most recent
    const sortedArticles = [...articles].sort((a, b) => {
        const dateA = new Date(a.pubdate || a.year || 0);
        const dateB = new Date(b.pubdate || b.year || 0);
        return dateB - dateA;
    });
    
    const mostRecent = sortedArticles[0];
    
    // Level 3: Try full synthesis cache (keyed by most recent article)
    const l3Key = synthesisKey(topic, mostRecent.uid);
    const l3Hit = await cache.getAsync?.(l3Key).catch(() => null);
    if (l3Hit) {
        return { hit: true, level: 3, data: l3Hit, cacheKey: l3Key };
    }
    
    // Level 2: Try to reconstruct from article insights
    const articleKeys = sortedArticles.slice(0, 10).map(a => articleInsightKey(a.uid));
    const articleInsights = await cache.mget?.(articleKeys).catch(() => []);
    
    if (articleInsights && articleInsights.filter(Boolean).length >= 5) {
        // We have enough article-level insights to reconstruct
        return {
            hit: true,
            level: 2,
            data: { articleInsights, requiresAggregation: true },
            cacheKey: l3Key
        };
    }
    
    // Level 1: Try topic summary (provides general context)
    const l1Key = topicSummaryKey(topic);
    const l1Hit = await cache.getAsync?.(l1Key).catch(() => null);
    if (l1Hit) {
        return {
            hit: true,
            level: 1,
            data: l1Hit,
            cacheKey: l1Key,
            requiresFullGeneration: true
        };
    }
    
    return { hit: false, level: null, data: null };
}

/**
 * Stores synthesis in hierarchical cache
 */
async function setHierarchicalSynthesis(cache, topic, articles, synthesisResult) {
    if (!cache || !synthesisResult) return;
    
    const sortedArticles = [...articles].sort((a, b) => {
        const dateA = new Date(a.pubdate || a.year || 0);
        const dateB = new Date(b.pubdate || b.year || 0);
        return dateB - dateA;
    });
    
    const mostRecent = sortedArticles[0];
    
    // Level 3: Store full synthesis
    const l3Key = synthesisKey(topic, mostRecent.uid);
    await cache.setAsync?.(l3Key, synthesisResult, CACHE_TTL.fullSynthesis).catch(() => {});
    
    // Level 2: Extract and store article-specific insights
    if (synthesisResult.sources && Array.isArray(synthesisResult.sources)) {
        for (const source of synthesisResult.sources.slice(0, 10)) {
            const article = articles.find(a => a.uid === source.uid);
            if (article) {
                const insight = extractArticleInsight(synthesisResult, source.uid);
                const l2Key = articleInsightKey(source.uid);
                await cache.setAsync?.(l2Key, insight, CACHE_TTL.articleInsight).catch(() => {});
            }
        }
    }
    
    // Level 1: Store topic summary
    const l1Key = topicSummaryKey(topic);
    const topicSummary = {
        topic,
        clinicalBottomLine: synthesisResult.synthesis?.clinicalBottomLine,
        evidenceGrade: synthesisResult.synthesis?.evidenceGrade,
        keyFindings: (synthesisResult.synthesis?.keyFindings || []).slice(0, 3),
        generatedAt: synthesisResult.timestamp,
        articleCount: articles.length
    };
    await cache.setAsync?.(l1Key, topicSummary, CACHE_TTL.topicSummary).catch(() => {});
}

/**
 * Checks if synthesis needs regeneration based on new articles
 */
function needsRegeneration(cachedSynthesis, newArticles) {
    if (!cachedSynthesis || !cachedSynthesis.sources) return true;
    
    const cachedUids = new Set(cachedSynthesis.sources.map(s => s.uid));
    const newArticleUids = newArticles.map(a => a.uid);
    
    // Check if there are NEW articles not in cache
    const hasNewArticles = newArticleUids.some(uid => !cachedUids.has(uid));
    
    // Check if cached synthesis is stale (>24 hours)
    const cacheAge = Date.now() - new Date(cachedSynthesis.timestamp).getTime();
    const isStale = cacheAge > CACHE_TTL.fullSynthesis * 1000;
    
    return hasNewArticles || isStale;
}

/**
 * Extracts article-specific insights from full synthesis
 */
function extractArticleInsight(synthesisResult, articleUid) {
    const source = synthesisResult.sources?.find(s => s.uid === articleUid);
    if (!source) return null;
    
    return {
        uid: articleUid,
        title: source.title,
        // Extract claims that cite this article
        relevantClaims: (synthesisResult.synthesis?.keyFindings || [])
            .filter(finding => {
                const text = typeof finding === 'string' ? finding : finding.text || '';
                const sourceIndex = synthesisResult.sources.indexOf(source) + 1;
                return text.includes(`[${sourceIndex}]`);
            })
            .slice(0, 3),
        extractedAt: new Date().toISOString()
    };
}

module.exports = {
    getHierarchicalSynthesis,
    setHierarchicalSynthesis,
    needsRegeneration,
    CACHE_TTL,
    topicSummaryKey,
    articleInsightKey,
    synthesisKey
};
