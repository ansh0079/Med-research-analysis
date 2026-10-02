'use strict';

const REDACTED = '[redacted]';

const SENSITIVE_KEY = /^(q|query|queries|topic|prompt|prompts|abstract|title|recommendation|recommendation_text|case|casetext|annotation|annotations|message|messages|synthesis|content|full_text|fulltext|body|search|previousqueries|clinicalanswer|keyfindings|text|note|notes|email)$/i;

function scrubValue(value, depth = 0) {
    if (depth > 6 || value == null) return value;
    if (typeof value === 'string') return value.length > 500 ? REDACTED : value;
    if (Array.isArray(value)) return value.slice(0, 20).map((item) => scrubValue(item, depth + 1));
    if (typeof value !== 'object') return value;
    const out = {};
    for (const [key, child] of Object.entries(value)) {
        out[key] = SENSITIVE_KEY.test(key) ? REDACTED : scrubValue(child, depth + 1);
    }
    return out;
}

function stripUrlQuery(url) {
    if (typeof url !== 'string') return url;
    const queryAt = url.indexOf('?');
    return queryAt === -1 ? url : url.slice(0, queryAt);
}

/**
 * Drop search text, prompts, article content, and account addresses before an
 * error leaves the process. Stack traces and route paths stay.
 */
function scrubSentryEvent(event) {
    if (!event || typeof event !== 'object') return event;
    if (event.request) {
        event.request = {
            method: event.request.method,
            url: stripUrlQuery(event.request.url),
        };
    }
    if (event.user) {
        event.user = event.user.id ? { id: event.user.id } : {};
    }
    if (Array.isArray(event.breadcrumbs)) {
        event.breadcrumbs = event.breadcrumbs.map((crumb) => ({
            ...crumb,
            message: typeof crumb.message === 'string' ? crumb.message.slice(0, 120) : crumb.message,
            data: scrubValue(crumb.data),
        }));
    }
    if (event.extra) event.extra = scrubValue(event.extra);
    if (event.contexts) event.contexts = scrubValue(event.contexts);
    if (Array.isArray(event.exception?.values)) {
        event.exception.values = event.exception.values.map((value) => ({
            ...value,
            value: typeof value.value === 'string' ? value.value.slice(0, 300) : value.value,
        }));
    }
    return event;
}

module.exports = { scrubSentryEvent, REDACTED };
