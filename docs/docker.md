# Docker

Production deploy is **Hetzner-only**. Canonical assets:

- `Dockerfile` — multi-stage Vite frontend + Node backend image
- `docker-compose.hetzner.yml` — Postgres (pgvector) + Redis + web + worker + Caddy
- `deploy/hetzner/` — Caddyfile, env example, bootstrap/deploy/backup scripts

Full runbook: [HETZNER_DEPLOY.md](./HETZNER_DEPLOY.md).

CI deploys via `.github/workflows/deploy-hetzner.yml`.

## Local vector DB (optional)

Run pgvector beside `npm run dev`:

```bash
docker compose -f docker-compose.postgres.yml up -d
export PG_VECTOR_URL="postgresql://medsearch:medsearch@localhost:5432/medsearch"
npm run dev
```

## Validate Hetzner compose

```bash
npm run compose:hetzner:config
# or: docker compose -f docker-compose.hetzner.yml config --quiet
```
