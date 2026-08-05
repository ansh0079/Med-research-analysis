# Infrastructure Summary

## Canonical production stack (Hetzner)

| Asset | Path | Role |
|-------|------|------|
| Dockerfile | `Dockerfile` | Multi-stage frontend + Node image |
| Compose | `docker-compose.hetzner.yml` | Postgres, Redis, web, worker, Caddy, Grobid |
| Deploy scripts | `deploy/hetzner/` | Bootstrap, deploy, backup, Caddyfile, env example |
| CI deploy | `.github/workflows/deploy-hetzner.yml` | Push-to-`main` deploy |

Runbook: [HETZNER_DEPLOY.md](./HETZNER_DEPLOY.md).

## Local development

| Asset | Role |
|-------|------|
| `npm run dev` | Node API + Vite client |
| `docker-compose.postgres.yml` | Optional local pgvector |

## Removed alternate deploy paths

Fly.io, Railway, Netlify, PM2 host installs, legacy `docker/Dockerfile`, and non-Hetzner compose variants were removed so there is a single maintained production story.
