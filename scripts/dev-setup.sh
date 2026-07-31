#!/usr/bin/env bash
# Dung moi truong phat trien tu dau.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> 1/5 Kiem Node"
node -e 'const v=process.versions.node.split(".")[0]; if(+v<22){console.error("Can Node >= 22, dang co "+process.versions.node);process.exit(1)}'
node -v

echo "==> 2/5 Cai dependency"
pnpm install --frozen-lockfile || pnpm install

echo "==> 3/5 Khoi dong PostgreSQL 16"
docker compose up -d postgres media-init
until docker compose exec -T postgres pg_isready -U ltv -d ltvn_dev >/dev/null 2>&1; do
  echo "   cho PostgreSQL..."; sleep 2
done

echo "==> 4/5 Tao .env neu chua co"
[ -f .env ] || { cp .env.example .env; echo "   da tao .env — NHO doi JWT_SECRET va PASSWORD_RESET_SECRET"; }

echo "==> 5/5 Chay migration"
pnpm db:migrate
pnpm db:status

echo
echo "Xong. Chay tiep:"
echo "  pnpm dev:api      # http://localhost:3001/health/live"
echo "  pnpm dev:web      # http://localhost:3000"
echo "  pnpm dev:worker"
