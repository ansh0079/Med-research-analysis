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

- Learning Event Inspector (decision → shown → interaction → reward → policy)
- Delayed reward backfill at **1 / 3 / 7 days** (saves, quiz, synopsis, repeat topic)
- Nightly offline eval → **promote / hold / regress**
- Idempotent reward application (no double Beta pulls)
- Propensity logging on synopsis / teaching / case policies

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

- Live Stripe checkout → webhook → subscription row → paywall gates Pro surfaces
- Hit commercial search gates: Precision@10 ≥ 0.75, off-topic ≤ 0.10 (graded set, not only known-item gold)
- External alerts on `/metrics` + cron heartbeats
- PHI retention policy + encryption posture review
- 10 flagship topics polished; wedge = resident/learner Pro

---

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
| `cursor/commercial-phase1-af23` | Phase 1 implementation (this work) |
| `cursor/rl-quality-pack-af23` (#39) | Upstream source for 1A / Phase 2 pieces |
| `cursor/claim-bridge-case-bandit-af23` (#37) | Upstream source for 1B bandit |

Prefer landing Phase 1 as one reviewable PR; close or supersede overlapping PRs after merge.
