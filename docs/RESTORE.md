# Restore a Postgres backup

This project’s production Postgres runs on the Hetzner host in the `medsearch-pg` container (service `postgres` in `docker-compose.hetzner.yml`).

Backups are created nightly by GitHub Actions using `pg_dump --format=custom` and gzip compression. They can be stored in Hetzner Object Storage (S3‑compatible), Google Drive, or as a GitHub Actions artifact (fallback).

Important:
- Restores should target a NEW database (e.g. `medsearch_restore`), never overwrite production.
- The dump is logical (custom format). Use `pg_restore` to restore.
- The backup contains no ownership/privilege changes (`--no-owner --no-privileges`).

## Option A: Restore on the Hetzner server (recommended)

This streams from your workstation to the Postgres container without leaving large files on the server.

1) SSH into the Hetzner host (or run these from your workstation with `ssh root@<$HETZNER_HOST> ...`):

```bash
# Create the empty target database inside the Postgres container
ssh root@<HETZNER_HOST> 'docker exec -i medsearch-pg psql -U medsearch -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE medsearch_restore;"'
```

2) If the backup is in S3 (Hetzner Object Storage), download locally then stream into `pg_restore`:

```bash
# On your workstation (requires awscli). Replace bucket/prefix/file.
aws s3 cp s3://<BUCKET>/<PREFIX>/daily/signalmd-postgres-YYYYMMDD-HHMMSSZ.dump.gz - | \
  gunzip -c | \
  ssh root@<HETZNER_HOST> 'docker exec -i medsearch-pg pg_restore --no-owner --no-acl -U medsearch -d medsearch_restore'
```

3) If the backup was downloaded as a file (artifact or Drive), stream it:

```bash
gunzip -c ./signalmd-postgres-YYYYMMDD-HHMMSSZ.dump.gz | \
  ssh root@<HETZNER_HOST> 'docker exec -i medsearch-pg pg_restore --no-owner --no-acl -U medsearch -d medsearch_restore'
```

4) (Optional) Verify the restored DB with the provided script:

```bash
# Point verification at the restored database
ssh root@<HETZNER_HOST> 'DATABASE_URL=postgresql://medsearch:${POSTGRES_PASSWORD}@postgres:5432/medsearch_restore node /opt/medsearch/scripts/verify-restored-db.mjs'
```

## Option B: Restore locally (for analysis)

1) Create a local Postgres database and ensure `pg_restore` is installed.
2) Decompress and restore:

```bash
createdb medsearch_restore_local
gunzip -c ./signalmd-postgres-YYYYMMDD-HHMMSSZ.dump.gz | \
  pg_restore --no-owner --no-acl -d medsearch_restore_local
```

## Notes and tips

- List dump contents (sanity check):
  ```bash
  gunzip -c ./signalmd-postgres-YYYYMMDD-HHMMSSZ.dump.gz | pg_restore --list | less
  ```
- The nightly workflow keeps ~14 dailies and ~8 weeklies when using S3/Drive. Artifact fallback retains 14 days only.
- The server’s container environment provides `POSTGRES_PASSWORD`; we do not copy secrets off the host.
- Never run `--clean --if-exists` against production. For isolated restores it is acceptable, but the commands above avoid drops.

