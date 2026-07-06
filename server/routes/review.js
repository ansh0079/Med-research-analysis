const logger = require('../config/logger');
const { getSharedAiService, PINNED_MODELS } = require('../services/aiService');
const { createReviewService } = require('../services/reviewService');
const { createMcqValidationService } = require('../services/mcqValidationService');
const { createReviewRouteHelpers } = require('./review/shared');
const { registerReviewCaseRoutes } = require('./review/cases');
const { registerReviewMethodologyRoutes } = require('./review/methodology');

/**
 * @param {import('express').Application} app
 * @param {object} deps
 */
function registerReviewRoutes(app, deps) {
    const {
        serverConfig,
        db,
        cache,
        rateLimit,
        requireJson,
        requireAuthJwt,
        requireAuthOrBeta,
        requirePaidFeature,
        validateBody,
        schemas,
        auditLog,
        fetch: fetchImpl,
    } = deps;

    const requireCaseAuth = requireAuthOrBeta || requireAuthJwt;

    const ai = getSharedAiService({ serverConfig, fetchImpl });
    const reviews = createReviewService({ db });
    const mcqValidator = createMcqValidationService({ ai, db, logger, PINNED_MODELS, serverConfig });
    const helpers = createReviewRouteHelpers({ ai, serverConfig, logger, mcqValidator });

    async function assertTeamMember(teamId, userId) {
        const role = await db.getTeamRoleForUser(String(teamId), userId);
        if (!role) {
            const error = new Error('Access denied: you are not a member of this team');
            error.status = 403;
            throw error;
        }
        return role;
    }

    async function resolveOwner(req) {
        if (req.body.ownerType === 'team' || req.body.teamId) {
            if (!req.body.teamId) {
                const error = new Error('teamId is required for team-owned reviews');
                error.status = 400;
                throw error;
            }
            await assertTeamMember(req.body.teamId, req.user.id);
            return { ownerType: 'team', ownerId: String(req.body.teamId) };
        }

        return {
            ownerType: 'user',
            ownerId: String(req.user.id),
        };
    }

    async function requireReviewAccess(req, res, next) {
        try {
            const review = await reviews.getProject(req.params.id);
            if (!review) return res.status(404).json({ error: 'Review not found' });

            const ownerType = review.owner_type || 'session';
            const ownerId = review.owner_id;

            if (ownerType === 'user') {
                if (!req.user || req.user.id !== ownerId) {
                    return res.status(403).json({ error: 'Access denied: you do not own this review' });
                }
            } else if (ownerType === 'session') {
                if (req.sessionId !== ownerId) {
                    return res.status(403).json({ error: 'Access denied: invalid session' });
                }
            } else if (ownerType === 'team') {
                if (!req.user?.id) {
                    return res.status(401).json({ error: 'Authentication required for team review access' });
                }
                const role = await db.getTeamRoleForUser(ownerId, req.user.id);
                if (!role) {
                    return res.status(403).json({ error: 'Access denied: you are not a member of this team' });
                }
            }

            req.review = review;
            next();
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    app.get('/api/reviews', requireAuthJwt, async (req, res) => {
        try {
            const limit = Math.min(Number(req.query.limit) || 50, 100);
            const offset = Math.max(Number(req.query.offset) || 0, 0);
            const projects = await reviews.listProjects({
                ownerType: 'user',
                ownerId: String(req.user.id),
                limit,
                offset,
            });
            res.json({ reviews: projects, limit, offset });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/reviews', requireJson, requireAuthJwt, auditLog('review.create'), validateBody(schemas.reviewCreate), async (req, res) => {
        try {
            const { question, title, criteria } = req.body;
            const owner = await resolveOwner(req);
            const project = await reviews.createProject({
                question,
                title,
                criteria,
                ownerType: owner.ownerType,
                ownerId: owner.ownerId,
            });
            await db.logEvent('review:create', req.sessionId, { reviewId: project.id });
            res.status(201).json({ review: project });
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    });

    app.get('/api/reviews/:id', requireReviewAccess, async (req, res) => {
        try {
            const articles = await reviews.listArticles(req.params.id);
            const prisma = await reviews.prismaCounts(req.params.id);
            res.json({ review: req.review, articles, prisma });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/reviews/:id/articles', requireJson, requireReviewAccess, auditLog('review.add_articles'), validateBody(schemas.reviewArticles), async (req, res) => {
        try {
            const { articles, duplicates } = await reviews.addArticles(req.params.id, req.body.articles || []);
            await db.logEvent('review:add_articles', req.sessionId, {
                reviewId: req.params.id,
                count: (req.body.articles || []).length,
                duplicatesDetected: duplicates.length,
            });
            res.json({ articles, duplicates });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.patch(
        '/api/reviews/:id/articles/:articleId/screening',
        requireJson,
        requireReviewAccess,
        auditLog('review.screen'),
        validateBody(schemas.reviewScreening),
        async (req, res) => {
            try {
                const row = await reviews.updateScreening(req.params.id, req.params.articleId, {
                    screeningStatus: req.body.decision,
                    exclusionReason: req.body.exclusionReason,
                    notes: req.body.notes,
                });
                const prisma = await reviews.prismaCounts(req.params.id);
                await db.logEvent('review:screen', req.sessionId, {
                    reviewId: req.params.id,
                    articleId: req.params.articleId,
                    decision: req.body.decision,
                });
                req.broadcast?.broadcastScreeningUpdate?.(req.params.id, {
                    article: row,
                    prisma,
                    articleId: req.params.articleId,
                    decision: req.body.decision,
                    userId: req.user?.id,
                    userName: req.user?.name,
                });
                res.json({ article: row, prisma });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        }
    );

    app.get('/api/reviews/:id/prisma', requireReviewAccess, async (req, res) => {
        try {
            const prisma = await reviews.prismaCounts(req.params.id);
            res.json({ prisma });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/reviews/:id/export.csv', requireAuthJwt, requireReviewAccess, requirePaidFeature('review_csv_export'), async (req, res) => {
        try {
            const csv = await reviews.exportCsv(req.params.id);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="review-${req.params.id}.csv"`);
            res.send(csv);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    registerReviewMethodologyRoutes(app, {
        db,
        reviews,
        requireJson,
        requireAuthJwt,
        requirePaidFeature,
        rateLimit,
        validateBody,
        schemas,
        requireReviewAccess,
        helpers,
    });

    registerReviewCaseRoutes(app, {
        db,
        cache,
        serverConfig,
        fetchImpl,
        ai,
        reviews,
        logger,
        requireJson,
        requireAuthJwt,
        requireCaseAuth,
        rateLimit,
        validateBody,
        schemas,
        helpers,
    });
}

module.exports = { registerReviewRoutes };
