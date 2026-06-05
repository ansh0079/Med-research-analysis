# Week 1 — Postgres, Redis, and production deploy

Target: **~90 minutes** from zero to HTTPS app with real secrets.

> **Deploying on Hetzner?** Use the dedicated guide: **[HETZNER_DEPLOY.md](./HETZNER_DEPLOY.md)** (VPS + Docker Compose + Caddy + Let's Encrypt).

| Step | Time | Outcome |
|------|------|---------|
| Local Postgres + Redis (Docker) | 30 min | `DATABASE_URL` + `REDIS_URL` verified |
| Deploy web + worker | 45 min | Public URL, migrations applied |
| JWT + domain + HTTPS | 15 min | Custom domain, TLS, auth hardened |

---

## 0. Generate production secrets (5 min)

```bash
npm run secrets:generate
```

Copy output into your host `.env` (local Docker) or platform secret store (Railway/Render/Fly).

**Required in production:**

| Variable | Notes |
|----------|--------|
| `JWT_SECRET` | 64+ hex chars; server **fails fast** if unset/default |
| `SESSION_SECRET` | Strong random string |
| `ADMIN_TOKEN` | Protects admin routes |
| `DATABASE_URL` | `postgresql://...` (not SQLite) |
| `REDIS_URL` | `redis://...` for BullMQ + shared rate limits |
| `PGSSL` | `true` on managed Postgres (Railway/Render/Fly/Neon) |
| `PG_VECTOR_URL` | Same as `DATABASE_URL` unless you split pgvector |
| `APP_URL` | `https://your-domain.com` |
| `CORS_ORIGINS` | Same origin(s) as `APP_URL` |
| `GEMINI_API_KEY` | At least one LLM key |
| `NCBI_API_KEY` + `NCBI_EMAIL` | PubMed compliance |

Verify before deploy:

```bash
npm run verify:production-env
```

---

## 1. Local Postgres + Redis (30 min)

### Option A — Docker Compose (recommended)

```bash
# 1. Create .env from template and paste secrets from secrets:generate
cp .env.example .env

# 2. Set in .env (minimum for compose):
# JWT_SECRET=<from secrets:generate>
# POSTGRES_PASSWORD=<strong password>
# GEMINI_API_KEY=<your key>

# 3. Start stack
docker compose up -d postgres redis

# 4. Wait for healthy DB, then start app (or full stack)
docker compose up -d web worker
```

Compose wires automatically:

- `DATABASE_URL=postgresql://medsearch:${POSTGRES_PASSWORD}@postgres:5432/medsearch`
- `REDIS_URL=redis://redis:6379`
- `PG_VECTOR_URL` = same Postgres (pgvector image)

Check:

```bash
curl -s http://localhost:3002/health | jq .
docker compose logs web --tail 30
```

You should see `Connected to PostgreSQL` and `BullMQ workers started` (worker container).

### Option B — Managed free tier (no Docker)

- **Neon** or **Supabase** → Postgres URL → `DATABASE_URL`
- **Upstash** or **Redis Cloud** → `REDIS_URL`
- Set `PGSSL=true`

Run locally against managed services:

```bash
# In .env
DATABASE_URL=postgresql://...
PG_VECTOR_URL=postgresql://...
PGSSL=true
REDIS_URL=redis://...
JWT_SECRET=...
NODE_ENV=production
npm run build
node server.js
```

---

## 2. Deploy — pick one platform (~45 min)

### Railway (easiest Postgres + Redis plugins)

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub** → this repo.
2. **Add PostgreSQL** → Railway injects `DATABASE_URL`.
3. **Add Redis** → Railway injects `REDIS_URL`.
4. **Web service** (from repo):
   - Builder: **Dockerfile**
   - Start: `node server.js`
   - Variables: `APP_ROLE=web`, `NODE_ENV=production`, `PGSSL=true`, `PG_VECTOR_URL=${{Postgres.DATABASE_URL}}`, plus API keys and `JWT_SECRET`.
5. **Worker service** (duplicate service, same image):
   - Start: `node server/worker.js`
   - Variables: `APP_ROLE=worker`, `WORKER_HEALTH_PORT=3003`, same `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`.
6. Deploy → open generated `*.up.railway.app` → `/health`.

CLI (optional):

```bash
npm i -g @railway/cli
railway login
railway link
railway up
```

### Render (Blueprint)

1. [dashboard.render.com/blueprints](https://dashboard.render.com/blueprints) → connect repo.
2. Use root `render.yaml` (Postgres + Redis + web + worker).
3. In dashboard, set **sync: false** secrets: `JWT_SECRET`, `GEMINI_API_KEY`, `NCBI_API_KEY`, `NCBI_EMAIL`.
4. Set `APP_URL` and `CORS_ORIGINS` to `https://<your-render-host>.onrender.com` (update after custom domain).

### Fly.io

```bash
fly auth login
fly apps create medical-research-analysis   # or use fly.toml name
fly postgres create --name medsearch-pg
fly redis create --name medsearch-redis
fly secrets set JWT_SECRET=... GEMINI_API_KEY=... PGSSL=true
fly secrets set DATABASE_URL=... REDIS_URL=... PG_VECTOR_URL=...
fly deploy
```

Scale worker (second machine or process):

```bash
fly scale count worker=1  # if using [processes] in fly.toml
```

---

## 3. JWT, domain, HTTPS (15 min)

### JWT (mandatory)

Production `server/middleware/auth.js` throws if `JWT_SECRET` is default.

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Set on **both** web and worker services.

### Custom domain

| Platform | Steps |
|----------|--------|
| **Railway** | Service → Settings → Domains → Custom Domain → CNAME to Railway target |
| **Render** | Service → Settings → Custom Domain → follow DNS instructions |
| **Fly** | `fly certs add yourdomain.com` → add A/AAAA records |

TLS is automatic on all three once DNS propagates (usually 5–30 min).

### Update URLs after domain is live

```env
APP_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com
CLIENT_URL=https://yourdomain.com
API_URL=https://yourdomain.com
```

Redeploy web + worker after changing env.

### HTTPS verification

```bash
curl -sI https://yourdomain.com/health
curl -s https://yourdomain.com/health | jq .
```

Expect `HTTP/2 200` or `HTTP/1.1 200` and JSON with `status: "ok"`.

`app.js` sets `trust proxy` so secure cookies and rate limits work behind the platform load balancer.

---

## 4. Post-deploy checklist

- [ ] `/health` returns 200 over HTTPS
- [ ] `npm run verify:production-env` passes against production env (export vars locally or use platform shell)
- [ ] Sign up / login works (JWT issued)
- [ ] Worker logs show schedulers + BullMQ (not only in-memory queue)
- [ ] Postgres migrations applied (web boot log: `Database is up to date` or `Applied N migrations`)
- [ ] `DEV_DISABLE_AUTH=false` in all services
- [ ] Stripe webhook URL updated if using billing (`https://yourdomain.com/api/billing/webhook`)

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `FATAL: JWT_SECRET must be set` | Set `JWT_SECRET` on web **and** worker |
| `ECONNREFUSED` Postgres | Check `DATABASE_URL`, `PGSSL=true` on cloud |
| Jobs never finish | Worker not running or `REDIS_URL` missing |
| CORS errors in browser | `CORS_ORIGINS` must include exact frontend origin |
| Cookies not sticking | `APP_URL` must be `https://`; `trust proxy` is already enabled |

---

## Related files

- `docker-compose.yml` — local full stack
- `Dockerfile` — production image (web + worker)
- `render.yaml` — Render blueprint
- `railway.json` — Railway Docker deploy hints
- `fly.toml` — Fly.io app config
- `.env.example` — full variable reference
