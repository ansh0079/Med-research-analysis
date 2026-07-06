# Commercial Readiness

Last updated: 2026-07-06

This is the canonical launch-readiness tracker for the app. Older launch notes and review files should be treated as historical unless they are referenced here.

## Current Decision

Status: beta-ready after verification, not full commercial launch-ready.

The product has a strong search, learning, and evidence-synthesis foundation. The remaining launch gates are mostly quality proof, operational hardening, and production configuration.

## Launch Gates

| Area | Status | Gate |
| --- | --- | --- |
| Core search | Partial | Search eval suite must pass agreed Precision@10, Recall@10, off-topic-rate, and required-type coverage thresholds. |
| Search specificity | Partial | QueryParser study type/year/specificity signals must be covered by backend tests and live eval queries. |
| Learning agent | Partial | Agent feedback, quiz outcomes, and search interactions must produce measurable learner-memory updates. |
| Payments | Blocked | Stripe keys, webhook secret, product IDs, and `PAYWALL_ENABLED=true` must be configured in production. |
| Production database | Blocked | PostgreSQL must be used for production app data; SQLite is acceptable for local/dev only. |
| Cache/rate limits | Blocked | Redis must be configured for shared cache, rate limiting, and multi-instance consistency. |
| Background jobs | Partial | LLM-heavy work should run in BullMQ workers with retries, quotas, and monitoring. |
| Observability | Partial | Sentry, pino logs, `/metrics`, and search latency breakdowns must be visible in dashboards. |
| Security/compliance | Partial | Backups, restore drill, DB encryption posture, CSRF verification, and PHI handling review must be completed. |
| Docs | Partial | Public docs, deployment docs, and launch checklist must refer to `server.js` and current env names. |

## Quality Gates

Before paid launch, run:

```bash
npm run typecheck
npm test -- --no-coverage
npm run eval:search-quality
npm run eval:agent-quality
```

Search quality should be tracked with a labelled query set rather than title-overlap heuristics alone. Recommended minimum beta thresholds:

| Metric | Beta Minimum | Commercial Target |
| --- | ---: | ---: |
| Precision@10 | 0.60 | 0.75 |
| Recall@10 | 0.50 | 0.65 |
| Off-topic rate@10 | <= 0.20 | <= 0.10 |
| Required study-type coverage | 0.80 | 0.95 |

## Learning-Agent Gates

The learning agent should improve with each interaction through these signals:

- Agent feedback: helpful, not helpful, too basic, too complex, missed question.
- Search feedback: helpful/not helpful result signals.
- Search impressions: clicked, saved, dwell time, skipped results.
- Quiz outcomes: weak outline nodes, confusing explanations, clear explanations.
- Conversation memory: rolling summary and learner snapshot per thread.

Commercial target:

- Every meaningful user interaction writes a compact learning event.
- Learner profile changes are explainable and reversible.
- Agent prompts use compact summaries rather than full raw histories.
- Evaluation reports show improved quiz performance after agent use.

## Production Environment

**Self-hosted (Hetzner VPS):** see [docs/HETZNER_DEPLOY.md](docs/HETZNER_DEPLOY.md) — Docker Compose + Caddy + Postgres + Redis on a single CPX22+ server. Operator `.env` template: [deploy/hetzner/env.example](deploy/hetzner/env.example) (aligned with this checklist; compose injects `DATABASE_URL`, `REDIS_URL`, and URL vars from `DOMAIN`).

Use [.env.production.example](.env.production.example) as the single production environment checklist. It is intentionally stricter than local `.env.example`: PostgreSQL, Redis, Stripe/paywall, email, Sentry, and at least one LLM key are required. Before staging or production traffic, run:

```bash
NODE_ENV=production npm run verify:production-env
NODE_ENV=production npm run beta:safety
```

Recommended production posture:

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
USE_POSTGRES_MAIN=true
REDIS_URL=redis://...
PAYWALL_ENABLED=true
PAYWALL_ALLOW_IN_DEV=false
REQUIRE_STRIPE=true
REQUIRE_SMTP=true
REQUIRE_VECTOR_SEARCH=true
AUTO_SEED_ON_SEARCH=false
AGENT_LLM_INTENT_CLASSIFIER=false
```

## Worker Split

Production must run separate process roles:

- `APP_ROLE=web`: HTTP/API only; enqueues BullMQ jobs and exposes `/metrics`.
- `APP_ROLE=worker`: BullMQ consumers, saved-embedding worker, and schedulers.

Use `ecosystem.config.cjs` for PM2 or `docker-compose.hetzner.yml` for Docker Compose. `REDIS_URL` is mandatory so queued jobs survive web restarts and complete on the worker. `/metrics` exposes `medsearch_job_queue_jobs` and `medsearch_job_queue_recurring_failures` for queue depth and failure monitoring.

## Backup And Restore Drill

Run and record one PostgreSQL restore test before paid launch. Procedure: [docs/BACKUP_RESTORE_DRILL.md](docs/BACKUP_RESTORE_DRILL.md).

Latest drill record:

| Date | Environment | Backup | Restore Target | `db:schema:check` | Smoke Tests | Operator | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Not yet run | staging required | pending | pending | pending | pending | pending | Required for commercial launch acceptance. |

## Remaining High-Impact Work

1. Build a 30-50 query labelled search eval set.
2. Move auto-seeding, MCQ generation, PDF indexing, enrichment, and memory extraction fully into workers.
3. Add Redis-backed source cache and single-flight behavior in production.
4. Add dashboards for search latency breakdown, external API errors, cache hit rate, and LLM cost.
5. Run a restore drill and document backup/retention policy (`docs/BACKUP_RESTORE_DRILL.md`; preflight: `npm run db:schema:check` after restore).
6. Remove placeholder marketing content before public launch.
7. Convert stale launch docs into links to this file.

## Dependency And Architecture Notes (2026-07-06)

| Area | Status |
| --- | --- |
| **Jest / ts-jest** | Jest 30 + ts-jest 29.4.x is supported (peer range includes Jest 30). No separate ts-jest@30 package. |
| **Joi vs Zod** | Intentional split: Joi for HTTP ingress + OpenAPI; Zod for shared clinical contracts + AI output validation. Consolidation is a large migration, not a quick dep bump. |
| **`ws` override** | Pinned to 8.21.0 for socket.io transitive security alignment. |
| **API client** | Namespaced composite client complete (`src/services/api/index.ts`). Stale monolithic `api.ts` references in older docs only. |
| **Agent route** | Claim extraction moved to `server/services/agentClaimExtractionService.js`; turn orchestration still in `server/routes/agent.js` (future `agentTurnService`). |
| **Production readiness** | Canonical module: `server/lib/productionReadiness.js` — used by startup, `verify:production-env`, and `/api/admin/readiness`. |
