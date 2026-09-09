const { GUIDELINE_BODY } = require('../utils/mcqClaimKey');
const { TRUSTED_GUIDELINE_SOURCES } = require('../config/trustedGuidelineSources');
const { discoverGuidelinesForTopic, isDiscoveryInFlight, wasDiscoveryAttempted } = require('../services/guidelineService');
const { getSharedAiService } = require('../services/aiService');
const { buildMergedGuidelineView } = require('../services/ai/guidelineMergeService');
const { safeFetch } = require('../utils/fetch');

function registerGuidelineRoutes(app, { db, serverConfig, cache, rateLimit, requireAuthJwt, requireRole, requireJson }) {
    const aiService = getSharedAiService({ serverConfig, fetchImpl: safeFetch });
    // Trusted sources registry (public). Keep before /api/guidelines/:id.
    app.get('/api/guidelines/sources', rateLimit(60, 60), (req, res) => {
        res.json({ sources: TRUSTED_GUIDELINE_SOURCES });
    });

    // List ingested guideline source documents (public read, rate-limited).
    // Lightweight rows -- full_text and synopsis body are fetched per-document.
    app.get('/api/guideline-documents', rateLimit(60, 60), async (req, res) => {
        try {
            const limit = req.query.limit;
            const offset = req.query.offset;
            const hasSynopsisParam = req.query.hasSynopsis;
            const hasSynopsis = hasSynopsisParam === 'true' ? true : hasSynopsisParam === 'false' ? false : null;
            const { rows, total } = await db.listGuidelineDocuments({ limit, offset, hasSynopsis });
            res.json({ documents: rows, total });
        } catch (error) {
            req.log.error({ err: error }, 'List guideline documents error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Single guideline source document with its synopsis (public read, rate-limited).
    // full_text is a document ingested from an open-access source, not user content --
    // it is included on request only, since it can run to tens of thousands of words.
    app.get('/api/guideline-documents/:id', rateLimit(60, 60), async (req, res) => {
        try {
            const includeFullText = req.query.fullText === 'true';
            const doc = await db.getGuidelineDocumentWithSynopsis(req.params.id, { includeFullText });
            if (!doc) return res.status(404).json({ error: 'Guideline document not found' });
            res.json({ document: doc });
        } catch (error) {
            req.log.error({ err: error }, 'Get guideline document error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Guideline contradictions for a topic (public read, rate-limited)
    app.get('/api/guidelines/contradictions', rateLimit(60, 60), async (req, res) => {
        try {
            const { topic } = req.query;
            if (!topic || typeof topic !== 'string') {
                return res.status(400).json({ error: 'topic query parameter is required' });
            }
            const normalized = db.normalizeTopic(topic);
            const contradictions = await db.getContradictionsForTopic(normalized);
            const count = { total: contradictions.length, major: 0, minor: 0, nuanced: 0 };
            for (const c of contradictions) {
                if (count[c.severity] !== undefined) count[c.severity]++;
            }
            res.json({ topic, contradictions, count });
        } catch (error) {
            const msg = String(error?.message || '');
            if (/no such table:\s*guideline_contradictions/i.test(msg)) {
                return res.json({
                    topic: req.query.topic,
                    contradictions: [],
                    count: { total: 0, major: 0, minor: 0, nuanced: 0 },
                    degraded: true,
                    reason: 'guideline_contradictions_unavailable',
                });
            }
            req.log.error({ err: error }, 'Get guideline contradictions error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Browse/search all stored guideline snippets (public read, rate-limited). Omits superseded rows.
    app.get('/api/guidelines/browse', rateLimit(40, 60), async (req, res) => {
        try {
            const { query, status, sourceBody, limit, offset } = req.query;
            const result = await db.listGuidelines({
                query: String(query || ''),
                status: String(status || ''),
                sourceBody: String(sourceBody || ''),
                limit: parseInt(String(limit), 10) || 40,
                offset: parseInt(String(offset), 10) || 0,
                onlyActive: true,
            });
            res.json(result);
        } catch (error) {
            req.log.error({ err: error }, 'Browse guidelines error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // List guidelines for a topic (public, rate-limited).
    // When no seeded guidelines exist, triggers live discovery from PubMed in the background.
    /**
     * Mark whether source_body actually names a guideline-issuing organisation.
     *
     * The field is populated from ingestion and frequently holds a journal
     * instead -- production returns "Dig Dis Sci" and "Vnitr Lek" as the
     * "guideline bodies" for hepatorenal syndrome. That was tolerable while
     * guidelines were buried far down the page; it is not once a summary states
     * a guideline count up front, where a journal masquerading as NICE or EASL
     * directly misleads the clinical judgement the product exists to inform.
     *
     * GUIDELINE_BODY is the same curated list used to decide whether an MCQ may
     * be labelled "guideline" -- reused rather than duplicated so the two cannot
     * drift apart.
     */
    const withIssuingBodyFlag = (g) => ({
        ...g,
        isIssuingBody: GUIDELINE_BODY.test(String(g?.sourceBody || '')),
    });

    app.get('/api/guidelines', rateLimit(60, 60), async (req, res) => {
        try {
            const { topic, status, limit } = req.query;
            if (!topic || typeof topic !== 'string') {
                return res.status(400).json({ error: 'topic query parameter is required' });
            }
            const guidelines = await db.getGuidelinesByTopic(topic, {
                status: String(status || ''),
                limit: parseInt(String(limit), 10) || 20,
            });
            if (guidelines.length > 0) {
                return res.json({ topic, guidelines: guidelines.map(withIssuingBodyFlag), discoveryStatus: 'complete' });
            }
            if (isDiscoveryInFlight(topic, db)) {
                return res.json({ topic, guidelines: [], discoveryStatus: 'pending' });
            }
            if (wasDiscoveryAttempted(topic, db)) {
                return res.json({ topic, guidelines: [], discoveryStatus: 'complete' });
            }
            discoverGuidelinesForTopic(topic, { db, serverConfig, aiService }).catch((err) => {
                req.log.warn({ err, topic }, 'Background guideline discovery failed; topic stays undiscovered');
            });
            res.json({ topic, guidelines: [], discoveryStatus: 'pending' });
        } catch (error) {
            req.log.error({ err: error }, 'Get guidelines by topic error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Everything the guidelines say about a topic, grouped by clinical decision
    // rather than listed by row, so agreement and disagreement between bodies
    // are visible together. Must be declared before /api/guidelines/:id, which
    // would otherwise capture "merged" as an id.
    app.get('/api/guidelines/merged', rateLimit(30, 60), async (req, res) => {
        try {
            const { topic } = req.query;
            if (!topic || typeof topic !== 'string') {
                return res.status(400).json({ error: 'topic query parameter is required' });
            }
            const merged = await buildMergedGuidelineView({
                db,
                topic,
                serverConfig,
                fetchImpl: safeFetch,
                cache,
                log: req.log,
            });
            // Too little guidance to be worth merging is a normal answer, not an
            // error: the flat list already reads fine at that size.
            if (!merged) {
                return res.json({ topic, themes: [], recommendationCount: 0, available: false });
            }
            res.json({ ...merged, available: true });
        } catch (error) {
            req.log.error({ err: error }, 'Merged guideline view error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Get single guideline by ID (public, rate-limited)
    app.get('/api/guidelines/:id', rateLimit(60, 60), async (req, res) => {
        try {
            const guideline = await db.getGuidelineById(req.params.id);
            if (!guideline) return res.status(404).json({ error: 'Guideline not found' });
            res.json({ guideline });
        } catch (error) {
            req.log.error({ err: error }, 'Get guideline error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // List all guidelines with filters (admin/curator only)
    app.get('/api/admin/guidelines', requireAuthJwt, requireRole('admin', 'curator'), rateLimit(60, 60), async (req, res) => {
        try {
            const { query, status, sourceBody, limit, offset } = req.query;
            const result = await db.listGuidelines({
                query: String(query || ''),
                status: String(status || ''),
                sourceBody: String(sourceBody || ''),
                limit: parseInt(String(limit), 10) || 50,
                offset: parseInt(String(offset), 10) || 0,
            });
            res.json(result);
        } catch (error) {
            req.log.error({ err: error }, 'List guidelines error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Create guideline (admin only)
    app.post('/api/admin/guidelines', requireAuthJwt, requireRole('admin', 'curator'), requireJson, rateLimit(30, 60), async (req, res) => {
        try {
            const payload = req.body;
            if (!payload.topic || !payload.sourceBody || !payload.recommendationText) {
                return res.status(400).json({ error: 'topic, sourceBody, and recommendationText are required' });
            }
            const guideline = await db.createGuideline(payload);
            res.status(201).json({ guideline });
        } catch (error) {
            req.log.error({ err: error }, 'Create guideline error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Update guideline (admin only)
    app.patch('/api/admin/guidelines/:id', requireAuthJwt, requireRole('admin', 'curator'), requireJson, rateLimit(30, 60), async (req, res) => {
        try {
            const guideline = await db.updateGuideline(req.params.id, req.body);
            if (!guideline) return res.status(404).json({ error: 'Guideline not found' });
            res.json({ guideline });
        } catch (error) {
            req.log.error({ err: error }, 'Update guideline error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Mark as reviewed (admin only)
    app.post('/api/admin/guidelines/:id/review', requireAuthJwt, requireRole('admin', 'curator'), rateLimit(30, 60), async (req, res) => {
        try {
            const guideline = await db.markGuidelineReviewed(req.params.id, req.user?.id);
            if (!guideline) return res.status(404).json({ error: 'Guideline not found' });
            res.json({ guideline });
        } catch (error) {
            req.log.error({ err: error }, 'Review guideline error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Mark as stale (admin only)
    app.post('/api/admin/guidelines/:id/stale', requireAuthJwt, requireRole('admin', 'curator'), rateLimit(30, 60), async (req, res) => {
        try {
            const guideline = await db.markGuidelineStale(req.params.id);
            if (!guideline) return res.status(404).json({ error: 'Guideline not found' });
            res.json({ guideline });
        } catch (error) {
            req.log.error({ err: error }, 'Mark guideline stale error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Mark as superseded (admin only)
    app.post('/api/admin/guidelines/:id/supersede', requireAuthJwt, requireRole('admin', 'curator'), requireJson, rateLimit(30, 60), async (req, res) => {
        try {
            const { supersededById } = req.body;
            if (!supersededById) return res.status(400).json({ error: 'supersededById is required' });
            const guideline = await db.markGuidelineSuperseded(req.params.id, supersededById);
            if (!guideline) return res.status(404).json({ error: 'Guideline not found' });
            res.json({ guideline });
        } catch (error) {
            req.log.error({ err: error }, 'Supersede guideline error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Delete guideline (admin only)
    app.delete('/api/admin/guidelines/:id', requireAuthJwt, requireRole('admin', 'curator'), rateLimit(30, 60), async (req, res) => {
        try {
            await db.deleteGuideline(req.params.id);
            res.json({ success: true });
        } catch (error) {
            req.log.error({ err: error }, 'Delete guideline error');
            res.status(500).json({ error: 'Internal server error' });
        }
    });

}

module.exports = { registerGuidelineRoutes };
