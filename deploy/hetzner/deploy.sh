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

echo "Building and starting stack for https://${DOMAIN} ..."
docker compose -f docker-compose.hetzner.yml pull --ignore-buildable || true
docker compose -f docker-compose.hetzner.yml up -d --build --remove-orphans

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
    echo "Health check passed on attempt $i (web + worker)"
    docker compose -f docker-compose.hetzner.yml ps
    echo ""
    echo "Deploy OK: https://${DOMAIN}"
    exit 0
  fi
  echo "Waiting for health (attempt $i): web=$web_ok worker=$worker_ok"
done

echo "Health check failed after 10 attempts (web=$web_ok worker=$worker_ok)"
echo "Try: docker compose -f docker-compose.hetzner.yml logs caddy web worker --tail 50"
exit 1
