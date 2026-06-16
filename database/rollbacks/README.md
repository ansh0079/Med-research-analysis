# Migration Rollbacks

Rollback files use the matching migration basename with a `.down.sql` suffix.

Example:

```text
database/migrations/074_performance_indices.sql
database/rollbacks/074_performance_indices.down.sql
```

Run the newest rollback:

```bash
npm run db:rollback
```

Preview without changing the database:

```bash
npm run db:rollback -- --dry-run
```

Roll back more than one newest migration:

```bash
npm run db:rollback -- --steps=2
```

Rollback statements and the `_migrations` marker delete run in one transaction. If a matching rollback file is missing, the command stops before changing the database.
