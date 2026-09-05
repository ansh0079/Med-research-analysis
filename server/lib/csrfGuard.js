'use strict';

const CSRF_EXEMPT_PATHS = new Set(['/api/billing/webhook']);

function isCsrfExemptPath(pathname) {
    return CSRF_EXEMPT_PATHS.has(String(pathname || ''));
}

/**
 * Origin/Referer CSRF check used by the Express middleware in app.js.
 * Production requires Origin or Referer on unsafe methods (except Stripe webhook).
 */
function evaluateCsrf({
    method,
    nodeEnv,
    origin,
    referer,
    secFetchSite,
    xRequestedWith,
    allowedOrigins = [],
    path: pathname,
} = {}) {
    const unsafeMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(method || '').toUpperCase());
    if (!unsafeMethod || nodeEnv === 'test') return { ok: true };
    if (isCsrfExemptPath(pathname)) return { ok: true };

    if (String(secFetchSite || '').toLowerCase() === 'cross-site') {
        return { ok: false, error: 'CSRF protection: cross-site request blocked' };
    }

    const originHeader = String(origin || '').trim();
    const refererHeader = String(referer || '').trim();
    if (!originHeader && !refererHeader) {
        if (nodeEnv === 'production') {
            return { ok: false, error: 'CSRF protection: origin required' };
        }
        return { ok: true };
    }

    if (!xRequestedWith && nodeEnv === 'production') {
        return { ok: false, error: 'CSRF protection: missing required headers' };
    }

    const source = originHeader || refererHeader;
    if (!allowedOrigins.some((allowed) => source.startsWith(allowed))) {
        return { ok: false, error: 'CSRF protection: untrusted origin' };
    }
    return { ok: true };
}

module.exports = {
    CSRF_EXEMPT_PATHS,
    isCsrfExemptPath,
    evaluateCsrf,
};
