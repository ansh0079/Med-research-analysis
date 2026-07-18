# Flagship Topic Program

The flagship program is the curated path from "large topic list" to "excellent clinical learning product".

## What Flagship Means

A flagship topic should have:

- at least 3 source articles
- at least 1 current guideline
- at least 8 teaching claims
- at least 3 teaching objects
- at least 1 MCQ object
- at least 2 labelled search eval queries
- landmark PMIDs and unacceptable off-topic examples
- synopsis/case QA before public promotion

## Current Workflow

1. Edit `server/config/flagshipTopics.json`.
2. Run `npm run audit:flagship-topics`.
3. Use Admin Observability -> Topic readiness to filter weakest/high-priority topics.
4. Seed or refresh topics from the readiness table.
5. Add or tighten search eval fixtures for each flagship topic.
6. Re-run readiness and search quality evals.

## Real DB Restore

The local DB currently has empty readiness-critical tables. To restore a real enriched corpus, place the dump in a known path and restore it into `database/app.db` or point `FLAGSHIP_DB` at it for audits:

```powershell
$env:FLAGSHIP_DB='C:\path\to\enriched-topics.db'
npm run audit:flagship-topics
node scripts/audit-topic-dataset.mjs
```

For production-like Postgres, restore with the normal database tooling, then run:

```powershell
npm run db:migrate:postgres
npm run audit:flagship-topics
npm run eval:search-quality:gold
```

## First Cohort

The initial cohort intentionally starts with 12 high-impact topics across cardiology, critical care, respiratory, endocrine, renal, neurology, emergency medicine, haematology, and infectious disease. Grow this to 30, then 50, only after the first 12 are passing readiness and eval gates.
