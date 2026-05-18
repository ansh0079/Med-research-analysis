# Database schema layout

Three deploy surfaces — do not merge vector tables into the main app schema.

| Artifact | Engine | Purpose |
|----------|--------|---------|
| `schema.sql` | SQLite | Fresh dev DB baseline before `database/migrations/*.sql` |
| `production_schema.sql` | PostgreSQL | Main app when `USE_POSTGRES_MAIN=true` |
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

## Shared bootstrap (not in snapshots)

`database/index.js` and `scripts/sqlite-migrate.mjs` also create `annotations` and `audit_logs` on SQLite. They are included in regenerated `schema.sql`.

## Production checklist

- [ ] Main Postgres: apply `production_schema.sql` + migrations (no `articles_cache`).
- [ ] Vector Postgres: apply `pgvector.schema.sql` only (`PG_VECTOR_URL`).
- [ ] SQLite dev: `npm run db:migrate` or app boot with migrations enabled.
