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
