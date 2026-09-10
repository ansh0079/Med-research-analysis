# Guideline coverage verification and repair

Verified against production Postgres, running commit `5bd8688`. This audit concerns
the original 174-topic cohort in the production host's `/tmp/all174.txt`, not all
flagship topics. Figures below include the repair pilot.

| Metric | Verified result |
| --- | ---: |
| Topics with a recognised issuing-body row | 67 / 174 |
| Topics with a recognised body AND a servable recommendation | 60 / 174 |
| Topics without a servable recommendation | 114 / 174 |
| Stored rows in the cohort | 1,162 |
| Recognised-body rows | 390 |
| Rows passing body and recommendation-text gates | 279 |
| Uncurated rows | 772 |

The previous 66-topic figure measured issuing-body recognition, not full serving
eligibility. Background statements can name a real organisation and still fail
the recommendation-text gate. These counts do not certify clinical correctness,
currentness, or review approval, and do not include related-topic search fallback.

## Production changes completed

- Corrected 1,126 malformed PubMed URLs containing the literal `/PMID/` segment.
  Confirmed zero remaining matches after the transaction. No recommendation text,
  issuing bodies, or review states were changed by this repair.
- Original IDs and URLs are backed up on the production host at
  `/var/backups/medsearch/guideline-url-repair-20260910.json` (root-readable only).
- Re-extracted the sources behind the nephrolithiasis pilot's uncurated rows.
  Added three AUA-attributed recommendations referencing PMID 24857648. Their
  organisation and source ID were checked against the retrieved publication.
  Original rows were retained. This adds one covered topic.
- The Lyme disease dry run recovered zero qualifying recommendations from five
  cited abstracts. No content rows were written for that topic.
- Web and worker remained healthy. No application redeployment was performed.

## Code changes prepared

- Discovery and batch ingestion no longer infer issuing bodies from journals.
  Candidate bodies must occur in the cited article's supplied title or text.
  Unknown PMIDs and journal substitution are rejected; URLs and years are derived
  from the source article. An occurrence check is necessary evidence, not proof
  that every model-generated recommendation is correct.
- The bulk runner separates stored rows from displayable recommendations and no
  longer converts database read failures into empty-topic results.
- Readiness uses the same recommendation-text gate as the serving layer, plus
  issuing-body recognition.
- Flagship enrichment now uses the real guideline write contract and includes
  stored recommendation text and URLs in MCQ prompts. It rejects malformed answer
  keys instead of writing the incompatible `correct`/object-options shape.
- Source sync no longer creates fake PMID-only records for failed fetches.
- Automated deployment uses the shared deploy script with a deployment lock;
  health is rechecked each iteration. Concurrency is a suspected contributor to
  container conflicts, not a proven root cause.

## Remaining work

- Deploy the prepared code before another bulk run. These working-tree changes
  are not yet committed, pushed, or serving normal production requests.
- Reprocess the remaining cohort in measured batches, with review of recovered
  content. Do not relabel the 772 uncurated rows merely to improve counts.
- Of the 129 registered topics, 12 currently have a seeding timestamp. This is
  not a content-quality guarantee. The full enrichment/source-sync run was not
  executed in this pass.
- There are 50 teaching objects with a null curriculum link, not 644. No linked
  object points to a nonexistent curriculum ID. Resolve missing links from
  evidence/aliases rather than deleting objects.
- All 3,390 queued database jobs remain. Their timestamps span June to September
  and their expiry fields do not identify them as expired. Compare with Redis
  queue state before reconciling or retrying them.
- Production `users.id` is already UUID. Any remaining schema-file drift needs a
  separate contract check; converting the production column is not needed.
- There are 21 invite records, 20 unused. The table does not establish whether
  invitation emails were sent. No invitations were sent during this work.
- Stripe configuration, Semantic Scholar access, and the duplicate search
  statistics layout were not changed or independently revalidated in this pass.

## Reproducible commands

Verification completed: 268 test suites passed (one skipped), 2,294 tests passed
(nine skipped). Lint, frontend/server type checks, production build, DB contract
guard, whitespace check, Bash syntax check, and deployment-workflow YAML parsing
passed. A final focused run of the discovery and MCQ tests also passed after the
last prompt/query-option change. The build retains its existing large-chunk
warning. The production audit and both pilots used actual Postgres/source data.

Run in a configured application environment with the prepared code:

```sh
node server/scripts/auditGuidelineCoverage.js /path/to/all174.txt
node server/scripts/reextractGuidelineNoise.js --topic "Exact topic"
node server/scripts/reextractGuidelineNoise.js --topic "Exact topic" --apply
node server/scripts/repairGuidelineUrls.js
```

Re-extraction defaults to dry-run, validates against retrieved sources, and
deduplicates exact existing body/URL/text triples. It does not deduplicate
paraphrases or provide a cross-process uniqueness guarantee. Run one repair
process per topic and review output before expanding the batch.
