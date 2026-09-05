'use strict';

const logger = require('../config/logger');
const {
    generateEmbedding,
    guidelineToEmbedText,
    guidelineVectorExternalId,
    GUIDELINE_VECTOR_SOURCE,
} = require('../embeddings');

const VECTOR_BLEND_WEIGHT = Number(process.env.GUIDELINE_VECTOR_BLEND || 0.4);
const VECTOR_MIN_SCORE = Number(process.env.GUIDELINE_VECTOR_MIN_SCORE || 0.35);

function hasEmbeddingKeys() {
    const provider = String(process.env.EMBEDDING_PROVIDER || 'hf').toLowerCase();
    if (provider === 'openai') {
        return Boolean(process.env.OPENAI_KEY || process.env.OPENAI_API_KEY);
    }
    return Boolean(process.env.HUGGINGFACE_TOKEN || process.env.HUGGINGFACE_API_KEY || process.env.HF_API_TOKEN);
}

function guidelinePayload(guideline) {
    return {
        kind: 'guideline',
        guidelineId: guideline.id,
        topic: guideline.topic || null,
        normalizedTopic: guideline.normalizedTopic || guideline.normalized_topic || null,
        sourceBody: guideline.sourceBody || guideline.source_body || null,
        sourceYear: guideline.sourceYear || guideline.source_year || null,
        recommendationText: guideline.recommendationText || guideline.recommendation_text || null,
        population: guideline.population || null,
        intervention: guideline.intervention || null,
    };
}

async function upsertGuidelineEmbedding(db, guideline, keys = {}) {
    if (!db?.isVectorSearchAvailable?.() || !db.isVectorSearchAvailable()) return null;
    const text = guidelineToEmbedText(guideline);
    if (!guideline?.id || text.length < 20) return null;
    const embedding = await generateEmbedding(text, keys);
    await db.upsertArticleCacheVector(
        guidelineVectorExternalId(guideline.id),
        GUIDELINE_VECTOR_SOURCE,
        guidelinePayload(guideline),
        embedding,
        null
    );
    return { externalId: guidelineVectorExternalId(guideline.id) };
}

function blendGuidelineVectorScores(guidelines, vectorHits, { weight = VECTOR_BLEND_WEIGHT } = {}) {
    const safeWeight = Math.max(0, Math.min(0.8, Number(weight) || 0));
    const byId = new Map();
    for (const hit of Array.isArray(vectorHits) ? vectorHits : []) {
        const id = hit?.data?.guidelineId || hit?.data?.id;
        if (!id) continue;
        byId.set(String(id), Number(hit.score) || 0);
    }
    return (Array.isArray(guidelines) ? guidelines : [])
        .map((guideline) => {
            const vectorScore = byId.get(String(guideline.id));
            if (vectorScore == null) return { ...guideline, vectorScore: null };
            const lexical = Number(guideline.relevanceScore || 0);
            const blended = (lexical * (1 - safeWeight)) + (vectorScore * safeWeight);
            return {
                ...guideline,
                vectorScore: Math.round(vectorScore * 100) / 100,
                relevanceScore: Math.round(blended * 100) / 100,
            };
        })
        .sort((a, b) => (Number(b.relevanceScore) || 0) - (Number(a.relevanceScore) || 0));
}

async function rerankGuidelinesWithVectors(db, topic, ranked, { limit = 20, keys = {} } = {}) {
    if (!Array.isArray(ranked) || ranked.length === 0) return ranked;
    if (!db?.isVectorSearchAvailable?.() || !db.isVectorSearchAvailable()) return ranked;
    if (!hasEmbeddingKeys() && !keys.openaiKey && !keys.huggingfaceKey) return ranked;
    try {
        const embedding = await generateEmbedding(String(topic || '').slice(0, 500), keys);
        const hits = await db.searchSimilarArticlesCache(
            embedding,
            Math.min(40, Math.max(limit * 2, 12)),
            VECTOR_MIN_SCORE,
            { source: GUIDELINE_VECTOR_SOURCE }
        );
        if (!hits?.length) return ranked;
        return blendGuidelineVectorScores(ranked, hits).slice(0, limit);
    } catch (err) {
        logger.debug({ err, topic }, 'guideline vector rerank skipped');
        return ranked;
    }
}

module.exports = {
    GUIDELINE_VECTOR_SOURCE,
    VECTOR_BLEND_WEIGHT,
    VECTOR_MIN_SCORE,
    hasEmbeddingKeys,
    guidelinePayload,
    upsertGuidelineEmbedding,
    blendGuidelineVectorScores,
    rerankGuidelinesWithVectors,
};
