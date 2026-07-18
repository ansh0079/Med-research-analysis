# Clinical Reasoning Roadmap: From Beta to Commercial Launch

> **Context:** This roadmap bridges the gap between the current beta-ready state (strong search, learning, and evidence-synthesis foundations) and the commercial launch gates defined in `COMMERCIAL_READINESS.md`. It is designed to be executed in **4 sequential phases**, with each phase delivering a shippable improvement.
>
> **Current baseline (2026-06-05):**
> - Search: Heuristic query + AI query hints → PubMed/vector fetch → top 14 articles sent to synthesis
> - Synthesis: AI prompt already distinguishes Evidence vs Guideline, but no *explicit* conflict extraction pass
> - Learning: Quiz misconceptions tracked in `user_claim_misconceptions`, but not yet **injected into case-analysis or search synthesis**
> - Cache key: learning mode + topic + query only; no `userLevel` or `misconception` fingerprint

---

## Phase 1: Hybrid Search Reranking (Precision@10 → 0.75)

**Goal:** Stop relying on keyword overlap and impact scores alone. Fetch 30 articles, then use a lightweight LLM pass to score each abstract against the patient's PICO profile. Return the top 10 most clinically relevant.

**Commercial gate:** `Precision@10 >= 0.75`, `Off-topic rate@10 <= 0.10`

### 1.1 Create the Reranking Service
**New file:** `server/services/articleReranker.js`

Implement `rerankArticlesByPico(articles, picoProfile, options)`:
- Input: up to 30 raw articles + a structured PICO profile extracted from the case text
- Output: same articles, sorted by `picoRelevanceScore` (0–1), with `exclusionFlags` for severe mismatches
- Use a **lightweight prompt** (Gemini Flash-Lite / Mistral Small) to score each article in a single batch call:
  - Population match (age, severity, comorbidities)
  - Intervention match
  - Comparator relevance
  - Outcome alignment
  - Study design appropriateness (penalise case reports for management queries)
- Cost target: ~1s latency, ~$0.003 per rerank batch

**PICO profile source:** Re-use the existing `buildCaseSearchQueryPrompt` parsing logic, or extract PICO from the case text via a dedicated lightweight prompt before search.

### 1.2 Integrate Reranker into Case Analysis
**File:** `server/routes/review.js`

In the `POST /api/cases/analyze` route:
1. Change `gatherEvidenceArticlesForCase` call from `limit: 14` to `limit: 30`.
2. After fetching `baseArticles`, extract a `picoProfile` from `caseText` (cache this per caseText hash for 1 hour).
3. Call `rerankArticlesByPico(baseArticles, picoProfile)`.
4. Filter out articles with `exclusionFlags` containing `population_mismatch` or `severity_mismatch`.
5. Slice to top 10 for the synthesis prompt.

```js
// Inside POST /api/cases/analyze, after gatherEvidenceArticlesForCase:
const { rerankArticlesByPico, extractPicoProfile } = require('../services/articleReranker');
const picoProfile = await extractPicoProfile(caseText, { ai, cache });
const reranked = await rerankArticlesByPico(baseArticles, picoProfile, { ai, logWarn: req.log?.warn });
const clinicallyAlignedArticles = reranked
  .filter(a => !a.exclusionFlags?.includes('population_mismatch'))
  .slice(0, 10);
```

### 1.3 Update Cache Key to Include User Mastery
**File:** `server/routes/review.js`

The current cache key:
```js
const cacheKey = `case:${learningMode}:${topic.toLowerCase()}:${literatureQuery.slice(0, 220).toLowerCase()}:s:${seedKey}:tk:${tkSig}`;
```

Replace with:
```js
const userLevel = userContext?.mastery?.tier || userContext?.profile?.effectiveDifficulty || 'unknown';
const cacheKey = `case:${learningMode}:${userLevel}:${topic.toLowerCase()}:${literatureQuery.slice(0, 220).toLowerCase()}:s:${seedKey}:tk:${tkSig}`;
```

**Rationale:** A resident and a student searching the exact same case should receive different complexity levels. This ensures cached results respect that.

### 1.4 Build Search Eval Suite
**New file:** `benchmarks/searchRerankBenchmark.mjs`

- Create a labelled set of 30–50 clinical queries with explicit "relevant" / "irrelevant" judgements for the top 10.
- Run the benchmark against (a) current heuristic baseline, (b) reranked pipeline.
- Target: Precision@10 improves from ~0.55 to >= 0.75.

**Acceptance:** `npm run eval:search-quality` passes with `precision_at_10 >= 0.70` (beta threshold) before merging to main.

---

## Phase 2: Automated Trial–Guideline Conflict Detection

**Goal:** Move from prose summaries to a structured "Evidence vs. Guideline" matrix that explicitly surfaces when recent RCTs contradict local guidelines.

**Commercial gate:** Users can scan contradictions in <2 seconds; Major/Minor/Nuanced hierarchy is visually obvious.

### 2.1 Create Conflict Extraction Service
**New file:** `server/services/conflictExtractionService.js`

Implement `extractTrialGuidelineConflicts(evidenceRows, guidelines, options)`:
- Input: top 3–5 reranked articles (with PICO) + guideline rows from DB
- Output: structured `conflictMatrix`:
  ```ts
  type ConflictLevel = 'major' | 'minor' | 'nuanced';
  interface ConflictItem {
    level: ConflictLevel;
    trialIndex: number;      // 1-based evidence index
    guidelineIndex: number;  // 1-based guideline index
    trialClaim: string;      // what the trial suggests
    guidelineClaim: string;  // what the guideline says
    populationGap: string;   // e.g. "Trial included only severe ARDS; guideline covers all grades"
    clinicalNuance: string;  // why the divergence matters
    recommendation: string;  // "Consider guideline-first; monitor for subgroup applicability"
  }
  ```
- Implementation options:
  - **Option A (Recommended):** Use a dedicated lightweight LLM prompt that compares PICO-extracted trial data against guideline rows. Cost: ~1 extra LLM call per case analysis.
  - **Option B (Future):** Use a small cross-encoder trained on medical contradiction pairs.

### 2.2 Inject Conflict Matrix into Case Evidence Prompt
**File:** `server/prompts/case.js`

Update `buildCaseEvidencePrompt`:
- Add a new optional parameter `conflictMatrix`.
- If present, append a `CONFLICT ANALYSIS` section to the prompt:
  ```
  CONFLICT ANALYSIS (pre-computed):
  [Major] Trial [1] (RECOVERY) suggests early dexamethasone reduces mortality in COVID-19 ARDS.
  Guideline [G1] (NICE 2024) does not yet recommend routine steroids for viral ARDS.
  Population gap: RECOVERY was hospitalised adults with hypoxia; NICE excludes viral pneumonia subgroups.
  Clinical nuance: Consider severity-stratified decision making.
  ```
- Instruct the AI to incorporate these into `uncertainties`, `interventions`, and `caseMCQs` rather than inventing new conflicts.

### 2.3 Return Structured Conflict Data in API Response
**File:** `server/routes/review.js`

In the `POST /api/cases/analyze` response, add:
```js
conflictMatrix: conflictMatrix || [],
guidelineAlignment: {
  alignedCount: number,
  divergentCount: number,
  keyDivergence: ConflictItem | null,
},
```

### 2.4 UI: Evidence vs. Guideline Matrix
**Files:**
- `src/components/search/SynthesisPanel.tsx` — render the conflict matrix
- `src/components/search/GuidelineSnapshot.tsx` — apply severity styling

**Design spec:**
- **Major:** Red left border (`border-l-4 border-red-500`), bold header, `AlertTriangle` icon, text: "Major conflict with {guideline}"
- **Minor:** Amber left border, text: "Minor divergence — consider context"
- **Nuanced:** Blue left border, `Info` icon, text: "Nuanced — evidence supports a specific sub-population not covered by the guideline"
- Each card shows: Trial claim | Guideline claim | Population gap | "Why this matters" one-liner

### 2.5 Add "Ask guideline vs trial" One-Click Action
**File:** `src/components/search/TopicBriefPanel.tsx`

- Add a prominent button next to the evidence bouquet: "Ask: guideline vs trial?"
- Clicking auto-scrolls to the `SynthesisPanel` conflict matrix and expands it.

---

## Phase 3: Proactive Learning Agent (Misconception Inference)

**Goal:** Move from "tracking quiz misses" to "inferring misconceptions and injecting remedial context into future interactions."

**Commercial gate:** Every meaningful user interaction writes a compact learning event. Agent prompts use compact summaries rather than full raw histories.

### 3.1 Infer Misconception Tags from Quiz Patterns
**File:** `server/routes/learning/index.js`

The existing `recordQuizAttempt` already writes to `user_claim_misconceptions` with `misconception_category`. Extend this:

1. **Add `misconception_tag` inference:**
   - If a user misses 3+ questions on the same claim key with the same wrong option pattern, infer a `misconception_tag` (e.g. `steroid_timing_ards`, `fluid_resuscitation_sepsis`).
   - Store in a new column or JSON extension on `user_topic_memory`:
     ```sql
     ALTER TABLE user_topic_memory ADD COLUMN inferred_misconceptions TEXT; -- JSON array of tags
     ```

2. **Update `getUserClaimMisconceptions` lookback:**
   - Already increased to `limit: 5, minOccurrences: 1` in `aiRoutes.js`.
   - Ensure `learningRoutes.js` also uses this expanded lookback when updating topic memory.

### 3.2 Inject Misconceptions into Case Analysis
**File:** `server/routes/review.js`

In `POST /api/cases/analyze`:
1. After fetching `userContext`, also fetch `personalMisconceptions`:
   ```js
   const personalMisconceptions = await db.getUserClaimMisconceptions(req.user.id, topic, {
     limit: 5, minOccurrences: 2,
   }).catch(() => []);
   ```
2. Pass them into `buildCaseEvidencePrompt` via `userContext.misconceptions`.

**File:** `server/prompts/case.js`

Update `buildCaseEvidencePrompt` to include a `PERSONAL LEARNING CONTEXT` block:
```
PERSONAL LEARNING CONTEXT:
The user has previously struggled with the following concepts in related topics:
- {{misconception.tag}}: {{misconception.description}} (missed {{count}} times)
When generating the vignette and MCQs, explicitly address these gaps. Do not assume mastery.
```

### 3.3 Just-in-Time Reminder Box in Search Results
**File:** `src/components/search/SynthesisPanel.tsx`

When a user searches for a topic where they have a recorded misconception on a **related** topic (e.g. searched "Sepsis" but has `steroid_timing_ards` misconception):
- Show a "Quick Reminder" info box at the top of the synthesis:
  > **Quick Reminder:** Last time, you were reviewing steroid timing in ARDS. Note that in Sepsis, the evidence for hydrocortisone differs from the ARDS trials you saw. [Dismiss]

**Backend logic:**
- **File:** `server/services/relatedTopicService.js` (new or extend existing)
- Map topics via a lightweight semantic similarity (e.g. shared MeSH terms, or simple keyword overlap) to trigger cross-topic reminders.

### 3.4 Adaptive Learning Velocity
**File:** `server/services/learningVelocityService.js` (already exists — verify)

- Detect when a user's mastery is plateauing (3+ quizzes on same topic, accuracy 50–70%).
- Auto-trigger a "Level Up" synopsis: bump `learningMode` from `student` → `resident` or `resident` → `specialist` for that topic.
- Store the override in `user_topic_mastery.suggestedDifficulty`.

---

## Phase 4: Commercial Hardening

**Goal:** Satisfy all remaining launch gates from `COMMERCIAL_READINESS.md`.

### 4.1 Move Heavy LLM Work to BullMQ Workers
**Files:**
- `server/services/aiGenerationJobService.js` — already exists for synthesis & synopsis
- Extend to cover:
  - Case analysis reranking (Phase 1)
  - Conflict extraction (Phase 2)
  - Misconception inference batch jobs (Phase 3)

**Acceptance:** Express event loop is never blocked >500ms by an LLM call.

### 4.2 Redis-Backed Cache & Rate Limiting
**Status:** Blocked in `COMMERCIAL_READINESS.md`

- Ensure `cache` abstraction supports Redis in production.
- Add single-flight behaviour for identical concurrent queries.

### 4.3 Complete the 50-Query Labelled Eval Set
**File:** `benchmarks/clinicalEvidenceBenchmark.mjs` (already exists)

- Expand from current coverage to 50 queries.
- Include edge cases: paediatric populations, rare diseases, conflicting-guideline scenarios.
- Run against reranked pipeline before each release.

### 4.4 Observability Dashboards
**Files:**
- `server/middleware/metrics.js` — add search latency breakdown by stage (query gen → fetch → rerank → synthesis)
- `logs/` — ensure LLM cost per call, cache hit rate, and external API errors are structured-logged

---

## Execution Order

```
Phase 1 — Search Intelligence
  P1.1  Create articleReranker.js service + PICO extraction prompt
  P1.2  Integrate reranker into reviewRoutes.js (limit 30 → rerank → top 10)
  P1.3  Update cache key with userLevel
  P1.4  Build searchRerankBenchmark.mjs

Phase 2 — Conflict Detection
  P2.1  Create conflictExtractionService.js
  P2.2  Update case.js prompt with conflict injection
  P2.3  Return conflictMatrix in case analyze API
  P2.4  UI: SynthesisPanel + GuidelineSnapshot severity redesign
  P2.5  UI: TopicBriefPanel "Ask guideline vs trial" CTA

Phase 3 — Proactive Learning
  P3.1  Extend learningRoutes.js with misconception_tag inference
  P3.2  Inject misconceptions into case evidence prompt
  P3.3  UI: Just-in-Time Reminder box
  P3.4  Wire learningVelocityService level-up trigger

Phase 4 — Commercial Hardening
  P4.1  Extend aiGenerationJobService for rerank + conflict jobs
  P4.2  Redis cache + single-flight
  P4.3  50-query eval suite
  P4.4  Metrics & dashboards
```

---

## Files to Touch (Summary)

### New Files
- `server/services/articleReranker.js`
- `server/services/conflictExtractionService.js`
- `server/services/relatedTopicService.js`
- `benchmarks/searchRerankBenchmark.mjs`

### Backend Modifications
- `server/routes/review.js` — rerank integration, cache key, conflict matrix in response, misconception fetch
- `server/routes/learning/index.js` — misconception_tag inference
- `server/routes/ai.js` — ensure quiz prompts already use `limit: 5, minOccurrences: 1` (verify)
- `server/prompts/case.js` — conflict injection, personal learning context
- `server/prompts/synthesis.js` — optional: deepen evidenceDisagreement rubric with conflict levels
- `server/services/aiGenerationJobService.js` — extend workers
- `database/migrations/` — add `inferred_misconceptions` to `user_topic_memory` if not present

### Frontend Modifications
- `src/components/search/SynthesisPanel.tsx` — conflict matrix UI, source badges, JIT reminder
- `src/components/search/GuidelineSnapshot.tsx` — severity styling, disclaimer
- `src/components/search/TopicBriefPanel.tsx` — "Ask guideline vs trial" CTA
- `src/pages/QuizPage.tsx` — memory details popover (from PLAN.md Track 1.3)
- `src/pages/LearningDashboardPage.tsx` — topic memory section

### Tests
- `tests/unit/articleReranker.test.js`
- `tests/unit/conflictExtractionService.test.js`
- `tests/unit/topicMemory.test.js` (already planned in PLAN.md)
- `tests/e2e/caseAnalyzeConflictDetection.spec.ts`

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Reranker LLM call adds >1s latency | Cache PICO profile per caseText hash; use Gemini Flash-Lite (fastest model) |
| Conflict extraction hallucinates contradictions | Ground prompt strictly on supplied PICO + guideline text; validate against source indices |
| Misconception tags become stale | Re-compute tags weekly via background job; decay counts >90 days |
| Frontend bundle grows with new UI | Lazy-load conflict matrix component; keep reminder box lightweight |
| Cost of 2 extra LLM calls per case analysis | Use async workers for non-blocking paths; cache aggressively |

---

## Success Metrics

### Search quality

| Metric | Source | Target (commercial) |
|--------|--------|---------------------|
| Mean Reciprocal Rank (MRR) | `search_result_impressions` + click/save/dwell | ≥ 0.65 |
| NDCG@10 | Same implicit relevance labels | ≥ 0.70 |
| CTR on top-3 results | Impression positions 1–3 | ≥ 0.25 |
| Time to find relevant paper | `search_result_click.elapsedMs` | p50 < 45s |

Offline gold-set eval also tracks **Precision@10** (≥ 0.75) and **off-topic rate@10** (≤ 0.10) via `npm run eval:search-quality`.

### Synthesis quality

| Metric | Source | Target |
|--------|--------|--------|
| Factual accuracy score | `product_quality_feedback.factual_accuracy` (1–5) | ≥ 4.0 avg |
| Completeness of evidence extraction | `product_quality_feedback.completeness` | ≥ 4.0 avg |
| Clinical usefulness rating | `product_quality_feedback.clinical_usefulness` | ≥ 4.0 avg |
| Time saved in literature review | `product_quality_feedback.time_saved_minutes` | ≥ 15 min median |
| Citation validation pass rate | `analytics.synthesize.citationOk` | ≥ 0.90 |

### Learning agent

| Metric | Source | Target |
|--------|--------|--------|
| User retention improvement | `learning_events` week-over-week cohort | ≥ 0.40 return rate |
| Search query refinement depth | `searches.session_sequence_index` | ≥ 1.5 avg in active sessions |
| Knowledge progression | `user_topic_memory.memory_score` delta | +10 pts / 30 days |
| Satisfaction with recommendations | `feedback_helpful` / (`helpful` + `confusing`) | ≥ 0.75 |

**Admin dashboard:** `GET /api/analytics/quality-metrics?days=30` (Analytics page, admin role).

### Phase gates (release)

| Phase | Metric | Target |
|-------|--------|--------|
| 1 | Precision@10 | ≥ 0.75 |
| 1 | Off-topic rate@10 | ≤ 0.10 |
| 1 | Case analysis latency (p95) | < 4s including rerank |
| 2 | Conflict matrix coverage | Present in 100% of case analyses with guidelines |
| 2 | User time-to-understand contradiction | < 2 seconds (visual scan) |
| 3 | Misconception injection rate | ≥ 80% of case analyses for users with ≥3 misses |
| 3 | Quiz accuracy improvement (post-reminder) | +10% on retested weak claims |
| 4 | Worker queue depth (production) | Always < 10 jobs |
| 4 | Search eval suite pass rate | 100% before release |

---

## Phase 5: Platform Hardening (1-week immediate + architecture runway)

**Goal:** Reduce tech debt, improve observability of user learning signals, and prepare logical service boundaries without premature microservice split.

### 5.1 Archive & stale clone cleanup ✅
- Gitignore `.claude/worktrees/`
- `scripts/cleanup-stale-worktrees.mjs` for safe removal
- See `docs/ARCHITECTURE.md` — no root `archive/` folder

### 5.2 Typed errors + recovery ✅
- `server/errors/appErrors.js`, `src/utils/appErrors.ts`
- Express handler returns `{ code, recovery }` for `AppError`

### 5.3 Event-driven interaction tracking ✅
- `server/lib/eventBus.js`
- `server/services/userInteractionService.js` → `learning_events` + analytics
- Wired from `POST /api/search/interaction`

### 5.4 Recommendation / vector facade ✅
- `recommendationService.personalizedSemanticSearch` wraps existing `vectorSearchService.semanticSearch`
- Production path already fuses vector in `GET /api/search`

### 5.5 State management (closed — deferred by design) ✅
- Keep split `SearchContext` (Query / Selection / Meta); see `docs/ARCHITECTURE.md`
- Zustand only for cross-page workflow state in a later sprint (not blocking Phase 5)

### 5.6 Test expansion ✅
- Coverage for `eventBus`, `userInteractionService`, `appErrors`, `recommendationService`, `qualityMetricsService`
- Learning-signal health section in `productionObservabilityService` (interaction + propensity density)
- `npm run test:platform-hardening`

### 5.7 Module boundaries (pre-microservice) ✅
- `tools/check-service-boundaries.js` — services/lib must not import `server/routes` or `src/`
- `npm run check:service-boundaries` (also exercised in `tests/unit/p5PlatformHardening.test.js`)
- Full process split remains **Phase 6+** when scale/ownership requires it:

```
services/search-service      ← unifiedEvidenceSearch, searchPipeline, articleReranker
services/ai-service          ← aiService, synthesisGenerationCore, conflictExtraction
services/user-service        ← learningRoutes, learnerContext, topic memory
services/recommendation-service ← recommendationService, vectorSearch, searchLearning
```
