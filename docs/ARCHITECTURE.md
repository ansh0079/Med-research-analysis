# SignalMD Architecture

## Current shape (monolith, modular)

The production app is a **modular monolith**: one Node process, clear service boundaries in `server/services/`, Postgres/SQLite + optional pgvector.

| Target microservice | Current module(s) | Notes |
|---------------------|-------------------|-------|
| **search-service** | `unifiedEvidenceSearch.js`, `searchPipeline.js`, `articleReranker.js`, `evidenceBouquetService.js` | PubMed + RRF + PICO rerank |
| **ai-service** | `aiService.js`, `synthesisGenerationCore.js`, `conflictExtractionService.js`, `mcqGeneratorService.js` | LLM prompts + validation |
| **user-service** | `learningRoutes.js`, `learnerContextService.js`, `user_topic_memory` tables | Profiles, CPD, case attempts |
| **recommendation-service** | `recommendationService.js`, `vectorSearchService.js`, `searchLearningService.js` | Semantic + personalization blend |

Full process split is **Phase 6+** (see ROADMAP). Extract only when deploy/scale needs justify the ops cost.

## Event-driven learning (in-process)

```js
const { emit } = require('./server/lib/eventBus');
emit('user.interaction', { type: 'paper_view', userId, paperId, duration, sectionsRead });
```

- **Bus:** `server/lib/eventBus.js` (Node EventEmitter)
- **Tracker:** `server/services/userInteractionService.js` → `user_interactions`, `learning_events`, `analytics`
- **Boot:** handlers registered in `server.js` after DB connect

Future: Redis Streams or BullMQ fan-out when workers need isolated consumers.

## Vector / semantic search

Already integrated:

```js
const { personalizedSemanticSearch } = require('./server/services/recommendationService');
await personalizedSemanticSearch({ db, serverConfig, query, userProfileText });
```

- Embeddings: 384-dim, `articles_cache` pgvector table
- Unified search fuses vector hits with PubMed RRF (`GET /api/search`)
- Opt-out: `vector=0`

## State management (frontend)

`SearchContext` is already split into Query / Selection / Meta contexts. **Do not** add Zustand in parallel without a migration plan.

**Week-1 recommendation:** keep React Context; migrate only cross-page workflow state (e.g. shift workflow) to Zustand in a later sprint.

## Error handling

- **Server:** `server/errors/appErrors.js` — `AppError` with `code`, `recovery`, `status`
- **Client:** `src/utils/appErrors.ts` — `AppError`, `parseApiErrorBody`, `getRecoveryHint`
- **Express:** `app.js` global handler serializes `AppError.toJSON()`

## Testing

~50 unit test files under `tests/unit/` plus integration, e2e, and load tests. Priority additions:

- New infrastructure: `eventBus`, `userInteractionService`, `appErrors`, `recommendationService`
- API contracts for impression + quality-metrics routes

Run: `npm test`, `npm run eval:search-quality`, `npm run eval:quality-metrics`

## Archive / stale code cleanup

- No `archive/` folder in the repo root.
- **`.claude/worktrees/`** — local agent clones; gitignored. Safe to delete manually or run `node scripts/cleanup-stale-worktrees.mjs`.
- Legacy UI bundles were removed in Phase 4 (see `docs/PHASE4_REMOVAL_PLAN.md` in worktree copies).

## Immediate fixes (1-week checklist)

| Item | Status |
|------|--------|
| Archive cleanup | `.claude/worktrees/` gitignored + cleanup script |
| Unified state | Deferred by design — Context-first; Zustand later |
| Typed errors + recovery | `AppError` server + client |
| Event bus for interactions | `eventBus` + `userInteractionService` |
| Vector search facade | `recommendationService.personalizedSemanticSearch` |
| Tests for new modules | `tests/unit/eventBus.test.js`, etc. |
| Learning-signal observability | `collectLearningSignalStats` in production readiness |
| Module import boundaries | `npm run check:service-boundaries` |
