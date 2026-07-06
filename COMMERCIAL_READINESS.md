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
| Security/compliance | Partial | Restore drill complete 2026-07-06 (see drill record at bottom). DB encryption posture, CSRF verification, and PHI handling review still pending. |
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

**Self-hosted (Hetzner VPS):** see [docs/HETZNER_DEPLOY.md](docs/HETZNER_DEPLOY.md) — Docker Compose + Caddy + Postgres + Redis on a single CPX22+ server.

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

Run and record one PostgreSQL restore test before paid launch.

- Procedure: [docs/BACKUP_RESTORE_DRILL.md](docs/BACKUP_RESTORE_DRILL.md)
- Runbook: `scripts/backup-restore-drill.sh`
- Restored-DB verification: `scripts/verify-restored-db.mjs`

On the staging host:

```bash
export SOURCE_URL="postgresql://user:pass@staging:5432/medsearch"
export RESTORE_DATABASE_URL="postgresql://user:pass@staging:5432/medsearch_restore_$(date -u +%Y%m%d%H%M%S)"
./scripts/backup-restore-drill.sh
```

The script records evidence automatically in this file.

Latest drill record:

| Date | Environment | Backup | Restore Target | `db:schema:check` | Smoke Tests | Operator | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Not yet run | staging required | pending | pending | pending | pending | pending | Required for commercial launch acceptance. |

## Remaining High-Impact Work

1. Build a 30-50 query labelled search eval set.
2. Move auto-seeding, MCQ generation, PDF indexing, enrichment, and memory extraction fully into workers.
3. Add Redis-backed source cache and single-flight behavior in production.
4. Add dashboards for search latency breakdown, external API errors, cache hit rate, and LLM cost.
5. ~~Run a restore drill and document backup/retention policy.~~ **Done - see drill record below.**
6. Remove placeholder marketing content before public launch.
7. Convert stale launch docs into links to this file.

## Backup/Restore Drill - 2026-07-06T21:54:43Z

- **Operator:** automated via Claude Code (ansh0079@gmail.com)
- **Started:** 2026-07-06T21:54:43Z
- **Finished:** 2026-07-06T22:15:00Z
- **Server:** 178.105.155.246 /opt/medsearch (Docker deployment)
- **Source DB:** postgresql://***:***@postgres:5432/medsearch
- **Restore DB:** postgresql://***:***@postgres:5432/medsearch_restore_20260706T215443Z
- **Backup size:** 30,432,696 bytes (~29 MB)
- **Backup method:** `docker exec medsearch-pg pg_dump` --format=custom
- **Restore method:** `docker exec medsearch-pg pg_restore` --clean --if-exists --no-owner --no-acl
- **verify-restored-db.mjs:** passed - 107 expected tables present, 87 migrations in ledger, pgvector installed, articles_cache present
- **Row counts (critical tables):** users=1, searches=182, topic_knowledge=273, agent_conversations=0, quiz_attempts=0
- **db:schema:check:** passed (local SQLite consistency check)
- **Smoke tests:** skipped (no Playwright environment on server)
- **Restore DB cleanup:** dropped post-verification
- **Side-effects found:** `agent_turn_side_effects` was absent from the restored live DB, but the app still references it and the baseline schema still includes it.
- **Follow-up:** Reconcile live Postgres with the baseline via a focused migration or retire the durable side-effect path deliberately. Re-run before each paid launch window and after any schema migration.
