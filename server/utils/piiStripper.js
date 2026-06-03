'use strict';

/**
 * Lightweight server-side PII stripper for clinical case text.
 * Removes common identifiers before sending to external AI services.
 * This is a defense-in-depth measure — the prompt also instructs the model to ignore identifiers.
 */

const PII_PATTERNS = [
    // NHS / MRN numbers
    { regex: /\b\d{3}[-\s]?\d{3}[-\s]?\d{4}\b/g, replacement: '[REDACTED-PHONE]' },
    { regex: /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, replacement: '[REDACTED-DOB]' },
    { regex: /\b\d{4}-\d{2}-\d{2}\b/g, replacement: '[REDACTED-DOB]' },
    // Email addresses
    { regex: /[\w.-]+@[\w.-]+\.\w+/g, replacement: '[REDACTED-EMAIL]' },
    // UK postcodes
    { regex: /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/gi, replacement: '[REDACTED-POSTCODE]' },
    // Simple phone numbers
    { regex: /\b\+?\d[\d\s-]{7,}\d\b/g, replacement: '[REDACTED-PHONE]' },
    // NHS number (10 digits)
    { regex: /\b\d{3}\s?\d{3}\s?\d{4}\b/g, replacement: '[REDACTED-NHS]' },
];

function stripPii(text) {
    if (!text || typeof text !== 'string') return text;
    let cleaned = text;
    for (const { regex, replacement } of PII_PATTERNS) {
        cleaned = cleaned.replace(regex, replacement);
    }
    return cleaned;
}

module.exports = { stripPii };
