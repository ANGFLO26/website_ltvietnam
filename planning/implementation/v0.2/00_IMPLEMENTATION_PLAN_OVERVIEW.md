# 00 — IMPLEMENTATION PLAN OVERVIEW — WEBSITE LT VIETNAM

**Plan version:** v0.2
**Ngày:** 2026-07-22
**Trạng thái:** `PROPOSED FOR FINAL RECONCILIATION` (KHÔNG Approved / KHÔNG READY TO CODE / KHÔNG PLANNING COMPLETE)
**Tác giả:** Claude (Round 4 — response to Codex Round 3 audit)
**Nguồn sự thật thiết kế:** `doc/00`–`10` v1.2.1 (Approved) + `doc/verify/` (PostgreSQL 16 ALL CHECKS PASSED).
**Đầu vào Round 4:** `reviews/codex-round3/` (CR-01, HI-01..21, ME-01..08, LO-01, OBS-01..03) + quyết định người dùng **D1–D16**.

---

## 1. v0.2 khác v0.1 ở đâu (tóm tắt)

Round 3 (Codex) kết luận `PLAN NEEDS CORRECTIONS BEFORE RECONCILIATION`. Round 4 áp dụng **16 quyết định người dùng D1–D16** và **correction cho toàn bộ issue** (disposition ở `11`). Thay đổi lớn:

- **CR-01 giải quyết:** thêm request/deployment topology + routing matrix + single owner redirect/SEO (`12`).
- **DAG sửa chiều:** `config → logging/errors → DB → modules`; bỏ Auth↔Users cycle; health probe registry incremental.
- **Phase renumber:** tách **P6A/P6B**; đổi **P8 = Web Delivery (bỏ Search)**; **P9 Admin Completion / P10 Public Completion**; critical path **không còn P10→P8 cycle**; P7 chạy song song.
- **Scope leakage loại:** bỏ `/admin/users` CRUD và auto-save nâng cao khỏi P0.
- **Thin vertical thật:** P4–P7 mỗi slice có minimal Admin/Public UI + browser E2E.
- **Content Migration workstream** CM0–CM4 song song P4–P11 (`13`).
- **Stack chốt (D1–D16):** NestJS + một Next app (public + `/admin`) + worker process riêng, pnpm monorepo, Kysely runtime + raw SQL baseline, single VPS Docker Compose, Node 24/22.
- **Git integrity = P0 prerequisite** (repo `.git` hiện rỗng — R-25 OPEN BLOCKER).

## 2. Ranh giới nhiệm vụ (điều KHÔNG làm ở Round 4)

Không viết code/migration/source; không init/sửa Git; không sửa `doc/` Approved; không sửa `v0.1/`; không tự phê duyệt; không tạo ADR thiết kế mới. Mâu thuẫn Approved → ghi `DESIGN CLARIFICATION REQUIRED BEFORE CODE` (xem `12` §8 cho redirect delivery).

## 3. Kiến trúc thành phần — 25 application modules + components riêng

**25 application modules (Approved `06` §I):**
`auth, users, media, settings, pages, homepage, brands, product-categories, standards, applications, industries, products, services, customers, projects, post-categories, posts, documents, offices, navigation, redirects, search, inquiries, seo, health`.

**Components đếm RIÊNG (không phải application module):**
- **Infrastructure:** config, logging, error primitives, DB pool, migration executor, StoragePort adapter, SMTP adapter, reverse proxy.
- **Worker:** outbox worker **process riêng** (D6) — cùng codebase, không phải web module.
- **Frontend app:** một **Next.js** app (public routes + `/admin` route group — D2).
- **Shared services (cross-cutting, không phải module):** SlugService, PublishService, MediaUsageService, filter query builder, canonical/robots resolver, locale query condition, **ContentBlock/ExternalVideo validator** (đặt ở P3), route-resolution contract.

> Ma trận `05` có 30 **requirement rows** — KHÔNG suy ra số module từ số requirement. Inventory module = 25.

## 4. Chiến lược (chi tiết `02`)

**Hybrid — đã hiệu chỉnh sau audit:**
- **Foundation-first P0–P3** (tech decisions+Git · raw SQL baseline · core/auth/settings/health registry · media + shared content security).
- **Thin vertical slice P4–P7** — mỗi slice có **DB → API → minimal Admin → minimal Public → browser E2E** (không dồn FE về cuối): P4 taxonomy + redirect-delivery proof · P5 product · P6A content core · P6B relationships · P7 inquiry (parallel).
- **Completion P9/P10** — P9 Admin Completion, P10 Public Completion (polish/a11y/perf/hardening trên thin UI đã có; **không** bắt đầu FE ở đây).
- **Convergence P8** (web delivery: navigation/homepage/redirect/SEO) + **P11** (content delta/hardening/release).
- **Content Migration CM0–CM4** song song P4–P11.

## 5. Critical path (đã loại cycle — chi tiết `03`/`04`)

```
P0 decisions+Git → P1 raw DB baseline → P2 core/auth → P3 media+content-security
   → P4 taxonomy+redirect-proof → P5 PRODUCT thin vertical
   → P6A content core → P6B relationships
   → P8 web delivery (nav/homepage/redirect/SEO) → P10 public completion
   → P11 content delta + hardening + release
```
- **P7 (inquiry+worker) chạy SONG SONG** sau P5 + service core; chỉ ContactForm integration mới cần P7.
- **Admin workstream** chạy liên tục theo contract; **P9** chỉ hội tụ.
- **Nút thắt:** P5 products (nhiều phụ thuộc); P6B relationships + P8 homepage/sitemap (fan-in lớn); **topology routing/SEO/redirect là nút thắt kiến trúc trước cả P4**; Claude ownership shared service là nút thắt nguồn lực (giảm bằng RACI `08`).

## 6. 12 Phase (một dòng — chi tiết `04`)

| Phase | Tên | Sản phẩm chính |
|---|---|---|
| P0 | Technical Decisions, Git Integrity & Repository Bootstrap | D1–D16 chốt; Git hợp lệ; skeleton monorepo; codegen/compat tooling |
| P1 | Raw SQL Database Baseline & Bootstrap Separation | 001–070 raw + manifest/checksum/history; 3 seed pipeline; backup/restore drill |
| P2 | Core Platform, Auth, Settings & Health Registry | config→logging→DB; auth (one-way port); settings; health probe registry; audit log |
| P3 | Media, Storage & Shared Content Security | upload/image/PDF hardening; MediaUsageService; **ContentBlock/ExternalVideo validator**; storage probe |
| P4 | Taxonomy Thin Verticals & Redirect Delivery Proof | 5 taxonomy + SlugService; **redirect 301 chạy qua topology thật**; thin Admin/Public + E2E |
| P5 | Product Thin Vertical | products + filter/search/landing + PublishService; concurrency; thin Admin/Public + E2E |
| P6A | Core Content Entities | pages/customers/offices/post_categories; services/documents/posts/projects core |
| P6B | Cross-module Content Relationships | link tables + replace-set transaction + integration E2E |
| P7 | Inquiry & Outbox Worker (parallel) | form + API + **worker process** (drain/reaper/heartbeat) + email; failure/concurrency E2E |
| P8 | Web Delivery: Navigation, Homepage, Redirects & SEO | mega menu, homepage, redirect delivery, SEO resolver, root sitemap/robots — **no new search** |
| P9 | Admin Completion | hoàn thiện editor/component/a11y trên thin UI; no Users CRUD, no auto-save advanced |
| P10 | Public Completion | hoàn thiện layout/system pages/a11y/perf; redirect-before-render; locale mapping |
| P11 | Content Delta, Integration, Hardening & Release | CM4 cutover; mixed-version/blue-green; backup/restore; worker drain; go-live |

Content migration **CM0–CM4** chạy song song P4–P11 (`13`).

## 7. Gate chuyển planning → coding (bổ sung sau audit)

Ngoài gate v0.1 (không Critical, không High chưa xử lý, Medium có disposition, OPEN DECISION bắt buộc đã chốt, P0/P1 đạt DoR), thêm **gate mới**:
- [ ] **Git repository hợp lệ** (R-25 blocker — hiện `.git` rỗng).
- [ ] **Request topology + routing matrix** locked (`12`).
- [ ] **Deployment topology** locked (single persistent host — D7).
- [ ] **Raw migration policy** locked (baseline raw + checksum + 071+ — D5).
- [ ] **Supported Node runtime** locked (Node 24/22 — D16).
- [ ] **Worker model** locked (process riêng — D6).
- [ ] **Route/SEO owner** locked (Nest authoritative + Next delivery — D11/D12).
- [ ] **API compatibility policy** locked (breaking-change + generated-client + mixed-version — B26).
- [ ] **D11 redirect-delivery clarification** được user/architecture ký (`12` §8).

## 8. Bộ file v0.2 (15 file)

`00` overview (file này) · `01` decisions (D1–D16 + open staged) · `02` strategy · `03` DAG · `04` phases · `05` matrix · `06` test/quality · `07` DoR/DoD · `08` collaboration/RACI/Git · `09` risk register · `10` **Final Reconciliation Package** · `11` **Round3 issue disposition** · `12` **Request routing & deployment topology** · `13` **Content migration workstream** · `PLAN_CHANGELOG`.

## 9. Câu hỏi còn mở cho người dùng (chi tiết `01` §4, `10`)

Business decisions không chặn P0 nhưng chặn release: content/data migration **business owner** (OPEN ASSIGNMENT), canonical production domain, backup RPO/RTO, content freeze/cutover window, SPF/DKIM/DMARC, retention inquiry, redirect SP ngừng KD. **Blocker P0 duy nhất:** Git integrity (R-25).
