# 02 — SITEMAP VÀ CẤU TRÚC ĐIỀU HƯỚNG — WEBSITE LT VIETNAM

**Phiên bản:** 1.2.1
**Ngày:** 2026-07-21
**Nguồn sự thật cho:** cấu trúc trang, URL công khai, điều hướng.
**Áp dụng:** ADR-001 (URL phẳng + canonical hãng), ADR-002 (slug), ADR-006 (MVP), ADR-007 (filter), ADR-011 (canonical/robots).

> Bản 1.2: lọc sản phẩm theo hãng chuyển sang `/san-pham/tat-ca?brand={slug}` (noindex,follow); bỏ `/san-pham/hang/{slug}` khỏi landing chính thức (301); thêm cột robots/canonical.
> Bản 1.2.1: trang landing `/san-pham` dùng endpoint riêng `GET /products/landing` (không dùng `GET /home`).

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
- Song ngữ: tiếng Việt tại đường dẫn gốc, tiếng Anh tại tiền tố `/en`.

## 2. Bảng URL công khai chính thức

| Trang | URL Tiếng Việt | URL Tiếng Anh | API |
|---|---|---|---|
| Trang chủ | `/` | `/en` | `GET /home` |
| Giới thiệu (tổng) | `/gioi-thieu` | `/en/about` | `GET /pages/:slug` |
| Trang giới thiệu con | `/gioi-thieu/{page-slug}` | `/en/about/{page-slug}` | `GET /pages/:slug` |
| Sản phẩm (landing) | `/san-pham` | `/en/products` | `GET /products/landing` (v1.2.1 — KHÔNG dùng `GET /home`) |
| Tất cả sản phẩm | `/san-pham/tat-ca` | `/en/products/all` | `GET /products` |
| Danh mục (danh sách) | `/san-pham/danh-muc/{category-slug}` | `/en/products/category/{category-slug}` | `GET /product-categories/:slug/products` |
| Lọc theo hãng (noindex) | `/san-pham/tat-ca?brand={brand-slug}` | `/en/products/all?brand={brand-slug}` | `GET /products?brand={brand-slug}` |
| Lọc theo tiêu chuẩn | `/san-pham/tieu-chuan/{standard-slug}` | `/en/products/standard/{standard-slug}` | `GET /standards/:slug/products` |
| Lọc theo ứng dụng | `/san-pham/ung-dung/{application-slug}` | `/en/products/application/{application-slug}` | `GET /applications/:slug/products` |
| **Chi tiết sản phẩm** | `/san-pham/{product-slug}` | `/en/products/{product-slug}` | `GET /products/:slug` |
| Hãng & Đối tác (danh sách) | `/hang-doi-tac` | `/en/brands-partners` | `GET /brands` |
| **Chi tiết hãng (canonical)** | `/hang-doi-tac/{brand-slug}` | `/en/brands-partners/{brand-slug}` | `GET /brands/:slug` |
| Dịch vụ (tổng) | `/dich-vu` | `/en/services` | `GET /services/tree` |
| **Chi tiết dịch vụ** | `/dich-vu/{service-slug}` | `/en/services/{service-slug}` | `GET /services/:slug` |
| Dự án (danh sách) | `/du-an` | `/en/projects` | `GET /projects` |
| **Chi tiết dự án** | `/du-an/{project-slug}` | `/en/projects/{project-slug}` | `GET /projects/:slug` |
| Tin tức (tổng) | `/tin-tuc` | `/en/news` | `GET /posts` |
| Danh mục bài viết | `/tin-tuc/danh-muc/{post-category-slug}` | `/en/news/category/{post-category-slug}` | `GET /post-categories/:slug/posts` |
| **Chi tiết bài viết** | `/tin-tuc/{post-slug}` | `/en/news/{post-slug}` | `GET /posts/:slug` |
| Tài liệu (danh sách) | `/tai-lieu` | `/en/resources` | `GET /documents` |
| **Chi tiết tài liệu** | `/tai-lieu/{document-slug}` | `/en/resources/{document-slug}` | `GET /documents/:slug` |
| Liên hệ | `/lien-he` | `/en/contact` | `GET /offices` |
| Tìm kiếm | `/tim-kiem?q=` | `/en/search?q=` | `GET /search` (P1 toàn site) |
| Yêu cầu thành công | `/yeu-cau-thanh-cong` | `/en/request-success` | — |
| Chính sách bảo mật | `/chinh-sach-bao-mat` | `/en/privacy-policy` | `GET /pages/:slug` |
| Điều khoản sử dụng | `/dieu-khoan-su-dung` | `/en/terms-of-use` | `GET /pages/:slug` |
| Chính sách cookie | `/chinh-sach-cookie` | `/en/cookie-policy` | `GET /pages/:slug` |

## 3. URL KHÔNG được dùng (đã loại bỏ)
```text
/dich-vu/{parent}/{child}                  → dùng /dich-vu/{service-slug}
/tin-tuc/{category}/{post}                 → dùng /tin-tuc/{post-slug}
/hang-doi-tac/{parent-brand}/{child-brand} → dùng /hang-doi-tac/{brand-slug}
/san-pham/hang/{brand-slug}                → REDIRECT 301 sang /san-pham/tat-ca?brand={brand-slug}
```

## 4. Phân biệt trang hãng (cập nhật v1.2 — ADR-001/011)
Hai trang **khác loại, không canonical sang nhau**, liên kết chéo qua nút điều hướng.

| | Hồ sơ hãng | Lọc sản phẩm theo hãng |
|---|---|---|
| URL | `/hang-doi-tac/{brand-slug}` | `/san-pham/tat-ca?brand={brand-slug}` |
| Bản chất | Trang giới thiệu hãng/đối tác | Trạng thái lọc của trang danh sách SP |
| Nội dung | Giới thiệu, thương hiệu con, dịch vụ, dự án, tài liệu | Danh sách sản phẩm của hãng |
| Robots | **index,follow** | **noindex,follow** |
| Canonical | **self** | về `/san-pham/tat-ca` |

- **Bỏ** `/san-pham/hang/{brand-slug}` làm landing indexable; nếu còn tham chiếu → **301** sang `/san-pham/tat-ca?brand={brand-slug}`.
- Không đặt canonical của trang lọc trỏ về hồ sơ hãng.

## 4b. Robots/canonical trang phân loại & lọc (ADR-011)
```text
/san-pham/{slug}, /dich-vu/{slug}, /du-an/{slug}, /tin-tuc/{slug},
/hang-doi-tac/{slug}, /tai-lieu/{slug}       → index,follow · self-canonical
/san-pham/danh-muc|tieu-chuan|ung-dung/{slug}, /tin-tuc/danh-muc/{slug}
                                             → index,follow · self-canonical (nội dung biên tập riêng)
/san-pham/tat-ca?brand=|standard=|...        → noindex,follow · canonical /san-pham/tat-ca
/tim-kiem?q=                                 → noindex,follow
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

## 10. Chi tiết sản phẩm `/san-pham/{slug}`
Breadcrumb · Tên/model/hãng/ảnh/mô tả · Nút báo giá/tư vấn · Tổng quan · Tính năng · Ứng dụng · Tiêu chuẩn · Thông số · Loại mẫu · Phụ kiện · Catalogue/Video · Dịch vụ/Dự án/Sản phẩm liên quan · Form yêu cầu.
Sản phẩm ngừng KD: nhãn "đã ngừng kinh doanh" + sản phẩm thay thế (ADR-002).

## 11. Chi tiết hãng `/hang-doi-tac/{slug}`
Ảnh bìa/logo/tên · Giới thiệu · Quốc gia/website · Thương hiệu con · Nhóm sản phẩm · Sản phẩm của hãng · Dịch vụ liên quan · Tài liệu & tin từ hãng · Dự án · CTA.

## 12. Chi tiết dịch vụ `/dich-vu/{slug}`
Breadcrumb · Tên/mô tả/ảnh · Nút yêu cầu hỗ trợ · Vấn đề khách gặp · Phạm vi · Quy trình · Thiết bị/hãng · Dự án liên quan · FAQ · Form yêu cầu hỗ trợ.

## 13. Chi tiết dự án `/du-an/{slug}`
Ảnh banner · Tên/loại · Thông tin (địa điểm/thời gian/khách hàng theo `customer_visibility`/hãng) · Phạm vi · Triển khai · Hình ảnh · Kết quả · Sản phẩm/dịch vụ liên quan · CTA.

## 14. Chi tiết bài viết `/tin-tuc/{slug}`
Breadcrumb · Danh mục/tiêu đề/ngày · Ảnh · Nội dung · Album · Sản phẩm/dịch vụ/dự án/bài liên quan · Chia sẻ · CTA.

## 15. Danh sách & lọc sản phẩm
Filter sidebar (desktop) / drawer (mobile): danh mục, hãng, thương hiệu con, tiêu chuẩn, ứng dụng. Chip "đang lọc" + URL cập nhật theo filter (slug, key lặp — ADR-007; **cùng dimension OR, khác dimension AND**). URL lọc là trạng thái của `/san-pham/tat-ca` (noindex,follow). Empty state kèm nút "Gửi yêu cầu tư vấn".

## 16. Liên hệ `/lien-he`
Form liên hệ (P0, chưa có attachment) · Thông tin công ty · Danh sách văn phòng · Bản đồ.

## 17. Tìm kiếm `/tim-kiem`
P0: tìm sản phẩm. P1: gộp product/service/project/post/document theo nhóm kết quả. Empty state kèm gợi ý + nút tư vấn.

---

# PHẦN V — TRANG HỆ THỐNG
`/yeu-cau-thanh-cong` (xác nhận đã nhận, không lộ dữ liệu nhạy cảm) · Trang 404 (tìm kiếm + về trang chủ + nhóm sản phẩm) · Trang lỗi (thân thiện, không stack trace) · Chính sách bảo mật/điều khoản/cookie (là `pages`).

---

# PHẦN VI — SITEMAP RÚT GỌN

```text
LT VIETNAM
├── Trang chủ
├── Giới thiệu → Về · Lịch sử · Tầm nhìn&sứ mệnh · Lĩnh vực · Năng lực KT · Năng lực gia công · Ngành · Khách hàng · Đối tác
├── Sản phẩm → Tất cả · Danh mục(list) · Theo hãng(list) · Theo tiêu chuẩn(list) · Theo ứng dụng(list) · Chi tiết(/san-pham/{slug})
├── Hãng & Đối tác → Danh sách · Chi tiết(/hang-doi-tac/{slug})   [thương hiệu con = brand slug riêng]
├── Dịch vụ → Tổng · Chi tiết(/dich-vu/{slug})
├── Dự án → Danh sách · Chi tiết(/du-an/{slug})
├── Tin tức → Tổng · Danh mục(list) · Chi tiết(/tin-tuc/{slug})
├── Tài liệu → Danh sách · Chi tiết(/tai-lieu/{slug})
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
