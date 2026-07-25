#!/usr/bin/env bash
# =====================================================================
# LT VIETNAM — SQL Execution Verification (v1.2.1) — bash/CI
# Chạy toàn bộ bài kiểm tra trên PostgreSQL 16 thật.
#
# Yêu cầu: có `psql` (client Postgres 16) trỏ tới một server Postgres 16.
# Ví dụ khởi động server bằng Docker:
#   docker run -d --name ltv-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
#   export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGPASSWORD=postgres
#   ./run_verification.sh
# =====================================================================
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"

: "${PGHOST:=localhost}"
: "${PGPORT:=5432}"
: "${PGUSER:=postgres}"
: "${PGDATABASE:=ltv_verify}"
export PGHOST PGPORT PGUSER
[ -n "${PGPASSWORD:-}" ] && export PGPASSWORD

PSQL="psql -v ON_ERROR_STOP=1 -X -q"

echo "== 0. Tạo database rỗng: $PGDATABASE =="
$PSQL -d postgres -c "DROP DATABASE IF EXISTS \"$PGDATABASE\";"
$PSQL -d postgres -c "CREATE DATABASE \"$PGDATABASE\";"

echo "== 1. Migrate 001 -> 070 (schema_up.sql) =="
$PSQL -d "$PGDATABASE" -f "$DIR/schema_up.sql"

echo "== 2. Verify checks (63 bảng / extension / trigger / enum / unique / FK) =="
$PSQL -d "$PGDATABASE" -f "$DIR/verify_checks.sql"

echo "== 3. Rollback 070 -> 001 (schema_down.sql) =="
$PSQL -d "$PGDATABASE" -f "$DIR/schema_down.sql"

echo "== 3b. Xác nhận schema ltv đã bị xóa sau rollback =="
LEFT=$($PSQL -d "$PGDATABASE" -tAc "SELECT count(*) FROM information_schema.schemata WHERE schema_name='ltv';")
if [ "$LEFT" != "0" ]; then echo "FAIL: schema ltv vẫn còn sau rollback"; exit 1; fi
echo "PASS: schema ltv đã bị xóa"

echo "== 4. Migrate lần hai 001 -> 070 (idempotent trên DB rỗng) =="
$PSQL -d "$PGDATABASE" -f "$DIR/schema_up.sql"

echo "== 5. Dọn dẹp database =="
$PSQL -d postgres -c "DROP DATABASE IF EXISTS \"$PGDATABASE\";"

echo "==================================================================="
echo "  ALL STEPS PASSED — EXECUTION TESTED ON POSTGRESQL 16"
echo "==================================================================="
