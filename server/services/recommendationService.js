'use strict';

const { createVectorSearchService } = require('./vectorSearchService');

/**
 * Personalization facade — maps to future recommendation-service boundary.
 * Blends query + learner profile embeddings for semantic retrieval.
 */
async function personalizedSemanticSearch({
    db,
    serverConfig,
    query,
    userProfileText = '',
    userEmbedding = null,
    limit = 10,
    minScore = 0.4,
    queryWeight = 0.75,
} = {}) {
    if (!query || typeof query !== 'string') {
        const { appErrorFromCode } = require('../errors/appErrors');
        throw appErrorFromCode('VALIDATION_ERROR', 'query is required');
    }
    const vector = createVectorSearchService({ db, serverConfig });
    return vector.semanticSearch({
        query,
        limit,
        minScore,
        userProfileText,
        userEmbedding,
        queryWeight,
    });
}

module.exports = {
    personalizedSemanticSearch,
};
