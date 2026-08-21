# Phase 4 — PHI retention & encryption posture review

Last updated: 2026-08-21  
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

Implement via scheduled purge jobs before claiming HIPAA readiness; until then document “best-effort beta retention.”

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
- [ ] Confirm Stripe webhook signing + `billing_audit_log` on activate/cancel
- [ ] Confirm privacy copy: no PHI, educational use only
- [ ] Confirm `/metrics` scrape uses `METRICS_SCRAPE_TOKEN` (not public)
- [ ] Institution / BAA customers: do not sell until DPA + encryption review signed

## Out of scope for Phase 4 code

- Full HIPAA security rule program
- Customer-managed keys / field-level encryption
- Formal DPA templates (legal)
