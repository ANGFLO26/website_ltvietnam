# 01 — LOCKED DECISIONS & OPEN QUESTIONS

**Plan version:** v0.3 · **Trạng thái:** PROPOSED FOR FINAL VERIFICATION · **Ngày:** 2026-07-22

Bốn nhóm: **LOCKED** (thiết kế Approved) · **USER-CONFIRMED** (D1–D20 implementation decisions) · **OPEN DECISION** (staged theo deadline) · **BUSINESS/IMPLEMENTATION DETAIL**.

> D1–D20 = IMPLEMENTATION TECHNOLOGY DECISION — USER-CONFIRMED, không nâng thành ADR thiết kế.

---

## PHẦN A — LOCKED (thiết kế Approved v1.2.1)
25 quyết định A1–A25 giữ nguyên (xem `v0.2/01` PHẦN A): modular monolith REST · PostgreSQL 16/schema `ltv`/UUID/CHECK/ext · baseline 001–070 (trigger 070, rollback 070→001, no 071 active) · URL phẳng + brand-profile≠brand-filter · slug không tái dùng + first_published_at×12 + SlugService 3-nguồn · inquiry lưu-DB-trước + outbox SKIP LOCKED+reaper + at-least-once + Message-ID · locale publication 7 entity + không fallback brand · media RESTRICT/409/no-SVG-video/magic-bytes · filter OR-AND · PATCH replace-set · catalogue integrity · SEO tự sinh · external_video · auth Argon2id+JWT cookie+CSRF+CORS · health live/ready + audit-log-không-bảng · Redis không bắt buộc · search pg_trgm · retention TBD. A2=**25 application modules**; A17/A20 note ownership (Nest authoritative + Next serialize).

---

## PHẦN B — USER-CONFIRMED

### B.1. D1–D16 (giữ từ v0.2)
D1 NestJS · D2 một Next app (public+`/admin`) · D3 pnpm monorepo (apps/api,web,worker; packages/contracts,route-rules,config,testing) · D4 Kysely runtime + raw SQL bắt buộc · D5 raw SQL baseline 001–070 + manifest/checksum + 071+ (down chỉ disposable) · D6 worker process riêng (drain/lease/heartbeat/reaper) · D7 single VPS Docker Compose (no serverless/no Redis P0) · D8 persistent volume StoragePort · D9 in-process cache/rate-limit single-instance only · D10 reverse-proxy routing matrix · D11 Nest authoritative redirect + Next delivery · D12 Nest authoritative SEO + Next serialize · D13 sitemap/robots ở Nest · D14 content migration workstream · D15 Git integrity (nay = **Gate B** prerequisite) · D16 Node 24/22, cấm EOL.

### B.2. D17–D20 (mới — Round 5B)

| D | Quyết định | Chi tiết |
|---|---|---|
| **D17** | **Next-delivery redirect ACCEPTED** | Nest authoritative: redirect records/slug lifecycle/route resolution/target validation/loop-chain prevention. Next = HTTP delivery adapter: gọi Nest route resolver **trước SSR/render**, emit redirect HTTP **trước render**, không business logic redirect. Đây là diễn giải chấp nhận cho "backend redirect middleware" (Approved `06` §IX). `12` §8 = **`DESIGN CLARIFICATION ACCEPTED — NEXT-DELIVERY INTERPRETATION`**. **Không Backend-Gateway ở P0.** |
| **D18** | **API compatibility policy (B26 CONFIRMED)** | `/api/v1` backward-compatible; field mới optional/default tương thích; không đổi nghĩa/xóa/rename field trong compatibility window; breaking thật → `/api/v2` hoặc deprecation/migration plan được duyệt. CI: OpenAPI breaking-change detection + fail khi generated client stale. Nest-mới chạy với Next-cũ và ngược lại trong deployment window. DB: **expand → migrate/backfill → contract**. **B26 OPEN → USER-CONFIRMED.** |
| **D19** | **Idempotency request fingerprint** | Fingerprint **lưu bền vững trong PostgreSQL** (không memory-only). Schema qua **migration 071+** (không sửa 001–070; không tạo migration ở Round này). Khuyến nghị thêm `request_fingerprint` vào inquiry/idempotency data. Nếu DB đã có data → **add nullable → dual-write → backfill → validate → set constraint bằng migration sau** (không NOT NULL phá data). Behavior: same key+same fp → result cũ (không tạo mới); same key+diff fp → **`409 IDEMPOTENCY_KEY_REUSED`** (không lộ payload cũ). Fingerprint input: canonicalized name/email/phone/product-service-ref/message/locale/destination; **loại** timestamp/request_id/volatile-headers/CAPTCHA token. |
| **D20** | **Public media delivery** | Public image/media variants qua reverse proxy prefix **`/media/*`** → persistent media volume/StorageAdapter. File công khai: generated/storage-safe path (**không** dùng filename user trực tiếp), MIME đúng, **`X-Content-Type-Options: nosniff`**, cache theo version/hash, no path traversal, no directory listing, cache-key không phụ thuộc Host header không tin cậy, variant mới = URL/version mới, soft-deleted theo purge/retention + orphan reconciliation. Document/PDF cần publication check vẫn qua Nest **`/api/v1/documents/:slug/download`** (Nest kiểm published/locale/deleted/existence → stream **hoặc** protected internal redirect `X-Accel-Redirect`). Client **không** suy ra filesystem path. |

---

## PHẦN C — OPEN DECISIONS (staged — SỬA Correction 2)

### C.1. Tách B2 → B2a (Kysely, D4) + B2b (raw SQL migration executor/checksum, D5). B22 = routing/SEO owner (D10–D13/D17). B26 = D18.

### C.2. Bảng staging (SỬA — B23–B25 KHÔNG phải before-P0 blocker)

| Nhóm decision | Deadline | Owner | Trạng thái |
|---|---|---|---|
| **Before Plan v1.0** | | | |
| D17 Next-delivery clarification | Before v1.0 | User/Architecture | **ACCEPTED** ✅ |
| D18/B26 API compatibility | Before v1.0 | API/Release | **CONFIRMED** ✅ |
| Critical/High disposition hoàn thành | Before v1.0 | Plan owner | ✅ (`11`/`14`) |
| **Before P0 coding (Gate B)** | | | |
| Git hợp lệ (R-25) | Before P0 | User | OPEN BLOCKER (Gate B) |
| Stack/runtime/topology/migration/worker locked | Before P0 | User/Arch | ✅ (D1–D16) |
| B26 tooling trong P0 acceptance | Before P0 | API owner | ✅ (D18 → `04` P0) |
| **Before P2** | | | |
| **B23** cookie/origin/trusted proxy | Before P2 | Security/Ops | OPEN |
| **B24** auth session/logout/revocation/key-rotation/account-lock | Before P2 | Security/User | OPEN |
| **Before P3** | | | |
| **B25** content-block/image/PDF processing policy | Before P3 | Security/Arch | OPEN |
| **Before P7** | | | |
| SMTP · CAPTCHA · worker batch/timeout · recipient snapshot policy | Before P7 | User/Ops | OPEN |
| **Before P8/P10** | | | |
| Canonical production domain · public base URL · OG defaults | Before P8/P10 | User/Ops | OPEN |
| **Before P11** | | | |
| RPO/RTO · content freeze · DNS/cutover · SPF/DKIM/DMARC · retention · discontinued-product policy | Before P11 | User/Ops | OPEN |

> **KHÔNG** còn câu "D1–D16 + B22–B26 đều phải chốt before-P0" (Correction 2). B23/B24 = before-P2; B25 = before-P3.

### C.3. IMPLEMENTATION DETAIL (không cần user chốt riêng)
B6 pnpm (D3), B7 test runner, B15 logging library, B20 lint/format, formatter, naming, image-variant names.

---

## PHẦN D — BUSINESS DECISIONS (DN)
C1 retention · C2 duyệt logo · C3 email xác nhận khách · C4 redirect SP ngừng KD · C5 domain+SPF/DKIM/DMARC · C6 mức EN · **C7 content/data migration business owner = OPEN ASSIGNMENT** · C8 quyền crawl/export site cũ · C9 RPO/RTO+freeze. Không chặn Gate A; C5/C7/C9 chặn release; C7 chặn CM.

## PHẦN E — IMPLEMENTATION DETAILS
Cấu trúc thư mục, tên class/hàm, DTO nội bộ, validation lib, image variant naming, `external_url`↔`custom_url` (dùng `custom_url` cả hai), format log line, backoff cụ thể trong khoảng 1p/5p/15p/1h/6h.
