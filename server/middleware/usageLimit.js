'use strict';

const { getLimit, resolvePlan } = require('../config/entitlements');
const db = require('../../database');

const yearMonth = () => new Date().toISOString().slice(0, 7);   // 'YYYY-MM'
const today     = () => new Date().toISOString().slice(0, 10);  // 'YYYY-MM-DD'

/**
 * Increment and enforce a monthly AI feature usage limit.
 *
 * featureKey must match an entitlements.PLANS limit key (e.g. 'aiAnalysesPerMonth')
 * and a feature name string used in ai_usage_monthly.feature column.
 *
 * Usage:
 *   app.post('/api/ai/analyze', requireAuthJwt, requireMonthlyLimit('aiAnalysesPerMonth', 'ai_analysis'), handler)
 */
function requireMonthlyLimit(limitKey, featureSlug) {
    return async (req, res, next) => {
        const enabled = String(process.env.PAYWALL_ENABLED || '').toLowerCase() === 'true';
        const allowInDev = String(process.env.PAYWALL_ALLOW_IN_DEV || 'true').toLowerCase() === 'true';
        if (!enabled || (allowInDev && process.env.NODE_ENV !== 'production')) return next();
        if (!req.user?.id) return next();   // unauthenticated: let downstream handle

        const cap = getLimit(req.user, limitKey);
        if (cap === Infinity) return next(); // unlimited plan

        const ym = yearMonth();

        try {
            // Upsert: increment counter atomically
            await db.run(
                `INSERT INTO ai_usage_monthly (user_id, year_month, feature, count, updated_at)
                 VALUES (?, ?, ?, 1, datetime('now'))
                 ON CONFLICT(user_id, year_month, feature)
                 DO UPDATE SET count = count + 1, updated_at = datetime('now')`,
                [req.user.id, ym, featureSlug]
            );

            const row = await db.get(
                'SELECT count FROM ai_usage_monthly WHERE user_id = ? AND year_month = ? AND feature = ?',
                [req.user.id, ym, featureSlug]
            );

            const used = row?.count ?? 1;
            res.setHeader('X-Usage-Used', used);
            res.setHeader('X-Usage-Limit', cap);
            res.setHeader('X-Usage-Key', limitKey);
            res.setHeader('X-Usage-Feature', featureSlug);

            if (used > cap) {
                // Roll back the increment we just applied so we don't over-count
                await db.run(
                    `UPDATE ai_usage_monthly SET count = count - 1, updated_at = datetime('now')
                     WHERE user_id = ? AND year_month = ? AND feature = ?`,
                    [req.user.id, ym, featureSlug]
                );
                const plan = resolvePlan(req.user);
                return res.status(429).json({
                    error: `Monthly limit reached for ${featureSlug} (${cap} on ${plan.label} plan)`,
                    limitKey,
                    feature: featureSlug,
                    used: used - 1,
                    cap,
                    plan: plan.label,
                    upgradeRequired: plan.label !== 'Institution',
                    resetsAt: (() => { const [y, m] = ym.split('-').map(Number); const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`; return `${next}-01T00:00:00Z`; })(),
                });
            }
        } catch (err) {
            // Non-fatal: if usage tracking fails, log and allow the request through
            req.log?.warn?.({ err, userId: req.user.id }, 'Usage limit check failed — allowing through');
        }

        next();
    };
}

/**
 * Enforce daily search quota.
 * Only applied when PAYWALL_ENABLED=true; skips unauthenticated sessions.
 */
function requireDailySearchLimit() {
    return async (req, res, next) => {
        const enabled = String(process.env.PAYWALL_ENABLED || '').toLowerCase() === 'true';
        const allowInDev = String(process.env.PAYWALL_ALLOW_IN_DEV || 'true').toLowerCase() === 'true';
        if (!enabled || (allowInDev && process.env.NODE_ENV !== 'production')) return next();
        if (!req.user?.id) return next();

        const cap = getLimit(req.user, 'searchesPerDay');
        if (cap === Infinity) return next();

        const dt = today();

        try {
            await db.run(
                `INSERT INTO search_usage_daily (user_id, date, count, updated_at)
                 VALUES (?, ?, 1, datetime('now'))
                 ON CONFLICT(user_id, date)
                 DO UPDATE SET count = count + 1, updated_at = datetime('now')`,
                [req.user.id, dt]
            );

            const row = await db.get(
                'SELECT count FROM search_usage_daily WHERE user_id = ? AND date = ?',
                [req.user.id, dt]
            );

            const used = row?.count ?? 1;
            res.setHeader('X-Search-Used', used);
            res.setHeader('X-Search-Limit', cap);
            res.setHeader('X-Search-Key', 'searchesPerDay');
            res.setHeader('X-Search-Feature', 'searchesPerDay');

            if (used > cap) {
                await db.run(
                    `UPDATE search_usage_daily SET count = count - 1 WHERE user_id = ? AND date = ?`,
                    [req.user.id, dt]
                );
                const plan = resolvePlan(req.user);
                return res.status(429).json({
                    error: `Daily search limit reached (${cap} on ${plan.label} plan)`,
                    limitKey: 'searchesPerDay',
                    feature: 'searchesPerDay',
                    used: used - 1,
                    cap,
                    plan: plan.label,
                    upgradeRequired: plan.label !== 'Institution',
                    resetsAt: `${dt}T23:59:59Z`,
                });
            }
        } catch (err) {
            req.log?.warn?.({ err, userId: req.user.id }, 'Daily search limit check failed — allowing through');
        }

        next();
    };
}

module.exports = { requireMonthlyLimit, requireDailySearchLimit };
