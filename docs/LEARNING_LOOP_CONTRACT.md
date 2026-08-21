# Learning Loop Contract

Signal MD personalizes search, synopsis, recommendations, quizzes, and agents only through a measurable loop:

```text
decision -> exposure -> interaction/feedback -> learning outcome -> reward -> offline eval -> policy update
```

This contract exists so the app can learn from user behavior without quietly optimizing for unsafe or noisy signals.

## Source Of Truth

- Runtime contract: `shared/contracts/learningLoop.js`
- Signal recorder: `server/services/learningSignalService.js`
- Reward scale: `server/services/rewardAttributionService.js`
- Reward attribution: `server/services/searchLearningOutcomeService.js`
- Bandit policies: `server/services/personalizationBanditService.js`
- Safety/observability: `server/services/productionObservabilityService.js`
- Offline eval: `server/services/policyReplayEvaluator.js`

## Required Flow

1. **Decision**
   A policy chooses a variant or rank influence and logs a `personalization_decisions` row.

   Examples:
   - search ranking arm
   - synopsis style arm
   - quiz claim selection arm
   - teaching strategy arm

2. **Exposure**
   The UI records that the user actually saw the result or recommendation.

   Required for search:
   - `searchId`
   - article UID
   - rank position
   - user ID or session ID

3. **Interaction Or Feedback**
   The app records behavioral and explicit signals.

   Examples:
   - click
   - save
   - dwell
   - helpful/not-helpful feedback
   - article view

4. **Outcome**
   The app links learning outcomes back to the source evidence when possible.

   Examples:
   - quiz attempt
   - first-attempt correctness
   - missed source claim
   - case outcome
   - agent follow-up quality

5. **Reward Attribution**
   Reward updates must be attributable to a decision or explicitly marked as skipped with a reason.

   A skipped reward is useful data. It should answer: "what broke the attribution chain?"

6. **Offline Evaluation**
   Any online policy must have enough logged propensity and reward coverage for offline checks before it is treated as safe.

## Safety Rules

- Do not optimize medical ranking only for clicks.
- Do not let personalization bury guidelines, retraction warnings, or high-quality evidence.
- Do not update online policy weights from passive low-confidence signals alone.
- Do log skipped attribution with concrete reasons.
- Do preserve propensities for inverse-propensity scoring.
- Do keep a safe heuristic fallback when reward coverage, propensity coverage, or queue health degrades.

## Event Stages

The runtime contract maps learning events into these stages:

- `exposure`: result or recommendation shown
- `interaction`: click, save, dwell, article view, topic open
- `feedback`: explicit helpful/not-helpful feedback
- `outcome`: quiz, case, agent, or learning outcome
- `reward`: attributed or skipped reward signal
- `observability`: internal memory/control events

Every signal recorded through `recordLearningSignal` is annotated with:

- `learningLoopContractVersion`
- `learningLoopStage`
- `learningLoopContractErrors`, when required attribution fields are missing

## Adding A New Learning Surface

Before adding a new personalized surface, define:

- policy type
- allowed arms or variants
- exposure event
- interaction event
- outcome event
- reward function
- safety fallback
- offline eval query
- observability threshold

If those cannot be defined, the feature may log analytics but should not update online learning.

## Operating Thresholds

Treat online learning as unsafe when:

- dead-letter jobs are present
- reward attribution rate is below `0.45`
- propensity coverage is below `0.5` once enough decisions exist
- search no-click rate is high
- synopsis citation validation regresses
- low-recall searches accumulate without review

Use `collectLearningLoopControl` / production readiness summaries to choose between:

- `observe_only`
- `safe_heuristic_fallback`
- `learning_enabled`
