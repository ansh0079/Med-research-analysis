# Topic Dataset Audit

Generated from local workspace sources on 2026-07-18.

## Scope

This audit covers topic-related data available in this checkout:

- `server/scripts/topics.json`
- `server/data/coreClinicalTopics.json`
- `server/scripts/topic-prerequisites.json`
- `server/config/clinicalQueryAliasSeeds.json`
- Local SQLite files: `.codex-dev.db`, `.codex-dev-fresh.db`, `database/app.db`

It does not include production Postgres data unless that data is exported into this workspace.

## Local Findings

| Source | Rows | Unique normalized | Role |
| --- | ---: | ---: | --- |
| `server/scripts/topics.json` | 267 | 266 | Legacy topic strings |
| `server/data/coreClinicalTopics.json` | 103 | 103 | Structured core clinical curriculum topics |
| `server/scripts/topic-prerequisites.json` | 138 | 138 | Learning prerequisite graph entries |
| `server/config/clinicalQueryAliasSeeds.json` | 25 | 25 | Search alias / landmark trial pins |
| **Combined static corpus** | **533** | **376** | Static topic/search concepts |

All local SQLite DBs currently show:

| Table | Local count |
| --- | ---: |
| `curriculum_topics` | 0 |
| `topic_knowledge` | 0 |
| `topic_guidelines` | 0 |
| `teaching_objects` | 0 |
| `searches` | 0 |

`COMMERCIAL_READINESS.md` records a production restore drill with `topic_knowledge=273`, `searches=182`, and `users=1`, so production has had richer data than the local DBs in this workspace. That data is not locally available for detailed row-level audit.

## Corpus Shape

The structured `coreClinicalTopics.json` is the highest-quality source:

- 103 topics across 15 blocks.
- 51 high priority, 51 medium priority, 1 low priority.
- 37 high-volatility, 64 moderate-volatility, 2 stable.
- It has `displayName`, `suggestedQuery`, `priority`, and `volatility`.

The broader static corpus has reasonable coverage across:

- Cardiovascular
- Respiratory
- Gastrointestinal / hepatology
- Renal / urology
- Endocrine / metabolic
- Neurology
- Rheumatology / musculoskeletal
- Infectious diseases / sepsis
- Haematology / oncology
- Psychiatry / mental health
- Dermatology
- Obstetrics / gynaecology
- Paediatrics
- Emergency / acute care
- Anaesthesia / critical care

The audit flagged 98 combined static rows as unclassified by simple keyword heuristics. This does not mean they are bad topics; it means the corpus would benefit from explicit specialty/block metadata everywhere, not only in the structured core file.

## Quality Issues

1. **Local DB is not seeded.**
   The app code supports curriculum topics, topic knowledge, guidelines, teaching objects, claims, quizzes, and learning events, but none are present in the local SQLite DBs.

2. **Static sources overlap heavily.**
   Combined static rows collapse from 533 to 376 normalized concepts. Many overlaps are expected, but they should be represented as aliases/prerequisites under canonical topics rather than independent rows.

3. **Topic metadata is uneven.**
   `coreClinicalTopics.json` has good metadata. `topics.json` and `topic-prerequisites.json` mostly do not include block, priority, volatility, suggested query, evidence requirements, or readiness state.

4. **Some topics are too broad for learning without subclaims.**
   Examples flagged by heuristics include `hypertension`, `COPD management`, `obesity management`, `thyroid disease`, `lung cancer`, and `anticoagulation management`.

5. **Some structured topics may be too compound for precise search/eval.**
   Examples include `Ischaemic heart disease and acute coronary syndromes`, `Dyspepsia, H. pylori, and peptic ulcer disease`, and `Shortness of breath and acute respiratory failure`.

6. **Landmark alias coverage is promising but small.**
   `clinicalQueryAliasSeeds.json` contains 25 high-value alias/PMID pin groups. This is useful for search quality, but it should be expanded from labelled eval misses and production low-recall searches.

## Recommended Next Steps

1. **Export production topic tables for a real full audit.**
   Export `curriculum_topics`, `topic_knowledge`, `topic_guidelines`, `teaching_objects`, `teaching_object_claims`, `quiz_attempts`, `searches`, and feedback tables into a local audit DB or CSVs.

2. **Promote one canonical topic registry.**
   Use `coreClinicalTopics.json` or `curriculum_topics` as the canonical layer. Treat legacy topic strings, prerequisites, and alias seeds as supporting metadata.

3. **Add readiness scoring per topic.**
   Score each topic for:
   - structured metadata
   - suggested query
   - guideline anchors
   - landmark papers
   - systematic reviews / RCT coverage
   - teaching object presence
   - claim count
   - MCQ/case coverage
   - freshness / volatility
   - search eval coverage

4. **Tier topics operationally.**
   - Tier 1: demo/commercial flagship topics
   - Tier 2: learner-ready topics
   - Tier 3: searchable but needs enrichment
   - Tier 4: duplicate, too broad, too narrow, or needs retirement

5. **Expand alias seeds from evidence.**
   Mine search-quality eval misses, low-recall searches, and saved landmark papers to grow `clinicalQueryAliasSeeds.json`.

6. **Seed local dev from the production-like corpus.**
   A local DB with zero topic rows makes it hard to test learning/RL behavior. Add a safe fixture seed with 20-50 representative topics, guidelines, claims, MCQs, and interactions.

## Repro

Run:

```bash
node scripts/audit-topic-dataset.mjs
```

The script writes a detailed JSON report into `eval-results/topic-dataset-audit-*.json`.

## App Readiness Endpoint

The app now exposes a canonical readiness report for admins/curators:

```http
GET /api/admin/topics/readiness?limit=200&offset=0
```

The endpoint reports:

- canonical topic count
- curriculum topic count
- topic-knowledge-only count
- tier counts
- block counts
- seed-status counts
- per-topic counts for source articles, guidelines, teaching objects, MCQs, and claims
- missing readiness signals per topic

Readiness tiers:

- `flagship`: topic knowledge, guideline anchor, enough claims, teaching objects, MCQs, and source articles.
- `learner_ready`: topic knowledge plus enough claims and at least MCQs or teaching objects.
- `search_ready`: at least topic knowledge, source articles, or guideline support.
- `needs_enrichment`: not enough supporting data yet.
