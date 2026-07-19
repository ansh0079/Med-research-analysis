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

Nightly Postgres dumps are pulled by the Windows task **MedSearchBackupPull** (10:00, `StartWhenAvailable`) into:

`C:\Users\ansh0\OneDrive\medsearch-backups\`

(e.g. `medsearch-YYYYMMDD-030001.dump`). Same artifact also lives on the prod server under `/var/backups/medsearch/`.

These are **Postgres custom-format** dumps (`pg_dump`), not SQLite — do not point `FLAGSHIP_DB` at them.

### Scratch restore on the prod host (recommended)

Uses the dump already on the server; never writes to the live `medsearch` DB:

```bash
# on server
bash /tmp/restore-scratch-on-server.sh /var/backups/medsearch/medsearch-YYYYMMDD-030001.dump medsearch_restore
bash /opt/medsearch/scripts/run-flagship-ops-on-restore.sh --dry-run
# when ready:
bash /opt/medsearch/scripts/run-flagship-ops-on-restore.sh --apply
```

Scripts live in repo `scripts/restore-scratch-on-server.sh` and `scripts/run-flagship-ops-on-restore.sh`.

Verified restore (2026-07-18 dump): curriculum_topics=1139, topic_knowledge=273, topic_guidelines=5304, teaching_objects=6999, teaching_object_claims=20872.

## Cohort size

`server/config/flagshipTopics.json` currently lists **466** curated topics (priorities: high / medium), including expanded **Cardiology**, **Critical Care**, **Endocrinology**, **Gastroenterology**, **Haematology**, **Infectious Diseases**, **Nephrology**, **Neurology**, **Rheumatology**, **Respiratory**, **Psychiatry**, **Oncology**, and **Immunology** blocks. Infectious Diseases currently has **50** flagship topics. Readiness and ops scripts should target this list — do not mass-merge or backfill the full ~1,385 curriculum catalog.

## Synopsis enrichment path

After landmark `source_articles` exist, deepen mentor knowledge and teaching objects:

```powershell
# Pin missing landmark PMIDs into topic_knowledge.source_articles
npm run sync:flagship-sources -- --dry-run
npm run sync:flagship-sources

# Extract claims from landmarks + guideline/MCQ enrichment (AI; use --limit for batches)
npm run enrich:flagship-knowledge -- --dry-run --limit=5
npm run enrich:flagship-knowledge -- --priority=high --limit=10

# PDF bouquet for synopsis grounding (high priority first)
npm run backfill:pdf-flagship:high

# Tier breakdown (SRC / guidelines / claims / TOs / MCQs)
npm run audit:flagship-readiness
npm run audit:flagship-topics
```

Curriculum seed now merges flagship landmark PMIDs into `source_articles` and upserts stub `topic_knowledge` (`seededFrom: curriculumSeedService`). The mentor UI badges landmark stubs as “not yet enriched” until AI/human refresh.

## Knowledge flywheel (claims auto-heal)

Two paths keep flagship topics from sitting forever at `claimCount === 0` after seed:

1. **Nightly cron** (`flagship-enrich` in `schedulerRegistry`, default `FLAGSHIP_ENRICH_CRON=0 4 * * *`): scans `flagshipTopics.json`, enqueues `flagship_enrich` for topics with zero `teaching_object_claims` (batch size `FLAGSHIP_ENRICH_BATCH_LIMIT`, default 25). Disable with `FLAGSHIP_ENRICH_CRON_DISABLED=true`.
2. **Search path**: `GET /api/search` matches flagship topics (and general topics with ≥3 PMID hits) and calls `getOrEnqueueFlagshipEnrich` when `claimCount < 8`. Completed-but-empty jobs are reset and retried.

Prefer these over manual `npm run enrich:flagship-knowledge -- --force` except for ops backfills.

## Learning loop (search ↔ quiz)

Missed quiz items write `quiz_miss_for_search` learning events and already boost those papers on the next search. Quiz complete UI links each missed paper into personalized search (`/search?q=…&focusPmid=…`). Ranking cards show the adaptation reason when personalization moves a result.

## First Cohort (historical)

The program started with 12 high-impact topics, then grew through 30 → 50 → 75 → 100 → 125 → 150 → 175 → 200 → 225 → 272 → 297 → 322 → 352 → 452 → **466** (including Respiratory, Psychiatry, Oncology, and Immunology expansion cohorts plus earlier Cardiology/Critical Care and other specialty blocks). Current block sizes include Cardiology **64**, Infectious Diseases **50**, Endocrinology **28**, Respiratory **30**, Psychiatry **28**, Oncology **39**, and Immunology **25**. Keep promoting only topics that pass readiness + search-eval gates.
