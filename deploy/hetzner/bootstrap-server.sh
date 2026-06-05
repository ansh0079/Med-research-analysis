#!/usr/bin/env bash
# One-time Hetzner VPS setup (Ubuntu 24.04).
# Run as root: bash deploy/hetzner/bootstrap-server.sh
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/hetzner/bootstrap-server.sh"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get upgrade -y
apt-get install -y ca-certificates curl git ufw fail2ban

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

if ! docker compose version >/dev/null 2>&1; then
  apt-get install -y docker-compose-plugin
fi

# Firewall: SSH + HTTP/S only
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

systemctl enable docker
systemctl start docker
systemctl enable fail2ban
systemctl start fail2ban

echo ""
echo "Bootstrap complete."
echo "Next:"
echo "  1. Add your SSH key if not already on the server"
echo "  2. Clone the repo to /opt/medsearch (or similar)"
echo "  3. cp deploy/hetzner/env.example .env && edit secrets"
echo "  4. docker compose -f docker-compose.hetzner.yml up -d --build"
