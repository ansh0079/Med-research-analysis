Signal MD — Architecture and Risk Review

Last updated: 2026-09-16
Scope: review-only assessment of the current repository (React/Vite + Express, SQLite/Postgres, Redis workers). No refactors performed. This document is intended for Anshuman and Jhonnie to prioritize the next sprint.

1) Architecture map (plain language)

- Frontend (React + Vite):
  - Location: src/, entry in src/main.tsx and src/App.tsx.
  - Routing: react-router; protected routes for most features; guest access to landing/auth/legal.
  - Key surfaces: SearchPage (primary), Quiz, Learning dashboard, Guideline browser, Team workspace, Admin observability.
  - Dev server: Vite on 5173; proxies /api, /health, /socket.io to the Node server port from env.
  - Error/compliance UX: ErrorBoundary, Cookie/Consent banners, PHI notice, onboarding modal.

- API (Express):
  - Entrypoints: app.js (Express app and routes), server.js (boot, DB connect, cache, schedulers, workers, graceful shutdown).
  - Routes grouped by domain under server/routes/: search, ai (analysis/synthesis/quiz/jobs), learning, team, admin/observability, billing, vector, etc.
  - Middleware/ops: helmet CSP, CORS with allowlist, cookie-parser, optional/strict auth (JWT), per-route rate limits, slowdown for AI, per-request logging (pino-http), OpenTelemetry spans, Prometheus /metrics, CSRF checks for unsafe methods in production, session tracking via X-Session-Id.
  - Stripe webhook supported via express.raw() body on /api/billing/webhook.
  - Socket.IO: server created around Express app; io exposed on req for broadcasting.

- Background jobs and schedulers:
  - BullMQ + Redis when REDIS_URL set; otherwise in-memory queue fallback for local dev. Service wrapper: server/services/ops/jobQueue.js (exported via server/services/jobQueue.js).
  - Queues: pdf, embedding, search, digest, ai-generation. Concurrency tuned; Redis-backed stats for observability; admin endpoints expose queue status and recurring failures.
  - Workers: server/worker.js starts BullMQ workers and cron schedulers when APP_ROLE=worker (or all in dev). Health server on WORKER_HEALTH_PORT.
  - Saved embedding worker: server/saved-embedding-worker.js enqueues vector-embedding jobs for saved articles.
  - Cron/scheduler registry: server/services/schedulerRegistry and related services; heartbeats recorded to DB and surfaced via admin.

- Data stores:
  - Application DB: database/ (DatabaseCore.js). Local dev: SQLite (better-sqlite3 + Kysely). Production: PostgreSQL (pg + Kysely).
  - Vector DB: optional pgvector connection via PG_VECTOR_URL for embeddings and vector search.
  - Redis (optional in dev, required in prod): cache L2, shared rate limits, sessions, and BullMQ queues (ioredis).
  - Migrations: database/migrations with SQLite->PG DDL translation; production_schema.sql bootstraps PG; baseline/aliases handled to avoid duplicate failures. Dialect containment scripts exist.
  - Observability data: Prometheus counters/histograms for HTTP and queue metrics; Sentry hooks present; OpenTelemetry initialized conditionally.

- AI providers and flows:
  - Provider selection: server/utils/aiProvider.js with pinned models and failover logic across Anthropic, Gemini, Mistral (tests verify credit/outage fallback).
  - Analysis & synthesis endpoints: server/routes/ai/* with SSE variants; usage logging via llmUsageService.
  - RAG context appender for saved articles when vector search available.
  - Learning/quiz: server/routes/ai/quiz, learning/* with validation and caching around answer commitment.

- Deployment/dev tooling:
  - Dockerfile for full stack image.
  - docker-compose.postgres.yml (local PG + pgvector).
  - docker-compose.hetzner.yml (prod-like: Postgres, Redis, web, worker, GROBID, Caddy).
  - CI Playwright workflows for E2E; infra acceptance and production env verification scripts.

2) Top risks (ranked P0/P1/P2)

- P0 (must address first)
  - Security/Privacy: Production relies on a custom CSRF check (sec-fetch-site + Origin/Referer + X-Requested-With) rather than a robust token-based CSRF solution. While safer than nothing, token binding or double-submit cookie patterns would provide stronger defense on state-changing routes.
  - Security/Privacy: Session/JWT handling is sound overall (httpOnly cookies, fail-fast JWT secret checks), but ensure logs never include prompt bodies, free-text inputs, or PHI. Pino request logging + any custom logging in services should sanitize payload fields for AI, search queries, notes, etc. This is policy-documented but not enforced centrally.
  - Correctness: Mixed-dialect risk exists by design (SQLite locally, Postgres in prod). Mitigations (DDL converter, dialect gate, PG smoke) are in place; continued discipline is needed. Any new raw SQL must be covered by the dialect linter and PG integration tests.
  - Production readiness: Redis is effectively required in production (queues, rate limits, session cache). The code enforces and surfaces this via productionReadiness checks; deployment must keep REDIS_URL live and monitored. Queue depth/failure alerts should be hooked to on-call.

- P1 (high priority, not immediate fire)
  - Security/Privacy: CSRF policy excludes test env and relies on headers. Cross-origin XHRs that manipulate cookies remain a risk if a misconfigured CORS origin sneaks into env. Add explicit tests for CORS/CSRF interplay and pin stricter defaults.
  - Correctness: AI provider selection and backoff logic is much improved (tests cover credit/outage), but ensure all long-running routes consistently apply the extended timeout and slowdown/ratelimits; handoffs to BullMQ must not bypass those limits.
  - Test gaps: E2E covers primary flows, but add smoke for: (1) vector-enabled RAG synthesis; (2) anonymous beta vs strict auth gating; (3) admin observability authorization; (4) Stripe webhook happy-path; (5) PDF preindex flow (enqueue + retrieval) against a running GROBID container (in CI as optional job).
  - DX/runnability: Vite + API dev experience is good. One-command “verify local stack” (DB, optional Redis, vector) would reduce new-dev friction, though verify:infra exists; make it the default onboarding step in README.
  - Performance: PDF extraction is synchronous (in-thread) by design for stability. Under heavy load this can still transiently impact event loop; guard via concurrency + ensure enqueues prefer worker/queue path where feasible.

- P2 (medium priority)
  - Security/Privacy: Optional monitoring (Sentry/LogRocket) has privacy guidance but ensure any client-side session replay is disabled or strongly sanitized by default for medical contexts. Default envs disable recording; keep it that way unless governance approves.
  - Production readiness: Alerting via /metrics exists, but external dashboards/alerts are manual. Document a minimal Prometheus + Alertmanager or Sentry metric-conditions setup for queue depth, AI error rate, search latency p95, and 5xx rate.
  - Performance: Add basic load test gates on search endpoints (k6 exists) to catch regressions in external API fanout, dedupe, and ranking.

3) Concrete test plan

- Local unit/integration tests:
  - Setup: nvm use; npm ci; cp .env.example .env; npm test
  - Useful subsets: 
    - npm run test:platform-hardening (auth, errors, observability guards)
    - npm run test:search-pipeline-integration
    - npm run test:search-quality-gate and npm run test:offline-policy
  - PG dialect smoke (requires Postgres): docker compose -f docker-compose.postgres.yml up -d; npm run db:migrate:postgres; run npm test plus npm run verify:sql-dialect

- Local E2E (Playwright):
  - Start server in test mode (auto): npx playwright install --with-deps; npm run test:e2e:ci
  - Targets (first smoke set):
    1) tests/e2e/beta-smoke.spec.js — landing, beta flow gating, search happy path
    2) tests/e2e/research-flow.spec.js — search → analysis/synthesis → save
    3) tests/e2e/learning-pipeline.spec.js — quiz launch, commit/grade, submit
  - Optional extended:
    - tests/e2e/real-auth-flows.spec.js (needs auth setup)
    - Add vector-enabled smoke (PG + PG_VECTOR_URL); assert RAG hint present in synthesis output when saved articles exist.

- Production/staging verification (non-secret, script-backed):
  - npm run verify:production-env (strict env gates: Postgres, Redis, Stripe, SMTP, AI keys)
  - npm run verify:infra (Postgres, Redis, vector, /metrics, Sentry presence)
  - k6 smoke (optional): npm run test:load:smoke (guards typical /api/search fanout)

4) Top 5 improvement recommendations (high leverage, low risk)

1. Add a CSRF token on high-risk POST routes (auth changes, profile, billing helpers) while keeping the existing header/origin checks as defense-in-depth. A minimal double-submit cookie implementation is sufficient and low touch.
2. Centralize request-body redaction for logs: install a pino redact rule for known sensitive keys (prompt, query, notes, email, token) and ensure AI/body payloads are never logged at info/warn by default. This is easy and materially reduces PHI/PII risk.
3. Promote verify:infra to README Quick Start and wire it into CI as a non-blocking job for PRs (warn-only). It catches misconfigured PG/Redis early and improves DX.
4. Add a tiny Playwright smoke focused on vector-enabled RAG (behind an env flag); run it when PG_VECTOR_URL is present in CI. Validates end-to-end evidence augmentation.
5. Add queue-depth and recurring-failure alerts to the standard ops checklist (Prometheus/Sentry conditions). The code already exposes metrics and summaries; this is a config/documentation task that pays off with real-time signal.

5) Local drift vs origin/main

- Git status: main is clean and in sync with origin/main. No uncommitted changes detected. No pending local edits relative to origin/main.

6) Notes on secrets and environment

- No .env with real secrets is committed. .env.example and .env.production.example enumerate required keys. .gitignore excludes .env and DB files. Continue rotating secrets following README guidance if any were ever exposed elsewhere.

Appendix: How to run locally (happy path)

```bash
nvm use
npm ci
cp .env.example .env
npm run dev
# API at http://localhost:3002 ; Web at http://localhost:5173
```

Key commands

- Unit/Integration: npm test
- E2E smoke: npx playwright install --with-deps && npm run test:e2e:ci
- PG dialect guard: docker compose -f docker-compose.postgres.yml up -d && npm run db:migrate:postgres && npm run verify:sql-dialect
- Production env check: NODE_ENV=production npm run verify:production-env
- Infra acceptance: npm run verify:infra

