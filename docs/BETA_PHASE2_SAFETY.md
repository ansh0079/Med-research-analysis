# Beta Phase 2 Safety Gate

Phase 2 is the minimum safety gate before inviting real beta users. It is not a commercial-launch clearance.

## Required Before Cohort 0

- Production-like staging uses PostgreSQL through `DATABASE_URL`.
- Redis is configured through `REDIS_URL` for shared rate limits, auth security, cache, and queues.
- Latest migration has a matching rollback in `database/rollbacks`.
- `/health` reports `status: "ok"` and `database.ok: true`.
- Privacy/terms clearly prohibit PHI submission and clinical decision-making use.
- Telemetry sanitizes prompts, search queries, case text, annotations, messages, and article content.
- AI outputs continue to include provider/model/timestamp/disclaimer where the endpoint generates new medical content.
- Content reporting, synopsis feedback, and admin/curator quality queues are reachable.
- Account deletion has been manually tested for a beta user.

## Run The Gate

Local/static checks:

```bash
npm run beta:safety
```

With a deployed staging app:

```bash
BETA_BASE_URL=https://staging.example.com npm run beta:safety
```

The script wraps `verify:production-env`, checks rollback coverage for the newest migration, checks legal/privacy copy, checks telemetry sanitization keys, and optionally probes `/health`.

## Status, 2 October 2026

Ships with the shared synthesis cache: canonical topic keys, per-account login limits, the ranker gate in CI, and a daily guideline stale-flag that runs while the watchtower stays paused.

Still not a commercial clearance:

- Account journeys (verify email, reset replay, two-account isolation, logout, deletion) are manual checks against production. They are not done from this workspace.
- Backup restore uses `scripts/backup-restore-drill.sh` into an isolated database. It is not a restore over the live database.
- `/health` reports `cache.persistence.appendonly` after this deploy. Confirm it is `yes`.
- Sentry events drop request bodies, query strings, prompts, and email. A live test error still has to be sent from production.
- The ranker gate stays `NOT PROVEN` while learning outcomes, shadow samples, and gold labels are zero. Lane retrieval stays off.
- 42 evaluation scenarios have no independent clinician labels. Automated tests do not fill that gap.
- Collective-memory, topic-evolution, knowledge-drift, guideline-watchtower, and enrichment stay paused. Interaction capture is on. That is not a claim that reinforcement learning is improving production results.
- Cache hit rate on `/health` `cache.layers` starts empty on the new process and is the number to watch after deploy.

## Manual Smoke Tests

Run these against staging before cohort 0:

```text
1. Register, verify email if enabled, log out, log in.
2. Refresh the page after access-token expiry and confirm refresh-token rotation keeps the session.
3. Log out and confirm the previous access token cannot call an authenticated route.
4. Reset password and confirm old sessions are invalidated.
5. Create and delete an annotation; confirm text renders as text, not HTML.
6. Generate one synthesis/quiz/case and verify disclaimer, provider, model, and generated timestamp are visible where applicable.
7. Submit helpful/not-helpful feedback and confirm it appears in admin/quality surfaces.
8. Delete the beta account and confirm saved articles, annotations, learning data, alerts, and auth cookies are removed.
9. Confirm Sentry receives a test non-PHI error and LogRocket contains no typed text or prompt payloads.
10. Restore a staging backup into a disposable database and run `/health`.
```

## Deferrals Allowed For Beta

- SOC 2, HITRUST, SAML, public paid billing, formal HIPAA-hosted service claims, external pentest, and full offline mode.
- Do not defer privacy copy, no-PHI warnings, staging backups, restore drill, or live health monitoring.

## Paid billing

Deferred for the beta cohort. `PAYWALL_ENABLED` stays off, and these five values stay unset: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_RESEARCHER_PRICE_ID`, `STRIPE_PRO_PRICE_ID`, `STRIPE_TEAM_PRICE_ID`. Checkout reports that Stripe is not configured. `beta:safety` does not fail the cohort for their absence. Set `PAYWALL_ENABLED=true` only when all five are real; the production check then requires them.
