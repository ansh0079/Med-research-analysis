# Evidence and performance improvements

## Production baseline: 13 September 2026

Read from production, before this release:

- 1,264 documents: 807 full-text JATS, 440 abstracts, 17 without text.
- 161 documents have a document synopsis. Separate teaching-object synopses are not counted here.
- 3,390 queued jobs, many dating from June to August; 108 failed jobs.
- Last seven days: 22 recorded searches, median 9,218 ms, p95 14,285 ms.
- Most recent 500 analytics events: median ranking 8,449 ms, fetching 91 ms.
  Legacy analytics include synthetic monitoring, so this is a diagnostic sample,
  not a controlled user-performance comparison.

## Changes

1. Imported sources require a topic match and text. Guideline attribution uses
   recognised issuing bodies; reviews mentioning guidelines are not guidelines.
   Existing unverified imported guideline labels are demoted when documents are served.
   Imports preserve knowledge confidence. Stored abstracts can upgrade to full text.
2. Search reporting includes stage percentiles, provider failures/timeouts and
   attributed first-attempt learning outcomes. Cached requests do not reuse old
   stage durations in analytics. Synthetic searches no longer write search analytics.
   The existing LLM cost dashboard remains the source of spend information.
3. Exact-topic stored documents join local retrieval, including when vector search
   is enabled. Concurrent identical ranking work is shared; responses are cloned.
   PICO scores are cached by prompt content and model, independently of personal
   result metadata. Successful scores last one hour; failed scoring backs off for 15 seconds.
4. Synopsis requests use durable jobs by default, with the existing client polling
   path. Search observations precompute up to two paper synopses. Named observation
   jobs deduplicate while pending. Partial failures trigger bounded queue retries.
   The scheduled sweep expires queued requests older than seven days and requeues
   recent stranded work in separate bounded batches. Records are retained.
5. Learning reports count unique first attempts and exclude ambiguous attribution.
   Nightly promotion requires observed non-regression, 30 attempts and 10 learners
   in each arm, in addition to existing offline evaluation checks. These are
   observational safety checks, not proof of causal improvement. The shadow
   ranker readiness report recommends controlled evaluation rather than promotion.

## Controls and verification

- `SEARCH_RERANK_TIMEOUT_MS`: default 4000; accepted range 500 to 15000.
- `SEARCH_PRECOMPUTE_SYNOPSES`: default 2; clamped to 0 to 2. Zero disables precomputation.
- Existing queue retry limit: three attempts; concurrency remains configurable.
- `npm run audit:evidence-performance` prints document, queue and search metrics.
- Deploy web and worker together so job handlers and request contracts match.
- After deployment, compare cold and repeated queries, result relevance, p95,
  fallback rates and LLM spend. Do not infer production speedup from unit tests.
- Corpus-wide editorial verification, full-text acquisition for abstract-only
  sources, and a controlled learner trial remain separate data work.

## Release checks

- Fresh SQLite and PostgreSQL databases must both bootstrap and run migrations.
  Topic references use INTEGER in baseline schemas; the existing PostgreSQL
  adapter changes references to UUID where the live parent table uses UUIDs.
- Docker builds use the committed lockfile, including Linux native bindings.
  Dependency security findings fail the security job rather than being ignored.
- Browser smoke tests assert rendered controls after DOM readiness. External
  font loading is not the readiness signal. Page assets do not consume the
  fallback API quota; unknown API routes remain rate limited.
- Hetzner is the active deployment workflow. Docker Hub publishing is optional
  and requires `DOCKERHUB_PUBLISH_ENABLED=true`, Docker Hub credentials, and
  the environment required by `npm run beta:safety`. Do not enable it until
  those prerequisites are configured. Publishing failures then fail the job.
