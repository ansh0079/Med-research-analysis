const { TRUSTED_GUIDELINE_SOURCES } = require('../config/trustedGuidelineSources');

function registerGuidelineRoutes(app, { db, rateLimit, requireAuthJwt, requireRole, requireJson }) {
    // Trusted sources registry (public). Keep before /api/guidelines/:id.
    app.get('/api/guidelines/sources', rateLimit(60, 60), (req, res) => {
        res.json({ sources: TRUSTED_GUIDELINE_SOURCES });
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
            res.status(500).json({ error: error.message });
        }
    });

    // List guidelines for a topic (public, rate-limited)
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
            res.json({ topic, guidelines });
        } catch (error) {
            req.log.error({ err: error }, 'Get guidelines by topic error');
            res.status(500).json({ error: error.message });
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
            res.status(500).json({ error: error.message });
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
            res.status(500).json({ error: error.message });
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
            res.status(500).json({ error: error.message });
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
            res.status(500).json({ error: error.message });
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
            res.status(500).json({ error: error.message });
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
            res.status(500).json({ error: error.message });
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
            res.status(500).json({ error: error.message });
        }
    });

    // Delete guideline (admin only)
    app.delete('/api/admin/guidelines/:id', requireAuthJwt, requireRole('admin', 'curator'), rateLimit(30, 60), async (req, res) => {
        try {
            await db.deleteGuideline(req.params.id);
            res.json({ success: true });
        } catch (error) {
            req.log.error({ err: error }, 'Delete guideline error');
            res.status(500).json({ error: error.message });
        }
    });

}

module.exports = { registerGuidelineRoutes };
