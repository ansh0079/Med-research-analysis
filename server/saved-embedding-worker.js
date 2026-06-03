/**
 * Background queue: embed saved articles so vector search and RAG stay fresh.
 * Uses the shared embeddingQueue for concurrency control.
 */
const { embeddingQueue } = require('./services/jobQueue');
const logger = require('./config/logger');

let started = false;
let workerDb = null;
let workerKeys = {};
const DEDUPE = new Set();

/**
 * @param {import('../database').Database|any} db
 * @param {{ openaiKey?: string, hfToken?: string }} [keys]
 */
function startSavedEmbeddingWorker(db, keys = {}) {
    if (started) return;
    if (typeof db.isVectorSearchAvailable !== 'function' || !db.isVectorSearchAvailable()) {
        return;
    }
    started = true;
    workerDb = db;
    workerKeys = keys;
}

function stopSavedEmbeddingWorker() {
    started = false;
    workerDb = null;
    workerKeys = {};
    DEDUPE.clear();
}

function enqueueArticleForEmbedding(article) {
    if (!article || !article.uid) return;
    if (DEDUPE.has(article.uid)) return;
    DEDUPE.add(article.uid);

    embeddingQueue.enqueueNamed(
        'article',
        { article },
        { label: `embed:${article.uid}` }
    ).catch((err) => {
        logger.warn({ err }, 'embedding job enqueue failed');
    }).finally(() => {
        if (article?.uid) DEDUPE.delete(article.uid);
    });
}

function getWorkerStatus() {
    return {
        available: started,
        queueDepth: embeddingQueue.getStatus().pending,
        dedupeSize: DEDUPE.size,
    };
}

module.exports = { startSavedEmbeddingWorker, stopSavedEmbeddingWorker, enqueueArticleForEmbedding, getWorkerStatus };
