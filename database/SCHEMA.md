# Database schema layout

Three deploy surfaces — do not merge vector tables into the main app schema.

| Artifact | Engine | Purpose |
|----------|--------|---------|
| `schema.sql` | SQLite | Fresh dev DB baseline through `057_learning_event_ledger.sql` |
| `production_schema.sql` | PostgreSQL | Main app when `USE_POSTGRES_MAIN=true`; may lag SQLite-only feature tables |
| `pgvector.schema.sql` | PostgreSQL + pgvector | **Separate** DB at `PG_VECTOR_URL` (embeddings only) |

`init-pgvector.sql` is a deploy alias of `pgvector.schema.sql` for Docker; keep them in sync via `npm run db:schema:regen`.

## Source of truth

1. **Incremental changes** → add numbered files under `database/migrations/`.
2. **Snapshots** → regenerate after migrations change:
   ```powershell
   npm run db:schema:regen
   npm run db:schema:check
   ```
3. **Runtime** → `Database.initialize()` loads the snapshot, then `runMigrations()` applies pending files.

## SQLite Baseline

Fresh SQLite databases are squashed through `057_learning_event_ledger.sql`. The baseline is implemented by:

- `database/schema.sql` containing the migrated schema snapshot.
- `scripts/sqlite-migrate.mjs` marking baseline migration filenames as applied on an empty `_migrations` table.
- `database/index.js` / `database/DatabaseCore.js` doing the same when built-in migration bootstrapping is skipped.

When adding migration `058_*` or later, do not update the baseline marker until intentionally creating the next squash.

## Shared bootstrap (not in snapshots)

`database/index.js` and `scripts/sqlite-migrate.mjs` also create `annotations` and `audit_logs` on SQLite. They are included in regenerated `schema.sql`.

## Production checklist

- [ ] Main Postgres: apply `production_schema.sql` + migrations (no `articles_cache`).
- [ ] Vector Postgres: apply `pgvector.schema.sql` only (`PG_VECTOR_URL`).
- [ ] SQLite dev: `npm run db:migrate` or app boot with migrations enabled.
