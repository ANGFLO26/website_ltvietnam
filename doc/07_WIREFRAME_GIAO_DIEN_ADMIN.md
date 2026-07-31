# 07 — WIREFRAME GIAO DIỆN ADMIN — WEBSITE LT VIETNAM

**Phiên bản:** 1.3
**Ngày:** 2026-07-29
**Đối tượng:** một tài khoản Admin.
**Nguồn sự thật cho:** luồng & bố cục màn hình quản trị (khớp API ở 06, dữ liệu ở 03/05).
**Áp dụng:** ADR-003 (không UI inquiry), 004 (badge locale), 005 (media), 006 (P0/P1 + audit log), 008 (PATCH), 009 (upload), 010 (catalogue), 011 (SEO form không index/follow/social picker), 012 (external video, không upload video).

> **Nhật ký v1.2:** SEO form bỏ checkbox index/follow + social image picker (canonical/robots tự sinh); external video block thay upload video; dashboard health readiness nội bộ + email_failed.

**KHÔNG bao gồm MVP:** CRM, quản lý yêu cầu khách hàng, báo giá, hợp đồng, bảo hành, phân quyền nhiều nhóm.

> **Nhật ký v1.3 (ADR-014):** chỉ **bốn** nhóm có tab/badge ngôn ngữ — Trang, Bài viết, Dịch vụ, Dự án. Mọi form còn lại (sản phẩm, hãng, danh mục, tiêu chuẩn, ứng dụng, ngành, tài liệu, khách hàng, văn phòng, banner, menu) chỉ có **một** bộ trường nội dung, không có tab VI/EN.
> Bổ sung màn hình **Yêu cầu khách hàng (chỉ đọc)**: danh sách + chi tiết + nút "Đã liên hệ". Không phải CRM.
> Bổ sung ô **Nổi bật** cho Tiêu chuẩn, Ứng dụng, Ngành (trước chỉ có ở Hãng, Danh mục, Sản phẩm).
> Form Danh mục/Hãng/Ứng dụng: đổi cha phải cảnh báo "sẽ cập nhật lại toàn bộ nhánh con".

---

# PHẦN I — NGUYÊN TẮC & BỐ CỤC

Ưu tiên: dễ tìm chức năng, ít bước, cảnh báo rõ, không mất dữ liệu đang nhập, có bản nháp, có xem trước, xác nhận thao tác quan trọng.

```text
+------------------------------------------------------------------+
| HEADER: [☰] LT VIETNAM ADMIN  [Tìm nhanh]  [Xem website] [Admin ▼]|
+----------------------+-------------------------------------------+
| SIDEBAR              | MAIN: Tiêu đề · Breadcrumb · Nội dung      |
+----------------------+-------------------------------------------+
```

## Sidebar chính thức
```text
TỔNG QUAN → Dashboard
NỘI DUNG WEBSITE → Trang chủ · Trang giới thiệu · Dịch vụ · Dự án · Bài viết · Khách hàng tiêu biểu
SẢN PHẨM → Tất cả sản phẩm · Danh mục · Hãng & thương hiệu · Tiêu chuẩn · Ứng dụng · Ngành công nghiệp
TÀI NGUYÊN → Tài liệu · Thư viện Media
CẤU HÌNH → Văn phòng · Menu · Footer · SEO mặc định · Redirect · Cài đặt hệ thống
TÀI KHOẢN → Hồ sơ · Đổi mật khẩu
```

## Không xuất hiện trong Sidebar MVP (ADR-003/006)
```text
Yêu cầu khách hàng / Khách hàng tiềm năng / CRM / Báo giá / Đơn hàng /
Bảo hành / Ticket kỹ thuật / Dashboard kinh doanh
```
Form khách chỉ **lưu inquiries + gửi email** (không có màn quản lý). Các module Future thêm sau dưới dạng nhóm mới, không đổi cấu trúc hiện tại.

---

# PHẦN II — ĐĂNG NHẬP & DASHBOARD

## Đăng nhập
Email + mật khẩu + ghi nhớ + quên mật khẩu. Lỗi hiển thị chung: "Email hoặc mật khẩu không chính xác" (không tiết lộ email tồn tại). Trạng thái: sai định dạng, để trống, sai thông tin, khóa, gửi quá nhiều, phiên hết hạn.

## Dashboard (P0 — chỉ widget thật sự cần)
```text
+ SẢN PHẨM (tổng / nháp)  + BÀI VIẾT  + DỰ ÁN  + TÀI LIỆU
+ TẠO NHANH: [+ Sản phẩm] [+ Bài viết] [+ Dự án] [+ Tài liệu]
+ NỘI DUNG CẬP NHẬT GẦN ĐÂY
+ TRẠNG THÁI HỆ THỐNG: Database · Lưu trữ file · Gửi email (+ số email_failed từ inquiry_outbox) — lấy từ /health/ready nội bộ (M2), không lộ chi tiết
```
**Không** hiển thị: doanh thu, khách hàng tiềm năng, tỷ lệ chuyển đổi, báo giá, nhân viên.
**Cảnh báo nội dung** (thiếu EN, thiếu catalogue…) → **P1** (không có trong P0 vì tốn quét). Widget "Gửi email" P0 giá trị vì gắn outbox.

---

# PHẦN III — MẪU DANH SÁCH CHUNG

```text
Tiêu đề + [+ Tạo]        | [Tìm kiếm] [Trạng thái ▼] [Hãng ▼] [Danh mục ▼] [Lọc]
Bảng: [ ] Ảnh Tên ... Bản dịch Trạng thái Cập nhật [⋮]
Menu ⋮: Chỉnh sửa · Xem trước · Ẩn · Lưu trữ · Xóa (mềm)
Phân trang
```
Cột "Bản dịch" hiển thị badge theo ngôn ngữ (ADR-004): `VI ✓ / EN ✓`, `VI ✓ / EN Nháp`, `VI ✓ / EN Thiếu`. Không dùng cờ quốc gia.

**Thao tác hàng loạt (bulk) và Nhân bản (duplicate) → P1** (không bắt buộc P0). MVP: thao tác từng bản ghi qua menu ⋮.

---

# PHẦN IV — SẢN PHẨM (màn phức tạp nhất)

## Danh sách
Cột: Chọn · Ảnh · Tên VI · Model · Hãng · Danh mục chính · Bản dịch · Trạng thái · Cập nhật · ⋮.
Lọc: trạng thái, hãng, danh mục, ngôn ngữ thiếu.

## Form — section nav trong trang
```text
← Sản phẩm / Tạo sản phẩm         [Lưu nháp] [Xem trước] [Xuất bản]
Section: ● Thông tin chung  ○ Nội dung  ○ Hãng & Danh mục  ○ Tiêu chuẩn
         ○ Thông số  ○ Ứng dụng & Ngành  ○ Hình ảnh  ○ Tài liệu
         ○ Nội dung liên quan  ○ SEO  ○ Nâng cao  ○ Trạng thái
```

### Thông tin chung
`Tên * · Slug (tự sinh) · Model · Mã nội bộ · Ảnh đại diện · Mô tả ngắn`.
> **Tạo nhanh & lưu nháp (ADR mục 4.7):** chỉ cần **Tên VI + Hãng + Danh mục chính** là lưu nháp được; slug tự sinh; các trường mô tả có thể trống.

### Nội dung — tab ngôn ngữ
```text
[ TIẾNG VIỆT ] [ ENGLISH ]
Tổng quan (rich/block) · Tính năng (danh sách +/- từng dòng) · Ứng dụng · Nguyên lý ·
Loại mẫu · Điều kiện vận hành · Phụ kiện & tùy chọn
```
Nguyên tắc: không ghép VI/EN trong một trường; cảnh báo nếu EN chưa hoàn thành; lưu nháp dù thiếu EN; VI bắt buộc khi xuất bản (ADR-004).

### Hãng & Danh mục
`Hãng * (bắt buộc) · Thương hiệu cha (hiển thị) · Danh mục (chọn nhiều) · Danh mục chính * (nằm trong danh sách đã chọn)`. Không cho xuất bản nếu hãng/danh mục bị xóa. (Danh mục chính = `product_category_links.is_primary`.)

### Tiêu chuẩn
Bảng: Tiêu chuẩn · Loại quan hệ (Compliance/Correlation/Specification/Reference) · Ghi chú · Thứ tự.

### Thông số kỹ thuật
Nhóm (không bắt buộc) → dòng: Tên VI · Tên EN · Giá trị VI · Giá trị EN · Đơn vị. Kéo thả sắp xếp. Giá trị VI khuyến nghị; EN không bắt buộc khi nháp.

### Ứng dụng & Ngành
Ứng dụng (chọn nhiều, **danh sách phẳng** — ADR-006) + Ứng dụng chính. Ngành (chọn nhiều).

### Hình ảnh
Ảnh đại diện (`products.featured_image_id`) + Thư viện bổ sung với vai trò **gallery/diagram/application/interface/dimension** (**không** có "featured"). Chọn từ Media hoặc upload (JPG/PNG/WebP; **không SVG**).

### Tài liệu
Chọn tài liệu đã có (không upload PDF trực tiếp trong form sản phẩm → upload vào Documents/Media rồi liên kết, tránh trùng).

### Nội dung liên quan
Sản phẩm/dịch vụ/dự án/bài viết liên quan (component RelationSelector dùng chung).

### SEO (ADR-011 — v1.2)
Chỉ có: **SEO Title · SEO Description · Slug** · URL xem trước (tự sinh) · **Canonical preview (chỉ đọc)** · **Social image preview (theo fallback chain, không picker riêng)** · Google preview.
**Bỏ:** ô Canonical URL tùy chỉnh · checkbox "cho index" · checkbox "follow" · ô "Ảnh chia sẻ" riêng. (Canonical/robots tự sinh theo trạng thái; social image lấy từ featured/cover/logo.)

### Nâng cao (mặc định thu gọn — ADR mục 4.6)
`SKU · Loại sản phẩm · price_visibility · sale_mode · warranty_months · requires_configuration` — **không bắt buộc**, không dùng tạo ecommerce trong MVP.

### Thanh hành động
`Trạng thái: Bản nháp · Đã lưu 10:35 | [Xóa] [Lưu nháp] [Xem trước] [Xuất bản]`.
`Lưu nháp` thiếu dữ liệu OK · `Xuất bản` chạy validation đầy đủ (PublishService) · `Ẩn` giữ dữ liệu · `Xóa` = xóa mềm.

### Cập nhật (PATCH — ADR-008)
Khi lưu: trường mảng có mặt → thay thế toàn bộ tập; vắng → giữ nguyên; toàn bộ trong transaction.

---

# PHẦN V — HÃNG, DANH MỤC, TAXONOMY

## Hãng
Danh sách: Logo · Tên · Hãng cha · Loại · Số SP · Trạng thái · ⋮.
Form: Tên * · Slug · Loại hãng * · Hãng cha · Quốc gia · Website · Logo · Ảnh bìa · Mô tả ngắn · Nội dung · Tài liệu · SEO · Trạng thái. Nếu Loại=Thương hiệu con → bắt buộc Hãng cha; backend kiểm vòng lặp.

## Danh mục sản phẩm (cây)
Cây kéo-thả (P0 cho danh mục — cần thiết vận hành), thêm con, chuyển cha, ẩn/hiện, xem số sản phẩm, cảnh báo khi có sản phẩm.

## Tiêu chuẩn / Ứng dụng / Ngành
- Tiêu chuẩn: bảng (Mã · Tổ chức · Tên · Số SP · Trạng thái); form Tổ chức * · Mã * · Tên · Mô tả · Slug · SEO.
- **Ứng dụng: danh sách PHẲNG** (ADR-006) — không kéo-thả cây trong MVP dù DB có parent_id.
- Ngành: danh sách/card (Icon · Tên · Số SP · Số DV · Trạng thái).

---

# PHẦN VI — DỊCH VỤ, DỰ ÁN, BÀI VIẾT

## Dịch vụ (cây)
Danh sách/cây. Form: Thông tin chung (Tên · Dịch vụ cha · Mô tả ngắn · Ảnh · Trạng thái) · Nội dung (Tổng quan · Vấn đề KH · Phạm vi · Quy trình · Lợi ích · FAQ) · Liên kết (Sản phẩm · Hãng · Ngành · Dự án · Tài liệu) · SEO. Badge locale.

## Dự án
Danh sách (Ảnh · Tên · Loại · Khách hàng · SP · Thời gian · Trạng thái). Form: Thông tin (Tên · Loại · Khách hàng · **Chế độ công khai** · Địa điểm · Thời gian · Ảnh · Trạng thái) · Nội dung (Mô tả · Phạm vi · Triển khai · Kết quả) · Quan hệ (SP/DV/Hãng/Bài) · Hình ảnh · SEO.
Chế độ công khai: `(●) Công khai đầy đủ ( ) Ẩn tên ( ) Chỉ lĩnh vực ( ) Bảo mật hoàn toàn` (cảnh báo khi bảo mật).

## Bài viết
Danh sách (Ảnh · Tiêu đề · Danh mục · Bản dịch · Trạng thái · Ngày đăng). Form: Tiêu đề * · Slug · Danh mục * · Mô tả ngắn · Ảnh · Nội dung (block editor) · Album · Ngày xuất bản · Nổi bật · Quan hệ (SP/DV/Dự án/Hãng) · SEO · Trạng thái. Editor whitelist tag/block; **không** chèn script/iframe tùy ý. **Block "External Video" (ADR-012):** provider (YouTube/Vimeo) · URL · tiêu đề · chú thích — **không** upload file video, **không** video trong Media Picker.

---

# PHẦN VII — KHÁCH HÀNG, TÀI LIỆU, MEDIA, TRANG CHỦ, TRANG TĨNH

## Khách hàng tiêu biểu
Danh sách (Logo · Tên · Ngành · Được công khai · Nổi bật · Trạng thái). Cảnh báo: chỉ đăng logo/tên khi có quyền công khai. (Nội dung, không phải CRM.)

## Tài liệu
Danh sách (Tên · Loại · Ngôn ngữ file · Phiên bản · Liên kết · Trạng thái · Lượt tải). Form: Tên * · Loại * · File * · Ngôn ngữ (file) · Phiên bản · Ngày phát hành · Mô tả · Liên kết (SP/Hãng/DV/Bài) · Khả năng truy cập (MVP: **Công khai / Ẩn**) · SEO · Trạng thái. (Các mức tương lai email_required/customer_only/staff_only không hiển thị MVP.)

## Media (ADR-005/009)
Lưới file + panel chi tiết: tên, kích thước, MIME, alt VI/EN, **"Đang sử dụng tại"** (liệt kê nơi dùng — MediaUsageService; v1.2 **không** còn quét `social_image_id` translation vì đã bỏ). **Không thể xóa file đang được sử dụng** ("Không thể xóa file vì đang được sử dụng tại N nội dung"). Upload chỉ JPG/JPEG/PNG/WebP/PDF (**không SVG, không video** — ADR-009/012).

## Trang chủ (ADR-006)
Danh sách section **thứ tự cố định**, mỗi section `[Bật/tắt] [Cấu hình]` (chọn số lượng + nội dung nổi bật + layout giới hạn). **Kéo-thả thứ tự section → P1.** Không cho tự xây layout tùy ý.
Banner: danh sách + form (Ảnh desktop * · Ảnh mobile · Tiêu đề · Mô tả · Nhãn nút · Loại liên kết · Nội dung đích · Mở tab mới · Thời gian · Trạng thái).

## Trang tĩnh (pages)
Danh sách: Về LT Vietnam, Lịch sử, Tầm nhìn & sứ mệnh, Lĩnh vực, Năng lực KT, Năng lực gia công, Ngành, Chính sách bảo mật, Điều khoản, Cookie. Trang hệ thống nhãn "Không thể xóa" — chỉ chỉnh sửa/xem trước/xuất bản/ẩn (nếu được phép).

---

# PHẦN VIII — VĂN PHÒNG, MENU, FOOTER, SEO/REDIRECT, SETTINGS, HỒ SƠ

- **Văn phòng:** form đầy đủ (Tên · Loại · Địa chỉ · ĐT/Fax/Email · Giờ · Maps · Tọa độ · Ảnh · Mô tả · Thứ tự · Trạng thái); preview bản đồ nếu tọa độ hợp lệ.
- **Menu:** chọn menu (Header/Footer…), cây mục, form mục (Nhãn VI/EN · Loại liên kết · Nội dung đích · URL tùy chỉnh · Mục cha · Mở tab mới · Trạng thái). Backend kiểm vòng lặp/đích tồn tại/URL hợp lệ. Mega menu sản phẩm auto-generated (không nhập tay). **Kéo-thả cây menu → P1.**
- **Footer:** giới thiệu ngắn + 4 cột chọn menu + mạng xã hội + bản quyền.
- **SEO mặc định (site-level):** tên website · title/description mặc định · **`default_social_image`** (ảnh chia sẻ mặc định — cuối chuỗi fallback ADR-011) · URL chính · robots site-level (checkbox "cho phép index website" — bật/tắt toàn site, khác với robots per-trang tự sinh) · verification. Không cho sửa raw robots.txt tự do; **không** có canonical/index/follow per-entity (tự sinh).
- **Redirect:** danh sách (URL cũ · mới · loại · lượt · lần cuối · trạng thái); form (URL cũ * · URL mới * · 301/302 · trạng thái); kiểm source≠target, không loop/chain, source unique.
- **Settings (tab):** Thông tin công ty · Liên hệ · Email (SMTP + [Gửi email kiểm tra]; mật khẩu hiển thị ••••; From/Reply-To ghi rõ) · Upload (dung lượng, định dạng whitelist, WebP, thumbnail) · Bảo mật (số lần sai, thời gian khóa, thời hạn phiên, CAPTCHA, rate limit) · Đa ngôn ngữ · Bản đồ · Bảo trì.
- **Hồ sơ / Đổi mật khẩu:** thông tin tài khoản; đổi mật khẩu (yêu cầu độ mạnh); MVP chỉ cần đăng xuất phiên hiện tại.

---

# PHẦN IX — TRẠNG THÁI, THÔNG BÁO, CHỐNG MẤT DỮ LIỆU

## Nhãn trạng thái (có chữ + màu, không chỉ màu)
`draft→Bản nháp · published→Đã xuất bản · hidden→Đã ẩn · archived→Lưu trữ`. (`deleted` **không** phải một `status` — là `deleted_at`.)

## Badge bản dịch (ADR-004)
`VI ✓ / EN ✓` · `VI ✓ / EN Nháp` · `VI ✓ / EN Thiếu`.

## Toast & xác nhận
Toast ngắn (✓/✕/⚠). Xóa = xóa mềm + hộp xác nhận ("chuyển vào đã xóa, có thể khôi phục"). Xóa hãng/danh mục đang có nội dung → chặn ("Không thể xóa hãng PAC vì đang có 42 sản phẩm. Hãy ẩn hoặc chuyển sản phẩm").

## Chống mất dữ liệu
Bắt buộc: cảnh báo khi rời trang có thay đổi chưa lưu. **Auto-save chỉ vào bản nháp** (không ghi đè bản published) — auto-save nâng cao là **P1**. Không auto-save gây ghi đè dữ liệu sống.

---

# PHẦN X — KIỂM TRA TRƯỚC KHI XUẤT BẢN

```text
KIỂM TRA XUẤT BẢN (sản phẩm)
✓ Tên VI  ✓ Slug  ✓ Hãng  ✓ Danh mục chính  ✓ Ảnh đại diện  ✓ Mô tả ngắn
✕ Chưa có tổng quan (LỖI bắt buộc)
⚠ Chưa có bản tiếng Anh (cảnh báo — vẫn xuất bản được)
⚠ Chưa có catalogue (cảnh báo)
→ Không thể xuất bản khi còn LỖI bắt buộc.
```
Phân loại: **Lỗi bắt buộc** (chặn publish) vs **Cảnh báo** (vẫn publish). Khớp PublishService (06/05). Trường bắt buộc trong UI = điều kiện publish; trường draft không bị DB chặn.

---

# PHẦN XI — RESPONSIVE, COMPONENT, GIAI ĐOẠN

- Desktop: sidebar cố định, form 2 cột. Tablet: sidebar thu gọn, form 1 cột, bảng cuộn ngang. Điện thoại: đăng nhập/xem/sửa ngắn/upload cơ bản (không khuyến nghị soạn nội dung dài).
- Component: AdminLayout, Sidebar, Header, Breadcrumb, PageHeader, DataTable, Pagination, SearchInput, FilterBar, StatusBadge, LanguageTabs, RichTextEditor, BlockEditor, MediaPicker, FileUploader, TreeSelector, RelationSelector, SpecificationEditor, SEOEditor, PublishPanel, ConfirmDialog, Toast, EmptyState, ErrorState, LoadingState.
- Giai đoạn: (1) nền tảng admin + settings cơ bản; (2) media + catalogue; (3) nội dung website; (4) trang chủ/menu/footer/SEO/redirect/xem trước/kiểm tra xuất bản/responsive.

---

# PHẦN XII — QUYẾT ĐỊNH CHỐT (Admin 1.2)
1. Sidebar + Header cố định; một tài khoản admin.
2. **Không có** module/UI quản lý yêu cầu khách hàng (ADR-003).
3. DataTable thống nhất; form phức tạp chia section; VI/EN dùng tab; badge trạng thái theo ngôn ngữ (ADR-004).
4. Tạo nhanh + lưu nháp (chỉ Tên VI + Hãng + Danh mục chính); publish qua PublishService.
5. Trường thương mại tương lai ẩn trong "Nâng cao" (ADR-010).
6. Ứng dụng hiển thị phẳng (ADR-006/010).
7. Media không cho xóa khi đang dùng; upload chỉ 5 loại, không SVG/video (ADR-005/009/012).
8. Trang chủ thứ tự cố định (reorder P1); mega menu auto-generated.
9. **SEO form (ADR-011):** chỉ SEO Title/Description/Slug + preview; **bỏ** canonical tùy chỉnh, checkbox index/follow, social image picker.
10. **External video block** (YouTube/Vimeo) thay upload video (ADR-012).
11. Dashboard trạng thái hệ thống lấy từ `/health/ready` nội bộ + số `email_failed` (M2/ADR-003).
12. **P1:** bulk actions, duplicate, kéo-thả homepage/menu, dashboard cảnh báo nội dung, auto-save nâng cao.
13. Auto-save chỉ vào nháp; cảnh báo rời trang khi chưa lưu.
