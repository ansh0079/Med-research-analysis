/**
 * Augment synthesis with embedding retrieval (saved-library centroid + topic query).
 * Requires pgvector, PG_VECTOR_URL, and embedding API credentials.
 */
const { generateEmbedding, articleToEmbedText } = require('./embeddings');

/**
 * @param {string} basePrompt
 * @param {{ topic: string, sessionId?: string, db: import('../database'), keys?: { openaiKey?: string, hfToken?: string } }} options
 * @returns {Promise<string>}
 */
async function appendRagContext(basePrompt, { topic, sessionId, db, keys = {} }) {
    if (typeof db.isVectorSearchAvailable !== 'function' || !db.isVectorSearchAvailable()) {
        return basePrompt;
    }
    if (!sessionId) return basePrompt;

    let saved;
    try {
        saved = await db.getSavedArticles(sessionId);
    } catch {
        return basePrompt;
    }
    if (!Array.isArray(saved) || saved.length === 0) {
        return basePrompt;
    }

    let acc = null;
    let n = 0;
    for (const a of saved.slice(0, 25)) {
        try {
            const e = await generateEmbedding(articleToEmbedText(a), keys);
            if (!acc) acc = e.map(() => 0);
            for (let i = 0; i < e.length; i++) acc[i] += e[i];
            n += 1;
        } catch {
            /* continue */
        }
    }
    if (n === 0) return basePrompt;
    const mean = acc.map((x) => x / n);
    const blocks = [];
    try {
        const fromSaved = await db.searchSimilarArticlesCache(mean, 4, 0.32);
        for (const r of fromSaved) {
            if (r.data) blocks.push(r.data);
        }
    } catch {
        /* empty */
    }
    try {
        const topicEmb = await generateEmbedding(String(topic || 'medical research'), keys);
        const fromTopic = await db.searchSimilarArticlesCache(topicEmb, 4, 0.32);
        for (const r of fromTopic) {
            if (r.data) blocks.push(r.data);
        }
    } catch {
        /* empty */
    }
    const seen = new Set();
    const textBits = [];
    for (const d of blocks) {
        const t = d.title || d.uid || JSON.stringify(d).slice(0, 40);
        if (seen.has(t)) continue;
        seen.add(t);
        const ab = (d.abstract || '').toString();
        textBits.push(`- ${d.title || 'Untitled'}\n  ${ab.slice(0, 500)}${ab.length > 500 ? '...' : ''}`);
        if (textBits.length >= 6) break;
    }
    if (textBits.length === 0) return basePrompt;
    return `${basePrompt}

[LIBRARY / CORPUS HINTS — from saved library + embedding retrieval; use only as supportive context.]
${textBits.join('\n\n')}`;
}

module.exports = { appendRagContext };
