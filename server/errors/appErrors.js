'use strict';

const RECOVERY_HINTS = {
    AUTH_REQUIRED: 'Sign in again to continue.',
    RATE_LIMITED: 'Wait a moment and retry, or reduce request frequency.',
    USAGE_LIMITED: 'Upgrade your plan or wait until the usage window resets.',
    UPGRADE_REQUIRED: 'This feature requires a paid plan — open Billing to upgrade.',
    AI_UNAVAILABLE: 'AI providers are temporarily unavailable. Retry in a few minutes.',
    VECTOR_UNAVAILABLE: 'Semantic search is offline — results use keyword ranking only.',
    VALIDATION_ERROR: 'Check your input and try again.',
    NOT_FOUND: 'The requested resource may have been removed.',
    NETWORK_ERROR: 'Check your connection and retry.',
};

class AppError extends Error {
    constructor(message, {
        code = 'INTERNAL_ERROR',
        status = 500,
        recovery = null,
        details = null,
        cause = null,
    } = {}) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.status = status;
        this.recovery = recovery || RECOVERY_HINTS[code] || null;
        this.details = details;
        if (cause) this.cause = cause;
    }

    toJSON() {
        return {
            error: this.message,
            code: this.code,
            recovery: this.recovery,
            ...(this.details ? { details: this.details } : {}),
        };
    }
}

function appErrorFromCode(code, message, options = {}) {
    const statusByCode = {
        AUTH_REQUIRED: 401,
        VALIDATION_ERROR: 400,
        NOT_FOUND: 404,
        RATE_LIMITED: 429,
        USAGE_LIMITED: 429,
        UPGRADE_REQUIRED: 402,
        AI_UNAVAILABLE: 503,
        VECTOR_UNAVAILABLE: 503,
    };
    return new AppError(message || code, {
        code,
        status: options.status ?? statusByCode[code] ?? 500,
        recovery: options.recovery,
        details: options.details,
        cause: options.cause,
    });
}

function isAppError(err) {
    return err instanceof AppError || err?.name === 'AppError';
}

function normalizeToAppError(err, fallbackMessage = 'Internal Server Error') {
    if (isAppError(err)) return err;
    if (err?.name === 'ValidationError') {
        return appErrorFromCode('VALIDATION_ERROR', err.message, { details: err.details });
    }
    if (err?.code === 'UNAVAILABLE') {
        return appErrorFromCode('VECTOR_UNAVAILABLE', err.message || 'Vector search unavailable');
    }
    if (err?.code === 'ETIMEDOUT') {
        return appErrorFromCode('NETWORK_ERROR', 'Upstream request timed out', { cause: err });
    }
    return new AppError(err?.message || fallbackMessage, {
        code: err?.code && typeof err.code === 'string' ? err.code : 'INTERNAL_ERROR',
        status: Number(err?.status) || 500,
        cause: err,
    });
}

module.exports = {
    AppError,
    appErrorFromCode,
    isAppError,
    normalizeToAppError,
    RECOVERY_HINTS,
};
