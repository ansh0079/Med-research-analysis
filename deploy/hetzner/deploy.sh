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

echo ""
echo "Waiting for health ..."
sleep 8
docker compose -f docker-compose.hetzner.yml ps
curl -fsS "https://${DOMAIN}/health" | head -c 400 || {
  echo "HTTPS health check failed — try: docker compose -f docker-compose.hetzner.yml logs caddy web --tail 50"
  exit 1
}
echo ""
echo "Deploy OK: https://${DOMAIN}"
