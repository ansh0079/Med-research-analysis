#!/usr/bin/env bash
# Pull latest code and redeploy on Hetzner.
# Usage: bash deploy/hetzner/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT}"

# Serialize manual and automated recreates of the same named containers.
exec 9>/var/lock/medsearch-deploy.lock
flock -w 480 9 || { echo "Another deployment still holds the lock"; exit 1; }

if [[ ! -f .env ]]; then
  echo "Missing .env — copy deploy/hetzner/env.example to .env and configure DOMAIN + secrets."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

for var in DOMAIN JWT_SECRET SESSION_SECRET POSTGRES_PASSWORD; do
  if [[ -z "${!var:-}" ]]; then
    echo "Required variable ${var} is empty in .env"
    exit 1
  fi
done

# Clear stale containers left behind by an interrupted recreate.
#
# When `up -d` is interrupted part-way, Docker renames the old container to
# <shortid>_<name> and the next deploy fails with:
#   Conflict. The container name "/medsearch-worker" is already in use
# leaving web and worker in Created state and the site returning 502. This has
# bitten three deploys. Remove only the renamed duplicates -- never the live
# containers, and never postgres/redis/caddy/grobid.
stale="$(docker ps -a --format '{{.Names}}'   | grep -E '^[0-9a-f]{12}_medsearch-(web|worker)$' || true)"
if [[ -n "${stale}" ]]; then
  echo "Removing stale containers from a previous interrupted deploy:"
  echo "${stale}" | sed 's/^/  /'
  echo "${stale}" | xargs -r docker rm -f >/dev/null
fi

echo "Building and starting stack for https://${DOMAIN} ..."
# Stamp the deploying commit into the image so /health can report it.
export GIT_SHA="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
echo "Deploying commit: ${GIT_SHA}"
docker compose -f docker-compose.hetzner.yml pull --ignore-buildable || true

# Keep the images that are serving right now, so a deploy that fails health can put them back.
# Without this a failed deploy left the site down until someone fixed forward (2026-09-26: 11h of
# 502 because a new required env var was never set).
ROLLBACK_READY=0
if docker image inspect medsearch-web:latest > /dev/null 2>&1 \
  && docker image inspect medsearch-worker:latest > /dev/null 2>&1; then
  docker tag medsearch-web:latest medsearch-web:rollback
  docker tag medsearch-worker:latest medsearch-worker:rollback
  ROLLBACK_READY=1
fi

# Every deploy builds a ~1.2 GB image and its layers; the superseded image is left untagged
# and nothing ever removed it. On 2026-10-02 that filled the 150 GB disk (95 untagged images,
# 78 GB of build cache), Postgres could not write its checkpoint, and the site was down for
# ~26 minutes. Rollback only needs the :latest and :rollback tags, which this never touches.
echo "Cleaning Docker leftovers (untagged images, build cache older than 48h) ..."
docker image prune -f > /dev/null || true
docker builder prune -f --filter "until=48h" > /dev/null || true
free_gb() { df -BG --output=avail / | tail -1 | tr -dc 0-9; }
if [ "$(free_gb)" -lt 10 ]; then
  echo "Only $(free_gb)G free; clearing all build cache ..."
  docker builder prune -f > /dev/null || true
fi
# A build needs several GB. Deploying into a nearly full disk can crash Postgres, which is
# worse than not deploying, so stop here with live containers untouched.
if [ "$(free_gb)" -lt 6 ]; then
  echo "Refusing to deploy: only $(free_gb)G free on / after cleanup. Free disk space, then re-run."
  exit 1
fi

docker compose -f docker-compose.hetzner.yml build web worker

# Run the app's own startup readiness check inside the NEW image with the real environment,
# before any live container is replaced. The shell check above only knows four variables; the
# app refuses to boot on more than that, and finding out after the swap means an outage.
echo "Preflight: production readiness in the new image ..."
if ! docker compose -f docker-compose.hetzner.yml run --rm --no-deps -T web node -e "
const { validateProductionEnv } = require('./server/lib/productionReadiness');
const { errors } = validateProductionEnv({ mode: 'runtime' });
if (errors.length) { console.error(errors.map((e) => '  - ' + e).join('\n')); process.exit(1); }
console.log('  readiness OK');
"; then
  echo "Preflight failed: the new build would not boot with this .env. Live containers untouched."
  exit 1
fi

# From here on live containers are being replaced. Any failure -- compose up, a migration exec into
# a crash-looping container, or the health wait -- must end in the rollback, not a bare `set -e`
# exit that leaves the broken build serving 502.
fail_and_roll_back() {
  trap - ERR
  set +e
  echo "Public endpoint check: $(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "https://${DOMAIN}/health" || echo unreachable)"
  echo "web logs (last 20):"
  docker logs --tail 20 medsearch-web 2>&1 | sed 's/^/  /'

  if [[ "$ROLLBACK_READY" = "1" ]]; then
    # Migrations may already have run; they are additive, so the previous code runs on the new schema.
    echo "Rolling back web + worker to the images that were serving before this deploy ..."
    docker tag medsearch-web:rollback medsearch-web:latest
    docker tag medsearch-worker:rollback medsearch-worker:latest
    docker compose -f docker-compose.hetzner.yml up -d --no-build web worker
    for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
      sleep 5
      if curl -fsS --max-time 15 "https://${DOMAIN}/health" > /dev/null 2>&1; then
        echo "Rollback serving on attempt $i. Deploy of ${GIT_SHA} FAILED and was reverted; fix forward."
        exit 1
      fi
    done
    echo "Rollback did not restore https://${DOMAIN}/health either -- the site is down."
  fi
  echo "Try: docker compose -f docker-compose.hetzner.yml logs caddy web worker --tail 50"
  exit 1
}
trap fail_and_roll_back ERR

if ! docker compose -f docker-compose.hetzner.yml up -d --no-build --remove-orphans; then
  echo "compose up failed; clearing stale containers and retrying once ..."
  docker ps -a --format '{{.Names}}'     | grep -E '^[0-9a-f]{12}_medsearch-(web|worker)$'     | xargs -r docker rm -f >/dev/null || true
  docker compose -f docker-compose.hetzner.yml up -d --no-build --remove-orphans
fi

echo "Running Postgres migrations..."
docker compose -f docker-compose.hetzner.yml exec -T -e USE_POSTGRES_MAIN=true web \
  node -e "const db=require('./database');db.connect().then(()=>db.runMigrations()).then(r=>console.log(r)).finally(()=>db.close())"

echo "Ingesting uploaded open-access guidelines..."
docker compose -f docker-compose.hetzner.yml exec -T -e USE_POSTGRES_MAIN=true web \
  node scripts/ingest-flagship-guideline-seeds.js --catalog server/config/uploadedGuidelines.json

echo ""
echo "Waiting for health (web + worker) ..."
web_ok=0
worker_ok=0
for i in 1 2 3 4 5 6 7 8 9 10; do
  sleep 5
  web_ok=0
  worker_ok=0
  if docker exec medsearch-web wget -qO- http://127.0.0.1:3002/health > /dev/null 2>&1 \
    || curl -fsS "https://${DOMAIN}/health" > /dev/null 2>&1; then
    web_ok=1
  fi
  if docker exec medsearch-worker wget -qO- http://127.0.0.1:3003/health > /dev/null 2>&1 \
    || docker exec medsearch-worker node -e "require('http').get('http://127.0.0.1:3003/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))" 2>/dev/null; then
    worker_ok=1
  fi
  if [[ "$web_ok" = "1" && "$worker_ok" = "1" ]]; then
    # Container-internal health is not sufficient: during a failed recreate the
    # containers can report healthy while the public site still serves 502. What
    # matters is what a user gets, so verify the public endpoint before claiming
    # success -- a deploy must not exit 0 while the site is down.
    if ! curl -fsS --max-time 15 "https://${DOMAIN}/health" > /dev/null 2>&1; then
      echo "Containers healthy but https://${DOMAIN}/health is not serving (attempt $i)"
      continue
    fi
    echo "Health check passed on attempt $i (web + worker + public endpoint)"
    docker compose -f docker-compose.hetzner.yml ps
    echo ""
    echo "Deploy OK: https://${DOMAIN}"
    exit 0
  fi
  echo "Waiting for health (attempt $i): web=$web_ok worker=$worker_ok"
done

echo "Health check failed after 10 attempts (web=$web_ok worker=$worker_ok)"
fail_and_roll_back
