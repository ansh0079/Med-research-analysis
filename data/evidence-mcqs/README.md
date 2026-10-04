# Evidence-linked MCQs (owner upload, 4 Oct 2026)

Source: 455 owner MCQs with topic + citation. Review spreadsheet: Evidence_MCQs_Review.xlsx (shared separately).

- `data/curated-topic-mcqs/batch-08.json`: 245 MCQs, 78 curriculum topics, citation resolved (146 questions) or inferred (99) to PubMed / official guideline pages. Loaded by the existing manual "Import Curated Topic MCQs" workflow.
- `literature-additions.json`: 84 resolved sources (63 topics) not found in the public guideline/document export, in the `data/curated-literature-corpus.json` topic/documents format used by `scripts/ingest-curated-literature.js`. Not wired in: merge into the corpus file and run `npm run ingest:curated-literature` on the server if wanted.

Answer letters were re-shuffled (deterministically) where safe because the source keys were 95% A-C; `originalCorrectAnswer` keeps the supplied letter.
423 of the questions have 4 options, so the importer validator now accepts 4 or 5 options.
