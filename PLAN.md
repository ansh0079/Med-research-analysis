# Implementation Plan: Adaptive Memory, Junior Doctor Loop & Clinical Trust

## Overview

This plan addresses three tracks from the product roadmap. Each track is broken into concrete, file-level tasks with estimated effort and dependencies. The goal is to ship incrementally: Track 1 → Track 2 → Track 3.

---

## Track 1: Stabilize The Adaptive Memory

### 1.1 Wire saved-paper memory fully
**Problem:** The backend save endpoint already accepts `topicMemoryTopic`, but the frontend never sends it.  
**Files:**
- `src/services/api.ts` — add `topic?: string` to `saveArticle` options and include it in the POST body.
- `src/contexts/SearchContext.tsx` — update `toggleSaveArticle` to accept an optional `topic` parameter and pass `detectedTopic` when calling `api.saveArticle`.
- `src/pages/SearchPage.tsx` / `src/pages/SavedArticlesPage.tsx` — ensure `toggleSaveArticle(article)` calls pass the topic context.

**Acceptance:** Saving an article from search results records a signal in `user_topic_memory.saved_article_uids`.

### 1.2 Add tests for `user_topic_memory`
**Problem:** No unit tests cover search signals, quiz miss tracking, or memory tier promotion.  
**Files:**
- `tests/unit/topicMemory.test.js` — new test file.

**Test cases:**
- `recordUserTopicSearchSignal` increments `search_count`, stores top article UIDs, and computes tier.
- `recordUserTopicSavedArticleSignal` appends the article UID to `saved_article_uids`.
- `mergeUserTopicWeakOutlineNodes` appends incorrect `outlineNodeId`s and deduplicates.
- `_computeTopicMemoryScores` returns correct `memoryScore` and `memoryTier` (sparse → building → strong) based on search count, saved papers, and weak nodes.
- `maybePromoteAdaptiveTopicProposal` fires only when tier is `strong`, search_count ≥ 5, top articles ≥ 3, and not already promoted.

**Acceptance:** `npm test` passes with the new file.

### 1.3 Show memory details somewhere useful
**Problem:** Users only see a sparse/building/strong badge on the Quiz page. They don’t know *why*.  
**Files:**
- `src/pages/QuizPage.tsx` — expand the existing topic memory badge into a small detail popover/tooltip showing:
  - "{searchCount} searches"
  - "{savedPaperCount} tracked papers"
  - "{weakNodeCount} weak nodes"
  - "Memory score: {memoryScore}"
- `src/pages/LearningDashboardPage.tsx` — add a "Topic Memory" section in the Insights tab that lists top 5 topics by memory tier with the same detail breakdown.

**Acceptance:** Hovering or clicking the memory badge reveals the numeric breakdown.

### 1.4 Make "strong memory" proposal creation visible in Knowledge Review
**Problem:** When `maybePromoteAdaptiveTopicProposal` creates a proposal, the user has no visibility.  
**Files:**
- `src/pages/KnowledgeReviewPage.tsx` — query the backend for pending proposals for the current topic and show a banner:
  - "Your repeated study of {topic} triggered an AI knowledge proposal. Review or edit it here."
- `server/controllers/learningRoutes.js` — add `GET /api/learning/topic-proposals/:topic` that returns any pending `topic_knowledge` proposals for the user’s strong-memory topics.
- `database/index.js` — add `getTopicKnowledgeProposalsForUser(userId, topic)`.

**Acceptance:** A user with strong memory on a topic sees a proposal CTA in Knowledge Review.

---

## Track 2: Finish The Junior Doctor Loop

### 2.1 Tighten the first-screen workflow
**Problem:** The workflow exists but is not presented as a tight, linear funnel. Users can jump around.  
**Files:**
- `src/pages/SearchPage.tsx` — after a user enters a shift presentation and search completes, show a persistent "Junior Doctor Workflow" sticky action bar or side panel with the sequence:
  1. **Evidence** (current screen) — view trials & reviews
  2. **Guideline Check** — one-click scroll to `GuidelineSnapshot`
  3. **Case Mode** — pre-filled with the shift presentation
  4. **Quiz** — pre-filled with case decision point
  5. **Export** — CBD/CPD reflection
  Each step is disabled until the prior step is interacted with, OR all are enabled but the current step is highlighted.

**Acceptance:** A junior doctor can land on Search, enter a patient, and follow a visible 5-step trail without getting lost.

### 2.2 Add "Use this as CBD reflection" after quiz completion
**Problem:** CBD export only exists in Case Mode. Quiz completion has no export path.  
**Files:**
- `src/pages/QuizPage.tsx` — in the completion screen (where the score card and gap report live), add a new card:
  - "Portfolio Reflection" — select CBD / mini-CEX / DOPS, then export `.doc` or `.txt`.
  - Pre-fill: topic, number of questions, accuracy %, key weak areas (from gap report / question types missed).
- Re-use the export logic from `CaseModePage.tsx` (extract to a shared utility if needed).

**Acceptance:** After finishing a quiz, a user can generate a portfolio reflection document.

### 2.3 Add "Ask guideline vs trial" as a one-click action
**Problem:** Guideline comparison is buried inside `GuidelineSnapshot` and requires a second click.  
**Files:**
- `src/components/search/TopicBriefPanel.tsx` — add a prominent "Ask: guideline vs trial?" button next to the evidence bouquet.
- `src/components/search/GuidelineSnapshot.tsx` — ensure the alignment result is scroll-anchored and auto-expands when triggered from the TopicBriefPanel.
- `server/routes/aiExtras.js` — verify `POST /api/ai/guideline-alignment` handles this gracefully (it already exists; confirm no changes needed).

**Acceptance:** One click from the evidence bouquet runs the guideline alignment and scrolls the user to the result.

---

## Track 3: Improve Clinical Trust

### 3.1 Show guideline status clearly
**Problem:** Status badges exist but are not explained. Users don’t know what "AI extracted" implies for trust.  
**Files:**
- `src/components/search/GuidelineSnapshot.tsx` — add a legend/tooltip row above the guideline list:
  - 🟢 Human reviewed — clinician verified
  - 🟡 AI extracted — machine parsed; verify before use
  - 🟠 Stale — last checked > 12 months ago
  - 🔴 No guideline found — search primary literature
- `server/services/guidelineService.js` — ensure `stale` status is set correctly based on `last_checked_at` (> 365 days).

**Acceptance:** Every guideline card shows an intuitive status with a one-line explanation.

### 3.2 Add local guideline disclaimer and "verify local policy"
**Problem:** Users may assume guidelines are universally applicable.  
**Files:**
- `src/components/search/GuidelineSnapshot.tsx` — add a persistent footer banner:
  - "Guidelines reflect the source body's recommendations. Always verify against your local hospital policy and national formulary."
- `src/components/search/SynthesisPanel.tsx` — in the alignment result section, add the same disclaimer when contradictions or gaps are shown.
- `src/pages/CaseModePage.tsx` — add a small inline note near any guideline-derived intervention: "Verify local policy before applying."

**Acceptance:** Every guideline comparison and case intervention includes a local-policy reminder.

### 3.3 Improve contradiction UI: major/minor/nuanced should be visually obvious
**Problem:** Current UI uses red vs amber but lacks hierarchy and doesn’t handle "nuanced".  
**Files:**
- `src/components/search/SynthesisPanel.tsx` — redesign contradiction items:
  - **Major:** red left border, bold header, exclamation icon, "Major conflict with {guideline}"
  - **Minor:** amber left border, "Minor divergence — consider context"
  - **Nuanced:** blue left border, info icon, "Nuanced — evidence supports a specific sub-population not covered by the guideline"
- `src/components/search/GuidelineSnapshot.tsx` — apply the same severity styling to alignment contradictions.

**Acceptance:** A clinician can scan contradictions in 2 seconds and understand severity without reading full text.

### 3.4 Require source labels in quiz explanations
**Problem:** Quiz explanations don’t cite whether the rationale came from a trial, guideline, or topic memory.  
**Files:**
- `server/controllers/aiRoutes.js` — in the quiz generation prompt (`buildQuizPrompt`), explicitly instruct the AI:
  - "For each explanation, append a source label in brackets: [Trial], [Guideline], or [Topic memory]."
- `src/pages/QuizPage.tsx` — parse the source label from the explanation text and render it as a small badge:
  - [Trial] → violet badge
  - [Guideline] → blue badge
  - [Topic memory] → emerald badge
- If the AI fails to include labels, add a lightweight regex parser on the frontend to detect them; if absent, show "[Source not specified]" in slate.

**Acceptance:** Every quiz explanation shows a source category badge.

---

## Execution Order

```
Phase A — Track 1 (Memory)
  A1. Wire saved-paper topic passing (frontend + api)
  A2. Add topic-memory unit tests
  A3. Memory details UI (QuizPage + LearningDashboardPage)
  A4. Strong-memory proposal visibility (KnowledgeReviewPage + backend)

Phase B — Track 2 (Junior Doctor Loop)
  B1. Workflow sticky panel on SearchPage
  B2. Quiz completion CBD/CPD export
  B3. "Ask guideline vs trial" one-click action

Phase C — Track 3 (Clinical Trust)
  C1. Guideline status legend + stale logic
  C2. Local policy disclaimers
  C3. Contradiction severity redesign
  C4. Quiz explanation source labels
```

## Testing Strategy

- **Unit:** Add `tests/unit/topicMemory.test.js` for DB tier logic and promotion rules.
- **Integration:** Verify `POST /api/user/save` with `topicMemoryTopic` updates `user_topic_memory`.
- **E2E:** Playwright flow: search → save article → check memory badge → take quiz → export reflection.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| AI quiz prompt changes break existing question format | Add backward-compatible regex parsing; test with mock AI responses |
| Frontend bundle size grows with new UI | Keep components small; lazy-load Knowledge Review proposals |
| Stale guideline logic triggers false positives | Use 365-day threshold; allow manual override in admin panel |

## Files to Touch (Summary)

**Backend:**
- `server/routes/user.js` — already supports topic; no change needed
- `server/controllers/learningRoutes.js` — add proposal endpoint
- `server/controllers/aiRoutes.js` — quiz prompt source-label instruction
- `server/services/guidelineService.js` — stale auto-flagging
- `database/index.js` — add `getTopicKnowledgeProposalsForUser`

**Frontend:**
- `src/services/api.ts` — pass topic on save
- `src/contexts/SearchContext.tsx` — pass topic on save
- `src/pages/QuizPage.tsx` — memory details, CBD export, source badges
- `src/pages/SearchPage.tsx` — workflow panel
- `src/pages/CaseModePage.tsx` — local policy disclaimer
- `src/pages/LearningDashboardPage.tsx` — memory section
- `src/pages/KnowledgeReviewPage.tsx` — proposal banner
- `src/components/search/TopicBriefPanel.tsx` — guideline vs trial CTA
- `src/components/search/GuidelineSnapshot.tsx` — status legend, disclaimer, severity styling
- `src/components/search/SynthesisPanel.tsx` — contradiction severity redesign

**Tests:**
- `tests/unit/topicMemory.test.js` — new
- `tests/unit/api.test.js` — extend save-article tests with topic parameter
