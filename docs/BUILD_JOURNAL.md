# Medical Research Intelligence Platform — Build Journal

> Last updated: 2026-05-20

---

## What the app does

A medical research intelligence platform that lets clinicians search PubMed, synthesise evidence across papers, read guideline-anchored topic synopses, and practice with adaptive MCQs. The system gets smarter as more users interact with it.

---

## Phase-by-phase build log

### Phase 1 — Topic retry pipeline (`--retry`)
Re-ran failed topic seeds from the initial cold-start. Retried topics that had no evidence or failed synthesis.

### Phase 2 — Teaching objects (`--teaching`)
Built consensus teaching objects and claim anchors for every seeded topic. These are the structured knowledge blobs the app serves when a user opens a topic page.

### Phase 3 — Synopsis quality scoring (`--quality`)
Every synopsis was AI quality-scored. Weak ones were flagged for regeneration.

### Phase 4 — Prerequisite graph (`--prerequisites`)
Generated a topic prerequisite graph — links between topics that should be studied before others (e.g. "Basic arrhythmias" before "Atrial fibrillation ablation").

### Phase 5 — Cold-start MCQs (`--mcqs`)
Pre-seeded 5 MCQs per topic across all 267 topics using Gemini. Stored as `cold_start_mcq` teaching objects. Fixed a prompt/JSON parsing bug (Gemini was wrapping arrays in backticks). 212/267 topics succeeded.

### Phase 6 — MCQ verification + guideline MCQs (`--verify`)
Claude (Haiku) reviewed each topic's MCQs for accuracy, distractor quality, and guideline alignment. Flagged issues stored in `payload.reviewFlags`. Also generated 5 new guideline-anchored MCQs per topic stored as `guideline_mcq` teaching objects.

### Phase 6b — Flagged MCQ rewrite (`--fix-flags`)
Claude rewrites each flagged MCQ using the flag type, detail, and suggested fix. Clears `reviewFlags` after successful rewrite. Started with 528 flags across 245 topics — now down to 79 flags across 38 topics.

### Phase 7 — Guideline-enriched synopsis (`--synopsis`)
Refreshed `mentorMessage` for every topic to incorporate 2–3 top guidelines (scored by strength, certainty, recency, and source-body diversity). Gemini-generated synopses were based on PubMed papers only; this phase adds guideline context.

### Phase 8 — Collective topic memory (`--aggregate`)
Aggregated quiz attempt data per topic across all users. Computes:
- Interaction count and unique-user count → cold/warm/hot path selection
- High-discrimination MCQs (40–75% correct rate)
- Too-easy (>90%) and too-hard (<20%) MCQ hashes
- Shared misconception fingerprints (wrong answers chosen ≥25% of the time)

Cold topics (<15 unique users) → LLM generates quiz fresh.
Warm (15–49) → LLM gets misconception hints injected into prompt.
Hot (50+) → LLM served pre-built high-discrimination MCQs directly.

Also available as a one-click button in the Admin Observability page.

### Phase 9 — Cross-topic evidence cross-links (`--crosslink`)
**Step A (free):** Shared PubMed paper links — if two topics cite the same PMID, they get a `shared_paper` cross-link. Strength scales with how many topics share the paper.

**Step B (AI):** One Claude call per topic infers related topics and produces a rationale. Stored as `ai_inferred` cross-links.

Cross-links appear as clickable chips on topic pages, navigating to the linked topic.

---

## Key features built

### User-facing

| Feature | Route | Notes |
|---|---|---|
| Topic page with synopsis | `/topic/:topic` | Mentor message, teaching points, teaching objects |
| Guideline browser | `/guideline-library` | Browse all 267 topics' guidelines |
| Quiz mode | `/quiz` | Topic-specific adaptive MCQs |
| Practice Pool | `/practice` | Cross-topic random MCQ bank, not topic-segregated |
| Case mode | `/case` | Clinical case scenarios |
| Study paths | `/study-paths` | Prerequisite-ordered topic sequences |
| Learning dashboard | `/learning` | Spaced-repetition due review tracker |
| Topic crosslinks | Topic page chips | Navigate to related topics |
| Staleness alerts | Topic page | Warning if knowledge >90 days old |
| Verification badges | Throughout | Trust status on every teaching claim |
| Full-text synopsis | Topic page | Expanded guideline-anchored mentor message |

### Admin-facing

| Feature | Route / Script | Notes |
|---|---|---|
| Admin observability | `/admin/observability` | LLM costs, claim trust pipeline, curriculum seeding, collective memory aggregate button |
| Clinical quality queue | `/admin/quality` | Review and approve teaching claims |
| Guideline review | `/guideline-library` | Review/approve individual guidelines |

### Backend services

| Service | Purpose |
|---|---|
| Auto-seeding | Any search with ≥2 papers → background Gemini call → new topic stored automatically |
| Tier gating | free=3 MCQs, standard=10, premium=20 per quiz session |
| Collective memory aggregation | SQL aggregation of quiz_attempts → collective_memory blob on topic_knowledge |
| Cross-link pipeline | Shared PMID + AI-inferred topic links |
| Guideline watchtower | Scans for guideline conflicts on teaching claims |
| Background automation | Pausable scheduler for curriculum seeding and refresh |

---

## Database schema additions

| Table / Column | Purpose |
|---|---|
| `teaching_objects.object_type = 'cold_start_mcq'` | 5 pre-built MCQs per topic (Gemini) |
| `teaching_objects.object_type = 'guideline_mcq'` | 5 guideline-anchored MCQs per topic (Claude) |
| `topic_crosslinks` | Cross-topic links (shared_paper + ai_inferred) |
| `topic_knowledge.knowledge → collective_memory` | Aggregated quiz stats blob |
| `users.subscription_plan` | free / standard / premium for MCQ gating |
| `quiz_attempts` | Per-attempt record with concept_hash, is_correct, user_answer |

---

## AI providers used

| Provider | Model | Used for |
|---|---|---|
| Google Gemini | gemini-2.0-flash | Topic synthesis, synopsis, cold-start MCQs, auto-seeding |
| Anthropic Claude | claude-haiku-4-5-20251001 | MCQ verification, guideline MCQs, flagged MCQ rewrite, cross-link inference |
| Mistral | mistral-small | Fallback for some synthesis operations |

---

## Scripts

All enhancement scripts live in `server/scripts/seedEnhancements.js`:

```bash
# Run a specific phase
node server/scripts/seedEnhancements.js --mcqs
node server/scripts/seedEnhancements.js --verify
node server/scripts/seedEnhancements.js --fix-flags
node server/scripts/seedEnhancements.js --synopsis
node server/scripts/seedEnhancements.js --aggregate
node server/scripts/seedEnhancements.js --crosslink

# Dry run any phase
node server/scripts/seedEnhancements.js --fix-flags --dry-run

# Run all standard phases
node server/scripts/seedEnhancements.js --all
```

`--fix-flags` is intentionally excluded from `--all` — it's a one-time correction pass.

---

## Current status

| Task | Status |
|---|---|
| 267 topics seeded | ✅ Done |
| Teaching objects built | ✅ Done |
| Cold-start MCQs (5/topic) | ✅ Done |
| Guideline MCQs (5/topic) | ✅ Done |
| Synopsis guideline enrichment | ✅ Done |
| MCQ flag rewrite | 🟡 79 flags remaining across 38 topics — re-run `--fix-flags` |
| Cross-link pipeline | ⏳ Built, not yet executed — run `--crosslink` |
| Collective memory | ⏳ Ready — no quiz data yet (needs beta users) |
| Beta test (20 users) | ⏳ Pending |

---

## Architecture notes

- **Database:** SQLite with WAL mode, `better-sqlite3` driver, path `./database/app.db`
- **Backend:** Express + Node 22, `server/app.js` (middleware) + `server/server.js` (listen)
- **Frontend:** React + Vite + TypeScript, React Router v6, Tailwind CSS
- **Auth:** JWT via `requireAuthJwt`, role-based via `requireRole('admin', 'curator')`
- **API keys:** Stored in `.env` at project root, backed up at `C:\Users\ansh0\.medresearch-keys.env`
