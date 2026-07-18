'use strict';

const logger = require('../config/logger');
const { safeFetch } = require('../utils/fetch');
const { fetchUnifiedEvidence } = require('./unifiedEvidenceSearch');
const { selectTopEvidence } = require('../utils/selectTopEvidence');
const { runFullSynthesisGeneration } = require('./synthesisGenerationCore');
const { runPaperSynopsisGeneration } = require('./paperSynopsisCore');
const { alignTopicClaimsWithGuidelines } = require('./claimGuidelineEngine');
const { runGuidelineEnrichmentForTopic } = require('./guidelineSeedService');
const { mergeSourceArticles } = require('./flagshipTopicOps');

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

function determineSeedStatus({ synopsisFailures, contentCounts, claimCount }) {
    const hasNoPapers = (contentCounts?.papers || 0) === 0;
    const hasNoClaims = (claimCount || 0) === 0 && (contentCounts?.claims || 0) === 0;
    if (hasNoPapers && hasNoClaims) return 'failed';
    if (synopsisFailures.length > 0 || hasNoPapers || hasNoClaims) return 'seeded_with_warnings';
    return 'seeded';
}

function clampLimit(value, fallback, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(Math.max(Math.floor(n), min), max);
}

function normalizeTopicValue(db, topic) {
    if (db && typeof db.normalizeTopic === 'function') return db.normalizeTopic(topic);
    return String(topic || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 180);
}

async function seedCurriculumTopic({
    db,
    topicId,
    serverConfig,
    fetchImpl,
    cache,
    provider = 'auto',
    limits = {},
    sourceList = ['pubmed', 'openalex', 'semantic'],
    log = logger,
}) {
    if (!db) throw new Error('db is required');
    if (!fetchImpl) fetchImpl = safeFetch;
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
            sourceList,
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

        const guidelineEnrichment = await runGuidelineEnrichmentForTopic({
            db,
            topicName: topic.displayName,
            serverConfig,
            fetchImpl,
            log,
        }).catch((err) => {
            log.warn({ err, topic: topic.displayName }, 'curriculum seed guideline enrichment failed');
            return { guidelineSummary: null, guidelineMcqs: { status: 'error', mcqCount: 0 } };
        });

        const claims = await db.listTeachingObjectClaimsForTopic(topic.displayName, { limit: 500 }).catch((err) => {
            log.warn({ err, topic: topic.displayName }, 'curriculum seed claim count failed');
            return [];
        });

        const contentCounts = typeof db.getTopicContentCounts === 'function'
            ? await db.getTopicContentCounts(normalizeTopicValue(db, topic.displayName))
            : { papers: selectedArticles.length, claims: claims.length };
        const seedStatus = determineSeedStatus({
            synopsisFailures,
            contentCounts,
            claimCount: claims.length,
        });
        if (seedStatus !== 'seeded') {
            log.warn({
                topic: topic.displayName,
                seedStatus,
                contentCounts,
                synopsisFailures: synopsisFailures.length,
            }, 'curriculum seed completed with content gaps');
        }

        const updatedTopic = await db.updateCurriculumSeedStatus(topic.id, {
            seedStatus,
            lastSeededAt: new Date().toISOString(),
            lastSynthesisAt: synthesis.timestamp || new Date().toISOString(),
            claimCount: claims.length,
            reviewDueAt: seedStatus === 'seeded'
                ? reviewDueForVolatility(topic.volatility, new Date())
                : addDays(new Date(), 1),
        });

        // Bridge curriculum seed → topic_knowledge so flagship readiness can see source_articles.
        let topicKnowledge = null;
        if (typeof db.upsertTopicKnowledge === 'function' && selectedArticles.length >= 2) {
            const sourceArticles = selectedArticles.slice(0, 10).map((a, i) => ({
                sourceIndex: i + 1,
                uid: a.uid || (a.pmid ? `pubmed-${a.pmid}` : null),
                pmid: a.pmid || null,
                doi: a.doi || null,
                title: a.title || null,
                source: a.source || a._source || null,
                pubdate: a.pubdate || a.year || null,
            }));
            const stubKnowledge = {
                mentorMessage: `${topic.displayName}: seeded from curriculum evidence pipeline.`,
                teachingPoints: [],
                seminalPapers: sourceArticles.slice(0, 5).map((a) => ({
                    pmid: a.pmid,
                    title: a.title,
                    uid: a.uid,
                })),
                keywords: [topic.displayName, topic.suggestedQuery].filter(Boolean),
                seededFrom: 'curriculumSeedService',
                seededAt: new Date().toISOString(),
            };
            try {
                const existing = await db.getTopicKnowledge(topic.displayName).catch(() => null);
                const protectedStatus = ['human_reviewed', 'locked', 'verified'].includes(
                    String(existing?.status || '').toLowerCase()
                );
                if (!protectedStatus) {
                    const mergedSources = mergeSourceArticles(existing?.sourceArticles || [], sourceArticles);
                    topicKnowledge = await db.upsertTopicKnowledge(
                        topic.displayName,
                        existing?.knowledge && Object.keys(existing.knowledge || {}).length
                            ? existing.knowledge
                            : stubKnowledge,
                        mergedSources,
                        existing ? 'ai_refreshed' : 'ai_generated',
                        Math.max(Number(existing?.confidence || 0), 0.65)
                    );
                } else {
                    topicKnowledge = existing;
                }
            } catch (err) {
                log.warn({ err, topic: topic.displayName }, 'curriculum seed topic_knowledge upsert failed');
            }
        }

        return {
            topic: updatedTopic,
            articleCount: rawArticles.length,
            selectedArticleCount: selectedArticles.length,
            synthesisJobKey: synthesis.jobKey,
            synopsisCount,
            synopsisFailures,
            claimCount: claims.length,
            guidelineAlignment,
            guidelineEnrichment,
            contentCounts,
            topicKnowledge: topicKnowledge ? { id: topicKnowledge.id, status: topicKnowledge.status } : null,
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
    determineSeedStatus,
};
