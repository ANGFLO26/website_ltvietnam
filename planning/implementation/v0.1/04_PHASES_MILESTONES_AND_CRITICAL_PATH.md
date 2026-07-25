# 04 — PHASES, MILESTONES & CRITICAL PATH

**Plan version:** v0.1 · **Trạng thái:** PROPOSED FOR CROSS-REVIEW · **Ngày:** 2026-07-22

12 phase theo chiến lược Hybrid (`02`). Mỗi phase có đủ 24 mục. Ký hiệu người thực hiện: **C**=Claude, **X**=Codex. "Review độc lập" = AI *không* implement phase đó.

> Nguyên tắc test: ghi rõ **test gì, ở lớp nào, kiểm chứng điều gì** — không "test đầy đủ". Chi tiết lớp test ở `06`.

---

## PHASE 0 — Technology Decisions & Repository Bootstrap

- **Mục tiêu:** Chốt OPEN DECISIONS (`01` PHẦN B) và dựng khung repo/tooling để mọi phase sau có nền chung.
- **Phạm vi module:** infra/tooling (không module nghiệp vụ).
- **Đầu vào bắt buộc:** `01` PHẦN B đã được người dùng chốt (ít nhất B1–B10, B19); quyết định monorepo.
- **Phụ thuộc:** không (gốc).
- **Công việc backend:** khởi tạo project theo stack đã chốt; cấu trúc thư mục modular monolith; base config; skeleton OpenAPI.
- **Công việc database:** chưa (chỉ chuẩn bị công cụ migration + kết nối Postgres 16).
- **Công việc Admin:** scaffold app rỗng + routing khung.
- **Công việc Public Frontend:** scaffold app SSR rỗng + i18n `/en` khung.
- **API liên quan:** chưa (định nghĩa quy ước `/api/v1`, response/error format A24).
- **Dữ liệu seed/fixture:** chưa.
- **Unit test:** cấu hình test runner chạy được (1 test mẫu xanh).
- **Integration test:** compose up Postgres 16 + app khởi động (smoke).
- **API contract test:** khung OpenAPI validate được (rỗng).
- **E2E test:** khung Playwright chạy 1 test mẫu.
- **Security test:** bật lint security rules; kiểm `.gitignore` chặn secret/.env.
- **Performance/smoke test:** app boot < ngưỡng; healthcheck skeleton.
- **Migration test:** công cụ migration kết nối được DB (chưa chạy 001–070).
- **Acceptance criteria:** repo build xanh; lint/type/test pipeline chạy; docker-compose up thành công; OPEN DECISIONS ghi vào ADR-implementation (không đổi ADR gốc).
- **Evidence cần lưu:** log CI build xanh; `docker-compose up` log; ảnh cấu trúc thư mục; bản chốt OPEN DECISIONS.
- **Rollback strategy:** xóa scaffold; không ảnh hưởng gì (chưa có DB/data).
- **Out-of-scope:** bất kỳ bảng/endpoint nghiệp vụ.
- **Rủi ro:** chọn sai stack (R-01) → khó đổi về sau. Giảm thiểu: chốt qua cross-review trước khi bootstrap.
- **Ai implement:** C (khung) — nhưng **chỉ sau khi người dùng chốt B1**.
- **Ai review độc lập:** X (kiểm cấu trúc, circular-dep guard, secret hygiene).
- **Điều kiện chuyển phase:** DoR của P1 đạt; pipeline xanh; stack đã chốt.

---

## PHASE 1 — Development Environment & Database Baseline

- **Mục tiêu:** Dựng schema `ltv` **baseline 001–070** đúng `05`, chạy thật trên Postgres 16, rollback 070→001, seed tối thiểu.
- **Phạm vi module:** migration/DB, dev environment.
- **Đầu vào bắt buộc:** P0 done; `05` §XIV thứ tự migration; `doc/verify/schema_up.sql`/`schema_down.sql` làm tham chiếu (KHÔNG copy vào doc/, chỉ đối chiếu).
- **Phụ thuộc:** P0.
- **Công việc backend:** cấu hình kết nối, pool, `search_path=ltv`.
- **Công việc database:** viết migration **001→070** khớp 63 bảng + extensions (pgcrypto/citext/pg_trgm) + function `set_updated_at` (003) + trigger (070) + FK indexes (067) + search GIN trgm (068) + partial indexes (069); mỗi migration có `down`.
- **Công việc Admin/Public FE:** —.
- **API liên quan:** —.
- **Dữ liệu seed/fixture:** 1 user admin (Argon2id hash), settings tối thiểu (email group placeholder, seo defaults), standards mẫu; fixture cho test FK/CHECK.
- **Unit test:** —.
- **Integration test (DB):** áp 001→070 trên DB rỗng PASS; **kiểm 63 bảng, extensions, 23 trigger, CHECK/enum, unique, FK** (đối chiếu `verify_checks.sql`).
- **API contract test:** —.
- **E2E test:** —.
- **Security test:** không hardcode credential; role `ltv` least-privilege (khuyến nghị).
- **Performance/smoke test:** thời gian áp full migration hợp lý; index tồn tại.
- **Migration test (bắt buộc):** `001→070` PASS; **rollback `070→001` PASS**; **migration lần hai** (idempotent trên DB đã rollback) PASS; **KHÔNG** chạy `071`.
- **Acceptance criteria:** tái lập kết quả `POSTGRESQL16_EXECUTION_RESULT.md` — ALL CHECKS PASSED; seed admin đăng nhập được (sau P2).
- **Evidence cần lưu:** log migration up/down/lần-hai; kết quả `verify_checks`; dump danh sách bảng/trigger/constraint.
- **Rollback strategy:** `down` từng migration theo 070→001; DB test `ltv_verify` xóa sau.
- **Out-of-scope:** bất kỳ ALTER kiểu 071; thay đổi cấu trúc bảng.
- **Rủi ro:** migration drift (R-05) — migration lệch `05`. Giảm thiểu: đối chiếu từng bảng với `05`; freeze sau lần chạy đầu.
- **Ai implement:** C (DB owner).
- **Ai review độc lập:** X (so từng cột/constraint với `05`; chạy lại migration+rollback độc lập).
- **Điều kiện chuyển phase:** ALL CHECKS PASSED trên Postgres 16; rollback PASS; freeze baseline.

---

## PHASE 2 — Core Foundation (config, errors, logging, auth, users, settings, health, audit log)

- **Mục tiêu:** Nền ứng dụng an toàn: cấu hình, lỗi chuẩn, log có cấu trúc, xác thực Admin, users, settings, health, audit log; khung service lõi.
- **Phạm vi module:** config, errors, logging, auth, users, settings, health.
- **Đầu vào bắt buộc:** P1 done; A19/A20/A24.
- **Phụ thuộc:** P1.
- **Công việc backend:** error handler + mã lỗi nghiệp vụ (06 §X); logging pino + `X-Request-ID` + nhóm log; **auth** (login/logout/me/change-password/forgot/reset, Argon2id, JWT HttpOnly+Secure+SameSite=Strict cookie, phiên 8h, CSRF, CORS origin cụ thể, rate-limit login 5/15', khóa sau N, reset token vô hiệu khi `password_changed_at` đổi); users CRUD tối thiểu; settings GET/PATCH theo group (mask secret `********`); health `/live` public + `/ready` nội bộ; **structured audit log** (login success/failure, password change/reset, settings change...).
- **Công việc database:** dùng bảng users/settings/redirects đã có; không thêm bảng.
- **Công việc Admin:** màn đăng nhập + dashboard skeleton + settings tab (scaffold, kết nối API auth/settings).
- **Công việc Public FE:** —.
- **API liên quan:** `/auth/*`, `/admin/settings`, `/health/live`, `/health/ready`.
- **Dữ liệu seed/fixture:** admin user; settings groups (company/contact/email/seo/security/upload...).
- **Unit test:** password hashing/verify; JWT issue/verify; reset-token invalidation khi đổi mật khẩu; error-to-HTTP mapping; audit-log field builder (không chứa secret/PII).
- **Integration test:** login flow (đúng/sai/khóa/quá nhiều lần); settings mask secret; `/ready` phản ánh DB down.
- **API contract test:** `/auth/*` + `/admin/settings` khớp OpenAPI; error format A24.
- **E2E test:** Admin đăng nhập thành công/thất bại; đổi mật khẩu; đăng xuất.
- **Security test:** cookie HttpOnly/Secure/SameSite; CSRF thiếu token → 403; CORS origin lạ → chặn; rate-limit login; không trả secret; header an toàn.
- **Performance/smoke test:** login < ngưỡng; `/live` nhanh.
- **Migration test:** không mới (baseline giữ nguyên).
- **Acceptance criteria:** đăng nhập/đăng xuất/đổi mật khẩu hoạt động; settings mask secret; health đúng; audit log ghi đúng field, không PII.
- **Evidence cần lưu:** test reports; mẫu audit log (đã che PII); ảnh cookie flags; kết quả security test.
- **Rollback strategy:** revert code theo module; không đổi DB.
- **Out-of-scope:** multi-role/phân quyền (Future); Admin UI audit log (P1).
- **Rủi ro:** secret/PII lọt log (R-14/R-18); sai cookie/CSRF (R-19). Giảm thiểu: security test bắt buộc + review X.
- **Ai implement:** C.
- **Ai review độc lập:** X (đặc biệt auth/security).
- **Điều kiện chuyển phase:** security test không Critical/High; auth E2E PASS.

---

## PHASE 3 — Media & Storage

- **Mục tiêu:** Quản lý media tập trung an toàn + MediaUsageService + storage adapter — nền cho mọi content/catalogue.
- **Phạm vi module:** media, storage-adapter.
- **Đầu vào bắt buộc:** P2 done; A12 (ADR-005/009).
- **Phụ thuộc:** P2.
- **Công việc backend:** upload multipart (title/alt/caption/credit); **kiểm magic-bytes/MIME thực**, whitelist `image/jpeg,png,webp,application/pdf` (**không SVG/executable/video**), giới hạn dung lượng, đổi tên an toàn, chống path traversal, checksum chống trùng; tạo phiên bản (thumbnail/small/medium/large + WebP); list/detail/patch; **DELETE qua MediaUsageService** → 409 `MEDIA_IN_USE` + `details` nơi dùng; soft delete → purge trễ; query công khai loại `deleted_at`.
- **Công việc database:** dùng bảng `media` (không thêm bảng).
- **Công việc Admin:** Media library (lưới + panel "Đang sử dụng tại"), FileUploader, MediaPicker (scaffold để module sau dùng).
- **Công việc Public FE:** —.
- **API liên quan:** `POST/GET/PATCH/DELETE /admin/media`.
- **Dữ liệu seed/fixture:** vài media mẫu; file test giả (JPG hợp lệ, SVG, MP4, PDF giả MIME) cho security test.
- **Unit test:** magic-bytes detector; MIME/extension whitelist; checksum dedup; MediaUsageService quét đủ ~22 tham chiếu (mock).
- **Integration test:** upload hợp lệ tạo phiên bản; xóa media đang dùng → 409; xóa media không dùng → soft delete.
- **API contract test:** endpoints media khớp OpenAPI.
- **E2E test:** Admin upload media thành công; thử xóa media đang dùng bị chặn.
- **Security test:** **SVG rejection**; **MIME spoofing** (đuôi .jpg nội dung SVG/script → reject); path traversal tên file; upload MP4 → reject; kích thước quá hạn → reject.
- **Performance/smoke test:** upload + resize trong ngưỡng; list media phân trang.
- **Migration test:** không mới.
- **Acceptance criteria:** chỉ 5 loại được nhận; magic-bytes hoạt động; 409 khi đang dùng; phiên bản WebP tạo ra.
- **Evidence cần lưu:** test reports; log reject SVG/MP4/spoof; ảnh panel "đang sử dụng".
- **Rollback strategy:** revert code; file đã upload trong test dọn ở teardown.
- **Out-of-scope:** attachment khách (P1); video upload (không bao giờ P0).
- **Rủi ro:** media xóa nhầm (R-11); MIME spoof (R-19). Giảm thiểu: RESTRICT + MediaUsageService + security test.
- **Ai implement:** C (magic-bytes/usage service) — X có thể làm phần versioning ảnh.
- **Ai review độc lập:** X.
- **Điều kiện chuyển phase:** security test upload không Critical/High; 409 hoạt động.

---

## PHASE 4 — Catalogue Taxonomy (brands, categories, standards, applications, industries)

- **Mục tiêu:** 5 taxonomy + **hoàn thiện SlugService/redirect + locale rules** (brands là entity slug+locale-status đầu tiên).
- **Phạm vi module:** brands, product_categories, standards, applications, industries + SlugService, redirect (khung).
- **Đầu vào bắt buộc:** P3 done; A5/A6/A7/A10/A11/A16.
- **Phụ thuộc:** media (P3), core (P2).
- **Công việc backend:** CRUD + publish/hide/archive/soft-delete/restore; **brands** (self parent SET NULL, sub_brand phải có parent, no-loop backend, locale-status, KHÔNG fallback detail); **product_categories** (cây, reorder); **standards** (`UNIQUE(UPPER(org),UPPER(code))`); **applications** (parent trong DB nhưng API/Admin phẳng); **industries**; **SlugService 3-nguồn** + tạo redirect 301 khi đổi slug (transaction); set `first_published_at` một lần.
- **Công việc database:** dùng bảng đã có; không thêm.
- **Công việc Admin:** danh sách + form từng taxonomy; **cây kéo-thả cho product_categories** (P0); **applications phẳng**; badge locale (VI/EN); SEO form (chỉ title/description/slug + preview, không index/follow/social-picker).
- **Công việc Public FE:** trang list hãng + hồ sơ hãng `/hang-doi-tac/{slug}`; landing category/standard/application (self-canonical) — scaffold, hoàn thiện ở P10.
- **API liên quan:** `/brands*`, `/product-categories*`, `/standards*`, `/applications*`, `/industries*` (public slug) + admin UUID.
- **Dữ liệu seed/fixture:** PAC + sub-brands (Herzog/ISL...), vài category, standards (ASTM D86...), applications, industries — để P5 dùng.
- **Unit test:** **SlugService 3-nguồn** (reject slug hiện tại/redirect/route bảo lưu); no-loop cây (brand/category); `first_published_at` set một lần (publish→republish không đổi); locale query condition.
- **Integration test:** đổi slug đã publish → tạo redirect + không loop/chain trong 1 transaction; hard-delete chỉ khi draft chưa publish; soft-delete giữ slug; xóa brand có sản phẩm (sau P5) → chặn.
- **API contract test:** filter/pagination/locale; public trả slug không UUID.
- **E2E test:** tạo brand/category draft → publish VI → hiển thị; EN chưa publish → không fallback (brand detail EN không tồn tại).
- **Security test:** auth cho admin endpoints; XSS trong description block (sanitize); validation slug (chữ thường/không dấu/không từ khóa hệ thống).
- **Performance/smoke test:** list taxonomy phân trang; tree không N+1.
- **Migration test:** không mới.
- **Acceptance criteria:** 5 taxonomy CRUD+publish; SlugService/redirect hoạt động; brand không fallback EN; applications phẳng ở Admin.
- **Evidence cần lưu:** test SlugService; log redirect tạo khi đổi slug; ảnh cây category + applications phẳng.
- **Rollback strategy:** revert theo module (mỗi taxonomy độc lập); không đổi DB.
- **Out-of-scope:** products (P5); facet count (P1); kéo-thả applications (không P0).
- **Rủi ro:** slug/redirect sai (R-08); thiếu locale-status (R-07). Giảm thiểu: unit test SlugService + locale condition.
- **Ai implement:** C làm **brands + SlugService** (lõi); X làm standards/applications/industries song song; product_categories: C hoặc X (cây).
- **Ai review độc lập:** chéo (C review của X và ngược lại) — SlugService do X review.
- **Điều kiện chuyển phase:** SlugService test PASS; 5 taxonomy publish được; seed đủ cho P5.

---

## PHASE 5 — Products & Relationships (NÚT THẮT)

- **Mục tiêu:** products đầy đủ + PublishService + filter builder (OR/AND) + product search + landing.
- **Phạm vi module:** products, search (product).
- **Đầu vào bắt buộc:** P4 done (đủ brands/categories/standards/applications/industries + media); A14/A15/A16/A10.
- **Phụ thuộc:** brands (NOT NULL), 3 taxonomy, media, SlugService, PublishService.
- **Công việc backend:** products (+translations, specifications, 6 bảng link: category_links/standards/applications/industries/media/related); **PublishService** (VI đủ điều kiện, đúng 1 primary category, brand/category chưa xóa, featured_image, slug không trùng → 422 mã lỗi khi thiếu); **PATCH replace-tập-quan-hệ** (transaction); **filter query builder** (slug, key-lặp, cùng-dim OR/khác-dim AND, parameter binding); **product search pg_trgm**; **discontinued** flag + thay thế; **`GET /products/landing`** (ProductLandingQueryService riêng, batch load, cache ngắn).
- **Công việc database:** dùng bảng đã có.
- **Công việc Admin:** form sản phẩm nhiều section (07 §IV): thông tin chung, nội dung VI/EN tab, hãng&danh mục, tiêu chuẩn, thông số (spec editor), ứng dụng&ngành, hình ảnh (roles không featured), tài liệu, liên quan, SEO, nâng cao (ẩn ecommerce), trạng thái; publish panel + checklist.
- **Công việc Public FE:** list `/san-pham/tat-ca` + filter UI; detail `/san-pham/{slug}`; landing `/san-pham` — scaffold, hoàn thiện P10.
- **API liên quan:** `/products`, `/products/:slug`, `/products/landing`, `/product-categories/:slug/products`, `/standards|applications|industries/:slug/products`; admin products CRUD/publish.
- **Dữ liệu seed/fixture:** sản phẩm PAC OptiDist 2 + vài SP đủ để test filter `(PAC OR Herzog) AND ASTM D86`.
- **Unit test:** **filter builder** cho `brand=pac&brand=herzog` (OR), `brand=pac&standard=astm-d86` (AND), tổ hợp; PublishService các nhánh thiếu (missing primary/overview...); PATCH replace-set logic; discontinued resolver.
- **Integration test:** publish product (transaction, set published_at + first_published_at); PATCH thiếu mảng → giữ nguyên, có mảng → thay thế; đúng 1 primary category; filter trả đúng tập; search trả kết quả trgm.
- **API contract test:** `/products` filter/pagination/sort whitelist/locale; landing shape; error codes.
- **E2E test:** tạo product draft (chỉ Tên VI+Hãng+Danh mục chính) → publish VI → hiển thị; EN chưa publish không xuất hiện; lọc `(PAC OR Herzog) AND ASTM D86`; bỏ chip chỉ xóa đúng giá trị.
- **Security test:** parameter binding (SQL injection qua filter → an toàn); admin auth; XSS trong content block; external_video validate (chuyển P6 nếu block dùng chung, nhưng product content có video → test tại đây).
- **Performance/smoke test:** product list (không N+1), detail (batch load quan hệ), landing aggregate, search — đo latency; N+1 detection.
- **Migration test:** không mới.
- **Acceptance criteria:** publish/filter/search/landing hoạt động đúng ADR-007/010; discontinued giữ URL.
- **Evidence cần lưu:** test filter 3 tổ hợp; EXPLAIN cho list/detail (no N+1); publish transaction log.
- **Rollback strategy:** revert module products; seed dọn.
- **Out-of-scope:** facet count (P1); duplicate product (P1); ecommerce fields UI.
- **Rủi ro:** N+1 (R-12); filter sai ngữ nghĩa (R-06); publish sai locale (R-07). Giảm thiểu: unit test tổ hợp + EXPLAIN + review kỹ (nút thắt).
- **Ai implement:** C (PublishService + filter builder + search) — lõi.
- **Ai review độc lập:** X (audit filter binding + N+1 + publish rules).
- **Điều kiện chuyển phase:** 3 tổ hợp filter PASS; publish E2E PASS; no N+1 ở list/detail.

---

## PHASE 6 — Content (pages, services, projects, posts, documents, customers, offices)

- **Mục tiêu:** Các entity nội dung còn lại + external_video block + download tài liệu bằng slug.
- **Phạm vi module:** pages, services, projects, post_categories→posts, documents, customers, offices.
- **Đầu vào bắt buộc:** P5 done (link quan hệ tới products); A10/A17/A18.
- **Phụ thuộc:** media, taxonomy, products/services (link), customers (cho projects).
- **Công việc backend:** CRUD+publish mỗi entity; **services** (cây, service_products/brands/industries, document_services); **projects** (`customer_visibility` xử lý ở **backend**, project_* links); **posts** (post_categories RESTRICT, post_* links); **documents** (file RESTRICT, `document_type` không video, `GET /documents/:slug/download`); **customers** (is_public gate); **offices**; **external_video** validate (provider youtube/vimeo, trích ID, không raw iframe) — service dùng chung cho pages/products/brands/services/projects/posts.
- **Công việc database:** dùng bảng đã có.
- **Công việc Admin:** form từng entity (07 §VI/VII); block editor + **External Video block**; customer_visibility radio; documents form (visibility public/hidden).
- **Công việc Public FE:** trang chi tiết tương ứng — scaffold, hoàn thiện P10.
- **API liên quan:** `/pages/:slug`, `/services*`, `/projects*`, `/posts*`, `/post-categories*`, `/documents*` (+download), `/customers`, `/offices` + admin.
- **Dữ liệu seed/fixture:** 1 page, 1 service (cây), 1 project (mỗi visibility), 1 post, 1 document PDF, vài customer, 1 office.
- **Unit test:** external_video validate (youtube/vimeo hợp lệ; domain lạ/raw iframe → reject); customer_visibility resolver (public/hide_name/industry_only/confidential); document download visibility gate.
- **Integration test:** publish mỗi entity (locale rules); project confidential ẩn tên ở backend; document hidden không tải công khai; posts cần category (RESTRICT).
- **API contract test:** endpoints khớp OpenAPI; download bằng slug.
- **E2E test:** tài liệu công khai tải bằng slug; video YouTube/Vimeo render an toàn; raw iframe/domain lạ không render; project confidential không lộ tên.
- **Security test:** XSS trong content block (sanitize whitelist); external_video không lưu script; download path an toàn.
- **Performance/smoke test:** list mỗi entity phân trang; detail no N+1.
- **Migration test:** không mới.
- **Acceptance criteria:** 7 nhóm content publish + hiển thị đúng; external_video an toàn; download slug; customer_visibility ở backend.
- **Evidence cần lưu:** test external_video; log reject raw iframe; test customer_visibility.
- **Rollback strategy:** revert theo module (độc lập nhau).
- **Out-of-scope:** product_videos table (P1); document visibility email_required/... (Future).
- **Rủi ro:** XSS content block (R-19); customer_visibility rò rỉ (privacy). Giảm thiểu: sanitize + backend gate + security test.
- **Ai implement:** **song song** — C: services+projects (phức tạp, link nhiều) + external_video service; X: pages+customers+offices+documents+post_categories/posts. (Phân vùng chi tiết ở `08`.)
- **Ai review độc lập:** chéo.
- **Điều kiện chuyển phase:** mọi entity publish được; external_video test PASS; download slug PASS.

---

## PHASE 7 — Inquiry & Outbox Worker

- **Mục tiêu:** Chống mất lead: lưu DB trước email, 202, worker an toàn nhiều instance, idempotency, at-least-once.
- **Phạm vi module:** inquiries, inquiry_outbox worker.
- **Đầu vào bắt buộc:** P5 (products/services link) + P2 (settings.email); A8/A9/A23; C5 (domain/SPF/DKIM để test thật — có thể dùng MailHog nếu C5 chưa xong).
- **Phụ thuộc:** settings, products/services, SMTP-adapter, CAPTCHA.
- **Công việc backend:** `POST /inquiries` (validate DTO → CAPTCHA → rate-limit 5/10'/IP → idempotency check → transaction INSERT inquiries(email_pending)+inquiry_outbox(pending) → 202); **worker** `FOR UPDATE SKIP LOCKED` → processing+lock → gửi email → sent/retry(backoff)/failed; **reaper** processing quá hạn → pending; **Message-ID ổn định** từ `outbox.id`; email From=domain, Reply-To=khách, **sanitize header** (bỏ CR/LF); `last_error` sanitize không PII/secret.
- **Công việc database:** dùng inquiries/inquiry_outbox (không thêm bảng).
- **Công việc Admin:** **KHÔNG** UI quản lý inquiry (ADR-003); dashboard widget số `email_failed` từ outbox.
- **Công việc Public FE:** InquiryModal + ContactForm (idempotency-key) — scaffold, hoàn thiện P10.
- **API liên quan:** `POST /api/v1/inquiries` (public, không đăng nhập).
- **Dữ liệu seed/fixture:** settings email recipient; MailHog cho test.
- **Unit test:** idempotency (cùng key → không tạo mới); backoff schedule; Message-ID xác định từ outbox.id (retry cùng ID); header sanitize (CR/LF); last_error sanitize (không PII).
- **Integration test:** transaction inquiries+outbox atomic; email_status transitions (pending→sent/failed); UNIQUE(inquiry_id,channel,recipient) chặn job trùng.
- **API contract test:** 202 shape; error INQUIRY_RATE_LIMITED/INQUIRY_DUPLICATE.
- **E2E test:** gửi Inquiry khi SMTP OK → email nội bộ nhận; gửi khi SMTP lỗi → vẫn 202 "đã tiếp nhận" (đã lưu DB); retry outbox → cuối cùng sent; 2 lần cùng Idempotency-Key → 1 inquiry.
- **Security test (concurrency BẮT BUỘC):** **2 worker cùng job → chỉ 1 processing (SKIP LOCKED)**; **reaper** đưa processing quá hạn về pending; **retry cùng Message-ID**; **2 request cùng Idempotency-Key**; SMTP đã nhận + worker chết trước khi ghi sent → có thể gửi lại (at-least-once, không exactly-once); rate-limit; không log PII đầy đủ.
- **Performance/smoke test:** outbox batch xử lý; nhiều inquiry đồng thời.
- **Migration test:** không mới.
- **Acceptance criteria:** không mất yêu cầu khi SMTP lỗi; idempotency; at-least-once; header an toàn; không PII trong log/Message-ID.
- **Evidence cần lưu:** log 2-worker concurrency; log reaper; test idempotency; mẫu email (che PII).
- **Rollback strategy:** dừng worker; revert code; outbox giữ dữ liệu (không mất).
- **Out-of-scope:** attachment (P1); email xác nhận khách (C3/P1); CRM UI (Future).
- **Rủi ro:** mất/gửi trùng inquiry (R-09). Giảm thiểu: concurrency test đầy đủ; không dùng câu "không bao giờ gửi trùng".
- **Ai implement:** C (worker/outbox/idempotency — lõi concurrency).
- **Ai review độc lập:** X (audit SKIP LOCKED/reaper/at-least-once + header injection).
- **Điều kiện chuyển phase:** concurrency test PASS; SMTP-lỗi-vẫn-202 PASS.

---

## PHASE 8 — Navigation, Homepage, Redirects, SEO, Search

- **Mục tiêu:** Cross-cutting: mega menu auto-generated, homepage sections cố định, redirect middleware, module seo (sitemap/robots/hreflang/canonical+robots resolver/structured data).
- **Phạm vi module:** navigation, homepage, redirects, seo.
- **Đầu vào bắt buộc:** P4–P7 (catalogue+content publish được); A5/A6/A11/A17.
- **Phụ thuộc:** toàn bộ catalogue+content.
- **Công việc backend:** navigation `/navigation/:location` (mega menu gộp category/brand is_featured + standards/applications cấu hình; kiểm no-loop/đích tồn tại); homepage `GET /home` + admin PATCH section (bật/tắt+chọn nổi bật, thứ tự cố định); **redirect middleware** (phục vụ trước router, source unique, no loop/chain); **module seo**: canonical+robots **resolver** theo route+trạng thái, `sitemap.xml`/`sitemap-{locale}.xml` (chỉ published, không filter/search), `robots.txt`, hreflang (cả hai published), structured data, social image **fallback chain**.
- **Công việc database:** dùng menus/menu_items/homepage_sections/banners/redirects.
- **Công việc Admin:** menu editor (reorder cơ bản, kéo-thả P1), homepage (bật/tắt+cấu hình), redirect list/form, SEO defaults (default_social_image, robots site-level).
- **Công việc Public FE:** header/mega menu, homepage render, `<head>` SEO tags — hoàn thiện ở P10 nhưng resolver test tại đây.
- **API liên quan:** `/navigation/:location`, `/home`, `/sitemap.xml`, `/sitemap-:locale.xml`, `/robots.txt`, admin menus/homepage/redirects.
- **Dữ liệu seed/fixture:** menu header/footer; homepage sections; vài redirect.
- **Unit test:** **canonical/robots resolver** (chi tiết→index self-canonical; `?brand=`→noindex,follow canonical `/san-pham/tat-ca`; landing category→index self; search→noindex,follow; admin/error→noindex,nofollow); hreflang chỉ khi cả hai published; social image fallback chain; redirect loop/chain detector.
- **Integration test:** sitemap chỉ chứa URL published theo locale; robots.txt đúng; `/san-pham/hang/{slug}` → 301 `/san-pham/tat-ca?brand={slug}`; mega menu auto từ is_featured.
- **API contract test:** navigation/home/sitemap/robots.
- **E2E test:** đổi slug → redirect 301 hoạt động; brand detail self-canonical; filter noindex; EN chưa publish → không hreflang EN.
- **Security test:** redirect không open-redirect; robots không lộ path nội bộ; menu external URL validate.
- **Performance/smoke test:** homepage aggregate (batch, no N+1); sitemap sinh nhanh; redirect middleware overhead thấp.
- **Migration test:** không mới.
- **Acceptance criteria:** canonical/robots đúng bảng ADR-011; sitemap/redirect/hreflang đúng; mega menu auto.
- **Evidence cần lưu:** test resolver (mọi loại trang); sample sitemap/robots; test redirect 301.
- **Rollback strategy:** revert theo module; redirect có thể disable.
- **Out-of-scope:** kéo-thả homepage/menu (P1); search toàn site (P1); scheduled publishing (P1).
- **Rủi ro:** SEO sai canonical/noindex (R-13); redirect chain/loop (R-08). Giảm thiểu: unit test resolver toàn diện + integration sitemap.
- **Ai implement:** C: seo resolver + redirect middleware; X: navigation + homepage.
- **Ai review độc lập:** chéo (seo do X review).
- **Điều kiện chuyển phase:** SEO resolver test PASS toàn bộ loại trang; redirect PASS.

---

## PHASE 9 — Admin Frontend

- **Mục tiêu:** Hoàn thiện toàn bộ giao diện Admin (07) khớp API.
- **Phạm vi module:** Admin FE (mọi màn quản trị).
- **Đầu vào bắt buộc:** API các module P2–P8 (đã scaffold từ P4); 07 wireframe; A15 (PATCH), A17 (SEO form), A18 (external video), A13 (ẩn ecommerce).
- **Phụ thuộc:** OpenAPI contracts.
- **Công việc backend:** —(chỉ vá contract nếu FE phát hiện lệch).
- **Công việc database:** —.
- **Công việc Admin:** AdminLayout/Sidebar/Header/Breadcrumb; DataTable/Pagination/FilterBar; form sản phẩm nhiều section; MediaPicker/FileUploader; RichText/BlockEditor + External Video block; TreeSelector (category); RelationSelector; SpecificationEditor; SEOEditor (không index/follow/social-picker); PublishPanel + checklist; StatusBadge + LanguageTabs (badge VI/EN); ConfirmDialog/Toast; chống mất dữ liệu (cảnh báo rời trang, auto-save nháp).
- **Công việc Public FE:** —.
- **API liên quan:** toàn bộ `/admin/*` + `/auth/*`.
- **Dữ liệu seed/fixture:** dữ liệu P4–P6.
- **Unit test:** component (filter chip OR/AND; badge locale; spec editor; publish checklist mapping lỗi/cảnh báo).
- **Integration test:** form submit → PATCH replace-set đúng; media picker chặn xóa đang dùng; SEO form không có ô index/follow.
- **API contract test:** FE gọi đúng shape OpenAPI.
- **E2E test:** đăng nhập → tạo brand/product draft → publish → xem; upload media; đổi slug (thấy redirect); external video block; auto-save nháp.
- **Security test:** CSRF token gửi kèm; không lộ secret ở FE; XSS input.
- **Performance/smoke test:** danh sách lớn phân trang mượt; form phức tạp không lag.
- **Migration test:** —.
- **Acceptance criteria:** mọi màn 07 hoạt động; publish checklist đúng; không có control bị cấm (index/follow/social-picker/upload video).
- **Evidence cần lưu:** E2E recordings; ảnh các màn chính.
- **Rollback strategy:** revert FE; backend không ảnh hưởng.
- **Out-of-scope:** bulk/duplicate/kéo-thả homepage-menu/dashboard cảnh báo nội dung (P1); UI inquiry (Future).
- **Rủi ro:** API khác tài liệu (R-06); UI hiện P1 như đã có (R-03). Giảm thiểu: contract test + đối chiếu 07.
- **Ai implement:** **song song** — C: sản phẩm+publish+SEO editor; X: taxonomy/content/settings/menu/redirect màn.
- **Ai review độc lập:** chéo.
- **Điều kiện chuyển phase:** E2E Admin luồng chính PASS.

---

## PHASE 10 — Public Frontend

- **Mục tiêu:** Hoàn thiện trang công khai SSR (02/08) + SEO tags + form yêu cầu + locale.
- **Phạm vi module:** Public FE.
- **Đầu vào bắt buộc:** API P4–P8 + seo resolver (P8); 02/08; A5/A6/A10/A14/A17.
- **Phụ thuộc:** OpenAPI + seo.
- **Công việc backend:** —(vá nếu lệch).
- **Công việc Public FE:** PublicLayout/TopBar/Header/MegaMenu/MobileMenu; Homepage; product list+**FilterSidebar** (chip OR/AND, URL slug key-lặp); product detail (+discontinued); brand list/hồ sơ; service/project/post/document; ContactForm/InquiryModal (idempotency, 202 "đã tiếp nhận"); search sản phẩm; trang hệ thống (404/yêu-cầu-thành-công/policy); `<head>` canonical/robots/hreflang/OG theo resolver; i18n `/en` (EN chưa publish → xử lý đúng, không trộn); external_video render an toàn; a11y + responsive + lazy/WebP.
- **Công việc database:** —.
- **API liên quan:** toàn bộ public `/api/v1/*` + sitemap/robots.
- **Dữ liệu seed/fixture:** dữ liệu published từ P4–P6.
- **Unit test:** filter URL sync (chip/key-lặp); locale switch logic (fallback về list EN khi không có bản EN).
- **Integration test:** SSR render canonical/robots đúng loại trang; hreflang chỉ khi cả hai published.
- **API contract test:** FE ↔ public API shape.
- **E2E test (14 luồng tối thiểu — xem `06`):** lọc `(PAC OR Herzog) AND ASTM D86`; brand EN chưa publish không fallback VI; video hợp lệ/không hợp lệ; form SMTP OK/lỗi; discontinued; download slug; đổi slug redirect.
- **Security test:** không nhúng raw iframe; form CAPTCHA; không lộ lỗi kỹ thuật; CSP hợp lý.
- **Performance/smoke test:** product list/detail/homepage/landing/search latency; LCP/lazy; no client-side over-fetch.
- **Migration test:** —.
- **Acceptance criteria:** mọi trang P0 (02/08) hoạt động; SEO đúng; form không mất lead; EN không trộn ngôn ngữ.
- **Evidence cần lưu:** E2E recordings 14 luồng; Lighthouse/SEO audit; ảnh canonical/robots trên các loại trang.
- **Rollback strategy:** revert FE.
- **Out-of-scope:** tìm kiếm toàn site, FAQ, timeline, landing chiến dịch, attachment (P1).
- **Rủi ro:** SEO sai (R-13); locale trộn (R-07); tích hợp muộn (R-04). Giảm thiểu: scaffold sớm + contract test + SEO audit.
- **Ai implement:** **song song** — C: product/filter/form/SEO head; X: brand/service/project/post/document/homepage/system pages.
- **Ai review độc lập:** chéo.
- **Điều kiện chuyển phase:** 14 luồng E2E PASS; SEO audit không lỗi nghiêm trọng.

---

## PHASE 11 — Integration, Security, Performance, Accessibility & Release

- **Mục tiêu:** Kiểm thử xuyên suốt + hardening + chuẩn bị go-live.
- **Phạm vi module:** toàn hệ.
- **Đầu vào bắt buộc:** P0–P10 done; C5 (domain/SPF/DKIM/DMARC) + C1/C4 chốt cho release.
- **Phụ thuộc:** tất cả.
- **Công việc backend:** vá lỗi tích hợp; rate-limit toàn cục (login 5/15', inquiry 5/10', search 60/1', public 120/1'); security headers; cache nội dung công khai; backup DB+media + kiểm thử restore; monitoring SMTP/outbox/storage.
- **Công việc database:** kiểm thử restore; không đổi baseline.
- **Công việc Admin/Public FE:** vá a11y/perf.
- **API liên quan:** toàn bộ (regression).
- **Dữ liệu seed/fixture:** bộ dữ liệu thật/gần thật để test (R-16).
- **Unit test:** regression toàn bộ.
- **Integration test:** cross-module (publish→sitemap→redirect; inquiry→outbox→email).
- **API contract test:** full suite khớp OpenAPI.
- **E2E test:** toàn bộ 14 luồng + regression.
- **Security test:** full — cookie/CSRF/CORS/rate-limit/hashing/header-injection/XSS/SVG/MIME/path-traversal/secret/PII; dependency audit; (khuyến nghị) pentest nhẹ.
- **Performance/smoke test:** load test product list/detail/homepage/landing/search/outbox batch; N+1 sweep; Lighthouse.
- **Migration test:** dry-run migrate + rollback trên staging giống production.
- **Acceptance criteria:** không Critical/High security; perf đạt ngưỡng; backup/restore PASS; SEO audit sạch; monitoring hoạt động; go-live checklist xong.
- **Evidence cần lưu:** security report; load test report; restore test log; SEO audit; go-live checklist ký.
- **Rollback strategy:** blue-green/rollback deploy; DB restore từ backup đã test; giữ tag milestone.
- **Out-of-scope:** mọi P1/Future.
- **Rủi ro:** deploy không tương thích storage/email (R-15); test giả/không evidence (R-14); secrets commit (R-18). Giảm thiểu: DoD + evidence bắt buộc + secret scan.
- **Ai implement:** C+X (phân vùng: C security/perf backend, X FE a11y/perf); release do người dùng chạy lệnh.
- **Ai review độc lập:** chéo + người dùng phê duyệt cuối.
- **Điều kiện chuyển phase:** DoD toàn dự án đạt; người dùng phê duyệt go-live.

---

## Milestones tổng hợp

| Milestone | Hoàn thành sau | Ý nghĩa |
|---|---|---|
| M1 — Foundation Ready | P3 | DB+auth+media sẵn sàng cho slice |
| M2 — Catalogue Live | P5 | products/filter/search chạy (nút thắt qua) |
| M3 — Content Complete | P6 | mọi entity nội dung publish được |
| M4 — Lead-safe | P7 | inquiry không mất lead + outbox |
| M5 — SEO/Nav Ready | P8 | sitemap/redirect/canonical/menu |
| M6 — UI Complete | P10 | Admin + Public FE xong |
| M7 — Release Candidate | P11 | qua security/perf/backup → go-live |
