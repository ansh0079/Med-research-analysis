# Commercial Phase Plan

Last updated: 2026-08-21  
Owner: product + engineering  
Canonical launch gates: `COMMERCIAL_READINESS.md`

## North star

Ship a **buyable** clinical evidence + adaptive learning product: trustworthy search, grounded quizzes/cases, and an RL loop that improves preference without burying evidence hierarchy.

Status today: **beta-ready, not commercial-launch-ready.**

---

## Phase map

| Phase | Name | Outcome | Depends on |
| --- | --- | --- | --- |
| **1** | Trust & closed loops | First search/case/quiz cannot ship ungrounded or bury guidelines; low-recall and case difficulty learn in-product | — |
| **2** | RL control plane | Inspect decisions, backfill delayed rewards, nightly promote/hold/regress | Phase 1 signals |
| **3** | Learning output quality | Fail-closed MCQs, claim-tier by stakes, synopsis grounding banners | Phase 1 trust |
| **4** | Commercial launch | Paywall E2E, Precision@10 commercial target, alerts, PHI posture | Phases 1–3 |
| **5** | Scale & operational readiness | Shared bandit store, A/B holdout, structured source logs, search latency budget | Phase 4 |

---

## Phase 1 — Trust & closed loops (complete on branch)

**Goal:** Conversion-critical trust. Users never see invented case keys, buried guidelines, or a dead-end empty search without an automatic repair attempt.

### 1A — Search trust
- [x] In-request **query failure auto-repair** (MeSH / trial / guideline / recent-review / PICO) + cache winner
- [x] Wire sparse/low-recall repair into `unifiedSearch` (PubMed count + same-request re-rank when winner improves recall)
- [x] **Personalization guardrails** — reorder within safe bands; never bury guidelines, landmark RCTs, SRs/MAs, retractions, recent safety
- [x] **Topic evidence memory** blend into live search (durable best-evidence set)

### 1B — Case trust
- [x] **Adaptive case difficulty bandit** on `/api/cases/adaptive-vignette` when difficulty is `auto` (FE default)
- [x] Reward bandit from completed adaptive session score
- [x] **No ungrounded fallback steps** — retry once, then return recoverable error (never invent keyed answers)
- [x] Hard block when `evidenceDensity === 0` (`EVIDENCE_TOO_THIN`)

### 1C — Acceptance
- [x] Unit tests for guardrails, auto-repair strategies, case step validation
- [ ] Manual: sparse query returns `queryAutoRepair` / suggested reformulation
- [ ] Manual: `/cases` with difficulty Adaptive selects bandit arm; LLM failure does not invent options

**Related open work folded into this branch:** PR #37 (case bandit), PR #39 (RL quality pack).

---

## Phase 2 — RL control plane

**Goal:** See whether personalization learns preference or noise; close delayed medical workflows.

- [x] Learning Event Inspector (decision → shown → interaction → reward → policy)
- [x] Delayed reward backfill at **1 / 3 / 7 days** (saves, quiz, synopsis, repeat topic) — incremental per horizon
- [x] Nightly offline eval → **promote / hold / regress** (persists + actuates `policy_serving_state`)
- [x] Idempotent reward application (no double Beta pulls) via `bandit_reward_applications`
- [x] Propensity logging on synopsis / teaching / case policies (softmax over Thompson samples)

---

## Phase 3 — Learning output quality

**Goal:** Marketable claim-anchored questions and cases.

- [x] Fail closed when MCQ validation skips / reviewer fails (`MCQ_VALIDATION_FAILED`)
- [x] High-stakes question types only from verified / guideline-supported claims
- [x] Psychometrics → live difficulty (BKT / ability → `effectiveDifficulty` + item psychometrics in prompt)
- [x] Synopsis / clinical answer hard-banner when abstract-only and no guideline support
- [x] Conflict matrix (structured guideline conflicts) on claim provenance (alongside lexical search)

---

## Phase 4 — Commercial launch

**Goal:** Charge money safely.

- [x] Paywall keys aligned (`caseMode`, `quizMode`) + Stripe webhook → `billing_audit_log`
- [ ] Live Stripe checkout → webhook → subscription row → paywall gates Pro surfaces (ops: `docs/LAUNCH_PROOF_RUNBOOK.md`)
- [x] Commercial search gate shape: Precision@10 ≥ 0.75, off-topic ≤ 0.10 on **graded NL clinical** subset (`commercialGates`; known-item landmark gold stays separate)
- [ ] Live graded-NL eval pass with `--require-commercial` against staging/prod
- [x] External scrape auth on `/metrics` (`METRICS_SCRAPE_TOKEN`) + cron heartbeat Prometheus gauges
- [x] Alert rules wired for commercial P@10 + cron stale (`monitoring/alerts-config.json`)
- [x] PHI retention + encryption posture review notes (`docs/PHASE4_PHI_ENCRYPTION_REVIEW.md`)
- [x] 10 flagship launch cohort + audit gate (`server/config/flagshipLaunchCohort.json`, `npm run audit:flagship-topics:launch`)
- [ ] Wedge packaging: resident/learner Pro (pricing copy / marketing)

**Branch:** `cursor/commercial-phase4-af23` (depends on Phase 1+3 #40 and Phase 2 #41)

## Success metrics

| Area | Metric | Commercial target |
| --- | --- | ---: |
| Search | Precision@10 (graded) | ≥ 0.75 |
| Search | Off-topic@10 | ≤ 0.10 |
| Search | Landmark / guideline hit (known-item) | ≥ 0.95 |
| RL | Propensity coverage on labelled decisions | ≥ 50% |
| RL | Offline eval gate | promote only when density + lift pass |
| Cases | Ungrounded fallback rate | **0** |
| Quiz | Validation-skip serve rate | **0** for high-stakes |
| Biz | Checkout → active subscription | E2E proven |

---

## Branching

| Branch | Scope |
| --- | --- |
| `cursor/commercial-phase1-af23` | Phase 1 + Phase 3 (trust, closed loops, learning quality) |
| `cursor/commercial-phase2-af23` | Phase 2 RL control plane (idempotent rewards, propensity, promote/hold/regress) |
| `cursor/commercial-phase4-af23` | Phase 4 commercial launch (paywall, search gates, metrics, launch-10) |
| `cursor/rl-quality-pack-af23` (#39) | Upstream source for 1A / Phase 2 scaffolding |
| `cursor/claim-bridge-case-bandit-af23` (#37) | Upstream source for 1B bandit |

Prefer merge order: Phase 1+3 (#40) → Phase 2 (#41) → Phase 4 → Phase 5.

---

## Phase 5 — Scale & operational readiness

**Goal:** Safe to run in production at multiple instances.

- [x] Shared linear-value model cache (Redis / DB / memory) with deterministic per-hour keys
- [x] A/B holdout assignment + nightly holdout lift in offline eval
- [x] Recommendation strategy arms (explore-by-gap / explore-by-strength) + due-review floor at slot 3
- [x] Replay evaluator uses model-based counterfactual (boost-scale lift removed from promotion)
- [x] Ridge solver via Cholesky with regularization floor
- [x] Centralized `buildFullTextExcerptsBlock` for synopsis/synthesis
- [x] Structured source-failure logs (injected logger, not `console.warn`)
- [x] Request-level search latency budget (skip vector / PICO when exceeded)
- [x] Curated PubMed synthesis-trust integration corpus

**Branch:** `cursor/scale-ops-readiness-af23`
