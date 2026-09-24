# Held-out search evaluation cases

The release gate loads **only** this directory (`server/services/evalDatasetPolicy.js`).
Anything used to tune ranking lives in `tests/fixtures/` with `"split": "tuning"` and is
refused by the gate.

A held-out fixture is a `.json` file shaped like `search-quality-gold.json` plus:

```json
{
  "version": 1,
  "split": "heldout",
  "queries": [
    {
      "query": "…",
      "relevantUids": ["…"],
      "offTopicUids": ["…"],
      "provenance": {
        "labelledBy": "reviewer name or id",
        "labelledAt": "YYYY-MM-DD",
        "source": "where the relevance judgement came from",
        "intendedSense": "the clinical meaning the query intends"
      }
    }
  ]
}
```

Rules enforced in code: every case needs all four provenance fields; a query that also
appears in a tuning fixture is rejected (leakage); a fixture that does not declare
`"split": "heldout"` is rejected. Labels must come from someone who did not tune the ranker.

Stratify by ambiguity, evidence lane, old terminology, population qualifiers and sparse
metadata. Target 100–200 labelled query/article pairs spanning on-topic, adjacent and
off-topic. Run `npm run eval:datasets` to see current counts.

## Labeling worksheet (`scenarios/`)

`scenarios/worksheet.json` is the reviewer labeling target list: 42 seed scenarios covering
the full 6-intent × 7-dimension grid (intent = treatment, diagnosis, prognosis, prevention,
adverse-effects, evidence-summary; dimension = abbreviation-ambiguity, population-restriction,
rare-condition, conflicting-guidelines, absent-evidence, outdated-edition,
misleading-near-match). The gate's `listJson` only reads top-level `.json` files, so this
subdirectory is safe from release-gate ingestion.

Each scenario carries `query`, `intendedSense`, `watchFor[]`, `guidance` and `expectedLane`
to steer reviewer labeling. Each scenario should collect 3–5 judged candidates spanning
on-topic, adjacent and off-topic.

Judgment schema (per candidate, two labelers per scenario):

```json
{
  "judgments": [
    {
      "candidateUid": "…",
      "labelledBy": "reviewer id",
      "labelledAt": "YYYY-MM-DD",
      "relevance": "on-topic | adjacent | off-topic",
      "applicability": "optional note",
      "evidenceType": "optional",
      "support": "optional"
    }
  ]
}
```

When the two labelers disagree on a candidate, an adjudication block is required:

```json
{
  "adjudication": {
    "adjudicatedBy": "senior reviewer id",
    "adjudicatedAt": "YYYY-MM-DD",
    "resolutions": [{ "candidateUid": "…", "finalRelevance": "…", "note": "…" }]
  }
}
```

Validation lives in `server/services/heldoutWorksheet.js` (`validateJudgments`,
`checkAggregateDiversity`). Run `npm run eval:worksheet` for the coverage report.

## Graduating labeled cases into the gate

Once a scenario's candidates are labeled, promote them to a **new top-level** `.json` file
here shaped as above, with `split: "heldout"` and full provenance. Before committing,
run the fixture through `heldoutWorksheet.validateGraduatedFixture` (structural checks)
and `checkAggregateDiversity` (family/intent stratification across the whole graduated
set). The release gate then applies its existing leakage and provenance rules on top.

## Running the evaluation and the promotion gate

```bash
npm run eval:datasets            # counts, worksheet progress, labeler agreement, status
npm run eval:heldout             # metrics with intervals; writes eval-results/heldout-<ts>.json
npm run eval:heldout -- --gate   # exit 1 unless the evaluation PASSED
```

A graduated case must carry its **frozen `candidates`** (uid, title, abstract, pubtype, year, ...)
as well as `judgments` and `scenarioId`. The evaluation ranks those candidates through the real
eligibility, bouquet and lane path with no provider call, so a metric cannot move because a
provider was throttled. A scenario with no on-topic candidate is counted as **missing evidence**
and reported separately; it is never scored as a ranking failure.

Status is one of `no_labels`, `invalid`, `insufficient_labels`, `thresholds_not_agreed`,
`failed`, `passed`. **Only `passed` permits a bandit promotion** (`HELDOUT_GATE_MODE=advisory`
is an explicit, visible opt-out). Missing labels are never a pass.

### Thresholds are set before candidates are evaluated

`config/thresholds.json` (deliberately outside the directory the gate loads labels from) holds
the pass bar. It must name who agreed it and when; its hash is recorded in every report, so an
edit made after seeing results is visible.

```json
{
  "agreedBy": "reviewer or committee",
  "agreedAt": "YYYY-MM-DD",
  "rationale": "why these bars",
  "minCases": 100,
  "useConfidenceBound": true,
  "metrics": {
    "ndcg10": { "min": 0.0 },
    "mrr": { "min": 0.0 },
    "recall10": { "min": 0.0 },
    "contaminationRate": { "max": 0.0 },
    "falseRejectionRate": { "max": 0.0 }
  }
}
```

The numbers above are placeholders for the format only: they must come from the people who
own the clinical risk, not from the engineer running the evaluation. With
`useConfidenceBound` (the default) the safe end of each interval must clear its bar, so a small
lucky sample cannot pass.

Every report includes the baseline commit, dataset versions and hashes, provider configuration
(`frozen_candidates`, none called), flags, and the metric-definitions version.
