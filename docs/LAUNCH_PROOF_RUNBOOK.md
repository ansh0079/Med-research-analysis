# Launch Proof Runbook

Last updated: 2026-07-02

Four things stand between "beta-ready" and "defensibly launch-ready." None of them is more code — each converts a belief into a measured fact. Do them in this order; each is self-contained and turnkey once the prerequisite environment is in front of you.

Ownership note: 1–3 are one-time gates you run yourself. 4 is a standing process for the beta window.

---

## 1. Search-quality eval — get the first real number

**Goal:** prove the search surfaces landmark papers, or find exactly where it doesn't.

**Prerequisite:** a running server (staging or local prod-mode) whose database has the gold-set papers reachable via `/api/search`. The 42 relevant PMIDs live in [tests/fixtures/search-quality-gold.json](../tests/fixtures/search-quality-gold.json).

**Steps:**

1. Start the server against the DB you want to measure (staging is ideal; local prod-mode works if it can reach PubMed/OpenAlex):
   ```bash
   NODE_ENV=production node server.js    # or your staging deploy
   ```
2. Run the gold eval, pointing `--base` at that server:
   ```bash
   # local default is :3002
   npm run eval:search-quality:gold
   # staging
   node scripts/eval-search-quality.js --base https://staging.signalmd.co --gold tests/fixtures/search-quality-gold.json
   ```
3. Read the SUMMARY block. The gate (known-item benchmark) is:

   | Metric | Gate | Meaning |
   | --- | --- | --- |
   | Recall@10 | ≥ 0.70 | landmark paper appeared in the top 10 |
   | MRR | ≥ 0.50 | and appeared high up |
   | Off-topic@10 | ≤ 0.20 | little irrelevant noise |
   | Required-type coverage | ≥ 0.80 | right study types surfaced |

   Precision@10 is printed but **not** gated — with one correct paper per query it is capped at ~0.10.

4. Full per-query output is written to `eval-results/search-quality-gold-<timestamp>.json`. For any query below gate, inspect `missingRelevantUids` and `hitUids` to see whether the landmark paper was absent, buried, or mis-ranked.

**Pass:** exit code 0 and the gate line prints `PASS`.

**If it fails:** the per-query JSON tells you if the problem is retrieval (paper not in the DB / not returned) vs. ranking (returned but below rank 10). Retrieval misses point at ingestion/source coverage; ranking misses point at the RRF/reranker. Fix, re-run, record the before/after numbers.

**Record:** commit the summary numbers (not the raw dump) into the readiness tracker so there is a dated baseline.

**Current measured baseline (2026-07-02, live `/api/search`):**

| Metric | Before citation-cascade fix | After citation-cascade fix |
| --- | ---: | ---: |
| Recall@10 | 0.22 | 0.59 |
| MRR | 0.15 | 0.37 |
| nDCG@10 | 0.17 | 0.42 |
| Required-type coverage | 0.80 | 0.95 |
| Landmark hits | 9/41 | 24/41 |

Root cause: citation-less PubMed articles were being sanitized with derived
`_impact.citations = 0`, then later treated as if a real source had reported
zero citations. The bouquet age+citation filter therefore deleted old landmark
trials after relevance filtering. Keep this invariant intact: only raw source
fields such as `citationCount` and `pmcrefcount` prove that citation data is
known; derived `_impact.citations` must not be used by citation-data guards.

For live-stage debugging, set `SEARCH_TRACE` to a PMID or UID fragment and run
the query through `/api/search`. The trace prints stage counts from raw fetch
through bouquet/rerank/collapse, which distinguishes hard drops from ranking
misses.

---

## 2. Stripe payment — move one real (test-mode) dollar

**Goal:** confirm a checkout end-to-end actually upgrades a user, since the webhook bug that shipped existed precisely because this path was never exercised.

**Prerequisite:** Stripe **test-mode** keys and the Stripe CLI (`stripe login`).

**Steps:**

1. Configure test-mode env on the server you'll test:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PRO_PRICE_ID=price_...        # test-mode price
   PAYWALL_ENABLED=true
   ```
   Leave `STRIPE_WEBHOOK_SECRET` unset for now — the CLI prints it in the next step.
2. Forward webhooks to the local server and copy the signing secret it prints into `STRIPE_WEBHOOK_SECRET`, then restart the server:
   ```bash
   stripe listen --forward-to localhost:3002/api/billing/webhook
   # -> "Ready! Your webhook signing secret is whsec_..."
   ```
3. Sign in as a test user, hit **Upgrade** (or `POST /api/billing/create-checkout`), and complete checkout with card `4242 4242 4242 4242`, any future expiry, any CVC.
4. Verify the upgrade actually landed — all three must be true:
   - `stripe listen` shows `checkout.session.completed` and `customer.subscription.created` returning **200**.
   - The user row updated:
     ```sql
     SELECT email, subscription_status, subscription_plan, role, stripe_subscription_id
     FROM users WHERE email = '<test user>';
     -- expect: active / pro / pro / non-null subscription id
     ```
   - `GET /api/billing/status` returns `status: "active"`, `plan: "pro"`.
5. Exercise the lifecycle so downgrade works too:
   ```bash
   stripe trigger customer.subscription.deleted
   # confirm the user drops back to free/user
   ```

**Pass:** a fresh checkout flips the user to active/pro with a stored subscription id, and cancellation flips them back.

**Only after this passes** set real (live-mode) keys and `PAYWALL_ENABLED=true` in production.

---

## 3. Restore drill — prove the backup is real

**Goal:** confirm the nightly `pg_dump` can actually be restored. A backup you have never restored is a hope, not a backup.

**Prerequisite:** SSH to the Hetzner host; at least one dump present in `/var/backups/medsearch` (produced by [deploy/hetzner/backup-postgres.sh](../deploy/hetzner/backup-postgres.sh), crontab in [docs/HETZNER_DEPLOY.md](HETZNER_DEPLOY.md) §7).

**Do NOT restore over the production database.** Restore into a throwaway scratch DB and verify integrity there.

**Steps:**

1. Pick the most recent dump:
   ```bash
   ls -t /var/backups/medsearch/medsearch-*.dump | head -1
   ```
2. Create a scratch database inside the running Postgres container and restore into it:
   ```bash
   DUMP=$(ls -t /var/backups/medsearch/medsearch-*.dump | head -1)
   docker compose -f docker-compose.hetzner.yml exec -T postgres \
     psql -U medsearch -d postgres -c "DROP DATABASE IF EXISTS restore_test; CREATE DATABASE restore_test;"
   docker compose -f docker-compose.hetzner.yml exec -T postgres \
     pg_restore -U medsearch -d restore_test --no-owner < "$DUMP"
   ```
3. Verify the restore is complete and coherent (row counts should track production):
   ```bash
   docker compose -f docker-compose.hetzner.yml exec -T postgres \
     psql -U medsearch -d restore_test -c \
     "SELECT (SELECT count(*) FROM users) AS users,
             (SELECT count(*) FROM topics) AS topics,
             (SELECT max(name) FROM _migrations) AS last_migration;"
   ```
   Sanity-check `users` and `topics` against production, and confirm `last_migration` matches the deployed schema.
4. Tear down the scratch DB:
   ```bash
   docker compose -f docker-compose.hetzner.yml exec -T postgres \
     psql -U medsearch -d postgres -c "DROP DATABASE restore_test;"
   ```
5. Confirm dumps are copied **off-server** (Hetzner Storage Box / S3). An on-box-only backup does not survive losing the box.

**Pass:** the scratch DB restores without error and row counts + last migration match production.

**Record:** note the date, dump timestamp, and verified row counts. Re-run quarterly and after any schema change to `_migrations`.

---

## 4. Beta feedback — the signal only users can give

**Goal:** answer the questions the repo cannot — is the synthesis trustworthy to a clinician, is the quiz pedagogy sound, does search return what a *doctor* considers right (not just landmark trials).

**What's already wired** (no build needed — start collecting):
- `POST /api/search/feedback` — helpful / not-helpful per result set ([server/routes/search.js:1429](../server/routes/search.js#L1429))
- `POST /api/search/impressions` — clicked / saved / dwell / skipped ([server/routes/search.js:1318](../server/routes/search.js#L1318))
- `POST /api/agent/feedback` — helpful / too basic / too complex / missed-question ([server/routes/agent.js:457](../server/routes/agent.js#L457))
- Quiz outcomes and product-quality feedback tables (migrations `069_product_quality_feedback`, `072b_synopsis_feedback`)

**Steps for the beta window (20 invited physicians — see beta_invites):**

1. **Weekly monitoring.** As an admin, review:
   - `GET /api/admin/learning-health` — are feedback/impression/quiz signals actually being written per user?
   - `GET /api/admin/llm-cost-dashboard` — cost per active user (unit economics before pricing is final).
   - `GET /api/admin/readiness` — standing config/health check.
2. **Structured qualitative pass.** For 5–10 real searches per physician, capture in a shared doc:
   - Did the top-5 include the paper *they* would have cited? (This is the human complement to the gold set, which only knows landmark trials.)
   - Was the synthesis faithful to the sources, with no overstated or unsupported claims?
   - Were quiz questions clinically correct and pitched at the right level?
3. **Define the go/no-go bar before you look at results**, e.g.: ≥ 70% of searches rated helpful, zero synthesis claims flagged as unsupported/dangerous, ≥ 80% of quiz items rated clinically correct.
4. **Close the loop.** Feed recurring complaints back as ranked issues; the learning signals in step 1 should show measurable movement (e.g., improved quiz performance after agent use) — that is the commercial-target proof in COMMERCIAL_READINESS.md.

**Pass:** the pre-defined go/no-go bar is met across the beta cohort, and learning signals demonstrably update from interactions.

---

## Summary gate

Launch-ready when: (1) gold eval prints PASS with recorded numbers, (2) a test-mode checkout upgrades and cancellation downgrades a user, (3) a backup restores into a scratch DB with matching row counts, and (4) the beta cohort meets the pre-defined helpfulness/safety bar. Only then flip live Stripe keys and `PAYWALL_ENABLED=true` in production.
