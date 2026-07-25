# 04 — PHASES, MILESTONES & CRITICAL PATH

**Plan version:** v0.3 · **Trạng thái:** PROPOSED FOR FINAL VERIFICATION · **Ngày:** 2026-07-22

**13 phase labels:** P0, P1, P2, P3, P4, P5, **P6A, P6B**, P7, P8, P9, P10, P11 + Content Migration CM0–CM4 song song (`13`). Ký hiệu: **C**=Claude, **X**=Codex. Rollback theo **side-effect** (không "revert code" đơn lẻ). Giữ 24 mục/phase; nhấn correction Round 5B.

**Phase rollback modes:** code revert · feature disable · stop writes · worker drain · forward fix · data repair · expand/contract migration · cache purge · restore backup · blue/green · content/redirect snapshot restore.

---

## PHASE 0 — Technical Decisions, Git Integrity & Repository Bootstrap

- **Mục tiêu:** Chốt D1–D20 + before-P0; **Git hợp lệ (Gate B)**; skeleton monorepo; **codegen/compat tooling (D18)**; **HTTP 301 spike (Correction 3)**.
- **Đầu vào:** D1–D20; `01` staging; `12` topology.
- **Backend:** skeleton NestJS; `packages/{contracts,route-rules,config,testing}` (mô tả); **B26/D18 tooling**: OpenAPI lint + breaking-change check + generated-client freshness + contract package versioning + consumer smoke skeleton + expand/contract policy.
- **Admin/Public FE:** skeleton một Next app (public+`/admin`); i18n `/en`.
- **Worker:** skeleton worker process (D6).
- **API:** quy ước `/api/v1`, response/error A24, routing matrix (`12`), route-resolution contract.
- **Git (Gate B — chỉ lập kế hoạch, KHÔNG chạy lệnh Git):** checklist §Git.
- **HTTP 301 spike (P0 deliverable — Correction 3):** "Verify explicit HTTP 301 mechanism against exact Next.js version" → chứng minh status **301** · **trước render** · với reverse proxy · với route cache invalidation.
- **Tests:** pipeline xanh; compose up (PG16+web+api+worker skeleton); OpenAPI validate; **generated-client freshness job**; Playwright mẫu; `.gitignore` secret; Node pinned (D16).
- **Migration:** executor kết nối PG16 (chưa 001–070).
- **Acceptance:** repo build xanh; **Git hợp lệ** (Gate B); D1–D20 + B22–B26 ghi decision log; routing matrix locked; **301 spike PASS**; B26 tooling chạy.
- **Evidence:** CI log; compose log; Git verify; 301 spike report (`implementation/evidence/<sha>/P0/`).
- **Rollback:** code revert scaffold. Git init sai → user quyết (không tự xóa `.git`).
- **Out-of-scope:** bảng/endpoint nghiệp vụ.
- **Rủi ro:** R-25 Git (**Gate B blocker**), R-26 Node EOL, R-24 topology, R-23 routing.
- **Ai:** C (skeleton) sau Git hợp lệ; User chạy lệnh Git; X review.
- **Điều kiện chuyển (→ `P0 READY TO START` là điều kiện Gate B):** Git hợp lệ; 301 spike PASS; DoR P1.

### §Git checklist (Gate B — không chạy lệnh Git ở planning)
Xác định repo gốc → restore/clone nguồn đúng (nếu có) / user phê duyệt init mới (nếu chưa từng) → xóa `.git` rỗng chỉ sau user xác nhận → verify `rev-parse`/`status`/branch/remote-hoặc-no-remote/first-commit/tag `docs-v1.2.1-approved` → không code khi chưa hợp lệ.

---

## PHASE 1 — Raw SQL Database Baseline & Bootstrap Separation

- **Mục tiêu:** **Materialize** executable migration **001–070** (CASE B — Correction 5) + manifest/checksum + 3 seed pipeline + backup/restore.
- **Đầu vào:** P0; `05` §XIV; `doc/verify/schema_up.sql`/`schema_down.sql`/`verify_checks.sql` (đối chiếu, không copy vào doc/).

> **Migration inventory (read-only, Correction 5):** `doc/verify/` **chỉ có aggregate** `schema_up.sql` (có **70 block markers `-- === 001..070 ===`**), `schema_down.sql`, `verify_checks.sql`. **KHÔNG có 70 file migration riêng lẻ** trong project. ⇒ **CASE B**: materialization là **P1 deliverable**.

- **Database (materialize 001–070 — 10 bước):**
  1. Materialize executable migration set 001–070 **từ tài liệu schema Approved** (`05` + block markers trong `schema_up.sql`).
  2. **Không** dùng ORM schema generator.
  3. Mỗi migration giữ **đúng migration order** trong tài liệu.
  4. Concatenate up migrations tạo object inventory **tương đương verified `schema_up.sql`**.
  5. Concatenate down migrations rollback **tương đương `schema_down.sql`**.
  6. Chạy `001→070`, `070→001`, `001→070`.
  7. Chạy `verify_checks.sql`.
  8. So sánh: 63 tables · extensions · triggers · constraints · indexes · FK · functions.
  9. Chỉ sau **PASS** → tạo **checksum manifest** + **freeze**.
  10. Mọi thay đổi sau freeze dùng **071+**.
- **Seed (3 pipeline):** production bootstrap (one-time admin, secret, **không cố định**, force change; settings không secret giả) · development/demo (PAC/Herzog/ASTM/mẫu — không prod) · test fixtures (isolated/teardown).
- **Migration test:** materialized `001→070` PASS; **rollback `070→001` chỉ disposable/test DB** (D5); lần hai idempotent; **KHÔNG 071 active**; CI duplicate/non-monotonic/checksum-drift (ME-06).
- **Integration (DB):** 63 bảng/ext/23 trigger/CHECK/enum/unique/FK (verify_checks).
- **Security/Performance:** no hardcode credential; least-privilege; backup/restore drill (RPO/RTO tạm).
- **Acceptance:** materialized set concat ≡ verified aggregate; ALL CHECKS PASSED; manifest/checksum committed; 3 pipeline; backup/restore PASS.
- **Evidence:** materialize+up/down/lần-hai log; checksum manifest; verify_checks; restore drill (`<sha>/P1/`).
- **Rollback:** disposable DB `down`; **production = restore backup + forward fix** (không default destructive down).
- **Out-of-scope:** ALTER 071; đổi cấu trúc bảng; ORM introspect+generate; **tuyên bố 70 file đã tồn tại**.
- **Rủi ro:** R-05 drift (+checksum/071+/forward-fix), R-31 seed/cred.
- **Ai:** C (DB owner + registry `08`); X rerun độc lập.
- **Điều kiện chuyển:** materialized ≡ aggregate; ALL CHECKS PASSED; checksum/freeze; 3 pipeline.

---

## PHASE 2 — Core Platform, Auth, Settings & Health Registry

- **Mục tiêu:** config→logging→DB; auth one-way; settings; **health liveness + readiness (DB)** (Correction 6); audit log. **No Users CRUD.**
- **Đầu vào:** P1; A19/A20/A24; **B23/B24 (before-P2)**.
- **Backend:** bootstrap `config→logging/errors→DB pool`; users/identity + `UserAuthenticationQueryPort`; auth một chiều (Argon2id/JWT HttpOnly+Secure+SameSite cookie/8h/CSRF/CORS/rate-limit/reset-invalidation); guard ở composition; settings mask secret; **health**: `/health/live` (liveness — không SMTP/worker), `/health/ready` (config+PG probe); structured audit log.
- **Giữ:** `/auth/me`, profile, change-password, forgot/reset. **Bỏ:** `/admin/users`.
- **Admin:** login + dashboard skeleton + settings + profile/change-password.
- **API:** `/auth/*`, `/admin/settings`, `/health/live`, `/health/ready` (DB probe).
- **Unit/Integration:** hashing/JWT/**key-rotation**/reset-invalidation; login đúng/sai/khóa; settings mask; **`/ready` phản ánh DB down; KHÔNG phụ thuộc SMTP/worker**.
- **Contract:** `/auth/*`+settings khớp OpenAPI; **generated-client freshness gate** (D18).
- **E2E:** đăng nhập/đăng xuất/đổi mật khẩu/reset.
- **Security (§K1):** cookie expiry; logout/session semantics; reset replay + 2 concurrent reset; CSRF rotation; account-lock race; trusted proxy/IP spoof; CSP/HSTS/nosniff/frame; SSR error no-stack.
- **Acceptance:** auth flows; settings mask; **liveness ≠ readiness ≠ worker**; audit no-PII; **không `/admin/users`**.
- **Evidence:** test reports; audit sample; cookie flags; security results (`<sha>/P2/`).
- **Rollback:** feature disable login/reset; backward-compatible key set; preserve settings.
- **Out-of-scope:** multi-role (Future); **Users CRUD**; audit UI (P1).
- **Rủi ro:** R-18 PII, R-19 injection, **R-33 readiness coupling** (`09`).
- **Ai:** C; X review (auth/security).
- **Điều kiện chuyển:** security không Critical/High; auth E2E; config direction + auth port đúng; **readiness không phụ thuộc SMTP/worker**.

---

## PHASE 3 — Media, Storage & Shared Content Security

- **Mục tiêu:** media an toàn + MediaUsageService + StoragePort + **ContentBlock/ExternalVideo validator** + storage readiness probe + **public media delivery `/media/*` design (D20)**.
- **Đầu vào:** P2; A12; **B25 (before-P3)**.
- **Backend:** upload magic-bytes/whitelist (JPG/PNG/WebP/PDF, no SVG/video); versioning+WebP; MediaUsageService→409; soft-delete→purge trễ + orphan reconciliation; **StoragePort** (D8); **`/media/*`** public delivery (storage-safe path/nosniff/no-listing/versioned cache — D20); **document download qua Nest** (publication/locale/deleted/existence → stream/`X-Accel-Redirect` — D20); **ContentBlock schema + ExternalVideoValidator + Sanitization**; đăng ký **storage probe**.
- **Admin:** Media library + panel "đang sử dụng" + uploader/picker (thin).
- **API:** `/admin/media` CRUD; `/api/v1/documents/:slug/download` (contract).
- **Unit:** magic-bytes; MIME whitelist; checksum dedup; MediaUsageService ~22; ExternalVideo validator; sanitization.
- **Security (§K1 + Correction 4):** SVG reject; MIME spoof; oversized pixel; decompression bomb; EXIF privacy; Unicode filename; concurrent duplicate; processor timeout/memory; PDF active-content/download; **path traversal (`/media/*` + download)**; **wrong MIME**; **soft-deleted file**; **missing file**; **cache headers**; **Content-Disposition + nosniff**; upload MP4 reject.
- **Performance:** upload+resize; budget upload bytes/pixels (`06` §13).
- **Acceptance:** 5 loại; magic-bytes; 409; WebP; validator sẵn sàng P5; **`/media/*` an toàn**; document download gated qua Nest; storage probe.
- **Evidence:** test reports; reject logs; EXIF-strip; media-delivery security (`<sha>/P3/`).
- **Rollback:** disable upload/purge flag; orphan reconciliation; restore media+DB together; dual-readable variants.
- **Out-of-scope:** attachment khách (P1); video upload.
- **Rủi ro:** R-11 media, R-19 injection, R-32 image/PDF exhaustion.
- **Ai:** C (magic-bytes/usage/validator/delivery); X (versioning); X review.
- **Điều kiện chuyển:** security upload không Critical/High; validator dùng được P5; `/media/*` + download an toàn; storage probe.

---

## PHASE 4 — Taxonomy Thin Verticals & Redirect Delivery Proof

- **Mục tiêu:** 5 taxonomy + SlugService; **explicit HTTP 301 qua topology thật** (Correction 3, `12`); thin Admin/Public + E2E.
- **Đầu vào:** P3; A5/A6/A7/A10/A11/A16; `12` routing + D17.
- **Backend:** CRUD+publish; brands (self-parent/no-loop/locale-status/no-fallback); categories (cây/reorder); standards (unique org,code); applications (DB parent, **phẳng**); industries; **SlugService 3-nguồn** + redirect 301 (transaction); first_published_at once; **redirect delivery qua route-resolution (Nest authoritative, Next emit 301 trước render — D17)**.
- **Thin Admin:** create/edit/publish + SEO form (title/desc/slug).
- **Thin Public:** brand list + hồ sơ hãng; **product-list theo taxonomy route** (`/san-pham/danh-muc/{slug}`) — **KHÔNG rich taxonomy detail (P1)**.
- **Concurrency (§K1):** 2 create cùng slug; 2 rename cùng slug; redirect source race; A→B→C không chain; restore soft-delete; same slug text khác locale.
- **E2E:** filter/pagination/locale; **explicit 301 redirect-before-render qua topology thật** (`12` §9); tạo brand/category draft→publish VI→hiển thị; EN chưa publish không fallback.
- **Security:** admin auth; XSS description; slug validation.
- **Acceptance:** 5 taxonomy CRUD+publish; **explicit 301 qua topology**; thin UI+E2E; applications phẳng.
- **Evidence:** SlugService tests; **301 redirect-before-render E2E recording**; concurrency logs (`<sha>/P4/`).
- **Rollback:** stop writes/publish; preserve redirects; data repair/forward fix.
- **Out-of-scope:** products (P5); facet count (P1); **rich taxonomy detail (P1)**.
- **Rủi ro:** R-08 slug/redirect, R-07 locale, R-23 routing.
- **Ai:** C (brands+SlugService+redirect delivery); X (standards/apps/industries); chéo review.
- **Điều kiện chuyển:** SlugService + explicit-301-topology E2E PASS; thin UI PASS; seed đủ P5.

---

## PHASE 5 — Product Thin Vertical (NÚT THẮT)

- **Mục tiêu:** catalogue usable end-to-end: products + filter/**product-search**/landing + PublishService + concurrency + thin Admin/Public + E2E.
- **Đầu vào:** P4; validator (P3); A14/A15/A16/A10; **lock/optimistic strategy chốt trước P5**.
- **Backend:** products(+translations/specs/6 link); PublishService (VI đủ/1 primary/brand-category chưa xóa/featured/slug unique → 422); PATCH replace-set (transaction/lost-update); filter builder (slug key-lặp OR/AND, parameter binding); **product search pg_trgm**; discontinued; `GET /products/landing`; product SEO contract.
- **Thin Admin/Public:** product create/edit/publish; landing/list/detail; filter UI.
- **Concurrency (§K1):** 2 primary category; replace-set race/lost-update; publish khi taxonomy archive/delete; self related-product; duplicate links.
- **E2E:** `/products` filter/sort/locale; landing; **generated-client gate**; tạo product→publish→hiển thị; lọc `(PAC OR Herzog) AND ASTM D86`; EN chưa publish ẩn; **product search** (không site-wide).
- **Security:** parameter binding (SQLi); admin auth; XSS block; external_video (validator P3).
- **Performance (budget `06` §13):** list/detail no-N+1 (EXPLAIN); landing; search; query-count budget.
- **Migration:** thiếu index → **071+** (không sửa 001–070).
- **Acceptance:** catalogue usable end-to-end; filter/search/landing/publish/discontinued đúng ADR-007/010; concurrency an toàn.
- **Evidence:** filter 3 tổ hợp; EXPLAIN no-N+1; publish+concurrency logs; product E2E (`<sha>/P5/`).
- **Rollback:** feature disable publish; data repair; forward fix; expand/contract.
- **Out-of-scope:** facet count/duplicate (P1); ecommerce fields **không render**; **site-wide search (P1)**.
- **Rủi ro:** R-12 N+1, R-06 filter, R-07 locale, R-21 concurrency.
- **Ai:** C (PublishService/filter/search/concurrency); X review.
- **Điều kiện chuyển:** 3 filter tổ hợp + concurrency PASS; catalogue usable E2E; no-N+1.

---

## PHASE 6A — Core Content Entities
- **Mục tiêu:** entity core + thin UI (thứ tự dependency).
- **Phạm vi:** pages, customers, offices, post_categories; services/documents/posts/projects **core**.
- **Backend:** CRUD+publish; **customers trước projects**; **post_categories trước posts**; services core; documents core (file RESTRICT, download qua Nest — D20); projects core (customer_visibility backend); posts core; external_video (validator P3).
- **Tests:** publish mỗi entity (locale); project confidential ẩn tên; document hidden không tải; posts cần category; download slug + headers; video hợp lệ/raw-iframe reject.
- **Acceptance:** 7 nhóm core publish+hiển thị; external_video an toàn; customer_visibility backend.
- **Rollback:** stop writes/publish; preserve redirects; forward fix/data repair.
- **Ai:** C (services/projects/documents core + external_video); X (pages/customers/offices/post_categories/posts core); chéo.
- **Điều kiện chuyển:** mọi entity core publish; thin UI+E2E; external_video PASS.

## PHASE 6B — Cross-module Content Relationships
- **Mục tiêu:** link tables + replace-set + integration (fan-in an toàn).
- **Backend:** service/project/post/document relationships; PATCH replace-set (transaction).
- **Concurrency (§K1):** replace-set race/lost-update; duplicate/self link.
- **Acceptance:** quan hệ chéo đúng ADR-008; integration ổn định.
- **Rollback:** data repair; forward fix.
- **Ai:** C+X theo entity owner P6A; **integration PR có fresh reviewer** (`08`).
- **Điều kiện chuyển:** replace-set concurrency PASS; integration E2E PASS.

---

## PHASE 7 — Inquiry & Outbox Worker (parallel)

- **Mục tiêu:** chống mất lead + worker process riêng shutdown-safe; at-least-once; **idempotency fingerprint (D19)**; **outbox reconciliation report (Correction 12)**. Song song P6B/P8-partial sau P5+service core.
- **Đầu vào:** P5+service core; settings.email; **SMTP/CAPTCHA (before-P7)**; worker decision (D6).
- **Backend:** `POST /inquiries` (validate→CAPTCHA→rate-limit→**idempotency check (key+fingerprint)**→transaction inquiries(email_pending)+outbox(pending)→202); **worker process** (SKIP LOCKED→processing+lock→email→sent/retry/failed; **graceful shutdown/stop-claim/drain/heartbeat/readiness/lease-timeout**); reaper; Message-ID ổn định từ outbox.id; header sanitize; last_error no-PII.
- **Idempotency fingerprint (D19 — Correction 8):** fingerprint **durable trong PostgreSQL** via migration **071+** (`request_fingerprint`); input canonicalized (name/email/phone/product-service-ref/message/locale/destination normalized; **loại** timestamp/request_id/volatile-headers/CAPTCHA); same key+same fp → result cũ; same key+diff fp → **`409 IDEMPOTENCY_KEY_REUSED`** (không lộ payload cũ). Nếu có data → add nullable/dual-write/backfill/validate/constraint-sau. **Không tạo migration ở Round planning.**
- **Health (Correction 6):** **`/health/worker`** (PG/heartbeat/lease/claim/reaper/email-config) + **degraded status** (backlog/oldest-pending/email_failed/SMTP-failures/heartbeat-stale). **API readiness KHÔNG phụ thuộc worker/SMTP** — SMTP lỗi → vẫn lưu inquiry→202.
- **Outbox reconciliation report (Correction 12):** trace mỗi record: outbox_id/inquiry_id/channel/recipient-snapshot/attempt_count/stable Message-ID/provider-resp-id/claimed_at/sent_at/failed_at/final-status/sanitized last_error. Operational report: sent/pending/processing/retrying/failed/**stale-processing**/**duplicate-suspected**. Email đã gửi **không rollback** nhưng **truy vết + reconcile**; no full PII/message body.
- **Admin:** dashboard `email_failed` widget (không inquiry UI).
- **Public:** InquiryModal/ContactForm (idempotency-key).
- **Concurrency/Failure (§K1):** 2 worker cùng job (SKIP LOCKED); graceful shutdown; SMTP success rồi crash; retry exhaustion; poison job quarantine; fairness/starvation; reaper/worker race; clock skew; provider timeout; recipient snapshot; **same key+diff payload→409**.
- **E2E:** SMTP OK/lỗi-vẫn-202/retry/idempotency; **SMTP down → API vẫn nhận inquiry (readiness OK)**.
- **Performance:** outbox batch/timeout budget (`06` §13).
- **Acceptance:** không mất lead; at-least-once; worker shutdown drain sạch; idempotency mismatch 409; **reconciliation report**; readiness không phụ thuộc SMTP/worker.
- **Evidence:** 2-worker/shutdown/reaper logs; idempotency+fingerprint tests; reconciliation report sample; email che-PII (`<sha>/P7/`).
- **Rollback:** stop claim→drain→quarantine poison; preserve outbox (no destructive down); email đã gửi không rollback (reconcile); reconciliation report.
- **Out-of-scope:** attachment (P1); email xác nhận khách (C3/P1); CRM UI (Future).
- **Rủi ro:** R-09 mất/trùng, R-29 worker shutdown, R-33 readiness coupling.
- **Ai:** C (worker/outbox/idempotency/reconciliation); X review.
- **Điều kiện chuyển:** concurrency+shutdown+fingerprint PASS; SMTP-lỗi-vẫn-202; reconciliation report tồn tại.

---

## PHASE 8 — Web Delivery: Navigation, Homepage, Redirects & SEO (no new search)

- **Mục tiêu:** convergence web delivery; **KHÔNG search feature mới** (product search ở P5). Route-rule bắt đầu P4; P8 hội tụ.
- **Backend:** navigation (mega menu is_featured + configured source); homepage (`GET /home` + admin PATCH section, thứ tự cố định); **redirect delivery centralized** (Nest authoritative, **explicit 301**, D11/D17); **module seo** (canonical+robots resolver, sitemap/robots ở Nest — D13, hreflang cả-hai-published, structured data, social fallback).
- **Public:** header/mega menu; homepage; `<head>` serialize từ SEO contract (Next — D12).
- **API:** `/navigation/:location`, `/home`, `/sitemap*.xml`, `/robots.txt` (Nest), admin menus/homepage/redirects.
- **Unit:** canonical/robots resolver (mọi loại trang); hreflang; social fallback; **redirect loop/chain detector**.
- **Integration:** sitemap chỉ published/locale (không filter/search); robots.txt; `/san-pham/hang/{slug}`→**301**; mega menu auto.
- **E2E:** đổi slug→**explicit 301 redirect-before-render**; brand self-canonical; filter noindex; EN chưa publish→không hreflang EN; **cache invalidation A→B**.
- **Security:** open-redirect prevention; canonical host allowlist; robots không lộ path.
- **Performance:** homepage aggregate no-N+1; sitemap generation budget (`06` §13).
- **Acceptance:** canonical/robots đúng ADR-011; sitemap/redirect/hreflang; mega menu auto; **no new search**.
- **Evidence:** resolver tests; sample sitemap/robots; redirect E2E (`<sha>/P8/`).
- **Rollback:** feature disable; cache purge; redirect snapshot; forward SEO fix.
- **Out-of-scope:** kéo-thả (P1); **search mới**; site-wide search (P1); scheduled (P1).
- **Rủi ro:** R-13 SEO, R-08 redirect, R-23 routing.
- **Ai:** C (seo/redirect delivery); X (navigation/homepage); chéo.
- **Điều kiện chuyển:** resolver PASS mọi loại trang; explicit-301 + cache invalidation PASS; sitemap/robots ở Nest.

---

## PHASE 9 — Admin Completion
- **Mục tiêu:** hoàn thiện editor/component/a11y trên thin UI (không bắt đầu FE). **No Users CRUD, no auto-save advanced.**
- **Admin:** AdminLayout/DataTable/form nhiều section/MediaPicker/BlockEditor+External Video/TreeSelector/RelationSelector/SpecEditor/SEOEditor (no index/follow/social-picker)/PublishPanel+checklist/StatusBadge+LanguageTabs; **cảnh báo rời trang + manual save draft (KHÔNG auto-save advanced — P1)**.
- **DoD (D18):** OpenAPI updated/client regenerated/no-stale/breaking-report PASS/mixed-version nếu ảnh hưởng deploy.
- **E2E:** đăng nhập→tạo brand/product→publish→xem; upload media; đổi slug (301); external video; **manual save + unsaved warning** (không auto-save).
- **Acceptance:** mọi màn 07; publish checklist; **không control bị cấm** (index/follow/social-picker/upload-video/Users-CRUD/auto-save/ecommerce-fields).
- **Rollback:** versioned deploy + backward-compatible API + blue/green.
- **Out-of-scope:** bulk/duplicate/kéo-thả/dashboard-cảnh-báo/**auto-save advanced** (P1); **Users CRUD** (Future); UI inquiry (Future).
- **Ai:** C (product/publish/SEO editor); X (còn lại); chéo + integration reviewer.
- **Điều kiện chuyển:** E2E Admin PASS; no scope-leak control.

## PHASE 10 — Public Completion
- **Mục tiêu:** hoàn thiện trang công khai SSR (polish/a11y/perf); redirect-before-render; locale mapping.
- **Public:** hoàn thiện layout/homepage/product list+FilterSidebar (OR/AND, URL slug key-lặp)/detail(+discontinued)/brand/service/project/post/document/ContactForm-InquiryModal(idempotency,202)/**product search**/system pages(404/yêu-cầu-thành-công/policy)/`<head>`(serialize từ Nest)/i18n `/en`(EN chưa publish xử lý đúng)/external_video/a11y+responsive+lazy/WebP.
- **E2E (14 luồng + §K1):** lọc `(PAC OR Herzog) AND ASTM D86`; brand EN không fallback; video hợp lệ/không; form SMTP OK/lỗi; discontinued; download slug (**Content-Disposition/nosniff**); đổi slug **explicit 301 redirect-before-render**; hydration mismatch; mobile; keyboard/focus a11y; **locale switch mapping**.
- **SEO (§K1):** base URL environment; trailing slash; query order; pagination canonical; 404/410; XML/JSON-LD escape.
- **Performance:** list/detail/homepage/landing/search latency; p95 dev/staging + Lighthouse budget (`06` §13).
- **Acceptance:** mọi trang P0 (02/08); SEO đúng; form không mất lead; EN không trộn; redirect-before-render.
- **Rollback:** versioned assets + backward-compatible API + blue/green/canary + generated-client gate.
- **Out-of-scope:** **site-wide search**/FAQ/timeline/landing chiến dịch/attachment (P1).
- **Ai:** C (product/filter/form/SEO-head); X (còn lại); chéo + integration reviewer.
- **Điều kiện chuyển:** 14 luồng E2E PASS; SEO audit sạch; a11y/mobile PASS.

---

## PHASE 11 — Content Delta, Integration, Hardening & Release
- **Mục tiêu:** CM4 cutover + hardening + go-live.
- **Đầu vào:** P0–P10; **C5/C7/C9 (before-P11)**.
- **Backend:** rate-limit toàn cục; security headers; cache; backup DB+media + restore drill; monitoring SMTP/outbox/storage; **outbox reconciliation report (operational)**.
- **CM4 (`13`):** freeze; delta export/import; final redirect map; rollback snapshot; post-go-live crawl.
- **Tests:** regression; cross-module (publish→sitemap→redirect; inquiry→outbox→email); full security; load test; N+1 sweep; **OpenAPI backward-compat + generated-client freshness + mixed-version/blue-green**; a11y/mobile; **CM validation** (counts/checksum/coverage/broken-link/delta idempotency).
- **Acceptance:** không Critical/High security; perf đạt **budget staging** (không SLA); backup/restore PASS; SEO/broken-link crawl; monitoring + degraded status; rollback decision points; **user go-live approval**.
- **Evidence:** security/load/restore/CM reports; go-live checklist ký (`<sha>/P11/`).
- **Rollback:** tested backup/restore + cutover runbook + rollback decision point + DNS/CDN/cache + worker drain + forward-fix + content-delta snapshot.
- **Out-of-scope:** mọi P1/Future.
- **Rủi ro:** R-15 deploy, R-14 test giả, R-27 content incomplete, R-28 destructive rollback.
- **Ai:** C (security/perf backend); X (FE a11y/perf); release captain (user); user go-live.
- **Điều kiện chuyển:** DoD toàn dự án; user phê duyệt.

---

## Milestones
| Milestone | Sau | Ý nghĩa |
|---|---|---|
| M0 — Decisions & Git Ready | P0 | D1–D20 + Git hợp lệ + topology + 301 spike |
| M1 — Foundation Ready | P3 | DB materialized+auth+media+content-security |
| M2 — Catalogue Usable | P5 | products/filter/search usable |
| M3 — Content Complete | P6B | entity + quan hệ chéo |
| M4 — Lead-safe | P7 | inquiry + worker shutdown-safe + reconciliation |
| M5 — Web Delivery Ready | P8 | nav/homepage/redirect/sitemap/canonical |
| M6 — UI Complete | P10 | Admin+Public completion |
| M7 — Release Candidate | P11 | security/perf/backup/CM4 → go-live |

## Content Migration (song song — `13`)
CM0 Inventory(P4) · CM1 Mapping(P4–P5) · CM2 Importer/Dry-Run(P5–P7, **production hard-disabled**) · CM3 Validation(P7–P10) · CM4 Cutover(P11).
