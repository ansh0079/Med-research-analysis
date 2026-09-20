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
