'use strict';

const logger = require('../config/logger');
const { evolveTopicKnowledge } = require('./topicEvolutionService');
const { fetchUnifiedEvidence } = require('./unifiedEvidenceSearch');
const { selectTopEvidence } = require('../utils/selectTopEvidence');

async function articlesFromKnowledgeSources(db, topic) {
    const stored = await db.getTopicKnowledge(topic).catch(() => null);
    const sources = Array.isArray(stored?.sourceArticles) ? stored.sourceArticles : [];
    return sources
        .map((s) => ({
            uid: s.uid || s.pmid || null,
            pmid: s.pmid || null,
            doi: s.doi || null,
            title: s.title || 'Unknown',
            journal: s.source || null,
            pubdate: s.pubdate || null,
            abstract: s.abstract || '',
        }))
        .filter((a) => a.title);
}

/**
 * Durable worker for watchtower / refresh-triggered topic evolution.
 * Re-evolves existing memory (unlike topic_seed which skips when already seeded).
 */
async function processTopicEvolutionJob({
    topic,
    articles: inputArticles = [],
    reason = 'refresh',
    forceProposal = false,
    serverConfig,
    fetchImpl,
    db,
    cache,
}) {
    const seedQuery = String(topic || '').trim();
    if (!seedQuery) {
        return { status: 'skipped', reason: 'missing_topic' };
    }

    let articles = Array.isArray(inputArticles) ? inputArticles.filter((a) => a && (a.title || a.uid || a.pmid)) : [];
    if (articles.length < 3) {
        articles = await articlesFromKnowledgeSources(db, seedQuery);
    }
    if (articles.length < 3 && serverConfig && fetchImpl) {
        try {
            const raw = await fetchUnifiedEvidence({
                query: seedQuery,
                safeLimit: 12,
                sourceList: ['pubmed', 'openalex'],
                serverConfig,
                fetch: fetchImpl,
                vectorList: [],
            });
            articles = selectTopEvidence(raw, 12);
        } catch (err) {
            logger.warn({ err, topic: seedQuery }, 'topic evolution job evidence fetch failed');
        }
    }

    if (articles.length < 3) {
        return { status: 'skipped', reason: 'insufficient_articles', articleCount: articles.length };
    }

    try {
        const result = await evolveTopicKnowledge({
            topic: seedQuery,
            articles: articles.slice(0, 12),
            serverConfig,
            fetchImpl,
            db,
            cache,
            allowLiveCommit: !forceProposal,
            forceProposal: Boolean(forceProposal),
        });
        return {
            status: 'completed',
            topic: seedQuery,
            triggerReason: reason,
            commitMode: result.commitMode,
            confidence: result.confidence,
            papers: result.paperCount,
            guidelines: result.guidelineCount,
        };
    } catch (err) {
        logger.warn({ err, topic: seedQuery, reason }, 'topic evolution job failed');
        return { status: 'failed', reason: err.message || 'evolution_failed' };
    }
}

module.exports = { processTopicEvolutionJob };
