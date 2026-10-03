# Signal MD — Pre-Beta Architecture Review, Gap Analysis & Launch Action Plan

**Document Version:** 1.0.0  
**Date:** September 8, 2026  
**Audience:** Engineering Leadership, Product Management, and Clinical Advisory  
**Status:** Official Pre-Beta Technical Review  

---

## Executive Summary

This comprehensive audit evaluates **Signal MD** (`signal-md@2.0.0`) ahead of its planned public beta release. The codebase was rigorously inspected across static type validation, linter conformity, test suite execution, database schema contracts, clinical benchmarks, and safety evaluation scripts.

Signal MD possesses a sophisticated and clinically rigorous architecture: hybrid evidence retrieval, PICO abstract reranking, structured trial–guideline conflict detection, two-tier durable synopsis caching, multi-armed bandit personalization, Bayesian Knowledge Tracing (BKT), and Free Spaced Repetition (FSRS).

However, **the platform is not yet fully beta-ready** due to several specific, high-priority issues:
1. An engine mismatch in migration `092_quiz_attempts_anonymous.sql` breaks local SQLite environments, blocking 9 test suites (65 tests), schema verification, and database-connected quality scripts.
2. Search PICO reranking is not yet fully unified across natural language search and case analysis workflows.
3. Automated trial–guideline conflict detection relies on guidelines currently sparse in the database.
4. Reinforcement Learning (RL) cold-start and adaptation observability are largely invisible to users.
5. Migration rollbacks and staging webhook integrations are missing.

This document compiles the exhaustive technical findings across all 5 key review dimensions, detailing **What Is Working**, **What Is Pending**, and **Actionable Recommendations** for the upcoming beta release.

---

## Section 1: Core Search Pipeline & Retrieval Accuracy

### 1.1 Architecture & Current Implementation
The Signal MD search subsystem (`server/routes/search/unifiedSearch.js`, `server/services/search/searchPipeline.js`) executes a 6-stage clinical retrieval and ranking workflow:
1. **Query Intent & Entity Extraction (`QueryParser.js`, `searchQueryIntentService.js`)**:
   - Classifies clinical query intent (`management`, `diagnosis`, `prognosis`, `etiology`, `guideline`).
   - Extracts PICO elements (Population, Intervention, Comparator, Outcome).
   - Injects PubMed MeSH term clauses and study type constraints (`Randomized Controlled Trial`, `Systematic Review`, `Practice Guideline`).
2. **Multi-Source Hybrid Retrieval**:
   - Primary: PubMed E-Utilities API with MeSH translation.
   - Vector: pgvector semantic search over `articles_cache`. Migration `093` dropped the lossy `ivfflat` index, reverting to exact cosine similarity scan (~12ms latency, 1.000 recall).
   - Fallbacks: Europe PMC and OpenAlex for grey literature and preprints.
   - Query Auto-Repair: Detects sparse/zero-yield queries and automatically attempts relaxed MeSH queries or guideline-specific terms.
3. **Evidence Hierarchy & Bouquet Ranking**:
   - Classifies articles into clinical tiers: Landmark RCTs, Systematic Reviews / Meta-Analyses, Practice Guidelines, Cohort/Observational studies, Preprints, and Retracted articles (flagged with explicit warnings).
4. **Hybrid PICO Reranker (`server/services/articleReranker.js`)**:
   - Evaluates candidate abstracts against patient PICO profiles using lightweight LLM batch calls (Gemini Flash-Lite / Mistral Small) backed by deterministic heuristic fallbacks.
   - Passes the Ground-Truth Rerank Benchmark (`benchmarks/searchRerankBenchmark.mjs`) with nDCG@10 = 0.740 (target \(\ge 0.70\)) and Precision@5 = 0.720 (target \(\ge 0.60\)).
5. **Personalization Guardrails (`server/services/bandit/personalizationGuardrails.js`)**:
   - Multi-armed bandit ranker pulls are bound by safety guardrails: personalization can never reorder a lower-tier observational study above landmark RCTs, guidelines, or retractions.

### 1.2 What Is Pending
- **Unified Search PICO Reranking Execution**: While `searchPipeline.js` exposes `rerankArticlesByPico`, in standard keyword/natural language queries, the pipeline bypasses LLM reranking if no explicit PICO is provided in the request payload. In `server/routes/review/cases.js`, PICO extraction is performed via `extractPicoProfile(caseText)`, but `unifiedSearch.js` primarily relies on lexical and bouquet ranking.
- **Offline Search Quality Evaluation**: `scripts/eval-search-quality.js` requires an active HTTP server running on `http://localhost:3002`. In automated CI or isolated pre-deployment containers, the evaluation fails because there is no offline fixture-based runner.
- **Clinical Evidence Benchmark Coverage**: `benchmarks/clinicalEvidenceBenchmark.mjs` currently contains only 7 test scenarios (sepsis, ARDS, COPD, ACS, PE, GLP-1, COVID-19). `COMMERCIAL_READINESS.md` mandates a 50-query labelled gold set to evaluate Precision@10 (\(\ge 0.60\)), Recall@10 (\(\ge 0.50\)), and Off-topic rate (\(\le 0.20\)).

### 1.3 Recommendations for Beta Launch
1. **Implement Automated PICO Extraction for Clinical Queries in Unified Search**:
   - When query intent classification identifies a clinical presentation (e.g., *"65yo male with severe COPD exacerbation on roflumilast"*), automatically trigger `extractPicoProfile` asynchronously or execute heuristic PICO parsing before bouquet finalization.
2. **Add Offline Fixture Execution to `eval:search-quality`**:
   - Modify `scripts/eval-search-quality.js` to support an `--offline` flag using cached fixtures from `tests/fixtures/search-quality-gold.json`. This enables CI quality gates without requiring external network connectivity or live daemon ports.
3. **Expand `clinicalEvidenceBenchmark.mjs` to 50 Ground-Truth Clinical Cases**:
   - Populate the remaining 43 benchmark scenarios covering emergency medicine, internal medicine, pediatrics, and critical care to ensure clinical retrieval metrics meet the beta thresholds.
4. **Display Extracted PICO Tags in Search UI**:
   - In `src/components/search/SearchBar.tsx` and `TopicBriefHeader.tsx`, render the extracted PICO parameters as dismissible/editable chips so clinicians see why specific evidence was retrieved.

---

## Section 2: Synopsis Generation & Evidence Synthesis

### 2.1 Architecture & Current Implementation
The evidence synthesis pipeline (`server/services/ai/paperSynopsisCore.js`, `server/services/ai/synthesisGenerationCore.js`) generates grounded summaries and syntheses:
1. **Two-Tier Durable Caching**:
   - Fast Tier: Redis in-memory cache with 7-day TTL.
   - Durable Tier: `teaching_objects` SQLite/PostgreSQL table, storing reusable synopses for up to 90 days (`SYNOPSIS_REUSE_MAX_AGE_DAYS`). This prevents redundant LLM billing across multiple users querying the same landmark trial.
2. **Claim Grounding & Critic Pass (`synopsisGroundingService.js`)**:
   - Deconstructs syntheses into discrete factual assertions.
   - Runs a critic pass that validates each claim against primary abstract or full text, assigning a numeric grounding score and catching hallucinated claims.
3. **Automated Trial–Guideline Conflict Detection (`server/services/conflictExtractionService.js`)**:
   - Cross-references trial evidence against database guidelines.
   - Generates a structured `conflictMatrix` categorizing divergences into:
     - `major`: Trial directly contradicts guideline recommendations (e.g., active intervention vs. standard care).
     - `minor`: Discrepancies in dosage, timing, or secondary endpoints.
     - `nuanced`: Subpopulation variations (e.g., severe ARDS vs. mild/moderate ARDS).
   - Rendered in frontend via `src/components/search/ConflictMatrixPanel.tsx`.
4. **Guideline Document Summaries (`091_guideline_document_synopsis.sql`)**:
   - Supports pre-computed structured synopses for practice guidelines.

### 2.2 What Is Pending
- **Database Guideline Sparsity**: For niche or long-tail clinical queries, the `topic_guidelines` table often has 0 matching rows. When this occurs, conflict detection silently returns an empty matrix without explaining that no guidelines were available for cross-referencing.
- **Abstract-Only Evidence Trust Warnings**: When Grobid or Unpaywall PDF full-text extraction fails, synopses are generated purely from abstracts. The UI lacks a prominent warning alerting clinicians that subgroup nuances, dosage caveats, or adverse event rates might be omitted.
- **Guideline Alignment One-Click Action**: In `src/components/search/TopicBriefPanel.tsx`, the "Ask: Guideline vs. Trial" action button described in `docs/PLAN.md` (Track 2.3) is not visibly anchored to auto-scroll and expand the `ConflictMatrixPanel`.
- **Expert Review Workflow**: Migration `082_synopsis_review_state.sql` introduced `review_state` (`unreviewed`, `verified`, `flagged`), but the admin/clinician review interface is not fully exposed to beta testers.

### 2.3 Recommendations for Beta Launch
1. **Seed Guidelines for Top 25 Clinical Topics**:
   - Pre-populate `topic_guidelines` with verified recommendations from NICE, AHA/ACC, ESC, and KDIGO across common conditions (Sepsis, Heart Failure, Atrial Fibrillation, Type 2 Diabetes, Acute Stroke, Community-Acquired Pneumonia, etc.). This ensures immediate utility for early adopters.
2. **Implement Prominent "Abstract-Only" Warning Banners**:
   - If a synopsis is synthesized without full-text verification, display an amber disclaimer badge: *"Abstract-Only Evidence: Subgroup analyses, secondary outcomes, and specific dosing protocols require primary paper verification."*
3. **Wire One-Click Conflict Matrix Navigation**:
   - Connect the guideline trigger button in `TopicBriefPanel.tsx` directly to `ConflictMatrixPanel.tsx`, with automatic smooth scrolling and visual highlighting.
4. **Explicit Empty State for Conflict Detection**:
   - When no guidelines exist for a topic, render a helpful notice: *"No practice guidelines currently indexed for this specific clinical entity. Showing raw trial evidence bouquet."*

---

## Section 3: Learning Agents & Closed-Loop Reinforcement Learning

### 3.1 Architecture & Current Implementation
Signal MD features an advanced learning loop driven by Multi-Armed Bandit (MAB) algorithms, Bayesian Knowledge Tracing (BKT), and Free Spaced Repetition (FSRS):
1. **Bandit Policy Management (`server/services/bandit/`)**:
   - Six distinct policies operating on Thompson Sampling with Beta/Dirichlet posteriors:
     - `search_ranking`: Calibrates weights for relevance, recency, gap-filling, and personal misconceptions.
     - `synopsis_style`: Evaluates *Bottom line first*, *PICO structured*, *Narrative flow*, and *Teaching points*.
     - `agent_teaching_strategy`: Adapts between *Direct explanation*, *Socratic questioning*, *Analogy-led*, and *Worked example first*.
     - `case_difficulty`: Calibrates scenario difficulty (*Easy*, *Medium*, *Hard*) based on learner ability.
     - `quiz_claim_selection`: Prioritizes claims with high discrimination and documented misconceptions.
     - `recommendation_strategy`: Optimizes the sequence of study plans, spaced repetition, and case challenges.
2. **Idempotent Multi-Timescale Reward Attribution**:
   - Immediate rewards: Click-throughs, paper saves, dwell time, quiz submission accuracy, and direct thumbs up/down feedback.
   - Delayed reward backfill (`delayedRewardBackfillService.js`): Evaluates retention, recall, and repeat interactions at 1-day, 3-day, and 7-day horizons.
   - Idempotency: `bandit_reward_applications` table ensures duplicate interactions do not distort Beta distribution parameters.
3. **Safety & Promotion Gate (`searchRankerPromotionGateService.js`)**:
   - Nightly offline evaluation enforces a **promote / hold / regress** decision based on propensity-weighted off-policy evaluation before new policy weights reach production.
4. **Adaptive Learner Memory & Misconception Injection**:
   - Tracks repeated quiz errors in `user_claim_misconceptions` and infers persistent `misconception_tags` (e.g., `steroid_timing_ards`).
   - Injects personal misconceptions into case generation prompts (`server/routes/review/cases.js`) so the simulated case directly tests the learner's specific weak spots.
   - Just-in-Time Reminders (`buildJitReminder`) alert learners to related concepts they previously struggled with prior to case engagement.

### 3.2 What Is Pending
- **Cold-Start Bandit Exploration Transparency**: New beta users (with <8 historical pulls) default to static heuristic weights. The transition from heuristic default to bandit adaptation lacks visual feedback.
- **Learner Memory Details Visibility**: Users see high-level badges (*"Sparse"*, *"Building"*, *"Strong"* memory) on the quiz page, but cannot see the underlying rationale (search counts, tracked papers, weak nodes, inferred misconceptions) as outlined in `docs/PLAN.md` (Track 1.3).
- **Portfolio Reflection Export (CBD / CPD)**: Completed cases offer exportable reflections, but quiz completion lacks a structured reflection export (Track 2.2 from `docs/PLAN.md`) for Junior Doctors needing Case-Based Discussion (CBD) or Continuous Professional Development (CPD) logs.
- **Anonymous Session Reconcile Validation**: Migration 092 made `quiz_attempts.user_id` nullable to persist anonymous attempts, but tests for anonymous-to-authenticated reconciliation must be verified end-to-end once migration 092 is repaired.

### 3.3 Recommendations for Beta Launch
1. **Provide Visual Adaptation Explanations**:
   - When the agent selects a specific teaching strategy (e.g., Socratic) or case difficulty, display an informative caption: *"Adaptive learning: Socratic questioning selected based on your recent mastery of acute resuscitation."*
2. **Build the Learner Memory Detail Popover / Modal**:
   - Enhance the topic memory badge in `QuizPage.tsx` and `LearningDashboardPage.tsx` to display:
     - Search signal count
     - Number of tracked landmark papers
     - Specific weak outline nodes
     - Current inferred misconception tags
3. **Implement Quiz Completion Portfolio Reflection Export**:
   - Add a "Generate CPD / CBD Reflection" button to `QuizCompletePanel.tsx`. Pre-populate the template with the topic, accuracy percentage, guideline citations, and key learning gaps identified during the attempt.

---

## Section 4: Critical Code Blockers & Engine Deficiencies

### 4.1 Blocker 1: SQLite Syntax Error in Migration 092
- **File**: `database/migrations/092_quiz_attempts_anonymous.sql:21`
- **Root Cause**: Line 21 contains PostgreSQL-specific DDL:
  ```sql
  ALTER TABLE quiz_attempts ALTER COLUMN user_id DROP NOT NULL;
  ```
  SQLite's SQL parser does not support `ALTER COLUMN`. Running this on SQLite causes `Error: near "ALTER": syntax error`.
- **Systemic Impact**:
  - `npm run db:schema:check` crashes immediately on execution.
  - `npm test` fails 9 test suites (65 tests) across all real-database integration and unit tests (`tests/integration/db.integration.test.js`, `tests/unit/topicMemory.test.js`, `tests/unit/lowRecallDb.test.js`, `tests/unit/searchGoldJudgmentsDb.test.js`, etc.).
  - `npm run eval:agent-quality` fails to connect to the local database.
  - `npm run verify:topic-orphans` fails to execute.
- **Fix**:
  1. In `scripts/sqlite-migrate.mjs` and `scripts/check-schema-consistency.mjs`, update `execStatement` to recognize and safely skip PostgreSQL-specific `ALTER TABLE ... ALTER COLUMN` statements when running on SQLite.
  2. In `database/schema.sql`, ensure the SQLite baseline defines `quiz_attempts.user_id` as nullable by default (`user_id TEXT REFERENCES users(id) ON DELETE CASCADE`), aligning SQLite dev with production PostgreSQL.

### 4.2 Blocker 2: Baseline Schema Column Drift on `teaching_objects`
- **Root Cause**: Migration `090_topic_identity.sql` added:
  ```sql
  ALTER TABLE teaching_objects ADD COLUMN curriculum_topic_id TEXT REFERENCES curriculum_topics(id);
  ```
  However, `curriculum_topic_id` was never backfilled into `database/schema.sql` or `database/production_schema.sql`.
- **Systemic Impact**: `npm run db:schema:check` flags column set divergence on `teaching_objects` between `schema.sql` and the migrated database.
- **Fix**: Run `npm run db:schema:regen` after fixing migration 092 to synchronize baseline definitions.

### 4.3 Blocker 3: Missing Migration Rollback Files (`079`–`093`)
- **Root Cause**: `scripts/verify-beta-safety.mjs` enforces that every migration has a corresponding `.down.sql` rollback script in `database/rollbacks/`. Currently, migrations `079_learning_rl_schema_reconciliation.sql` through `093_drop_ivfflat_articles_cache.sql` have no rollback files.
- **Systemic Impact**: `npm run beta:safety` fails.
- **Fix**: Author the missing rollback scripts under `database/rollbacks/` (e.g., `093_drop_ivfflat_articles_cache.down.sql` recreating the index; `092_quiz_attempts_anonymous.down.sql` dropping column `session_id`, etc.).

### 4.4 Blocker 4: Production Environment Variable & Webhook Verification
- **Root Cause**: `npm run verify:production-env` fails on unconfigured staging/production environments due to 15 missing variables (`JWT_SECRET`, `DATABASE_URL`, `REDIS_URL`, `STRIPE_SECRET_KEY`, `SENTRY_DSN`, etc.).
- **Systemic Impact**: Production billing and rate-limiting safeguards cannot be guaranteed without live environment validation.
- **Fix**: Follow `.env.production.example` to inject required secrets on the hosting provider and perform a live end-to-end Stripe webhook checkout test.

---

## Section 5: Prioritized Pre-Beta Launch Action Plan

```
========================================================================================
                          SIGNAL MD PRE-BETA ACTION ROADMAP
========================================================================================

[PHASE 0: CRITICAL CODE & TEST BLOCKERS] - Target: Day 1
  [ ] 0.1 Update scripts/sqlite-migrate.mjs & scripts/check-schema-consistency.mjs to
          skip PostgreSQL 'ALTER TABLE ... ALTER COLUMN' statements on SQLite.
  [ ] 0.2 Synchronize database/schema.sql and database/production_schema.sql to include
          curriculum_topic_id on teaching_objects via npm run db:schema:regen.
  [ ] 0.3 Verify npm run db:schema:check exits with status code 0.
  [ ] 0.4 Verify all 250 test suites pass with zero failures (npm test).
  [ ] 0.5 Create missing rollback scripts (079 to 093) in database/rollbacks/.
  [ ] 0.6 Verify npm run beta:safety passes in staging/local environments.

[PHASE 1: SEARCH & EVIDENCE VERIFICATION] - Target: Days 2–3
  [ ] 1.1 Add '--offline' fixture mode to scripts/eval-search-quality.js.
  [ ] 1.2 Expand benchmarks/clinicalEvidenceBenchmark.mjs from 7 to 50 clinical queries.
  [ ] 1.3 Ensure search Precision@10 >= 0.60 and Off-topic rate <= 0.20 on benchmark.
  [ ] 1.4 Seed topic_guidelines for top 25 clinical conditions (NICE / AHA / ESC / KDIGO).
  [ ] 1.5 Display extracted PICO chips on search results for clinical queries.

[PHASE 2: SYNOPSIS & CONFLICT MATRIX UX] - Target: Days 3–4
  [ ] 2.1 Add amber 'Abstract-Only Evidence' warning banner on ungrounded synopses.
  [ ] 2.2 Wire 'Ask: Guideline vs. Trial' button in TopicBriefPanel to scroll & open
          ConflictMatrixPanel.
  [ ] 2.3 Add clear empty state message when no guidelines are indexed for a topic.
  [ ] 2.4 Verify 90-day durable synopsis reuse cache in teaching_objects prevents
          duplicate LLM billing on repeated queries.

[PHASE 3: LEARNING AGENTS & USER FEEDBACK] - Target: Days 4–5
  [ ] 3.1 Expose learner memory details (searches, tracked papers, weak nodes,
          misconceptions) in QuizPage and LearningDashboardPage popover.
  [ ] 3.2 Add Portfolio Reflection export (CBD / CPD format) upon quiz completion.
  [ ] 3.3 Verify anonymous quiz attempt reconciliation onto authenticated profiles
          upon signup/login.
  [ ] 3.4 Confirm in-app beta tester feedback widget correctly writes to quality feedback
          database endpoints.

[PHASE 4: STAGING DEPLOYMENT & SMOKE GATES] - Target: Day 6
  [ ] 4.1 Deploy web and worker roles to staging environment.
  [ ] 4.2 Verify Redis 7 connection for BullMQ, rate limiting, and cache.
  [ ] 4.3 Execute end-to-end Stripe test checkout and verify webhook writes to
          billing_audit_log and updates user tier.
  [ ] 4.4 Verify Sentry error tracking and Prometheus /metrics scrape endpoints.
  [ ] 4.5 Run full Playwright E2E suite: npm run test:e2e:all.
========================================================================================
```

---

## Conclusion & Readiness Verdict

Signal MD has achieved an exceptional foundation in evidence-based clinical reasoning. Its multi-armed bandit architecture, PICO-guided abstract reranking, and structured trial-guideline conflict detection set it apart from conventional medical search applications.

By executing the prioritized action plan—commencing with the SQLite migration compatibility fix and schema synchronization—the engineering team will restore complete test coverage, achieve schema integrity, and deliver an outstanding, clinically trustworthy public beta.
