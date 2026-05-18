# Medical Research Intelligence — Production Roadmap

_Last reviewed: 2026-04-28 (post-P1 hardening + UI refresh)_  
_Previous review: 2026-04-27_

This roadmap reflects the **current** state of the codebase after a wave of security and stability fixes since the last audit. It covers what works, what is broken, what needs improvement, and a sequenced plan to get to "production-ready, accurate, efficient, and enhanced."

The audit was performed against a checked-out workspace with `npm test`, `npx tsc --noEmit`, `npx eslint .`, and `npm audit` (workspace is not a git repo so no commit history).

---

## 1. Verification Snapshot

| Check | Result | Notes |
|---|---|---|
| `npm test` | **76 / 76 passed** | Unit + integration green |
| `npx tsc --noEmit` | **0 errors** | Clean |
| `npx eslint . --quiet` | **0 errors** | Clean |
| `node --check server-enhanced.js` | OK | |
| `npm audit --omit dev` | **0 vulnerabilities** | Runtime deps clean |
| `dist/` build artifact | Present | Vite production build has run at least once |

---

## 2. What Works (delta vs. previous review)

A large fraction of the previous P0/P1 list has shipped. Concrete wins:

### Security & hardening
- **Helmet + CSP** registered in `server-enhanced.js:248–264` with strict directive set; HSTS, referrer-policy, etc. on.
- **JWT secret fail-fast**: `server-enhanced.js:28–37` aborts boot in production when `JWT_SECRET` is missing or set to the placeholder, and `CORS_ORIGINS` is required.
- **Joi validation** on all major write endpoints — schemas defined in `server-enhanced.js:296–334` and applied via `validateBody(schemas.X)`.
- **Auth gating** on `/api/ai/analyze`, `/api/ai/explain`, `/api/quiz/generate`, `/api/ai/synthesize`, `/api/articles/:id/annotations`, `/api/alerts*` (verified in `server/controllers/aiRoutes.js:26, 120, 222, 321` and `server-enhanced.js:981, 990, 1008, 1170, 1181`).
- **`@sentry/node`** initialised when `SENTRY_DSN` is set (`server-enhanced.js:52–74`); error handler captures exceptions with route metadata (`:1322–1342`).

### Data layer
- **All previously-missing `Database` methods are implemented** with consistent shapes: `logSearch`, `createSession`, `updateSessionActivity`, `saveArticle`, `unsaveArticle`, `getSavedArticles`, `cleanExpiredCache`, `getAnnotationsByArticle`, `createAnnotation`, `getCachedAnalysis`, `cacheAnalysis` (`database/index.js:300, 321, 339, 353, 373, 380, 401, 659, 674, 694, 719`).
- **Migrations directory** exists (`database/migrations/001_initial_baseline.sql`) and `runMigrations` is wired into `startServer` (`server-enhanced.js:1268–1272`).
- **Schema alignment**: `search_alerts` route now uses `req.user.id` and matches the `user_id`/`frequency`/`active`/`sources` columns (`server-enhanced.js:990–1006`, schema at `database/schema.sql:81–92`).
- **Saved articles** have a real backend pipeline: route at `server-enhanced.js:831–870` + DB method at `database/index.js:353–395` + UI hydration in `src/contexts/SearchContext.tsx:57–72` (offline-first with `localStorage` fallback and optimistic UI rollback at `:74–105`).

### Operations
- **Graceful shutdown** for `SIGTERM` / `SIGINT` drains Socket.IO and DB pools (`server-enhanced.js:1232–1259`).
- **Production safety checks** abort the process before the server starts listening if env is misconfigured.
- **Frontend exposes saved articles, alerts, citations, synthesize, vector index** through `src/services/api.ts` going through `fetchWithSession` for token + session headers.

### Build / dev experience
- TypeScript clean except for one known legacy file.
- Vite production build outputs in `dist/`.
- PM2 ecosystem (`ecosystem.config.cjs`) present.

---

## 3. What's Broken Right Now

### 3.1 ✅ Resolved — integration suite now green
Cache-shape expectation was aligned and the integration test passes.

### 3.2 ✅ Resolved — legacy TypeScript errors fixed
`Article` now includes optional legacy PubMed fields (`pmid`, `volume`, `pages`, `articleids`) and the implicit-`any` was removed.

### 3.3 ⚠️ Remaining quality debt
Lint is currently clean for errors, but there is still general style/cleanup debt in legacy and utility code worth reducing over time.

### 3.4 ✅ Resolved — runtime vulnerabilities cleared
`kysely` and `uuid` were upgraded; `npm audit --omit dev` reports zero vulnerabilities.

### 3.5 Soft-bug list
- ✅ `requireRole` now enforced for admin routes with JWT role checks.
- ✅ `last_login` now updates during `/api/auth/login`.
- ✅ Presence events now emit from socket handler and client join/leave is aligned.
- ✅ Vector search is now user-toggleable from the modern search UI.
- ✅ OpenAI/HF key fallbacks are aligned in `config.js`.
- **`saved-embedding-worker.js`** still doesn't take `serverConfig`; relies entirely on `process.env`.

### 3.6 Production-readiness gaps still open
- ✅ Structured JSON logging via `pino` + `pino-http` is live with `X-Request-Id`.
- ✅ `express-rate-limit` is active with optional Redis store (`REDIS_URL`), plus test-compatible limiter path.
- **No CSRF protection** for any state-changing endpoint (acceptable for token-auth APIs but document it).
- ✅ `compression()` middleware is enabled.
- ✅ `SENTRY_DSN` (server) is documented in `.env.example`.
- ✅ `/metrics` endpoint is available (Prometheus format).
- **In-memory cache** (`node-cache`) is per-pod; multi-instance deployments will have inconsistent caches.

---

## 4. Priorities

### P0 — fix before any production cut (1–2 days of work)
1. **Resolve `getCachedAnalysis` return-shape contract** so the integration suite is green; type the response in TS (§3.1).
2. **Upgrade `kysely` and `uuid`** to clear `npm audit` HIGH (§3.4); verify Kysely 0.28.16 query types still compile.
3. **Fix the 16 TS errors in `citationAndMemory.ts`** by extending the `Article` type with optional `pmid`, `articleids`, `volume`, `pages` fields (matches the data PubMed actually returns). Do **not** mask with `@ts-nocheck`.
4. **Wire `pino`/`pino-http`** as the request logger and replace the manual `console.log` middleware. Add a per-request `requestId` (UUID) and surface it in error responses.
5. **Implement `presence:update` server-side** OR remove the client listener (§3.5) — eliminate the dead path.

### P1 — must-have for "production-ready, accurate, efficient" (1 week)
1. **Adopt `express-rate-limit`** in front of the existing custom limiter, with a Redis store (`rate-limit-redis`) so limits hold across pods. Drop the bespoke limiter once parity is verified.
2. **Add `compression()` middleware** before static and route handlers; whitelist binary types.
3. **Sentry hardening**: call `Sentry.setupExpressErrorHandler(app)` (v8 API) instead of manual `captureException`, set `release` to `git SHA`, and add tracing for `/api/ai/*`.
4. **Update `last_login` on `/api/auth/login`** and add `failed_login_count` for basic brute-force throttling.
5. **Tighten OpenAI key plumbing**: in `config.js`, fall back through `OPENAI_KEY || OPENAI_API_KEY`. Same for HuggingFace `HUGGINGFACE_TOKEN || HF_TOKEN`. Pass keys explicitly to `saved-embedding-worker.js`.
6. **Vector search UX**: add a "Semantic" toggle in `SearchBar` that calls `api.vectorSearch` and merges with full-text results when `features.vectorSearch === true`.
7. **Apply RBAC**: convert `requireAdmin` from `ADMIN_TOKEN` to `requireRole('admin')` checking the JWT role, and gate `/api/admin/*` and any future destructive routes.
8. **CI guardrails**: a GitHub Actions workflow that runs `npm test`, `tsc --noEmit`, `eslint`, `npm audit --audit-level=high` on every PR; block merge on regressions.

### P2 — efficiency / accuracy improvements (2–3 weeks)
1. **Streaming AI responses**: switch `/api/ai/analyze`, `/api/ai/synthesize` to Server-Sent Events. Gemini and Mistral support streaming; keeps long synthesis from hitting reverse-proxy timeouts and dramatically improves perceived latency.
2. **Background queue**: introduce a small queue (BullMQ on Redis, or an in-process queue if single-pod) for `enqueueArticleForEmbedding`, alert digest sending, and PDF extraction. Today these run inline and can stall request handling.
3. **Caching audit**:
   - Move `node-cache` to Redis when `REDIS_URL` is set; keep `node-cache` as the dev fallback.
   - Add cache stampede protection (single-flight) around `/api/citations/:paperId` (currently every miss can fan out to two Semantic Scholar calls).
   - Add ETag / `Cache-Control: public, max-age=300` on idempotent search responses.
4. **Search result quality**:
   - De-dupe across sources by DOI **and** normalised title (`unifiedSearch` in `src/services/api.ts:136–142` only checks DOI/uid/title). Add an LSH or simple shingle hash for near-dupe titles.
   - Score by recency × citation count × source weight before returning; today only `_impact?.score` (which is rarely populated) drives sorting in `useSearch.ts:27–31`.
   - Pass user query to vector search and **fuse** lexical + semantic scores (RRF) when pgvector is available.
5. **PDF pipeline robustness**: cap concurrent PDF jobs in `server/pdf-extract-pooled.js` (currently uses worker pool but no global concurrency limit per IP), persist extracted text in `article_cache` to skip repeat fetches.
6. **DB query/index review**:
   - Ensure `analytics(created_at)` index on the `event_type` + `created_at` composite (current single-column index is fine for dailies but `getDailyStats` does `CASE WHEN event_type` filtering full table).
   - Consider partial indexes for `saved_articles(session_id) WHERE session_id IS NOT NULL` once volume warrants.
7. **Unit + component tests**:
   - Add Jest tests for the controllers (`aiRoutes`, `vectorRoutes`, `recommendationRoutes`).
   - Add Vitest + React Testing Library for `SearchPage`, `AIAnalysisPanel`, `SelectionBasket`, `SavedArticlesPage`.
   - Move `src/hooks/research-flow.spec.ts` into `tests/e2e/` and add a `playwright.config.ts`.
8. **Loading states & error surfaces**: every API call site in `src/pages/*` should render a skeleton or spinner and surface errors via the existing `Toast` system rather than `console.error`.

### P3 — enhancements / nice-to-have (when time permits)
1. **OAuth login** via Google / ORCID (`passport` or `lucia-auth`); ORCID is the killer feature for medical researchers.
2. **Email digests for search alerts**: alerts table exists but there is no scheduler; add a simple cron via `node-cron` that runs the alert query weekly/daily and emails a digest.
3. **Stream + cite-as-you-go synthesis**: render synthesis tokens with inline citation chips that link back to the source articles in `SelectionBasket`.
4. **Citation graph improvements**: cache `getCitations` results in `article_cache`, lazy-render the D3 graph above 200 nodes, support DOI input directly.
5. **Browser extension**: one-click save / annotate from publisher pages (Nature, NEJM, etc.).
6. **Personalised recommendations**: use the existing pgvector embeddings to drive `getUserSavedArticles`-based recommendations on a "For You" tab.
7. **Accessibility pass**: focus rings, ARIA labels on icon-only buttons, color-contrast audit on Analytics, reduced-motion respect.
8. **Internationalisation scaffolding** (`i18next`); the medical-research market is global.
9. **PWA**: service worker for offline-first reading of saved articles.

---

## 5. "Accuracy" Track — Specific Asks

These are accuracy and trust issues unique to a medical-research product:

1. **Source provenance on every result chip**: today `_source` is set in `unifiedSearch`, but the UI doesn't always badge it. Always show "PubMed", "Semantic Scholar", "OpenAlex", "Crossref" so users can audit.
2. **Disclaimer on AI outputs**: `analyzeWithAI`, `synthesize`, `explain`, `quiz` all need a persistent "Generated by AI — verify against primary sources" footer with the model and timestamp.
3. **Strict JSON parsing for quiz/structured AI**: `aiRoutes.js:298` does `text.match(/\[[\s\S]*\]/)`. Replace with a JSON repair / strict parse — return 502 on failure rather than silently dropping malformed quizzes.
4. **Pin model versions** in `aiService.js` and surface the exact version in API responses (already partial; widen coverage).
5. **Embedding model parity check**: `embeddings.js` should refuse to mix vectors of different dims; today `upsertArticleCacheVector` validates length but `searchSimilarArticlesCache` doesn't compare against the index dimension.
6. **PubMed query safety**: when relaying user input to E-utilities, encode `[Field]` operators carefully — today raw query is URL-encoded (`server-enhanced.js:491, 697`), good, but document the supported subset.
7. **Citation count freshness**: cache `pmcrefcount` for at most 24h on the article cache; refresh in the background.
8. **Determinism in synthesize**: add a `temperature: 0.2` and `max_output_tokens` cap so summaries don't drift between page reloads.

---

## 6. "Efficiency" Track — Specific Asks

1. **Compression**: `app.use(compression({ threshold: 1024 }))`.
2. **Persistent cache**: Redis behind a `CACHE_URL` env var; fall back to `node-cache`.
3. **DB connection pool tuning**: PG vector pool currently uses defaults; set `max: 20`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`.
4. **HTTP keep-alive**: pass an `Agent` with `keepAlive: true` to the global `fetch` for outbound calls (PubMed/Semantic/OpenAlex). Saves ~50–80ms per request.
5. **Parallelise `unifiedSearch` server-side**: today `Promise.all` is on the **client**; the server unified `/api/search` runs sources sequentially — switch to `Promise.allSettled([pubmed, semantic, openalex])`.
6. **SQLite WAL** is on (`database/index.js:56`); also set `synchronous = NORMAL` in production for write-heavy paths.
7. **Frontend code-splitting**: lazy `React.lazy(() => import('./pages/AnalyticsPage'))` for the analytics, quiz, and history pages.
8. **Memoize heavy filtering** in `SearchContext` using `useMemo` — currently `isSaved`/`isSelected` are O(n) per render.
9. **Avoid `JSON.parse` round-trips** in `getSavedArticles` by storing canonical columns.

---

## 7. Cleanup / Tech-debt

### 7.1 Retire the legacy bundle
Legacy bundle retirement completed in Phase 4. Legacy HTML entry points and `scripts/*.js` runtime surfaces have been removed; modern `index.html` + `src/` is now the only runtime path.

### 7.2 Documentation drift
`LAUNCH_REVIEW.md`, `CHANGELOG.md`, `SECURITY_SUMMARY.md`, and this `ROADMAP.md` overlap. Consolidate to:
- `CHANGELOG.md` — ship/release notes only.
- `ROADMAP.md` (this file) — forward-looking.
- `SECURITY.md` — security posture, contact, disclosure, audit log.
- `docs/API.md` — endpoint reference.
- Delete `LAUNCH_REVIEW.md` once its action items are covered here.

### 7.3 Unused exports / code
- `validateArticleId`, `validateArticle` (`server-enhanced.js:157, :201`) — wire them or delete.
- `requireRole` — implement RBAC (P1) or delete.
- `db.getAnalytics` (`database/index.js:562`) — wire into `/api/analytics/range` or delete.

---

## 8. Suggested Sprint Plan

### Sprint 1 — "Production-clean" (3 days)
- §3.1 Cache shape contract + integration test green
- §3.2 Article type fields + tsc clean
- §3.3 ESLint clean (`--fix` + manual)
- §3.4 `kysely` + `uuid` upgrade
- §3.6 `pino` + `pino-http` wired with request IDs
- §3.5 Server emits `presence:update` (or remove client listener)

**Exit**: `npm test`, `tsc --noEmit`, `eslint`, `npm audit --audit-level=high` all green in a CI workflow.

### Sprint 2 — "Production-hardened" (1 week)
- P1 items 1–7
- §5 accuracy items 2, 3, 4, 8
- §6 efficiency items 1, 4, 5, 7

**Exit**: deployable to Railway/Render with horizontal scaling support; structured logs in Logtail/Datadog; Sentry tracing live; rate-limit holds across pods.

### Sprint 3 — "Accuracy & UX polish" (1 week)
- P2 items 1, 2, 4 (streaming, queue, source de-dup, vector fusion)
- §5 items 1, 5, 7
- Component tests for the top 5 React surfaces

**Exit**: synthesis streams to UI, results pages visibly faster, dedup correct, vector + lexical fused, model and source provenance always visible.

### Sprint 4 — "Enhancements & cleanup" (1–2 weeks)
- §7.1 legacy retirement (completed)
- P3 items 2 (alert digests), 4 (citation graph cache), 7 (a11y)
- ORCID OAuth (P3.1) if desired

**Exit**: one modern runtime path only; one new acquisition channel (OAuth or browser extension) live; a11y AA on top pages.

---

## 9. Risk Register (delta)

| Risk | Status now | Mitigation |
|---|---|---|
| Default JWT secret in prod | **Closed** — fail-fast | Keep CI test that boots with no env to prove it still aborts |
| Missing DB methods | **Closed** | Integration test must run in CI to keep coverage |
| Schema mismatches | **Closed** | Same |
| Helmet absent | **Closed** | |
| RBAC absent | **Open (P1)** | `requireRole` exists but unused |
| Rate limit per-pod | **Open (P1)** | Move to Redis store before scaling out |
| Logging unstructured | **Open (P0)** | Pino installed; wiring is small |
| `npm audit` HIGH | **Open (P0)** | Two upgrades pending |
| Legacy duplication | **Closed** | Legacy bundle removed in Phase 4 |
| AI accuracy / hallucination | **Open (P2)** | Pin model, lower temperature, attach citations, disclaimer |

---

## 10. Quick Reference

- Server entry: `server-enhanced.js`
- Controllers: `server/controllers/{aiRoutes,vectorRoutes,recommendationRoutes}.js`
- Services: `server/services/{aiService,vectorSearchService,pdfService,recommendationService,embeddingOptions}.js`
- DB: `database/index.js`, `database/schema.sql`, `database/init-pgvector.sql`, `database/production_schema.sql`, `database/migrations/`
- Embeddings + RAG: `server/embeddings.js`, `server/synthesis-rag.js`, `server/saved-embedding-worker.js`
- Modern UI: `src/main.tsx` → `src/App.tsx` → `src/pages/*` + `src/services/api.ts`
- Legacy UI: retired in Phase 4 (modern UI only)
- Tests: `tests/unit/api.test.js`, `tests/integration/db.integration.test.js`, `tests/e2e/*`
- Ops: `ecosystem.config.cjs`, `.env.example`, `.snyk`
- Observability: `@sentry/node`, `pino` (pending wire-up), Sentry + LogRocket on the client (`src/services/api.ts:7–13`)
