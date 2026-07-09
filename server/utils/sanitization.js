'use strict';

/**
 * Content Sanitization Utilities
 *
 * Protects against XSS, injection attacks, and malicious content in user inputs.
 */

function resolveOptions(maxLengthOrOptions, defaults = {}) {
    if (typeof maxLengthOrOptions === 'object' && maxLengthOrOptions !== null) {
        return {
            ...defaults,
            ...maxLengthOrOptions,
        };
    }
    return {
        ...defaults,
        maxLength: Number.isFinite(maxLengthOrOptions) ? maxLengthOrOptions : defaults.maxLength,
    };
}

function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function stripControlChars(text) {
    return String(text)
        .replace(/\0/g, '')
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

function neutralizeDangerousProtocols(text) {
    return String(text).replace(
        // eslint-disable-next-line no-control-regex
        /\b(?:j[\s\u0000-\u001F]*a[\s\u0000-\u001F]*v[\s\u0000-\u001F]*a[\s\u0000-\u001F]*s[\s\u0000-\u001F]*c[\s\u0000-\u001F]*r[\s\u0000-\u001F]*i[\s\u0000-\u001F]*p[\s\u0000-\u001F]*t|v[\s\u0000-\u001F]*b[\s\u0000-\u001F]*s[\s\u0000-\u001F]*c[\s\u0000-\u001F]*r[\s\u0000-\u001F]*i[\s\u0000-\u001F]*p[\s\u0000-\u001F]*t|d[\s\u0000-\u001F]*a[\s\u0000-\u001F]*t[\s\u0000-\u001F]*a)\s*:/gi,
        'blocked:'
    );
}

/**
 * Sanitizes user text input by converting dangerous markup into inert text.
 */
function sanitizeUserInput(text, maxLength = 2000) {
    if (!text) return '';
    const options = resolveOptions(maxLength, { maxLength: 2000, escapeHtml: true, normalizeWhitespace: true });

    let sanitized = stripControlChars(text);
    sanitized = neutralizeDangerousProtocols(sanitized);

    if (options.escapeHtml) {
        sanitized = escapeHtml(sanitized);
    }

    if (options.normalizeWhitespace) {
        sanitized = sanitized.replace(/\s+/g, ' ').trim();
    } else {
        sanitized = sanitized.trim();
    }

    return sanitized.slice(0, options.maxLength);
}

/**
 * Sanitizes markdown content by keeping markdown syntax and escaping raw HTML.
 */
function sanitizeMarkdown(markdown, maxLength = 10000) {
    if (!markdown) return '';
    const options = resolveOptions(maxLength, { maxLength: 10000, escapeHtml: true });

    let sanitized = stripControlChars(markdown);
    sanitized = neutralizeDangerousProtocols(sanitized);

    if (options.escapeHtml) {
        sanitized = escapeHtml(sanitized);
    }

    return sanitized.slice(0, options.maxLength);
}

/**
 * Sanitizes topic names (alphanumeric + spaces/hyphens only)
 */
function sanitizeTopicName(topic) {
    if (!topic) return '';
    return String(topic)
        .replace(/[^a-zA-Z0-9\s\-_]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 200);
}

/**
 * Sanitizes medical query (removes dangerous patterns but preserves medical terms)
 */
function sanitizeMedicalQuery(query) {
    if (!query) return '';

    let sanitized = stripControlChars(query);

    // Remove SQL injection patterns
    sanitized = sanitized.replace(/;\s*(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE)\s/gi, '');
    sanitized = sanitized.replace(/--/g, '');
    sanitized = sanitized.replace(/\/\*/g, '');

    sanitized = neutralizeDangerousProtocols(sanitized);
    sanitized = escapeHtml(sanitized);

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    return sanitized.slice(0, 500);
}

/**
 * Validates and sanitizes JSON input
 */
function sanitizeJsonInput(input, schema = null) {
    try {
        const parsed = typeof input === 'string' ? JSON.parse(input) : input;

        // Recursive sanitization for string values
        const sanitizeObject = (obj) => {
            if (typeof obj === 'string') {
                return sanitizeUserInput(obj, 5000);
            }
            if (Array.isArray(obj)) {
                return obj.map(sanitizeObject);
            }
            if (obj && typeof obj === 'object') {
                const sanitized = {};
                for (const [key, value] of Object.entries(obj)) {
                    // Sanitize keys too
                    const safeKey = String(key).replace(/[^a-zA-Z0-9_]/g, '').slice(0, 100);
                    sanitized[safeKey] = sanitizeObject(value);
                }
                return sanitized;
            }
            return obj;
        };

        return sanitizeObject(parsed);
    } catch (err) {
        throw new Error('Invalid JSON input');
    }
}

/**
 * Validates email addresses
 */
function sanitizeEmail(email) {
    if (!email) return '';

    const sanitized = String(email).toLowerCase().trim().slice(0, 320);

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitized)) {
        throw new Error('Invalid email format');
    }

    return sanitized;
}

/**
 * Sanitizes file paths (prevents directory traversal)
 */
function sanitizeFilePath(filePath) {
    if (!filePath) return '';

    let sanitized = String(filePath);

    // Remove directory traversal attempts
    sanitized = sanitized.replace(/\.\./g, '');
    sanitized = sanitized.replace(/[/\\]{2,}/g, '/');

    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>:"|?*]/g, '');

    return sanitized.slice(0, 255);
}

/**
 * Sanitizes URLs (only allows http/https)
 */
function sanitizeUrl(url) {
    if (!url) return '';

    const sanitized = String(url).trim().slice(0, 2048);

    try {
        const parsed = new URL(sanitized);

        // Only allow http and https
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new Error('Invalid URL protocol');
        }

        return parsed.toString();
    } catch (err) {
        throw new Error('Invalid URL format');
    }
}

/**
 * Rate limiting helper - generates a user-specific key
 */
function generateRateLimitKey(userId, action, window = '1h') {
    return `ratelimit:${action}:${userId}:${window}`;
}

module.exports = {
    sanitizeUserInput,
    sanitizeMarkdown,
    escapeHtml,
    sanitizeTopicName,
    sanitizeMedicalQuery,
    sanitizeJsonInput,
    sanitizeEmail,
    sanitizeFilePath,
    sanitizeUrl,
    generateRateLimitKey
};
