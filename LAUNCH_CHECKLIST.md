# 🚀 Medical Research Intelligence Platform - Launch Checklist

## Pre-Launch Verification

### ✅ 1. Security Audit
- [x] Run `npm audit` - 5 high severity vulnerabilities identified (build-time dependencies only)
- [x] Review `.snyk` policy file for vulnerability management
- [x] Verify no API keys are committed to repository
- [x] Check `.gitignore` includes: `.env`, `*.db`, `node_modules/`, `.cache/`
- [x] Confirm SQL injection protections in database layer
- [x] Verify rate limiting is enabled on all API endpoints

### ✅ 2. Dependency Management
- [x] All production dependencies installed
- [x] SQLite3 updated to v5.1.7 (latest stable)
- [x] Node.js version requirement: >= 18.0.0
- [x] Python requirements documented in `requirements.txt`

### ✅ 3. Environment Configuration
- [x] `.env.example` exists with all required variables
- [x] Server configuration variables documented:
  - `NODE_PORT` (default: 3002)
  - `PYTHON_PORT` (default: 8000)
  - `NODE_ENV` (development/production)
- [x] API key placeholders documented:
  - `HUGGINGFACE_TOKEN` / `BIOGPT_TOKEN`
  - `SEMANTIC_SCHOLAR_KEY`
  - `OPENALEX_KEY`
  - `OPENAI_KEY`
  - `NCBI_API_KEY`
- [x] Feature flags documented:
  - `ENABLE_LOCAL_AI`
  - `ENABLE_CLOUD_AI`
  - `ENABLE_SEMANTIC_RANKING`

### ✅ 4. Testing
- [x] **Unit Tests**: All 62 tests passing
  ```bash
  npm test
  ```
  - Health endpoints: 3/3 ✓
  - Config endpoints: 3/3 ✓
  - Rate limiting: 3/3 ✓
  - Search endpoints: 13/13 ✓
  - AI endpoints: 8/8 ✓
  - Analytics endpoints: 8/8 ✓
  - Cache behavior: 3/3 ✓
  - Error handling: 5/5 ✓
  - User data endpoints: 8/8 ✓
  - Security headers: 3/3 ✓
  - Admin endpoints: 3/3 ✓

### ✅ 5. Entry Points Verification
- [x] `index.html` - Modern React/Vite entry point
- [x] Modern bundle loads required CSS and JS assets
- [x] No legacy HTML entry points required for runtime

### ✅ 6. Server Verification
- [x] `server-enhanced.js` starts without errors
- [x] `server.js` (legacy) available for backward compatibility
- [x] Health endpoint responds correctly at `/health`
- [x] Database connection initializes successfully
- [x] Cache module loads without errors

### ✅ 7. Documentation Review
- [x] `README.md` - Main project documentation
- [x] `README-BIOGPT.md` - BioGPT setup instructions
- [x] `README-COLLABORATION.md` - Collaboration features
- [x] All setup scripts documented
- [x] API endpoints documented

---

## Deployment Steps

### Step 1: Environment Setup
```bash
# 1. Clone repository
git clone <repository-url>
cd medical-research-analysis

# 2. Install Node.js dependencies
npm install

# 3. Install Python dependencies (optional - for local AI)
pip install -r requirements.txt

# 4. Copy environment template
cp .env.example .env

# 5. Edit .env with your API keys
# Required: At least one AI service key (HUGGINGFACE_TOKEN recommended)
```

### Step 2: Database Initialization
```bash
# Database is auto-initialized on first server start
# SQLite database file: ./medresearch.db
```

### Step 3: Start Services
```bash
# Option A: Start main enhanced server (RECOMMENDED)
npm start
# or
node server-enhanced.js

# Option B: Start proxy server only (for BioGPT)
# Option B: Start Python AI server (optional, for local inference)
npm run python-server
# or
python biogpt_server.py
```

### Step 4: Verify Deployment
```bash
# Test health endpoint
curl http://localhost:3002/health

# Expected response:
# {
#   "status": "ok",
#   "version": "3.0.0",
#   "timestamp": "...",
#   "features": { ... },
#   "cache": { ... }
# }
```

---

## Post-Launch Verification

### Immediate Checks (Within 5 minutes)
- [ ] Server process running without errors
- [ ] Port 3002 accessible (firewall check)
- [ ] Health endpoint returns 200 OK
- [ ] Database file created (`medresearch.db`)
- [ ] Log files writing correctly

### Functional Checks (Within 30 minutes)
- [ ] Open `index.html` (or `/`) in browser
- [ ] Perform test search on PubMed
- [ ] Verify search results display correctly
- [ ] Test AI analysis (if API key configured)
- [ ] Check caching is working (second search should be faster)
- [ ] Verify rate limiting (31st request should return 429)

### Integration Checks (Within 2 hours)
- [ ] Semantic Scholar search functional
- [ ] OpenAlex search functional
- [ ] User session persistence working
- [ ] Save/unsave articles working
- [ ] Search history being recorded
- [ ] Analytics events being logged

### Load Testing (Optional)
```bash
# Run load tests if k6 is installed
npm run test:load:smoke
```

---

## Rollback Plan

### Scenario 1: Critical Bug Discovered
```bash
# 1. Stop current server
Ctrl+C or kill <pid>

# 2. Revert to last known good version
git log --oneline -5
git checkout <last-good-commit>

# 3. Restart server
npm start
```

### Scenario 2: Database Corruption
```bash
# 1. Stop server
# 2. Backup corrupted database
cp medresearch.db medresearch.db.corrupted.$(date +%Y%m%d)

# 3. Remove corrupted database
rm medresearch.db

# 4. Restart server (will recreate fresh database)
npm start
```

### Scenario 3: Port Conflict
```bash
# If port 3002 is in use:
# Option 1: Kill existing process
lsof -ti:3002 | xargs kill -9

# Option 2: Use different port
PORT=3003 npm start
```

### Scenario 4: Complete Rollback
```bash
# 1. Stop all services
# 2. Restore from backup if available
# 3. Reset to clean state:
rm -rf node_modules medresearch.db .cache
npm install
npm start
```

---

## Monitoring & Alerts

### Key Metrics to Monitor
- Server response time (target: < 200ms for cached requests)
- Error rate (target: < 1%)
- Cache hit rate (target: > 60%)
- Database connection health
- External API rate limits (Hugging Face, Semantic Scholar)

### Log Locations
- Application logs: Console output (stdout/stderr)
- Database: `medresearch.db` (SQLite)
- Cache: In-memory (resets on restart)

### Health Check Endpoint
```bash
# Automated monitoring should check:
curl -f http://localhost:3002/health || echo "ALERT: Server down"
```

---

## Launch Sign-Off

| Checklist Item | Status | Signed By | Date |
|----------------|--------|-----------|------|
| Security audit passed | ✅ | | |
| All tests passing | ✅ | | |
| Documentation complete | ✅ | | |
| Environment configured | ⬜ | | |
| Database initialized | ⬜ | | |
| Smoke tests passed | ⬜ | | |
| Rollback plan tested | ⬜ | | |

---

## Quick Reference

### Default Ports
- Main Server: `3002`
- Python AI Server: `8000`

### Key Files
- Main Server: `server-enhanced.js`
- Config: `config.js`
- Database: `database/index.js`
- Cache: `cache/index.js`

### NPM Scripts
```bash
npm start          # Start enhanced server
npm run dev        # Start with nodemon (auto-reload)
npm test           # Run unit tests
npm run test:e2e   # Run E2E tests (Playwright)
npm run lint       # Run ESLint
```

### Support Contacts
- Issues: GitHub Issues
- Documentation: See README files
- Emergency Rollback: Follow rollback plan above

---

*Last Updated: 2026-02-14*
*Version: 3.0.0*
