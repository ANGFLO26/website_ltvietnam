# 10 — CHANGELOG ĐỒNG BỘ TÀI LIỆU — WEBSITE LT VIETNAM

**Phiên bản:** 1.3
**Ngày:** 2026-07-29
**Nội dung:** Phần A–L: lịch sử **bản cũ → v1.1 → v1.2** (giữ nguyên; Phần G–L là vòng v1.1→v1.2, 6 HIGH + 5 MEDIUM, thêm ADR-010/011/012). Phần **M–N**: vòng **v1.2 → v1.2.1** (8 nhóm sửa tài liệu, thêm ADR-013). Phần **O–P**: kết quả SQL Execution Verification và kết luận phê duyệt.
**Tham chiếu ADR:** các thay đổi toàn vẹn catalogue trước ghi "006 (data 4.x)" nay quy về **ADR-010**.

---

## A. Ánh xạ tên file cũ → mới

| Tên cũ | Tên mới |
|---|---|
| tai lieu pham vi chuc nang.md | 01_PHAM_VI_CHUC_NANG_VA_MVP.md |
| sitemap.md | 02_SITEMAP_VA_CAU_TRUC_DIEU_HUONG.md |
| chuan hoa cau truc du lieu.md | 03_CHUAN_HOA_MO_HINH_DU_LIEU.md |
| ERD.md | 04_ERD_LOGIC_HE_THONG.md |
| schema.md | 05_DATABASE_SCHEMA_POSTGRESQL.md |
| thiet ke backend va danh sach API.md | 06_KIEN_TRUC_BACKEND_VA_API.md |
| thiet ke wireframe va cau truc giao dien admin.md | 07_WIREFRAME_GIAO_DIEN_ADMIN.md |
| thiet ke wireframe frontend.md | 08_WIREFRAME_FRONTEND_CONG_KHAI.md |
| (mới) | 00_README_TAI_LIEU_THIET_KE.md |
| (mới) | 09_ADR_QUYET_DINH_KIEN_TRUC.md |
| (mới) | 10_CHANGELOG_DONG_BO_TAI_LIEU.md |

File cũ ban đầu được giữ + đánh dấu DEPRECATED, sau đó **đã được xóa** theo yêu cầu (2026-07-21) vì nội dung đã chuyển đủ sang bộ 00–10.

---

## B. Bảng thay đổi chi tiết

| ID | File | Mục cũ | Thay đổi | Lý do | ADR |
|----|------|--------|----------|-------|-----|
| C01 | 03,04,05,06,07 | `products.primary_category_id NOT NULL` | **Xóa** cột; danh mục chính chỉ ở `product_category_links.is_primary` | Trùng nguồn danh mục chính, dễ lệch dữ liệu | 010 |
| C02 | 03,04,05 | `service_documents` | **Xóa** bảng; chỉ giữ `document_services` | Hai bảng cùng một quan hệ | 010 |
| C03 | 03,04,05,07 | `product_media.media_role='featured'` | **Bỏ** giá trị `featured`; ảnh đại diện ở `products.featured_image_id` | Tránh hai nơi lưu ảnh đại diện | 005 |
| C04 | 02,06,08 | URL chi tiết lồng nhau (`/dich-vu/{cha}/{con}`, `/tin-tuc/{cat}/{post}`, `/hang-doi-tac/{cha}/{con}`) | Chuyển sang **URL phẳng** (`/dich-vu/{slug}`, `/tin-tuc/{slug}`, `/hang-doi-tac/{slug}`) | Va chạm slug, API 1-slug không phân giải URL 2 cấp | 001 |
| C05 | 02,06,08 | Hãng có 2 URL chi tiết trùng | **Quyết định v1.1 cũ:** `/san-pham/hang/{slug}` là trang lọc, canonical trỏ về hồ sơ hãng `/hang-doi-tac/{slug}`. **→ Đã bị ADR-001 v1.2 thay thế (Superseded):** lọc theo hãng dùng `/san-pham/tat-ca?brand={slug}` (noindex,follow), canonical về `/san-pham/tat-ca`; hồ sơ hãng self-canonical (xem Phần G/H1) | Tránh trùng nội dung, phân tán SEO | 001 |
| C06 | 03,05,06 | `UNIQUE(locale, slug)` không rõ chính sách xóa | Chốt **slug không tái dùng**; UNIQUE thường; đổi slug tạo redirect; chỉ nháp chưa publish mới hard-delete | Bảo toàn lịch sử SEO/URL | 002 |
| C07 | 01,03,04,05,06,07,08 | Chỉ gửi email, không lưu | **Thêm `inquiries` + `inquiry_outbox`**; lưu trong transaction trước khi gửi; worker retry; 202 sau commit | Chống mất lead khi SMTP lỗi | 003 |
| C08 | 03,04,05,06,07,08 | `status` chỉ ở entity cha | **Thêm `status`+`published_at`** cho translation 7 entity chính (product/service/project/post/brand/page/document) | Publish VI/EN độc lập | 004 |
| C09 | 03,04,05,06,07 | `products.featured_image_id ON DELETE SET NULL` (không nhất quán) | Mọi FK media **RESTRICT**; MediaUsageService + 409; query công khai loại media đã xóa | Tránh mất ảnh âm thầm, ảnh vỡ | 005 |
| C10 | 01,03,05,06,07,08 | SVG cho phép; attachment khách P0 | **Không SVG** trong MVP; whitelist JPG/PNG/WebP/PDF; **attachment khách → P1** | Chống XSS SVG; thu gọn P0 | 005,009,006 |
| C11 | 03,05,07 | Cột mô tả `NOT NULL` chặn nháp | Chỉ `name`/`slug` NOT NULL; mô tả nullable; PublishService kiểm khi publish | Cho phép tạo nhanh + lưu nháp | 010 |
| C12 | 03,05,06 | `documents.language` mơ hồ so với locale | Ghi rõ `language`=ngôn ngữ file vật lý; `document_translations.locale`=ngôn ngữ metadata | Tránh nhầm hai khái niệm | — |
| C13 | 05 | `product_specifications.group_name` / `settings.group` | Chốt `group_key` (spec), `group_name/setting_key` (settings) | Nhất quán tên cột + tránh từ khóa `group` | — |
| C14 | 03,05 | banner/menu `link_type` khác nhau | Đồng bộ enum (banner: product/product_category/brand/…; menu: page/product_category/brand/…); ghi chú `external_url`/`custom_url` | Nhất quán quan hệ đa hình | — |
| C15 | 06,08 | filter hai kiểu (comma + brand_id) | Chốt **slug, key lặp** (`?brand=pac&brand=herzog`) | Một định dạng nhất quán | 007 |
| C16 | 06,07 | PATCH không rõ ngữ nghĩa | Chốt: mảng có mặt → thay thế toàn bộ; vắng → giữ; transaction | Tránh mất dữ liệu quan hệ | 008 |
| C17 | 02 | Sitemap **lặp toàn bộ 2 lần** | **Xóa** phần lặp; viết lại gọn với URL phẳng | Lỗi chất lượng tài liệu | — |
| C18 | 06,08,07 | Mega menu nhập tay/mơ hồ | **Auto-generated** từ danh mục/hãng nổi bật + tiêu chuẩn/ứng dụng cấu hình | Tránh lệch catalogue, giảm nhập tay | — |
| C19 | 01,06,07,08 | Homepage kéo-thả thứ tự section (P0) | Thứ tự **cố định** + bật/tắt + chọn nổi bật; **reorder → P1** | Giảm phức tạp MVP | 006 |
| C20 | 01,07 | Applications quản lý cây (Admin) | DB giữ `parent_id`; **Admin hiển thị phẳng** | Ít giá trị, tránh over-engineering | 010 |
| C21 | 06 | Chưa có SEO endpoint | Thêm module `seo`: `sitemap.xml`/`sitemap-{locale}.xml`/`robots.txt`, canonical, hreflang | SEO nền tảng P0 | 001,006 |
| C22 | 06 | Email chưa rõ chống spoof/injection | From=domain LT Vietnam, Reply-To=khách, sanitize CR/LF, SPF/DKIM/DMARC, retry outbox | Bảo mật email + deliverability | 003 |
| C23 | 01,06,08 | Sản phẩm ngừng KD chưa rõ | Giữ trang + nhãn + sản phẩm thay thế; không xóa URL (redirect chỉ khi DN duyệt) | Bảo toàn SEO | 002 |
| C24 | 03,05,06 | `brand_id` có thể trống với vật tư | Giữ **NOT NULL**; vật tư không hãng dùng brand chuẩn hóa `LT Vietnam`/`Generic`/`Other` | Không để sản phẩm mồ côi | 010 |
| C25 | 06 | CSRF/CORS chưa đủ | Thêm CSRF token cho request thay đổi trạng thái; CORS origin cụ thể + credentials | Bảo mật Admin | — |
| C26 | 05,06 | Idempotency inquiry chưa có | `inquiries.idempotency_key UNIQUE` + `Idempotency-Key` header | Chống gửi trùng | 003 |
| C27 | 07 | Auto-save chưa rõ | Auto-save **chỉ vào nháp** (P1); bắt buộc cảnh báo rời trang chưa lưu | Tránh ghi đè bản published | 006 |
| C28 | 01,07 | bulk/duplicate/dashboard cảnh báo (P0) | Chuyển **P1** | Thu gọn MVP | 006 |

---

## C. Kết quả kiểm tra chéo (self cross-check)

| Hạng mục | Kết quả | Ghi chú |
|---|---|---|
| Phạm vi ↔ Sitemap | PASS | P0/P1/Future khớp; trang P1/Future không mô tả như đã có |
| Sitemap ↔ API | PASS | Mọi URL công khai có endpoint; không còn URL 2 cấp |
| Dữ liệu ↔ ERD | PASS | Bảng/quan hệ khớp; inquiries/outbox có ở cả hai |
| ERD ↔ Schema | PASS | Không còn primary_category_id/service_documents; FK/rule khớp |
| Schema ↔ API | PASS | Endpoint create/update có cột hỗ trợ; transaction bao phủ |
| API ↔ Admin | PASS | Trường form ↔ DTO; trường bắt buộc UI ↔ PublishService; draft không bị DB chặn |
| API ↔ Frontend | PASS | URL/filter/form/idempotency khớp |
| P0/P1/Future | PASS | Nhất quán toàn bộ tài liệu |
| URL/Slug/SEO | PASS | Phẳng, canonical hãng, không tái dùng slug, hreflang |
| Inquiry flow | PASS | Lưu DB trước khi email; outbox retry; idempotency |
| Media policy | PASS | RESTRICT + 409 + không SVG; không xóa khi đang dùng |
| Locale publication | PASS | 7 entity chính có status/published_at; taxonomy fallback |

---

## D. Blocker còn lại
Không còn blocker kỹ thuật Critical/High giữa các tài liệu. Các điểm ở Phần E là **quyết định doanh nghiệp**, không chặn phần lớn việc lập trình.

## E. Điểm cần doanh nghiệp xác nhận

| # | Câu hỏi | Ảnh hưởng | Phương án | Khuyến nghị |
|---|---|---|---|---|
| 1 | Thời hạn lưu inquiry (`expires_at`) | Retention/purge | (a) một số tháng cụ thể · (b) vô thời hạn · (c) khác | **Giữ `expires_at` nullable (không default); doanh nghiệp chốt thời hạn trước production.** Không tự purge. (24 tháng chỉ là phương án tham khảo.) |
| 2 | Ai duyệt công khai logo KH/đối tác | Quy trình `is_public`/`customer_visibility` | (a) Admin tự quyết · (b) cần duyệt DN | Cần duyệt trước khi publish |
| 3 | Email xác nhận cho khách | Thêm nhánh NotificationPort | (a) không · (b) có | Mặc định không, dễ bật sau |
| 4 | Redirect sản phẩm ngừng KD | SEO | (a) giữ trang · (b) redirect thay thế | Giữ trang; redirect chỉ khi DN yêu cầu |
| 5 | Domain email + SPF/DKIM/DMARC | Deliverability | hạ tầng | Chốt domain gửi trước khi go-live |
| 6 | Mức hoàn thiện tiếng Anh khi ra mắt | Nội dung | (a) không bắt buộc · (b) bắt buộc | Không bắt buộc (ADR-004) |

## F. Kết luận vòng v1.1
Bộ tài liệu v1.1 đạt **`READY WITH REMAINING BUSINESS DECISIONS`**: không còn mâu thuẫn Critical/High của vòng audit đầu; phạm vi MVP đã khóa. (Vòng v1.2 dưới đây bổ sung 6 HIGH + 5 MEDIUM kỹ thuật.)

---

# G. VÒNG v1.1 → v1.2 — SÁU VẤN ĐỀ HIGH

| ID | File | Vấn đề | Thay đổi | ADR |
|----|------|--------|----------|-----|
| H1 | 00,01,02,06,08,09,10 | Trang lọc theo hãng canonical sang hồ sơ hãng (khác loại) | Lọc theo hãng = `/san-pham/tat-ca?brand={slug}` (noindex,follow, canonical `/san-pham/tat-ca`); hồ sơ hãng `/hang-doi-tac/{slug}` index self-canonical; bỏ `/san-pham/hang/{slug}` (301) | 001, 011 |
| H2 | 01,06,08,09,10 | Filter chưa rõ AND/OR | **Cùng dimension OR, khác dimension AND**; parameter binding; facet P1 | 007 |
| H3 | 03,04,05,06,09,10 | Slug reuse chưa được bảo đảm | Thêm `first_published_at` (12 translation); SlugService kiểm 3 nguồn (translation + `redirects.source_path` + route bảo lưu) theo public path; hard-delete chỉ khi `first_published_at IS NULL`; tách `published_at`/`scheduled_publish_at` | 002 |
| H4 | 03,04,05,06,07,09,10 | Outbox không an toàn nhiều worker | `inquiry_outbox.status` thêm `processing`; cột `locked_at/locked_by/last_attempt_at/updated_at`; `UNIQUE(inquiry_id,channel,recipient)`; `FOR UPDATE SKIP LOCKED` + reaper + backoff; `inquiries.email_status` bỏ `received` | 003 |
| H5 | 02,03,04,05,06,07,08,09,10 | SEO không khớp giữa data/schema/admin | **Không lưu** `canonical_url`/`robots_index`/`robots_follow` (tự sinh); **bỏ** `social_image_id` khỏi page/product translation (social image fallback chain); Admin SEO form bỏ canonical/index/follow/social picker; **tạo ADR-011** | 011, 005 |
| H6 | 01,03,04,05,06,07,08,09,10 | Video yêu cầu nhưng schema không hỗ trợ | **Bỏ `document_type='video'`**; không upload video; content block `external_video` (whitelist YouTube/Vimeo, validate, không raw iframe); không tạo `product_videos` (P1); **tạo ADR-012** | 012, 009 |

# G2. NĂM ĐIỂM MEDIUM

| ID | File | Thay đổi | ADR |
|----|------|----------|-----|
| M1 | 03,06,08,09,10 | KHÔNG fallback Brand detail VI→EN; chỉ fallback dữ liệu độc lập ngôn ngữ; hreflang chỉ khi cả hai published | 004 |
| M2 | 06,07,10 | Tách health: `/health/live` (public {status:ok}) + `/health/ready` (nội bộ, kiểm DB/storage/outbox/email, không lộ chi tiết) | — |
| M3 | 01,06,09,10 | Audit log P0 = **structured application log** (không bảng `audit_logs`); danh sách sự kiện + field; không log secret/PII; audit_logs table = P1/Future | 006 |
| M4 | 06,08,10 | Public API dùng **slug**: `GET /brands?parent={slug}`, `GET /documents/:slug/download`; bỏ `/brands/:slug/products` → `GET /products?brand={slug}`; admin dùng UUID | 001 |
| M5 | 00,03,09,10 | **Tạo ADR-010** (toàn vẹn catalogue + draft); changelog quy tham chiếu `006 (data 4.x)` → **010** | 010 |

---

# H. THAY ĐỔI SCHEMA (05) v1.2

- **Cột thêm:** `first_published_at TIMESTAMPTZ NULL` × **12 bảng translation** (page, brand, product_category, standard, application, industry, product, service, project, post_category, post, document); `inquiry_outbox`: `last_attempt_at, locked_at, locked_by, updated_at`.
- **Cột bỏ:** `page_translations.social_image_id`, `product_translations.social_image_id`.
- **Enum:** `inquiries.email_status` = `{email_pending,email_sent,email_failed}` (default `email_pending`, bỏ `received`); `inquiry_outbox.status` = `{pending,processing,sent,failed}`; `documents.document_type` bỏ `video`.
- **Constraint:** thêm `UNIQUE(inquiry_id, channel, recipient)` (outbox), `CHECK(attempts>=0)`, `next_attempt_at NOT NULL DEFAULT NOW()`; giữ `UNIQUE(idempotency_key)`.
- **Index:** `idx_outbox_due(status, next_attempt_at) WHERE status='pending'`; thêm `idx_outbox_stale(locked_at) WHERE status='processing'`.
- **Migration order (đã chốt lại ở v1.2.1 — ADR-013):** cột mới nằm inline trong định nghĩa bảng. **Baseline active duy nhất = migration 001–070; KHÔNG có `071_v1_2_columns` active.** (`071_v1_2_columns` chỉ là ghi chú lịch sử — dùng khi cần nâng cấp một DB v1.1 thật bên ngoài, sau khi xác nhận schema thực tế; không thuộc baseline.) Trigger `updated_at` gắn thêm cho `inquiry_outbox`, tất cả trigger tạo tại migration 070.
- **Không** tạo bảng P1/Future (`product_videos`, `audit_logs`).

---

# I. KIỂM TRA CHÉO v1.2 (self cross-check)

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| Phạm vi ↔ Sitemap | PASS | 01/02 khớp; P1/Future (attachment, facet, product_videos, audit_logs) không mô tả như đã có |
| Sitemap ↔ API | PASS | `/san-pham/tat-ca?brand=` ↔ `GET /products?brand=`; `/documents/:slug/download`; không còn `/san-pham/hang/{slug}` (301) |
| Data ↔ ERD | PASS | first_published_at + outbox lock có ở 03 và 04; bỏ social_image ở cả hai |
| ERD ↔ Schema | PASS | 12 translation có first_published_at; outbox enum/cột khớp; document_type không video |
| Schema ↔ API | PASS | SlugService 3-nguồn; outbox SKIP LOCKED khớp cột; email_status enum khớp |
| API ↔ Admin | PASS | SEO form bỏ canonical/index/follow/social khớp ADR-011; external video block; health/ready dashboard |
| API ↔ Frontend | PASS | filter OR/AND; brand filter URL; download slug; render external video từ block validate |
| URL/Canonical | PASS | hồ sơ hãng self-canonical; filter noindex,follow canonical `/san-pham/tat-ca`; landing self-canonical |
| Filter semantics | PASS | OR trong dimension / AND giữa dimension (ADR-007, test case ở 06/08) |
| Slug lifecycle | PASS | first_published_at + 3-nguồn + hard-delete rule (ADR-002) |
| Inquiry concurrency | PASS | processing/lock/SKIP LOCKED/reaper/UNIQUE/idempotency (ADR-003) |
| SEO model | PASS | canonical/robots tự sinh; social image fallback; bỏ social_image_id (ADR-011) |
| Video policy | PASS | không document_type video; external_video whitelist; không upload (ADR-012) |
| P0/P1/Future | PASS | audit_logs/product_videos/attachment/facet = P1/Future nhất quán |

Grep chuỗi cấm (chỉ còn trong changelog/ADR-loại-bỏ/phủ định): `social_image_id`, `robots_index`, `robots_follow`, `canonical_url`, `email_status = received`/`'received'`, `document_type ... 'video'`, `/documents/:id/download`, `/san-pham/hang/{`, `parent_id=` (Public Brand API) — đã rà, không còn định nghĩa thực (xem J).

---

# J. KẾT QUẢ SQL

**`STATIC VALIDATION ONLY`** — môi trường không có PostgreSQL/Docker/psql. Đã rà tĩnh: đếm `CREATE TABLE`, thứ tự migration không tham chiếu bảng chưa tạo, enum/constraint/index nhất quán. **Chưa** chạy execution test thật; cần chạy `migrate up/down` + rollback trên PostgreSQL 16 ở vòng xác minh độc lập.

---

# K. Điểm cần doanh nghiệp xác nhận (không đổi so với v1.1 — xem Phần E)
6 điểm ở Phần E vẫn mở (retention inquiry, duyệt logo KH, email xác nhận cho khách, redirect sản phẩm ngừng KD, domain email+SPF/DKIM/DMARC, mức hoàn thiện tiếng Anh). Không phát sinh quyết định DN mới ở v1.2.

---

# L. Kết luận vòng v1.2

**`READY FOR FINAL VERIFICATION`** (vòng v1.2) — 6 HIGH + 5 MEDIUM đã sửa đồng bộ mọi file; ADR-001..012 đầy đủ liên tục; schema/API/UI khớp; filter/slug/outbox/SEO/video có ngữ nghĩa rõ và test case.

---

# M. VÒNG v1.2 → v1.2.1 (Final Documentation Corrections)

| ID | Nhóm sửa | Thay đổi | File | ADR |
|----|----------|----------|------|-----|
| V1 | Enum `received` | Xóa `received` là trạng thái active; ghi **đủ** `email_pending/email_sent/email_failed` (bỏ viết tắt `(email_pending/sent/failed)` ở ERD box); outbox `pending/processing/sent/failed` | 01,03,04,05,06,09,10 | 003 |
| V2 | `published_at` vs scheduled | `published_at` = publish/republish hiện tại; scheduled publishing = P1 dùng `scheduled_publish_at` **riêng**; P0 không có `scheduled_publish_at`; không dùng `published_at` cho lịch tương lai | 01,03,05,06,09 | 002 |
| V3 | Fallback ngôn ngữ | Làm rõ **KHÔNG fallback Brand detail** (`name/short_description/description/seo_*`); chỉ fallback dữ liệu độc lập ngôn ngữ (model/SKU/mã tiêu chuẩn/proper name khi DN xác nhận/nhãn hệ thống); bỏ cụm mơ hồ "fallback tên hãng" | 01,03,06,08,09 | 004 |
| V4 | Retention | Bỏ "mặc định 24 tháng"; `expires_at` nullable **không default**; `privacy.inquiry_retention_months` = **TBD**; không tự purge; 24 tháng chỉ tham khảo | 00,01,03,05,06,09,10 | 003 |
| V5 | Migration baseline | **Baseline duy nhất 001–070 (v1.2.1)**; **không `071` active** (chuyển ghi chú lịch sử); trigger `updated_at` tại **migration 070** (sửa "068"); rollback 070→001; **tạo ADR-013** | 00,05,06,09,10 | 013 |
| V6 | Product Landing API | Thêm **`GET /api/v1/products/landing`** cho trang `/san-pham` (ProductLandingQueryService riêng); sitemap đổi `GET /home phần catalogue` → `/products/landing`; `GET /home` chỉ trang chủ | 01,02,06,08,10 | — |
| V7 | Outbox at-least-once | Ghi đúng outbox = **at-least-once** (không exactly-once); **Message-ID ổn định** từ `outbox.id`, retry dùng cùng Message-ID; log `outbox_id`+`message_id`; không đổi schema | 03,04,06,09,10 | 003 |
| V8 | Dọn README/Changelog/chính tả | README bảng ADR gộp **1 dòng/ADR (001–013)**; sửa C05 (câu "canonical trỏ về" cụt → Superseded đầy đủ); sửa typo `trạng thhái`→`trạng thái`; rà lặp/vỡ bảng | 00,01,10 | — |

## Kiểm tra chéo v1.2.1

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| Inquiry enum (01↔03↔04↔05↔06↔09) | PASS | `email_status` chỉ {email_pending,email_sent,email_failed}; outbox {pending,processing,sent,failed}; không còn viết tắt/`received` active |
| Scheduled publishing | PASS | `published_at` hiện tại; `scheduled_publish_at` = P1 riêng; không nơi nào mô tả `published_at` cho lịch |
| Locale fallback (01↔03↔06↔08↔09) | PASS | Brand detail không fallback; chỉ dữ liệu độc lập ngôn ngữ |
| Retention (00↔03↔05↔06↔09↔10) | PASS | `expires_at` không default; TBD; không mặc định 24 tháng |
| Migration baseline (00↔05↔06↔09↔10) | PASS | 001–070 duy nhất; trigger 070; 071 chỉ lịch sử; rollback 070→001 |
| Product landing API (01↔02↔06↔08) | PASS | `/products/landing` có endpoint + sitemap + frontend; `/home` chỉ trang chủ |
| Outbox at-least-once (03↔04↔06↔09) | PASS | at-least-once + Message-ID ổn định; không "exactly-once"/"không bao giờ gửi trùng" |
| README/ADR/Changelog | PASS | ADR bảng 1 dòng/ADR (001–013); C05 đầy đủ; typo đã sửa |

## SQL v1.2.1
**`STATIC VALIDATION ONLY`** — không có PostgreSQL/Docker. Không đổi cấu trúc bảng (vẫn 63 `CREATE TABLE`); baseline 001–070; trigger 070. Cần chạy `migrate up 001→070` + rollback `070→001` trên PostgreSQL 16 ở vòng xác minh SQL.

---

# N. Kết luận vòng v1.2.1

**`READY FOR SQL EXECUTION VERIFICATION`** — 8 nhóm sửa đã đồng bộ; **ADR-001..013 đầy đủ liên tục**; enum Inquiry/scheduled/fallback/retention/migration/landing/outbox nhất quán; không còn chuỗi cấm là quyết định active; không lỗi trình bày lớn. **Chưa** chuyển `Approved`/`READY FOR IMPLEMENTATION` — chỉ chuyển sau khi **migration chạy thật thành công trên PostgreSQL 16**. Bộ tài liệu giữ trạng thái `Reviewed`.

---

# O. SQL EXECUTION VERIFICATION — POSTGRESQL 16

**Ngày xác minh thực tế:** 2026-07-21

Kết quả: EXECUTION TESTED ON POSTGRESQL 16

- 63 bảng: PASS
- Extensions pgcrypto, citext, pg_trgm: PASS
- Triggers updated_at: PASS
- Enum và CHECK constraints: PASS
- Unique constraints: PASS
- Foreign keys: PASS
- Migration baseline 001→070: PASS
- Rollback 070→001: PASS
- Migration lại lần hai: PASS
- Database thử nghiệm ltv_verify đã được xóa sau khi hoàn tất
- Tổng thể: ALL CHECKS PASSED

---

# P. KẾT LUẬN PHÊ DUYỆT

Bộ tài liệu v1.2.1 đạt trạng thái:

APPROVED
READY FOR IMPLEMENTATION

v1.2.1 là baseline chính thức để triển khai website LT Vietnam.
Mọi thay đổi tiếp theo phải được thực hiện bằng ADR và migration mới.


---

# PHẦN Q — PHÁT HÀNH v1.3 (2026-07-29)

## Q1. Bối cảnh
Đối chiếu bộ tài liệu v1.2.1 với website đang vận hành `ltvietnam.com.vn` và với yêu cầu thực tế của chủ dự án cho thấy ba giả định nền tảng không đúng:

1. Bộ tài liệu giả định tiếng Việt là ngôn ngữ chính; website thật là **tiếng Anh**.
2. Bộ tài liệu tạo 16 bảng translation; thực tế chỉ **bốn** nhóm sẽ có người viết bản thứ hai.
3. Bộ tài liệu định nghĩa cây phân cấp nhưng **không quy định** lọc theo nút cha có bao gồm nhánh con — trên dữ liệu thật, lọc hãng mẹ `PAC` trả về **0 sản phẩm**.

## Q2. ADR mới
| ADR | Nội dung |
|---|---|
| **ADR-014** | Ngôn ngữ lưu trữ nội dung và ranh giới frontend/backend. Nhãn giao diện thuộc frontend; bảng translation chỉ tồn tại nơi thật sự có người viết bản thứ hai. 16 → 4 bảng. |
| **ADR-015** | Lọc và duyệt theo cây phân cấp bằng `ancestor_ids UUID[]` + `depth` + index GIN. |

## Q3. ADR sửa đổi
| ADR | Thay đổi |
|---|---|
| ADR-001 | URL tiếng Anh ở gốc, tiếng Việt ở `/vi` và chỉ cho bốn nhóm có bản dịch. Đoạn route tiếng Anh cho cả hai ngôn ngữ. Landing phân loại chỉ index khi có mô tả. |
| ADR-002 | Slug đơn cho entity một ngôn ngữ. Tập route bảo lưu **sinh tự động** từ bảng route, có test đối chiếu. `first_published_at` đặt cạnh `status`. |
| ADR-004 | Viết lại theo ADR-014: bốn entity có xuất bản theo ngôn ngữ; bỏ quy tắc "tiếng Việt bắt buộc trước". |
| ADR-011 | hreflang thu hẹp còn bốn entity. Thêm §2b: landing không có mô tả → noindex. |
| ADR-013 | Baseline đổi sang v1.3, **52 bảng**. |

## Q4. Sửa lỗi đã phát hiện trong v1.2.1

| Mã | Lỗi | Sửa |
|---|---|---|
| S1 | Lọc theo cây không được hỗ trợ; lọc hãng mẹ trả 0 sản phẩm | `ancestor_ids` + `depth` + GIN cho 5 bảng cây (ADR-015) |
| S2 | Thiếu index tìm kiếm cho danh mục và tiêu chuẩn dù `01` §10 đã hứa | Thêm 4 index trigram |
| S3 | API hứa `popular_standards`/`popular_applications` nhưng không có cột đánh dấu | Thêm `is_featured` cho standards/applications/industries |
| S4 | Bảng translation không có `updated_at` → cache cũ, sitemap sai | Thêm `updated_at` + trigger cho 4 bảng translation |
| S5 | Hai nguồn cùng đúng cho "nội dung nổi bật" | `is_featured` là nguồn duy nhất |
| S6 | Form bắt buộc **cả** điện thoại **và** email | Cả hai nullable + CHECK có ít nhất một |
| S7 | Không có chỗ ghi các phiên bản ảnh | `media.variants JSONB` + `storage_class` + `purged_at` |
| A1 | `first_published_at` trên 5 bảng translation taxonomy không có sự kiện nào set được | Đặt cột cạnh `status` |
| A2 | `post_categories` thiếu `deleted_at` | Đã thêm |
| A4 | `MediaUsageService` không quét JSONB → ảnh trong content block bị xóa được | Bảng `content_media_refs` |
| A6 | `05` trỏ sang `03` PHẦN XVII cho publish rule của Trang và Tài liệu, nhưng `03` không có | Đã viết đủ trong `05` PHẦN IV |
| — | `banners.link_type='external_url'` khác `menu_items.link_type='custom_url'` | Thống nhất `custom_url` |

## Q5. Bổ sung phạm vi
- **`GET /admin/inquiries` chỉ đọc.** ADR-003 lưu yêu cầu vào DB trước khi gửi email để chống mất lead, nhưng ADR-003 §4 lại bỏ màn hình xem — nên khi email thất bại, yêu cầu nằm trong DB mà không ai nhìn được. Bổ sung danh sách + chi tiết + đánh dấu đã liên hệ. Không phải CRM.
- **`SearchPort`** bắt buộc từ P0 để lời hứa "đổi engine không đổi API" trở thành hiện thực.
- **Quy tắc tầng đọc/ghi**: ghi qua Repository theo aggregate, đọc qua QueryService viết SQL riêng.

## Q6. Bằng chứng
Baseline v1.3 đã chạy trên **PostgreSQL 16.2** thật: 52 bảng, 95 FK, 28 trigger, 129 index, 0 lỗi; chu kỳ up→down→up PASS; 4 kiểm chứng chức năng PASS; 8 kiểm chứng ràng buộc PASS; 10 index trigram hợp lệ. Chi tiết `doc/verify/v1.3/README_V1_3.md`.

## Q7. Quan hệ với v1.2.1
Baseline v1.2.1 (63 bảng) **chưa từng chạy trên môi trường nào** — `05` v1.2.1 tự ghi "STATIC VALIDATION ONLY". Không có dữ liệu nào cần chuyển đổi. v1.3 thay thế hoàn toàn, không phải nâng cấp.


---

# PHẦN R — TÀI LIỆU 11: LƯỢC ĐỒ CONTENT BLOCK (2026-08-01)

## R1. Vì sao
Hơn 20 trường `JSONB` chứa nội dung biên tập, nhưng v1.2.1 chỉ định nghĩa **một** loại block (`external_video`). P3 phải viết validator cho lược đồ chưa tồn tại; P9 dựng editor; P10 render; CM1 map nội dung cũ — bốn phase cùng phụ thuộc một hợp đồng trống.

## R2. Nội dung
`doc/11_CONTENT_BLOCK_SCHEMA.md` định nghĩa **10 loại block**: heading, paragraph, list, image, gallery, table, external_video, file, callout, divider. Kèm phong bì có `version`, allowlist theo từng trường, cấu trúc FAQ riêng, giới hạn xử lý (đóng quyết định B25), hợp đồng validate và hợp đồng render.

## R3. Ba nguyên tắc không được phá
1. **Không bao giờ lưu HTML.** Backend lưu dữ liệu có cấu trúc; frontend dựng HTML. Mở rộng nguyên tắc ADR-012 ra toàn bộ nội dung.
2. **Media chỉ tham chiếu bằng `media_id`**, không bao giờ bằng URL — điều kiện để `content_media_refs` hoạt động.
3. **Mảng phẳng, không lồng nhau.**

## R4. Kiểm chứng
Cài đặt ở `packages/contracts/src/blocks.ts`, **22 test PASS**, trong đó phép thử chính là dựng lại nguyên trang sản phẩm OptiDist của website hiện tại bằng lược đồ này — 9 block, gồm cả danh sách 15 tính năng và video YouTube.

Test bảo mật chặn: `javascript:`, `http://` không mã hóa, provider ngoài whitelist, `video_id` chứa URL, `image` dùng URL thay `media_id`, `heading` level 1, `file` trỏ thẳng media.

## R5. Ghi chú migration
Danh sách "Methods" của site cũ (`ASTM D86, D1078...`) là **dữ liệu quan hệ**, phải parse vào `product_standards`, không để trong block — nếu để trong block thì mất khả năng lọc theo tiêu chuẩn (ADR-007).
