# Database Layer

`database/index.js` is the public module. It exports the singleton used by the app and attaches the composed `Database` class as `db.Database` for tests and scripts.

The implementation is split into:

- `DatabaseCore.js`: connection lifecycle, schema/migrations, SQL helpers, transactions, and small cache/search-history helpers.
- `compose.js`: deterministic mixin composition with explicit method-collision validation.
- `mixins/m01-*.js` through `mixins/m15-*.js`: domain method groups.

## Composition Rules

`compose.js` owns the mixin order. Add new domain slices there instead of requiring them from `index.js`.

If a mixin intentionally replaces methods from an earlier layer, add the exact method names to `ALLOWED_REPLACEMENTS`. Unlisted collisions throw at module load and are covered by `tests/unit/dbComposition.test.js`.

## Current Slices

- `m01`: search logging and original topic knowledge helpers
- `m02`: guidelines, learning profiles, quiz/adaptive memory
- `m03`: bouquet signals and learning observability prelude
- `m04`: interactions, impressions, feedback, study runs
- `m05`: curriculum, agent, case, mastery
- `m06`: sessions, saved articles, cache, original teams/users
- `m07`: analytics, vector cache, AI generation jobs
- `m08`: review, audit, billing, CPD, teaching objects
- `m09`: claim lifecycle
- `m10`: advanced learning rounds/events
- `m11`: LLM usage logging
- `m12`: current topic knowledge implementation
- `m13`: curriculum seed scheduler persistence
- `m14`: current users/teams implementation
- `m15`: topic crosslinks
