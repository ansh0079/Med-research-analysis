const pino = require('pino');
const { getRequestId } = require('../utils/requestContext');
const { activeTraceContext } = require('../utils/tracing');
const { REDACT_PATHS } = require('./redaction');

const logger = pino({
    level:
        process.env.LOG_LEVEL ||
        (process.env.NODE_ENV === 'test'
            ? 'silent'
            : process.env.NODE_ENV === 'production'
            ? 'info'
            : 'debug'),
    redact: {
        paths: REDACT_PATHS,
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
module.exports.redactPaths = REDACT_PATHS;
