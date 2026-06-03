'use strict';

/**
 * Register BullMQ job handlers. Called from web and worker processes at startup.
 * @param {object} deps — shared app dependencies (db, cache, serverConfig, fetchImpl, logger)
 */
function registerAllJobHandlers(deps) {
    const { registerJobHandler } = require('./jobQueue');
    const logger = deps.logger || require('../config/logger');

    registerJobHandler('pdf', 'extract', async ({ url }, ctx) => {
        const { createPdfService } = require('./pdfService');
        const pdf = createPdfService({ serverConfig: deps.serverConfig, fetch: deps.fetchImpl });
        return pdf.extractPdfText(url);
    });

    registerJobHandler('pdf', 'preindex', async ({ articleId, article }, ctx) => {
        const { runPdfPreindex } = require('./pdfPreindexRunner');
        return runPdfPreindex(article, deps);
    });

    registerJobHandler('embedding', 'article', async ({ article }, ctx) => {
        const { generateEmbedding, articleToEmbedText } = require('../embeddings');
        const db = deps.db;
        if (!db || typeof db.isVectorSearchAvailable !== 'function' || !db.isVectorSearchAvailable()) return;
        const text = articleToEmbedText(article);
        if (!text || text.length < 20) return;
        const emb = await generateEmbedding(text, deps.embeddingKeys || {});
        const id = (article.doi || article.uid || article.title || '').toString() || 'unknown';
        await db.upsertArticleCacheVector(
            id,
            String(article._source || article.source || 'saved'),
            article,
            emb,
            article.doi || null
        );
    });

    registerJobHandler('digest', 'run', async (_data, ctx) => {
        const { runAlertDigests } = require('./digestService');
        const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3002}`;
        return runAlertDigests(deps.db, appUrl, deps.serverConfig, deps.fetchImpl);
    });

    registerJobHandler('ai-generation', 'process', async ({ jobKey }, ctx) => {
        const { processAiGenerationJobByKey } = require('./aiGenerationJobProcessor');
        return processAiGenerationJobByKey(jobKey, deps);
    });

    logger.info('Job handlers registered');
}

module.exports = { registerAllJobHandlers };
