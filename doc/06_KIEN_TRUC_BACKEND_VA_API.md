# 06 — KIẾN TRÚC BACKEND VÀ API — WEBSITE LT VIETNAM

**Phiên bản:** 1.3
**Kiểu hệ thống:** Modular monolith · REST · prefix `/api/v1`
**Ngày:** 2026-07-29
**Nguồn sự thật cho:** ranh giới module, endpoint, hợp đồng request/response, luồng nghiệp vụ.
**Áp dụng:** ADR-001 (URL), 002 (slug/SlugService), 003 (inquiry/outbox), 004 (locale), 005 (media), 007 (filter OR/AND), 008 (PATCH), 009 (upload), 010 (catalogue), 011 (canonical/robots/SEO), 012 (video), **014 (ngôn ngữ nội dung)**, **015 (lọc theo cây)**.

> **Nhật ký v1.3:** URL tiếng Anh ở gốc + `/vi` cho bốn nhóm có bản dịch · điều kiện truy vấn công khai tách hai trường hợp · bộ lọc mở rộng nhánh con trước khi áp OR/AND · thêm `SearchPort` · thêm quy tắc tầng đọc/ghi · thêm `GET /admin/inquiries` chỉ đọc.

> **Nhật ký v1.2:** filter OR/AND · SlugService kiểm 3 nguồn · outbox worker (SKIP LOCKED + reaper) · health `/live` + `/ready` · SEO canonical/robots tự sinh · public API dùng slug · structured audit log · external video whitelist.
> **Nhật ký v1.2.1:** thêm `GET /products/landing` (không dùng `/home`) · outbox **at-least-once** + Message-ID ổn định · làm rõ không fallback Brand detail · retention TBD (bỏ mặc định 24 tháng) · migration baseline 001–070 (ADR-013) — **đã thay bằng baseline v1.3, xem nhật ký v1.3 bên dưới**.

---

# PHẦN I — KIẾN TRÚC

Modular monolith, mỗi module: `Controller → DTO/Validator → Application Service → Repository → PostgreSQL`.
Module không truy cập repository của module khác; giao tiếp qua Service/QueryPort (vd `ProductQueryPort.getExistingProductIds`).

Module MVP:
```text
auth, users, media, settings,
pages, homepage, brands, product-categories, standards, applications, industries,
products, services, customers, projects, post-categories, posts, documents,
offices, navigation, redirects, search, inquiries, seo, health
```
`seo` mới: sinh `sitemap.xml` theo ngôn ngữ, `robots.txt`, hỗ trợ canonical/hreflang. `redirects` gồm middleware phục vụ 301/302.

## Tầng đọc và tầng ghi tách nhau

```text
ĐƯỜNG GHI                                ĐƯỜNG ĐỌC
Controller                               Controller
  → Service (nghiệp vụ, transaction)       → QueryService
    → Repository theo aggregate              → SQL viết tay tối ưu cho từng màn hình
      1 aggregate = 1 Repository             KHÔNG đi qua Repository đơn bảng
```

- **Ghi:** Repository theo aggregate. `Product` + translations + specs + links là **một** Repository, không phải năm — để giữ transaction và bất biến nghiệp vụ.
- **Đọc:** QueryService viết SQL riêng cho từng nhu cầu, được phép join rộng và dùng raw SQL.

Lý do: bộ lọc `(PAC OR Herzog) AND ASTM D86` bắc cầu qua năm bảng với OR/AND lồng nhau và mở rộng nhánh con. Ghép từ Repository đơn bảng sẽ ra N+1 — mà điều kiện chấp nhận của P5 là **no N+1** kèm ngân sách truy vấn đo được.

## Cổng ra hạ tầng (port)

| Port | Triển khai P0 | Đổi về sau |
|---|---|---|
| `StoragePort` | Local persistent volume | S3 / R2 |
| `NotificationPort` | `SMTPNotificationAdapter` | CRM, Zalo, kênh khác |
| `SearchPort` | `PgTrgmProductSearchAdapter` | Meilisearch / Elasticsearch |
| `UserAuthenticationQueryPort` | Users module | — |

**`SearchPort` là bắt buộc từ P0** dù chỉ có một triển khai. Không có port thì lời hứa "đổi engine không đổi API" chỉ là ý định, và logic pg_trgm sẽ lan vào QueryService.

```text
SearchPort.searchProducts(query, locale, filters, paging) → ProductSearchResult[]
```

Hạ tầng: PostgreSQL; File storage (adapter, local→S3/CDN sau); SMTP (adapter); worker nền (outbox). Redis **không bắt buộc** MVP (cache thời hạn ngắn + rate-limit in-process); khi scale ngang chuyển rate-limit/queue sang store dùng chung.

---

# PHẦN II — QUY ƯỚC API

## Phân nhóm
- Public: `/api/v1/*` — chỉ trả dữ liệu published, chưa xóa, đúng locale, được phép công khai.
- Admin: `/api/v1/admin/*` — yêu cầu đăng nhập; xem cả draft/hidden/archived/đã xóa mềm.
- Auth: `/api/v1/auth/*`.

## Ngôn ngữ & điều kiện công khai (ADR-014)

Ưu tiên `?locale` → tiền tố URL → mặc định `en`.

**Hai trường hợp truy vấn khác nhau:**

```sql
-- (1) Entity MỘT NGÔN NGỮ: brands, product_categories, standards, applications,
--     industries, products, documents, customers, offices, post_categories
WHERE entity.status='published' AND entity.deleted_at IS NULL

-- (2) Entity CÓ BẢN DỊCH: pages, posts, services, projects
WHERE entity.status='published' AND entity.deleted_at IS NULL
  AND t.locale = :locale AND t.status='published'
```

**Không auto-fallback** giữa hai bản dịch của trường hợp (2). URL `/vi/...` chỉ tồn tại khi bản tiếng Việt `published`; thiếu thì 404 hoặc điều hướng về danh sách tiếng Việt — không trộn ngôn ngữ.

**Nhãn giao diện không đi qua API.** Backend không trả nhãn nút, nhãn form, thông báo hiển thị. Frontend dịch bằng file ngôn ngữ.

## Phân trang / sắp xếp / lọc
`?page=1&page_size=20` (max 100). Response `{data, meta{page,page_size,total_items,total_pages}}`.
`sort`/`order` chỉ nhận whitelist backend.
**Bộ lọc (ADR-007) — định dạng + ngữ nghĩa:** dùng **slug**, key lặp cho nhiều giá trị:
```text
GET /api/v1/products?brand=pac&brand=herzog&standard=astm-d86&application=phan-tich-nhien-lieu&category=thiet-bi-chung-cat
```
- **Bước 1 — mở rộng nhánh con (ADR-015).** Mỗi giá trị của chiều có cấu trúc cây (`brand`, `category`, `application`) được mở rộng thành nút đó **và toàn bộ nhánh con**:
```sql
WITH brand_set AS (
  SELECT id FROM ltv.brands WHERE slug = ANY(:brands)
  UNION
  SELECT id FROM ltv.brands
  WHERE ancestor_ids && ARRAY(SELECT id FROM ltv.brands WHERE slug = ANY(:brands))
)
```
  Không có bước này, lọc theo hãng mẹ `PAC` trả về **0 sản phẩm** vì sản phẩm gắn vào thương hiệu con.
- **Bước 2 — cùng một dimension → OR; giữa các dimension → AND.** `(brand ∈ nhánh PAC ∪ nhánh Herzog) AND standard=ASTM D86 AND …`.
- Áp cho `category, brand, standard, application, industry, product_type`. **Không** AND giữa nhiều giá trị cùng khóa.
- Query builder nhóm giá trị theo dimension; **parameter binding** (không ghép SQL). Pseudo:
```sql
WHERE product.status='published' AND product.deleted_at IS NULL
  AND product.brand_id IN (SELECT id FROM brand_set)        -- OR trong dimension, đã gồm nhánh con
  AND EXISTS (SELECT 1 FROM ltv.product_standards ps JOIN ltv.standards s ON s.id=ps.standard_id
              WHERE ps.product_id=product.id AND s.slug = ANY(:standards))
  AND EXISTS (SELECT 1 FROM ltv.product_applications pa
              WHERE pa.product_id=product.id AND pa.application_id IN (SELECT id FROM application_set))
```
- Không hỗ trợ comma hay `brand_id` ở public API. Admin API dùng UUID.
- **Trang lọc theo hãng** = `/products/all?brand={slug}` (frontend), gọi `GET /products?brand={slug}`; noindex,follow (ADR-011).
- **Facet count là P1** (public list MVP không trả số lượng theo giá trị).

---

# PHẦN III — XÁC THỰC ADMIN

JWT trong HttpOnly + Secure + SameSite=Strict cookie (không localStorage). Phiên 8h. **CSRF token** cho mọi request thay đổi trạng thái (POST/PATCH/DELETE). **CORS** chỉ cho origin cụ thể (`https://www.ltvietnam.com.vn`, `https://admin.ltvietnam.com.vn`) + `Allow-Credentials`. Password **Argon2id**. Rate-limit login 5/15'/IP; khóa sau N lần sai. Reset token có hạn ngắn, ký secret riêng, chứa `user_id`, vô hiệu khi `password_changed_at` đổi.

```text
POST /auth/login    POST /auth/logout    GET /auth/me
POST /auth/change-password   POST /auth/forgot-password   POST /auth/reset-password
```

---

# PHẦN IV — API CÔNG KHAI (URL phẳng — ADR-001)

```text
GET /home                              (HomepageQueryService — CHỈ trang chủ; batch load tránh N+1; cache ngắn)

GET /pages/:slug

GET /brands                            ?type=&featured=&parent={parent-brand-slug}   (slug, không dùng UUID — ADR-001)
GET /brands/:slug                      (hồ sơ hãng — /brands/{slug}, index self-canonical)
GET /brands/:slug/children
# Lọc sản phẩm theo hãng KHÔNG dùng /brands/:slug/products nữa → dùng GET /products?brand={slug} (noindex,follow)

GET /product-categories                GET /product-categories/tree
GET /product-categories/:slug          GET /product-categories/:slug/products

GET /standards                         GET /standards/:slug          GET /standards/:slug/products
GET /applications                      GET /applications/:slug       GET /applications/:slug/products
GET /industries                        GET /industries/:slug         GET /industries/:slug/products   GET /industries/:slug/services

GET /products/landing                  (v1.2.1 — dữ liệu tổng hợp trang /products; KHÔNG dùng /home)
GET /products                          (filter theo ADR-007)
GET /products/:slug                    (chi tiết; sản phẩm discontinued vẫn trả, kèm cờ discontinued + thay thế)

GET /services                          GET /services/tree            GET /services/:slug
GET /projects                          GET /projects/:slug
GET /posts                             GET /posts/:slug
GET /post-categories                   GET /post-categories/:slug/posts
GET /customers
GET /documents                         GET /documents/:slug          GET /documents/:slug/download   (slug — ADR-001)
GET /offices
GET /navigation/:location              (mega menu auto-generated)
GET /search                            (MVP: sản phẩm; P1: toàn site)
POST /inquiries                        (không đăng nhập; idempotency)
GET /health/live                       (liveness, public: {status:ok})

# SEO (module seo)
GET /sitemap.xml                       GET /sitemap-:locale.xml       GET /robots.txt

# Nội bộ / bảo vệ (không public)
GET /health/ready                      (readiness: DB/storage/outbox/email — nội bộ, không lộ chi tiết)
```

Chi tiết sản phẩm trả: thông tin + brand + categories + specs + standards + applications + industries + media + documents + services/projects/related (đã lọc published + deleted_at). `customer_visibility` xử lý ở backend cho project.

## Product Landing (v1.2.1 — mới)
`GET /api/v1/products/landing` phục vụ trang catalogue `/products` bằng một `ProductLandingQueryService` **riêng** (KHÔNG dùng `HomepageQueryService`/`GET /home`).
```json
{ "data": { "featured_categories": [], "featured_brands": [], "popular_standards": [],
            "popular_applications": [], "featured_products": [] } }
```
Nguồn dữ liệu: `is_featured` trên `product_categories`, `brands`, `standards`, `applications`, `products`. **`is_featured` là nguồn duy nhất**; `homepage_sections.settings` chỉ chứa cấu hình hiển thị (số lượng, cách sắp xếp), không chứa danh sách id. Quy tắc: dùng `locale`; chỉ trả nội dung `published` + chưa xóa; giới hạn số phần tử mỗi nhóm; **batch load tránh N+1**; cache ngắn. **Không** thay `GET /products`; **không** dùng `GET /home` cho `/products`.

---

# PHẦN V — API ADMIN

Mỗi module Admin hỗ trợ: `list, create, detail, update(PATCH), soft delete, restore, publish, hide, archive, reorder` (tùy module).
```text
/admin/pages   /admin/banners   /admin/homepage   /admin/brands   /admin/product-categories
/admin/standards   /admin/applications   /admin/industries   /admin/products   /admin/services
/admin/customers   /admin/projects   /admin/post-categories   /admin/posts   /admin/documents
/admin/media   /admin/offices   /admin/menus   /admin/settings   /admin/redirects
```
**`/admin/inquiries` — CHỈ ĐỌC (bổ sung v1.3).**
```text
GET /admin/inquiries          ?status=&handled=&type=&page=
GET /admin/inquiries/:id
PATCH /admin/inquiries/:id/handled     { handled: true }
```
Lý do bổ sung: ADR-003 lưu yêu cầu vào DB **trước** khi gửi email để chống mất lead. Nhưng nếu email thất bại sau khi hết số lần thử mà không có màn hình nào xem được, yêu cầu nằm trong DB và **không ai biết** — lưới an toàn không có người nhìn. Màn hình này chỉ liệt kê và đánh dấu đã liên hệ; **không** phải CRM: không trạng thái xử lý nhiều bước, không phân công, không ghi chú, không báo giá. **Không có** endpoint cho P1/Future (bulk, duplicate ngoài `products/:id/duplicate` là P1, scheduled publishing, facet, attachment).

## Publish (ví dụ sản phẩm)
```text
POST /admin/products/:id/publish
```
Kiểm (transaction): VI translation đủ điều kiện; brand/category chưa xóa; đúng 1 primary category; slug không trùng → set `products.status=published, published_at=NOW()` và `product_translations(vi).status=published`. Thiếu → 422 với mã lỗi (vd `PRODUCT_MISSING_PRIMARY_CATEGORY`). Publish EN riêng qua cập nhật translation EN.

## PATCH & quan hệ (ADR-008)
Trường mảng (categories, standards, applications, industries, media, related_products, …) **xuất hiện → thay thế toàn bộ tập**; **không xuất hiện → giữ nguyên**. Toàn bộ trong một transaction.
```text
BEGIN
  UPDATE products ...
  (nếu 'categories' có mặt) DELETE product_category_links WHERE product_id=?; INSERT ...
  (nếu 'standards' có mặt)  DELETE product_standards ...;                     INSERT ...
  (translations có mặt)     UPSERT product_translations ...
COMMIT   -- lỗi → ROLLBACK
```

## SlugService & redirect (ADR-002, cập nhật v1.2)
`SlugService` kiểm tra **public path đầy đủ** (vd `/products/pac-optidist-2`, không chỉ chuỗi slug) trên **3 nguồn** trước khi chấp nhận slug/path mới:
1. **(A)** slug hiện tại trong bảng translation tương ứng;
2. **(B)** `redirects.source_path` (namespace URL đã từng dùng — không cấp lại);
3. **(C)** route hệ thống bảo lưu: `/admin, /api, /, /login, /search, /health, /media, /products, /services, /projects, /news, /resources, /contact`.

Publish lần đầu một translation → set `first_published_at` (một lần, không ghi đè).
Đổi slug nội dung đã publish (transaction): xác định path cũ → kiểm 3 nguồn cho path mới → cập nhật slug → tạo `redirects(source=path cũ, target=path mới, 301)` → kiểm tránh chain/loop → COMMIT (lỗi → ROLLBACK).
**Hard-delete** chỉ khi `first_published_at IS NULL` + draft + không redirect liên quan + không phụ thuộc; ngược lại chỉ soft-delete (không giải phóng slug). Ràng buộc slug thường, không partial: `UNIQUE(slug)` cho entity một ngôn ngữ, `UNIQUE(locale, slug)` cho bốn bảng translation (ADR-002/014).

---

# PHẦN VI — MEDIA (ADR-005/009)

```text
POST   /admin/media          (multipart; file,title,alt_text_vi,alt_text_en,caption_vi,caption_en,credit)
GET    /admin/media          ?type=&mime_type=&q=&page=
GET    /admin/media/:id
PATCH  /admin/media/:id
DELETE /admin/media/:id
```
Upload: kiểm **magic bytes/MIME thực**, whitelist `image/jpeg,image/png,image/webp,application/pdf` (**không SVG, không executable**), giới hạn dung lượng, đổi tên an toàn, chống path traversal, checksum chống trùng; tạo phiên bản (thumbnail/small/medium/large + WebP).
Xóa: `MediaUsageService` quét toàn bộ tham chiếu (danh sách ở ADR-005). Đang dùng → `409 MEDIA_IN_USE` kèm `details`. Không dùng → soft delete → giữ an toàn → purge file. Query công khai loại media `deleted_at IS NOT NULL`.

---

# PHẦN VII — INQUIRY (ADR-003)

```text
POST /api/v1/inquiries          (không đăng nhập)
Header: Idempotency-Key: <uuid>  (hoặc body.request_id)
```
Body:
```json
{ "inquiry_type":"quotation","full_name":"...","company_name":"...","phone":"...","email":"...",
  "message":"...","product_id":"uuid|null","service_id":"uuid|null","source_url":"/products/...",
  "preferred_contact_method":"phone","province":"...","privacy_consent":true,"locale":"vi","captcha_token":"..." }
```
Luồng (v1.2 — concurrency, ADR-003):
```text
Validate DTO → CAPTCHA → Rate limit (5/10'/IP)
→ Kiểm idempotency_key (UNIQUE): nếu đã tồn tại → trả lại 202 của inquiry cũ (KHÔNG tạo mới)
→ BEGIN
    INSERT inquiries (email_status='email_pending', privacy_consent_at=NOW(), idempotency_key)
    INSERT inquiry_outbox (status='pending', recipient=settings.email.inquiry_recipient, next_attempt_at=NOW())
  COMMIT
→ 202 Accepted { request_id, message }
```
**Worker nền (an toàn nhiều instance):**
```sql
BEGIN;
SELECT * FROM ltv.inquiry_outbox
WHERE status='pending' AND next_attempt_at <= NOW()
ORDER BY next_attempt_at
FOR UPDATE SKIP LOCKED LIMIT :batch;         -- không hai worker lấy cùng job
UPDATE ... SET status='processing', locked_at=NOW(), locked_by=:worker_id ...;
COMMIT;
-- gửi email:
--   OK    → status='sent', sent_at=NOW(), locked_*=NULL ; inquiries.email_status='email_sent'
--   lỗi&còn retry → attempts+1, last_attempt_at=NOW(), last_error=<sanitize>,
--                    status='pending', next_attempt_at=NOW()+backoff(1p/5p/15p/1h/6h), locked_*=NULL
--   hết retry → status='failed'; inquiries.email_status='email_failed'  (KHÔNG xóa inquiry)
```
**Reaper (stale-lock):** `status='processing' AND locked_at < NOW()-processing_timeout` → `pending` (clear lock, structured log). `processing_timeout` đủ dài để hạn chế cướp job của worker còn sống.
`last_error` **không** chứa PII/secret. `UNIQUE(inquiry_id, channel, recipient)` chặn tạo job trùng.

**Bảo đảm gửi = at-least-once (v1.2.1):** `SKIP LOCKED` chỉ ngăn hai worker **đồng thời** xử lý cùng một job; **KHÔNG** bảo đảm exactly-once (SMTP đã nhận nhưng worker chết trước khi ghi `sent` → reaper có thể để gửi lại). Không dùng câu "không bao giờ gửi trùng".
- **Message-ID ổn định**, sinh **xác định** từ `outbox.id`: `<inquiry-outbox-{outbox.id}@ltvietnam.com.vn>`. **Retry cùng outbox record dùng cùng Message-ID** (không sinh mới). Nếu SMTP/provider hỗ trợ idempotency key → dùng `outbox.id`.
- Structured log chứa `outbox_id` + `message_id`; **không PII** trong Message-ID. Email template chứa mã yêu cầu nội bộ để nhân viên nhận biết bản gửi trùng. **Không đổi schema** (Message-ID xác định từ `outbox.id`).

Response 202:
```json
{ "data": { "request_id": "uuid", "message": "Yêu cầu đã được tiếp nhận." } }
```

## Email (ADR liên quan 5.4)
- `From` = địa chỉ thuộc **domain LT Vietnam**; `Reply-To` = email khách. Không đặt email khách làm From.
- Sanitize mọi giá trị vào header/subject: bỏ CR/LF, giới hạn độ dài, dùng thư viện email chuẩn (không ghép raw header).
- Yêu cầu hạ tầng: SPF, DKIM, DMARC. Retry qua outbox. Theo dõi trạng thái outbox (dashboard hiển thị `email_failed`).
- Tiêu đề: `[YÊU CẦU BÁO GIÁ] PAC OptiDist 2 – Công ty ABC` (company đã sanitize).
- Kiến trúc mở rộng: `InquiryService` → `NotificationPort` → hiện tại `SMTPNotificationAdapter`; tương lai thêm `SaveInquiryAdapter (đã có)`, `CRMAdapter`, `ZaloAdapter`, `AdminNotificationAdapter` — form frontend không đổi.

## Retention (v1.2.1)
`inquiries.expires_at` nullable, **không default**; `privacy.inquiry_retention_months` = **TBD** (DN duyệt trước production). Hệ thống **không** tự purge/anonymize, không áp thời hạn mặc định. 24 tháng chỉ là phương án tham khảo.

## Attachment khách — **P1** (không có trong MVP)
Khi triển khai: `POST /inquiries/attachments` lưu tạm tách khỏi Media công khai, URL token ngắn hạn, whitelist PDF/JPG/PNG/DOCX, tự xóa sau 24–72h.

---

# PHẦN VIII — NAVIGATION & MEGA MENU

```text
GET /navigation/header    GET /navigation/mobile    GET /navigation/footer
```
`menu_items` quản mục cấp cao. **Mega menu sản phẩm auto-generated**: backend gộp danh mục `is_featured`, hãng `is_featured`, tiêu chuẩn/ứng dụng cấu hình. Admin không nhập tay toàn bộ. Backend kiểm menu: không vòng lặp, nội dung đích tồn tại & chưa xóa, URL ngoài hợp lệ.

Admin: `GET/POST/PATCH/DELETE /admin/menus`, `POST /admin/menus/:menu_id/items`, `PATCH/DELETE /admin/menu-items/:id`, `POST /admin/menus/:menu_id/reorder` (**kéo-thả cây → P1**, MVP dùng reorder cơ bản).

---

# PHẦN IX — HOMEPAGE, SEARCH, SETTINGS, REDIRECT, HEALTH

- **Homepage:** `GET /admin/homepage`, `PATCH /admin/homepage/sections/:section_type` (bật/tắt + chọn nội dung nổi bật). **`POST /admin/homepage/reorder` → P1** (kéo-thả thứ tự section). MVP thứ tự cố định.
- **Search:** MVP `GET /search?q=&type=product&locale=` dùng pg_trgm (tên/model/hãng/danh mục/tiêu chuẩn/mô tả). Toàn site (gộp service/project/post/document) → **P1**. API giữ nguyên khi đổi engine (Meilisearch/Elastic) sau.
- **Settings:** `GET /admin/settings`, `GET/PATCH /admin/settings/:group`. Không trả secret (`smtp_password: "********"`).
- **Redirect:** `GET/POST/PATCH/DELETE /admin/redirects`; middleware phục vụ trước router; kiểm source≠target, không loop/chain, source unique, source không trùng route đang phục vụ.
- **Health (v1.2 — tách 2, M2):**
  - `GET /health/live` (public, liveness): `{ "status": "ok" }` — không kiểm phụ thuộc, không lộ gì.
  - `GET /health/ready` (**nội bộ hoặc bảo vệ**, readiness): kiểm DB, storage, outbox worker/queue, email config nếu phù hợp. **Không** trả database name, SMTP host, version nội bộ, stack trace, secret.

---

# PHẦN X — RESPONSE, LỖI, VALIDATION

Response chuẩn `{data}` / `{data, meta}`. Lỗi:
```json
{ "error": { "code": "PRODUCT_NOT_FOUND", "message": "...", "details": null, "request_id": "uuid" } }
```
HTTP: 200/201/202/204/400/401/403/404/409/422/429/500.
Mã lỗi nghiệp vụ: `AUTH_INVALID_CREDENTIALS, AUTH_SESSION_EXPIRED, PRODUCT_NOT_FOUND, PRODUCT_SLUG_EXISTS, PRODUCT_MISSING_PRIMARY_CATEGORY, BRAND_PARENT_LOOP, CATEGORY_PARENT_LOOP, MEDIA_IN_USE, DOCUMENT_NOT_PUBLIC, INQUIRY_RATE_LIMITED, INQUIRY_DUPLICATE (idempotency), REDIRECT_LOOP, SLUG_RESERVED, SLUG_IN_REDIRECTS, VIDEO_PROVIDER_NOT_ALLOWED, VIDEO_URL_INVALID`.
Validation 3 lớp: frontend → DTO backend → DB constraint. Slug: chữ thường/không dấu/gạch ngang/không trùng theo module+locale/không dùng từ khóa hệ thống (`admin, api, login, search, media, health, en`).

Transaction bắt buộc: tạo/cập nhật/xuất bản sản phẩm, tạo dự án/bài viết kèm quan hệ, thay đổi cây danh mục, duplicate (P1), xóa mềm + cập nhật liên kết, thay đổi thứ tự menu, **tạo inquiry + outbox**.

---

# PHẦN XI — BẢO MẬT (đồng bộ 01/05/07)
HTTPS · CORS origin cụ thể + credentials · CSRF token · HttpOnly cookie · rate limit (login 5/15', inquiry 5/10', search 60/1', public 120/1') · input validation · HTML sanitization (whitelist tag/block, whitelist provider video youtube/vimeo, cấm iframe/script tùy ý) · upload validation (ADR-009, không SVG/video) · Argon2id · security headers.

**Structured audit log P0 (ADR-006, M3):** ghi log có cấu trúc (KHÔNG bảng `audit_logs`) cho: login success/failure, password change/reset, create, update, publish, hide, archive, delete, restore, settings change, redirect change, media delete attempt. Field: `request_id, actor_user_id, action, entity_type, entity_id, result, timestamp, ip_address` (nếu chính sách cho phép). **Không** log password/JWT/cookie/SMTP/CAPTCHA secret/toàn bộ inquiry message/file content/PII đầy đủ. Không Admin UI (bảng audit_logs = P1/Future).

---

# PHẦN XII — SEO & MIGRATION (module seo + redirect) — ADR-011
- **Canonical & robots tự sinh** (không lưu DB, không checkbox Admin): canonical = locale + route + slug; robots suy theo trạng thái/loại trang:
```text
chi tiết published + landing phân loại → index,follow, self-canonical
query filter (?brand=…), search          → noindex,follow (canonical về path gốc, vd /products/all)
draft/hidden/archived/deleted, admin/api/error → noindex,nofollow / không route
```
- **Social image** theo fallback chain (ADR-011): product→featured; brand→cover→logo; service/project/post/page→featured; document→thumbnail→mặc định; cuối `settings.seo.default_social_image`.
- Sinh `sitemap.xml`/`sitemap-vi.xml`/`sitemap-en.xml` (chỉ URL published theo locale, **không** gồm URL filter/search noindex), `robots.txt`.
- Mỗi trang: canonical; hreflang VI↔EN ghép theo entity id (**chỉ khi cả hai bản published** — ADR-004); Open Graph; structured data (Organization/LocalBusiness, Product không giá, Article/NewsArticle, BreadcrumbList, FAQPage khi FAQ hiển thị).
- Redirect đổi slug (ADR-002, SlugService); URL cũ `/products/brand/{slug}` → 301 `/products/all?brand={slug}`; giữ URL sản phẩm ngừng KD (không redirect trừ khi DN duyệt); tránh chain/loop.
- Checklist crawl website cũ: `URL cũ | Loại | URL mới | Trạng thái migrate | 301 | Giữ/Sửa/Bỏ | Ảnh | PDF | Backlink`.

## External video (ADR-012)
Content block `external_video {provider, url, title, caption}` trong pages/products/brands/services/projects/posts. Backend validate: `provider ∈ {youtube, vimeo}`, parse & xác thực domain, trích **video ID**, chuẩn hóa URL; **KHÔNG** lưu raw iframe/script; **từ chối** domain ngoài whitelist. Frontend tự dựng embed an toàn từ provider + video ID. **Không** upload file video (ADR-009). Lỗi → `422 VIDEO_PROVIDER_NOT_ALLOWED` / `VIDEO_URL_INVALID`.

---

# PHẦN XIII — LOGGING & LUỒNG
Mỗi request có `X-Request-ID` (tự sinh nếu thiếu); log `{request_id, method, path, status, duration_ms, timestamp}`. Nhóm log: application/authentication/database/email/upload/security/performance.

Luồng đọc công khai: `Frontend → Public Controller → QueryService (locale + published + not deleted + filter) → Repository → PostgreSQL → Mapper → JSON`.
Luồng Admin ghi: `Admin FE → JWT+CSRF → Admin Controller → DTO → Service (nghiệp vụ + transaction + ghi DB + xóa cache + log) → Response`.

---

# PHẦN XIV — TRÌNH TỰ TRIỂN KHAI BACKEND
1. Nền tảng: cấu hình, DB connection, migration (**baseline v1.3, ADR-013** — `doc/verify/v1.3/schema_up.sql`), error handler, logging, request-id, auth, users, settings, media.
2. Catalogue: brands, categories, standards, applications, industries, products, product search.
3. Nội dung: pages, homepage, services, customers, projects, posts, documents, offices, navigation.
4. Tương tác: **inquiries + outbox worker + idempotency + email (SPF/DKIM)** + CAPTCHA + rate limit.
5. Hoàn thiện: redirect middleware, seo (sitemap/robots/hreflang), cache, health, testing, backup, monitoring.

---

# PHẦN XV — QUYẾT ĐỊNH CHỐT (API 1.2.1)
1. Modular monolith, REST, `/api/v1`, tách public/admin.
2. URL & API **phẳng** cho trang chi tiết (ADR-001); lọc theo hãng dùng `GET /products?brand={slug}` (bỏ `/brands/:slug/products`). **`GET /products/landing` riêng cho `/products`** (không dùng `/home`).
3. Locale publication ở backend (ADR-004); public chỉ trả translation published; **KHÔNG fallback Brand detail** (chỉ fallback dữ liệu độc lập ngôn ngữ).
4. Inquiry: transaction lưu DB + outbox trước, 202, worker **SKIP LOCKED + reaper**, idempotency; **semantics at-least-once + Message-ID ổn định từ `outbox.id`**; retention TBD (ADR-003).
5. Email: From domain công ty, Reply-To khách, sanitize header, SPF/DKIM/DMARC.
6. Filter slug key-lặp, **cùng dimension OR / khác dimension AND** (ADR-007); facet count P1.
7. PATCH replace-tập-quan-hệ, transaction (ADR-008).
8. Media RESTRICT + 409 + MediaUsageService; không SVG, không upload video (ADR-005/009/012).
9. Mega menu auto-generated; homepage thứ tự cố định (reorder P1).
10. **SEO canonical/robots tự sinh** (không lưu DB), sitemap/robots/hreflang; social image fallback (ADR-011); redirect middleware + SlugService 3-nguồn.
11. **Public API dùng slug** (`?parent={slug}`, `/documents/:slug/download`); admin API dùng UUID.
12. **Health `/live` (public) + `/ready` (nội bộ)**; structured audit log (không bảng).
13. **External video** whitelist youtube/vimeo qua content block (không upload video).
14. **Migration baseline duy nhất v1.3, 52 bảng (ADR-013); trigger ở migration cuối.**
15. Không endpoint cho P1/Future. Search pg_trgm, đổi engine không đổi API.

---

# PHẦN XVI — TEST CASE BẮT BUỘC (backend)

**Filter (ADR-007):**
```text
brand=pac&brand=herzog                     → PAC OR Herzog
brand=pac&standard=astm-d86                → PAC AND ASTM D86
brand=pac&brand=herzog&standard=astm-d86   → (PAC OR Herzog) AND ASTM D86
```
**Slug (ADR-002):** slug hiện tại trùng → reject; path trong `redirects.source_path` → reject (`SLUG_IN_REDIRECTS`); draft chưa publish hard-delete → path dùng lại được; slug từng publish (`first_published_at NOT NULL`) → không dùng lại; đổi slug đã publish → cập nhật + redirect trong 1 transaction.
**Inquiry status (ADR-003):** sau commit → `inquiries.email_status=email_pending`, `outbox.status=pending`; gửi OK → `email_sent`/`sent`; hết retry → `email_failed`/`failed`. DB **từ chối** `email_status='received'`; **chấp nhận** `outbox.status='processing'`.
**Outbox at-least-once (ADR-003):** hai worker cùng lấy job → chỉ một chuyển `processing` (SKIP LOCKED); SMTP đã nhận nhưng worker chết trước khi ghi `sent` → job có thể retry với **cùng Message-ID** (hệ thống là **at-least-once**, không exactly-once); lỗi còn retry → pending + next_attempt_at tăng; hết retry → failed; cùng Idempotency-Key → không tạo inquiry/outbox mới; `UNIQUE(inquiry_id,channel,recipient)` chặn job trùng.
**Scheduled/publish (ADR-002):** `published_at` = publish hiện tại; `first_published_at` = lần đầu (bất biến); `scheduled_publish_at` = P1, **chưa có** trong schema P0.
**Retention:** chưa có quyết định DN → `expires_at=NULL`, không purge tự động.
**Product landing:** `GET /products/landing` → dữ liệu catalogue landing; `GET /home` chỉ phục vụ trang chủ.
**Migration (ADR-013):** fresh install chạy `001→070`; **không** chạy `071`; trigger `updated_at` tạo tại migration `070`; rollback `070→001`.
**SEO (ADR-011):** brand detail → self-canonical; query filter → noindex,follow + canonical `/products/all`; category landing → self-canonical index; EN chưa publish → không tạo hreflang EN.
**Video (ADR-012):** YouTube/Vimeo hợp lệ → chấp nhận; domain lạ → reject; raw iframe/script → reject; upload MP4 → reject.
