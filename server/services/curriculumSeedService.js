'use strict';

const logger = require('../config/logger');
const { fetchUnifiedEvidence } = require('./unifiedEvidenceSearch');
const { selectTopEvidence } = require('../utils/selectTopEvidence');
const { runFullSynthesisGeneration } = require('./synthesisGenerationCore');
const { runPaperSynopsisGeneration } = require('./paperSynopsisCore');
const { alignTopicClaimsWithGuidelines } = require('./claimGuidelineEngine');

function addDays(date, days) {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next.toISOString();
}

function reviewDueForVolatility(volatility, now = new Date()) {
    const value = String(volatility || '').toLowerCase();
    if (value === 'high') return addDays(now, 30);
    if (value === 'stable' || value === 'low') return addDays(now, 180);
    return addDays(now, 90);
}

function clampLimit(value, fallback, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(Math.max(Math.floor(n), min), max);
}

async function seedCurriculumTopic({
    db,
    topicId,
    serverConfig,
    fetchImpl,
    cache,
    provider = 'auto',
    limits = {},
    log = logger,
}) {
    if (!db) throw new Error('db is required');
    const topic = await db.getCurriculumSeedTopic(topicId);
    if (!topic) throw new Error('Curriculum topic not found');

    const searchLimit = clampLimit(limits.searchLimit, 24, 5, 50);
    const synthesisLimit = clampLimit(limits.synthesisArticles, 8, 3, 15);
    const synopsisLimit = clampLimit(limits.synopsisArticles, 3, 0, 6);
    const now = new Date();

    await db.updateCurriculumSeedStatus(topic.id, {
        seedStatus: 'seeding',
        reviewDueAt: reviewDueForVolatility(topic.volatility, now),
    });

    try {
        const rawArticles = await fetchUnifiedEvidence({
            query: topic.suggestedQuery || topic.displayName,
            safeLimit: searchLimit,
            sourceList: ['pubmed', 'openalex', 'semantic'],
            serverConfig,
            fetch: fetchImpl,
            vectorList: [],
        });
        const selectedArticles = selectTopEvidence(rawArticles, synthesisLimit);
        if (selectedArticles.length < 1) {
            const updatedTopic = await db.updateCurriculumSeedStatus(topic.id, {
                seedStatus: 'failed_low_recall',
                lastSeededAt: new Date().toISOString(),
                claimCount: 0,
                reviewDueAt: addDays(new Date(), 7),
            });
            return {
                topic: updatedTopic,
                articleCount: 0,
                selectedArticleCount: 0,
                synopsisCount: 0,
                synopsisFailures: [],
                guidelineAlignment: null,
                warning: 'No evidence articles were retrieved for this seed topic.',
            };
        }

        const synthesis = await runFullSynthesisGeneration({
            articles: selectedArticles,
            topic: topic.displayName,
            provider,
            db,
            cache,
            serverConfig,
            fetchImpl,
        });

        const synopsisFailures = [];
        let synopsisCount = 0;
        for (const article of selectedArticles.slice(0, synopsisLimit)) {
            try {
                await runPaperSynopsisGeneration({
                    article,
                    topic: topic.displayName,
                    provider,
                    db,
                    cache,
                    serverConfig,
                    fetchImpl,
                    log,
                });
                synopsisCount += 1;
            } catch (err) {
                synopsisFailures.push({
                    uid: article.uid || article.pmid || article.doi || article.title,
                    title: article.title,
                    error: err.message,
                });
                log.warn({ err, topic: topic.displayName, articleUid: article.uid }, 'curriculum seed synopsis failed');
            }
        }

        const guidelineAlignment = await alignTopicClaimsWithGuidelines(db, topic.displayName, {
            limit: 40,
            apply: true,
        }).catch((err) => {
            log.warn({ err, topic: topic.displayName }, 'curriculum seed guideline alignment failed');
            return { processed: 0, results: [], error: err.message };
        });
        const claims = await db.listTeachingObjectClaimsForTopic(topic.displayName, { limit: 500 }).catch((err) => {
            log.warn({ err, topic: topic.displayName }, 'curriculum seed claim count failed');
            return [];
        });

        const updatedTopic = await db.updateCurriculumSeedStatus(topic.id, {
            seedStatus: synopsisFailures.length > 0 ? 'seeded_with_warnings' : 'seeded',
            lastSeededAt: new Date().toISOString(),
            lastSynthesisAt: synthesis.timestamp || new Date().toISOString(),
            claimCount: claims.length,
            reviewDueAt: reviewDueForVolatility(topic.volatility, new Date()),
        });

        return {
            topic: updatedTopic,
            articleCount: rawArticles.length,
            selectedArticleCount: selectedArticles.length,
            synthesisJobKey: synthesis.jobKey,
            synopsisCount,
            synopsisFailures,
            claimCount: claims.length,
            guidelineAlignment,
        };
    } catch (err) {
        await db.updateCurriculumSeedStatus(topic.id, {
            seedStatus: 'failed',
            lastSeededAt: new Date().toISOString(),
            reviewDueAt: addDays(new Date(), 7),
        }).catch(() => null);
        throw err;
    }
}

module.exports = {
    seedCurriculumTopic,
    reviewDueForVolatility,
};
