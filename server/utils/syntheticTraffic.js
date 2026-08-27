'use strict';

/**
 * Synthetic-traffic detection.
 *
 * Uptime monitors hit `/api/search` on a fixed interval with a fixed query. Because
 * they never send `x-session-id`, the session middleware mints a fresh UUID per
 * request, so each ping is indistinguishable from a brand-new user at the storage
 * layer. Left unfiltered this produced 95,785 `personalization_decisions` rows —
 * every one of them unrewarded, because a monitor never clicks a result.
 *
 * Those rows are not harmless. Offline policy evaluation, propensity replay, and the
 * delayed-reward backfill all read `personalization_decisions`; a corpus that is
 * ~100% never-rewarded impressions biases any estimator built on top of it, and it
 * hides the real (tiny) organic signal in six orders of magnitude of noise.
 *
 * Detection is deliberately conservative — a false positive silently drops a real
 * learner's signal, which is worse than retaining a little monitor noise. We only
 * classify traffic as synthetic on an explicit, positive signal: a known monitoring
 * user-agent, a generic bot/crawler token, or an explicit opt-out header.
 * A missing `x-session-id` alone is NOT sufficient (first-touch real users lack one).
 */

// Known uptime/monitoring vendors, plus generic crawler tokens.
const SYNTHETIC_UA_RE = new RegExp([
    // Uptime monitors
    'uptimerobot', 'pingdom', 'statuscake', 'betteruptime', 'better-uptime',
    'site24x7', 'newrelic', 'datadog', 'checkly', 'uptime\\.com', 'hetrixtools',
    'freshping', 'nodeping', 'cronitor', 'healthchecks\\.io', 'updown\\.io',
    // Generic automation / crawlers
    'curl/', 'wget/', 'python-requests', 'go-http-client', 'okhttp',
    'headlesschrome', 'phantomjs', 'puppeteer', 'playwright',
    'bot\\b', 'crawler', 'spider', 'scraper', 'monitoring',
].join('|'), 'i');

// Requests carrying this header are treated as synthetic regardless of UA.
// Lets load tests and smoke suites opt out of polluting the learning corpus.
const SYNTHETIC_HEADER = 'x-synthetic-traffic';

/**
 * @param {import('express').Request} req
 * @returns {{ synthetic: boolean, reason: string|null }}
 */
function classifyTraffic(req) {
    if (!req) return { synthetic: false, reason: null };

    const headers = req.headers || {};

    const explicit = String(headers[SYNTHETIC_HEADER] || '').trim().toLowerCase();
    if (explicit && explicit !== '0' && explicit !== 'false') {
        return { synthetic: true, reason: 'header' };
    }

    const ua = String(headers['user-agent'] || '').trim();
    if (!ua) {
        // No UA at all is characteristic of scripted probes, but some privacy
        // tooling strips it too. Treat as synthetic only for GET health-ish paths.
        return { synthetic: true, reason: 'empty_user_agent' };
    }
    if (SYNTHETIC_UA_RE.test(ua)) {
        return { synthetic: true, reason: 'user_agent' };
    }

    return { synthetic: false, reason: null };
}

/**
 * Express middleware: stamps `req.isSynthetic` / `req.syntheticReason`.
 * Mount before any handler that writes learning telemetry.
 */
function syntheticTrafficMiddleware(req, _res, next) {
    const { synthetic, reason } = classifyTraffic(req);
    req.isSynthetic = synthetic;
    req.syntheticReason = reason;
    next();
}

module.exports = {
    classifyTraffic,
    syntheticTrafficMiddleware,
    SYNTHETIC_UA_RE,
    SYNTHETIC_HEADER,
};
