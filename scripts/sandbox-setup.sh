#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# Dung moi truong kiem thu trong sandbox Linux (KHONG co Docker, khong sudo).
#
# Khac `dev-setup.sh`: kich ban do dung Docker Compose, danh cho may that.
# Kich ban nay chay PostgreSQL 16 THAT bang goi pip `pgserver`, khong can
# quyen quan tri va khong can container.
#
# Vi sao chep ma nguon sang /tmp: thu muc lam viec duoc gan qua he thong tep
# cua Windows, va `node_modules` tren do cham toi muc khong dung duoc.
#
#   bash scripts/sandbox-setup.sh          # dung tu dau
#   bash scripts/sandbox-setup.sh sync     # chi dong bo ma nguon (nhanh)
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
WORK=/tmp/p0
PGDATA=/tmp/pgdata
DB=ltvfinal
export PATH="$HOME/.local/bin:$HOME/.local/share/pnpm:$PATH"

sync_source() {
  mkdir -p "$WORK"
  rsync -a --delete \
    --exclude node_modules --exclude .git --exclude dist --exclude .next \
    "$REPO"/ "$WORK"/
}

if [ "${1:-}" = "sync" ]; then
  echo "==> dong bo ma nguon"
  rsync -a --delete "$REPO/backend/src/"  "$WORK/backend/src/"
  rsync -a          "$REPO/backend/test/" "$WORK/backend/test/"
  echo "xong"
  exit 0
fi

echo "==> 1/5 pgserver (PostgreSQL 16 khong can Docker)"
python3 -c 'import pgserver' 2>/dev/null || pip install pgserver --break-system-packages -q

echo "==> 2/5 pnpm"
command -v pnpm >/dev/null || npm i -g pnpm@10.34.5 --silent

echo "==> 3/5 chep ma nguon sang $WORK"
sync_source

echo "==> 4/5 cai dependency"
cd "$WORK" && pnpm install --silent 2>&1 | tail -3

echo "==> 5/5 khoi dong PostgreSQL va dung so do"
python3 - <<PY
import sys, subprocess, pgserver
srv = pgserver.get_server("$PGDATA")
uri = srv.get_uri()
import re
def psql(sql, db=None):
    return srv.psql(sql) if db is None else subprocess.run(
        ["psql", uri.replace("/postgres", "/"+db), "-c", sql], capture_output=True, text=True)
try:
    srv.psql("CREATE DATABASE $DB")
except Exception as e:
    pass
print("PostgreSQL san sang:", srv.get_uri())
PY

echo
echo "Xong. Chay test:"
echo "  cd $WORK/backend && DATABASE_URL='postgresql://postgres@/$DB?host=$PGDATA' pnpm vitest run"
