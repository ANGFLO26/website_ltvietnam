# VERIFY — SQL Execution Verification cho schema LT Vietnam (v1.2.1)

**Ngày:** 2026-07-21
**Nguồn:** trích **trung thực** từ `../05_DATABASE_SCHEMA_POSTGRESQL.md` (v1.2.1). KHÔNG đổi kiến trúc.
**Baseline:** migration **001–070** (ADR-013) — baseline duy nhất active, **không có 071**. `schema_up.sql` đại diện toàn bộ 001–070; khi bắt đầu code có thể tách thành 70 file riêng.

> ⚠️ **Trạng thái hiện tại: `STATIC VALIDATION ONLY`.** Bộ file này **chưa được chạy** trên PostgreSQL thật (máy soạn tài liệu không có PostgreSQL/Docker/psql). Chỉ sau khi bạn/CI chạy `run_verification` PASS toàn bộ mới được ghi `EXECUTION TESTED ON POSTGRESQL 16` và mới đề xuất chuyển tài liệu sang `Approved` / `READY FOR IMPLEMENTATION`.

---

## Nội dung thư mục

| File | Vai trò | Ánh xạ tới `05` |
|---|---|---|
| `schema_up.sql` | Tạo toàn bộ schema baseline 001–070 (extensions → schema → function → 63 bảng → index → 23 trigger) | PHẦN I–XII + thứ tự PHẦN XIV |
| `schema_down.sql` | Rollback 070→001 (drop trigger → drop 63 bảng ngược thứ tự → function → schema → extensions) | PHẦN XV |
| `verify_checks.sql` | Assertions: 63 bảng, 3 extension, 23 trigger, 12 `first_published_at`, 0 `social_image_id`, enum/unique/FK/CASCADE | PHẦN XV + XVI + 03 PHẦN XIX |
| `run_verification.sh` / `run_verification.ps1` | Điều phối: DB rỗng → up → checks → down → up lần hai → dọn | mục VIII quy trình |

---

## Cách chạy

### Cách 1 — Docker (khuyến nghị)
```bash
docker run -d --name ltv-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGPASSWORD=postgres
cd doc/verify && ./run_verification.sh
# Windows PowerShell:
#   $env:PGHOST="localhost"; $env:PGPORT="5432"; $env:PGUSER="postgres"; $env:PGPASSWORD="postgres"
#   .\run_verification.ps1
# Dọn container: docker rm -f ltv-pg
```

### Cách 2 — psql local (đã có Postgres 16)
```bash
export PGHOST=... PGPORT=5432 PGUSER=... PGPASSWORD=...
cd doc/verify && ./run_verification.sh
```

### Chạy thủ công từng bước
```bash
psql -v ON_ERROR_STOP=1 -d postgres -c 'CREATE DATABASE ltv_verify;'
psql -v ON_ERROR_STOP=1 -d ltv_verify -f schema_up.sql
psql -v ON_ERROR_STOP=1 -d ltv_verify -f verify_checks.sql
psql -v ON_ERROR_STOP=1 -d ltv_verify -f schema_down.sql
psql -v ON_ERROR_STOP=1 -d ltv_verify -f schema_up.sql
```

Biến môi trường: `PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE` (mặc định DB `ltv_verify`).

---

## Checklist 10 bước (khớp yêu cầu)

1. Tạo database rỗng.
2. `psql -f schema_up.sql` — migrate 001→070.
3. **63 bảng** trong schema `ltv` (verify_checks kiểm).
4. Extensions `pgcrypto, citext, pg_trgm` tồn tại.
5. FK / index / **23 trigger** `updated_at` tạo đúng.
6. Trigger `set_updated_at` gắn tại **migration 070**.
7. Enum: `inquiries.email_status='received'` **bị từ chối**; `inquiry_outbox.status='processing'` **được chấp nhận**; `documents.document_type='video'` **bị từ chối**.
8. Unique: trùng `idempotency_key` bị chặn; trùng `(inquiry_id, channel, recipient)` bị chặn. (+ FK RESTRICT xóa media đang dùng bị chặn; CASCADE xóa product → translations mất.)
9. `psql -f schema_down.sql` — rollback 070→001; schema `ltv` biến mất.
10. `psql -f schema_up.sql` lần hai — migrate lại thành công.

**Kết quả kỳ vọng:** mọi bước in `PASS: …` và kết thúc `ALL STEPS PASSED — EXECUTION TESTED ON POSTGRESQL 16`. Bất kỳ FAIL nào làm `psql` dừng (exit ≠ 0) do `ON_ERROR_STOP=1`.

---

## Static validation đã thực hiện (tại máy soạn tài liệu, không có Postgres)
- `schema_up.sql`: đếm **63** `CREATE TABLE`; **23** `CREATE TRIGGER … set_updated_at`; đủ 3 extension + function + `SET search_path`; mỗi tên index chỉ `CREATE` một lần; spot-check thứ tự FK (bảng con tạo sau bảng cha).
- `schema_down.sql`: drop đủ 63 bảng (ngược thứ tự) + function + schema + extensions.
- **Chưa** chạy execution ⇒ trạng thái `STATIC VALIDATION ONLY`.

## Sau khi execution PASS
Ghi kết quả vào `../10_CHANGELOG_DONG_BO_TAI_LIEU.md` (mục SQL) là `EXECUTION TESTED ON POSTGRESQL 16`, kèm phiên bản Postgres và ngày chạy; khi đó mới đề xuất chuyển `00_README` sang `Approved` / `READY FOR IMPLEMENTATION`.
