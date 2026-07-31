# 05 — DATABASE SCHEMA POSTGRESQL — WEBSITE LT VIETNAM

**Phiên bản:** 1.3
**HQTCSDL:** PostgreSQL 16+
**Ngày:** 2026-07-29
**Nguồn sự thật kỹ thuật** cho kiểu dữ liệu, khóa ngoại, index, constraint, thứ tự migration.
**Áp dụng:** ADR-002/003/005/009/010/011/012/013/014/015.

> **DDL đầy đủ và có thẩm quyền nằm ở `doc/verify/v1.3/schema_up.sql`.**
> Tài liệu này giải thích quyết định và liệt kê bảng. Khi hai bên khác nhau, **file SQL thắng** — nó là thứ đã thực sự chạy trên PostgreSQL 16.2 và được kiểm chứng.

> **Nhật ký v1.3:** bỏ 12 bảng translation (ADR-014) · thêm `ancestor_ids`/`depth` cho 5 bảng cây (ADR-015) · thêm index trigram cho danh mục/tiêu chuẩn/ứng dụng · thêm `is_featured` cho standards/applications/industries · thêm `updated_at` cho 4 bảng translation còn lại · `inquiries` cho phép chỉ điện thoại **hoặc** chỉ email · thêm `media.variants`/`storage_class` · thêm bảng `content_media_refs` · `post_categories` thêm `deleted_at`. **63 bảng → 52.**

---

# PHẦN I — QUYẾT ĐỊNH KỸ THUẬT

- Extensions: `pgcrypto`, `citext` (email), `pg_trgm` (tìm gần đúng).
- Schema riêng `ltv`. Khóa chính `UUID DEFAULT gen_random_uuid()`.
- Thời gian `TIMESTAMPTZ`. Trạng thái dùng `VARCHAR + CHECK` (không dùng native enum).
- Xóa mềm `deleted_at TIMESTAMPTZ NULL` cho mọi nội dung quan trọng.
- **Ngôn ngữ (ADR-014):** nội dung lưu tiếng Anh trên bảng entity. Chỉ `pages`, `posts`, `services`, `projects` có bảng translation.
- **Slug (ADR-002):** entity một ngôn ngữ dùng `UNIQUE(slug)`; entity có bản dịch dùng `UNIQUE(locale, slug)` trên bảng translation. Slug đã publish không tái dùng.
- **Cây (ADR-015):** 5 bảng cây có `ancestor_ids UUID[]` + `depth` + index GIN + CHECK chống vòng lặp.
- **Media FK (ADR-005):** tất cả `ON DELETE RESTRICT`.
- **Draft:** chỉ `name`/`slug` NOT NULL; trường mô tả nullable.

---

# PHẦN II — DANH SÁCH 52 BẢNG

## Nền tảng (5)
```text
users · media · settings · redirects · content_media_refs
```

## Nội dung tĩnh và trang chủ (4)
```text
pages · page_translations · banners · homepage_sections
```

## Văn phòng (1)
```text
offices
```

## Hãng và taxonomy (5)
```text
brands · product_categories · standards · applications · industries
```

## Sản phẩm (8)
```text
products · product_specifications
product_category_links · product_standards · product_applications
product_industries · product_media · related_products
```

## Dịch vụ (5)
```text
services · service_translations · service_products · service_brands · service_industries
```

## Khách hàng và dự án (6)
```text
customers · projects · project_translations
project_products · project_services · project_brands · project_media
```

## Bài viết (8)
```text
post_categories · posts · post_translations
post_products · post_services · post_projects · post_brands · post_media
```

## Tài liệu (5)
```text
documents · document_products · document_brands · document_services · document_posts
```

## Menu (2)
```text
menus · menu_items
```

## Yêu cầu khách hàng (2)
```text
inquiries · inquiry_outbox
```

> Bốn bảng translation duy nhất: `page_translations`, `post_translations`, `service_translations`, `project_translations`.

---

# PHẦN III — CÁC QUYẾT ĐỊNH TRỌNG YẾU THEO BẢNG

## 1. Năm bảng cây — `ancestor_ids` (ADR-015)

Áp dụng cho `brands`, `product_categories`, `applications`, `services`, `post_categories`:

```sql
parent_id    UUID REFERENCES <self>(id) ON DELETE SET NULL,
ancestor_ids UUID[] NOT NULL DEFAULT '{}',   -- gốc → cha trực tiếp, đúng thứ tự
depth        INTEGER NOT NULL DEFAULT 0 CHECK (depth >= 0),
CHECK (parent_id IS NULL OR parent_id <> id),
CHECK (NOT (id = ANY(ancestor_ids)))
CREATE INDEX ... USING GIN (ancestor_ids);
```

**Truy vấn nhánh con:**
```sql
WHERE id = :node OR ancestor_ids @> ARRAY[:node]::uuid[]
```

**Breadcrumb một truy vấn:**
```sql
SELECT * FROM ltv.product_categories
WHERE id = ANY((SELECT ancestor_ids FROM ltv.product_categories WHERE slug=:slug)
               || (SELECT id FROM ltv.product_categories WHERE slug=:slug))
ORDER BY depth;
```

**Bắt buộc:** đổi `parent_id` phải tính lại `ancestor_ids` + `depth` cho nút đó **và toàn bộ nhánh con** trong cùng transaction.

## 2. `products` — nội dung gộp vào bảng entity

Bỏ `product_translations`. Trường nội dung nằm thẳng trên `products`:
`name, slug, short_description, overview, features, applications_text, principle, sample_types, operating_conditions, accessories_options, seo_title, seo_description`.

Giữ nguyên: `brand_id NOT NULL` (ADR-010), không có `primary_category_id`, `featured_image_id`, các cột thương mại tương lai ẩn khỏi UI.

Index tìm kiếm: `name`, `short_description`, `model` (trigram).

## 3. Taxonomy — index tìm kiếm bổ sung (sửa lỗi v1.2.1)

`doc/01` §10 hứa tìm kiếm phủ **danh mục** và **tiêu chuẩn**, nhưng v1.2.1 không có index cho hai trường đó. v1.3 thêm:

```sql
CREATE INDEX idx_pcat_name_trgm      ON ltv.product_categories USING GIN (name gin_trgm_ops);
CREATE INDEX idx_standards_code_trgm ON ltv.standards          USING GIN (code gin_trgm_ops);
CREATE INDEX idx_standards_name_trgm ON ltv.standards          USING GIN (name gin_trgm_ops);
CREATE INDEX idx_app_name_trgm       ON ltv.applications       USING GIN (name gin_trgm_ops);
```

## 4. `is_featured` bổ sung (sửa lỗi v1.2.1)

`GET /products/landing` trả `popular_standards` và `popular_applications`; mega menu cần "tiêu chuẩn/ứng dụng phổ biến được cấu hình". v1.2.1 không có cột nào để đánh dấu. v1.3 thêm `is_featured BOOLEAN NOT NULL DEFAULT FALSE` cho `standards`, `applications`, `industries` — thống nhất với `brands`, `product_categories`, `products`.

**Nguồn duy nhất cho "nội dung nổi bật" là `is_featured`.** `homepage_sections.settings` chỉ chứa cấu hình hiển thị (số lượng, cách sắp xếp), **không** chứa danh sách id.

## 5. `media` — phiên bản ảnh và lớp lưu trữ

```sql
storage_class VARCHAR(20) NOT NULL DEFAULT 'public'
    CHECK (storage_class IN ('public','protected','temp','quarantine')),
variants JSONB NOT NULL DEFAULT '{}'::jsonb,   -- {"thumb":"...","medium":"...","webp_large":"..."}
purged_at TIMESTAMPTZ,
alt_text VARCHAR(500),   -- gộp alt_text_vi/en
caption  TEXT            -- gộp caption_vi/en
```

`storage_class` làm rõ ranh giới `public-media/` ↔ `protected-documents/`. `variants` cho phép ghi lại và kiểm tra toàn vẹn từng phiên bản; thiếu nó thì một phiên bản tạo lỗi sẽ không có nơi nào ghi nhận.

## 6. `content_media_refs` — bảng mới (sửa lỗi v1.2.1)

`MediaUsageService` của v1.2.1 chỉ quét 22 cột FK, **không quét JSONB**. Ảnh chỉ dùng trong content block sẽ vượt qua kiểm tra, bị xóa mềm, rồi bị purge vĩnh viễn sau 30 ngày.

```sql
CREATE TABLE ltv.content_media_refs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_id UUID NOT NULL REFERENCES ltv.media(id) ON DELETE RESTRICT,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    locale VARCHAR(5),
    field_name VARCHAR(80) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (media_id, entity_type, entity_id, field_name, locale)
);
```

**Quy tắc bắt buộc:** mọi thao tác ghi trường JSONB có chứa tham chiếu media phải đồng bộ bảng này **trong cùng transaction**. `MediaUsageService` khi đó chỉ cần một truy vấn FK bình thường, không phải quét JSONB toàn bảng.

## 7. `inquiries` — liên lạc linh hoạt (sửa lỗi v1.2.1)

```sql
company_name VARCHAR(255),          -- nullable
phone        VARCHAR(50),           -- nullable
email        CITEXT,                -- nullable
CHECK (phone IS NOT NULL OR email IS NOT NULL)
```

Khách để lại **điện thoại hoặc email** là đủ. v1.2.1 bắt buộc cả hai, chặn khách chỉ muốn để số điện thoại.

Bổ sung: `handled_at`, `handled_by` (đánh dấu đã liên hệ), `request_fingerprint` + `request_fingerprint_version` (hợp đồng idempotency D19).

## 8. `first_published_at` đặt cạnh `status` (sửa lỗi v1.2.1)

v1.2.1 đặt cột này trên 5 bảng translation taxonomy vốn không có `status` → không có sự kiện publish nào set được nó → hard-delete luôn được phép → slug đã công khai bị cấp lại.

v1.3 đặt `first_published_at` **trên bảng entity** (có `status`) cho entity một ngôn ngữ, và trên bảng translation cho bốn entity có bản dịch. PublishService luôn set được.

## 9. Bỏ cặp cột `*_vi` / `*_en`

`product_specifications`, `product_standards`, `project_products`, `project_media`, `media` trước đây dùng cặp cột theo ngôn ngữ. v1.3 gộp còn một cột (`label`, `value`, `note`, `caption`, `alt_text`), khớp ADR-014.

---

# PHẦN IV — QUY TẮC XUẤT BẢN (PublishService, không ép ở DB)

Nháp chỉ cần `name`/`slug`. Publish kiểm ở service, trong transaction:

| Entity | Điều kiện publish |
|---|---|
| **Sản phẩm** | name, slug, short_description, overview, brand, ≥1 category, đúng 1 `is_primary`, featured_image; brand/category chưa xóa |
| **Hãng** | name, slug, logo, short_description, brand_type |
| **Dịch vụ** | translation `published`: name, slug, short_description, scope_of_work; featured_image; không vòng lặp cha–con |
| **Dự án** | translation `published`: title, short_description, scope_of_work; project_type, customer_visibility, ≥1 ảnh |
| **Bài viết** | translation `published`: title, slug, excerpt, content; category, featured_image |
| **Trang** | translation `published`: title, slug, content không rỗng; `page_type` hợp lệ. Trang hệ thống bắt buộc có bản `en` published |
| **Tài liệu** | title, slug, `file_id` trỏ media tồn tại và chưa xóa, `document_type`. Chỉ tải công khai được khi `status='published'` **và** `visibility='public'` |

> **Bổ sung v1.3:** hai dòng cuối (Trang, Tài liệu) trước đây bị `05` trỏ sang `03` PHẦN XVII nhưng `03` không có — tham chiếu gãy đã được sửa.

Mỗi lần publish lần đầu → set `first_published_at` một lần, không ghi đè.

---

# PHẦN V — KIỂM CHỨNG ĐÃ THỰC HIỆN

Baseline v1.3 đã chạy thật trên **PostgreSQL 16.2**:

| Hạng mục | Kết quả |
|---|---|
| Bảng | **52** |
| Foreign key | **95** |
| Trigger `updated_at` | **28** |
| Index | **129** |
| Lỗi khi chạy | **0** |
| Chu kỳ `up → down → up` | 52 → 0 → 52, PASS |
| Lọc theo hãng mẹ (cách cũ) | **0 sản phẩm** ← lỗi v1.2.1 |
| Lọc theo hãng mẹ (dùng `ancestor_ids`) | **3 sản phẩm** PASS |
| Lọc danh mục cấp 1, sản phẩm gắn cấp 2–3 | PASS |
| `(PAC OR Baker Hughes) AND ASTM D86` | PASS |
| Breadcrumb 3 cấp bằng một truy vấn | PASS |
| 8 kiểm chứng ràng buộc | 8/8 PASS |
| 10 index trigram (pglast + catalog) | 10/10 hợp lệ |

Chi tiết: `doc/verify/v1.3/README_V1_3.md`.

---

# PHẦN VI — ROLLBACK VÀ KIỂM THỬ TRƯỚC PRODUCTION

- Baseline v1.3 = `doc/verify/v1.3/schema_up.sql`; rollback = `schema_down.sql`.
- Mỗi migration có `down` xóa đúng đối tượng đã tạo; rollback theo thứ tự ngược.
- Trước production: chạy toàn bộ trên DB rỗng; kiểm rollback từng bước; seed dữ liệu mẫu; kiểm FK RESTRICT (xóa media đang dùng → lỗi), CASCADE, slug trùng bị chặn, cây cha–con không vòng lặp, transaction publish rollback khi thiếu, tìm kiếm trgm, backup/restore.
- **Bắt buộc thêm v1.3:** test đổi `parent_id` cập nhật đúng `ancestor_ids`/`depth` của toàn nhánh con; test đồng thời cho thao tác này; test `content_media_refs` đồng bộ khi ghi content block.

---

# PHẦN VII — QUYẾT ĐỊNH ĐÃ CHỐT (schema v1.3)

1. PostgreSQL 16+, khóa chính UUID, TIMESTAMPTZ, schema `ltv`.
2. **52 bảng.** Bốn bảng translation: pages, posts, services, projects (ADR-014).
3. Nội dung lưu tiếng Anh trên bảng entity; nhãn giao diện do frontend dịch.
4. Năm bảng cây có `ancestor_ids` + `depth` + GIN; lọc theo nút bao gồm nhánh con (ADR-015).
5. Danh mục chính chỉ ở `product_category_links.is_primary`; `products.brand_id NOT NULL`.
6. Mọi FK media `RESTRICT`; không SVG, không upload video.
7. `first_published_at` đặt cạnh `status`.
8. `is_featured` là nguồn duy nhất cho nội dung nổi bật.
9. `content_media_refs` bắt buộc đồng bộ khi ghi content block.
10. `inquiries` chấp nhận điện thoại **hoặc** email; có `handled_at`.
11. Canonical/robots tự sinh, không lưu DB (ADR-011).
12. Landing phân loại chỉ index khi có mô tả (ADR-011 §2b).
