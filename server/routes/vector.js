const { createVectorSearchService, DEFAULT_MIN_SCORE } = require('../services/vectorSearchService');

const isDev = process.env.NODE_ENV === 'development';
const { createPdfService } = require('../services/pdfService');
const { getCachedPdf } = require('../services/pdfPreindexService');
const { pdfQueue } = require('../services/jobQueue');

// Per-IP PDF extraction concurrency limit
const pdfIpLocks = new Map();
const MAX_PDF_PER_IP = 2;

/**
 * @param {import('express').Application} app
 * @param {object} deps
 */
function registerVectorSearchRoutes(app, deps) {
    const { serverConfig, db, rateLimit, requireJson, requireAuthJwt, requireRole } = deps;
    const vector = createVectorSearchService({ db, serverConfig });

    app.post('/api/search/vector', rateLimit(20, 60), requireJson, requireAuthJwt, async (req, res) => {
        const {
            query,
            limit = 10,
            minScore = DEFAULT_MIN_SCORE,
            userEmbedding = null,
            userProfileText = '',
            queryWeight = 0.75,
        } = req.body;

        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Query is required' });
        }

        if (!db.isVectorSearchAvailable()) {
            return res.status(503).json({
                error: 'Vector search requires PG_VECTOR_URL to a PostgreSQL + pgvector instance. Apply database/pgvector.schema.sql (see docker-compose).',
            });
        }

        try {
            const out = await vector.semanticSearch({
                query,
                limit,
                minScore,
                userEmbedding,
                userProfileText,
                queryWeight,
            });
            res.json(out);
        } catch (error) {
            if (error.code === 'UNAVAILABLE') {
                return res.status(503).json({ error: error.message });
            }
            // error logged by global handler
            res.status(500).json({ error: isDev ? error.message : 'Vector search failed' });
        }
    });

    app.post('/api/search/vector/index', rateLimit(10, 60), requireJson, requireAuthJwt, requireRole('admin'), async (req, res) => {
        const { articles = [] } = req.body;
        if (!Array.isArray(articles) || articles.length === 0) {
            return res.status(400).json({ error: 'articles array is required' });
        }
        if (!db.isVectorSearchAvailable()) {
            return res.status(503).json({
                error: 'Indexing requires PG_VECTOR_URL (PostgreSQL + pgvector).',
            });
        }

        try {
            const out = await vector.indexArticles(articles);
            res.json(out);
        } catch (error) {
            if (error.code === 'UNAVAILABLE') {
                return res.status(503).json({ error: error.message });
            }
            // error logged by global handler
            res.status(500).json({ error: isDev ? error.message : 'Indexing failed' });
        }
    });
}

/**
 * @param {import('express').Application} app
 * @param {object} deps
 */
function registerPdfRoutes(app, deps) {
    const { serverConfig, cache, rateLimit, requireAuthJwt, fetch: fetchImpl } = deps;
    const pdf = createPdfService({ serverConfig, fetch: fetchImpl });
    const queue = deps.pdfQueue || pdfQueue;

    // Find open-access PDF URL — now uses a full cascade
    app.get('/api/pdf/find', rateLimit(60, 60), async (req, res) => {
        const { doi, pmcid } = req.query;
        if (!doi && !pmcid) return res.status(400).json({ error: 'doi or pmcid is required' });

        try {
            const out = await pdf.findOpenAccessPdf(doi || null, { pmcid: pmcid || null });
            res.json(out);
        } catch (error) {
            // error logged by global handler
            res.status(500).json({ error: isDev ? error.message : 'PDF discovery failed' });
        }
    });

    // Extract PDF text — returns raw text + structured sections + tables
    app.post('/api/pdf/extract', rateLimit(10, 60), requireAuthJwt, async (req, res) => {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'PDF URL is required' });

        const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
        const current = pdfIpLocks.get(clientIp) || 0;
        if (current >= MAX_PDF_PER_IP) {
            return res.status(429).json({ error: 'Too many concurrent PDF extractions' });
        }
        pdfIpLocks.set(clientIp, current + 1);

        try {
            let data;
            try {
                data = await queue.enqueueNamed(
                    'extract',
                    { url },
                    { label: `pdf-extract:${url.slice(0, 60)}`, wait: true }
                );
            } catch (queueError) {
                if (!String(queueError?.message || '').includes('No handler registered')) throw queueError;
                data = await pdf.extractPdfText(url);
            }
            res.json({
                text: data.text,
                pages: data.numpages,
                metadata: data.info,
                sections: data.sections || {},
                orderedKeys: data.orderedKeys || [],
                tables: data.tables || [],
                wordCount: data.wordCount || 0,
            });
        } catch (error) {
            // error logged by global handler
            res.status(500).json({ error: 'Failed to extract text from PDF' });
        } finally {
            const next = (pdfIpLocks.get(clientIp) || 1) - 1;
            if (next <= 0) pdfIpLocks.delete(clientIp);
            else pdfIpLocks.set(clientIp, next);
        }
    });

    // Check whether a pre-indexed PDF exists for an article (by uid/doi)
    // Returns { indexed: bool, sections?: string[], wordCount?: number, source?: string }
    app.get('/api/pdf/status', rateLimit(120, 60), requireAuthJwt, async (req, res) => {
        const { uid, doi, pmcid } = req.query;
        const article = { uid, doi, pmcid };
        try {
            const cached = await getCachedPdf(article, cache);
            if (cached) {
                return res.json({
                    indexed: true,
                    sections: cached.orderedKeys,
                    wordCount: cached.wordCount,
                    numpages: cached.numpages,
                    source: cached.source,
                    indexedAt: cached.indexedAt,
                });
            }
            return res.json({ indexed: false });
        } catch {
            return res.json({ indexed: false });
        }
    });

    // Retrieve a specific section from pre-indexed PDF
    // Returns { section: string, text: string }
    app.get('/api/pdf/section', rateLimit(60, 60), requireAuthJwt, async (req, res) => {
        const { uid, doi, pmcid, section } = req.query;
        if (!section) return res.status(400).json({ error: 'section is required' });

        const article = { uid, doi, pmcid };
        try {
            const cached = await getCachedPdf(article, cache);
            if (!cached) return res.status(404).json({ error: 'PDF not pre-indexed for this article' });
            const text = cached.sections[section] || null;
            if (!text) return res.status(404).json({ error: `Section "${section}" not found in PDF` });
            return res.json({ section, text, wordCount: text.split(/\s+/).length });
        } catch (error) {
            res.status(500).json({ error: isDev ? error.message : 'Failed to retrieve PDF section' });
        }
    });

    // Retrieve tables from pre-indexed PDF
    app.get('/api/pdf/tables', rateLimit(60, 60), requireAuthJwt, async (req, res) => {
        const { uid, doi, pmcid } = req.query;
        const article = { uid, doi, pmcid };
        try {
            const cached = await getCachedPdf(article, cache);
            if (!cached) return res.status(404).json({ error: 'PDF not pre-indexed for this article' });
            return res.json({ tables: cached.tables || [] });
        } catch (error) {
            res.status(500).json({ error: isDev ? error.message : 'Failed to retrieve PDF tables' });
        }
    });
}

module.exports = { registerVectorSearchRoutes, registerPdfRoutes };
