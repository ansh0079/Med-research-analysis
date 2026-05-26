'use strict';

const DEFAULT_AI_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS || 180000);

/**
 * Extend socket timeout for long-running AI routes (LLM synthesis, streaming, quiz generation).
 */
function extendAiTimeout(timeoutMs = DEFAULT_AI_TIMEOUT_MS) {
    return (req, res, next) => {
        if (req.socket && typeof req.socket.setTimeout === 'function') {
            req.socket.setTimeout(timeoutMs);
        }
        if (typeof req.setTimeout === 'function') {
            req.setTimeout(timeoutMs);
        }
        if (typeof res.setTimeout === 'function') {
            res.setTimeout(timeoutMs);
        }
        next();
    };
}

module.exports = { extendAiTimeout, DEFAULT_AI_TIMEOUT_MS };
