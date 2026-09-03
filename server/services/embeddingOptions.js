/**
 * @param {import('../../config').serverConfig} serverConfig
 * @returns {{ openaiKey?: string, geminiKey?: string }}
 */
function getEmbeddingOptions(serverConfig) {
    if (!serverConfig || !serverConfig.keys) {
        return {};
    }
    return {
        openaiKey: serverConfig.keys.openai,
        // Gemini is the default embedding provider (see server/embeddings.js); without
        // this the background embedding worker receives no usable key at all.
        geminiKey: serverConfig.keys.gemini,
    };
}

module.exports = { getEmbeddingOptions };
