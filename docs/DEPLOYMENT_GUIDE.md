# Deployment Guide

**Canonical production path: Hetzner Cloud (Docker Compose + Caddy).**

See **[HETZNER_DEPLOY.md](./HETZNER_DEPLOY.md)** for bootstrap, env, deploy, backups, and verification.

## Quick reference

| Asset | Purpose |
|-------|---------|
| `Dockerfile` | Production web/worker image |
| `docker-compose.hetzner.yml` | Full stack (Postgres, Redis, web, worker, Caddy) |
| `deploy/hetzner/` | Caddyfile, env example, scripts |
| `.github/workflows/deploy-hetzner.yml` | Deploy on push to `main` |

```bash
# On the VPS (after bootstrap)
cd /opt/medsearch
./deploy/hetzner/deploy.sh
```

Alternate platforms (Fly, Railway, Netlify, PM2 host installs) were removed to keep a single maintained deploy story.

Local Docker notes: [docker.md](./docker.md).
