# Pending curated MCQs (not imported)

`batch-09.json` holds 168 owner-supplied MCQs (55 topics) whose evidence citation could not be resolved to a real source
(vague strings such as "NICE Guideline 1", journal name only, "Paper 1", "General medical knowledge").
Each sourceRef carries the citation text as supplied with `status: "unresolved_citation"`.

The import workflow only reads `data/curated-topic-mcqs/batch-*.json`, so nothing here is loaded.
To load these, move `batch-09.json` into `data/curated-topic-mcqs/` after review.
