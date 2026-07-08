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

async function getOrEnqueuePdfIndex({ db, article, cache, logger }) {
    const jobKey = pdfIndexJobKey(article);
    if (!hasDurableJobStore(db)) {
        return { status: 'skipped', reason: 'no_durable_job_store', jobKey };
    }

    const existing = await db.getAiGenerationJobByKey(jobKey).catch((err) => {
        logger?.warn?.({ err, jobKey }, 'getAiGenerationJobByKey failed for PDF index');
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
        await enqueueProcessJob({ db, jobKey, cache, logger, priority: -1, label: `pdf-index:${String(jobKey).slice(0, 24)}` });
    }
    return { status: 'queued', jobKey };
}

module.exports = {
    topicSeedJobKey,
    guidelineAlignJobKey,
    pdfIndexJobKey,
    getOrEnqueueTopicSeed,
    getOrEnqueueGuidelineAlign,
    getOrEnqueuePdfIndex,
};
