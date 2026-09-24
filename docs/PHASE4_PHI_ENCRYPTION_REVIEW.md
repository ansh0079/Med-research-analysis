# Phase 4 — PHI retention & encryption posture review

Last updated: 2026-09-21  
Status: **review notes for commercial launch** (not a full HIPAA/BAA certification)

## Product posture

Signal MD is an evidence + learning product. It is **not** an EHR and must not be treated as a clinical system of record.

- Terms / privacy already prohibit submitting PHI and using outputs for clinical decision-making (`docs/BETA_PHASE2_SAFETY.md`).
- Learning profiles, quiz answers, and case choices are **educational signals**, not patient charts.
- Free-text fields (search queries, notes, case free-text) can accidentally contain PHI — treat them as sensitive.

## Retention (recommended launch policy)

| Data class | Retention | Notes |
| --- | --- | --- |
| Auth / billing | Active account + 7 years invoices (finance) | Stripe is system of record for payments |
| Search / learning events (RL) | 18 months rolling | Enough for delayed rewards + offline eval |
| Teaching objects / claims | Indefinite (product corpus) | Not user PHI |
| Audit / billing_audit_log | 24 months | Paywall denials + webhook linkage |
| Support exports | 90 days after ticket close | Manual purge |

**Implemented 2026-09-21** (`server/services/ops/dataRetention.js`, scheduled as `data-retention`).
The table above is now enforced in code rather than described: search events and article interactions
are deleted after 18 months, audit and billing audit rows after 24 months, in bounded batches, with
per-class environment overrides that can tighten a window but not silently loosen one. Teaching
objects, claims, evidence snapshots and source versions are deliberately untouched - they are the
product corpus and the provenance chain, and deleting them would break replay of attempts that still
reference them. Evidence snapshot query text was already redacted after its own window
(`evidence-snapshot-retention`).

Erasure on request is a separate, existing path (`database/mixins/m19-account-privacy.js`), which
deletes a named user's rows across these same tables. Retention is time-based and applies to
everyone; erasure is identity-based and applies on demand. Both are needed; neither substitutes for
the other.

Still best-effort until a purge run has been observed on production.

## Encryption posture

| Layer | Current | Launch requirement |
| --- | --- | --- |
| TLS in transit | Required in production | Keep; HSTS on edge |
| DB at rest | Host-volume encryption (Hetzner/cloud disk) | Confirm provider default encryption ON |
| Application-level field encryption | Not implemented | Optional until BAA / institution tier |
| Secrets | Env / secret manager | No keys in repo; rotate Stripe + JWT |
| Backups | Ops-owned | Encrypted backups + restore drill (`LAUNCH_PROOF_RUNBOOK`) |

`docs/SECURITY_SUMMARY.md` still lists application DB encryption as open medium priority — acceptable for learner Pro wedge **if** disk encryption + TLS + no intentional PHI collection are true and documented.

## Commercial gate checklist

- [ ] Confirm production volume encryption with hoster
- [x] Stripe webhook signing verified in code (`server/routes/billing.js`): production rejects all events when `STRIPE_WEBHOOK_SECRET` is unset, and signature verification is skipped only in development. `billing_audit_log` has a writer (`database/mixins/m08b-audit-billing.js`)
- [ ] Confirm privacy copy: no PHI, educational use only
- [x] `/metrics` is gated (`server/routes/health.js`): `METRICS_SCRAPE_TOKEN` compared in constant time via `X-Metrics-Token` or bearer, otherwise admin JWT. Never public
- [ ] Institution / BAA customers: do not sell until DPA + encryption review signed

## Out of scope for Phase 4 code

- Full HIPAA security rule program
- Customer-managed keys / field-level encryption
- Formal DPA templates (legal)
