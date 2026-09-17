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
    // Case intake and free-text fields
    'req.body.caseText',
    'req.body.symptoms',
    'req.body.labs',
    'req.body.medications',
    'req.body.comorbidities',
    'req.body.age',
    'req.body.sex',
    'req.body.message',
    'req.body.content',
    'req.body.freeText',
    'req.body.scenario',
    'req.body.input',
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
    '**.caseText',
    '**.symptoms',
    '**.labs',
    '**.medications',
    '**.comorbidities',
    '**.age',
    '**.sex',
    '**.message',
    '**.content',
    '**.freeText',
    '**.scenario',
    '**.input',
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
