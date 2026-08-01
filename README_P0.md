# Khung P0 — Website LT Vietnam

Khung monorepo cho MVP. Baseline schema **v1.3 (52 bảng)** đã được kiểm chứng trên PostgreSQL 16.

## Cấu trúc

```text
apps/
├── api/         Nest Core API — /api/v1, health Model B
├── web/         Next.js — public + /admin (một app, D2)
└── worker/      Tiến trình outbox riêng (D6)
packages/
├── config/      Xác thực biến môi trường (không đọc DB)
├── contracts/   Bảng route + tập route bảo lưu sinh tự động
├── db/          Kysely + migration runner + 33 migration
└── testing/     Tiện ích test tích hợp
doc/verify/v1.3/ DDL có thẩm quyền
```

## Chạy lần đầu

```bash
./scripts/dev-setup.sh
```

Hoặc từng bước:

```bash
pnpm install
docker compose up -d postgres media-init
cp .env.example .env          # đổi JWT_SECRET và PASSWORD_RESET_SECRET
pnpm db:migrate
pnpm dev:api                  # http://localhost:3001/health/live
```

## Lệnh thường dùng

| Lệnh | Việc |
|---|---|
| `pnpm db:migrate` | Chạy migration còn thiếu |
| `pnpm db:status` | Xem migration nào đã apply |
| `pnpm db:rollback [n]` | Rollback n migration cuối (chỉ dùng khi kiểm thử) |
| `pnpm typecheck` | Kiểm kiểu toàn workspace |
| `pnpm test` | Chạy test |
| `./scripts/verify-schema.sh` | Kiểm chứng baseline trên PostgreSQL thật |

## Migration runner — bảo đảm gì

Hiện thực yêu cầu CASE B của kế hoạch P1:

- Số thứ tự duy nhất, liên tục; mỗi `up` bắt buộc có `down`
- Chạy từng migration một; DDL và ghi lịch sử **commit nguyên tử**
- Checksum SHA-256 từng file; **file đã apply bị sửa → fail closed**
- Advisory lock: hai runner chạy cùng lúc chỉ một cái apply
- Lịch sử bất thường (gap, trùng, sai thứ tự, migration lạ) → fail closed
- DDL không chạy được trong transaction được nhận diện và tách riêng

Gộp toàn bộ 33 file `up` **bằng đúng** `doc/verify/v1.3/schema_up.sql` — điều kiện aggregate equivalence của P1.

## Spike HTTP 301 — ĐÃ XONG, 15/15 PASS

Definition of Done của P0. Bằng chứng: `implementation/evidence/p0-spike-301/`.

**Phát hiện quyết định** — đo thật trên Next.js 15.5.22 production:

| Cách | Status | Body | Thỏa D17? |
|---|---:|---:|---|
| `redirect()` App Router | 307 | 5.858 B **có HTML** | ❌ |
| `permanentRedirect()` App Router | 308 | 5.861 B **có HTML** | ❌ |
| middleware `NextResponse.redirect(url, 301)` | **301** | **18 B** | ✅ |

Hai helper của App Router vi phạm ba yêu cầu cùng lúc: sai mã trạng thái, gửi kèm HTML đã render, và vì có HTML nghĩa là trang đã render xong rồi mới redirect.

**Ràng buộc:** `apps/web/src/middleware.ts` là nơi **duy nhất** phát redirect. Không thay bằng helper của App Router ở bất kỳ phase nào.

Next.js được ghim **chính xác 15.5.22** — bản 15.1.3 ban đầu dính CVE-2025-66478.

## Chưa có (đúng phạm vi P0)

Module nghiệp vụ (P2 trở đi) · lược đồ content block · thiết kế giao diện.

## Quyết định đã áp dụng

`D1` NestJS · `D2` một Next.js app · `D3` pnpm monorepo · `D4` Kysely + raw SQL · `D7` Docker Compose + PostgreSQL 16 · `D16` Node ≥ 22 · `FV-02` Readiness Model B · `D20` bốn lớp lưu trữ media · `ADR-002 §8` tập route bảo lưu sinh tự động.
