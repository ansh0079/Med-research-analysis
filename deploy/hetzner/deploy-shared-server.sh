#!/usr/bin/env bash
# Deploy SignalMD on a VPS that already runs Caddy (e.g. Retail Edge).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT}"

if [[ ! -f .env ]]; then
  echo "Missing .env — cp deploy/hetzner/env.example .env and configure DOMAIN=signalmd.co"
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

echo "Starting SignalMD stack (localhost:3010) for https://${DOMAIN} ..."
docker compose -p medsearch -f docker-compose.shared-server.yml up -d --build --remove-orphans

sleep 6
curl -fsS "http://127.0.0.1:3010/health" | head -c 400
echo ""
echo "OK — app is up on 127.0.0.1:3010"
echo "Next: add deploy/hetzner/Caddyfile.signalmd.snippet to host Caddy, then:"
echo "  sudo systemctl reload caddy   # or: docker exec <caddy> caddy reload"
echo "  curl -fsS https://${DOMAIN}/health"
