const pino = require('pino');
const { getRequestId } = require('../utils/requestContext');
const { activeTraceContext } = require('../utils/tracing');

const redactPaths = [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.headers.set-cookie',
    'req.headers.x-api-key',
    'req.headers.x-csrf-token',
    'req.body.password',
    'req.body.currentPassword',
    'req.body.newPassword',
    'req.body.token',
    'req.body.resetToken',
    'req.body.gradingToken',
    'req.body.email',
    'req.body.newEmail',
    'req.body.notes',
    'req.body.note',
    'req.body.query',
    'req.body.prompt',
    'req.body.presentation',
    '**.authorization',
    '**.apiKey',
    '**.accessToken',
    '**.refreshToken',
    '**.password',
    '**.token',
    '**.email',
    '**.notes',
    '**.note',
    '**.prompt',
    '**.query',
    '**.presentation',
];

const logger = pino({
    level:
        process.env.LOG_LEVEL ||
        (process.env.NODE_ENV === 'test'
            ? 'silent'
            : process.env.NODE_ENV === 'production'
            ? 'info'
            : 'debug'),
    redact: {
        paths: redactPaths,
        censor: '[REDACTED]',
    },
    mixin() {
        const requestId = getRequestId();
        return {
            ...(requestId ? { requestId } : {}),
            ...activeTraceContext(),
        };
    },
});

module.exports = logger;
module.exports.redactPaths = redactPaths;
