/**
 * Audit logging middleware factory.
 * Records the action after the route handler completes successfully.
 */
function auditLog(action, { resourceType = null, resourceIdPath = null, detailsFn = null } = {}) {
    return async (req, res, next) => {
        const originalJson = res.json.bind(res);
        let capturedBody = null;

        res.json = (body) => {
            capturedBody = body;
            return originalJson(body);
        };

        res.on('finish', async () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                    const db = req.app.locals.db || require('../../database');
                    const resourceId = resourceIdPath
                        ? resourceIdPath.split('.').reduce((o, k) => o?.[k], req)
                        : req.params.id || req.params.articleId || null;

                    await db.createAuditLog({
                        userId: req.user?.id || null,
                        sessionId: req.sessionId || null,
                        action,
                        resourceType: resourceType || req.path,
                        resourceId: resourceId || null,
                        details: detailsFn ? detailsFn(req, capturedBody) : { path: req.path, method: req.method },
                        ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
                        userAgent: req.headers['user-agent'] || null,
                    });
                } catch (err) {
                    // Audit logging should never break the request
                    if (req.log) req.log.warn({ err }, 'Audit log failed');
                }
            }
        });

        next();
    };
}

module.exports = { auditLog };
