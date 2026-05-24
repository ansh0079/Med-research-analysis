# Database Migration Strategy

## Overview

This project uses a **baseline + migrations** strategy for database initialization:

- **Baseline**: `database/schema.sql` - contains the complete schema after migrations 1-57
- **Migrations**: `database/migrations/*.sql` - incremental schema changes
- **New databases** load the baseline instantly instead of running 57 individual migrations

## How It Works

### Fresh Database Initialization

When a new database is created:

```bash
npm run db:migrate:builtin
```

1. **Load baseline schema** (`database/schema.sql`) - 81 tables created instantly
2. **Mark migrations 1-57 as applied** - stored in `_migrations` table
3. **Run pending migrations** - only migrations 58+ (if any exist)

**Result**: Fresh databases are initialized in seconds instead of executing 57 separate migration files.

### Migration Execution Flow

```
Fresh DB Created
  ↓
Load database/schema.sql (baseline: migrations 1-57)
  ↓
Create _migrations table
  ↓
Mark migrations 001-057 as applied (no file execution)
  ↓
Execute any pending migrations (058, 059, ...)
  ↓
Done
```

## Baseline Configuration

The baseline migration cutoff is defined in `scripts/sqlite-migrate.mjs`:

```javascript
const sqliteBaselineMigration = '057_learning_event_ledger.sql';
```

This means:
- Migrations numbered ≤ 057 are part of the baseline
- When migrations are > 057, update this constant
- The schema.sql file reflects the state AFTER migration 057

## Regenerating the Baseline

When baseline schema.sql becomes stale (out of sync with migrations), regenerate it:

```bash
npm run db:schema:regen -- --sqlite-dump
```

This command:
1. Creates a temporary database
2. Loads `database/schema.sql` baseline
3. Runs all pending migrations
4. Dumps the resulting schema back to `database/schema.sql`
5. Verifies schema consistency

**When to regenerate**:
- After adding new migrations that should become the baseline
- When you want to "squash" pending migrations into the baseline
- If `npm run db:schema:check` reports drift

## Adding New Migrations

1. Create `database/migrations/NNN_description.sql`
2. Write SQL statements (each terminated with `;`)
3. Run migrations locally:
   ```bash
   npm run db:migrate:builtin
   ```
4. Test fresh database initialization:
   ```bash
   rm database/app.db
   npm run db:migrate:builtin
   ```

## Schema Consistency

Verify that baseline schema matches migrations:

```bash
npm run db:schema:check
```

This ensures:
- All migration files exist
- schema.sql header is current
- No drift between baseline and migrations

## PostgreSQL Support

For production PostgreSQL deployments:
- `database/production_schema.sql` - auto-generated from migrations
- `database/pgvector.schema.sql` - vector search (pgvector extension)
- `database/init-pgvector.sql` - deployed to vector DB

Regenerate with: `npm run db:schema:regen -- --sqlite-dump`

## Migration Best Practices

- ✅ Use `CREATE TABLE IF NOT EXISTS` - idempotent
- ✅ Use `CREATE INDEX IF NOT EXISTS` - idempotent
- ✅ Use explicit `ALTER TABLE` statements for column additions
- ❌ Don't rely on auto-increment IDs for ordering
- ❌ Don't assume migration execution order (use timestamps/ordering in filenames)

## Troubleshooting

**"No routes matched location"** during migration:
- Normal warning when testing with empty database
- Migrations complete successfully despite warning

**Schema consistency check fails**:
- Run: `npm run db:schema:check` for details
- Regenerate: `npm run db:schema:regen -- --sqlite-dump`

**Migration won't apply**:
- Check for SQL syntax errors
- Verify table/column references exist
- Use `CREATE ... IF NOT EXISTS` for idempotent migrations
