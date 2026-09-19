const crypto = require('crypto');

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const DEFAULT_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function getSecret() {
  const secret = process.env.CSRF_SECRET || process.env.JWT_SECRET || 'dev-csrf-secret';
  return String(secret);
}

function base64url(inputBuffer) {
  return Buffer.from(inputBuffer).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function sign(payload, secret) {
  const h = crypto.createHmac('sha256', secret);
  h.update(payload);
  return base64url(h.digest());
}

function buildCookieOptions(ttlMs) {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProd,
    path: '/',
    maxAge: ttlMs,
  };
}

/**
 * Issue a CSRF token tied to the current session.
 * Token format: <nonce>.<exp>.<sig> where sig = HMAC(secret, "<sid>.<nonce>.<exp>")
 */
function issueCsrfToken(req, res) {
  const secret = getSecret();
  const sessionId = req.sessionId || 'anon';
  const ttlMs = DEFAULT_TTL_MS;

  const nonce = base64url(crypto.randomBytes(16));
  const exp = Date.now() + ttlMs;
  const payload = `${sessionId}.${nonce}.${exp}`;
  const sig = sign(payload, secret);
  const token = `${nonce}.${exp}.${sig}`;

  res.cookie(CSRF_COOKIE_NAME, token, buildCookieOptions(ttlMs));
  return token;
}

function parseToken(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [nonce, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp)) return null;
  return { nonce, exp, sig };
}

/**
 * Validate the CSRF token:
 * - Header and cookie must both be present and equal
 * - Signature must match HMAC(secret, "<sid>.<nonce>.<exp>")
 * - Not expired
 */
function isValidCsrf(req) {
  const headerToken = String(req.headers[CSRF_HEADER_NAME] || '');
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  if (!headerToken || !cookieToken) return false;
  if (headerToken !== cookieToken) return false;

  const parsed = parseToken(headerToken);
  if (!parsed) return false;
  if (Date.now() > parsed.exp) return false;

  const sessionId = req.sessionId || 'anon';
  const expected = sign(`${sessionId}.${parsed.nonce}.${parsed.exp}`, getSecret());
  const a = Buffer.from(parsed.sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Registers the CSRF token issuance endpoint.
 * GET /api/csrf-token => { csrfToken }
 */
function registerCsrfRoutes(app) {
  app.get('/api/csrf-token', (req, res) => {
    try {
      const csrfToken = issueCsrfToken(req, res);
      res.json({ csrfToken });
    } catch (err) {
      req.log?.error?.({ err }, 'Failed to issue CSRF token');
      res.status(500).json({ error: 'Failed to issue CSRF token' });
    }
  });
}

/**
 * Global CSRF guard for unsafe HTTP methods.
 * Exempts known verified-webhook endpoints (e.g., Stripe) and OPTIONS preflights.
 */
function requireCsrfToken() {
  const EXEMPT_PATHS = [
    // Stripe webhook: verified via signature, uses raw body
    /^\/api\/billing\/webhook$/,
  ];

  return (req, res, next) => {
    const method = String(req.method || 'GET').toUpperCase();
    if (method === 'OPTIONS' || method === 'GET' || method === 'HEAD') return next();
    if (EXEMPT_PATHS.some((rx) => rx.test(req.path))) return next();

    if (!isValidCsrf(req)) {
      return res.status(403).json({ error: 'CSRF token missing or invalid' });
    }
    return next();
  };
}

module.exports = {
  registerCsrfRoutes,
  requireCsrfToken,
  // Expose internals for targeted unit tests
  __test__: { issueCsrfToken, isValidCsrf, parseToken, CSRF_COOKIE_NAME, CSRF_HEADER_NAME },
};

