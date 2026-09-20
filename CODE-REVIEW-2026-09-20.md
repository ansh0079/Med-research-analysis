# Signal MD: Post-Change Code Review

Reviewed local commit: `5a9300d` (20 September 2026).
Scope: changes since `ad9d81d`, search-to-generation evidence flow, source invalidation, synopsis support, ranking evaluation and local checks. This is a review, not an implementation or production verification report.

## Findings

### 1. P1: Linked snapshots still admit text outside the stored source

Location: `server/services/search/generationEvidenceContext.js:58`.

`applySourceVersion` spreads the requested article, only replaces title/abstract, and falls back to the client's abstract when the snapshot has none. Client full-text fields survive. A targeted reproduction using a metadata-only stored source returned `lineage.status = linked` while preserving both a client-only abstract and `_fullTextSections` absent from the snapshot.

Impact: linked lineage does not guarantee that generated assertions used the stored evidence version.

Fix: reconstruct all evidence-bearing fields from the stored version, including explicit empty values. Clear untrusted aliases and full-text flags. Resolve and record newly introduced evidence through a trusted server retrieval path before using it. Test metadata-only snapshots and all accepted full-text field shapes.

### 2. P1: Full-text snapshot format does not match the actual synopsis input

Locations: `server/services/search/searchEvidenceSnapshot.js:60`, `server/prompts/synopsis.js:230`, `server/services/ai/paperSynopsisCore.js:542`.

The snapshot builder recognizes `sections`, `fullText` and `full_text`, while synopsis prompts consume `_fullTextSections` with `_fullTextIndexed`. A reproduction with populated `_fullTextSections` produced `abstract_only` and stored only title/abstract passages. Claim support builds versions using the same incomplete adapter. Full-text enrichment also occurs after initial snapshot resolution.

Impact: the model can use full-text evidence that its replay and support checks do not contain.

Fix: normalize evidence once into a shared representation. Persist the actual post-enrichment source version used in generation and link claim passage IDs to that version. Report passage truncation explicitly.

### 3. P1: Withholding leaves unsupported clauses in the response

Location: `server/services/synopsisClaimSupport.js:374`.

The serving filter removes a sentence only when every clause is flagged. Reproduced with a two-clause sentence: the second clause was marked unsupported, but `mode=withhold` returned the entire sentence unchanged and an empty withheld list. Array-valued material fields are also skipped by the string-only serving branch even though extraction accepts arrays.

Fix: remove unsupported clauses safely, or conservatively withhold the containing sentence. Apply consistent handling to string and array fields. Add mixed-supported/unsupported clause and array regressions.

### 4. P1: Retraction does not cover every synopsis reuse path

Locations: `server/services/registry/registryInvalidation.js:185`, `server/services/ai/paperSynopsisCore.js:312`, `server/services/ai/paperSynopsisCore.js:97`.

Retraction deletes rows in `analysis_cache`, but synopsis generation reads separate cache entries with seven-day expiry and returns them before checking stored withdrawal state. In addition, non-default style reuse reads `getTeachingObjectByKey`; that accessor returns withdrawn records and the reuse function does not reject their review state.

Impact: withdrawing the database teaching object does not reliably stop a previously cached or style-specific synopsis from being reused.

Fix: check source withdrawal before cache/store reuse; invalidate synopsis cache variants or use a source-status/version token in cache validation. Keep historical retrieval separate from current serving. Test both default and non-default style paths with warm caches.

### 5. P1: Supersession leaves already-revised claims verified

Location: `server/services/registry/registryInvalidation.js:236`.

Supersession skips claims whose review state is already `needs_revision`. Correction intentionally retains verification while setting that state. A SQLite reproduction starting with `needs_revision` plus `source_verified` returned `ok=true`, zero changed claims and the same verified status after supersession.

Fix: update verification independently of whether the review state already equals the target. Preserve terminal withdrawal, but apply stronger source-change semantics to existing revision states. Test correction followed by supersession.

### 6. P2: Retraction backfill stalls after its first batch

Location: `server/services/registry/sourceInvalidationQueue.js:171`.

Every tick selects the same first 500 retracted articles without excluding already-enqueued records or advancing a cursor. Reproduced with 501 rows: first pass created 500 events; second pass created zero; total stayed 500.

Fix: select unqueued sources using a stable identity, or paginate with a durable cursor. Test multiple batches and retries. The scheduler also suppresses enqueue errors; surface those failures through its heartbeat.

### 7. P1: Quiz hydration can replace the supposedly immutable evidence

Locations: `server/services/learning/quizGenerationService.js:626` and `server/services/learning/quizGenerationService.js:74`.

The evidence-based quiz path resolves snapshot sources, then hydrates those articles from the current article/PDF caches. The merge spreads current trusted content over the resolved article. Additional guidelines and teaching-object context are also supplied to the prompt without being included in this snapshot resolution step.

Impact: a quiz can retain the earlier snapshot identifier while using newer or additional evidence. The recorded lineage cannot fully replay its generation input.

Fix: preserve snapshot text through hydration, checking current retraction status separately. If newer content or extra guidelines are deliberately used, persist their exact versions and link them to the generated item before generation. Test an old snapshot against a changed cached abstract and PDF.

## Improvements Confirmed in the Code

- Search snapshots are now awaited, owner-scoped and returned to callers.
- Source versions, generation lineage and quiz-attempt linkage have been added.
- Invalidation has a durable queue, explicit write failures and withdrawal filters on several serving queries.
- Synopsis checking now splits claims and records support states rather than relying solely on aggregate overlap.
- Lane v2 introduces explicit features and a shadow mode.
- Independent-label requirements are enforced by the promotion infrastructure.

These improvements are substantive, but the findings above show why passing regression tests does not establish complete end-to-end correctness.

## Verification

- Frozen search regression evaluation: 20 suites, 277 tests passed.
- TypeScript check: passed.
- Shared SQL-dialect check: passed; this is not PostgreSQL execution.
- Dataset check: 42 worksheet scenarios, zero labelled held-out cases; status `no_labels`.
- Repository-wide lint: failed on an existing untracked `architecture-diagram/server.js:22` prefer-const error.
- Targeted reproductions: snapshot text mismatch, missing full-text passages, unsupported-clause withholding, reuse of a withdrawn style-specific synopsis, supersession state ordering, and 501-row backfill starvation.
- Full test suite: 313 suites passed, 1 skipped; 2,810 tests passed, 9 skipped. Completed successfully in 623 seconds across backend and frontend projects.

## Limits and Next Steps

No application fixes, deployment or production database mutations were performed. Authenticated browser flows, real-provider output, PostgreSQL migrations, production performance and clinical accuracy remain unverified in this review. No claim is made that every app feature has been exhaustively tested.

Fix the P1 findings with targeted integration tests, rerun the relevant regressions, then verify PostgreSQL and authenticated flows. Obtain independent clinical labels before claiming improved ranking, calibrated semantic support or adaptive-learning benefit.

---

## Resolution pass (commit `036cdc2`)

Re-reviewed at `5a9300d` plus the working-tree fixes, then completed. Status of the seven findings:

| # | Finding | Status |
| --- | --- | --- |
| 1 | Linked snapshots admitted text outside the stored source | Fixed. `applySourceVersion` rebuilds title, abstract, sections and full text from the stored version with explicit empty values, and deletes client full-text fields. Newly introduced evidence is resolved through the article cache before being recorded. |
| 2 | Snapshot format did not match the synopsis input | Fixed. `sectionEntries` reads both `sections` and the pipeline's `_fullTextSections`; the post-enrichment source version is persisted in `paperSynopsisCore` so claim passage ids resolve to the text generation actually used. Passage truncation is reported. |
| 3 | Withholding left unsupported clauses in the response | Fixed. A sentence is withheld when **any** clause is flagged, and array-valued fields are filtered too. Partial clause removal was rejected deliberately: splicing fragments can create new unsourced claims. |
| 4 | Retraction did not cover every synopsis reuse path | Fixed. `findReusableStoredSynopsis` rejects withdrawn records whatever key reached it; the Redis path checks the durable review state first and drops a warm entry for withdrawn content. |
| 5 | Supersession left already-revised claims verified | Fixed. Verification is cleared independently of the review state; only terminal withdrawal is excluded. |
| 6 | Retraction backfill stalled after its first batch | Fixed. The scan excludes sources that already have an event, and a backfill failure now surfaces through the scheduler heartbeat instead of being swallowed. |
| 7 | Quiz hydration replaced the supposedly immutable evidence | **Fixed in this pass.** Reproduced first: hydration kept `_snapshotVersionId` while serving a since-edited abstract. `preserveSnapshotEvidence` re-asserts the stored text and strips cache full-text fields; retraction status is still taken from current data. Guidelines fed to the prompt are now recorded on the snapshot. |

### Two further findings from this pass

1. **P2, fixed — snapshot writes were one round trip per article on the search path.** Making
   persistence awaited (the P0-2 fix) put ~20 sequential inserts in front of every response.
   Negligible on local SQLite, real latency against a networked Postgres. Now batched at 50 rows per
   statement: 120 versions go from 120 statements to 3.
2. **P3, accepted — `GET /api/teaching-claims/:claimKey/evidence` returns the generating snapshot id
   to any authenticated user.** Teaching claims are shared corpus content and the id is unusable by a
   non-owner (`getEvidenceSnapshot` enforces ownership), so this grants nothing. Noted, not changed.

### Still open, unchanged by this pass

- `evidence_source_versions` has no retention policy and grows without bound.
- Query redaction is capped at 5,000 rows per daily run; a larger backlog would never catch up.
- Web and worker both run the new schedulers. The queue's conditional claim makes this safe, but the
  work is done twice.

### Verification

- Full suite: 313 suites passed, 1 skipped; 2,822 tests passed, 9 skipped.
- Frozen ranking eval: 20 suites, 288 tests.
- `eslint server database tests/unit`, `tsc --noEmit`, `verify:sql-dialect`: clean.
- The SQLite-to-Postgres DDL converter accepts every statement in migrations 098, 100 and 101.
- **Postgres itself is still unproven.** `scripts/verify-pg-migrations.js` and its workflow exist but
  have never executed: the Docker daemon was unavailable locally. It runs in CI on the next push
  touching `database/**`, and that result is the gate to trust, not this static check.
- Authenticated browser flows, real-provider output, production performance and clinical accuracy
  remain unverified.
