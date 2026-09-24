/**
 * Verifies BaseApiClient cold-start session sync:
 * - No prior sessionId in instance or storage
 * - CSRF token fetch returns X-Session-Id = sid-1
 * - Mutation includes the same X-Session-Id and X-CSRF-Token
 */

// Frontend alias shims for backend Jest project
jest.mock('@utils/appErrors', () => ({
  AppError: class AppError extends Error { constructor(message) { super(message); this.name = 'AppError'; } },
  parseApiErrorBody: jest.fn(() => new Error('Internal')),
}), { virtual: true });
jest.mock('@utils/usageErrors', () => ({
  buildUsageLimitError: jest.fn(() => 'USAGE_LIMITED'),
}), { virtual: true });
jest.mock('@sentry/react', () => ({
  init: jest.fn(),
  withScope: (fn) => fn({ setExtra: jest.fn() }),
  captureException: jest.fn(),
}), { virtual: true });

const { BaseApiClient } = require('../../src/services/api/core');

describe('BaseApiClient — cold-start session sync for CSRF', () => {
  let origFetch;
  let calls;

  beforeEach(() => {
    origFetch = global.fetch;
    calls = [];
    global.fetch = jest.fn(async (url, options = {}) => {
      calls.push({ url, options });
      if (String(url).includes('/api/csrf-token')) {
        return {
          ok: true,
          status: 200,
          headers: { get: (k) => (k.toLowerCase() === 'x-session-id' ? 'sid-1' : null) },
          json: async () => ({ csrfToken: 't-1' }),
        };
      }
      // Mutation call
      return {
        ok: true,
        status: 200,
        headers: { get: (k) => (k.toLowerCase() === 'x-session-id' ? 'sid-1' : null) },
        json: async () => ({}),
        clone: function () { return this; },
      };
    });
    // Minimal localStorage shim
    const store = {};
    global.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    };
    // Ensure crypto.randomUUID exists
    if (!global.crypto) global.crypto = {};
    if (!global.crypto.randomUUID) {
      global.crypto.randomUUID = () => 'uuid-test';
    }
  });

  afterEach(() => {
    global.fetch = origFetch;
  });

  test('mutation carries X-Session-Id returned by CSRF issuance and X-CSRF-Token', async () => {
    class TestClient extends BaseApiClient {
      async mutate() {
        // Protected method is callable within subclass; call via prototype to avoid TS guard.
        // @ts-ignore
        const res = await BaseApiClient.prototype.fetchWithSession.call(this, '/api/mutate', { method: 'POST' });
        return res;
      }
    }
    const client = new TestClient();
    await client.mutate();
    // Expect two calls: CSRF then mutation
    expect(calls.length).toBeGreaterThanOrEqual(2);
    const mutate = calls[calls.length - 1];
    const hdrs = new Map();
    if (mutate.options && mutate.options.headers && typeof mutate.options.headers.forEach === 'function') {
      mutate.options.headers.forEach((v, k) => hdrs.set(String(k).toLowerCase(), v));
    } else if (mutate.options && mutate.options.headers) {
      Object.entries(mutate.options.headers).forEach(([k, v]) => hdrs.set(String(k).toLowerCase(), v));
    }
    expect(hdrs.get('x-session-id')).toBe('sid-1');
    expect(hdrs.get('x-csrf-token')).toBe('t-1');
  });
});

