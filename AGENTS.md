# Signal MD — universal agent rules

Applies to EVERY AI coding agent, IDE extension, and model in this repo.
Cursor, Copilot, Claude, Gemini, Windsurf, Cline, Aider, Codex, local models — same rules. No exceptions.

## Mission
App = medical evidence intel.
Priority loops: search → synopsis → learning agents.
Every user interaction = RL signal. Capture. Attribute. Improve.

## Always
- Review code state before change. Touch only search / synopsis / learning RL paths unless asked.
- Prefer existing services over new abstractions.
- Wire feedback into learning loop. No dead events.
- Keep provenance. No unsourced claims in synopsis / synthesis.
- Match local patterns. Small diffs. No drive-by refactors.
- Model-agnostic. Do not invent tool-specific shortcuts that break other agents.

## Search
- Entry: `server/services/searchPipeline.js`, `unifiedEvidenceSearch.js`, `searchEvidenceMergeService.js`, `searchRankingConstants.js`.
- Client: `src/hooks/useSearch.ts`, `src/components/search/*`.
- Rank by evidence quality + observed signals (impressions, clicks, saves, dwell, no-click, reformulations).
- Merge sources carefully. Dedup. Preserve citation / retraction signals.
- Log search outcomes via `searchObservedService`, `searchLearningService`, `searchLearningOutcomeService`.
- Eval: `npm run eval:search-quality`. Do not ship rank changes blind.

## Synopsis
- Core: `paperSynopsisCore.js`, `paperSynopsisTrust.js`, `synthesisGenerationCore.js`.
- UI: `ArticleCardSynopsisPanel`, `TopicBriefConsensusSynopsis`, `SynopsisTrustBanner`.
- Synopsis must show trust / provenance. Never hide uncertainty.
- Consensus ≠ single paper. Keep claim provenance paths intact.
- Prefer grounded excerpts over fluent hallucination.

## Learning agents + RL
- Core: `learningAgentService.js`, `learningSignalService.js`, `learningLoopSignalService.js`, `rewardAttributionService.js`, `personalizationBanditService.js`.
- Offline / safety: `offlinePolicyEvalService.js`, `policyReplayEvaluator.js`, `learningQualityEvalService.js`.
- Routes: `server/controllers/learning/activity/*`, API `src/services/api/learning.ts`.
- Each interaction (search click, save, quiz, agent reply, dwell) → reward attribution.
- Bandit / policy updates only behind eval gates. No silent policy drift.
- Search → learning outcome closed loop required. Broken attribution = bug.

## Do not
- Invent medical facts.
- Break citation / retraction / trust banners.
- Add card-heavy UI chrome on search hero surfaces unless interaction needs container.
- Skip tests for ranking, synopsis trust, or reward attribution changes.
- Expand scope outside search / synopsis / RL without explicit ask.

## Quality gates (when touching these areas)
```
npm run lint
npm run typecheck:all
npm test
npm run eval:search-quality
```

## Tone
Caveman. No filler. Diffs + facts.
Focus: search quality, synopsis trust, RL from each user action.
