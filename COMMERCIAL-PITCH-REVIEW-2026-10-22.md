# Commercial pitch review, 2026-10-22

Question: if we pitched Signal MD as a commercial app today, what is done, pending, lacking, and what must happen.

## Verified state (measured today)

| Check | Result |
| --- | --- |
| Unit/integration suite | 3,423 passed, 2 failed, 11 skipped (392 of 395 suites). Both failures are in uncommitted curated-MCQ import work (`curatedMcqImportDir.test.js` expects 8 batches, finds 10). |
| `tsc --noEmit` | clean |
| `npm audit --omit=dev` | 0 vulnerabilities |
| Prod health | `https://signalmd.co/health` ok, sha `9084d40` (current) |
| Search gold eval (2026-07-22, last recorded) | PASS: MRR 0.850, nDCG@10 0.879, Recall@10 0.987, off-topic@10 0.002 |
| CI | 25 workflows incl. CI-gated deploy, PG migrations, backups, prod ops reports |
| Restore drill | passed 2026-07-06 (107 tables, 87 migrations); off-site daily pull running |

Prod usage (the sobering part):

| Metric | Value |
| --- | --- |
| Registered users | 1 |
| New users, last 7 days | 0 |
| Searches, last 30 days | 71 |
| Quiz attempts, all time | 11 |
| Topic knowledge pages | 1,845 |
| Mentor drafts awaiting clinician review | 1,252 (0 reviewed or published) |
| Failed AI jobs, 7 days | 32 of 78, all `pdf_index:no_open_access_pdf` (expected outcome, mislabelled as failure) |

## What is strong (sellable today)

1. Search: labelled gold set, landmark hit rate 1.0, measured gates, lane ranking, reranker, provenance enforcement.
2. Evidence grounding: citation checks, guideline-first MCQs/cases, claim lifecycle, evidence-support audit, hand-verified mentor drafts (3,549 citations in the 1-500 set, 0 bad).
3. Learning engine: FSRS, BKT, item psychometrics, adaptive selection, calibration.
4. Operations: Postgres + Redis + BullMQ workers, Sentry, UptimeRobot, cron heartbeats, CI-gated deploy with rollback, SQL dialect gate, nightly + off-site backups.
5. Product surface: auth, beta invite gate, billing page, legal terms/privacy/compliance pages, admin review tooling.

## Blockers for a paid/commercial pitch (must fix)

1. **No proof of user value.** One user, 11 quiz attempts. The strict agent-efficacy and offline-policy gates fail on density (n=0). Every claim of "learns from each interaction" is unproven. A pitch needs a pilot with real cohorts (see `docs/PILOT-PLAYBOOK-2026-10-16.md`) and a before/after learning measure.
2. **Clinician review has not started.** 1,252 mentor drafts, thousands of MCQs, and 1,610 guideline MCQs exist, none human-approved. A medical product cannot claim clinical accuracy without named reviewers, a sign-off record, and a visible "reviewed by / date" on pages. This is the single largest gap and is a people problem, not a code problem.
3. **Stripe live path untested end to end.** Keys and prices are configured, but a real checkout to webhook to subscription row has never been observed. Run it once before taking money.
4. **Compliance pending.** PHI handling review, DB encryption posture, CSRF verification are listed open in `COMMERCIAL_READINESS.md`. Needs a written data-processing position (no patient data accepted, or HIPAA/GDPR controls), a DPA template, and a medical disclaimer reviewed by counsel. Regulatory position (decision support vs reference tool) should be stated explicitly: the project already concluded "reference tool".
5. **Content coverage holes.** 37% of flagship topics had no guideline (fixes applied, enrichment runs pending); KDIGO AKI-type gaps; 2 topics with no draft; many drafts carry "gaps" notes (doses, thresholds, criteria) that reviewers must complete.
6. **Alerting is specified but not wired.** `monitoring/alerts-config.json` is not auto-applied; Sentry metric alerts and release-health (sourcemap 403, token scope) still manual.

## Important but not blocking

- Test debt: 2 red tests and the uncommitted working tree (many modified files, ~dozens of untracked review artefacts in repo root). Clean the tree before any investor/customer code review.
- Repo hygiene: root contains .docx/.csv/.xlsx working files, `.docx-render/`, and worktree folders with permission errors on git gc. Move to a data directory or ignore.
- Branch state: work sits on `feat/mcq-stem-quality-filter`; main is behind. Merge or rebase before pitching "what is live".
- AI job accounting: `no_open_access_pdf` counted as failed inflates failure metrics; mark as `skipped`.
- Question bank quality: earlier audit found 54% of MCQs answerable from option length; classification/repair bundles built, only partly applied (GOOD/REPAIR/RETIRE census, 2,820 hand-read applied).
- Search release gates drift: gold eval last recorded 2026-07-22; rerun after the many search changes since (and not back-to-back; throttling distorts scores).
- Latency: rerank was 8.8s then 3s; confirm p95 on live traffic.
- Single VPS: one Hetzner box runs web, worker, PG, Redis. Fine for beta; for a commercial SLA need a documented failover story and tested restore time.
- Docs: stale launch docs should link to `COMMERCIAL_READINESS.md` (last updated 2026-07-17, now out of date).

## Lacking for a credible commercial story

- Acquisition and activation: no organic users; no onboarding funnel metrics, no landing-to-signup conversion data, no retention cohort.
- Pricing evidence: price IDs exist, no willingness-to-pay test.
- Institutional features: SSO, team admin, usage reporting, CPD/CME accreditation claims (CPD tab exists; no accreditation).
- Mobile/offline for study use.
- Named clinical advisory board and published editorial policy (sources, update cadence, correction process).
- Security attestation: no pen test, no SOC 2 / ISO path, no vulnerability disclosure policy.

## Recommended order of work

1. **Week 1 (engineering, small):** fix/commit the 2 red tests; clean repo root; merge branch; wire Sentry/Uptime alerts; run live Stripe checkout test; relabel `no_open_access_pdf` as skipped; rerun search gold eval once, alone.
2. **Weeks 1-4 (people):** recruit 3-5 clinician reviewers; review the top 200 topics (mentor drafts + MCQ GOOD set) using the in-app Drafts tab; publish "reviewed by" metadata. Target: one specialty fully reviewed as the pitch demo.
3. **Weeks 2-6 (pilot):** onboard 20-50 learners in one programme via invites; instrument activation, weekly retention, quiz score change, search click-through; re-run the strict agent and offline-policy gates once data exists.
4. **Weeks 3-6 (compliance):** privacy/DPA, medical disclaimer review, PHI decision, security policy, dependency/pen-test quote.
5. **After pilot data:** pricing test, institutional pack (team admin, usage reports), then external pitch deck with real numbers.

## Bottom line

Engineering is well ahead of the business proof. Technical risk is moderate (clean types, no known vulnerabilities, strong ops). The risks that would sink a pitch are: zero usage evidence, zero clinician sign-off, untested billing, and unresolved compliance position. Fix those in that order of importance: clinician review and pilot data first.
