# 03 — CHUẨN HÓA MÔ HÌNH DỮ LIỆU — WEBSITE LT VIETNAM

**Phiên bản:** 1.2.1
**Ngày:** 2026-07-21
**Nguồn sự thật cho:** mô hình dữ liệu logic, quy tắc trường, quan hệ.
**Áp dụng:** ADR-002 (slug + first_published_at), ADR-003 (inquiry/outbox), ADR-004 (locale), ADR-005 (media), ADR-009 (upload), ADR-010 (catalogue), ADR-011 (SEO/social), ADR-012 (video).
**Ghi chú:** Chi tiết SQL vật lý ở `05_DATABASE_SCHEMA_POSTGRESQL.md` (nguồn sự thật kỹ thuật). Khi tên/kiểu khác nhau, 05 thắng.

---

# PHẦN I — NGUYÊN TẮC

1. Không viết cứng hãng/sản phẩm/danh mục/nội dung trong mã nguồn.
2. Đa ngôn ngữ tách bảng translation (không ghép hai ngôn ngữ trong một trường).
3. Một nội dung liên kết nhiều nội dung khác qua bảng trung gian.
4. Mở rộng bằng migration, không phải thiết kế lại.
5. Hỗ trợ SEO, redirect, quản lý URL.
6. Phân biệt draft/published/hidden/archived + xóa mềm.
7. Có `created_at`/`updated_at`; hạn chế xóa vĩnh viễn.

## Quy tắc đặt tên
- Bảng: tiếng Anh, chữ thường, số nhiều (`products`, `brands`).
- Trường: chữ thường + gạch dưới (`created_at`, `parent_id`, `is_featured`).
- Khóa chính `id` UUID (xem 05). Không dùng tên hiển thị làm khóa.

---

# PHẦN II — NHÓM TRƯỜNG DÙNG CHUNG

## 1. Nhận dạng & quản trị
`id, created_at, updated_at, created_by (nullable FK users), updated_by (nullable FK users), deleted_at (nullable)`.

## 2. Trạng thái entity cha
`status ∈ {draft, published, hidden, archived}`, `published_at`, `is_featured`, `display_order`.

## 3. Trạng thái theo ngôn ngữ (ADR-004) — CHỈ 7 entity nội dung chính
Bảng translation của **`products, services, projects, posts, brands, pages, documents`** có thêm:
```text
status ∈ {draft, published, hidden}   (mặc định draft)
published_at
```
Các bảng translation **taxonomy/config KHÔNG** có locale-status (standards, applications, industries, product_categories, post_categories, offices, menu_items, banners, customers): hiển thị khi có bản dịch.

**Fallback ngôn ngữ (ADR-004, v1.2.1):** KHÔNG fallback nội dung của 7 entity chính. Đặc biệt **Brand detail**: `brand_translations.name`, `short_description`, `description`, `seo_title`, `seo_description` **không** fallback VI→EN; EN chưa publish thì `/en/brands-partners/{slug}` không hiển thị nội dung VI (404/điều hướng danh sách hãng EN). Chỉ fallback dữ liệu **độc lập ngôn ngữ**: `model`, `SKU`, mã nội bộ, mã tiêu chuẩn (`standards.organization+code`), **proper name chính thức của thương hiệu khi DN xác nhận dùng chung cho mọi locale**, nhãn hệ thống cấu hình chung. (Proper name dùng chung ≠ fallback toàn bộ Brand translation.)

Điều kiện truy vấn công khai:
```text
entity.status = 'published' AND entity.deleted_at IS NULL
AND translation.locale = requested_locale
AND (translation.status = 'published'   -- với 7 entity chính
     OR entity không thuộc nhóm 7 và có translation cho locale đó)
```

## 3b. `first_published_at` — mọi translation có slug công khai (ADR-002, v1.2)
Thêm `first_published_at TIMESTAMPTZ NULL` vào **12 bảng translation có slug**: page, brand, product_category, standard, application, industry, product, service, project, post_category, post, document translations.
```text
first_published_at   set MỘT LẦN khi URL lần đầu công khai; KHÔNG ghi đè khi hide/archive/republish
published_at         thời điểm publish/republish hiện tại
scheduled_publish_at CHỈ P1 (không nhồi lịch tương lai vào published_at)
```
Dùng `first_published_at` để xác định "đã từng xuất bản": chỉ hard-delete khi `first_published_at IS NULL` + draft + không redirect + không phụ thuộc; ngược lại chỉ soft-delete, không giải phóng slug (ADR-002).

## 4. SEO dùng chung (cập nhật v1.2 — ADR-011)
Translation **chỉ** giữ `seo_title, seo_description`. **KHÔNG** lưu `canonical_url`, `robots_index`, `robots_follow`, `social_image_id` trong DB ở P0.
- **Canonical & robots tự sinh** theo locale + route + trạng thái (không lưu, không checkbox Admin).
- **Social image** dùng **fallback chain** (không cột riêng theo translation): product→featured_image; brand→cover_image→logo; service/project/post/page→featured_image; document→thumbnail nếu có→mặc định; cuối cùng `settings.seo.default_social_image`.
- Mặc định: thiếu `seo_title` → dùng tên/tiêu đề; thiếu `seo_description` → dùng mô tả ngắn.

## 5. Media & tài liệu
Bảng nội dung **không** lưu file nhị phân, chỉ FK tới `media`. Ví dụ: `products.featured_image_id`, `brands.logo_id`, `documents.file_id`.

## 6. Slug (ADR-002)
`UNIQUE(locale, slug)` thường theo từng bảng translation. Slug đã publish không tái dùng; xóa mềm giữ slug; đổi slug tạo redirect 301; chỉ bản nháp chưa từng publish mới hard-delete để giải phóng slug.

## 7. Media policy (ADR-005)
Mọi FK media `ON DELETE RESTRICT`. Không xóa media đang dùng (409). Query công khai loại media `deleted_at IS NOT NULL`. Upload chỉ JPG/JPEG/PNG/WebP/PDF, không SVG (ADR-009).

---

# PHẦN III — TÀI KHOẢN ADMIN

## `users`
`id, name, email(unique, citext), password_hash, role, status, last_login_at, password_changed_at, created_at, updated_at, deleted_at`.
MVP: `role='admin'`, `status='active'`. Chuẩn bị tương lai: super_admin/content_editor/sales/technical/manager/viewer (qua migration khi cần).

---

# PHẦN IV — NỘI DUNG TĨNH

## `pages` (7 entity chính — có locale-status)
`id, page_type(unique), featured_image_id, status, is_system_page, display_order, published_at, created_by, updated_by, created_at, updated_at, deleted_at`.
`page_type ∈ {about, history, vision_mission, business_areas, technical_capabilities, fabrication_capabilities, industries, privacy_policy, terms_of_use, cookie_policy}`.

## `page_translations`
`id, page_id, locale, title, slug, summary(nullable), content(JSONB), seo_title, seo_description, status, published_at, first_published_at`. (Đã **bỏ** `social_image_id` — ADR-011.)
`UNIQUE(page_id, locale)`, `UNIQUE(locale, slug)`.

---

# PHẦN V — TRANG CHỦ & BANNER

## `banners`
`id, image_id(RESTRICT), mobile_image_id(RESTRICT), link_type, link_target_id, custom_url, open_new_tab, status, display_order, start_at, end_at, created_at, updated_at`.
`link_type` (thống nhất, xem PHẦN đồng bộ enum): `{product, product_category, brand, service, project, post, page, external_url, none}`.

## `banner_translations` (không có locale-status)
`banner_id, locale, title, subtitle, button_label, image_alt`. `UNIQUE(banner_id, locale)`.

## `homepage_sections`
`id, section_type(unique), is_enabled, display_order, settings(JSON)`.
`section_type ∈ {hero, company_intro, business_areas, featured_categories, featured_products, featured_brands, services, capabilities, projects, posts, customers, contact_call_to_action, offices}`.
MVP: bật/tắt + chọn nội dung nổi bật; **kéo thả reorder → P1**.

---

# PHẦN VI — HÃNG (7 entity chính)

## `brands`
`id, parent_id(self FK, SET NULL cho quan hệ cha–con — KHÔNG phải media), brand_type, code, country_code, website_url, logo_id(RESTRICT), cover_image_id(RESTRICT), status, is_featured, display_order, created_by, updated_by, created_at, updated_at, deleted_at`.
`brand_type ∈ {manufacturer, sub_brand, global_partner, service_partner, supplier}`.
Quy tắc: hãng con `brand_type=sub_brand` phải có `parent_id`; không tự làm cha; không vòng lặp.

## `brand_translations` (có locale-status)
`brand_id, locale, name, slug, short_description(nullable), description(JSONB), seo_title, seo_description, status, published_at, first_published_at`. `UNIQUE(brand_id, locale)`, `UNIQUE(locale, slug)`.

---

# PHẦN VII — TAXONOMY (không có locale-status)

## `product_categories` (cây)
`id, parent_id(self), code, featured_image_id, icon_id, status, is_featured, display_order, created_at, updated_at, deleted_at`.
## `product_category_translations`
`category_id, locale, name, slug, short_description, description(JSONB), seo_title, seo_description, first_published_at`. `UNIQUE(category_id, locale)`, `UNIQUE(locale, slug)`.

## `standards`
`id, organization, code, status(default published), display_order, created_at, updated_at, deleted_at`. `UNIQUE(UPPER(organization), UPPER(code)) WHERE deleted_at IS NULL`.
## `standard_translations`
`standard_id, locale, name(nullable), slug, description, seo_title, seo_description, first_published_at`.

## `applications` (cây trong DB — Admin MVP hiển thị PHẲNG)
`id, parent_id(self), icon_id, status(default published), display_order, created_at, updated_at, deleted_at`.
## `application_translations`
`application_id, locale, name, slug, description(JSONB), seo_title, seo_description, first_published_at`.

## `industries`
`id, featured_image_id, icon_id, status(default published), display_order, created_at, updated_at, deleted_at`.
## `industry_translations`
`industry_id, locale, name, slug, description(JSONB), seo_title, seo_description, first_published_at`.

---

# PHẦN VIII — SẢN PHẨM (7 entity chính)

## `products`
```text
id, brand_id (NOT NULL, RESTRICT),            -- hãng bắt buộc (ADR mục 4.4)
featured_image_id (RESTRICT),
model, internal_code,
-- trường thương mại tương lai (ẩn khỏi UI MVP):
sku, product_type, price_visibility, sale_mode, requires_configuration, warranty_months,
status, is_featured, display_order,
published_at, discontinued_at,
created_by, updated_by, created_at, updated_at, deleted_at
```
**KHÔNG có `primary_category_id`** — danh mục chính dùng `product_category_links.is_primary`.
Vật tư không hãng: gán brand chuẩn hóa `LT Vietnam`/`Generic`/`Other` (không để mồ côi).

## `product_translations`
```text
product_id, locale, name, slug,
short_description (nullable — cho phép nháp),
overview, features, applications_text, principle, sample_types,
operating_conditions, accessories_options,           -- JSONB, nullable/rỗng khi nháp
seo_title, seo_description,                           -- ĐÃ BỎ social_image_id (ADR-011)
status, published_at, first_published_at              -- locale-status (ADR-004) + ADR-002
UNIQUE(product_id, locale), UNIQUE(locale, slug)
```
`applications_text` = mô tả văn bản; quan hệ ứng dụng chuẩn hóa vẫn ở `product_applications`. Không dùng JSONB thay quan hệ để lọc/so sánh.

## `product_specifications`
`id, product_id, group_key, label_vi, label_en, value_vi, value_en, unit, display_order`. (Tên cột `group_key` — thống nhất với 05.)

## Quan hệ sản phẩm (bảng trung gian)
- `product_category_links(product_id, category_id, is_primary)` — ≥1 danh mục; đúng 1 `is_primary=true`; primary phải nằm trong tập đã gắn.
- `product_standards(product_id, standard_id, compliance_type, note_vi, note_en, display_order)` — `compliance_type ∈ {compliance, correlation, specification, reference}`.
- `product_applications(product_id, application_id, is_primary)`.
- `product_industries(product_id, industry_id)`.
- `product_media(product_id, media_id, media_role, display_order)` — `media_role ∈ {gallery, diagram, application, interface, dimension}` (**KHÔNG có `featured`**; ảnh đại diện ở `products.featured_image_id`).
- `related_products(product_id, related_product_id, relation_type, display_order)` — `relation_type ∈ {similar, alternative, accessory, compatible, recommended}`; `product_id ≠ related_product_id`.

---

# PHẦN IX — DỊCH VỤ (7 entity chính)

## `services` (cây)
`id, parent_id(self), service_type, featured_image_id, status, is_featured, display_order, published_at, created_by, updated_by, created_at, updated_at, deleted_at`.
## `service_translations` (có locale-status)
`service_id, locale, name, slug, short_description(nullable), overview, customer_problems, scope_of_work, process, benefits, faq (JSONB), seo_title, seo_description, status, published_at, first_published_at`.
## Quan hệ dịch vụ
`service_products`, `service_brands`, `service_industries`. **KHÔNG có `service_documents`** — quan hệ dịch vụ–tài liệu dùng `document_services`.

---

# PHẦN X — DỰ ÁN (7 entity chính)

## `projects`
`id, customer_id(nullable, SET NULL), project_type, customer_visibility, location_text, country_code, started_at, completed_at, featured_image_id, status, is_featured, published_at, created_by, updated_by, created_at, updated_at, deleted_at`.
`project_type ∈ {installation, commissioning, handover, training, maintenance, repair, fabrication, case_study, other}`.
`customer_visibility ∈ {public, hide_name, industry_only, confidential}`.
## `project_translations` (có locale-status)
`project_id, locale, title, slug, short_description(nullable), scope_of_work, implementation, result (JSONB), customer_display_name, seo_title, seo_description, status, published_at, first_published_at`.
## Quan hệ dự án
`project_products(…, note_vi, note_en)`, `project_services`, `project_brands`, `project_media(…, caption_vi, caption_en, display_order)`.

---

# PHẦN XI — BÀI VIẾT (7 entity chính)

## `post_categories` (cây, taxonomy — không locale-status)
`id, parent_id(self), status(default published), display_order, created_at, updated_at`.
## `post_category_translations`
`category_id, locale, name, slug, description, seo_title, seo_description, first_published_at`.
## `posts`
`id, category_id(RESTRICT), featured_image_id, author_id(nullable), status, is_featured, published_at, created_at, updated_at, deleted_at`.
## `post_translations` (có locale-status)
`post_id, locale, title, slug, excerpt(nullable), content(JSONB), seo_title, seo_description, status, published_at, first_published_at`.
## Quan hệ bài viết
`post_products`, `post_services`, `post_projects`, `post_brands`, `post_media`.

---

# PHẦN XII — KHÁCH HÀNG TIÊU BIỂU (taxonomy/config — không locale-status)
## `customers`
`id, name, logo_id(RESTRICT), industry_id, website_url, is_public, is_featured, display_order, status, created_at, updated_at, deleted_at`.
## `customer_translations`
`customer_id, locale, short_description`. `UNIQUE(customer_id, locale)`.
Dữ liệu công khai, **không** phải CRM. Chỉ hiển thị khi `is_public=true`.

---

# PHẦN XIII — TÀI LIỆU (7 entity chính)
## `documents`
`id, document_type, file_id(RESTRICT), language, version, publication_date, status, visibility, download_count, created_at, updated_at, deleted_at`.
`document_type ∈ {catalogue, brochure, datasheet, application_note, company_profile, manual, certificate, other}` (**đã bỏ `video`** — ADR-012).
`visibility` MVP: `{public, hidden}`; tương lai: `{email_required, customer_only, staff_only}`.
**`language`** = ngôn ngữ **file vật lý** (`vi/en/multi`) — khác với `document_translations.locale` (ngôn ngữ **metadata** title/description).
## `document_translations` (có locale-status)
`document_id, locale, title, slug, description, seo_title, seo_description, status, published_at, first_published_at`.
## Quan hệ tài liệu
`document_products`, `document_brands`, `document_services`, `document_posts`. (Một bảng `document_services` duy nhất cho quan hệ dịch vụ–tài liệu.)

---

# PHẦN XIV — MEDIA
## `media`
`id, file_name, original_name, storage_disk, storage_path(unique), public_url, mime_type, file_extension, file_size, width, height, checksum, title, alt_text_vi, alt_text_en, caption_vi, caption_en, credit, uploaded_by, created_at, deleted_at`.
Quy tắc (ADR-005/009): MIME thực (magic bytes), whitelist JPG/JPEG/PNG/WebP/PDF, không SVG/executable, giới hạn dung lượng, checksum chống trùng, tạo phiên bản tối ưu. Không xóa khi đang dùng (409); FK tham chiếu RESTRICT.

---

# PHẦN XV — VĂN PHÒNG, MENU, REDIRECT, SETTINGS

## `offices` / `office_translations`
`offices(id, office_type, phone, fax, email(citext), map_url, latitude, longitude, featured_image_id, status, display_order, created_at, updated_at)`; `office_translations(office_id, locale, name, address, working_hours, description)`.
`office_type ∈ {head_office, branch, representative_office, service_center, workshop}`.

## `menus` / `menu_items` / `menu_item_translations`
`menus(id, code(unique), name, location, status)`; `location ∈ {header, mobile, footer_company, footer_products, footer_services, footer_legal}`.
`menu_items(id, menu_id, parent_id(self), link_type, link_target_id, custom_url, icon_id, open_new_tab, display_order, status)`.
`link_type` (thống nhất): `{page, product_category, brand, service, post_category, product, post, custom_url, none}`.
`menu_item_translations(menu_item_id, locale, label, title_attribute)`.
Mega menu sản phẩm **auto-generated** từ dữ liệu nổi bật; `menu_items` chỉ quản mục cấp cao.

## `redirects`
`id, source_path(unique), target_path, redirect_type(301/302), status, hit_count, last_hit_at, created_at, updated_at`. `source_path ≠ target_path`; tránh chain/loop; đổi slug tạo redirect tự động (ADR-002).

## `settings`
`id, group_name, setting_key, value, value_type, is_public, is_encrypted, created_at, updated_at`. `UNIQUE(group_name, setting_key)`. (Tên cột `group_name/setting_key` — thống nhất với 05.)
Nhóm: company, contact, email, seo, social, upload, security, analytics, map, localization, maintenance. SMTP password/API secret/CAPTCHA secret `is_encrypted=true`, không trả về frontend.

---

# PHẦN XVI — YÊU CẦU KHÁCH HÀNG (ADR-003) — CÓ TRONG MVP

> Khác bản cũ: MVP **có** lưu database. Chưa có giao diện quản lý inquiry trong Admin.

## `inquiries`
```text
id, inquiry_type, full_name, company_name, phone, email, message,
product_id (nullable, SET NULL), service_id (nullable, SET NULL),
source_url, locale, preferred_contact_method (nullable), province (nullable),
privacy_consent_at, email_status, idempotency_key (UNIQUE),
ip_address (nullable), user_agent (nullable), captcha_score (nullable),
created_at, expires_at (nullable — KHÔNG default; retention TBD, xem dưới)
```
`inquiry_type ∈ {quotation, product_consultation, technical_support, maintenance_repair, partnership, general_contact}`.
`email_status ∈ {email_pending, email_sent, email_failed}` (**bỏ `received`** — v1.2; commit tạo inquiry → `email_pending`).

**Retention (v1.2.1):** `expires_at` nullable, **không có default SQL**; `privacy.inquiry_retention_months` = **TBD** (doanh nghiệp duyệt trước production). Hiện tại: `expires_at = NULL`, **không** tự purge/anonymize, **không** áp thời hạn mặc định. 24 tháng chỉ là phương án tham khảo.

## `inquiry_outbox` (cập nhật v1.2 — concurrency, ADR-003)
```text
id, inquiry_id (FK CASCADE), channel (default 'email'), recipient,
status ∈ {pending, processing, sent, failed},
attempts, last_attempt_at, next_attempt_at (NOT NULL DEFAULT NOW()),
locked_at (nullable), locked_by (nullable),
last_error (sanitize, không PII/secret), created_at, updated_at, sent_at
UNIQUE(inquiry_id, channel, recipient)
```

Luồng: lưu `inquiries` + `inquiry_outbox` trong một transaction → 202 → worker lấy job bằng `FOR UPDATE SKIP LOCKED` (set `processing` + `locked_at/locked_by`) → gửi → `sent`/retry(backoff)/`failed`; **stale-lock reaper** đưa job `processing` quá hạn về `pending`. Không log toàn bộ PII; dữ liệu kỹ thuật (ip/user_agent/captcha) không hiển thị công khai. (Chi tiết ADR-003.)

**Bảo đảm gửi (v1.2.1):** outbox có semantics **at-least-once** (KHÔNG exactly-once): `SKIP LOCKED` chỉ ngăn hai worker xử lý đồng thời cùng job; nếu SMTP đã nhận nhưng worker chết trước khi ghi `sent`, reaper có thể để job gửi lại. **Message-ID ổn định** sinh xác định từ `outbox.id` (dùng cùng Message-ID mọi lần retry) để giảm tác động của bản gửi trùng. Không đổi schema.

**Attachment khách (P1):** khi triển khai, bảng `inquiry_attachments` lưu tách khỏi Media công khai, URL token ngắn hạn.

---

# PHẦN XVII — TRƯỜNG BẮT BUỘC KHI XUẤT BẢN (PublishService, không phải NOT NULL ở DB)

Nháp cho phép thiếu (mục 4.7): DB chỉ bắt buộc `name` và `slug` (auto-sinh); các trường mô tả nullable.

**Sản phẩm publish cần:** bản dịch VI `status=published`, name, slug, short_description, overview, brand, ≥1 category, đúng 1 primary category, featured_image, slug không trùng, brand/category chưa xóa.
**Hãng publish cần:** name, slug, logo, short_description, brand_type, trạng thái.
**Dịch vụ publish cần:** name VI, slug, short_description, scope_of_work, featured_image, không vòng lặp cha–con.
**Dự án publish cần:** title, project_type, short_description, scope_of_work, customer_visibility, ≥1 ảnh.
**Bài viết publish cần:** category, title, slug, excerpt, content, featured_image, published_at.

---

# PHẦN XVIII — DANH SÁCH BẢNG

## P0 (triển khai MVP)
```text
users
media
settings
redirects
pages / page_translations
banners / banner_translations / homepage_sections
offices / office_translations
brands / brand_translations
product_categories / product_category_translations
standards / standard_translations
applications / application_translations
industries / industry_translations
products / product_translations / product_specifications
product_category_links / product_standards / product_applications / product_industries / product_media / related_products
services / service_translations / service_products / service_brands / service_industries
customers / customer_translations
projects / project_translations / project_products / project_services / project_brands / project_media
post_categories / post_category_translations
posts / post_translations / post_products / post_services / post_projects / post_brands / post_media
documents / document_translations / document_products / document_brands / document_services / document_posts
menus / menu_items / menu_item_translations
inquiries / inquiry_outbox          ← MỚI (ADR-003)
```

## Future (không tạo trong MVP)
```text
inquiry_attachments / inquiry_notes / inquiry_status_history   (P1/Future)
roles / permissions / user_roles / role_permissions
quotes / quote_items / quote_versions
customer_accounts / customer_documents / customer_sessions
equipment_assets / service_tickets / maintenance_schedules / warranties / service_reports
prices / shopping_carts / cart_items / orders / order_items / payments / shipments
```

---

# PHẦN XIX — ĐỒNG BỘ ENUM (thống nhất toàn bộ tài liệu)

| Khái niệm | Giá trị chốt |
|---|---|
| `banners.link_type` | product, product_category, brand, service, project, post, page, external_url, none |
| `menu_items.link_type` | page, product_category, brand, service, post_category, product, post, custom_url, none |
| `product_media.media_role` | gallery, diagram, application, interface, dimension |
| `products.status` / mọi entity | draft, published, hidden, archived |
| translation.status (7 entity chính) | draft, published, hidden |
| `documents.document_type` | catalogue, brochure, datasheet, application_note, company_profile, manual, certificate, other (**không có video**) |
| `inquiries.email_status` | email_pending, email_sent, email_failed (**bỏ received**) |
| `inquiry_outbox.status` | pending, processing, sent, failed |
| content block video | `external_video` (provider ∈ youtube, vimeo) — không upload video |

> Lưu ý: `banners.link_type` dùng `product_category` (đồng bộ với menu) và `external_url`; `menu_items.link_type` dùng `custom_url`. Backend map hai tên "URL ngoài" (`external_url` cho banner, `custom_url` cho menu) — chấp nhận khác tên vì hai ngữ cảnh, nhưng cùng ý nghĩa "URL tùy chỉnh". Nếu muốn tuyệt đối nhất quán, dùng `custom_url` cho cả hai (khuyến nghị khi code).

---

# PHẦN XX — MIGRATION DỮ LIỆU WEBSITE CŨ (bảng kiểm kê)
`URL cũ | Loại nội dung | Tên | Trạng thái | Nội dung VI | Nội dung EN | Ảnh | Tài liệu | URL mới | Hành động(keep/rewrite/complete/verify/archive/discard) | Redirect(301)`. (Chi tiết checklist ở 06/08 mục SEO.)
