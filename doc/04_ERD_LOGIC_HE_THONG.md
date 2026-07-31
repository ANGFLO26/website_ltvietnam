# 04 — ERD LOGIC HỆ THỐNG — WEBSITE LT VIETNAM

**Phiên bản:** 1.3
**Ngày:** 2026-07-29
**Nguồn sự thật cho:** quan hệ logic giữa các thực thể.
**Áp dụng:** ADR-002, 003, 005, 010, 014, 015.
**Ghi chú:** cột và kiểu dữ liệu ở `05`; DDL ở `doc/verify/v1.3/schema_up.sql`.

---

# PHẦN I — TỔNG QUAN 52 BẢNG

```text
NỀN TẢNG
users ──< media ──< content_media_refs
settings   redirects

NỘI DUNG TĨNH
pages ──< page_translations                    (có bản dịch)
banners    homepage_sections    offices

HÃNG VÀ TAXONOMY  (cây: ancestor_ids + depth)
brands ──┐ (tự tham chiếu parent_id)
product_categories ──┐ (tự tham chiếu)
applications ──┐ (tự tham chiếu)
standards      industries

SẢN PHẨM
products ──< product_specifications
         ──< product_category_links >── product_categories
         ──< product_standards      >── standards
         ──< product_applications   >── applications
         ──< product_industries     >── industries
         ──< product_media          >── media
         ──< related_products       >── products
         >── brands  (brand_id NOT NULL)

DỊCH VỤ  (cây, có bản dịch)
services ──< service_translations
         ──< service_products / service_brands / service_industries

KHÁCH HÀNG & DỰ ÁN  (dự án có bản dịch)
customers ──< projects ──< project_translations
                       ──< project_products / project_services / project_brands / project_media

BÀI VIẾT  (cây danh mục, bài có bản dịch)
post_categories ──< posts ──< post_translations
                          ──< post_products / post_services / post_projects / post_brands / post_media

TÀI LIỆU
documents >── media (file_id)
          ──< document_products / document_brands / document_services / document_posts

MENU
menus ──< menu_items (tự tham chiếu parent_id)

YÊU CẦU KHÁCH HÀNG
inquiries ──< inquiry_outbox
          >── products / services  (nullable, SET NULL)
```

---

# PHẦN II — QUY TẮC QUAN HỆ

## 1. Bốn entity có bản dịch (ADR-014)
`pages`, `posts`, `services`, `projects` — quan hệ 1–n tới bảng translation, `UNIQUE(entity_id, locale)`.
Mọi entity còn lại lưu nội dung trực tiếp, không có bảng translation.

## 2. Năm cây phân cấp (ADR-015)
`brands`, `product_categories`, `applications`, `services`, `post_categories`.
Mỗi cây có `parent_id` (SET NULL), `ancestor_ids UUID[]`, `depth`, index GIN, CHECK chống vòng lặp.
`menu_items` cũng tự tham chiếu nhưng dùng CASCADE và không cần `ancestor_ids` (cây nông, luôn tải toàn bộ).

## 3. Chính sách xóa

| Quan hệ | Chính sách | Lý do |
|---|---|---|
| Mọi FK tới `media` | **RESTRICT** | Không mất ảnh âm thầm (ADR-005) |
| `products.brand_id` | **RESTRICT** | Không để sản phẩm mồ côi (ADR-010) |
| `posts.category_id` | **RESTRICT** | Không mất bài khi xóa danh mục |
| `documents.file_id` | **RESTRICT** | Tài liệu luôn phải có file |
| Entity → translation | **CASCADE** | Bản dịch không tồn tại độc lập |
| Entity → bảng link | **CASCADE** | Quan hệ không tồn tại độc lập |
| `parent_id` của cây | **SET NULL** | Xóa cha đẩy con lên gốc, không mất con |
| `inquiries.product_id/service_id` | **SET NULL** | Giữ yêu cầu kể cả khi sản phẩm bị xóa |
| `*.created_by/updated_by` | **SET NULL** | Giữ nội dung khi xóa tài khoản |

## 4. Ràng buộc nghiệp vụ ở tầng DB

| Ràng buộc | Bảng |
|---|---|
| Đúng một danh mục chính mỗi sản phẩm | `uq_product_primary_category` (partial unique) |
| Đúng một ứng dụng chính mỗi sản phẩm | `uq_product_primary_application` |
| Không tự làm cha của chính mình | CHECK `parent_id <> id` (5 cây + menu_items) |
| Không tự làm tổ tiên của chính mình | CHECK `NOT (id = ANY(ancestor_ids))` |
| Sản phẩm không liên quan chính nó | CHECK `product_id <> related_product_id` |
| Yêu cầu phải có ít nhất một cách liên lạc | CHECK `phone IS NOT NULL OR email IS NOT NULL` |
| Không tạo job outbox trùng | `UNIQUE(inquiry_id, channel, recipient)` |
| Idempotency toàn cục | `UNIQUE(idempotency_key)` |
| Slug không trùng | `UNIQUE(slug)` hoặc `UNIQUE(locale, slug)` |
| Tiêu chuẩn không trùng | `UNIQUE(UPPER(organization), UPPER(code)) WHERE deleted_at IS NULL` |

## 5. Ràng buộc chỉ ở tầng service
Không ép ở DB vì cần cho phép lưu nháp thiếu nội dung:
- Đủ trường khi publish (xem `05` PHẦN IV)
- Danh mục chính phải nằm trong tập danh mục đã gắn
- Không tạo vòng lặp khi đổi cha (DB chỉ chặn tự tham chiếu trực tiếp)
- `ancestor_ids`/`depth` tính lại đúng cho toàn nhánh khi đổi cha
- `content_media_refs` đồng bộ khi ghi content block

---

# PHẦN III — LUỒNG DỮ LIỆU CHÍNH

## Đọc công khai — chi tiết sản phẩm
```text
GET /products/{slug}
 → products WHERE slug=? AND status='published' AND deleted_at IS NULL
 → JOIN brands, product_category_links, product_specifications,
        product_standards, product_applications, product_industries,
        product_media, related_products, document_products
 → tất cả đã lọc published + chưa xóa
 → batch load, không N+1
```

## Đọc công khai — lọc sản phẩm (ADR-007 + ADR-015)
```text
GET /products?brand=pac&brand=baker-hughes&standard=astm-d86
 → Bước 1: mở rộng mỗi giá trị thành nhánh con
        brand_set = {PAC} ∪ {nút có ancestor_ids @> [PAC]} ∪ {Baker Hughes} ∪ {...}
 → Bước 2: cùng chiều OR, khác chiều AND
        brand_id ∈ brand_set  AND  EXISTS(product_standards → ASTM D86)
 → parameter binding, không ghép chuỗi SQL
```

## Ghi — tạo yêu cầu báo giá
```text
POST /inquiries  (Idempotency-Key)
 → tra idempotency key trước CAPTCHA/rate limit
 → nếu chưa có: CAPTCHA + rate limit
 → BEGIN: INSERT inquiries + INSERT inquiry_outbox → COMMIT
 → 202 Accepted
 → worker: claim (SKIP LOCKED) → gửi email → sent/retry/failed
```

## Ghi — đổi cha trong cây
```text
PATCH /admin/product-categories/{id}  { parent_id }
 → BEGIN
     kiểm không tạo vòng lặp
     UPDATE nút: parent_id, ancestor_ids, depth
     UPDATE toàn bộ nhánh con: ancestor_ids, depth
   COMMIT
```
