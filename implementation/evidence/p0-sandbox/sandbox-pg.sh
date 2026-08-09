#!/usr/bin/env bash
# LUU TRU BANG CHUNG P0: script nay gan cung duong dan cua sandbox cu, khong dung cho local dev.
# CHI DUNG TRONG HOP CAT — khong phai mot phan cua he thong.
#
# Moi lan goi bash trong hop cat la mot tien trinh rieng, va PostgreSQL khoi dong
# boi lan goi truoc bi ket thuc cung lan goi do. Nen moi phep do phai tu khoi
# dong lai database trong CUNG mot lan goi.
#
# Cach dung:
#   source implementation/evidence/p0-sandbox/sandbox-pg.sh
set -u

export PATH="/sessions/serene-bold-lovelace/.local/bin:$PATH"
PGBIN="$(python3 -c "import pgserver,os;print(os.path.join(os.path.dirname(pgserver.__file__),'pginstall','bin'))")"
export PATH="$PGBIN:$PATH"
export PGURI="postgresql://postgres:@/postgres?host=/tmp/pgdata"
export DATABASE_URL="$PGURI"

# `pg_isready`, KHONG phai `[ -S socket ]`.
#
# Tap socket VAN CON sau khi tien trinh chet, nen phep kiem "co socket khong" bao
# la server dang chay roi moi lenh sau do that bai voi "Connection refused". Toi
# dinh dung dung cai bay do o lan chay dau.
if ! pg_isready -q -h /tmp/pgdata 2>/dev/null; then
  # `postmaster.pid` con lai tu tien trinh bi ket thuc cung lan goi bash truoc.
  # Khong don thi lan khoi dong sau co the cho ket qua "khong san sang" mot cach
  # ngau nhien — toi da gap dung dieu do giua mot loat phep do.
  rm -f /tmp/pgdata/postmaster.pid
  nohup python3 -c "
import pgserver, time
pgserver.get_server('/tmp/pgdata')
time.sleep(7200)
" >/tmp/pg-nohup.log 2>&1 &
  for _ in $(seq 1 90); do
    pg_isready -q -h /tmp/pgdata 2>/dev/null && break
    sleep 1
  done
fi

pg_isready -h /tmp/pgdata >/dev/null 2>&1 || echo "PG KHONG SAN SANG — xem /tmp/pg-nohup.log"
