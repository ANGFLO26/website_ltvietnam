# 01 — PHẠM VI CHỨC NĂNG VÀ MVP — WEBSITE LT VIETNAM

**Phiên bản:** 1.3
**Ngày:** 2026-07-29
**Nguồn sự thật cho:** phạm vi nghiệp vụ, phân loại P0/P1/Future.
**Áp dụng:** ADR-001..015 (xem `09_ADR_QUYET_DINH_KIEN_TRUC.md`).

---

## 1. Định hướng tổng thể

Website theo mô hình:

> Website doanh nghiệp B2B giới thiệu năng lực, sản phẩm, hãng đối tác và dịch vụ kỹ thuật; khách hàng xem thông tin và gửi yêu cầu để công ty liên hệ trực tiếp.

Website **không** phải sàn thương mại điện tử và **không** bán thiết bị trực tiếp trên website trong phiên bản đầu.

### Hai đối tượng sử dụng
- **Khách truy cập:** không cần đăng ký/đăng nhập; xem nội dung, tìm/lọc sản phẩm, tải tài liệu công khai, gửi yêu cầu.
- **Admin:** một loại tài khoản duy nhất, toàn quyền quản lý nội dung và cấu hình.

### Không có trong phiên bản đầu
Tài khoản khách hàng, đăng nhập khách, giỏ hàng, đặt hàng/thanh toán trực tuyến, theo dõi vận chuyển, quản lý hợp đồng, quản lý báo giá, **giao diện quản lý yêu cầu khách hàng trong Admin**, phân quyền nhiều nhóm nhân viên.

> **Lưu ý quan trọng (ADR-003):** Tuy Admin MVP **không** có màn hình quản lý yêu cầu, hệ thống **vẫn lưu mọi yêu cầu vào database** (`inquiries` + `inquiry_outbox`) trước khi gửi email. Đây là chức năng nền chống mất lead, không phải giao diện CRM.

---

# PHẦN A — PHÂN LOẠI PHẠM VI (ADR-006)

## 2. P0 — Bắt buộc để ra mắt

```text
Authentication Admin (1 tài khoản)
Media cơ bản (JPG, JPEG, PNG, WebP, PDF)
Pages (trang tĩnh + chính sách)
Brands và sub-brands
Product Categories (cây)
Standards
Industries
Applications (DB hỗ trợ parent; giao diện Admin PHẲNG)
Products (+ translations, specifications, quan hệ)
Services (cây)
Projects
Posts (+ post categories)
Documents
Customers (logo tiêu biểu)
Offices
Homepage — cấu trúc section CỐ ĐỊNH (bật/tắt + chọn nội dung nổi bật)
Navigation đơn giản
Product Search (PostgreSQL pg_trgm)
Product Filters (KHÔNG facet count)
Inquiry persistence + email retry (inquiries + inquiry_outbox)  ← P0
Redirect (301, quản lý URL cũ)
SEO nền tảng (canonical, hreflang, sitemap.xml theo ngôn ngữ, robots.txt, structured data)
Tiếng Anh mặc định; tiếng Việt cho pages/posts/services/projects (ADR-014)
```

## 3. P1 — Nên có ngay sau MVP

```text
Upload file đính kèm trong form khách hàng
Tìm kiếm toàn website (gộp product/service/project/post/document)
Facet count cho bộ lọc
Kéo thả thứ tự homepage section
Kéo thả cây menu
Dashboard cảnh báo thiếu nội dung (thiếu EN, thiếu catalogue…)
Bulk actions (publish/hide/archive hàng loạt)
Duplicate product
Scheduled publishing (dùng scheduled_publish_at riêng, không dùng published_at)
Auto-save nâng cao (auto-save vào bản nháp)
Quản lý video sản phẩm độc lập (bảng product_videos) — P0 chỉ có external_video block
Bảng audit_logs + Admin UI xem log — P0 chỉ có structured application log
```

## 4. Future — chỉ ghi nhận hướng mở rộng

```text
Quản lý yêu cầu khách hàng trong Admin (nâng cấp từ inquiries)
Phân quyền nhiều vai trò
CRM
Quản lý báo giá
Cổng khách hàng
Ticket kỹ thuật
Thiết bị theo serial + bảo hành + bảo trì
Kho tài liệu có kiểm soát (email_required/customer_only/staff_only)
So sánh & gợi ý sản phẩm
Phân tích dữ liệu & marketing
Kênh thông báo bổ sung (Zalo/Teams/Telegram/SMS/in-app)
Thương mại điện tử một phần
```

Việc chuẩn bị cấu trúc dữ liệu cho tương lai **không** đồng nghĩa triển khai ngay trong MVP.

---

# PHẦN B — CHỨC NĂNG P0 CHI TIẾT

# 5. Trang chủ

Cấu trúc **section cố định** (ADR-006): Admin **bật/tắt** section và **chọn nội dung nổi bật**, **chưa** kéo thả thứ tự (kéo thả → P1).

Các section: Banner chính · Giới thiệu ngắn · Lĩnh vực hoạt động · Nhóm sản phẩm chính · Sản phẩm nổi bật · Hãng và đối tác nổi bật · Dịch vụ kỹ thuật · Năng lực · Dự án/bàn giao mới · Tin tức mới · Khách hàng tiêu biểu · Kêu gọi liên hệ · Văn phòng.

Nội dung lấy từ dữ liệu quản trị, không viết cứng trong mã nguồn. Sản phẩm/hãng nổi bật do Admin đánh dấu `is_featured`.

# 6. Giới thiệu công ty

Các trang: Về LT Vietnam · Lịch sử · Tầm nhìn & sứ mệnh · Lĩnh vực hoạt động · Năng lực kỹ thuật · Năng lực gia công · Ngành công nghiệp phục vụ · Khách hàng tiêu biểu · Đối tác toàn cầu.

Mỗi trang là một `page` (bảng `pages`) quản lý được tiêu đề, nội dung, ảnh, tài liệu, trạng thái, SEO, VI/EN. Số liệu (nhân sự, kinh nghiệm) không viết cứng.

# 7. Hãng sản xuất và đối tác

Cấu trúc: `Hãng mẹ → Thương hiệu con → Sản phẩm`. Ví dụ PAC → Herzog/ISL/Alcor/Antek/Phase/AC Analytical Controls. Hãng không có thương hiệu con thì sản phẩm gắn trực tiếp vào hãng.

**URL & canonical (ADR-001/011, v1.2):**
- Hồ sơ hãng canonical: `/brands/{brand-slug}` (cả hãng mẹ và thương hiệu con) — index, self-canonical.
- Lọc sản phẩm theo hãng = **`/products/all?brand={brand-slug}`** — noindex,follow, canonical về `/products/all`. **Không** dùng `/products/brand/{brand-slug}` (nếu còn → 301).
- Quan hệ cha–con thể hiện qua `parent_id` và điều hướng nội trang, **không** qua URL lồng.

Thông tin hãng: tên, logo, VI/EN, quốc gia, mô tả, website chính thức, hãng mẹ (nếu có), thương hiệu con, ảnh, catalogue, danh sách sản phẩm, dịch vụ liên quan, trạng thái, thứ tự.

# 8. Danh mục sản phẩm

Danh mục nhiều cấp (cây), khuyến nghị tối đa 3–4 cấp. Admin tạo/sửa/sắp xếp/ẩn/hiện; không viết cứng.

URL danh sách theo danh mục: `/products/category/{category-slug}` (ADR-001).

# 9. Sản phẩm

## 9.1. Thông tin
Cơ bản: tên VI/EN, model, mã nội bộ, hãng (**bắt buộc**), thương hiệu con, danh mục, ảnh đại diện, thư viện ảnh, mô tả ngắn, trạng thái.
Kỹ thuật: tổng quan, ứng dụng, tính năng, nguyên lý/phương pháp đo, tiêu chuẩn, thông số kỹ thuật, loại mẫu, phạm vi đo, điều kiện vận hành, phụ kiện/tùy chọn.
Liên quan: catalogue/brochure/datasheet, **video ngoài qua content block `external_video`** (YouTube/Vimeo — ADR-012, **không** upload video trong P0), dịch vụ/sản phẩm/dự án liên quan, SEO.

## 9.2. Quy tắc dữ liệu (đồng bộ ADR & mục 03/05)
- **Hãng bắt buộc** (`products.brand_id NOT NULL`). Vật tư/hóa chất không hãng dùng brand chuẩn hóa `LT Vietnam` / `Generic` / `Other` — **không để sản phẩm mồ côi**.
- **Danh mục chính** dùng `product_category_links.is_primary` (**không** có `products.primary_category_id`). Đúng một danh mục chính khi publish, phải nằm trong tập danh mục đã gắn.
- **Ảnh đại diện** lưu ở `products.featured_image_id`; ảnh bổ sung ở `product_media` (role: gallery/diagram/application/interface/dimension — **không** có `featured`).
- **Trường thương mại tương lai** (`sku, price_visibility, sale_mode, warranty_months, requires_configuration`) tồn tại trong schema nhưng **ẩn** khỏi UI MVP, không bắt buộc nhập.

## 9.3. Tạo nhanh và lưu nháp (ADR liên quan mục 4.7)
Có thể tạo nháp chỉ với: **Tên VI + Slug (tự sinh) + Hãng + Danh mục chính**. Các trường mô tả có thể để trống khi nháp. PublishService kiểm tra đầy đủ khi xuất bản.

## 9.4. Sản phẩm ngừng kinh doanh (ADR-002)
Khi có `discontinued_at`: **giữ trang công khai**, hiển thị nhãn "Sản phẩm đã ngừng kinh doanh", có thể ẩn nút báo giá trực tiếp, hiển thị sản phẩm thay thế, **không xóa URL**. Chỉ redirect sang sản phẩm thay thế khi có lý do rõ ràng và doanh nghiệp chấp thuận.

# 10. Danh sách, tìm kiếm và lọc sản phẩm

- **Trang landing sản phẩm `/products`** (cửa vào catalogue) dùng endpoint riêng **`GET /api/v1/products/landing`** (v1.2.1) — **không** dùng `GET /home`.
- Danh sách phân trang. URL: `/products/all`, `/products/category/{slug}`, `/products/all?brand={slug}` (lọc theo hãng — v1.2).
- Tìm kiếm sản phẩm P0 (pg_trgm): tên, model, hãng, danh mục, tiêu chuẩn, mô tả ngắn.
- Bộ lọc P0: danh mục, hãng, tiêu chuẩn, ứng dụng, ngành. **Không** facet count trong P0 (→ P1).
- **Chọn một nút bao gồm toàn bộ nhánh con (ADR-015).** Chọn hãng mẹ `PAC` trả về cả sản phẩm của HERZOG/ISL/ALCOR; chọn danh mục cấp 1 trả về sản phẩm của mọi danh mục con. Thương hiệu con không còn là chiều lọc riêng — nó là một `brand` trong cây.
- **Ngữ nghĩa (ADR-007):** cùng một dimension = **OR**, giữa các dimension = **AND**. Bộ lọc dùng **slug**, query key lặp: `?brand=pac&brand=herzog&standard=astm-d86` = `(brand=PAC OR Herzog) AND standard=ASTM D86`.
- Trang lọc sản phẩm theo hãng dùng URL `/products/all?brand={slug}` (noindex,follow — ADR-001/011), **không** dùng `/products/brand/{slug}` làm landing indexable.

# 11. Trang chi tiết sản phẩm

URL: `/products/{product-slug}` (ADR-001). Nội dung: tên/model/hãng/ảnh/mô tả, tính năng, ứng dụng, tiêu chuẩn, thông số, catalogue, video, sản phẩm/dịch vụ/dự án liên quan, nút báo giá/tư vấn, form yêu cầu.

Nút "Yêu cầu báo giá" tự điền `product_id`, `inquiry_type=quotation`, `source_url`.

# 12. Dịch vụ kỹ thuật

Cây `Nhóm dịch vụ → Dịch vụ cụ thể`. URL chi tiết **phẳng**: `/services/{service-slug}` (ADR-001; **không** `/services/{nhóm}/{dịch-vụ}`).

Nội dung: tên, mô tả, vấn đề khách gặp, phạm vi, quy trình, thiết bị/hãng liên quan, hình ảnh, dự án đã làm, tài liệu, FAQ, form yêu cầu hỗ trợ. Form tự ghi `service_id`, `inquiry_type=technical_support`.

# 13. Dự án và bàn giao

URL chi tiết phẳng: `/projects/{project-slug}`. Nội dung: tên, loại, khách hàng (theo chế độ công khai), địa điểm, thời gian, thiết bị, hãng, phạm vi, triển khai, kết quả, hình ảnh, sản phẩm/dịch vụ liên quan.

Chế độ công khai khách hàng (`customer_visibility`): `public / hide_name / industry_only / confidential`. **Backend** quyết định ẩn/hiện, không để frontend tự quyết.

# 14. Tin tức và bài viết

URL danh mục: `/news/category/{post-category-slug}`. URL chi tiết **phẳng**: `/news/{post-slug}` (ADR-001; **không** `/news/{danh-mục}/{bài}`).

Loại bài: tin công ty, tin sản phẩm, tin từ hãng, hội thảo/sự kiện, kiến thức kỹ thuật, thông báo. Trạng thái: draft/published/hidden. `published_at` = thời điểm xuất bản/tái xuất bản **hiện tại**. **Scheduled publishing thuộc P1** và sẽ dùng trường `scheduled_publish_at` **riêng**; **không** dùng `published_at` để lưu lịch tương lai (P0 không có `scheduled_publish_at`).

# 15. Khách hàng tiêu biểu, Tài liệu, Media, Văn phòng
- **Khách hàng tiêu biểu:** dữ liệu công khai (không phải CRM). Chỉ hiển thị khi `is_public = true`.
- **Tài liệu:** catalogue/brochure/datasheet/… URL: `/resources/{document-slug}`. MVP `visibility ∈ {public, hidden}`; tải trực tiếp, không yêu cầu email.
- **Media (ADR-005):** quản lý tập trung; chỉ JPG/JPEG/PNG/WebP/PDF; **không SVG**; không xóa media đang dùng (409); FK RESTRICT.
- **Văn phòng:** mỗi văn phòng một bản ghi; địa chỉ, điện thoại, email, giờ làm việc, bản đồ, tọa độ, trạng thái.

# 16. Form liên hệ và gửi yêu cầu (ADR-003)

## 16.1. Loại yêu cầu
`quotation, product_consultation, technical_support, maintenance_repair, partnership, general_contact`.

## 16.2. Trường bắt buộc
Họ tên, công ty, điện thoại, email, loại yêu cầu, nội dung, đồng ý chính sách bảo mật.
Tự động/tùy chọn: sản phẩm/dịch vụ quan tâm, tỉnh/thành, URL nguồn. **File đính kèm → P1.**

## 16.3. Luồng xử lý P0 (ADR-003)
```text
Khách nhập → Frontend validate → Backend validate → CAPTCHA + Rate limit
 → Transaction { lưu inquiries; lưu inquiry_outbox }
 → Commit → Trả 202 "đã tiếp nhận"
 → Worker nền gửi email về công ty → Retry khi thất bại
```
**Không mất yêu cầu khi SMTP lỗi.** `inquiries.email_status ∈ {email_pending, email_sent, email_failed}` (commit tạo inquiry → `email_pending`); `inquiry_outbox.status ∈ {pending, processing, sent, failed}`. Outbox có semantics **at-least-once** (không exactly-once). Retention: `expires_at` nullable, không default, **TBD** (DN duyệt trước production; không tự purge).

## 16.4. Email
From = địa chỉ thuộc domain LT Vietnam; Reply-To = email khách; sanitize header (bỏ CR/LF); email nhận cấu hình trong `settings` (không viết cứng). Yêu cầu SPF/DKIM/DMARC.

# 17. Đa ngôn ngữ (ADR-014)

**Ngôn ngữ lưu trữ nội dung là tiếng Anh.** Nội dung nằm thẳng trên bảng entity, không có bảng translation — trừ bốn nhóm:

```text
pages · posts · services · projects
```

Bốn nhóm này có bảng translation, xuất bản độc lập từng ngôn ngữ, và có URL `/vi/...`.

**Nhãn giao diện do frontend dịch**, không nằm trong database. Người xem đổi ngôn ngữ hiển thị bằng công tắc trên giao diện.

**Tên thiết bị không dịch.** `products.name` và `products.model` là danh từ riêng kỹ thuật (`OptiDist Atmospheric Distillation`, `HVM 472`), dùng chung mọi ngôn ngữ.

**Không auto-fallback** giữa hai bản dịch của bốn nhóm trên: `/vi/news/{slug}` chỉ tồn tại khi bản tiếng Việt `published`; thiếu thì 404 hoặc về danh sách tiếng Việt, không trộn ngôn ngữ.

**hreflang** chỉ sinh cho bốn nhóm đó và chỉ khi cả hai bản `published`.

# 18. Menu, điều hướng và SEO

- **Menu (ADR liên quan mục 5.5):** `menu_items` quản lý menu cấp cao và liên kết chung. **Mega menu sản phẩm auto-generated** từ danh mục/hãng nổi bật + tiêu chuẩn/ứng dụng cấu hình — Admin **không** nhập tay toàn bộ.
- **SEO P0 (ADR-011):** Admin chỉ nhập `seo_title`, `seo_description`, `slug`. **Canonical và robots tự sinh** theo trạng thái + route (không lưu DB, không checkbox index/follow). Social image theo **fallback chain** (không có picker riêng). Hệ thống tự tạo `sitemap.xml`/`sitemap-{locale}.xml`, `robots.txt`, structured data, breadcrumb, hreflang VI↔EN (chỉ khi cả hai bản published).
- **Redirect:** danh sách URL cũ → mới (301); đổi slug tự tạo redirect (ADR-002); tránh chain/loop.

# 19. Trang quản trị Admin (MVP)

Một tài khoản `admin`. Quản lý: trang chủ, trang giới thiệu, năng lực, hãng, thương hiệu con, danh mục, sản phẩm, tiêu chuẩn, ứng dụng, ngành, dịch vụ, dự án, bài viết, khách hàng tiêu biểu, văn phòng, tài liệu, media, menu, footer, email nhận yêu cầu, nội dung đa ngôn ngữ, SEO, redirect.

Lưu `created_by`/`updated_by` để sẵn sàng multi-user.

**Không có trong Admin MVP:** danh sách/giao diện quản lý yêu cầu khách hàng, trạng thái xử lý, phân công, ghi chú CRM, báo giá, hợp đồng, bảo hành, dashboard kinh doanh. (Yêu cầu vẫn được **lưu** trong `inquiries` nhưng không có UI quản lý — ADR-003.)

# 20. Bảo mật, hiệu năng, vận hành (P0)

- **Admin:** Argon2id, JWT trong HttpOnly+Secure cookie, CSRF, CORS origin cụ thể, rate-limit login, khóa đăng nhập sai, session hết hạn, reset token có hạn, không trả secret về frontend.
- **Nội dung:** sanitize HTML, whitelist tag/block, whitelist domain video embed, cấm iframe/script tùy ý.
- **Upload (ADR-009):** magic bytes/MIME thực, whitelist, giới hạn dung lượng, đổi tên an toàn, chống path traversal, không SVG, không executable.
- **Form:** rate limit, CAPTCHA, idempotency, sanitize email header, lưu trước khi gửi email, privacy consent timestamp, không log toàn bộ PII.
- **Audit log P0 (ADR-006):** ghi **structured application log** (KHÔNG bảng `audit_logs`) cho login success/failure, đổi/reset mật khẩu, create/update/publish/hide/archive/delete/restore, đổi settings/redirect, media delete attempt. Field: request_id, actor_user_id, action, entity_type, entity_id, result, timestamp, ip. Không log secret/PII đầy đủ. Không Admin UI (bảng audit_logs = P1/Future).
- **Hiệu năng:** tối ưu ảnh (WebP/AVIF), lazy load, phân trang, cache nội dung công khai, index PostgreSQL.
- **Vận hành:** backup DB + media + kiểm thử restore; log lỗi; health check (`/health/live` public, `/health/ready` nội bộ); monitor SMTP/outbox/storage.

---

# PHẦN C — LƯỢC ĐỒ PHÁT TRIỂN

```text
Giai đoạn đầu (MVP P0):
Website nội dung + Catalogue + Lưu yêu cầu & gửi email (chống mất lead)

  ↓ P1
Attachment form + Tìm kiếm toàn site + Facet + tiện ích Admin

  ↓ Future
Quản lý yêu cầu (UI) + Phân quyền + CRM

  ↓ Future
Báo giá + Ticket + Bảo hành + Cổng khách hàng

  ↓ Nếu có nhu cầu
Thương mại điện tử một phần
```

Nguyên tắc kiến trúc để không phải xây lại: module độc lập; không viết cứng dữ liệu; `InquiryService` tách adapter (email/DB/CRM/kênh khác); media tách nơi lưu trữ; mọi thay đổi DB bằng migration; frontend qua API, không truy cập DB trực tiếp. (Chi tiết ở 06.)
