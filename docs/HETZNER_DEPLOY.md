# Deploy on Hetzner Cloud (VPS)

Self-hosted production on a single Hetzner VPS using **Docker Compose**: Postgres (pgvector) + Redis + web + worker + **Caddy** (automatic Let's Encrypt HTTPS).

Estimated time: **~60–90 minutes** first deploy.

---

## Architecture

```
Internet → :443/:80 → Caddy (TLS) → web:3002 (Node + SPA)
                              ↘ postgres, redis (internal only)
                              ↘ worker (BullMQ + cron, internal)
```

Postgres and Redis are **not** exposed to the public internet. Only Caddy listens on 80/443.

---

## 1. Create the server (10 min)

1. [Hetzner Cloud Console](https://console.hetzner.cloud/) → **Add Server**
2. **Location:** Falkenstein / Nuremberg / Helsinki (your choice)
3. **Image:** Ubuntu 24.04
4. **Type:** **CPX22** (2 vCPU, 4 GB RAM) minimum; **CPX32** (4 vCPU, 8 GB) if you expect heavy LLM/embedding load
5. **Networking:** IPv4 + IPv6 (optional but fine)
6. **SSH key:** add your public key (password login off)
7. Create server → note **public IPv4**

### Hetzner Cloud Firewall (recommended)

Create a firewall and attach to the server:

| Inbound | Port | Source |
|---------|------|--------|
| SSH | 22 | Your IP only |
| HTTP | 80 | 0.0.0.0/0, ::/0 |
| HTTPS | 443 | 0.0.0.0/0, ::/0 |

Everything else denied.

---

## 2. Domain & DNS (5 min)

**Registrar (cheapest long-term):** [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) (~$10.44/yr `.com`, flat renewal).

**Production domain:** [signalmd.co](https://signalmd.co) (registered on Cloudflare).

At Cloudflare DNS, add:

| Type | Name | Value | Proxy |
|------|------|--------|-------|
| A | `@` (root) | `<server-ipv4>` | DNS only (grey cloud) |
| AAAA | `@` | `<server-ipv6>` (optional) | DNS only |

Example: `signalmd.co` → `95.x.x.x`

Wait for propagation (`dig signalmd.co`).

---

## 3. Bootstrap the VPS (10 min)

SSH in:

```bash
ssh root@<server-ip>
```

Clone and bootstrap:

```bash
apt-get update && apt-get install -y git
git clone https://github.com/ansh0079/Med-research-analysis.git /opt/medsearch
cd /opt/medsearch
bash deploy/hetzner/bootstrap-server.sh
```

This installs Docker, Docker Compose plugin, UFW (22/80/443), and fail2ban.

---

## 4. Configure secrets (10 min)

On the server:

```bash
cd /opt/medsearch
cp deploy/hetzner/env.example .env
nano .env   # or vim
```

**Required:**

```env
DOMAIN=signalmd.co
ACME_EMAIL=you@signalmd.co
POSTGRES_PASSWORD=<strong-random>
JWT_SECRET=<64-byte hex>
SESSION_SECRET=<32-byte hex>
ADMIN_TOKEN=<random>
GEMINI_API_KEY=<your key>
NCBI_API_KEY=<your key>
NCBI_EMAIL=you@yourdomain.com
```

Generate secrets locally or on the server:

```bash
npm run secrets:generate
# or: node scripts/generate-secrets.mjs
```

Optional pre-flight (set vars first):

```bash
export $(grep -v '^#' .env | xargs)
export NODE_ENV=production
export DATABASE_URL=postgresql://medsearch:${POSTGRES_PASSWORD}@localhost:5432/medsearch
export REDIS_URL=redis://:${REDIS_PASSWORD}@localhost:6379
npm run verify:production-env
```

---

## 5. Deploy (15 min)

```bash
cd /opt/medsearch
chmod +x deploy/hetzner/*.sh
bash deploy/hetzner/deploy.sh
```

Or manually:

```bash
docker compose -f docker-compose.hetzner.yml up -d --build
docker compose -f docker-compose.hetzner.yml ps
docker compose -f docker-compose.hetzner.yml logs -f caddy web
```

First boot runs DB migrations automatically (`server.js` → `runMigrations()`).

### Verify HTTPS

```bash
curl -sI https://signalmd.co/health
curl -s https://signalmd.co/health
```

Expect `200` and JSON with `"status":"ok"`.

Sign up / login in the browser to confirm JWT works.

---

## 6. Updates & redeploy

```bash
cd /opt/medsearch
git pull origin main
bash deploy/hetzner/deploy.sh
```

---

## 7. Backups (cron)

```bash
chmod +x deploy/hetzner/backup-postgres.sh
mkdir -p /var/backups/medsearch
crontab -e
```

Add:

```cron
0 3 * * * /opt/medsearch/deploy/hetzner/backup-postgres.sh >> /var/log/medsearch-backup.log 2>&1
```

Restore (example):

```bash
docker compose -f docker-compose.hetzner.yml exec -T postgres \
  pg_restore -U medsearch -d medsearch --clean --if-exists < /var/backups/medsearch/medsearch-YYYYMMDD.dump
```

For production, also copy backups off-server (Hetzner Storage Box, S3, etc.).

---

## 8. Operations cheat sheet

| Task | Command |
|------|---------|
| Logs (web) | `docker compose -f docker-compose.hetzner.yml logs -f web` |
| Logs (worker) | `docker compose -f docker-compose.hetzner.yml logs -f worker` |
| Logs (Caddy/TLS) | `docker compose -f docker-compose.hetzner.yml logs -f caddy` |
| Restart stack | `docker compose -f docker-compose.hetzner.yml restart` |
| Stop stack | `docker compose -f docker-compose.hetzner.yml down` |
| Shell in web | `docker compose -f docker-compose.hetzner.yml exec web sh` |
| Disk usage | `docker system df` |

---

## 9. Troubleshooting

| Problem | Likely cause | Fix |
|---------|----------------|-----|
| Caddy won't get certificate | DNS not pointing at server, or port 80 blocked | `dig $DOMAIN`; open 80/443 in Hetzner firewall |
| `FATAL: JWT_SECRET` | Missing/weak secret in `.env` | Regenerate, redeploy web + worker |
| 502 from Caddy | Web container unhealthy | `docker compose ... logs web` |
| Jobs stuck | Worker down or no Redis | `docker compose ... ps worker redis` |
| CORS errors | Wrong `CORS_ORIGINS` | Must be `https://$DOMAIN` (set automatically in hetzner compose) |

---

## 10. Sizing & scaling

| Traffic | Suggested plan |
|---------|----------------|
| Beta / solo | CPX22 |
| Small team | CPX32 |
| Heavy embeddings | CPX32+ or separate pgvector DB |

Later scaling options:

- **Vertical:** resize VPS in Hetzner console
- **Horizontal:** second VPS for worker only, managed Postgres (Hetzner doesn't offer managed PG — use Neon or self-hosted replica)
- **Object storage:** Hetzner Storage Box for backup archives

---

## Files reference

| File | Purpose |
|------|---------|
| `docker-compose.hetzner.yml` | Full production stack |
| `deploy/hetzner/Caddyfile` | Reverse proxy + Let's Encrypt |
| `deploy/hetzner/env.example` | Production `.env` template |
| `deploy/hetzner/bootstrap-server.sh` | One-time VPS setup |
| `deploy/hetzner/deploy.sh` | Pull + rebuild + health check |
| `deploy/hetzner/backup-postgres.sh` | pg_dump backup script |

---

## Alternative: nginx + Certbot

If you prefer nginx over Caddy, use root `nginx.conf` on the host with Certbot (`certbot --nginx`). The Docker+Caddy path above is simpler for a single VPS because TLS renewal is fully automatic inside Compose.
