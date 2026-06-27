#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/casaenplenitud"
ENV_FILE="$APP_DIR/.env"

echo "=== CasaEnPlenitudApp Deploy ==="

if [ ! -f "$ENV_FILE" ]; then
  if [ -f .env ]; then
    cp .env "$ENV_FILE"
    echo "Copied local .env to $ENV_FILE"
  else
    echo "ERROR: Create .env from .env.example first"
    exit 1
  fi
fi

set -a; source "$ENV_FILE"; set +a

echo "Pulling latest code..."
git pull

echo "Building and starting services..."
docker compose -f docker-compose.yml up --build -d

echo "Waiting for backend..."
sleep 10

echo "Running migrations..."
docker compose run --rm backend alembic upgrade head

echo "Seeding data..."
docker compose run --rm backend python scripts/seed_initial_data.py
docker compose run --rm backend python scripts/seed_demo_data.py || true

echo ""
echo "=== Deploy complete ==="
echo "Frontend: http://$(curl -s ifconfig.me 2>/dev/null || echo 'your-server-ip')"
echo "API:      http://$(curl -s ifconfig.me 2>/dev/null || echo 'your-server-ip')/api/v1/health"
echo ""
echo "Admin login: admin / ${INITIAL_ADMIN_PASSWORD:-Admin1234!}"
echo "Demo users:  asesor1 / Asesor1234, lider1 / Lider1234, colab1 / Colab1234"
