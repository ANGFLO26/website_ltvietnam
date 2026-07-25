# 01 — LOCKED DECISIONS & OPEN QUESTIONS

**Plan version:** v0.2 · **Trạng thái:** PROPOSED FOR FINAL RECONCILIATION · **Ngày:** 2026-07-22

Bốn nhóm: **LOCKED** (thiết kế Approved) · **USER-CONFIRMED** (D1–D16 — implementation technology decision người dùng đã chốt) · **OPEN DECISION** (còn mở, staged theo deadline) · **BUSINESS/IMPLEMENTATION DETAIL**.

> D1–D16 = **IMPLEMENTATION TECHNOLOGY DECISION — USER CONFIRMED**, KHÔNG nâng thành ADR thiết kế (không đổi kiến trúc/schema/URL/scope Approved).

---

## PHẦN A — LOCKED (thiết kế Approved v1.2.1 — giữ nguyên từ v0.1)

25 quyết định A1–A25 giữ nguyên (xem `v0.1/01` PHẦN A). **Sửa duy nhất theo audit:**
- **A2 (ME-01):** "phân lớp module + **25 application modules** MVP" (không phải 26). Infra/tooling, migration executor, **worker process**, và cross-cutting shared services (SlugService/PublishService/MediaUsageService/filter builder/canonical-robots resolver/ContentBlock-video validator/route-resolution) được đếm **riêng**, không phải application module mới.
- **A17/A20 (note ownership):** giữ quyết định Approved (SEO canonical/robots tự sinh; sitemap/robots backend; audit log structured) nhưng **thêm note**: implementation ownership phải chốt — **Nest** authoritative cho publication-state/locale-mapping/canonical-path/robots/SEO-title-description/hreflang-path/social-image/structured-data-input + **sinh sitemap/robots**; **Next** serialize `<head>`/JSON-LD + emit redirect-before-render. Một nguồn sự thật, không hai resolver nghiệp vụ (xem `12`, D11/D12).

Tóm tắt A1–A25 (trích): modular monolith REST `/api/v1` · PostgreSQL 16 schema `ltv`/UUID/CHECK/ext · **baseline 001–070 đóng băng, trigger 070, rollback 070→001** · URL phẳng + brand-profile≠brand-filter · slug không tái dùng + `first_published_at`×12 + SlugService 3-nguồn · inquiry lưu-DB-trước + outbox SKIP LOCKED+reaper + at-least-once + Message-ID từ `outbox.id` · locale publication 7 entity + không fallback brand · media RESTRICT/409/không SVG-video/magic-bytes · filter OR-AND · PATCH replace-set · catalogue integrity (brand_id NOT NULL, is_primary ở link) · SEO tự sinh · external_video youtube/vimeo · auth Argon2id+JWT cookie+CSRF+CORS · health live/ready + audit-log-không-bảng · Redis không bắt buộc · search pg_trgm · retention TBD.

---

## PHẦN B — USER-CONFIRMED (D1–D16) — loại khỏi Open Decision

| D | Quyết định | Thay cho OPEN v0.1 | Ghi chú implementation |
|---|---|---|---|
| **D1** | Backend = **NestJS** | B1 | Modular monolith, DI, module boundary; guard ở app composition |
| **D2** | Frontend = **một Next.js app** chứa public + `/admin` route group | B3+B4 | Không tạo Vite Admin riêng P0; same-origin giảm CORS/cookie; admin routes `no-store/dynamic`. Security boundary thật = Nest authorization, không phải tách bundle |
| **D3** | **pnpm workspace monorepo** | B5+B6 | `apps/{api,web,worker}` + `packages/{contracts,route-rules,config,testing,...}`. Chỉ mô tả kế hoạch, không tạo thư mục ở R4 |
| **D4** | Runtime data access = **Kysely**; raw SQL **bắt buộc** cho `FOR UPDATE SKIP LOCKED`, filter phức tạp, PG-specific | B2a | Không ORM che SQL ở nơi cần kiểm soát |
| **D5** | Migration = **raw SQL baseline 001–070** đã execution-tested; manifest/checksum + history; 071+ sau freeze; `down 070→001` chỉ verification cho **disposable/test DB**, không phải production strategy | B2b | **Không ORM-regenerate baseline** |
| **D6** | Worker = **process riêng** cùng monorepo; graceful shutdown/stop-claim/drain/heartbeat/readiness/reaper-ownership/lease-timeout/retry-backoff/structured log | B19 | **Không** chạy outbox scheduler như trách nhiệm chính trong web API process |
| **D7** | Deploy MVP = **single persistent VPS/host + Docker Compose** (Nginx/Caddy + Next web + Nest API + worker + PostgreSQL 16 + persistent media volume + backup DB+media); no serverless; no Redis P0 | B11 | Topology gốc — storage/cache/rate-limit/worker phụ thuộc |
| **D8** | Storage MVP = **persistent local volume** qua StoragePort/Adapter; cho phép chuyển S3/R2 sau; **không** dùng ephemeral container FS | B12 | |
| **D9** | Cache/rate-limit P0 = **in-process** (single-instance) qua abstraction/config; **chỉ phù hợp single-instance**; chuyển distributed store khi scale; **không tuyên bố multi-instance safe** | B18 | |
| **D10** | **Public request routing** qua reverse proxy (routing matrix ở `12`); browser dùng cùng public origin cho page và `/api/v1` | B22 (mới) | Domain thật = release decision |
| **D11** | **Nest authoritative** cho redirect records/slug lifecycle/route resolution/target validation/loop-chain prevention; **Next = HTTP page delivery adapter** (gọi internal route-resolution trước render, emit 301/302, không tự tạo logic redirect) | B22 | **DESIGN CLARIFICATION REQUIRED BEFORE CODE** cho literal "backend redirect middleware" — xem `12` §8 |
| **D12** | **Nest authoritative** cho publication-state/locale/canonical-relative-path/robots/SEO-title-desc/hreflang-path/social-image/structured-data-input/sitemap-robots-generation; **Next** SSR + serialize `<head>`/meta/canonical/robots/hreflang/OG/JSON-LD + render 404 theo locale. `packages/route-rules` chỉ chia sẻ route templates/kind-constants/contract-types/normalization thuần — **không** DB/business resolution | B22 | Không hai SEO resolver nghiệp vụ độc lập |
| **D13** | Nest sinh + phục vụ `/sitemap.xml`, `/sitemap-{locale}.xml`, `/robots.txt`; reverse proxy route các root URL này tới Nest | — | Đúng Approved `06` §XII |
| **D14** | **Content migration website cũ = workstream chính thức** song song P4–P11 | — | Chi tiết `13` (CM0–CM4) |
| **D15** | **Git integrity = prerequisite của P0**; R4 chỉ lập kế hoạch khôi phục; **không** chạy `git init/clone/remote` | — | R-25 OPEN BLOCKER |
| **D16** | **Node 24 LTS preferred** (nếu Nest/Next/dep compatibility PASS); **Node 22 LTS fallback** có thời hạn; **cấm runtime EOL** (Node 20); pin bằng toolchain file + CI | B21 | |

---

## PHẦN C — OPEN DECISIONS còn lại (staged theo deadline — ME-05)

### C.1. Tách B2 (HI-10) — đã chuyển thành D4/D5
- **B2a Runtime data access** = Kysely (D4) — CONFIRMED.
- **B2b Raw SQL migration executor/history/checksum** (D5) — CONFIRMED. Hai quyết định lifecycle/risk khác nhau, tách bạch.

### C.2. Open decisions mới thêm (từ audit)
| # | Quyết định | Deadline | Owner | Trạng thái |
|---|---|---|---|---|
| **B22** | Public routing + redirect/SEO delivery owner + routing matrix | Before P0 | User/Architecture | CONFIRMED bởi D10–D13 (chi tiết `12`) |
| **B23** | Cookie name/path/SameSite + API/admin/public origin + reverse-proxy trusted IP/TLS topology | Before P2 | Security/Ops | OPEN |
| **B24** | Auth session lifecycle: logout/revocation, key rotation, CSRF lifecycle, account-lock policy, trusted-proxy IP extraction | Before P2 | Security/User | OPEN |
| **B25** | Content-block schema + sanitization + image/PDF processing policy (dimensions/pixels/EXIF/timeout/memory/PDF active-content) | Before P3/P5 | Security/Architecture | OPEN |
| **B26** | API compatibility: breaking-change detection, generated-client codegen/freshness, deploy migration (expand/contract), mixed-version | Before P0 tooling; enforce P9–P11 | API/Release | OPEN |

### C.3. Bảng staging đầy đủ (deadline)

| Nhóm decision | Deadline | Owner |
|---|---|---|
| Deployment topology (D7) | Before P0 | User/Ops ✅ |
| Routing/redirect/SEO owner (B22/D10–D13) | Before P0 | User/Architecture ✅ |
| Admin shape — một Next app (D2) | Before P0 | User ✅ |
| Node supported LTS (D16) | Before P0 | Tech lead/User ✅ |
| Migration executor vs runtime query (D4/D5) | Before P0 | DB/Architecture ✅ |
| Cookie/origin/proxy trust (B23) | Before P2 | Security/Ops |
| Auth logout/revocation/key rotation (B24) | Before P2 | Security/User |
| Upload size/max dimensions/pixels/PDF/EXIF/timeout (B25) | Before P3 | Security/Ops |
| SMTP provider · CAPTCHA provider · worker batch/timeout · email recipient snapshot policy | Before P7 | User/Ops |
| Canonical production domain · final public base URL · OG defaults | Before P8/P10 | User/Ops |
| RPO/RTO · content freeze window · DNS/cutover · SPF/DKIM/DMARC · retention · discontinued-product policy | Before P11 | User/Ops |

### C.4. Hạ xuống IMPLEMENTATION DETAIL (ME-05 — không cần user chốt riêng)
B6 package manager (pnpm theo D3), **B7** test runner, **B15** logging library, **B20** lint/format — cùng formatter, unit-test runner, naming/class layout, exact image-variant names. Chọn theo chuẩn stack; chỉ nâng lên OPEN nếu team có constraint cụ thể.

---

## PHẦN D — BUSINESS DECISIONS (DN quyết — giữ từ v0.1 C1–C6 + bổ sung)

C1 retention inquiry (tháng) · C2 ai duyệt logo KH · C3 email xác nhận khách (P0/P1) · C4 redirect SP ngừng KD · C5 domain+SPF/DKIM/DMARC · C6 mức EN lúc launch. **Bổ sung (audit §N/HI-12):** **C7 content/data migration business owner = OPEN ASSIGNMENT** (chưa chỉ định); C8 quyền truy cập/crawl/export website cũ cho C/X; C9 RPO/RTO + content freeze window (release). Không câu nào chặn *tạo* plan; C5/C7/C9 chặn release; C7 chặn CM workstream.

## PHẦN E — IMPLEMENTATION DETAILS (không cần ADR)
Cấu trúc thư mục module, tên class/hàm, DTO nội bộ, validation lib (zod/class-validator), image variant naming, `external_url`↔`custom_url` (khuyến nghị `custom_url` cho cả hai khi code), format log line (miễn đủ field A20), backoff cụ thể trong khoảng 1p/5p/15p/1h/6h.
