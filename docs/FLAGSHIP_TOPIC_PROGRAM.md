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

## Closing the curriculum ↔ knowledge gap

Curriculum seeding historically wrote guidelines / teaching objects / claims but **not** `topic_knowledge.source_articles`. Hand-seeded topics (ARDS, stroke) have both — and that is what flips a topic to flagship tier.

Run against a restored enriched DB (not the empty local SQLite), in order:

```powershell
# 0) optional: unify topic_knowledge.canonical_normalized
npm run db:backfill-canonical

# 1) merge near-duplicate curriculum rows for the first 5 high-priority flagships (dry-run first)
npm run db:merge-flagship-clusters -- --dry-run --priority=high --limit=5
npm run db:merge-flagship-clusters -- --priority=high --limit=5

# 2) also merge duplicate topic_knowledge rows that share a canonical key
npm run db:merge-topic-dupes -- --dry-run
npm run db:merge-topic-dupes

# 3) backfill landmark source_articles + topic_knowledge stubs for flagships missing them
npm run backfill:flagship-knowledge -- --dry-run --priority=high --limit=5
npm run backfill:flagship-knowledge -- --priority=high

# 4) confirm readiness, then search landmarks
npm run audit:flagship-topics
npm run eval:search-quality:gold
```

Going forward, `curriculumSeedService` upserts `topic_knowledge` from the evidence articles it already fetched, so new seeds should not recreate the gap.

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
