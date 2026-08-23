#!/usr/bin/env bash
# Pull latest code and redeploy on Hetzner.
# Usage: bash deploy/hetzner/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT}"

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
docker compose -f docker-compose.hetzner.yml pull --ignore-buildable || true
if ! docker compose -f docker-compose.hetzner.yml up -d --build --remove-orphans; then
  echo "compose up failed; clearing stale containers and retrying once ..."
  docker ps -a --format '{{.Names}}'     | grep -E '^[0-9a-f]{12}_medsearch-(web|worker)$'     | xargs -r docker rm -f >/dev/null || true
  docker compose -f docker-compose.hetzner.yml up -d --build --remove-orphans
fi

echo "Running Postgres migrations..."
docker compose -f docker-compose.hetzner.yml exec -T web npm run db:migrate:postgres

echo ""
echo "Waiting for health (web + worker) ..."
web_ok=0
worker_ok=0
for i in 1 2 3 4 5 6 7 8 9 10; do
  sleep 5
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
echo "Public endpoint check: $(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "https://${DOMAIN}/health" || echo unreachable)"
echo "Try: docker compose -f docker-compose.hetzner.yml logs caddy web worker --tail 50"
exit 1
