#!/usr/bin/env bash
# Kiem chung baseline v1.3 tren PostgreSQL that.
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${1:-ltvn_verify}"

echo "==> Tao database $DB"
dropdb --if-exists "$DB"; createdb "$DB"

echo "==> Chay schema_up.sql"
psql -v ON_ERROR_STOP=1 -d "$DB" -f doc/verify/v1.3/schema_up.sql >/dev/null

n=$(psql -tAd "$DB" -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='ltv' AND table_type='BASE TABLE';")
fk=$(psql -tAd "$DB" -c "SELECT count(*) FROM information_schema.table_constraints WHERE constraint_schema='ltv' AND constraint_type='FOREIGN KEY';")
ix=$(psql -tAd "$DB" -c "SELECT count(*) FROM pg_indexes WHERE schemaname='ltv';")
tg=$(psql -tAd "$DB" -c "SELECT count(*) FROM information_schema.triggers WHERE trigger_schema='ltv';")
echo "    bang=$n (ky vong 52)  FK=$fk (95)  index=$ix (180)  trigger=$tg (28)"

echo "==> Kiem khong con FK thieu index"
miss=$(psql -tAd "$DB" -c "
 SELECT count(*) FROM pg_constraint c
 WHERE c.contype='f' AND c.connamespace='ltv'::regnamespace AND array_length(c.conkey,1)=1
 AND NOT EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid=c.conrelid AND i.indkey[0]=c.conkey[1]);")
echo "    FK thieu index = $miss (ky vong 0)"

echo "==> Nap du lieu mau va chay truy van thu"
psql -v ON_ERROR_STOP=1 -d "$DB" -f doc/verify/v1.3/seed_test.sql >/dev/null
echo -n "    loc theo hang me PAC: "
psql -tAd "$DB" -c "
 SELECT count(*) FROM ltv.products p WHERE p.status='published' AND p.brand_id IN (
   SELECT id FROM ltv.brands WHERE slug='pac'
   UNION SELECT id FROM ltv.brands WHERE ancestor_ids @> ARRAY[(SELECT id FROM ltv.brands WHERE slug='pac')]);"

echo "==> Rollback"
psql -v ON_ERROR_STOP=1 -d "$DB" -f doc/verify/v1.3/schema_down.sql >/dev/null
echo "    xong"
