/**
 * Embedding generation for articles_cache (384-dim for pgvector + MiniLM / OpenAI small).
 * Set EMBEDDING_PROVIDER=hf | openai (default: hf)
 */
const fetch = globalThis.fetch;

const EMBEDDING_DIM = 384;

function meanPoolTokenEmbeddings(tokenMatrix) {
    if (!Array.isArray(tokenMatrix) || tokenMatrix.length === 0) return null;
    if (!Array.isArray(tokenMatrix[0])) {
        return tokenMatrix.length === EMBEDDING_DIM ? tokenMatrix : null;
    }
    const h = tokenMatrix.length;
    const w = tokenMatrix[0].length;
    const out = new Array(w).fill(0);
    for (let i = 0; i < h; i++) {
        const row = tokenMatrix[i];
        for (let j = 0; j < w; j++) {
            out[j] += row[j] ?? 0;
        }
    }
    return out.map((v) => v / h);
}

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
 * HuggingFace Inference API embedding (feature-extraction pipeline).
 * Uses mean-pooling over token embeddings to produce a single sentence vector.
 */
async function embedHuggingFace(text, hfKey) {
    if (!hfKey) {
        throw new Error('HUGGINGFACE_API_KEY or HF_API_TOKEN is required for HuggingFace embeddings');
    }
    const model = process.env.HF_EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2';
    const res = await fetch(`https://api-inference.huggingface.co/pipeline/feature-extraction/${model}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${hfKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: String(text).slice(0, 8000) }),
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HF embeddings failed: ${res.status} ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    const vec = meanPoolTokenEmbeddings(data);
    if (!vec || vec.length !== EMBEDDING_DIM) {
        throw new Error(`HF returned unexpected embedding size: expected ${EMBEDDING_DIM}, got ${vec?.length}`);
    }
    return normalizeL2(vec);
}

/**
 * @param {string} text
 * @param {{ openaiKey?: string, huggingfaceKey?: string }=} keys
 * @returns {Promise<number[]>}
 */
async function generateEmbedding(text, keys = {}) {
    const provider = process.env.EMBEDDING_PROVIDER || 'hf';
    if (provider === 'openai') {
        const key = keys.openaiKey || process.env.OPENAI_KEY || process.env.OPENAI_API_KEY;
        return embedOpenAI(text, key);
    }
    // default: hf
    const hfKey = keys.huggingfaceKey || process.env.HUGGINGFACE_API_KEY || process.env.HF_API_TOKEN;
    return embedHuggingFace(text, hfKey);
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
