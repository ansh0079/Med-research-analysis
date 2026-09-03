/**
 * Embedding generation for articles_cache (384-dim, matching the pgvector column).
 * Set EMBEDDING_PROVIDER=gemini | openai (default: gemini)
 *
 * IMPORTANT: there is deliberately no automatic cross-provider fallback.
 * Vectors from different embedding models occupy different spaces, so a cosine
 * similarity between a Gemini vector and an OpenAI one is meaningless -- a
 * fallback would silently poison the index with incomparable vectors and
 * produce plausible-looking but wrong similarity scores. Failing loudly is
 * correct here. Switching provider is an explicit config change, and requires
 * re-indexing everything already stored.
 */
const fetch = globalThis.fetch;

const EMBEDDING_DIM = 384;

function normalizeL2(vec) {
    const n = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) || 1;
    return vec.map((x) => x / n);
}


/**
 * OpenAI text-embedding-3-small with dimensions=384 to match MiniLM / pgvector schema
 */
async function embedOpenAI(text, openaiKey) {
    if (!openaiKey) {
        throw new Error('OPENAI_KEY or OPENAI_API_KEY is required for OpenAI embeddings');
    }
    const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: String(text).slice(0, 8000),
            dimensions: EMBEDDING_DIM,
        }),
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenAI embeddings failed: ${res.status} ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    const arr = data.data?.[0]?.embedding;
    if (!Array.isArray(arr) || arr.length !== EMBEDDING_DIM) {
        throw new Error('OpenAI returned unexpected embedding size');
    }
    return normalizeL2(arr);
}

/**
 * Gemini embeddings, truncated to EMBEDDING_DIM via outputDimensionality so the
 * vector fits the existing pgvector column without a schema migration.
 *
 * Replaces the previous HuggingFace provider: api-inference.huggingface.co was
 * retired and no longer resolves (ENOTFOUND), producing 282 failed embedding
 * calls in one day on production while silently degrading every search to
 * keyword-only. Gemini needs no new credential -- the same key already used for
 * generation works -- and supports 384 dimensions natively.
 */
async function embedGemini(text, geminiKey) {
    if (!geminiKey) {
        throw new Error('GEMINI_API_KEY is required for Gemini embeddings');
    }
    const model = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent`,
        {
            method: 'POST',
            headers: {
                'x-goog-api-key': geminiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: `models/${model}`,
                content: { parts: [{ text: String(text).slice(0, 8000) }] },
                outputDimensionality: EMBEDDING_DIM,
            }),
        }
    );
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini embeddings failed: ${res.status} ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    const arr = data.embedding?.values;
    if (!Array.isArray(arr) || arr.length !== EMBEDDING_DIM) {
        throw new Error(`Gemini returned unexpected embedding size: expected ${EMBEDDING_DIM}, got ${arr?.length}`);
    }
    return normalizeL2(arr);
}

/**
 * @param {string} text
 * @param {{ openaiKey?: string, geminiKey?: string }=} keys
 * @returns {Promise<number[]>}
 */
async function generateEmbedding(text, keys = {}) {
    const provider = process.env.EMBEDDING_PROVIDER || 'gemini';
    if (provider === 'openai') {
        const key = keys.openaiKey || process.env.OPENAI_KEY || process.env.OPENAI_API_KEY;
        return embedOpenAI(text, key);
    }
    const geminiKey = keys.geminiKey || process.env.GEMINI_API_KEY || process.env.GEMINI_KEY;
    return embedGemini(text, geminiKey);
}

function articleToEmbedText(article) {
    const t = [article.title, article.abstract || '', article.doi || '']
        .filter(Boolean)
        .join('\n\n');
    return t.slice(0, 8000);
}

module.exports = {
    generateEmbedding,
    articleToEmbedText,
    EMBEDDING_DIM,
};
