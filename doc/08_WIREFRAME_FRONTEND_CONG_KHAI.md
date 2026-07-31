# 08 — WIREFRAME FRONTEND CÔNG KHAI — WEBSITE LT VIETNAM

**Phiên bản:** 1.3
**Mô hình:** Website doanh nghiệp B2B.
**Ngày:** 2026-07-29
**Nguồn sự thật cho:** bố cục & luồng trang công khai (khớp URL ở 02, API ở 06).
**Áp dụng:** ADR-001 (URL phẳng + canonical hãng), 002 (slug/discontinued), 003 (form/idempotency), 004 (locale/không fallback brand), 007 (filter OR/AND), 011 (canonical/robots/social), 012 (external video).

> **Nhật ký v1.2:** lọc theo hãng dùng `/products/all?brand={slug}` (noindex,follow); filter OR/AND; canonical/robots tự sinh; social image fallback; download tài liệu dùng slug; external video render từ block đã validate.
> **Nhật ký v1.2.1:** trang `/products` gọi `GET /products/landing` (không `GET /home`); làm rõ Brand detail không fallback VI→EN.

> **Nhật ký v1.3:** URL tiếng Anh ở gốc, tiếng Việt ở tiền tố `/vi` và **chỉ tồn tại** cho Trang, Bài viết, Dịch vụ, Dự án (ADR-001/014). Công tắc ngôn ngữ trên giao diện đổi nhãn giao diện; với bốn nhóm trên nó chuyển sang URL `/vi/...`, với các nhóm còn lại chỉ đổi nhãn.
> Bộ lọc: chọn hãng mẹ hoặc danh mục cha **bao gồm toàn bộ nhánh con** (ADR-015).
> Landing danh mục/tiêu chuẩn/ứng dụng không có mô tả biên tập → `noindex,follow` (ADR-011 §2b).

---

# PHẦN I — MỤC TIÊU UX

Ba nhiệm vụ: (1) Tìm sản phẩm phù hợp → (2) Hiểu năng lực LT Vietnam → (3) Gửi yêu cầu báo giá/hỗ trợ. Không mua hàng trực tuyến; khách không cần tài khoản/giỏ hàng/thanh toán.

Ba nhóm người dùng: đã biết model (dùng tìm kiếm/theo hãng/theo tiêu chuẩn) · biết nhu cầu chưa biết model (danh mục/ứng dụng/ngành/dịch vụ/tư vấn) · kiểm chứng năng lực (giới thiệu/dự án/khách hàng).

Nguyên tắc: chuyên nghiệp B2B, ít hiệu ứng, sản phẩm/dịch vụ là trung tâm, thông số dễ đọc, nút báo giá luôn dễ tìm, tốt trên mobile, không như website bán lẻ. **Không** hiển thị giá/giỏ hàng/tồn kho.

---

# PHẦN II — BỐ CỤC CHUNG

```text
TOP BAR: ĐT | Email | VP | VI/EN
HEADER: Logo | Menu chính | Tìm kiếm | [YÊU CẦU BÁO GIÁ]
MAIN
CTA LIÊN HỆ
FOOTER
```

## Header & Mega Menu (auto-generated — 02/06)
Menu chính: Trang chủ · Giới thiệu · Sản phẩm · Hãng & Đối tác · Dịch vụ · Dự án · Tin tức · Tài liệu · Liên hệ.
Mega menu "Sản phẩm" lấy **từ dữ liệu thật**: cột nhóm sản phẩm (danh mục `is_featured`), cột hãng (`is_featured`), cột tìm nhanh (tiêu chuẩn/ứng dụng cấu hình) + "Xem tất cả". Không liệt kê toàn bộ; không viết cứng.

Mobile: hamburger + drawer; nút "Yêu cầu báo giá" và VI/EN trong drawer.

---

# PHẦN III — TRANG CHỦ

Thứ tự section cố định (khớp 02/07): Hero · Lĩnh vực hoạt động · Danh mục nổi bật · Tìm theo nhu cầu (thanh tìm kiếm) · Sản phẩm nổi bật · Hãng & đối tác · Dịch vụ · Năng lực · Dự án mới · Tin tức · Khách hàng · CTA · Văn phòng.

Hero cần nói rõ LT Vietnam cung cấp gì + cho ai + hành động tiếp theo (ví dụ "Giải pháp thiết bị phân tích nhiên liệu…", `[XEM SẢN PHẨM] [NHẬN TƯ VẤN]`). Tránh khẩu hiệu chung chung.

Card sản phẩm: ảnh · hãng · tên · model · mô tả ngắn · tiêu chuẩn nổi bật · `[XEM CHI TIẾT]`. **Không** giá/mua/tồn kho/giỏ hàng.

Mobile: Header · Hero · Tìm kiếm · Danh mục · Sản phẩm · Dịch vụ · Hãng · Năng lực · Dự án · Tin tức · Khách hàng · CTA · Văn phòng · Footer.

---

# PHẦN IV — SẢN PHẨM

## Landing `/products`
Cửa vào catalogue: thanh tìm kiếm · tìm theo nhóm (danh mục) · theo hãng · theo nhu cầu (tiêu chuẩn/ứng dụng/ngành) · sản phẩm nổi bật · CTA "không tìm thấy → gửi yêu cầu tư vấn".
Dữ liệu tổng hợp từ **`GET /api/v1/products/landing`** (v1.2.1) — **KHÔNG** dùng `GET /home` (dành riêng trang chủ).

## Danh sách & lọc `/products/all` (+ `?brand=&standard=&…`), `/products/category/{slug}`
Filter sidebar (desktop) / drawer (mobile): Danh mục · Hãng · Thương hiệu con · Tiêu chuẩn · Ứng dụng.
Chip "Đang lọc: [PAC ×] [ASTM D86 ×] [Xóa tất cả]"; bỏ một chip chỉ xóa đúng giá trị đó. **URL cập nhật theo filter** dùng slug key-lặp (ADR-007): `?brand=pac&brand=herzog&standard=astm-d86`.
**Ngữ nghĩa (ADR-007):** checkbox **cùng một nhóm = OR**; các **nhóm khác nhau = AND**. Ví dụ: `(PAC OR Herzog) AND ASTM D86`. Sắp xếp: mặc định/mới cập nhật/A–Z/Z–A.
Empty state: "Không tìm thấy sản phẩm" + `[Xóa bộ lọc] [Gửi yêu cầu tư vấn]`.

**Lọc theo hãng (v1.2 — ADR-001/011):** dùng URL `/products/all?brand={slug}` (KHÔNG dùng `/products/brand/{slug}`). Trang này **`robots=noindex,follow`**, `rel=canonical` **về `/products/all`** (KHÔNG canonical sang hồ sơ hãng). Có nút "Xem hồ sơ hãng" → `/brands/{slug}`. URL cũ `/products/brand/{slug}` → 301.
Landing `/products/danh-muc|tieu-chuan|ung-dung/{slug}`: self-canonical, index (nội dung biên tập riêng).

## Chi tiết `/products/{product-slug}` (trang quan trọng nhất)
Đầu trang (không cần cuộn): ảnh + thumbnail · hãng · tên · model · mô tả ngắn · tiêu chuẩn nổi bật · `[YÊU CẦU BÁO GIÁ] [NHẬN TƯ VẤN]` · Tải catalogue.
Menu nội dung: Tổng quan · Tính năng · Ứng dụng · Tiêu chuẩn · Thông số · Tài liệu.
Khu vực: Tổng quan · Tính năng · Ứng dụng · Tiêu chuẩn (Compliance/Specification) · Thông số (bảng) · Tài liệu (tải) · Dịch vụ liên quan · Dự án thực tế · Sản phẩm liên quan · Form yêu cầu (tự điền sản phẩm).
Mobile: các phần dài dùng accordion; thanh CTA cố định `[GỌI TƯ VẤN] [YÊU CẦU BÁO GIÁ]`.

### Sản phẩm ngừng kinh doanh (ADR-002)
Nếu API trả cờ `discontinued`: hiển thị nhãn **"Sản phẩm đã ngừng kinh doanh"**, có thể ẩn nút báo giá trực tiếp, hiển thị **sản phẩm thay thế**. **Không** đổi/xóa URL. (Chỉ redirect khi DN duyệt.)

---

# PHẦN V — HÃNG, DỊCH VỤ, DỰ ÁN, TIN TỨC, TÀI LIỆU

## Hãng
Danh sách `/brands`. Hồ sơ hãng `/brands/{brand-slug}` (**index, self-canonical**): ảnh bìa/logo/tên · giới thiệu · quốc gia/website · thương hiệu con (mỗi con là brand slug riêng, link `/brands/{child-slug}`) · nhóm sản phẩm · sản phẩm của hãng · dịch vụ liên quan · tài liệu & tin từ hãng · dự án · CTA. (Không dùng URL lồng cha/con.)
- Nút **"Xem tất cả sản phẩm của hãng"** → `/products/all?brand={slug}` (trang lọc, noindex,follow — không canonical sang hồ sơ hãng).
- **Tiếng Anh (ADR-004):** hồ sơ hãng **không fallback** VI; nếu bản EN của hãng chưa publish thì trang EN của hãng **không tồn tại** (không hiển thị nội dung VI trên URL EN).

## Dịch vụ
Tổng `/services`: giới thiệu năng lực · nhóm dịch vụ · quy trình tiếp nhận · dự án tiêu biểu · CTA.
Chi tiết **`/services/{service-slug}`** (phẳng): tên/mô tả/ảnh · `[YÊU CẦU HỖ TRỢ]` · vấn đề khách gặp · phạm vi · quy trình · thiết bị/hãng · dự án liên quan · FAQ · form (tự điền dịch vụ).

## Dự án
Danh sách `/projects` (lọc theo loại/sản phẩm/hãng/năm). Chi tiết **`/projects/{project-slug}`**: banner · tên/loại · thông tin (khách hàng theo `customer_visibility` — backend quyết định) · phạm vi · triển khai · hình ảnh · kết quả · sản phẩm/dịch vụ liên quan · CTA. Nếu khách hàng đặt bảo mật: không hiển thị tên/logo.

## Tin tức
Tổng `/news` + danh mục `/news/category/{post-category-slug}`. Chi tiết **`/news/{post-slug}`** (phẳng): danh mục/tiêu đề/ngày · ảnh · mục lục · nội dung · sản phẩm/bài liên quan.

## Tài liệu
Danh sách `/resources` (lọc loại/hãng/sản phẩm/ngôn ngữ) chỉ hiển thị tài liệu công khai; tải trực tiếp qua **`GET /documents/{slug}/download`** (dùng slug — ADR-001, M4). Chi tiết `/resources/{document-slug}`. **Không** có tài liệu loại video (video ngoài dùng block external_video — ADR-012).

---

# PHẦN VI — TÌM KIẾM, LIÊN HỆ, FORM YÊU CẦU

## Tìm kiếm `/search?q=`
MVP: kết quả sản phẩm. **P1:** gộp nhóm (Sản phẩm/Dịch vụ/Bài viết/Dự án/Tài liệu). Không kết quả → thông báo + gợi ý + danh mục phổ biến + nút tư vấn.

## Liên hệ `/contact`
Form liên hệ (trái) + thông tin công ty/văn phòng (phải) + bản đồ. Form P0 **không có** file đính kèm (attachment → P1).

## Form yêu cầu dùng chung (modal) — ADR-003
```text
YÊU CẦU BÁO GIÁ                                   [X]
Sản phẩm: PAC OptiDist 2   (tự điền nếu mở từ trang SP)
Họ và tên * · Công ty * · Điện thoại * · Email *
Nội dung yêu cầu *
[ ] Tôi đồng ý với chính sách bảo mật.
[HỦY]                                   [GỬI YÊU CẦU]
```
- **P0 không có nút "Chọn file"** (attachment là P1).
- Tự điền: từ trang SP → `product_id`, `inquiry_type=quotation`, `source_url`; từ trang DV → `service_id`, `inquiry_type=technical_support`, `source_url`.
- **Idempotency (ADR-003):** frontend sinh `request_id`/`Idempotency-Key` duy nhất cho mỗi lần mở form; gửi kèm; khóa nút khi đang gửi để không gửi trùng.
- Trạng thái: "Đang gửi…" (khóa nút) → Thành công ("✓ Yêu cầu đã được gửi. LT Vietnam sẽ chủ động liên hệ.") → Lỗi ("Không thể gửi lúc này, vui lòng thử lại hoặc liên hệ ☎/✉"). Không lộ lỗi kỹ thuật.
- Backend trả `202` sau khi đã **lưu DB** (không phụ thuộc SMTP) — khách yên tâm không mất yêu cầu.

Vị trí mở form: Header · trang chủ · danh sách/chi tiết sản phẩm · dịch vụ · chi tiết hãng · dự án · liên hệ · trang không kết quả.

---

# PHẦN VII — ĐA NGÔN NGỮ (ADR-004)

- VI tại đường dẫn gốc, EN tại `/`.
- Trang tiếng Anh của product/service/project/post/**brand**/page/document **chỉ hiển thị khi bản dịch EN `published`**. Nếu EN chưa publish: trả trạng thái đúng (trang không tồn tại ở EN / điều hướng về danh sách EN), **không trộn** nội dung VI vào trang EN. **Đặc biệt Brand detail KHÔNG fallback VI** (ADR-004, v1.2).
- Chỉ fallback dữ liệu **độc lập ngôn ngữ**: model, SKU/mã, mã tiêu chuẩn, proper name hãng (nếu DN xác nhận), nhãn hệ thống — hiển thị nhất quán.
- **hreflang** chỉ khi cả hai bản published (ADR-004).
- Chuyển ngôn ngữ giữ ngữ cảnh khi có bản dịch tương ứng; nếu trang hiện tại không có bản EN published, chuyển về trang danh sách tương ứng ở EN.

---

# PHẦN VIII — FOOTER & TRANG HỆ THỐNG

Footer: logo + giới thiệu ngắn · cột Công ty/Sản phẩm/Dịch vụ/Liên hệ · chính sách (bảo mật/điều khoản/cookie) · mạng xã hội · bản quyền. **Không** liên kết ngoài không liên quan, không nhồi từ khóa.

Trang hệ thống: 404 (tìm kiếm + về trang chủ + nhóm sản phẩm) · lỗi hệ thống (thân thiện, không stack trace) · yêu cầu thành công (`/request-success`, không lộ dữ liệu nhạy cảm).

---

# PHẦN IX — COMPONENT, TRẠNG THÁI, RESPONSIVE, SEO, HIỆU NĂNG, A11Y

- **Component:** PublicLayout, TopBar, Header, MegaMenu, MobileMenu, Breadcrumb, HeroBanner, SectionHeader, CategoryCard, ProductCard(+biến thể), BrandCard, ServiceCard, ProjectCard, PostCard, DocumentCard, CustomerLogo, SearchBox, FilterSidebar, MobileFilterDrawer, Pagination, ProductGallery, TechnicalSpecificationTable, DocumentDownload, InquiryModal, ContactForm, OfficeCard, CallToAction, Accordion, Tabs, EmptyState, ErrorState, LoadingSkeleton, Footer, CookieBanner.
- **Trạng thái:** skeleton loading; empty state kèm CTA tư vấn; error state có [Thử lại].
- **Responsive:** Mobile <768 · Tablet 768–1023 · Desktop ≥1024 · Large ≥1440. Menu→hamburger; lưới SP 3–4→1–2 cột; filter→drawer; bảng thông số cuộn ngang; CTA sản phẩm cố định mobile; form 1 cột.
- **SEO (khớp 02/06, ADR-011):** mỗi trang một `h1`, breadcrumb, **canonical & robots do frontend/backend tự sinh** theo trạng thái/loại trang (chi tiết→index self-canonical; filter/search→noindex,follow; admin/error→noindex,nofollow), hreflang VI↔EN (chỉ khi cả hai published), meta title/description, **Open Graph với social image theo fallback chain** (featured/cover/logo → default_social_image), structured data (Organization/LocalBusiness, Product không giá, Article/NewsArticle, BreadcrumbList, FAQPage khi FAQ hiển thị). Frontend **không** có ô nhập canonical/robots.
- **External video (ADR-012):** chỉ render embed từ block `external_video` đã được backend validate (YouTube/Vimeo). Frontend tự dựng iframe an toàn từ provider + video ID; **không** nhúng raw iframe/script từ nội dung. Không có khu vực upload/video riêng bắt buộc.
- **Hiệu năng:** WebP/AVIF, responsive image, lazy load, không tải toàn bộ SP, hạn chế JS nặng, cache nội dung công khai, font tối ưu.
- **A11y:** dùng bàn phím, focus rõ, nút có nhãn, alt text, tương phản đủ, không chỉ dùng màu, form có label, lỗi mô tả bằng chữ, modal giữ focus, menu mobile đóng bằng bàn phím.

---

# PHẦN X — CÁC TRANG THEO GIAI ĐOẠN

**P0:** Trang chủ · Sản phẩm (landing/list/detail) · Hãng (list/detail) · Dịch vụ (tổng/detail) · Dự án (list/detail) · Tin tức (tổng/detail) · Tài liệu · Liên hệ · Form yêu cầu (không attachment) · Tìm kiếm sản phẩm · Chính sách bảo mật · 404.
**P1:** tìm kiếm toàn site · trang tiêu chuẩn/ứng dụng/ngành chi tiết · tài liệu tổng hợp nâng cao · FAQ · timeline lịch sử · landing page chiến dịch · **attachment trong form**.
**Chưa triển khai (Future):** đăng nhập/cổng khách hàng · giỏ hàng · thanh toán · theo dõi báo giá/ticket · thiết bị đã mua · kho tài liệu riêng. **Không** hiển thị các mục này như đã có sẵn.

---

# PHẦN XI — QUYẾT ĐỊNH CHỐT (Frontend 1.2)
1. URL chi tiết **phẳng** (ADR-001); hồ sơ hãng `/brands/{slug}` (index, self-canonical); lọc theo hãng `/products/all?brand={slug}` (noindex,follow, canonical `/products/all`); bỏ `/products/brand/{slug}` (301).
2. Nút báo giá nổi bật ở Header + đầu/cuối trang sản phẩm; mobile CTA cố định.
3. Form tự nhận sản phẩm/dịch vụ nguồn; **idempotency** (Idempotency-Key); **không attachment** ở P0.
4. Backend lưu yêu cầu trước khi email → 202 (ADR-003); frontend hiển thị "đã tiếp nhận".
5. Sản phẩm ngừng KD giữ trang + nhãn + thay thế (ADR-002).
6. Mega menu auto-generated từ dữ liệu nổi bật.
7. Filter slug key-lặp, **cùng dimension OR / khác dimension AND** (ADR-007).
8. Trang EN chưa publish trả trạng thái đúng, **không trộn ngôn ngữ**; **Brand detail không fallback** (ADR-004).
9. **SEO tự sinh** (canonical/robots), social image fallback, không ô nhập canonical/robots (ADR-011).
10. **External video** chỉ render từ block đã validate (YouTube/Vimeo); không upload video (ADR-012). Download tài liệu dùng slug.
11. Không hiển thị chức năng P1/Future như đã triển khai. Không giá/giỏ hàng/mua; ưu tiên tốc độ/SEO/khả năng đọc.

---

# PHẦN XII — TEST CASE UI BẮT BUỘC
- **Filter:** chọn PAC + Herzog (cùng nhóm) → OR; thêm ASTM D86 (nhóm khác) → AND; bỏ chip PAC chỉ xóa PAC. URL `?brand=herzog&standard=astm-d86`.
- **SEO:** hồ sơ hãng self-canonical/index; trang lọc `?brand=` noindex,follow canonical `/products/all`; landing danh mục self-canonical/index; EN chưa publish → không có hreflang EN.
- **Video:** block external_video YouTube/Vimeo → render embed an toàn; nội dung chứa raw iframe/domain lạ → không render.
- **Form:** gửi hai lần cùng Idempotency-Key → chỉ một yêu cầu; SMTP lỗi vẫn nhận "đã tiếp nhận" (đã lưu DB).
- **Brand EN:** chưa publish EN → `/brands/{slug}` không tồn tại (không hiện nội dung VI).
