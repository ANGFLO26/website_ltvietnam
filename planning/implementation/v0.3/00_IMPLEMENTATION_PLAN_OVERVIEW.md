# 00 — IMPLEMENTATION PLAN OVERVIEW — WEBSITE LT VIETNAM

**Plan version:** v0.3
**Ngày:** 2026-07-22
**Trạng thái:** `PROPOSED FOR FINAL VERIFICATION` (KHÔNG Approved / KHÔNG READY TO CODE / KHÔNG PLANNING COMPLETE)
**Tác giả:** Claude (Round 5B — correction pass sau ChatGPT Final Reconciliation Review)
**Nguồn thiết kế:** `doc/00`–`10` v1.2.1 (Approved) + `doc/verify/` (PostgreSQL 16 ALL CHECKS PASSED).
**Đầu vào Round 5B:** ChatGPT reconciliation review + decisions **D17–D20** + 14 correction (`14`).

---

## 1. v0.3 khác v0.2 ở đâu

Plan v0.2 được đánh giá **khả thi, không Critical, issue Codex Round 3 đã sửa tốt, không cần viết lại**. v0.3 là **correction pass nhỏ**:
- **D17:** chấp nhận **Next-delivery redirect** (Nest authoritative + Next emit redirect-before-render) → `12` §8 = `DESIGN CLARIFICATION ACCEPTED`.
- **D18:** API compatibility policy (B26) **CONFIRMED**.
- **D19:** idempotency **fingerprint durable DB** (migration 071+).
- **D20:** public media **`/media/*`** + document download qua Nest.
- **Gate tách đôi:** **Gate A Plan Approval** vs **Gate B Coding Start** — Git chỉ chặn Gate B.
- **B23–B26 staging đúng** (không before-P0 blocker).
- **Exact HTTP 301** + cache invalidation + P0 technical spike.
- **Health tách 4 loại**; SMTP lỗi không chặn nhận Inquiry.
- **Migration materialization = CASE B** (chỉ có aggregate SQL; P1 phải materialize).
- **13 phase labels**; `/tim-kiem` **product-only**.
- **Performance budget có số/range**; CM2 production guard; outbox reconciliation report.

## 2. Ranh giới Round 5B
Không code/migration SQL/init-Git; không sửa `doc/` Approved; không sửa `v0.1/`,`v0.2/`; không tự phê duyệt; không ADR mới. Diễn giải Approved ghi rõ + nguồn (`14` PHẦN C).

## 3. Kiến trúc thành phần — 25 application modules + components riêng

**25 application modules (Approved `06` §I):** auth, users, media, settings, pages, homepage, brands, product-categories, standards, applications, industries, products, services, customers, projects, post-categories, posts, documents, offices, navigation, redirects, search, inquiries, seo, health.

**Components riêng:** Infrastructure (config, logging, errors, DB pool, migration executor, StoragePort, SMTP adapter, reverse proxy) · **Worker** process riêng (D6) · **Frontend app** = một Next.js (public + `/admin`, D2) · Shared services (SlugService, PublishService, MediaUsageService, filter builder, canonical/robots resolver, locale condition, ContentBlock/ExternalVideo validator, route-resolution).

> Ma trận `05` có requirement rows ≠ số module. Inventory = **25**.

## 4. Chiến lược
Hybrid: foundation P0–P3 · **thin vertical P4–P7** (DB→API→minimal Admin→minimal Public→browser E2E) · convergence P8 · completion P9/P10 · release P11. Content migration CM0–CM4 song song. Chi tiết `02`.

## 5. Critical path

```
P0 decisions+Git → P1 raw DB baseline(materialize) → P2 core/auth → P3 media+content-security
   → P4 taxonomy+redirect-proof → P5 PRODUCT thin vertical
   → P6A content core → P6B relationships
   → P8 web delivery (nav/homepage/redirect/SEO) → P10 public completion
   → P11 content delta + hardening + release
```
**P7 (inquiry+worker) SONG SONG** sau P5+service core. Nút thắt: P5 products; P6B+P8 fan-in; topology routing/SEO/redirect (kiến trúc, trước P4).

## 6. 13 Phase labels (chi tiết `04`)

**13 phase labels:** P0, P1, P2, P3, P4, P5, **P6A**, **P6B**, P7, P8, P9, P10, P11.

| Phase | Tên | Sản phẩm chính |
|---|---|---|
| P0 | Technical Decisions, Git Integrity & Repository Bootstrap | D1–D20 + B22–B26; Git hợp lệ; skeleton monorepo; codegen/compat tooling; **HTTP 301 spike** |
| P1 | Raw SQL Database Baseline & Bootstrap Separation | **materialize 001–070** (CASE B) + manifest/checksum + 3 seed pipeline + backup/restore |
| P2 | Core Platform, Auth, Settings & Health Registry | config→logging→DB; auth one-way; settings; health (liveness/readiness DB); audit log |
| P3 | Media, Storage & Shared Content Security | upload/image/PDF hardening; MediaUsageService; ContentBlock/ExternalVideo validator; storage probe |
| P4 | Taxonomy Thin Verticals & Redirect Delivery Proof | 5 taxonomy + SlugService; **explicit 301 qua topology**; thin Admin/Public + E2E |
| P5 | Product Thin Vertical | products + filter/**product-search**/landing + PublishService; concurrency; thin UI + E2E |
| P6A | Core Content Entities | pages/customers/offices/post_categories; services/documents/posts/projects core |
| P6B | Cross-module Content Relationships | link tables + replace-set + integration E2E |
| P7 | Inquiry & Outbox Worker (parallel) | form + API + worker process + fingerprint(071+) + reconciliation report |
| P8 | Web Delivery: Navigation, Homepage, Redirects & SEO | mega menu, homepage, redirect delivery, SEO resolver, sitemap/robots (Nest) — **no new search** |
| P9 | Admin Completion | hoàn thiện editor/component/a11y; no Users CRUD, no auto-save advanced |
| P10 | Public Completion | hoàn thiện layout/system pages/a11y/perf; redirect-before-render; locale mapping |
| P11 | Content Delta, Integration, Hardening & Release | CM4 cutover; mixed-version/blue-green; backup/restore; worker drain; go-live |

Content migration **CM0–CM4** song song P4–P11 (`13`).

## 7. HAI GATE (tách — Correction 1)

### Gate A — Plan Approval Gate (→ v1.0 / PLANNING COMPLETE / APPROVED FOR IMPLEMENTATION)
- [ ] Không Critical; không High chưa xử lý; Medium có disposition.
- [ ] D1–D20 ghi nhận; **D17 accepted**; **D18/B26 chốt**.
- [ ] Dependency/sequence/test/rollback/RACI đầy đủ.
- [ ] Không design conflict chưa có disposition.
- [ ] **Codex final verification PASS**.
- [ ] **Người dùng phê duyệt plan**.
> **Git chưa hợp lệ KHÔNG làm plan chưa hoàn chỉnh** — không phải điều kiện Gate A.

### Gate B — Coding Start Gate (→ `P0 READY TO START`)
- [ ] **Git repository hợp lệ** (root/main/remote-hoặc-no-remote/baseline-commit/tag `docs-v1.2.1-approved`) — **R-25 blocker của Gate B**.
- [ ] Node/toolchain chạy; Docker/PostgreSQL sẵn sàng; branch/PR/CI/evidence structure sẵn sàng.
- [ ] Stack/runtime/topology/migration/worker decisions locked; B26 tooling trong P0 acceptance.
- [ ] Phase P0 đạt DoR.

## 8. Bộ 16 file v0.3
`00`–`13` (như v0.2, cập nhật) + `14` (Round 5 correction disposition) + `PLAN_CHANGELOG`.

## 9. Blocker phân loại (chi tiết `10` §S)
- **Gate A (Plan Approval):** không còn blocker kỹ thuật; chờ Codex final verification + user duyệt.
- **Gate B (Coding Start):** **Git R-25** (chưa khôi phục).
- **Phase-specific open:** B23/B24 (before-P2), B25 (before-P3), SMTP/CAPTCHA (before-P7), domain (before-P8/P10).
- **Release:** C5 SPF/DKIM/DMARC, C7 content owner, C9 RPO/RTO+freeze.
