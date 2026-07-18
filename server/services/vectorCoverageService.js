'use strict';

/**
 * Ensure article_cache vector coverage for bouquet / flagship papers.
 */

const logger = require('../config/logger');

function orderArticlesForVectorCoverage(articles = [], bouquetRanking = [], limit = 12) {
    const bouquetUids = new Set(
        (Array.isArray(bouquetRanking) ? bouquetRanking : [])
            .slice(0, Math.max(limit, 1))
            .map((row) => String(row?.uid || row?.articleUid || '').toLowerCase())
            .filter(Boolean)
    );
    const list = Array.isArray(articles) ? articles.filter(Boolean) : [];
    const bouquetArticles = list.filter((a) => bouquetUids.has(String(a.uid || '').toLowerCase()));
    const ordered = [...bouquetArticles, ...list];
    const seen = new Set();
    const out = [];
    for (const article of ordered) {
        if (out.length >= limit) break;
        const key = String(article?.doi || article?.pmid || article?.uid || '').toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push({
            article,
            isBouquet: bouquetUids.has(String(article.uid || '').toLowerCase()),
        });
    }
    return out;
}

/**
 * Enqueue embedding jobs for bouquet-first articles (fire-and-forget safe).
 */
function enqueueVectorIndexForBouquetArticles({
    articles = [],
    bouquetRanking = [],
    limit = 12,
    enqueueFn = null,
} = {}) {
    let enqueue = enqueueFn;
    if (!enqueue) {
        try {
            ({ enqueueArticleForEmbedding: enqueue } = require('../saved-embedding-worker'));
        } catch (err) {
            logger.debug({ err }, 'enqueueVectorIndexForBouquetArticles: embedding worker unavailable');
            return { enqueued: 0, candidates: 0 };
        }
    }
    if (typeof enqueue !== 'function') return { enqueued: 0, candidates: 0 };

    const ordered = orderArticlesForVectorCoverage(articles, bouquetRanking, limit);
    let enqueued = 0;
    for (const { article } of ordered) {
        try {
            enqueue(article);
            enqueued += 1;
        } catch (err) {
            logger.debug({ err, uid: article?.uid }, 'vector coverage enqueue failed');
        }
    }
    return { enqueued, candidates: ordered.length };
}

/**
 * Collect seminal / landmark papers from topic_knowledge for offline backfill.
 */
async function collectFlagshipArticlesForVectorBackfill(db, { topics = [], limitPerTopic = 12 } = {}) {
    if (!db?.getTopicKnowledge && !db?.all) return [];
    let topicList = Array.isArray(topics) ? topics.filter(Boolean) : [];
    if (!topicList.length && typeof db.all === 'function') {
        const rows = await db.all(
            `SELECT DISTINCT topic FROM topic_knowledge ORDER BY updated_at DESC LIMIT 25`
        ).catch(() => []);
        topicList = (rows || []).map((r) => r.topic).filter(Boolean);
    }
    const articles = [];
    const seen = new Set();
    for (const topic of topicList) {
        const knowledge = await db.getTopicKnowledge?.(topic).catch(() => null);
        const seminal = Array.isArray(knowledge?.knowledge?.seminalPapers)
            ? knowledge.knowledge.seminalPapers
            : [];
        for (const p of seminal.slice(0, limitPerTopic)) {
            const uid = String(p.uid || p.pmid || p.doi || '').trim();
            if (!uid || seen.has(uid.toLowerCase())) continue;
            seen.add(uid.toLowerCase());
            articles.push({
                uid,
                pmid: p.pmid || null,
                doi: p.doi || null,
                title: p.title || 'Untitled',
                abstract: p.abstract || '',
                _source: 'flagship_backfill',
            });
        }
    }
    return articles;
}

module.exports = {
    orderArticlesForVectorCoverage,
    enqueueVectorIndexForBouquetArticles,
    collectFlagshipArticlesForVectorBackfill,
};
