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
| Curate | `/knowledge` | staff | Topic knowledge review queue |
| Curate | `/guidelines` | staff | Guideline extraction review/approve queue (edit, mark-reviewed, mark-stale) |
| Topic | `/topic/:slug` | — | Deep-link topic page (from search) |
| Browse | `/guideline-library` | — | Read-only searchable guideline browser (general users) |

Canonical config: `src/config/learningSurfaces.ts` — use for nav grouping.

`/knowledge` and `/guidelines` looked like general-user routes (`ProtectedRoute`)
while every backend endpoint they call requires `admin`/`curator`
(`server/routes/search/topicKnowledge.js`, `server/routes/guidelines.js`).
A signed-in non-staff user could reach both pages and see edit/approve buttons
that silently 403'd. Both are now `RoleRoute allowedRoles={['admin','curator']}`
and moved out of `WORKSPACE_TOOLS`/`ACCOUNT_NAV` into `STAFF_TOOLS`
(`src/components/layout/TopNav.tsx`), alongside Quality review and Admin
observability. `/guideline-library` — the read-only browse view — took the
general-nav slot `/guidelines` used to occupy, since that is the one a normal
user can actually act on.

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
