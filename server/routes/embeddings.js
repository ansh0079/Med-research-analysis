/**
 * Embeddings / vector-indexing status endpoint.
 * Surfaces the background worker queue so the UI can show indexing progress.
 */
function registerEmbeddingStatusRoute(app, { getWorkerStatus, requireAuthJwt }) {
    app.get('/api/embeddings/status', requireAuthJwt, (req, res) => {
        try {
            const status = typeof getWorkerStatus === 'function' ? getWorkerStatus() : { available: false };
            res.json({
                vectorSearchEnabled: Boolean(process.env.PG_VECTOR_URL || process.env.VECTOR_DATABASE_URL),
                featureFlag: String(process.env.REQUIRE_VECTOR_SEARCH || '').toLowerCase() === 'true'
                    ? 'required'
                    : 'optional',
                worker: status,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            req.log.error({ err: error }, 'Embeddings status error');
            res.status(500).json({ error: error.message });
        }
    });
}

module.exports = { registerEmbeddingStatusRoute };
