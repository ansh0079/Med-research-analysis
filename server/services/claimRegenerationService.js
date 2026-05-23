'use strict';

const logger = require('../config/logger');
const { runPaperSynopsisGeneration } = require('./paperSynopsisCore');

function articleFromTeachingObject(teachingObject, articleUid) {
    const payload = teachingObject?.payload || {};
    const paper = payload.paper || {};
    const synopsis = payload.synopsis || {};
    return {
        uid: articleUid || paper.uid || teachingObject.articleUid,
        title: teachingObject.title || paper.title || 'Untitled article',
        abstract: synopsis.background || synopsis.mainFindings || '',
        doi: paper.doi || null,
        pmid: paper.pmid || null,
        pmcid: paper.pmcid || null,
        journal: paper.journal || null,
        pubdate: paper.pubdate || null,
        _pdfIndexed: Boolean(paper.fullTextUsed),
    };
}

async function processClaimRegenerationJob(db, job, { serverConfig, fetchImpl, cache } = {}) {
    const claim = await db.getTeachingClaimByKey?.(job.claimKey);
    if (!claim) {
        throw new Error('Claim not found');
    }
    const articleUid = job.articleUid || claim.articleUid;
    if (!articleUid) {
        throw new Error('No article linked to claim');
    }

    let teachingObject = await db.getTeachingObjectForArticle(articleUid).catch(() => null);
    if (!teachingObject && claim.objectKey) {
        teachingObject = await db.getTeachingObjectByKey?.(claim.objectKey).catch(() => null);
    }
    if (!teachingObject) {
        throw new Error('Teaching object not found for regeneration');
    }

    const cached = await db.getCachedArticle?.(articleUid).catch(() => null);
    const article = cached?.title
        ? { ...cached, uid: articleUid }
        : articleFromTeachingObject(teachingObject, articleUid);

    const topic = job.normalizedTopic || claim.normalizedTopic || teachingObject.topic || '';
    const priorStatus = claim.verificationStatus;

    await db.updateClaimRegenerationStatus(job.id, { status: 'running' });

    const result = await runPaperSynopsisGeneration({
        article,
        db,
        cache,
        serverConfig,
        fetchImpl,
        topic,
        log: logger,
    });

    const refreshed = await db.getTeachingClaimByKey?.(job.claimKey).catch(() => null);
    if (refreshed && typeof db.logClaimStatusChange === 'function' && refreshed.verificationStatus !== priorStatus) {
        await db.logClaimStatusChange(job.claimKey, {
            fromStatus: priorStatus,
            toStatus: refreshed.verificationStatus,
            normalizedTopic: topic,
            reason: `Automatic regeneration after ${job.triggerReason || 'queue'}.`,
        }).catch(() => {});
    }

    await db.updateClaimRegenerationStatus(job.id, { status: 'completed' });
    return { jobId: job.id, claimKey: job.claimKey, synopsisGenerated: Boolean(result?.synopsis), newStatus: refreshed?.verificationStatus || null };
}

async function processClaimRegenerationBatch(db, deps = {}, { limit = 3 } = {}) {
    if (typeof db.listPendingClaimRegenerations !== 'function') return { processed: 0 };
    const pending = await db.listPendingClaimRegenerations({ limit });
    let processed = 0;
    for (const job of pending) {
        try {
            await processClaimRegenerationJob(db, job, deps);
            processed += 1;
        } catch (err) {
            logger.warn({ err, jobId: job.id, claimKey: job.claimKey }, 'claim regeneration failed');
            await db.updateClaimRegenerationStatus(job.id, {
                status: 'failed',
                errorMessage: err.message || 'regeneration failed',
            }).catch(() => {});
        }
    }
    return { processed, attempted: pending.length };
}

async function enqueueRegenerationForArticleClaims(db, articleUid, { topic = '', triggerReason = 'full_text_indexed' } = {}) {
    const object = await db.getTeachingObjectForArticle(articleUid).catch(() => null);
    if (!object?.objectKey) return { queued: 0 };
    const claims = await db.listTeachingObjectClaimsByObjectKey(object.objectKey);
    let queued = 0;
    for (const claim of claims) {
        if (!claim?.claimKey) continue;
        if (!['full_text_available', 'stale_needs_refresh', 'abstract_only'].includes(claim.verificationStatus)) continue;
        const res = await db.enqueueClaimRegeneration({
            claimKey: claim.claimKey,
            articleUid,
            topic: topic || claim.normalizedTopic || object.topic,
            triggerReason,
        }).catch(() => null);
        if (res?.queued) queued += 1;
    }
    return { queued, articleUid };
}

module.exports = {
    articleFromTeachingObject,
    processClaimRegenerationJob,
    processClaimRegenerationBatch,
    enqueueRegenerationForArticleClaims,
};
