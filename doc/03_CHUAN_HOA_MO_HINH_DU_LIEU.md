# 03 — CHUẨN HÓA MÔ HÌNH DỮ LIỆU — WEBSITE LT VIETNAM

**Phiên bản:** 1.3
**Ngày:** 2026-07-29
**Nguồn sự thật cho:** mô hình dữ liệu logic, quy tắc trường, quan hệ.
**Áp dụng:** ADR-002, 003, 005, 009, 010, 011, 012, 014, 015.
**Ghi chú:** DDL vật lý ở `doc/verify/v1.3/schema_up.sql`; giải thích ở `05`. Khi khác nhau, **file SQL thắng**.

---

# PHẦN I — NGUYÊN TẮC

1. Không viết cứng hãng/sản phẩm/danh mục/nội dung trong mã nguồn.
2. **Ngôn ngữ (ADR-014):** nội dung lưu **tiếng Anh** trên bảng entity. Chỉ bốn entity có bảng translation. Nhãn giao diện do **frontend** dịch, không nằm trong database.
3. Một nội dung liên kết nhiều nội dung khác qua bảng trung gian.
4. Mở rộng bằng migration, không thiết kế lại.
5. Hỗ trợ SEO, redirect, quản lý URL.
6. Phân biệt `draft/published/hidden/archived` + xóa mềm.
7. Có `created_at`/`updated_at`; hạn chế xóa vĩnh viễn.
8. **Cây (ADR-015):** mọi bảng phân cấp có `ancestor_ids` + `depth`.

## Quy tắc đặt tên
Bảng: tiếng Anh, chữ thường, số nhiều. Trường: chữ thường + gạch dưới. Khóa chính `id` UUID.

---

# PHẦN II — NHÓM TRƯỜNG DÙNG CHUNG

## 1. Nhận dạng & quản trị
`id, created_at, updated_at, created_by, updated_by, deleted_at`

## 2. Trạng thái entity
`status ∈ {draft, published, hidden, archived}`, `published_at`, `first_published_at`, `is_featured`, `display_order`

## 3. Nội dung và slug
Entity **một ngôn ngữ**: `name` (hoặc `title`), `slug UNIQUE`, mô tả, `seo_title`, `seo_description` — nằm thẳng trên bảng entity.

Entity **có bản dịch** (`pages`, `posts`, `services`, `projects`): các trường trên nằm ở bảng translation với `UNIQUE(locale, slug)`, kèm `status`/`published_at`/`first_published_at` riêng theo ngôn ngữ.

## 4. Phân cấp (ADR-015)
`parent_id`, `ancestor_ids UUID[]`, `depth`. Áp dụng: `brands`, `product_categories`, `applications`, `services`, `post_categories`.

## 5. `first_published_at`
Đặt **cùng nơi với `status` điều khiển việc công khai**. Set một lần khi URL lần đầu công khai; không ghi đè khi hide/archive/republish. Dùng để xác định "đã từng xuất bản": chỉ hard-delete khi `first_published_at IS NULL` + draft + không redirect + không phụ thuộc.

## 6. SEO (ADR-011)
Chỉ lưu `seo_title`, `seo_description`. **Không** lưu `canonical_url`, `robots_index`, `robots_follow`, `social_image_id`. Canonical/robots tự sinh. Social image theo fallback chain.

## 7. Media (ADR-005)
Bảng nội dung chỉ giữ FK tới `media`, mọi FK `ON DELETE RESTRICT`. Media dùng trong content block phải được ghi vào `content_media_refs`.

---

# PHẦN III — DANH SÁCH ENTITY

## Có bảng translation (4)

| Entity | Bảng translation | Trường theo ngôn ngữ |
|---|---|---|
| `pages` | `page_translations` | title, slug, summary, content, seo_* |
| `posts` | `post_translations` | title, slug, excerpt, content, seo_* |
| `services` | `service_translations` | name, slug, short_description, overview, customer_problems, scope_of_work, process, benefits, faq, seo_* |
| `projects` | `project_translations` | title, slug, short_description, scope_of_work, implementation, result, customer_display_name, seo_* |

## Một ngôn ngữ — nội dung trên bảng entity

| Entity | Trường nội dung chính |
|---|---|
| `brands` | name, slug, short_description, description, seo_*, brand_type, code, country_code, website_url, logo_id, cover_image_id |
| `product_categories` | name, slug, short_description, description, seo_*, code, featured_image_id, icon_id |
| `standards` | organization, code, name, slug, description, seo_* |
| `applications` | name, slug, description, seo_*, icon_id |
| `industries` | name, slug, description, seo_*, featured_image_id, icon_id |
| `products` | name, slug, short_description, overview, features, applications_text, principle, sample_types, operating_conditions, accessories_options, seo_*, model, internal_code |
| `documents` | title, slug, description, seo_*, document_type, file_id, language, version, publication_date, visibility |
| `post_categories` | name, slug, description, seo_* |
| `customers` | name, short_description, logo_id, industry_id, website_url, is_public |
| `offices` | name, address, working_hours, description, office_type, phone, fax, email, map_url, latitude, longitude |
| `banners` | title, subtitle, button_label, image_alt, image_id, mobile_image_id, link_type, link_target_id |
| `menu_items` | label, label_i18n_key, title_attribute, link_type, link_target_id |

---

# PHẦN IV — QUAN HỆ

## Sản phẩm
- `product_category_links(product_id, category_id, is_primary)` — ≥1 danh mục; đúng 1 `is_primary`; primary phải nằm trong tập đã gắn.
- `product_standards(..., compliance_type, note, display_order)` — `compliance_type ∈ {compliance, correlation, specification, reference}`.
- `product_applications(..., is_primary)` · `product_industries` · `product_media(..., media_role, display_order)`.
- `related_products(..., relation_type, display_order)` — `relation_type ∈ {similar, alternative, accessory, compatible, recommended}`; `alternative` dùng cho sản phẩm thay thế khi ngừng kinh doanh.

## Dịch vụ
`service_products(..., display_order)` · `service_brands` · `service_industries`. **Không** có `service_documents`; quan hệ dịch vụ–tài liệu dùng `document_services`.

## Dự án
`project_products(..., note, display_order)` · `project_services` · `project_brands` · `project_media(..., caption, display_order)`.

## Bài viết
`post_products` · `post_services` · `post_projects` · `post_brands` · `post_media(..., display_order)`.

## Tài liệu
`document_products(..., display_order)` · `document_brands` · `document_services` · `document_posts`.

## Media trong content block
`content_media_refs(media_id, entity_type, entity_id, locale, field_name)` — bắt buộc đồng bộ trong cùng transaction khi ghi trường JSONB có tham chiếu media.

---

# PHẦN V — YÊU CẦU KHÁCH HÀNG (ADR-003)

## `inquiries`
```text
id, inquiry_type, full_name,
company_name (nullable), phone (nullable), email (nullable),
   CHECK (phone IS NOT NULL OR email IS NOT NULL)
message, product_id, service_id, source_url, locale,
preferred_contact_method, province, privacy_consent_at,
email_status, idempotency_key (UNIQUE),
request_fingerprint, request_fingerprint_version,
handled_at, handled_by,
ip_address, user_agent, captcha_score, created_at, expires_at
```
`inquiry_type ∈ {quotation, product_consultation, technical_support, maintenance_repair, partnership, general_contact}`
`email_status ∈ {email_pending, email_sent, email_failed}`

**Retention:** `expires_at` nullable, không default; `privacy.inquiry_retention_months` = TBD; không tự purge.

## `inquiry_outbox`
```text
id, inquiry_id, channel, recipient, status, attempts,
last_attempt_at, next_attempt_at, locked_at, locked_by,
last_error, sent_at, created_at, updated_at
UNIQUE(inquiry_id, channel, recipient)
```
`status ∈ {pending, processing, sent, failed}`. Worker lấy job bằng `FOR UPDATE SKIP LOCKED`; reaper đưa job `processing` quá hạn về `pending`. **Semantics at-least-once**, Message-ID xác định từ `outbox.id`.

---

# PHẦN VI — ĐỒNG BỘ ENUM

| Khái niệm | Giá trị chốt |
|---|---|
| `banners.link_type` | product, product_category, brand, service, project, post, page, **custom_url**, none |
| `menu_items.link_type` | page, product_category, brand, service, post_category, product, post, custom_url, none |
| `product_media.media_role` | gallery, diagram, application, interface, dimension |
| `media.storage_class` | public, protected, temp, quarantine |
| entity `status` | draft, published, hidden, archived |
| translation `status` (4 entity) | draft, published, hidden |
| `documents.document_type` | catalogue, brochure, datasheet, application_note, company_profile, manual, certificate, other |
| `documents.visibility` | public, hidden (MVP) · email_required, customer_only, staff_only (tương lai) |
| `inquiries.email_status` | email_pending, email_sent, email_failed |
| `inquiry_outbox.status` | pending, processing, sent, failed |
| content block video | `external_video`, provider ∈ youtube, vimeo |

> **v1.3:** `banners.link_type` đổi `external_url` → `custom_url` để thống nhất với `menu_items`. Bản v1.2.1 dùng hai tên khác nhau cho cùng một khái niệm và tự ghi nhận nên thống nhất khi code.

---

# PHẦN VII — MIGRATION DỮ LIỆU WEBSITE CŨ

Bảng kiểm kê bắt buộc:
```text
URL cũ | Loại nội dung | Tên (EN) | Tên (VI) | Model tách ra | Trạng thái |
Ảnh | Tài liệu | URL mới | Hành động | Redirect 301
```
`Hành động ∈ {keep, rewrite, complete, verify, archive, discard, broken, external}`

**Ba lưu ý bắt buộc rút ra từ khảo sát website hiện tại:**

1. **Tiêu đề nguồn ghép hai ngôn ngữ trong một trường**, ví dụ `CID 510 - Cetane Ignition Delay / Thiết bị đo chỉ số Derived Cetane number`. Dấu phân cách không nhất quán và tên sản phẩm bản thân đã chứa `/` và `&`. Phải **tách tay**, đồng thời quyết định phần nào vào `products.model`.
2. **URL cũ dùng ID nội bộ** (`/m/69/25/...aspx`) nên **không suy ra được URL mới**. Bảng ánh xạ phải lập thủ công từng dòng.
3. **Website hiện tại có khối link ngoài không liên quan ở footer trang con.** Không được mang sang. Cần kiểm tra sức khỏe SEO của domain nguồn **trước** khi quyết định chiến lược 301.
