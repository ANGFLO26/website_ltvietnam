# 04 — ERD LOGIC HỆ THỐNG — WEBSITE LT VIETNAM

**Phiên bản:** 1.2.1
**Ngày:** 2026-07-21
**Nguồn sự thật cho:** quan hệ logic giữa các thực thể.
**Áp dụng:** ADR-002/003/004/005/007/009/010/011/012. Chi tiết vật lý ở `05_DATABASE_SCHEMA_POSTGRESQL.md`.

---

## 1. Ký hiệu
```text
1 ----- 1     một–một
1 -----< N    một–nhiều
N >-----< N   nhiều–nhiều (qua bảng LINK)
[CORE]   bảng lõi MVP
[LINK]   bảng trung gian
[SYSTEM] quản trị/cấu hình
[NEW]    bảng mới thêm ở bản 1.1 (inquiries/outbox)
[FUTURE] chưa triển khai
```

## 2. Thay đổi so với bản cũ
### Bản 1.1
- **Bỏ** `products.primary_category_id` → danh mục chính qua `product_category_links.is_primary`.
- **Bỏ** `service_documents` → chỉ `document_services`.
- **Bỏ** `product_media.media_role='featured'`.
- **Thêm** `status`/`published_at` cho translation của 7 entity chính (products, services, projects, posts, brands, pages, documents).
- **Thêm** `[NEW]` `inquiries`, `inquiry_outbox`.
- Mọi FK media `RESTRICT`; `brands.parent_id`/`*_categories.parent_id` `SET NULL`; translation & LINK `CASCADE`.

### Bản 1.2
- **Thêm `first_published_at`** vào **12 bảng translation có slug** (page, brand, product_category, standard, application, industry, product, service, project, post_category, post, document) — xác định "đã từng publish" cho quy tắc hard-delete/slug (ADR-002).
- **Bỏ `social_image_id`** khỏi `page_translations`, `product_translations` (social image tự sinh theo fallback — ADR-011). MediaUsageService không còn quét hai cột này.
- **Bỏ `canonical_url`/`robots_index`/`robots_follow`** khỏi mô hình (canonical/robots tự sinh — ADR-011).
- **inquiry_outbox** thêm cột lock (`locked_at, locked_by, last_attempt_at, updated_at`) + `UNIQUE(inquiry_id, channel, recipient)`; enum `status ∈ {pending, processing, sent, failed}`; `inquiries.email_status` bỏ `received` (ADR-003).
- **Bỏ `document_type='video'`**; video ngoài qua content block `external_video` (ADR-012). **Không** có bảng `product_videos` trong P0.

---

# PHẦN I — SƠ ĐỒ TỔNG QUAN

```text
                          +------------------+
                          |   USERS [SYSTEM] |
                          +--------+---------+
                                   | created_by / updated_by / author_id / uploaded_by
        +--------------------------+--------------------------+
        v                          v                          v
   +----------+              +-----------+              +-----------+
   | BRANDS   |1 ----------< | PRODUCTS  | >----------< | PRODUCT_  |
   | [CORE]   |  brand_id    | [CORE]    |  (LINK)      | CATEGORIES|
   +----+-----+  (RESTRICT)  +-----+-----+              +-----------+
        | parent_id (SET NULL)     |
        v (self)                   +--< PRODUCT_TRANSLATIONS (status,published_at)
   sub-brands                      +--< PRODUCT_SPECIFICATIONS
                                   +--< PRODUCT_MEDIA >-- MEDIA
                                   +--< PRODUCT_STANDARDS   >-- STANDARDS
                                   +--< PRODUCT_APPLICATIONS>-- APPLICATIONS
                                   +--< PRODUCT_INDUSTRIES  >-- INDUSTRIES
                                   +--< PRODUCT_CATEGORY_LINKS (is_primary) >-- PRODUCT_CATEGORIES
                                   +--< RELATED_PRODUCTS (self)

   SERVICES[CORE] ---< SERVICE_TRANSLATIONS(status)   PROJECTS[CORE] ---< PROJECT_TRANSLATIONS(status)
     +--< service_products/brands/industries            +--< project_products/services/brands/media
     +-- (document_services)                            +-- customer_id (SET NULL) -> CUSTOMERS

   POSTS[CORE] ---< POST_TRANSLATIONS(status)           DOCUMENTS[CORE] ---< DOCUMENT_TRANSLATIONS(status)
     +-- category_id -> POST_CATEGORIES                   +-- file_id -> MEDIA (RESTRICT)
     +--< post_products/services/projects/brands/media    +--< document_products/brands/services/posts

   PAGES[CORE] ---< PAGE_TRANSLATIONS(status)           MEDIA[CORE] <-- (mọi *_image_id, file_id) RESTRICT
   BANNERS ---< BANNER_TRANSLATIONS   HOMEPAGE_SECTIONS   OFFICES ---< OFFICE_TRANSLATIONS
   MENUS ---< MENU_ITEMS ---< MENU_ITEM_TRANSLATIONS     CUSTOMERS ---< CUSTOMER_TRANSLATIONS
   STANDARDS/APPLICATIONS/INDUSTRIES/PRODUCT_CATEGORIES/POST_CATEGORIES ---< *_TRANSLATIONS (no status)
   REDIRECTS[SYSTEM]   SETTINGS[SYSTEM]

   +---------------------------------------------------------------+
   | INQUIRIES [NEW/CORE] ---1..N--- INQUIRY_OUTBOX [NEW/CORE]      |
   |   product_id -> PRODUCTS (SET NULL)                            |
   |   service_id -> SERVICES (SET NULL)                            |
   +---------------------------------------------------------------+
```

---

# PHẦN II — QUAN HỆ CHI TIẾT

## Hãng (self-reference)
```text
BRANDS 1 -----< N BRANDS        (parent_id, SET NULL)
BRANDS 1 -----< N PRODUCTS      (products.brand_id NOT NULL, RESTRICT)
```
Quy tắc: sub_brand phải có parent; không tự làm cha; không vòng lặp (kiểm ở backend).

## Sản phẩm — quan hệ N–N (LINK)
```text
PRODUCTS >--< PRODUCT_CATEGORIES   qua PRODUCT_CATEGORY_LINKS (is_primary; đúng 1 primary)
PRODUCTS >--< STANDARDS            qua PRODUCT_STANDARDS (compliance_type trong PK)
PRODUCTS >--< APPLICATIONS         qua PRODUCT_APPLICATIONS (is_primary)
PRODUCTS >--< INDUSTRIES           qua PRODUCT_INDUSTRIES
PRODUCTS >--< MEDIA                qua PRODUCT_MEDIA (media_role: gallery/diagram/application/interface/dimension)
PRODUCTS >--< PRODUCTS             qua RELATED_PRODUCTS (relation_type; product_id≠related)
```
Danh mục chính: chỉ ở `product_category_links.is_primary` (**không** `products.primary_category_id`).
Ảnh đại diện: `products.featured_image_id` (**không** `media_role='featured'`).

## Dịch vụ
```text
SERVICES 1 -----< N SERVICES               (parent_id, SET NULL)
SERVICES >--< PRODUCTS/BRANDS/INDUSTRIES   (service_products/brands/industries)
SERVICES >--< DOCUMENTS                     qua DOCUMENT_SERVICES  (KHÔNG có service_documents)
```

## Dự án
```text
PROJECTS N >-----< N PRODUCTS/SERVICES/BRANDS/MEDIA
PROJECTS >-- CUSTOMERS (customer_id, SET NULL)   customer_visibility điều khiển hiển thị (backend)
```

## Bài viết
```text
POSTS -- POST_CATEGORIES (category_id, RESTRICT)
POSTS N >-----< N PRODUCTS/SERVICES/PROJECTS/BRANDS/MEDIA
```

## Tài liệu
```text
DOCUMENTS -- MEDIA (file_id, RESTRICT)
DOCUMENTS N >-----< N PRODUCTS/BRANDS/SERVICES/POSTS
```

## Media (trung tâm, RESTRICT)
Được tham chiếu bởi: banners(image, mobile_image), pages(featured), brands(logo, cover), product_categories(featured, icon), applications(icon), industries(featured, icon), products(featured), product_media, services(featured), projects(featured), project_media, posts(featured), post_media, customers(logo), offices(featured), menu_items(icon), documents(file). **Tất cả RESTRICT** — xóa media đang dùng trả 409 (ADR-005). *(v1.2: đã bỏ `page_translations.social_image_id` và `product_translations.social_image_id` — ADR-011.)*

## Bản dịch (locale-status cho 7 entity chính)
```text
PRODUCTS/SERVICES/PROJECTS/POSTS/BRANDS/PAGES/DOCUMENTS 1 -----< N *_TRANSLATIONS
   *_translations có: status(draft/published/hidden), published_at, first_published_at
   UNIQUE(entity_id, locale), UNIQUE(locale, slug)
Taxonomy translations (product_category/standard/application/industry/post_category):
   KHÔNG có status (hiển thị khi có bản dịch) NHƯNG CÓ first_published_at (ADR-002)
Config translations (office/menu_item/banner/customer): không status, không first_published_at
```

---

# PHẦN III — INQUIRIES (ERD MỚI, ADR-003)

```text
+----------------------------+          +----------------------------------+
| INQUIRIES [NEW/CORE]       | 1 ----< N| INQUIRY_OUTBOX [NEW/CORE]         |
|----------------------------|          |----------------------------------|
| PK id                      |          | PK id                            |
| inquiry_type               |          | FK inquiry_id (CASCADE)          |
| full_name, company_name    |          | channel (default email)          |
| phone, email, message      |          | recipient                        |
| FK product_id (SET NULL)   |          | status(pending/processing/       |
| FK service_id (SET NULL)   |          |        sent/failed)              |
| source_url, locale         |          | attempts, last_attempt_at        |
| preferred_contact_method   |          | next_attempt_at (NOT NULL)       |
| province                   |          | locked_at, locked_by             |
| privacy_consent_at         |          | last_error (sanitize)            |
| email_status               |          | created_at, updated_at, sent_at  |
|   (email_pending /         |          | UK(inquiry_id, channel, recipient)|
|    email_sent /            |          +----------------------------------+
|    email_failed)           |
| UK idempotency_key         |
| ip_address, user_agent,    |
| captcha_score              |
| created_at, expires_at     |
+----------------------------+
```

Luồng (v1.2 — concurrency, ADR-003):
```text
POST /inquiries → validate → CAPTCHA + rate limit → kiểm idempotency_key
   → BEGIN: INSERT inquiries (email_status=email_pending)
            INSERT inquiry_outbox (status=pending, next_attempt_at=NOW()) : COMMIT
   → 202 Accepted
   → Worker: SELECT ... FOR UPDATE SKIP LOCKED → status=processing (+locked_at/locked_by)
             → gửi email → sent (+email_sent) | retry(pending, next_attempt_at+=backoff) | hết → failed (+email_failed)
   → Reaper: processing quá hạn (locked_at < NOW()-timeout) → pending
```

**Bảo đảm gửi (v1.2.1):** outbox có semantics **at-least-once**, KHÔNG exactly-once (SMTP đã nhận nhưng worker chết trước khi ghi `sent` ⇒ có thể gửi lại). Message-ID ổn định sinh xác định từ `outbox.id` (cùng Message-ID mọi lần retry) để giảm tác động bản gửi trùng. (ADR-003.)

---

# PHẦN IV — QUY TẮC DELETE (đồng bộ 05)

| Loại quan hệ | Rule |
|---|---|
| translation ← entity cha | CASCADE |
| bảng LINK ← entity | CASCADE |
| FK media (mọi *_image_id, file_id) | **RESTRICT** |
| `parent_id` (brands, categories, applications, services, post_categories) | SET NULL |
| `menu_items.parent_id`, `menu_items.menu_id` | CASCADE |
| `created_by/updated_by/author_id/uploaded_by` → users | SET NULL |
| `products.brand_id` | RESTRICT |
| `posts.category_id` | RESTRICT |
| `projects.customer_id`, `inquiries.product_id/service_id` | SET NULL |
| `inquiry_outbox.inquiry_id` | CASCADE |

Xóa mềm (`deleted_at`) áp cho: products, brands, product_categories, services, projects, posts, documents, pages, customers, media, standards, applications, industries. Nội dung đang được dùng không hard-delete (dùng ẩn/xóa mềm).

---

# PHẦN V — QUY TẮC CÂY CHA–CON
Áp cho: brands, product_categories, applications, services, post_categories, menu_items.
DB chỉ đảm bảo `parent_id ≠ id` (CHECK). Backend kiểm: không vòng lặp, không chọn hậu duệ làm cha, không vượt số cấp khuyến nghị (3–4).
**Applications:** DB giữ `parent_id` nhưng Admin MVP hiển thị **phẳng** (ADR-006).

---

# PHẦN VI — DANH SÁCH BẢNG THEO GIAI ĐOẠN

**[CORE/NEW] MVP (P0):** users, media, settings, redirects; pages(+tr); banners(+tr), homepage_sections; offices(+tr); brands(+tr); product_categories(+tr); standards(+tr); applications(+tr); industries(+tr); products(+tr), product_specifications, product_category_links, product_standards, product_applications, product_industries, product_media, related_products; services(+tr), service_products, service_brands, service_industries; customers(+tr); projects(+tr), project_products, project_services, project_brands, project_media; post_categories(+tr), posts(+tr), post_products, post_services, post_projects, post_brands, post_media; documents(+tr), document_products, document_brands, document_services, document_posts; menus, menu_items(+tr); **inquiries, inquiry_outbox**.

**[FUTURE]:** inquiry_attachments/notes/status_history; roles/permissions/user_roles/role_permissions; quotes/quote_items/quote_versions; customer_accounts/documents/sessions; equipment_assets/service_tickets/maintenance_schedules/warranties/service_reports; prices/carts/cart_items/orders/order_items/payments/shipments.
