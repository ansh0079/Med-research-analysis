const pino = require('pino');
const { getRequestId } = require('../utils/requestContext');

const logger = pino({
    level:
        process.env.LOG_LEVEL ||
        (process.env.NODE_ENV === 'test'
            ? 'silent'
            : process.env.NODE_ENV === 'production'
            ? 'info'
            : 'debug'),
    mixin() {
        const requestId = getRequestId();
        return requestId ? { requestId } : {};
    },
});

module.exports = logger;
