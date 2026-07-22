'use strict';

const { searchGuidelines } = require('./guidelineService');
const { evolveTopicKnowledge } = require('./topicEvolutionService');
const logger = require('../config/logger');

/**
 * Auto-seed topic knowledge from search results.
 * Discovers guidelines first, then runs the Topic Evolution Pipeline so memory
 * is grounded in both papers and guidelines.
 */
async function processTopicSeedJob({ topic, articles = [], serverConfig, fetchImpl, db, cache }) {
    const seedQuery = String(topic || '').trim();
    if (!seedQuery || !articles.length) {
        return { status: 'skipped', reason: 'missing_topic_or_articles' };
    }

    const alreadySeeded = await db.getTopicKnowledge(seedQuery).catch((err) => {
        logger.warn({ err, topic: seedQuery }, 'getTopicKnowledge failed during topic seed');
        return null;
    });
    if (alreadySeeded) {
        return { status: 'skipped', reason: 'already_seeded' };
    }

    let guidelineCount = 0;
    try {
        const ncbiKey = serverConfig?.keys?.ncbi;
        const ncbiEmail = serverConfig?.keys?.ncbiEmail;
        const guidelines = await searchGuidelines(seedQuery, ncbiKey, ncbiEmail);
        guidelineCount = guidelines.length;
        for (const gl of guidelines) {
            await db.createGuideline({
                topic: seedQuery,
                sourceBody: gl.source || 'PubMed Guideline',
                sourceYear: gl.pubdate ? parseInt(String(gl.pubdate).slice(0, 4), 10) : null,
                recommendationText: gl.title,
                sourceUrl: gl.uid ? `https://pubmed.ncbi.nlm.nih.gov/${gl.uid}/` : null,
            }).catch(() => {});
        }
        if (guidelines.length > 0) {
            logger.info({ topic: seedQuery, guidelines: guidelines.length }, 'Pre-stored guidelines before topic evolution seed');
        }
    } catch (glErr) {
        logger.warn({ err: glErr, topic: seedQuery }, 'Auto guideline search failed before topic evolution seed');
    }

    try {
        const result = await evolveTopicKnowledge({
            topic: seedQuery,
            articles: articles.slice(0, 12),
            serverConfig,
            fetchImpl,
            db,
            cache,
            allowLiveCommit: true,
        });
        return {
            status: 'completed',
            topic: seedQuery,
            papers: result.paperCount,
            mcqCount: result.jobs?.mcqs?.count || result.jobs?.mcqs?.mcqs?.length || 0,
            guidelineCount: Math.max(guidelineCount, result.guidelineCount || 0),
            commitMode: result.commitMode,
            confidence: result.confidence,
        };
    } catch (err) {
        logger.warn({ err, topic: seedQuery }, 'Topic evolution seed failed');
        return { status: 'failed', reason: err.message || 'evolution_failed' };
    }
}

module.exports = { processTopicSeedJob };
