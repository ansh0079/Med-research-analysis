# Surface map — learning routes & backend services

## Frontend learning surfaces (9 routes → 4 groups)

| Group | Route | Primary? | Purpose |
|-------|-------|----------|---------|
| Learn | `/learning` | yes | Hub: mastery, study runs, CPD, due reviews |
| Learn | `/learning/:id` | — | Active study run session |
| Learn | `/study-paths` | — | Curriculum paths |
| Practice | `/quiz` | yes | Topic/paper MCQ generation |
| Practice | `/practice` | — | Spaced-rep practice pool |
| Clinical | `/cases` | yes | Adaptive multi-turn cases |
| Clinical | `/case` | — | Single-case analysis brief |
| Curate | `/knowledge` | staff | Claim/guideline review queue |
| Topic | `/topic/:slug` | — | Deep-link topic page (from search) |

Canonical config: `src/config/learningSurfaces.ts` — use for nav grouping.

## Backend service pairs (complementary, not duplicates)

| Orchestrator | Worker / helper | Role |
|--------------|-----------------|------|
| `quizGenerationService.js` | `mcqGeneratorService.js` | Route-level quiz orchestration vs cold-start MCQ storage + diversity |
| `caseToEvidenceService.js` | `caseEvidenceService.js` | Clinical Q → evidence brief vs article gathering for cases |
| `consensusSynopsisService.js` | `paperSynopsisCore.js` | Multi-paper vs single-paper synopsis |
| `topicInferenceService.js` | `relatedTopicService.js` | Canonical topic from article vs cross-topic similarity |

## Topic inference

Use `POST /api/topics/infer` with `{ article, searchTopic? }` instead of client-side title token hacks.

Resolution order: search context → teaching object topic → synapse topics → keywords → curated keyword map → title fallback.

Canonical normalization: `server/utils/topicSynonyms.js` (`resolveCanonicalNormalized`).
