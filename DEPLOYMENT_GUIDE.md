# Deployment Guide - Medical Research Analysis Platform

Complete deployment instructions for the Medical Research Analysis application across multiple cloud platforms.

## Table of Contents

- [Platform Comparison](#platform-comparison)
- [Prerequisites](#prerequisites)
- [Railway.app Deployment](#railwayapp-deployment)
- [Render.com Deployment](#rendercom-deployment)
- [Fly.io Deployment](#flyio-deployment)
- [Netlify Deployment (Frontend)](#netlify-deployment-frontend)
- [Vercel Deployment (Frontend)](#vercel-deployment-frontend)
- [Environment Variables](#environment-variables)
- [Custom Domain Configuration](#custom-domain-configuration)
- [Post-Deployment Verification](#post-deployment-verification)
- [Troubleshooting](#troubleshooting)

---

## Platform Comparison

| Feature | Railway | Render | Fly.io | Netlify | Vercel |
|---------|---------|--------|--------|---------|--------|
| **Best For** | Full-stack apps | Full-stack apps | Global distribution | Static sites/JAMstack | Static sites/Next.js |
| **Free Tier** | ✅ $5/mo credit | ✅ Generous limits | ✅ Up to 3 shared-cpu VMs | ✅ Generous | ✅ Generous |
| **Backend Support** | ✅ Native | ✅ Native | ✅ Native | ❌ Edge functions only | ❌ Serverless functions |
| **Database** | ✅ Managed | ✅ Managed | ✅ Postgres/Redis | ❌ Third-party | ❌ Third-party |
| **Custom Domain** | ✅ Easy | ✅ Easy | ✅ CLI-based | ✅ Easy | ✅ Easy |
| **SSL Auto** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Deploy from Git** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Docker Support** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | ❌ No |

### Recommendation

- **Full-stack deployment**: Use **Railway** or **Render** for simplicity
- **Global performance**: Use **Fly.io** for edge deployment
- **Frontend only**: Use **Netlify** or **Vercel** with separate backend
- **Production with scale**: Use **Railway** or **Render Standard** plan

---

## Prerequisites

1. **Git repository** with your code pushed to GitHub/GitLab/Bitbucket
2. **Hugging Face API key**: Get one at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
3. **Platform account**: Sign up for your chosen deployment platform
4. **Custom domain** (optional): Have your domain ready for configuration

---

## Railway.app Deployment

### Step 1: Connect Repository

1. Go to [railway.app](https://railway.app) and sign up/login
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository and click "Add Variables"

### Step 2: Configure Environment Variables

```bash
NODE_ENV=production
HF_API_KEY=<your-huggingface-api-key>
ADMIN_KEY=your_random_admin_key_here
```

### Step 3: Deploy

Railway deployment requires a `railway.json` config file (not yet included; create one manually):

```bash
# Using CLI (optional)
npm i -g @railway/cli
railway login
railway link
railway up
```

### Step 4: Verify Deployment

- Visit the provided domain (e.g., `medical-research-analysis.up.railway.app`)
- Check `/health` endpoint for status

### Custom Domain (Railway)

1. In Railway dashboard, go to your service → Settings → Domains
2. Click "Custom Domain" → "Generate Domain"
3. Add the CNAME record to your DNS provider
4. Wait for SSL certificate provisioning (auto)

---

## Render.com Deployment

### Step 1: Create Blueprint Instance

1. Go to [dashboard.render.com/blueprints](https://dashboard.render.com/blueprints)
2. Click "New Blueprint Instance"
3. Connect your Git repository
4. Render deployment requires a `render.yaml` config file (not yet included; create one manually)

### Step 2: Configure Environment Variables

During setup, Render prompts for:

- `HF_API_KEY`: Your Hugging Face token
- `ADMIN_KEY`: Auto-generated or set manually

### Step 3: Deploy

Render automatically:
1. Runs `npm install && npm run setup`
2. Starts `node proxy-server.js`
3. Performs health checks on `/health`

### Step 4: Verify

- Visit `https://medical-research-analysis.onrender.com`
- Check logs in Render dashboard

### Custom Domain (Render)

1. In Render dashboard, go to your web service → Settings → Custom Domain
2. Enter your domain (e.g., `api.yourdomain.com`)
3. Add the provided CNAME/A record to your DNS
4. Wait for SSL certificate (auto-issued)

---

## Fly.io Deployment

### Step 1: Install Fly CLI

```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# macOS/Linux
curl -L https://fly.io/install.sh | sh
```

### Step 2: Authenticate

```bash
fly auth login
```

### Step 3: Launch Application

```bash
# First time only - creates app
fly launch --name medical-research-analysis --region iad

# Set secrets
fly secrets set HF_API_KEY=<your-huggingface-api-key>
fly secrets set ADMIN_KEY=your_admin_key_here
fly secrets set NODE_ENV=production

# Deploy
fly deploy
```

### Step 4: Scale (Optional)

```bash
# Scale to 2 machines for high availability
fly scale count 2

# Increase memory
fly scale memory 1024
```

### Step 5: Verify

```bash
fly status
fly logs
# Visit https://medical-research-analysis.fly.dev
```

### Custom Domain (Fly.io)

```bash
# Add custom domain
fly certs add api.yourdomain.com

# Check certificate status
fly certs show api.yourdomain.com
```

Add DNS records as instructed by Fly.io (A/AAAA or CNAME).

---

## Netlify Deployment (Frontend)

For **frontend-only** deployment with separate backend API.

### Step 1: Connect Repository

1. Go to [app.netlify.com](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Select your Git provider and repository

### Step 2: Build Settings

Netlify deployment requires a `netlify.toml` config file (not yet included; create one manually):

```toml
[build]
  publish = "."
  command = "echo 'No build required'"
```

### Step 3: Environment Variables

In Netlify dashboard → Site settings → Environment variables:

```
API_URL=https://your-backend-api.com
```

### Step 4: Deploy

Netlify automatically deploys on every push to the main branch.

### Custom Domain (Netlify)

1. Site settings → Domain management → Domains → Add custom domain
2. Enter your domain and verify ownership
3. Configure DNS (Netlify DNS or external)
4. SSL certificate auto-provisioned

---

## Vercel Deployment (Frontend)

For **frontend-only** deployment with separate backend API.

### Step 1: Connect Repository

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New..." → "Project"
3. Import your Git repository

### Step 2: Configure Project

Vercel deployment requires a `vercel.json` config file (not yet included; create one manually):

- Framework preset: **Other**
- Build command: **None**
- Output directory: **.** (root)

### Step 3: Environment Variables

In Project settings → Environment variables:

```
API_URL=https://your-backend-api.com
```

### Step 4: Deploy

Vercel auto-deploys on every push. Preview deployments for pull requests.

### Custom Domain (Vercel)

1. Project settings → Domains
2. Enter your domain
3. Follow DNS configuration steps
4. Auto SSL with Let's Encrypt

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port (auto-set by most platforms) | `3002` or `8080` |
| `HF_API_KEY` | Hugging Face API token | `<your-huggingface-api-key>` |
| `ADMIN_KEY` | Admin key for cache management | `your_secret_key` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_URL` | Backend API URL (for frontend deployments) | - |
| `CACHE_TTL` | Cache time-to-live in seconds | `3600` |
| `RATE_LIMIT_WINDOW` | Rate limit window in ms | `60000` |
| `RATE_LIMIT_MAX` | Max requests per window | `30` |

### Security Best Practices

1. **Never commit secrets** to Git - use platform secret management
2. **Generate strong ADMIN_KEY**: `openssl rand -hex 32`
3. **Rotate API keys** regularly
4. **Use platform-specific secret storage** (not env files in production)

### PostgreSQL (production pools)

When `USE_POSTGRES_MAIN=true` and `DATABASE_URL` points to PostgreSQL, the API uses a **`pg` Pool** with tunable limits:

| Variable | Description | Default |
|----------|-------------|---------|
| `PG_POOL_MAX` | Max connections per Node process (main DB) | `20` |
| `PG_POOL_IDLE_TIMEOUT_MS` | Idle client timeout | `30000` |
| `PG_POOL_CONNECTION_TIMEOUT_MS` | Connection acquisition timeout | `10000` |
| `PG_VECTOR_POOL_MAX` | Max connections for `PG_VECTOR_URL` pool | `min(PG_POOL_MAX, 10)` |

Size your **database `max_connections`** for `(number of app instances × PG_POOL_MAX) + overhead + migrations**. Managed Postgres (Neon, RDS, Cloud SQL, etc.) should have **automated backups / PITR** enabled in the provider console.

### Database backups

- Prefer **provider-native snapshots** (point-in-time recovery) for production.
- For self-hosted Postgres, see `scripts/postgres-backup.example.sh` for a `pg_dump` template; store artifacts in **encrypted** object storage and **test restores**.

---

## Custom Domain Configuration

### DNS Configuration Examples

#### Option 1: Root Domain (A Record)

```
Type: A
Name: @
Value: <platform_ip_address>
TTL: 3600
```

#### Option 2: Subdomain (CNAME)

```
Type: CNAME
Name: api
Value: medical-research-analysis.fly.dev
TTL: 3600
```

#### Option 3: Cloudflare Proxy (Recommended)

1. Add your domain to Cloudflare
2. Create CNAME record pointing to your platform
3. Enable orange cloud (proxied) for CDN + SSL
4. Set SSL/TLS mode to "Full (strict)"

### SSL/TLS Configuration

All platforms provide free SSL certificates via Let's Encrypt:

| Platform | SSL Type | Auto-renewal |
|----------|----------|--------------|
| Railway | Let's Encrypt | Yes |
| Render | Let's Encrypt | Yes |
| Fly.io | Let's Encrypt | Yes |
| Netlify | Let's Encrypt | Yes |
| Vercel | Let's Encrypt | Yes |

---

## Post-Deployment Verification

### 1. Health Check

```bash
curl https://your-domain.com/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "BioGPT Proxy Server is running",
  "features": ["biogpt", "summarize", "key-findings"]
}
```

### 2. API Test

```bash
# Test BioGPT endpoint
curl -X POST https://your-domain.com/api/biogpt \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistralai/Mistral-7B-Instruct-v0.2",
    "prompt": "Summarize: Diabetes is a chronic disease...",
    "apiKey": "<your-huggingface-api-key>"
  }'
```

### 3. Frontend Integration

1. Open your deployed frontend
2. Navigate to Settings (gear icon)
3. Configure API endpoint to your deployed backend
4. Test search and analysis functionality

### 4. Monitoring Setup

**Railway**: Built-in metrics in dashboard  
**Render**: Metrics tab in dashboard  
**Fly.io**: `fly metrics` or Grafana integration  
**Netlify/Vercel**: Analytics in dashboard

### 5. Uptime Monitoring (Recommended)

Set up external monitoring:

```bash
# Using UptimeRobot (free tier available)
# Add monitor for: https://your-domain.com/health
# Check interval: 5 minutes
```

---

## Troubleshooting

### Common Issues

#### 1. Build Fails

**Symptom**: Build process exits with error  
**Solution**:
- Check `package.json` is valid JSON
- Verify `npm install` works locally
- Check platform logs for specific errors

#### 2. Port Binding Error

**Symptom**: `Error: listen EADDRINUSE`  
**Solution**:
- Ensure using `process.env.PORT` in `proxy-server.js` (already configured)
- Don't hardcode port numbers

#### 3. Health Check Fails

**Symptom**: Deployment fails health checks  
**Solution**:
- Verify `/health` endpoint returns 200
- Check response time < 30 seconds
- Review server startup logs

#### 4. CORS Errors

**Symptom**: Frontend can't connect to backend  
**Solution**:
- Backend already has CORS enabled
- Verify `allow_origins` includes your frontend domain
- Check browser console for specific errors

#### 5. API Key Not Working

**Symptom**: 401/403 errors on API calls  
**Solution**:
- Verify `HF_API_KEY` is set in environment
- Check key hasn't expired at Hugging Face
- Ensure the value is a valid Hugging Face token from your account settings.

### Platform-Specific Issues

#### Railway
- **Issue**: Service sleeps on free tier  
- **Fix**: Upgrade to paid tier or use uptime pinger

#### Render
- **Issue**: Cold start delays (free tier)  
- **Fix**: Upgrade to paid tier for always-on

#### Fly.io
- **Issue**: Machine stops when idle (free tier)  
- **Fix**: Set `min_machines_running = 1` or upgrade

#### Netlify/Vercel
- **Issue**: API calls fail (frontend-only)  
- **Fix**: Deploy backend separately, use `API_URL` variable

---

## Production Checklist

- [ ] Environment variables configured
- [ ] Health check endpoint responding
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Rate limiting tested
- [ ] API key validated
- [ ] Frontend connected to backend
- [ ] Monitoring alerts configured
- [ ] Backup strategy in place (if using database)
- [ ] Documentation updated

---

## Support & Resources

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Render Docs**: [render.com/docs](https://render.com/docs)
- **Fly.io Docs**: [fly.io/docs](https://fly.io/docs)
- **Netlify Docs**: [docs.netlify.com](https://docs.netlify.com)
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Hugging Face**: [huggingface.co/docs](https://huggingface.co/docs)

---

*Last updated: February 2026*
