'use strict';

// Batch embeddings for the question-to-topic index: ~45k short texts, so one request per text would
// take hours. Same model, dimension and normalisation as server/embeddings.js, so vectors made here are
// comparable with the ones the search index already holds.

const EMBEDDING_DIM = 384;
const MODEL = () => process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';

function normalizeL2(values) {
    const out = new Float32Array(values.length);
    let sum = 0;
    for (let i = 0; i < values.length; i += 1) sum += values[i] * values[i];
    const norm = Math.sqrt(sum) || 1;
    for (let i = 0; i < values.length; i += 1) out[i] = values[i] / norm;
    return out;
}

const realSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Embed `texts`, returning one normalised Float32Array per text, in order. Retries 429/5xx with backoff;
 * a batch that still fails throws, so the caller never gets a silently incomplete index.
 */
async function embedBatch(texts, {
    geminiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY,
    fetchImpl = globalThis.fetch,
    batchSize = 100,
    maxAttempts = 5,
    onProgress = null,
    sleep = realSleep,
} = {}) {
    if (!geminiKey) throw new Error('GEMINI_API_KEY is required for embeddings');
    const model = MODEL();
    const out = new Array(texts.length);
    for (let start = 0; start < texts.length; start += batchSize) {
        const slice = texts.slice(start, start + batchSize);
        const body = JSON.stringify({
            requests: slice.map((text) => ({
                model: `models/${model}`,
                content: { parts: [{ text: String(text || ' ').slice(0, 8000) }] },
                outputDimensionality: EMBEDDING_DIM,
            })),
        });
        let embeddings = null;
        for (let attempt = 1; attempt <= maxAttempts && !embeddings; attempt += 1) {
            const res = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents`, {
                method: 'POST',
                headers: { 'x-goog-api-key': geminiKey, 'Content-Type': 'application/json' },
                body,
            });
            if (res.ok) {
                const data = await res.json();
                embeddings = data.embeddings;
                if (!Array.isArray(embeddings) || embeddings.length !== slice.length) {
                    throw new Error(`Gemini returned ${embeddings?.length} embeddings for ${slice.length} texts`);
                }
                break;
            }
            if ((res.status === 429 || res.status >= 500) && attempt < maxAttempts) {
                await sleep(1500 * attempt * attempt);
                continue;
            }
            throw new Error(`Gemini batch embeddings failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
        }
        embeddings.forEach((e, i) => {
            const values = e?.values;
            if (!Array.isArray(values) || values.length !== EMBEDDING_DIM) {
                throw new Error(`Gemini returned an embedding of size ${values?.length}, expected ${EMBEDDING_DIM}`);
            }
            out[start + i] = normalizeL2(values);
        });
        onProgress?.(Math.min(start + batchSize, texts.length), texts.length);
    }
    return out;
}

module.exports = { EMBEDDING_DIM, embedBatch, normalizeL2 };
