/**
 * @param {import('../../config').serverConfig} serverConfig
 * @returns {{ openaiKey?: string }}
 */
function getEmbeddingOptions(serverConfig) {
    if (!serverConfig || !serverConfig.keys) {
        return {};
    }
    return {
        openaiKey: serverConfig.keys.openai,
    };
}

module.exports = { getEmbeddingOptions };
