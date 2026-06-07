'use strict';

/**
 * Content Sanitization Utilities
 * 
 * Protects against XSS, injection attacks, and malicious content in user inputs.
 */

/**
 * Sanitizes user text input by removing HTML tags and limiting length
 */
function sanitizeUserInput(text, maxLength = 2000) {
    if (!text) return '';
    
    let sanitized = String(text);
    
    // Remove HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    
    // Remove script-like patterns
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');
    
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');
    
    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    
    // Limit length
    return sanitized.slice(0, maxLength);
}

/**
 * Sanitizes markdown content (allows safe markdown, removes dangerous HTML)
 */
function sanitizeMarkdown(markdown, maxLength = 10000) {
    if (!markdown) return '';
    
    let sanitized = String(markdown).slice(0, maxLength);
    
    // Remove dangerous HTML tags but allow safe markdown
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
    sanitized = sanitized.replace(/<embed\b[^>]*>/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');
    
    return sanitized;
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
    
    let sanitized = String(query);
    
    // Remove SQL injection patterns
    sanitized = sanitized.replace(/;\s*(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE)\s/gi, '');
    sanitized = sanitized.replace(/--/g, '');
    sanitized = sanitized.replace(/\/\*/g, '');
    
    // Remove script patterns
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
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
    sanitized = sanitized.replace(/[\/\\]{2,}/g, '/');
    
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
    sanitizeTopicName,
    sanitizeMedicalQuery,
    sanitizeJsonInput,
    sanitizeEmail,
    sanitizeFilePath,
    sanitizeUrl,
    generateRateLimitKey
};
