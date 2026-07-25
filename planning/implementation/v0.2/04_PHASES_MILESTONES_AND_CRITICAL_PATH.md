# 04 — PHASES, MILESTONES & CRITICAL PATH

**Plan version:** v0.2 · **Trạng thái:** PROPOSED FOR FINAL RECONCILIATION · **Ngày:** 2026-07-22

13 phase (P0, P1, P2, P3, P4, P5, **P6A, P6B**, P7, P8, P9, P10, P11) + Content Migration CM0–CM4 song song (`13`). Ký hiệu: **C**=Claude, **X**=Codex. Rollback theo **side-effect** (không "revert code" đơn lẻ — HI-13/§L). Mỗi phase giữ 24 mục; phần lặp với v0.1 rút gọn, nhấn mạnh correction.

**Phase rollback modes (bảng chọn — §L):** code revert · feature disable · stop writes · worker drain · forward fix · data repair · expand/contract migration · cache purge · restore backup · blue/green · content/redirect snapshot restore.

---

## PHASE 0 — Technical Decisions, Git Integrity & Repository Bootstrap

- **Mục tiêu:** Chốt D1–D16 + OPEN before-P0 (B22–B26); **khôi phục Git hợp lệ**; skeleton monorepo + codegen/compat tooling.
- **Phạm vi:** infra/tooling, Git, decisions.
- **Đầu vào:** D1–D16; `01` staging before-P0; `12` topology.
- **Phụ thuộc:** —.
- **Backend:** skeleton NestJS (D1); OpenAPI + generated-client tooling (B26); `packages/{contracts,route-rules,config,testing}` (D3, mô tả — không tạo file ở R4).
- **Database:** chưa (chỉ chuẩn bị migration executor D5).
- **Admin/Public FE:** skeleton một Next app (public + `/admin`, D2); i18n `/en` khung.
- **Worker:** skeleton worker process (D6) — chưa logic.
- **API:** quy ước `/api/v1`, response/error A24, routing matrix (`12`).
- **Seed/fixture:** —.
- **Git (HI-18/D15 — CHỈ lập kế hoạch, KHÔNG chạy lệnh Git):** checklist §Git dưới.
- **Unit/Integration/Contract:** pipeline xanh; compose up (PG16 + web + api + worker skeleton); OpenAPI validate rỗng; **generated-client freshness job** khung.
- **E2E:** Playwright 1 test mẫu.
- **Security:** `.gitignore` chặn secret/.env; lint security; **Node runtime pinned (D16, cấm EOL)**.
- **Performance:** boot ngưỡng; **PRELIMINARY ENGINEERING BUDGET** khởi tạo (`06` §9).
- **Migration:** executor kết nối PG16 (chưa 001–070).
- **Acceptance:** repo build xanh; **Git hợp lệ** (rev-parse/status/branch/remote/first-commit/tag `docs-v1.2.1-approved`); D1–D16 + B22–B26 ghi vào decision log; routing matrix locked.
- **Evidence:** CI build log; compose log; Git verify output; decision log (`implementation/evidence/<sha>/P0/`).
- **Rollback:** code revert scaffold (chưa DB/data). Git: nếu init sai nguồn → user quyết lại (không tự xóa `.git`).
- **Out-of-scope:** bảng/endpoint nghiệp vụ; tạo thư mục packages thật (chỉ mô tả R4).
- **Rủi ro:** R-01 stack (đã giảm bởi D1–D16), **R-25 Git invalid (OPEN BLOCKER)**, R-26 Node EOL, R-24 topology.
- **Ai implement:** C (skeleton) sau khi Git hợp lệ; **User** phê duyệt/chạy lệnh Git.
- **Ai review:** X (cấu trúc, circular-dep guard, secret hygiene, Git verify).
- **Điều kiện chuyển:** **Git hợp lệ**; gate `00` §7 đạt; DoR P1.

### §Git checklist (D15 — không chạy lệnh Git ở R4)
1. Xác định có repository gốc hay chưa. 2. Nếu có → restore/clone từ nguồn đúng. 3. Nếu chưa từng có → **user phê duyệt** khởi tạo mới. 4. Xóa `.git` rỗng **chỉ sau user xác nhận**. 5. Verify: `git rev-parse --show-toplevel`, `status`, branch, remote, first baseline commit, tag `docs v1.2.1-approved`. 6. **Không code khi repository chưa hợp lệ.**

---

## PHASE 1 — Raw SQL Database Baseline & Bootstrap Separation

- **Mục tiêu:** Baseline **001–070 raw SQL** (execution-tested, D5) + manifest/checksum/history; **3 seed pipeline tách** (HI-11); backup/restore drill.
- **Phạm vi:** migration executor, DB, seed.
- **Đầu vào:** P0; `05` §XIV; `doc/verify/*.sql` (đối chiếu, không copy).
- **Backend:** kết nối, pool, `search_path=ltv`.
- **Database:** chạy **raw SQL 001–070** (KHÔNG ORM-regenerate — D5); manifest + **checksum** per migration; migration history table; mỗi migration có `down`.
- **Seed (3 pipeline — HI-11):**
  - **Production bootstrap:** one-time command tạo admin đầu tiên; password từ secure input/secret (**không cố định, không commit**); **force password change**; settings bắt buộc **không** chứa secret giả.
  - **Development/demo:** PAC, Herzog, ASTM D86, products/content mẫu — **không chạy production**.
  - **Test fixtures:** cô lập per test/suite (transaction/schema); teardown; **không** phụ thuộc demo seed; không làm bẩn shared DB.
- **Admin/Public/Worker:** —.
- **Unit:** —.
- **Integration (DB):** 63 bảng/extensions/23 trigger/CHECK/enum/unique/FK (đối chiếu `verify_checks`).
- **Migration test:** `001→070` PASS; **rollback `070→001` chỉ trên disposable/test DB** (D5 — không phải production strategy); migration lần hai idempotent; **KHÔNG chạy 071**; **CI check** duplicate/non-monotonic number + checksum drift (ME-06).
- **Security:** không hardcode credential; role least-privilege.
- **Performance:** thời gian áp full migration; index tồn tại; **backup/restore drill** (RPO/RTO tạm).
- **Acceptance:** tái lập ALL CHECKS PASSED (PG16); manifest/checksum committed; 3 pipeline tách; backup/restore PASS.
- **Evidence:** migration up/down/lần-hai log; checksum manifest; verify_checks; restore drill log (`<sha>/P1/`).
- **Rollback:** **disposable DB** dùng `down`; **production** = restore backup + **forward fix** (không default destructive down — §L); baseline freeze sau shared env đầu.
- **Out-of-scope:** ALTER kiểu 071; đổi cấu trúc bảng; ORM introspect+generate.
- **Rủi ro:** R-05 migration drift (+checksum/071+/forward-fix), R-31 seed/default cred in prod.
- **Ai implement:** C (DB owner + migration registry `08`).
- **Ai review:** X (so từng cột với `05`; rerun migration+rollback độc lập; kiểm checksum).
- **Điều kiện chuyển:** ALL CHECKS PASSED; checksum/registry; baseline freeze; 3 pipeline.

---

## PHASE 2 — Core Platform, Auth, Settings & Health Registry

- **Mục tiêu:** config→logging→DB (HI-01); auth one-way (HI-02); settings; **health probe registry** (HI-03); audit log. **Bỏ Users CRUD** (HI-15).
- **Phạm vi:** config, logging, errors, users(identity+port), auth, settings, health.
- **Đầu vào:** P1; A19/A20/A24; B23/B24 (cookie/session — before-P2).
- **Backend:** bootstrap `config → logging/errors → DB pool`; **users/identity owns repo + exposes `UserAuthenticationQueryPort`**; **auth** một chiều (login/logout/me/change-password/forgot/reset; Argon2id; JWT HttpOnly+Secure+SameSite cookie; phiên 8h; CSRF; CORS; rate-limit; reset-token vô hiệu khi `password_changed_at` đổi); **guard ở app composition**; settings GET/PATCH mask secret; **health endpoint shell + registry (DB+config probe)**; structured audit log.
- **Giữ (không CRUD):** `/auth/me`, profile, change-password, forgot/reset. **Bỏ:** `/admin/users`, users list/create/delete.
- **Admin:** login + dashboard skeleton + settings tab + **profile/change-password** (không Users CRUD).
- **API:** `/auth/*`, `/admin/settings`, `/health/live`, `/health/ready` (chỉ DB probe ở P2).
- **Seed:** dùng production-bootstrap admin (P1); settings groups.
- **Unit:** hashing/verify; JWT; **key rotation/overlap**; reset-token invalidation; error-to-HTTP; audit-log field builder (no secret/PII).
- **Integration:** login đúng/sai/khóa/quá-nhiều; settings mask; `/ready` phản ánh DB down (chỉ DB probe).
- **Contract:** `/auth/*` + settings khớp OpenAPI; **generated-client freshness gate** (B26).
- **E2E:** đăng nhập/đăng xuất/đổi mật khẩu/reset.
- **Security (bổ sung §K1):** cookie expiry; **logout/current-session semantics**; **password reset replay + 2 concurrent reset**; password-change invalidation; **CSRF rotation**; **account-lock race**; **trusted proxy/IP spoof**; CSP/HSTS/referrer/nosniff/frame headers; SSR error không lộ stack.
- **Performance:** login ngưỡng; `/live` nhanh.
- **Migration:** không mới.
- **Acceptance:** auth flows; settings mask; health DB probe; audit no-PII; **không có `/admin/users`**.
- **Evidence:** test reports; audit sample (che PII); cookie flags; security results (`<sha>/P2/`).
- **Rollback:** **feature disable** login/reset; **backward-compatible key set** (revoke/expire procedure); preserve settings; code revert cho logic thuần (§L).
- **Out-of-scope:** multi-role/phân quyền (Future); **Users CRUD**; Admin UI audit log (P1).
- **Rủi ro:** R-18 PII, R-19 injection, R-03 (Users-CRUD signal — đã loại).
- **Ai implement:** C.
- **Ai review:** X (auth/security).
- **Điều kiện chuyển:** security không Critical/High; auth E2E; config direction + auth port đúng.

---

## PHASE 3 — Media, Storage & Shared Content Security

- **Mục tiêu:** media an toàn + MediaUsageService + storage adapter + **ContentBlock/ExternalVideo/Sanitization validator** (chuyển sớm — HI-04) + storage readiness probe.
- **Phạm vi:** media, StoragePort, shared content-security.
- **Đầu vào:** P2; A12; B25 (image/PDF policy — before-P3).
- **Backend:** upload magic-bytes/whitelist (JPG/PNG/WebP/PDF, no SVG/video); versioning+WebP; MediaUsageService→409; soft-delete→purge trễ; **StoragePort** (D8, persistent volume); **ContentBlock schema + ExternalVideoValidator (youtube/vimeo, trích ID, no raw iframe) + Sanitization policy**; đăng ký **storage probe** vào health registry.
- **Admin:** Media library + panel "đang sử dụng" + FileUploader/MediaPicker (thin UI).
- **API:** `/admin/media` CRUD.
- **Seed:** media mẫu + file test (JPG/SVG/MP4/PDF-spoof) cho security.
- **Unit:** magic-bytes; MIME/ext whitelist; checksum dedup; MediaUsageService ~22 tham chiếu; **ExternalVideo validator**; sanitization.
- **Integration:** upload→versions; xóa đang dùng→409; storage probe.
- **Contract/E2E:** media endpoints; Admin upload; chặn xóa đang dùng.
- **Security (§K1):** SVG reject; **MIME spoof**; **oversized pixel dimensions**; **decompression/image bomb**; **EXIF removal/privacy**; **Unicode filename**; **concurrent duplicate upload**; **processor timeout/memory cap**; **PDF active-content/download policy**; path traversal; upload MP4 reject.
- **Performance:** upload+resize ngưỡng; **budget upload bytes/pixels** (`06` §9).
- **Migration:** không mới.
- **Acceptance:** 5 loại; magic-bytes; 409; WebP; **validator sẵn sàng cho P5**; storage probe.
- **Evidence:** test reports; reject logs (SVG/MP4/bomb/spoof); EXIF-strip proof (`<sha>/P3/`).
- **Rollback:** **disable upload/purge flag**; **orphan reconciliation**; **restore media + DB together**; dual-readable variants (§L — không chỉ revert code vì file đã tạo).
- **Out-of-scope:** attachment khách (P1); video upload (không bao giờ P0).
- **Rủi ro:** R-11 media, R-19 injection, **R-32 image/PDF exhaustion**.
- **Ai implement:** C (magic-bytes/usage/validator); X (versioning).
- **Ai review:** X.
- **Điều kiện chuyển:** security upload không Critical/High; validator dùng được ở P5; storage probe.

---

## PHASE 4 — Taxonomy Thin Verticals & Redirect Delivery Proof

- **Mục tiêu:** 5 taxonomy + SlugService; **redirect 301 chạy qua topology thật** (CR-01/`12` §9); thin Admin/Public + E2E.
- **Phạm vi:** brands, product_categories, standards, applications, industries + SlugService/redirect delivery.
- **Đầu vào:** P3; A5/A6/A7/A10/A11/A16; `12` routing matrix.
- **Backend:** CRUD+publish; brands (self-parent, sub_brand parent, no-loop, locale-status, **no fallback detail**); categories (cây, reorder); standards (unique org,code); applications (DB parent, **API/Admin phẳng**); industries; **SlugService 3-nguồn** + tạo redirect 301 (transaction); `first_published_at` một lần; **redirect delivery qua route-resolution contract** (`12`, Nest authoritative).
- **Thin Admin:** create/edit/publish từng taxonomy; SEO form (title/desc/slug, no index/follow/social-picker).
- **Thin Public:** brand list `/hang-doi-tac` + hồ sơ hãng; **product-list theo taxonomy route** (`/san-pham/danh-muc/{slug}`) — **KHÔNG rich taxonomy detail** (P1, ME-04).
- **API:** `/brands*`, `/product-categories*`, `/standards*`, `/applications*`, `/industries*` (public slug) + admin UUID.
- **Seed:** dev/demo PAC+sub-brands, categories, standards, applications, industries.
- **Unit:** SlugService 3-nguồn; no-loop; `first_published_at` once; locale condition; canonical/robots resolver cho taxonomy route.
- **Integration/Concurrency (HI-20/§K1):** đổi slug→redirect no-chain (transaction); hard-delete chỉ draft-chưa-publish; **2 create cùng slug**; **2 rename về cùng slug**; **redirect source race**; **A→B→C không chain**; **restore soft-delete**; **same slug text khác locale**.
- **Contract/E2E:** filter/pagination/locale; **redirect-before-render qua topology thật** (`12` §9); tạo brand/category draft→publish VI→hiển thị; EN chưa publish không fallback.
- **Security:** admin auth; XSS description block; slug validation.
- **Performance:** list phân trang; tree no-N+1.
- **Migration:** không mới.
- **Acceptance:** 5 taxonomy CRUD+publish; **redirect 301 chứng minh qua topology**; thin UI+E2E; applications phẳng.
- **Evidence:** SlugService tests; redirect-before-render E2E recording; concurrency logs (`<sha>/P4/`).
- **Rollback:** **stop writes/publish**; **preserve redirects**; **data repair/forward fix**; **không xóa data bằng Git revert** (§L).
- **Out-of-scope:** products (P5); facet count (P1); **rich taxonomy detail (P1)**; kéo-thả applications.
- **Rủi ro:** R-08 slug/redirect, R-07 locale, R-23 routing owner.
- **Ai implement:** C (brands+SlugService+redirect delivery); X (standards/applications/industries); categories C/X.
- **Ai review:** chéo (SlugService/redirect do X review).
- **Điều kiện chuyển:** SlugService+redirect-topology E2E PASS; thin UI PASS; seed đủ P5.

---

## PHASE 5 — Product Thin Vertical (NÚT THẮT)

- **Mục tiêu:** catalogue **usable end-to-end** (không chỉ backend): products + filter/search/landing + PublishService + concurrency + thin Admin/Public + E2E.
- **Phạm vi:** products, search (product).
- **Đầu vào:** P4; ContentBlock validator (P3); A14/A15/A16/A10; **lock/optimistic strategy chốt trước P5** (HI-20).
- **Backend:** products(+translations/specs/6 link); **PublishService** (VI đủ, đúng 1 primary, brand/category chưa xóa, featured_image, slug unique → 422 mã lỗi); **PATCH replace-set** (transaction, **lost-update strategy**); **filter builder** (slug key-lặp, OR/AND, parameter binding); **product search pg_trgm**; discontinued+thay thế; **`GET /products/landing`** (batch, cache ngắn); product SEO contract (`12`).
- **Thin Admin:** product create/edit/publish (multi-section tối thiểu); relation/spec editors.
- **Thin Public:** landing `/san-pham`, list `/san-pham/tat-ca`, detail `/san-pham/{slug}`; filter UI.
- **API:** `/products`, `/products/:slug`, `/products/landing`, `/{taxonomy}/:slug/products`; admin CRUD/publish.
- **Seed:** dev/demo SP đủ test `(PAC OR Herzog) AND ASTM D86`.
- **Unit:** filter tổ hợp OR/AND; PublishService nhánh thiếu; PATCH replace-set; discontinued.
- **Integration/Concurrency (HI-20/§K1):** publish transaction; **2 primary category concurrent**; **replace-set race/lost update**; **publish while taxonomy archived/deleted**; **self related-product**; **duplicate links**.
- **Contract/E2E:** `/products` filter/sort/locale; landing shape; **generated-client gate**; tạo product (Tên VI+Hãng+Danh mục chính)→publish→hiển thị; lọc `(PAC OR Herzog) AND ASTM D86`; EN chưa publish ẩn; search.
- **Security:** parameter binding (SQLi qua filter); admin auth; XSS content block; **external_video validate (dùng validator P3)**.
- **Performance (budget — ME-08/`06` §9):** list/detail no-N+1 (EXPLAIN); landing aggregate; search; **query-count budget list/detail**.
- **Migration:** thiếu index phát hiện → **071+** (không sửa 001–070 — D5).
- **Acceptance:** **catalogue usable end-to-end**; filter/search/landing/publish/discontinued đúng ADR-007/010; concurrency an toàn.
- **Evidence:** filter 3 tổ hợp; EXPLAIN no-N+1; publish+concurrency logs; product E2E recording (`<sha>/P5/`).
- **Rollback:** **feature disable publish**; **data repair**; **forward fix**; expand/contract nếu cần index (§L).
- **Out-of-scope:** facet count/duplicate product (P1); ecommerce fields **không render** (ADR-010).
- **Rủi ro:** R-12 N+1, R-06 filter, R-07 locale, R-21 concurrency.
- **Ai implement:** C (PublishService/filter/search/concurrency).
- **Ai review:** X (filter binding/N+1/publish/concurrency).
- **Điều kiện chuyển:** 3 filter tổ hợp PASS; concurrency PASS; catalogue usable E2E; no-N+1.

---

## PHASE 6A — Core Content Entities

- **Mục tiêu:** entity nội dung core (không quan hệ chéo) + thin UI. Thứ tự dependency (HI-07).
- **Phạm vi:** pages, customers, offices, post_categories; services/documents/posts/projects **core**.
- **Đầu vào:** P5 (cho link ở P6B); ContentBlock validator (P3); A10/A17/A18.
- **Backend:** CRUD+publish; **customers trước projects**; **post_categories trước posts**; services core (cây); documents core (file RESTRICT, `download` slug); projects core (`customer_visibility` ở backend); posts core; external_video render (validator P3).
- **Thin Admin/Public:** mỗi entity có form + detail route tối thiểu.
- **API:** `/pages/:slug`, `/services*`, `/projects*`, `/posts*`, `/post-categories*`, `/documents*`(+download), `/customers`, `/offices`.
- **Seed:** dev/demo 1 mỗi loại (project mỗi visibility).
- **Unit:** external_video; customer_visibility resolver; document download gate.
- **Integration/E2E:** publish mỗi entity (locale); project confidential ẩn tên (backend); document hidden không tải; posts cần category (RESTRICT); download slug; video hợp lệ/raw-iframe reject.
- **Security:** XSS block sanitize; external_video no-script; download path.
- **Performance:** list phân trang; detail no-N+1.
- **Acceptance:** 7 nhóm core publish+hiển thị; external_video an toàn; customer_visibility backend.
- **Evidence:** external_video tests; customer_visibility tests (`<sha>/P6A/`).
- **Rollback:** stop writes/publish; preserve redirects; forward fix/data repair (§L).
- **Out-of-scope:** cross-module links (P6B); product_videos (P1).
- **Rủi ro:** R-19 XSS, privacy (customer_visibility).
- **Ai implement:** C (services/projects/documents core + external_video); X (pages/customers/offices/post_categories/posts core).
- **Ai review:** chéo.
- **Điều kiện chuyển:** mọi entity core publish; thin UI+E2E; external_video PASS.

---

## PHASE 6B — Cross-module Content Relationships

- **Mục tiêu:** link tables + replace-set + integration (fan-in an toàn — HI-07).
- **Phạm vi:** product/service/project/post/document relationships.
- **Đầu vào:** P6A core + P5 products; A15.
- **Backend:** service_products/brands/industries; project_products/services/brands/media; post_products/services/projects/brands/media; document_products/brands/services/posts; **PATCH replace-set** (transaction) mọi mảng.
- **Thin Admin/Public:** RelationSelector; related sections render.
- **API:** relationship fields trong PATCH mỗi entity.
- **Seed:** liên kết mẫu.
- **Unit/Integration/Concurrency:** replace-set (có mặt→thay, vắng→giữ); **replace-set race/lost update**; duplicate/self link.
- **E2E:** PATCH replace-set; related hiển thị; đổi nhóm cha không đổi URL chi tiết.
- **Security:** authz; transaction integrity.
- **Performance:** related no-N+1.
- **Acceptance:** quan hệ chéo đúng ADR-008; integration ổn định.
- **Evidence:** replace-set concurrency tests (`<sha>/P6B/`).
- **Rollback:** data repair; forward fix (§L).
- **Out-of-scope:** —.
- **Rủi ro:** R-04 xung đột (shared contract), R-21 concurrency.
- **Ai implement:** C+X (phân theo entity owner P6A; integration PR có fresh reviewer — `08`).
- **Ai review:** integration reviewer (HI-19).
- **Điều kiện chuyển:** replace-set concurrency PASS; integration E2E PASS.

---

## PHASE 7 — Inquiry & Outbox Worker (parallel)

- **Mục tiêu:** chống mất lead + **worker process riêng** (D6) an toàn shutdown; at-least-once. **Chạy song song P6B/P8-partial** sau P5+service core (HI-04/§I4).
- **Phạm vi:** inquiries, outbox worker process.
- **Đầu vào:** P5 + service core; settings.email; SMTP/CAPTCHA provider (before-P7); worker decision (D6, before-P0).
- **Backend:** `POST /inquiries` (validate→CAPTCHA→rate-limit→idempotency→transaction inquiries(email_pending)+outbox(pending)→202); **worker process** (SKIP LOCKED→processing+lock→email→sent/retry/failed); **reaper**; **Message-ID ổn định** từ outbox.id; header sanitize; last_error no-PII; **lifecycle: graceful shutdown/stop-claim/drain in-flight/heartbeat/readiness/lease-timeout** (D6).
- **Admin:** dashboard `email_failed` widget (**không** inquiry UI).
- **Public:** InquiryModal/ContactForm (idempotency-key).
- **API:** `POST /api/v1/inquiries`.
- **Seed:** settings recipient; **MailHog** cho test.
- **Unit:** idempotency; backoff; Message-ID xác định; header sanitize; last_error sanitize.
- **Integration:** transaction atomic; email_status transitions; UNIQUE(inquiry_id,channel,recipient).
- **Concurrency/Failure (BẮT BUỘC §K1):** 2 worker cùng job (SKIP LOCKED); **graceful shutdown**; **SMTP success rồi crash**; **retry exhaustion**; **poison job quarantine**; **fairness/starvation**; **reaper/worker race**; **clock skew/boundary**; **provider timeout**; **recipient snapshot**; **same Idempotency-Key + different payload → 409 IDEMPOTENCY_KEY_REUSED**.
- **§ Idempotency payload mismatch (HI-20):** same key + same fingerprint → trả kết quả cũ; same key + **different fingerprint → 409 `IDEMPOTENCY_KEY_REUSED`**. **Nếu schema hiện chưa có fingerprint field → `IMPLEMENTATION/SCHEMA REVIEW REQUIRED` (không tự thêm cột vào baseline Approved ở R4).**
- **E2E:** SMTP OK/lỗi-vẫn-202/retry/idempotency.
- **Security:** rate-limit; no-PII log; header injection.
- **Performance:** outbox **batch/timeout budget** (`06` §9).
- **Migration:** không mới.
- **Acceptance:** không mất lead; at-least-once; **worker shutdown drain sạch**; idempotency mismatch đúng.
- **Evidence:** 2-worker/shutdown/reaper logs; idempotency tests; email sample che-PII (`<sha>/P7/`).
- **Rollback:** **stop claim → drain → stop**; **quarantine poison jobs**; **preserve outbox** (no destructive down); email đã gửi **không** rollback; reconciliation report (§L).
- **Out-of-scope:** attachment (P1); email xác nhận khách (C3/P1); CRM UI (Future).
- **Rủi ro:** R-09 mất/trùng, **R-29 worker shutdown in-flight**.
- **Ai implement:** C (worker/outbox/idempotency).
- **Ai review:** X (SKIP LOCKED/reaper/shutdown/at-least-once/header).
- **Điều kiện chuyển:** concurrency+shutdown PASS; SMTP-lỗi-vẫn-202 PASS.

---

## PHASE 8 — Web Delivery: Navigation, Homepage, Redirects & SEO (no new search — ME-02)

- **Mục tiêu:** convergence web delivery; **không có search feature mới**. Nhiều route-rule task bắt đầu P4; P8 hội tụ.
- **Phạm vi:** navigation, homepage, redirects (delivery), seo.
- **Đầu vào:** P4–P6 (catalogue+content); `12` topology; A5/A6/A11/A17; base URL (before-P8).
- **Backend:** navigation `/navigation/:location` (mega menu gộp is_featured + **configured source**: settings/menu_items/homepage — ME-03); homepage `GET /home` + admin PATCH section (bật/tắt+nổi bật, thứ tự cố định); **redirect delivery centralized** (Nest authoritative, `12` D11); **module seo**: canonical+robots resolver (route+trạng thái), **sitemap/robots ở Nest** (D13), hreflang (cả hai published), structured data, social image fallback.
- **Admin:** menu editor (reorder cơ bản; kéo-thả P1), homepage config, redirect list/form, SEO defaults (default_social_image, robots site-level).
- **Public:** header/mega menu, homepage render, `<head>` từ SEO contract (Next serialize — D12).
- **API:** `/navigation/:location`, `/home`, `/sitemap.xml`, `/sitemap-:locale.xml`, `/robots.txt` (Nest — D13), admin menus/homepage/redirects.
- **Seed:** menu header/footer; homepage sections; redirects.
- **Unit:** canonical/robots resolver (mọi loại trang); hreflang cả-hai-published; social fallback; redirect loop/chain detector.
- **Integration:** sitemap chỉ published theo locale (không filter/search); robots.txt; `/san-pham/hang/{slug}`→301; mega menu auto.
- **Contract/E2E:** đổi slug→301 (redirect-before-render, `12` §9); brand self-canonical; filter noindex; EN chưa publish→không hreflang EN.
- **Security:** open-redirect prevention; canonical host allowlist; robots không lộ path nội bộ; menu external URL validate.
- **Performance:** homepage aggregate no-N+1; **sitemap generation strategy/size budget** (ME-08/§K1); redirect overhead.
- **Migration:** không mới.
- **Acceptance:** canonical/robots đúng ADR-011; sitemap/redirect/hreflang đúng; mega menu auto; **no new search**.
- **Evidence:** resolver tests (mọi loại trang); sample sitemap/robots; redirect E2E (`<sha>/P8/`).
- **Rollback:** **feature disable** new delivery; **cache purge**; **redirect snapshot**; **forward SEO fix**; route compatibility (§L).
- **Out-of-scope:** kéo-thả homepage/menu (P1); **search mới**; site-wide search (P1); scheduled publishing (P1).
- **Rủi ro:** R-13 SEO, R-08 redirect, R-23 routing owner.
- **Ai implement:** C (seo resolver/redirect delivery); X (navigation/homepage).
- **Ai review:** chéo (seo do X review).
- **Điều kiện chuyển:** resolver PASS mọi loại trang; redirect PASS; sitemap/robots ở Nest.

---

## PHASE 9 — Admin Completion

- **Mục tiêu:** **hoàn thiện** editor/component/responsive/a11y trên thin UI đã có (không bắt đầu FE). **No Users CRUD, no auto-save advanced** (HI-15/16).
- **Phạm vi:** Admin (Next `/admin` route group).
- **Đầu vào:** thin Admin P2–P8; 07 wireframe; A15/A17/A18/A13.
- **Backend:** vá contract nếu lệch.
- **Admin:** hoàn thiện AdminLayout/DataTable/form nhiều section/MediaPicker/BlockEditor+External Video/TreeSelector/RelationSelector/SpecEditor/SEOEditor (no index/follow/social-picker)/PublishPanel+checklist/StatusBadge+LanguageTabs; **chống mất dữ liệu = cảnh báo rời trang + manual save draft** (KHÔNG auto-save advanced — P1).
- **Public:** —.
- **API:** `/admin/*` + `/auth/*`.
- **Unit/Integration:** filter chip OR/AND; badge locale; spec editor; publish checklist; PATCH replace-set; SEO form không index/follow; **không** render ecommerce fields (ADR-010).
- **Contract/E2E:** đăng nhập→tạo brand/product→publish→xem; upload media; đổi slug (redirect); external video; **manual save draft + unsaved warning** (không auto-save).
- **Security:** CSRF token; no-secret FE; XSS.
- **Performance:** danh sách lớn phân trang; form phức tạp.
- **Acceptance:** mọi màn 07; publish checklist; **không control bị cấm** (index/follow/social-picker/upload-video/**Users CRUD/auto-save**).
- **Evidence:** E2E recordings; ảnh màn chính (`<sha>/P9/`).
- **Rollback:** **versioned deploy + backward-compatible API + blue/green** (client/API mismatch — §L); code revert FE.
- **Out-of-scope:** bulk/duplicate/kéo-thả homepage-menu/dashboard cảnh báo nội dung/**auto-save advanced** (P1); **Users CRUD** (Future); UI inquiry (Future).
- **Rủi ro:** R-06 API drift, R-03 (auto-save/Users signal — đã loại), R-30 mixed-version.
- **Ai implement:** C (product/publish/SEO editor); X (taxonomy/content/settings/menu/redirect màn).
- **Ai review:** chéo + integration reviewer.
- **Điều kiện chuyển:** E2E Admin PASS; no scope-leak control.

---

## PHASE 10 — Public Completion

- **Mục tiêu:** **hoàn thiện** trang công khai SSR (polish/a11y/perf) trên thin UI đã có; redirect-before-render; locale mapping.
- **Phạm vi:** Public (Next).
- **Đầu vào:** API P4–P8 + seo resolver (`12`); 02/08; A5/A6/A10/A14/A17.
- **Backend:** vá nếu lệch.
- **Public:** hoàn thiện PublicLayout/Header/MegaMenu/MobileMenu; homepage; product list+FilterSidebar (chip OR/AND, URL slug key-lặp); product detail (+discontinued); brand/service/project/post/document; ContactForm/InquiryModal (idempotency, 202); search sản phẩm; system pages (404/yêu-cầu-thành-công/policy); `<head>` canonical/robots/hreflang/OG (serialize từ Nest — D12); i18n `/en` (EN chưa publish→xử lý đúng, không trộn); external_video render an toàn; a11y+responsive+lazy/WebP.
- **API:** public `/api/v1/*` + sitemap/robots (Nest).
- **Unit/Integration:** filter URL sync; **locale switch mapping** (fallback về list EN); SSR canonical/robots đúng loại trang.
- **Contract/E2E (14 luồng + bổ sung §K1):** lọc `(PAC OR Herzog) AND ASTM D86`; brand EN không fallback; video hợp lệ/không; form SMTP OK/lỗi; discontinued; download slug (**Content-Disposition/nosniff**); đổi slug **redirect-before-render**; **SSR hydration mismatch**; **mobile responsive**; **keyboard/focus a11y**.
- **Security:** no raw iframe; CAPTCHA; no lỗi kỹ thuật; CSP.
- **Performance:** list/detail/homepage/landing/search latency; **p95 dev/staging + Lighthouse budget** (ME-08); no over-fetch.
- **SEO (§K1):** base URL environment; trailing slash; query order/allowlist; pagination canonical; 404/410; XML/JSON-LD escape; locale mapping.
- **Acceptance:** mọi trang P0 (02/08); SEO đúng; form không mất lead; EN không trộn; redirect-before-render.
- **Evidence:** 14-luồng E2E recordings; Lighthouse/SEO audit; canonical/robots trên các loại trang (`<sha>/P10/`).
- **Rollback:** **versioned assets + backward-compatible API + blue/green/canary + generated-client gate** (§L).
- **Out-of-scope:** tìm kiếm toàn site/FAQ/timeline/landing chiến dịch/attachment (P1).
- **Rủi ro:** R-13 SEO, R-07 locale, R-20 tích hợp muộn (giảm bởi thin UI sớm), R-30 mixed-version.
- **Ai implement:** C (product/filter/form/SEO-head); X (brand/service/project/post/document/homepage/system pages).
- **Ai review:** chéo + integration reviewer.
- **Điều kiện chuyển:** 14 luồng E2E PASS; SEO audit sạch; a11y/mobile PASS.

---

## PHASE 11 — Content Delta, Integration, Hardening & Release

- **Mục tiêu:** CM4 cutover + hardening + go-live.
- **Phạm vi:** toàn hệ + CM4.
- **Đầu vào:** P0–P10; C5/C7/C9 (domain/SPF/DKIM, content owner, RPO/RTO — before-P11).
- **Backend:** rate-limit toàn cục; security headers; cache; **backup DB+media + restore drill**; monitoring SMTP/outbox/storage.
- **Database:** restore drill; không đổi baseline.
- **CM4 (`13`):** content freeze; delta export/import; final redirect map; rollback snapshot; post-go-live crawl.
- **Tests:** regression toàn bộ; cross-module (publish→sitemap→redirect; inquiry→outbox→email); full security; **load test** (list/detail/homepage/landing/search/outbox batch); N+1 sweep; **OpenAPI backward-compat + generated-client freshness + mixed-version/blue-green smoke**; a11y/mobile; **CM validation** (counts/checksum/redirect coverage/broken-link/delta idempotency).
- **Acceptance:** không Critical/High security; perf đạt **budget staging** (không SLA); backup/restore PASS; SEO/broken-link crawl sạch; monitoring; **rollback decision points**; **user go-live approval**.
- **Evidence:** security/load/restore/CM reports; go-live checklist ký (`<sha>/P11/`).
- **Rollback:** **tested backup/restore + cutover runbook + rollback decision point + DNS/CDN/cache plan + worker drain + forward-fix + content-delta snapshot** (§L).
- **Out-of-scope:** mọi P1/Future.
- **Rủi ro:** R-15 deploy storage/email, R-14 test giả, R-18 secret, **R-27 content migration incomplete**, **R-28 destructive rollback**.
- **Ai implement:** C (security/perf backend); X (FE a11y/perf); **release captain** (user chỉ định); user chạy lệnh.
- **Ai review:** chéo + fresh integration reviewer + **user phê duyệt go-live**.
- **Điều kiện chuyển:** DoD toàn dự án; user phê duyệt.

---

## Milestones

| Milestone | Sau | Ý nghĩa |
|---|---|---|
| M0 — Decisions & Git Ready | P0 | D1–D16 + Git hợp lệ + topology locked |
| M1 — Foundation Ready | P3 | DB+auth+media+content-security |
| M2 — Catalogue Usable | P5 | products/filter/search usable end-to-end (nút thắt qua) |
| M3 — Content Complete | P6B | entity + quan hệ chéo |
| M4 — Lead-safe | P7 | inquiry + worker shutdown-safe |
| M5 — Web Delivery Ready | P8 | nav/homepage/redirect/sitemap/canonical |
| M6 — UI Complete | P10 | Admin+Public completion |
| M7 — Release Candidate | P11 | security/perf/backup/CM4 → go-live |

## Content Migration (song song — `13`)
CM0 Inventory (P4) · CM1 Mapping (P4–P5) · CM2 Importer/Dry-Run (P5–P7) · CM3 Validation (P7–P10) · CM4 Freeze/Delta/Cutover (P11).
