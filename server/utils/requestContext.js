'use strict';

const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

/**
 * Bind request-scoped context (correlation ID) for the current async chain.
 * @param {{ requestId?: string }} ctx
 * @param {() => unknown} fn
 */
function runWithRequestContext(ctx, fn) {
    return storage.run(ctx || {}, fn);
}

function getRequestId() {
    return storage.getStore()?.requestId || null;
}

module.exports = { runWithRequestContext, getRequestId };
