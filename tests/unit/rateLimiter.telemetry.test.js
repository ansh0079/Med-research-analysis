/**
 * Unit tests for rate limiter telemetry counters
 */

const { rateLimit, userRateLimit, setMetricsRegistry } = require('../../server/middleware/rateLimiter');
const client = require('prom-client');

describe('rateLimiter telemetry', () => {
  beforeEach(() => {
    client.register.clear();
  });

  afterAll(() => {
    client.register.clear();
  });

  test('rateLimit middleware returns function', () => {
    const middleware = rateLimit(10, 60);
    expect(typeof middleware).toBe('function');
  });

  test('userRateLimit middleware returns function', () => {
    const middleware = userRateLimit(10, 60);
    expect(typeof middleware).toBe('function');
  });

  test('setMetricsRegistry registers counters', () => {
    const registry = new client.Registry();
    setMetricsRegistry(registry);

    const metrics = registry.getMetricsAsArray();
    const names = metrics.map((m) => m.name);
    expect(names).toContain('rate_limit_hits_total');
    expect(names).toContain('rate_limit_rejections_total');
  });

  test('rateLimit middleware adds telemetry headers in test mode', async () => {
    process.env.NODE_ENV = 'test';
    const middleware = rateLimit(10, 60);

    const req = { ip: '192.168.1.1', path: '/api/test' };
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(name, value) { this.headers[name] = value; },
      status(code) { this.statusCode = code; return this; },
      json() { return this; },
    };
    const next = jest.fn();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.headers['X-RateLimit-Limit']).toBe(10);
    expect(res.headers['X-RateLimit-Remaining']).toBeDefined();
  });
});
