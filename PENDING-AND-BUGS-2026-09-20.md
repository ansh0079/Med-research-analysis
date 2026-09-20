# Signal MD: pending work and known bugs

Updated 2026-09-20, after implementing the backlog in `# Signal MD Pending Code Changes.txt`
(baseline `ad9d81d`). Seven commits, `42d5015`..`60050e2`, committed locally on `main` and
**not deployed**.

Verified: full jest 2,810 passed / 9 skipped; frozen ranking eval 20 suites / 277 tests;
`tsc --noEmit`, `eslint server tests/unit` and `verify:sql-dialect` clean. All on SQLite.
**Nothing has run against Postgres or production.**

---

## 1. Blocked on a human (unchanged, and now what most gates wait on)

| Item | Why it is blocked | What is now waiting on it |
| --- | --- | --- |
| Clinician labels the 200-row claim-support sheet | Needs a clinician. | `server/config/judgeCalibration.json` does not exist, so the support judge can never say "supported". Entailment stays in shadow. |
| Held-out labelling (target 100–200 scenarios, 3–5 judged candidates each, two labelers + adjudication) | Labels must come from someone who did not tune the ranker. 42 scenarios are defined in `tests/fixtures/heldout/scenarios/worksheet.json`; **0 are labelled**. | Every bandit promotion (`HELDOUT_GATE_MODE=enforce` by default) and the v1→v2 lane ranking decision. |
| Agree the pass thresholds | `tests/fixtures/heldout/config/thresholds.json` must name who agreed them and when; its hash goes in every report. It does not exist. | The held-out evaluation reports `thresholds_not_agreed`, which is not a pass. |
| Verify registry candidates | `registryCurate.js propose` writes candidates; `verify` needs a named reviewer. | **0 verified entries** of the 25-condition cohort. |
| Smoke ACS, AKI, PE against prod after deploy | Search is behind the beta gate. | Closes Phase 0. |

Engineering can and did build the worksheets, tooling and evaluation. It cannot supply the labels.

## 2. Must check before deploying

1. **Postgres id type (possibly blocking).** Migrations 098/100/101 assume `topic_guidelines.id`
   and `teaching_objects` ids behave as the local schema does. Project memory records prod ids
   drifting to uuid. Check before applying:
   ```sql
   SELECT table_name, column_name, data_type FROM information_schema.columns
   WHERE column_name = 'id' AND table_name IN ('topic_guidelines','teaching_objects','quiz_attempts');
   ```
2. **Migrations 098, 100 and 101 are untested on Postgres.** They are portable by inspection
   (`ON CONFLICT DO NOTHING`, plain `ADD COLUMN`, which the runner treats as a skip when the column
   exists) but unproven. 101 alters `search_evidence_snapshots`, `teaching_objects`, `quiz_attempts`
   and `case_scenarios`.
3. **New schedulers start on boot**: `source-invalidation` (every 5 min) and
   `evidence-snapshot-retention` (daily). The first fails its cron heartbeat — visible on the admin
   page and in Sentry — when an invalidation event dead-letters or the oldest pending event is over
   15 minutes old. That is intended, but it is a new source of alerts.
4. **First invalidation tick will enqueue every already-cached retraction** (`article_cache`
   `is_retracted = 1`) and withdraw the artefacts derived from them. Check the size of that set
   first: `SELECT COUNT(*) FROM article_cache WHERE is_retracted = 1;`
5. **`policy_decisions` growth.** Accepts carrying review or shadow signals are always logged now.
   Still no retention job.
6. **Lane retrieval is still off by default** (`SEARCH_LANE_RETRIEVAL`); enabling it adds 3 PubMed
   calls per search and its production latency is unmeasured.
7. **Evidence snapshots are on by default** (`SEARCH_EVIDENCE_SNAPSHOTS`): one row plus up to 100
   content-addressed source-version rows per search. Source versions deduplicate across searches,
   but this is new write volume.

## 3. Flags, and what they default to

| Flag | Default | Effect when changed |
| --- | --- | --- |
| `EVIDENCE_LINEAGE_ENFORCEMENT` | `shadow` | `enforce`: content with unlinked/invalid lineage cannot carry a provenance-asserting label. |
| `SYNOPSIS_CLAIM_SUPPORT` | `shadow` | `enforce`: claim labels are capped by their support. |
| `SYNOPSIS_UNSUPPORTED_SERVING` | `annotate` | `withhold`: unsupported sentences are removed from the served synopsis and listed. |
| `SYNOPSIS_SUPPORT_JUDGE` | `off` | `on`: calls the model judge per claim (cost). Cannot say "supported" without calibration. |
| `POLICY_ITEM_CUE_MODE` | `review` | `block`: a longest-answer cue rejects the write again. |
| `MCQ_CUE_HANDLING` | `drop` | `flag`: cued questions are kept and marked for review at generation time. |
| `LANE_RANKING` | `v1` | `shadow`: record what v2 would do. `v2`: serve it. |
| `HELDOUT_GATE_MODE` | `enforce` | `advisory`: allows a promotion without held-out labels. |
| `POLICY_ENTAILMENT_MODE` | `shadow` | `block`: structural entailment findings reject the write. |

Everything that could change clinical labels or ordering ships in its recording-only mode.

## 4. Known bugs

### Pre-existing, not fixed

- **Bridge negative results are never persisted.** `upsertGuidelineRefiling` returns early when
  `canonicalNormalized` is empty, but the backfill uses an empty canonical as its below-threshold
  marker, so those rows are re-embedded every batch. Cost only.
- **Duplicate `upsertCurriculumSeedTopic`** in `m05a-curriculum-seed.js` and `m13-curriculum-seed.js`;
  m13 wins by compose order and is the only one with the policy call.
- **`semantic_rescue` needs only MeSH title corroboration**, not the plan's "independent lexical,
  metadata or curator" corroboration. It is capped at 2 results per search, not rate-measured.
- **A worker process does not exit gracefully** at the end of a full jest run. Traced to
  `@napi-rs/canvas` loading through `pdf-parse` in `server/pdf-extract-pooled.js`; it is a native
  handle in a dependency, present before this work, and does not affect results.

### Limits of what was built this session

- **Registry still ignores population and jurisdiction at serve time.** The lane scorer uses them for
  ordering; `resolveRegistryConcepts` still matches concept name only, and the proposer still writes
  `scope = unspecified`.
- **Claim support is deterministic only.** It can prove a claim is *wrong* (reversed direction,
  flipped negation, absent number, wrong population) but never that it is right: the best a
  deterministic pass returns is `unjudged`. "Supported" needs the calibrated judge, i.e. item 1.
- **The linguistic checks are regex-based** (direction, negation, hedging, population). They will
  miss constructions they do not encode; they are a floor, not a semantic parser. False-positive and
  false-negative rates are unmeasured — that needs labelled claims.
- **Population detection is three buckets** (pregnancy, paediatric, adult) in both the claim checker
  and the lane scorer. Comorbidity, renal function and age bands are not modelled.
- **`methodological_quality` is always missing**: nothing in the pipeline produces a risk-of-bias or
  certainty signal, so the lane scorer leaves the feature out rather than guessing.
- **Lane v2 is unmeasured.** `--compare-lanes` exists and reports `no_labels`.
- **Evidence snapshots cap at 100 items** and mark `truncated`; a larger result set is not fully
  replayable.
- **Retraction detection is unchanged** — PubMed/CrossRef, checked for bouquet articles only. What is
  new is that a confirmed retraction now reliably reaches generated content.
- **No correction producer.** `enqueue --type correction` is manual; nothing detects corrections.
- **Snapshot query text is redacted after 365 days**, source versions are kept forever. No retention
  policy for source versions.

## 5. Pending plan items (not built)

| Plan area | Item |
| --- | --- |
| P2 | Prove adaptive-learning benefit: attribution is now traceable (attempt → snapshot → content version), but reward density, offline policy evaluation, a delayed-retention measure and a controlled experiment are all still to do. Last measured: 2 rewards in 5,239 decisions. |
| Resolver | Versioned canonical concept resolver replacing the hard-coded ambiguity table; resolver metrics (sense accuracy, abstention precision). |
| Lanes | Parallel lane retrieval is behind a flag and unmeasured; shared candidate graph with a provider-call and P95 budget. |
| Registry | The 25-condition milestone itself; population/jurisdiction/scope at serve time. |
| Learning | Case decision-point evidence maps and scoring rubrics; mentor explanations with no uncited assertion. |
| Invalidation | A UI for the quarantine and reinstatement queues (both are CLI-only). |
| Backlog | 26,823 existing claims and ~6,400 cued MCQs predate all of this. The gate covers new writes; no backfill has run. |
| Ops | Bridge demolition per condition after each verified registry entry. |

## 6. Suggested order

1. Check the prod id type and the size of the cached-retraction set (section 2).
2. Deploy with every flag at its default (all recording-only), watch the two new cron heartbeats.
3. Get a clinician onto the two labelling jobs. They are the longest lead time and now block the
   promotion gate, the support judge and the lane ranking decision.
4. Agree and commit the held-out thresholds.
5. Run `registryCurate.js propose`, verify the first 5 conditions.
6. Once labels exist: `npm run eval:heldout` for a baseline, then `--compare-lanes` to decide v2,
   then consider `EVIDENCE_LINEAGE_ENFORCEMENT=enforce` and `SYNOPSIS_CLAIM_SUPPORT=enforce`.

## 7. Commits in this session

```
42d5015 fix: make source invalidation durable, honest about failure, and respected by serving
a790b40 feat: make evidence snapshots durable, replayable and owner-scoped
6978f47 feat: carry evidence lineage from search through synopsis, quiz, case and attempt
6fe40d2 feat: held-out evaluation on frozen candidates, and a promotion gate that needs labels
e580368 fix: judge MCQs on evidence and form, not answer length; close the raw-insert bypass
161a7a0 feat: check synopsis claims one by one against the passage they rest on
60050e2 feat: lane-specific ranking features, measurable against held-out labels
```

New operator commands: `npm run eval:heldout [-- --gate | --compare-lanes]`,
`npm run eval:datasets [-- --require-labels]`,
`node server/scripts/sourceInvalidation.js <stats|process|enqueue|failed|reinstate>`.
