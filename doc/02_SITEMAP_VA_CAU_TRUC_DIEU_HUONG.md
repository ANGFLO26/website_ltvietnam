# 02 — SITEMAP VÀ CẤU TRÚC ĐIỀU HƯỚNG — WEBSITE LT VIETNAM

**Phiên bản:** 1.3
**Ngày:** 2026-07-29
**Nguồn sự thật cho:** cấu trúc trang, URL công khai, điều hướng.
**Áp dụng:** ADR-001 (URL), ADR-002 (slug), ADR-006 (MVP), ADR-007 (filter), ADR-011 (canonical/robots), ADR-014 (ngôn ngữ), ADR-015 (cây).

> **Bản 1.3:** cấu trúc URL đổi sang **tiếng Anh ở gốc, tiếng Việt ở tiền tố `/vi`** (ADR-001). Tiền tố `/vi` chỉ tồn tại cho bốn nhóm có bản dịch: pages, posts, services, projects (ADR-014). Đoạn đường dẫn dùng tiếng Anh cho cả hai ngôn ngữ. Bổ sung quy tắc landing phân loại chỉ index khi có mô tả.

---

# PHẦN I — CẤU TRÚC TỔNG THỂ

```text
WEBSITE CÔNG KHAI
├── Trang chủ
├── Giới thiệu
├── Sản phẩm
├── Hãng và đối tác
├── Dịch vụ
├── Dự án và bàn giao
├── Tin tức và kiến thức
├── Tài liệu
├── Liên hệ
├── Tìm kiếm
└── Các trang hệ thống

TRANG QUẢN TRỊ (/admin)
├── Đăng nhập
├── Dashboard
├── Trang chủ
├── Trang nội dung (pages)
├── Sản phẩm · Danh mục · Hãng · Tiêu chuẩn · Ứng dụng · Ngành
├── Dịch vụ · Dự án · Bài viết · Khách hàng tiêu biểu
├── Tài liệu · Media
├── Văn phòng · Menu · Footer
├── SEO · Redirect
├── Cấu hình hệ thống
└── Tài khoản
```

---

# PHẦN II — QUY TẮC URL (ADR-001)

## 1. Nguyên tắc
- URL viết thường, không dấu, dùng gạch ngang.
- Không dùng ID trong URL công khai nếu không cần.
- **Trang chi tiết dùng URL phẳng** (một slug, không lồng cha–con).
- **Trang danh sách/phân loại** dùng URL theo nhóm.
- Không đổi URL tùy tiện sau khi xuất bản; nếu đổi phải redirect 301 (ADR-002).
- **Song ngữ (ADR-001):** tiếng Anh tại đường dẫn gốc, tiếng Việt tại tiền tố `/vi`.
- Tiền tố `/vi` **chỉ tồn tại** cho `pages`, `posts`, `services`, `projects` — bốn nhóm có bản dịch thật (ADR-014).
- **Đoạn đường dẫn viết bằng tiếng Anh cho cả hai ngôn ngữ**: `/vi/news/{slug}`, không phải `/vi/news/{slug}`. Từ khóa SEO nằm ở slug.

## 2. Bảng URL công khai chính thức

| Trang | URL | URL tiếng Việt | API |
|---|---|---|---|
| Trang chủ | `/` | — | `GET /home` |
| Giới thiệu (tổng) | `/about` | `/vi/about` | `GET /pages/:slug` |
| Trang giới thiệu con | `/about/{page-slug}` | `/vi/about/{page-slug}` | `GET /pages/:slug` |
| Sản phẩm (landing) | `/products` | — | `GET /products/landing` |
| Tất cả sản phẩm | `/products/all` | — | `GET /products` |
| Danh mục | `/products/category/{slug}` | — | `GET /product-categories/:slug/products` |
| Lọc theo hãng (noindex) | `/products/all?brand={slug}` | — | `GET /products?brand={slug}` |
| Theo tiêu chuẩn | `/products/standard/{slug}` | — | `GET /standards/:slug/products` |
| Theo ứng dụng | `/products/application/{slug}` | — | `GET /applications/:slug/products` |
| **Chi tiết sản phẩm** | `/products/{product-slug}` | — | `GET /products/:slug` |
| Hãng & Đối tác | `/brands` | — | `GET /brands` |
| **Chi tiết hãng (canonical)** | `/brands/{brand-slug}` | — | `GET /brands/:slug` |
| Dịch vụ (tổng) | `/services` | `/vi/services` | `GET /services/tree` |
| **Chi tiết dịch vụ** | `/services/{service-slug}` | `/vi/services/{slug}` | `GET /services/:slug` |
| Dự án | `/projects` | `/vi/projects` | `GET /projects` |
| **Chi tiết dự án** | `/projects/{project-slug}` | `/vi/projects/{slug}` | `GET /projects/:slug` |
| Tin tức | `/news` | `/vi/news` | `GET /posts` |
| Danh mục bài viết | `/news/category/{slug}` | `/vi/news/category/{slug}` | `GET /post-categories/:slug/posts` |
| **Chi tiết bài viết** | `/news/{post-slug}` | `/vi/news/{slug}` | `GET /posts/:slug` |
| Tài liệu | `/resources` | — | `GET /documents` |
| **Chi tiết tài liệu** | `/resources/{document-slug}` | — | `GET /documents/:slug` |
| Liên hệ | `/contact` | `/vi/contact` | `GET /offices` |
| Tìm kiếm | `/search?q=` | `/vi/search?q=` | `GET /search` |
| Yêu cầu thành công | `/request-success` | `/vi/request-success` | — |
| Chính sách bảo mật | `/privacy-policy` | `/vi/privacy-policy` | `GET /pages/:slug` |
| Điều khoản sử dụng | `/terms-of-use` | `/vi/terms-of-use` | `GET /pages/:slug` |
| Chính sách cookie | `/cookie-policy` | `/vi/cookie-policy` | `GET /pages/:slug` |

> Cột "URL tiếng Việt" để trống nghĩa là nhóm nội dung đó **chỉ có một ngôn ngữ** (ADR-014) và **không có** biến thể `/vi`.

### 2b. Tập route bảo lưu (sinh tự động — ADR-002 §8)
Danh sách bảo lưu của SlugService **phải được sinh từ bảng trên lúc build**, không viết tay. Gồm mọi đoạn cấp 1 và cấp 2, nhân với mọi tiền tố locale, cộng tiền tố kỹ thuật `/api`, `/admin`, `/media`, `/health`, `/_next`, `/static`. Bắt buộc có test đối chiếu; test fail khi bảng route và tập bảo lưu lệch nhau.

## 3. URL KHÔNG được dùng (đã loại bỏ)
```text
/services/{parent}/{child}          → dùng /services/{service-slug}
/news/{category}/{post}             → dùng /news/{post-slug}
/brands/{parent-brand}/{child}      → dùng /brands/{brand-slug}
/products/brand/{brand-slug}        → REDIRECT 301 sang /products/all?brand={brand-slug}
Toàn bộ tập route tiếng Việt của v1.2.1 (dạng /san-pham, /hang-doi-tac, /dich-vu,
/tin-tuc, /tai-lieu, /lien-he, /gioi-thieu, /tim-kiem) KHÔNG còn được dùng.
```

## 4. Phân biệt trang hãng (cập nhật v1.2 — ADR-001/011)
Hai trang **khác loại, không canonical sang nhau**, liên kết chéo qua nút điều hướng.

| | Hồ sơ hãng | Lọc sản phẩm theo hãng |
|---|---|---|
| URL | `/brands/{brand-slug}` | `/products/all?brand={brand-slug}` |
| Bản chất | Trang giới thiệu hãng/đối tác | Trạng thái lọc của trang danh sách SP |
| Nội dung | Giới thiệu, thương hiệu con, dịch vụ, dự án, tài liệu | Danh sách sản phẩm của hãng |
| Robots | **index,follow** | **noindex,follow** |
| Canonical | **self** | về `/products/all` |

- **Bỏ** `/products/brand/{brand-slug}` làm landing indexable; nếu còn tham chiếu → **301** sang `/products/all?brand={brand-slug}`.
- Không đặt canonical của trang lọc trỏ về hồ sơ hãng.

## 4b. Robots/canonical trang phân loại & lọc (ADR-011)
```text
/products/{slug}, /services/{slug}, /projects/{slug}, /news/{slug},
/brands/{slug}, /resources/{slug}       → index,follow · self-canonical
/products/danh-muc|tieu-chuan|ung-dung/{slug}, /news/category/{slug}
                                             → index,follow · self-canonical (nội dung biên tập riêng)
/products/all?brand=|standard=|...        → noindex,follow · canonical /products/all
/search?q=                                 → noindex,follow
Trang hệ thống/admin/error                   → noindex,nofollow
```

---

# PHẦN III — HEADER, MENU, FOOTER

## 5. Header desktop
```text
Logo | Trang chủ  Giới thiệu  Sản phẩm  Hãng & Đối tác  Dịch vụ  Dự án  Tin tức  Tài liệu  Liên hệ
      | [Tìm kiếm] [VI/EN] [YÊU CẦU BÁO GIÁ]
```

## 6. Menu chính (quản lý qua `menu_items`)
```text
Trang chủ
Giới thiệu → Về LT Vietnam · Lịch sử · Tầm nhìn & sứ mệnh · Lĩnh vực hoạt động ·
            Năng lực kỹ thuật · Năng lực gia công · Ngành công nghiệp · Khách hàng · Đối tác
Sản phẩm  → Tất cả sản phẩm · Danh mục · Tìm theo hãng · Tìm theo tiêu chuẩn · Tìm theo ứng dụng
Hãng & Đối tác → Tất cả hãng · Hãng sản xuất · Đối tác toàn cầu
Dịch vụ   → Thiết bị PTN · Bộ trao đổi nhiệt · Thiết bị quay · Van công nghiệp · Gia công cơ khí
Dự án     → Tất cả · Lắp đặt & chạy thử · Bàn giao & đào tạo · Bảo trì & sửa chữa · Case study
Tin tức   → Tin công ty · Tin sản phẩm · Hội thảo & sự kiện · Kiến thức kỹ thuật · Tin từ hãng
Tài liệu
Liên hệ
```

## 7. Mega menu sản phẩm — auto-generated (ADR liên quan 5.5)
Nội dung mega menu **lấy từ dữ liệu thật**, không nhập tay toàn bộ:
- Cột "Theo nhóm sản phẩm": danh mục có `is_featured = true`.
- Cột "Theo hãng": hãng có `is_featured = true`.
- Cột "Tìm nhanh": tiêu chuẩn/ứng dụng phổ biến được cấu hình.
- Có link "Xem tất cả sản phẩm" / "Xem tất cả hãng".

`menu_items` chỉ quản lý mục cấp cao và liên kết chung; không dùng để liệt kê từng sản phẩm/hãng trong mega menu.

## 8. Footer
Giới thiệu ngắn · Liên kết nhanh (Giới thiệu/Sản phẩm/Dịch vụ/Dự án/Tin tức/Liên hệ) · Nhóm sản phẩm chính · Thông tin liên hệ · Chính sách (bảo mật/cookie/điều khoản) · Mạng xã hội · Bản quyền. **Không** chèn liên kết SEO ngoài không liên quan.

---

# PHẦN IV — CẤU TRÚC TỪNG TRANG (rút gọn)

## 9. Trang chủ (section cố định — ADR-006)
Header · Banner · Giới thiệu ngắn · Lĩnh vực hoạt động · Nhóm sản phẩm chính · Sản phẩm nổi bật · Hãng & đối tác nổi bật · Dịch vụ kỹ thuật · Năng lực · Dự án/bàn giao mới · Tin tức mới · Khách hàng tiêu biểu · Kêu gọi liên hệ · Văn phòng · Footer.

## 10. Chi tiết sản phẩm `/products/{slug}`
Breadcrumb · Tên/model/hãng/ảnh/mô tả · Nút báo giá/tư vấn · Tổng quan · Tính năng · Ứng dụng · Tiêu chuẩn · Thông số · Loại mẫu · Phụ kiện · Catalogue/Video · Dịch vụ/Dự án/Sản phẩm liên quan · Form yêu cầu.
Sản phẩm ngừng KD: nhãn "đã ngừng kinh doanh" + sản phẩm thay thế (ADR-002).

## 11. Chi tiết hãng `/brands/{slug}`
Ảnh bìa/logo/tên · Giới thiệu · Quốc gia/website · Thương hiệu con · Nhóm sản phẩm · Sản phẩm của hãng · Dịch vụ liên quan · Tài liệu & tin từ hãng · Dự án · CTA.

## 12. Chi tiết dịch vụ `/services/{slug}`
Breadcrumb · Tên/mô tả/ảnh · Nút yêu cầu hỗ trợ · Vấn đề khách gặp · Phạm vi · Quy trình · Thiết bị/hãng · Dự án liên quan · FAQ · Form yêu cầu hỗ trợ.

## 13. Chi tiết dự án `/projects/{slug}`
Ảnh banner · Tên/loại · Thông tin (địa điểm/thời gian/khách hàng theo `customer_visibility`/hãng) · Phạm vi · Triển khai · Hình ảnh · Kết quả · Sản phẩm/dịch vụ liên quan · CTA.

## 14. Chi tiết bài viết `/news/{slug}`
Breadcrumb · Danh mục/tiêu đề/ngày · Ảnh · Nội dung · Album · Sản phẩm/dịch vụ/dự án/bài liên quan · Chia sẻ · CTA.

## 15. Danh sách & lọc sản phẩm
Filter sidebar (desktop) / drawer (mobile): danh mục, hãng, thương hiệu con, tiêu chuẩn, ứng dụng. Chip "đang lọc" + URL cập nhật theo filter (slug, key lặp — ADR-007; **cùng dimension OR, khác dimension AND**). URL lọc là trạng thái của `/products/all` (noindex,follow). Empty state kèm nút "Gửi yêu cầu tư vấn".

## 16. Liên hệ `/contact`
Form liên hệ (P0, chưa có attachment) · Thông tin công ty · Danh sách văn phòng · Bản đồ.

## 17. Tìm kiếm `/search`
P0: tìm sản phẩm. P1: gộp product/service/project/post/document theo nhóm kết quả. Empty state kèm gợi ý + nút tư vấn.

---

# PHẦN V — TRANG HỆ THỐNG
`/request-success` (xác nhận đã nhận, không lộ dữ liệu nhạy cảm) · Trang 404 (tìm kiếm + về trang chủ + nhóm sản phẩm) · Trang lỗi (thân thiện, không stack trace) · Chính sách bảo mật/điều khoản/cookie (là `pages`).

---

# PHẦN VI — SITEMAP RÚT GỌN

```text
LT VIETNAM
├── Trang chủ
├── Giới thiệu → Về · Lịch sử · Tầm nhìn&sứ mệnh · Lĩnh vực · Năng lực KT · Năng lực gia công · Ngành · Khách hàng · Đối tác
├── Sản phẩm → Tất cả · Danh mục(list) · Theo hãng(list) · Theo tiêu chuẩn(list) · Theo ứng dụng(list) · Chi tiết(/products/{slug})
├── Hãng & Đối tác → Danh sách · Chi tiết(/brands/{slug})   [thương hiệu con = brand slug riêng]
├── Dịch vụ → Tổng · Chi tiết(/services/{slug})
├── Dự án → Danh sách · Chi tiết(/projects/{slug})
├── Tin tức → Tổng · Danh mục(list) · Chi tiết(/news/{slug})
├── Tài liệu → Danh sách · Chi tiết(/resources/{slug})
├── Liên hệ
├── Tìm kiếm
└── Trang hệ thống → Yêu cầu thành công · Bảo mật · Điều khoản · Cookie · 404 · Lỗi
```

---

# PHẦN VII — PHÂN LOẠI THEO GIAI ĐOẠN

**P0 (trang bắt buộc):** Trang chủ, Sản phẩm (landing/list/detail), Danh mục(list), Lọc theo hãng/tiêu chuẩn/ứng dụng, Hãng (list/detail), Dịch vụ (tổng/detail), Dự án (list/detail), Tin tức (tổng/detail), Tài liệu, Liên hệ + Form yêu cầu, Tìm kiếm sản phẩm, Chính sách bảo mật, 404.

**P1:** Tìm kiếm toàn site, timeline lịch sử, trang tiêu chuẩn/ứng dụng/ngành chi tiết, FAQ, landing page chiến dịch, attachment form.

**Future (không xuất hiện trong menu MVP):** đăng nhập/cổng khách hàng, giỏ hàng, thanh toán, theo dõi báo giá/ticket, thiết bị đã mua, kho tài liệu riêng.

---

# PHẦN VIII — ĐỒNG BỘ SEO (tham chiếu 06 + 09/ADR-011 + 08)
Mỗi trang: một `h1`, breadcrumb, **canonical & robots tự sinh** (không lưu DB, không checkbox Admin — ADR-011), hreflang VI↔EN chỉ khi cả hai bản published (ADR-004), meta title/description, Open Graph (social image theo fallback chain), structured data phù hợp (Organization/LocalBusiness/Product không giá/Article/BreadcrumbList/FAQPage). Sitemap.xml theo ngôn ngữ (chỉ URL published) + robots.txt do backend sinh. Trang tiếng Anh chưa publish trả trạng thái đúng, không trộn ngôn ngữ (ADR-004). Quy tắc index/noindex theo bảng ở mục 4b.
