'use strict';

const crypto = require('crypto');
const { aiGenerationQueue } = require('./jobQueue');
const { enqueueAiGenerationJobIfClaimed } = require('./aiGenerationJobEnqueue');

function stableHash(value) {
    return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function topicSeedJobKey(topic) {
    const normalized = String(topic || '').trim().toLowerCase();
    return `topic-seed:${stableHash({ topic: normalized }).slice(0, 40)}`;
}

function guidelineAlignJobKey(topic) {
    const normalized = String(topic || '').trim().toLowerCase();
    return `guideline-align:${stableHash({ topic: normalized }).slice(0, 40)}`;
}

function pdfIndexJobKey(article) {
    const id = article?.doi || article?.pmid || article?.pmcid || article?.uid || article?.title || 'unknown';
    return `pdf-index:${stableHash({ id: String(id).toLowerCase() }).slice(0, 40)}`;
}

function slimArticleForPdfJob(article) {
    return {
        uid: article.uid || null,
        doi: article.doi || null,
        pmid: article.pmid || null,
        pmcid: article.pmcid || null,
        title: article.title || null,
        isFree: article.isFree || false,
        openAccess: article.openAccess || false,
        openAccessUrl: article.openAccessUrl || null,
        fullTextUrl: article.fullTextUrl || null,
    };
}

function hasDurableJobStore(db) {
    return typeof db?.getAiGenerationJobByKey === 'function'
        && typeof db?.createAiGenerationJob === 'function'
        && typeof db?.markAiGenerationJobRunning === 'function'
        && typeof db?.completeAiGenerationJob === 'function'
        && typeof db?.failAiGenerationJob === 'function';
}

async function enqueueProcessJob({ db, jobKey, cache, logger, priority = 0, label }) {
    return enqueueAiGenerationJobIfClaimed({
        db,
        jobKey,
        logger,
        cache,
        enqueueFn: () => aiGenerationQueue.enqueueNamed('process', { jobKey }, {
            label: label || `${jobKey.split(':')[0]}:${String(jobKey).slice(0, 24)}`,
            priority,
        }).catch((err) => {
            logger?.warn?.({ err, jobKey }, 'Enrichment job enqueue failed');
        }),
    });
}

async function getOrEnqueueTopicSeed({ db, topic, articles = [], serverConfig, fetchImpl, cache, logger }) {
    const jobKey = topicSeedJobKey(topic);
    if (!hasDurableJobStore(db)) {
        return { status: 'skipped', reason: 'no_durable_job_store', jobKey };
    }

    const existing = await db.getAiGenerationJobByKey(jobKey).catch((err) => {
        logger?.warn?.({ err, jobKey }, 'getAiGenerationJobByKey failed for topic seed');
        return null;
    });
    if (existing?.status === 'completed') {
        return { status: 'completed', jobKey, cached: true };
    }
    if (existing?.status === 'running' || existing?.status === 'queued') {
        return { status: existing.status, jobKey };
    }
    if (existing?.status === 'failed') {
        return { status: 'failed', jobKey, errorMessage: existing.errorMessage };
    }

    const created = await db.createAiGenerationJob({
        jobKey,
        jobType: 'topic_seed',
        topic: String(topic || '').trim() || null,
        inputHash: stableHash({ topic: String(topic || '').trim().toLowerCase(), articleCount: articles.length }),
        inputPayload: {
            topic: String(topic || '').trim(),
            articles: articles.slice(0, 8).map((a) => ({
                uid: a.uid || null,
                title: a.title || null,
                doi: a.doi || null,
                pmid: a.pmid || null,
                pmcid: a.pmcid || null,
                abstract: a.abstract || null,
                journal: a.journal || a.source || null,
                pubdate: a.pubdate || null,
                year: a.year || null,
            })),
        },
        provider: serverConfig?.keys?.gemini ? 'gemini' : serverConfig?.keys?.mistral ? 'mistral' : null,
    }).catch((err) => {
        logger?.warn?.({ err, jobKey }, 'createAiGenerationJob failed for topic seed');
        return null;
    });

    if (created?.inserted) {
        await enqueueProcessJob({ db, jobKey, cache, logger, priority: 0, label: `topic-seed:${String(topic).slice(0, 40)}` });
    }
    return { status: 'queued', jobKey };
}

async function getOrEnqueueGuidelineAlign({ db, topic, cache, logger, limit = 24 }) {
    const jobKey = guidelineAlignJobKey(topic);
    if (!hasDurableJobStore(db)) {
        return { status: 'skipped', reason: 'no_durable_job_store', jobKey };
    }

    const existing = await db.getAiGenerationJobByKey(jobKey).catch((err) => {
        logger?.warn?.({ err, jobKey }, 'getAiGenerationJobByKey failed for guideline align');
        return null;
    });
    if (existing?.status === 'completed') {
        return { status: 'completed', jobKey, cached: true };
    }
    if (existing?.status === 'running' || existing?.status === 'queued') {
        return { status: existing.status, jobKey };
    }
    if (existing?.status === 'failed') {
        return { status: 'failed', jobKey, errorMessage: existing.errorMessage };
    }

    const created = await db.createAiGenerationJob({
        jobKey,
        jobType: 'guideline_align',
        topic: String(topic || '').trim() || null,
        inputHash: stableHash({ topic: String(topic || '').trim().toLowerCase(), limit }),
        inputPayload: {
            topic: String(topic || '').trim(),
            limit,
            apply: true,
        },
    }).catch((err) => {
        logger?.warn?.({ err, jobKey }, 'createAiGenerationJob failed for guideline align');
        return null;
    });

    if (created?.inserted) {
        await enqueueProcessJob({ db, jobKey, cache, logger, priority: -1, label: `guideline-align:${String(topic).slice(0, 40)}` });
    }
    return { status: 'queued', jobKey };
}

function pdfJobResultLooksIndexed(existing) {
    let payload = existing?.resultPayload || existing?.result_payload || {};
    if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch { payload = {}; }
    }
    if (payload?.indexed === true) return true;
    if (Number(payload?.wordCount || 0) >= 500) return true;
    // Explicit empty miss from the structured pdf_index result path.
    if (payload?.indexed === false) return false;
    // Legacy completed jobs lack structured flags — assume indexed to avoid thrash.
    // Failed jobs and --force-retry still re-queue; new empty runs fail instead of complete.
    if (existing?.status === 'completed') return true;
    return false;
}

async function getOrEnqueuePdfIndex({ db, article, cache, logger, priority = -1, forceRetry = false }) {
    const jobKey = pdfIndexJobKey(article);
    if (!hasDurableJobStore(db)) {
        return { status: 'skipped', reason: 'no_durable_job_store', jobKey };
    }

    const existing = await db.getAiGenerationJobByKey(jobKey).catch((err) => {
        logger?.warn?.({ err, jobKey }, 'getAiGenerationJobByKey failed for PDF index');
        return null;
    });
    if (existing?.status === 'running' || existing?.status === 'queued') {
        return { status: existing.status, jobKey };
    }

    const completedButEmpty = existing?.status === 'completed' && !pdfJobResultLooksIndexed(existing);
    const shouldRetry = forceRetry
        || existing?.status === 'failed'
        || completedButEmpty;

    if (existing?.status === 'completed' && !shouldRetry) {
        return { status: 'completed', jobKey, cached: true };
    }

    if (shouldRetry) {
        if (completedButEmpty && typeof db.failAiGenerationJob === 'function') {
            await db.failAiGenerationJob(jobKey, 'pdf_index:retry_empty_completed').catch(() => null);
        }
        if (typeof db.resetAiGenerationJobForRetry === 'function') {
            await db.resetAiGenerationJobForRetry(jobKey).catch((err) => {
                logger?.debug?.({ err, jobKey }, 'resetAiGenerationJobForRetry failed');
            });
        }
        await enqueueProcessJob({
            db,
            jobKey,
            cache,
            logger,
            priority: Number.isFinite(Number(priority)) ? Number(priority) : -1,
            label: `pdf-index:${String(jobKey).slice(0, 24)}`,
        });
        return { status: 'queued', jobKey, retried: true };
    }

    const created = await db.createAiGenerationJob({
        jobKey,
        jobType: 'pdf_index',
        topic: null,
        inputHash: stableHash({ id: article?.doi || article?.pmid || article?.pmcid || article?.uid || article?.title }),
        inputPayload: {
            article: slimArticleForPdfJob(article),
        },
    }).catch((err) => {
        logger?.warn?.({ err, jobKey }, 'createAiGenerationJob failed for PDF index');
        return null;
    });

    if (created?.inserted) {
        await enqueueProcessJob({
            db,
            jobKey,
            cache,
            logger,
            priority: Number.isFinite(Number(priority)) ? Number(priority) : -1,
            label: `pdf-index:${String(jobKey).slice(0, 24)}`,
        });
    }
    return { status: 'queued', jobKey };
}

/**
 * Prefer Evidence Bouquet / OA papers for PDF+GROBID indexing.
 * Bouquet papers get higher queue priority so synopsis grounding catches up sooner.
 */
async function enqueuePdfIndexForBouquetArticles({
    db,
    articles = [],
    bouquetRanking = [],
    cache,
    logger,
    limit = 8,
} = {}) {
    const bouquetUids = new Set(
        (Array.isArray(bouquetRanking) ? bouquetRanking : [])
            .slice(0, Math.max(limit, 1))
            .map((row) => String(row?.uid || row?.articleUid || '').toLowerCase())
            .filter(Boolean)
    );
    const list = Array.isArray(articles) ? articles.filter(Boolean) : [];
    const bouquetArticles = list.filter((a) => bouquetUids.has(String(a.uid || '').toLowerCase()));
    const freeArticles = list.filter((a) => a.isFree || a.pmcid || a.openAccess || a.openAccessUrl || a.fullTextUrl);
    const ordered = [...bouquetArticles, ...freeArticles, ...list];
    const seen = new Set();
    const results = [];
    for (const article of ordered) {
        if (results.length >= limit) break;
        const key = String(article?.doi || article?.pmid || article?.pmcid || article?.uid || '').toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const isBouquet = bouquetUids.has(String(article.uid || '').toLowerCase());
        const out = await getOrEnqueuePdfIndex({
            db,
            article,
            cache,
            logger,
            priority: isBouquet ? 2 : -1,
        }).catch((err) => {
            logger?.warn?.({ err, key }, 'getOrEnqueuePdfIndex failed');
            return { status: 'failed', error: err?.message };
        });
        results.push({ key, isBouquet, ...out });
    }
    return results;
}

const FLAGSHIP_ENRICH_MIN_CLAIMS = 8;

/**
 * Enqueue flagship-level enrichment (landmark PMID claim extraction + guideline MCQs)
 * for a topic that matches a flagship config entry but has insufficient claims (<8).
 * Priority is intentionally low (-2) so user-facing jobs always run first.
 *
 * Retries completed jobs that still have fewer than 8 claims (empty/partial runs),
 * matching the pdf_index empty-completed self-heal pattern.
 */
async function getOrEnqueueFlagshipEnrich({ db, topic, flagship, articles = [], cache, logger: log }) {
    const { flagshipEnrichJobKey } = require('./flagshipEnrichService');
    const jobKey = flagshipEnrichJobKey(topic);
    if (!hasDurableJobStore(db)) {
        return { status: 'skipped', reason: 'no_durable_job_store', jobKey };
    }

    const topicStr = String(topic || '').trim();
    const normalizedTopic = typeof db.normalizeTopic === 'function'
        ? db.normalizeTopic(topicStr)
        : topicStr.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();
    const claimRow = await db.get(
        'SELECT COUNT(*) AS count FROM teaching_object_claims WHERE normalized_topic = ?',
        [normalizedTopic]
    ).catch(() => null);
    const claimCount = Number(claimRow?.count || 0);
    if (claimCount >= FLAGSHIP_ENRICH_MIN_CLAIMS) {
        return { status: 'skipped', reason: 'sufficient_claims', claimCount, jobKey };
    }

    const existing = await db.getAiGenerationJobByKey(jobKey).catch(() => null);
    if (existing?.status === 'running' || existing?.status === 'queued') {
        return { status: existing.status, jobKey, claimCount };
    }

    const completedButInsufficient = existing?.status === 'completed' && claimCount < FLAGSHIP_ENRICH_MIN_CLAIMS;
    const shouldRetry = existing?.status === 'failed' || completedButInsufficient;

    if (shouldRetry) {
        if (completedButInsufficient && typeof db.failAiGenerationJob === 'function') {
            await db.failAiGenerationJob(jobKey, 'flagship_enrich:retry_insufficient_claims').catch(() => null);
        }
        if (typeof db.resetAiGenerationJobForRetry === 'function') {
            await db.resetAiGenerationJobForRetry(jobKey).catch(() => null);
        } else if (existing?.status === 'failed') {
            return { status: 'failed', jobKey, claimCount };
        }
        await enqueueProcessJob({
            db, jobKey, cache, logger: log, priority: -2,
            label: `flagship-enrich:${topicStr.slice(0, 40)}`,
        });
        return { status: 'queued', jobKey, claimCount, retried: true };
    }

    const created = await db.createAiGenerationJob({
        jobKey,
        jobType: 'flagship_enrich',
        topic: topicStr || null,
        inputHash: stableHash({ topic: topicStr.toLowerCase() }),
        inputPayload: {
            topic: topicStr,
            flagship: {
                topic: flagship?.topic || topicStr,
                landmarkPmids: flagship?.landmarkPmids || [],
                aliases: flagship?.aliases || [],
                // Passed for non-flagship topics so the job can auto-discover PMIDs
                discoveryArticles: (Array.isArray(articles) ? articles : [])
                    .slice(0, 8)
                    .map((a) => ({
                        pmid: a.pmid || null,
                        citationCount: a.citationCount || null,
                        pmcrefcount: a.pmcrefcount || null,
                        _isLandmark: a._isLandmark || null,
                    })),
            },
        },
        provider: null,
    }).catch((err) => {
        log?.warn?.({ err, jobKey }, 'createAiGenerationJob failed for flagship_enrich');
        return null;
    });

    if (created?.inserted) {
        await enqueueProcessJob({
            db, jobKey, cache, logger: log, priority: -2,
            label: `flagship-enrich:${topicStr.slice(0, 40)}`,
        });
    }
    return { status: 'queued', jobKey, claimCount };
}

module.exports = {
    topicSeedJobKey,
    guidelineAlignJobKey,
    pdfIndexJobKey,
    getOrEnqueueTopicSeed,
    getOrEnqueueGuidelineAlign,
    enqueuePdfIndexForBouquetArticles,
    getOrEnqueuePdfIndex,
    getOrEnqueueFlagshipEnrich,
};
