/**
 * Background queue: embed saved articles so vector search and RAG stay fresh.
 * Uses the shared embeddingQueue for concurrency control.
 */
const { generateEmbedding, articleToEmbedText } = require('./embeddings');
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

    const db = workerDb;
    const keys = workerKeys;

    embeddingQueue.enqueue(
        async () => {
            try {
                if (!db || typeof db.isVectorSearchAvailable !== 'function' || !db.isVectorSearchAvailable()) return;
                const text = articleToEmbedText(article);
                if (!text || text.length < 20) return;
                const emb = await generateEmbedding(text, keys);
                const id = (article.doi || article.uid || article.title || '').toString() || 'unknown';
                await db.upsertArticleCacheVector(
                    id,
                    String(article._source || article.source || 'saved'),
                    article,
                    emb,
                    article.doi || null
                );
            } catch (e) {
                console.warn('[RAG] saved article embedding failed:', e && e.message ? e.message : e);
                throw e;
            } finally {
                if (article && article.uid) DEDUPE.delete(article.uid);
            }
        },
        { label: `embed:${article.uid}` }
    ).catch((err) => {
        logger.warn({ err }, 'embedding job enqueue failed');
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
