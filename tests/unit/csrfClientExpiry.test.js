/**
 * The client must not keep presenting a CSRF token the server has stopped accepting.
 *
 * Tokens are <nonce>.<exp>.<sig> and the server rejects them after exp (2h). The client used to
 * cache the first token for the life of the tab, and only retried on 401, so a tab left open past
 * two hours got 403 on every mutation - search is a POST - until it was reloaded.
 */

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

const HOUR = 60 * 60 * 1000;
const token = (n, expInMs) => `nonce${n}.${Date.now() + expInMs}.sig${n}`;

function response(status, body, sid = 'sid-1') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k) => (k.toLowerCase() === 'x-session-id' ? sid : null) },
    json: async () => body,
    clone() { return this; },
  };
}

let origFetch;
beforeEach(() => {
  jest.resetModules();
  origFetch = global.fetch;
  const store = { med_research_session: 'sid-1' };
  global.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  if (!global.crypto) global.crypto = {};
  if (!global.crypto.randomUUID) global.crypto.randomUUID = () => 'uuid-test';
});
afterEach(() => { global.fetch = origFetch; });

describe('CSRF token freshness', () => {
  test('a token well inside its lifetime is reused', async () => {
    let issued = 0;
    global.fetch = jest.fn(async () => response(200, { csrfToken: token(++issued, 2 * HOUR) }));
    const { getCsrfToken } = require('../../src/services/api/csrf');
    const first = await getCsrfToken();
    expect(await getCsrfToken()).toBe(first);
    expect(issued).toBe(1);
  });

  test('a token about to expire is replaced before it is sent', async () => {
    let issued = 0;
    global.fetch = jest.fn(async () => response(200, { csrfToken: token(++issued, issued === 1 ? 30 * 1000 : 2 * HOUR) }));
    const { getCsrfToken } = require('../../src/services/api/csrf');
    const first = await getCsrfToken();
    const second = await getCsrfToken();
    expect(second).not.toBe(first);
    expect(issued).toBe(2);
  });
});

describe('a rejected token is recovered from, once', () => {
  function client() {
    const { BaseApiClient } = require('../../src/services/api/core');
    return new (class extends BaseApiClient {
      post(url) { return BaseApiClient.prototype.fetchWithSession.call(this, url, { method: 'POST', body: '{}' }); }
    })();
  }

  test('a CSRF 403 fetches a new token and retries the mutation', async () => {
    let issued = 0;
    const mutations = [];
    global.fetch = jest.fn(async (url, options = {}) => {
      if (String(url).includes('/api/csrf-token')) return response(200, { csrfToken: token(++issued, 2 * HOUR) });
      mutations.push(new Headers(options.headers).get('x-csrf-token'));
      return mutations.length === 1
        ? response(403, { error: 'CSRF token missing or invalid' })
        : response(200, { ok: true });
    });
    const res = await client().post('/api/search');
    expect(res.status).toBe(200);
    expect(mutations).toHaveLength(2);
    expect(mutations[1]).not.toBe(mutations[0]);
  });

  test('a 403 for any other reason is not retried', async () => {
    let mutations = 0;
    global.fetch = jest.fn(async (url) => {
      if (String(url).includes('/api/csrf-token')) return response(200, { csrfToken: token(1, 2 * HOUR) });
      mutations += 1;
      return response(403, { error: 'Admin only' });
    });
    const res = await client().post('/api/admin/thing');
    expect(res.status).toBe(403);
    expect(mutations).toBe(1);
  });
});
