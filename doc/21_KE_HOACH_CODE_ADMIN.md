# Kế hoạch code giao diện quản trị A1–A5

**Ngày:** 2026-08-10
**Trạng thái:** A1–A5 đã hoàn thành và nghiệm thu
**Phạm vi:** giao diện quản trị nội bộ LT Vietnam, không phải CRM
**Phụ thuộc:** backend F1–F8 đã hoàn thành; frontend công khai W0–W8 đã nghiệm thu

---

## 1. Kết luận kiến trúc

Giao diện quản trị được xây thành một workspace Next.js riêng:

```text
admin/                     @ltv/admin — http://localhost:3002
frontend/                  @ltv/frontend — website công khai, cổng 3000
backend/                   @ltv/backend — API, cổng 3001
packages/contracts/        hợp đồng dùng chung
```

Production dự kiến:

```text
www.ltvietnam.com.vn       website công khai
admin.ltvietnam.com.vn     giao diện quản trị
```

Admin app proxy `/api/v1/*` về backend giống frontend công khai. Trình duyệt chỉ gọi API
cùng origin của admin app; cookie phiên `HttpOnly` và cookie CSRF tiếp tục do backend đặt.

Hai origin phải tách biệt trong cấu hình:

- `NEXT_PUBLIC_SITE_URL`: origin website công khai, dùng cho canonical/public URL.
- `ADMIN_SITE_URL`: origin quản trị, dùng cho link đặt lại mật khẩu và các link tuyệt đối
  dành riêng cho admin. Production bắt buộc HTTPS và không được chứa path.

Local mặc định lần lượt là `http://localhost:3000` và `http://localhost:3002`. Nếu admin
gọi backend trực tiếp thay vì qua proxy cùng origin, origin admin cũng phải nằm trong
`CORS_ORIGINS`.

### Vì sao không đặt `/admin` vào `frontend/`

- Root layout của frontend luôn tải header, footer, cookie banner và navigation công khai.
- Middleware công khai gọi resolver cho mọi route; admin không cần và không nên phụ thuộc luồng SEO đó.
- Admin cần `no-store`, xác thực, bundle và vòng phát hành riêng.
- Lỗi hoặc thay đổi admin không được làm tăng rủi ro cho website đang phục vụ khách hàng.
- Luồng proxy cùng origin không phụ thuộc CORS của trình duyệt; cấu hình CORS vẫn cho phép
  khai báo riêng origin admin khi có công cụ hoặc luồng gọi backend trực tiếp.

Đổi lại, monorepo có thêm một lệnh chạy và một artefact triển khai. Đây là chi phí nhỏ hơn
việc trộn hai ứng dụng có mục tiêu, bảo mật và chu kỳ thay đổi khác nhau.

---

## 2. Người dùng và công việc chính

P0 chỉ có một vai trò `admin`; có thể có nhiều tài khoản cùng vai trò nhưng chưa có RBAC.
Người dùng thực tế có thể là nhân viên nội dung, kỹ thuật hoặc vận hành, nhưng backend xem
họ là cùng một vai trò.

Năm công việc quan trọng nhất:

1. Nhập và cập nhật catalogue sản phẩm chính xác.
2. Tải ảnh/tài liệu lên và biết chúng đang được dùng ở đâu.
3. Soạn trang, dịch vụ, dự án và bài viết theo từng ngôn ngữ.
4. Xem yêu cầu khách hàng, phát hiện email lỗi và đánh dấu đã liên hệ.
5. Điều khiển nội dung trang chủ, menu, văn phòng và cấu hình website mà không sửa mã.

Admin phải ưu tiên **nhanh, ít nhầm và không mất dữ liệu** hơn hiệu ứng trình bày.

---

## 3. Phạm vi P0 và những gì không làm

### Có trong P0

- Đăng nhập, quên/đặt lại/đổi mật khẩu, đăng xuất và khởi tạo admin đầu tiên.
- Dashboard vận hành.
- Yêu cầu khách hàng: danh sách, chi tiết, đánh dấu đã liên hệ.
- CRUD/publish/hide/restore theo đúng khả năng từng entity backend.
- Catalogue: sản phẩm, hãng, danh mục, tiêu chuẩn, ứng dụng, ngành.
- Nội dung: trang, dịch vụ, dự án, bài viết, danh mục bài viết.
- Media, tài liệu, khách hàng tiêu biểu, văn phòng, banner, trang chủ, menu.
- Redirect, settings và tài khoản quản trị.
- Trình soạn content block an toàn theo `doc/11`.
- Chống mất thay đổi, kiểm tra publish, trạng thái tải/lỗi/rỗng và responsive.

### Không có trong P0

- CRM, pipeline bán hàng, báo giá, hợp đồng, phân công lead hoặc ghi chú chăm sóc.
- Phân quyền nhiều vai trò.
- Bulk action, duplicate, scheduled publishing tổng quát.
- Auto-save nâng cao, chỉnh sửa đồng thời nhiều người.
- Analytics/doanh thu/tỷ lệ chuyển đổi.
- Upload video hoặc chèn HTML/script/iframe tùy ý.
- Trình dựng layout tự do cho trang chủ.
- UI audit log; P0 chỉ có structured log phía máy chủ.

---

## 4. Kiến trúc thông tin

Sidebar dùng ngôn ngữ nghiệp vụ, không dùng tên bảng database:

```text
TỔNG QUAN
  Dashboard

VẬN HÀNH
  Yêu cầu khách hàng                 badge: chưa xử lý / email lỗi

CATALOGUE
  Sản phẩm
  Danh mục sản phẩm
  Hãng & thương hiệu
  Tiêu chuẩn
  Ứng dụng
  Ngành công nghiệp

NỘI DUNG
  Trang
  Dịch vụ
  Dự án
  Bài viết
  Danh mục bài viết

TÀI NGUYÊN
  Thư viện Media
  Tài liệu

WEBSITE
  Trang chủ & Banner
  Khách hàng tiêu biểu
  Văn phòng
  Menu & Footer
  Redirect

HỆ THỐNG
  Cài đặt
  Tài khoản quản trị
  Tài khoản của tôi
```

Không tạo màn “Footer” giả vì backend không có entity footer. Bốn cột footer được quản lý
qua menu `footer_*`; thông tin công ty/bản quyền lấy từ Settings. UI “Menu & Footer” chỉ
tổ chức hai nguồn đó trong một nơi dễ hiểu.

---

## 5. Khung giao diện

```text
+--------------------------------------------------------------------------------+
| [☰] LT Vietnam Admin   [Tìm nhanh]        [Xem website ↗]   [Tên admin ▾]       |
+-------------------------+------------------------------------------------------+
| Sidebar                 | Breadcrumb                                           |
|                         | Tiêu đề trang                         Hành động chính  |
| Nhóm đang mở            | Bộ lọc / thông báo / nội dung                         |
|                         |                                                      |
|                         |                                                      |
+-------------------------+------------------------------------------------------+
```

### Desktop

- Sidebar rộng 264 px, có thể thu gọn.
- Nội dung tối đa khoảng 1440 px; bảng dùng toàn chiều rộng.
- Form dài có mục lục section bên trái và thanh hành động sticky phía dưới.

### Tablet

- Sidebar thu thành rail hoặc drawer.
- Form một cột; bảng giữ cột quan trọng và cho cuộn ngang có chủ đích.

### Điện thoại

- Dùng được cho đăng nhập, xem inquiry, đổi trạng thái, sửa trường ngắn và upload cơ bản.
- Danh sách chuyển sang card; không ép bảng 12 cột vào màn hình nhỏ.
- Không khuyến nghị soạn content block dài; UI vẫn không được vỡ hoặc mất nút lưu.

---

## 6. Luật UX dùng chung

### 6.1. Danh sách

- Tìm kiếm debounce 300–400 ms; bộ lọc và trang nằm trong URL.
- Back từ màn chỉnh sửa phải trở về đúng bộ lọc/trang trước đó.
- Chỉ một hành động chính: `Tạo mới`.
- Menu hàng chứa `Chỉnh sửa`, `Xem`, `Ẩn/Hiện`, `Khôi phục` hoặc `Xóa` tùy entity.
- Không tải chi tiết từng hàng để vẽ bảng; API danh sách phải trả đủ read-model.
- Trạng thái luôn có chữ và icon, không truyền ý nghĩa chỉ bằng màu.

### 6.2. Form

- Label luôn hiển thị; placeholder chỉ là ví dụ.
- Lỗi đặt ngay dưới trường và có bản tổng hợp ở đầu section sau khi submit.
- Trường bắt buộc để lưu nháp và trường bắt buộc để publish là hai khái niệm khác nhau.
- Slug tự sinh cho đến khi người dùng tự sửa; sau đó không tự ghi đè.
- Trường nâng cao mặc định thu gọn.
- Thay đổi chưa lưu được ghi nhận bằng `dirty state`; rời trang phải xác nhận.
- P0 không auto-save. Nút lưu phải có trạng thái `Đang lưu`, `Đã lưu lúc…`, `Lưu thất bại`.

### 6.3. Publish

- `Lưu nháp` không chạy toàn bộ điều kiện publish.
- `Xuất bản` mở panel kiểm tra gồm hai nhóm:
  - **Lỗi:** chặn publish, link thẳng đến trường/section.
  - **Cảnh báo:** vẫn publish được nhưng phải được nhìn thấy.
- Với trang/bài viết/dịch vụ/dự án, trạng thái publish độc lập theo VI và EN.
- Sản phẩm, hãng, taxonomy, tài liệu, khách hàng, văn phòng, banner và menu chỉ có một bộ
  nội dung; tuyệt đối không hiện tab ngôn ngữ giả.
- Trước khi gửi lệnh publish, admin gọi `POST /api/v1/admin/publish-check` bằng hợp đồng
  `AdminPublishCheckRequest`. `ok=false` hoặc `blockers[]` khác rỗng phải chặn thao tác và
  đưa người dùng đến đúng trường. Frontend không được tự sao chép publish rule.
- Preflight chỉ là kiểm tra trước để cải thiện UX; endpoint publish vẫn phải tự kiểm tra lại
  trong transaction vì dữ liệu có thể thay đổi giữa hai request.

### 6.4. Xóa

- Ưu tiên `Ẩn` hơn `Xóa` cho nội dung đã công khai.
- Với entity hỗ trợ soft delete, nút phải ghi rõ “Chuyển vào đã xóa” và cho khôi phục.
- Office, banner và menu hiện không có `deleted_at`; delete là vĩnh viễn. UI phải ghi
  “Xóa vĩnh viễn”, yêu cầu xác nhận rõ và không dùng cùng wording với soft delete.
- Media đang được dùng nhận `409 MEDIA_IN_USE`; dialog hiển thị danh sách nơi sử dụng.

### 6.5. Phản hồi lỗi

- `401`: đưa về đăng nhập và giữ `next` URL.
- `403 CSRF_TOKEN_MISMATCH`: yêu cầu tải lại phiên, không tự retry mutation.
- `409`: giải thích xung đột bằng dữ liệu `details`, không chỉ hiện “Có lỗi”.
- `422`: ánh xạ `details.fields[]` về từng trường.
- `429`: hiển thị thời gian chờ nếu response có `Retry-After`.
- `5xx`/mất mạng: giữ dữ liệu form tại chỗ và cho thử lại.
- Mọi lỗi hỗ trợ phải hiển thị `request_id` để tra log.

---

## 7. Các luồng quan trọng

### 7.1. Đăng nhập và phiên

```text
/login → POST /auth/login → cookie phiên + cookie CSRF
       → GET /auth/me → vào Dashboard

Protected layout → không có/không hợp lệ → /login?next=...
Mutation → đọc ltv_csrf cookie → gửi x-csrf-token
401 giữa phiên → xóa cache nhạy cảm → về login
```

Không lưu JWT trong localStorage/sessionStorage. Query chứa inquiry và dữ liệu admin dùng
`no-store`; không ghi dữ liệu nhạy cảm vào log trình duyệt.

### 7.2. Tạo sản phẩm

```text
Sản phẩm → Tạo mới
→ bước tạo nhanh: Tên + Hãng + Danh mục chính
→ POST tạo draft và nhận id
→ trang chỉnh sửa đầy đủ
→ Thông tin → Nội dung → Phân loại → Thông số → Media/Tài liệu → Liên quan → SEO
→ Lưu nháp
→ Kiểm tra xuất bản
→ Xuất bản
```

Form sản phẩm dùng section navigation, không dùng wizard tuyến tính: người kỹ thuật cần
nhảy nhanh giữa tiêu chuẩn, thông số và nội dung. Các mảng quan hệ chỉ được gửi khi section
đó thực sự thay đổi để giữ đúng ADR-008.

### 7.3. Nội dung có hai ngôn ngữ

```text
Tạo entity cha → mở tab VI/EN
→ mỗi tab có dirty state + trạng thái riêng
→ PATCH /translations/:locale
→ publish/hide bằng trường status của đúng translation
```

Badge list: `VI Đã xuất bản`, `VI Nháp`, `VI Thiếu`, tương tự EN. Không dùng cờ quốc gia.

### 7.4. Yêu cầu khách hàng

```text
Danh sách ưu tiên: chưa xử lý trước, mới nhất trước
→ xem thông tin liên hệ, nguồn, sản phẩm/dịch vụ, message và email_status
→ gọi điện/gửi email bằng ứng dụng hệ thống
→ “Đánh dấu đã liên hệ”
```

Không có ghi chú, người phụ trách, pipeline hoặc báo giá. `email_failed` phải có cảnh báo
nổi bật vì đây là trường hợp DB còn yêu cầu nhưng email vận hành có thể không đến.

### 7.5. Media

```text
Upload → kiểm tiến độ/lỗi → cập nhật alt/title → chọn dùng
Xóa → GET detail/usage → 0 nơi dùng: xác nhận → DELETE
                         → đang dùng: chặn và liệt kê nơi dùng
```

Media Picker tái sử dụng trong sản phẩm, nội dung, banner, khách hàng và văn phòng.

---

## 8. Route của admin app

Admin chạy trên subdomain riêng nên URL không cần tiền tố `/admin`:

```text
/login                         /forgot-password
/reset-password               /setup
/
/inquiries                    /inquiries/[id]
/products                     /products/new              /products/[id]
/catalog/categories           /catalog/categories/[id]
/catalog/brands               /catalog/brands/[id]
/catalog/standards            /catalog/standards/[id]
/catalog/applications         /catalog/applications/[id]
/catalog/industries           /catalog/industries/[id]
/content/pages                /content/pages/[id]
/content/services             /content/services/[id]
/content/projects             /content/projects/[id]
/content/posts                /content/posts/[id]
/content/post-categories      /content/post-categories/[id]
/media                        /media/[id]
/documents                    /documents/[id]
/website/homepage
/website/customers            /website/customers/[id]
/website/offices              /website/offices/[id]
/website/menus                /website/menus/[id]
/redirects                    /redirects/[id]
/settings/[group]
/users                        /users/[id]
/account                      /account/password
```

Route `new` chỉ dùng khi cần bước tạo nhanh. Sau khi backend trả UUID, thay URL bằng route
chỉnh sửa để refresh không tạo bản ghi trùng.

---

## 9. Cấu trúc mã dự kiến

```text
admin/
  package.json
  next.config.mjs
  postcss.config.mjs
  tsconfig.json
  vitest.config.ts
  src/
    app/
      (auth)/
      (protected)/
      globals.css
    components/
      shell/                 AdminShell, Sidebar, Header, MobileNavigation
      ui/                    Button, Field, Dialog, Toast, Badge, Skeleton
      data-table/            DataTable, FilterBar, Pagination, RowActions
      forms/                 FormSection, SaveBar, SlugField, PublishPanel
      content-editor/        BlockEditor, BlockToolbar, block views
      media/                 MediaGrid, MediaPicker, UploadQueue, UsagePanel
      relations/             RelationSelector, TaxonomySelector, TreeSelector
    features/
      auth/ inquiries/ products/ taxonomy/ content/ media/ site/ settings/
    lib/
      api/
        client.browser.ts    GET/POST/PATCH/DELETE, FormData, timeout, CSRF
        client.server.ts     forward cookie, no-store
        envelope.ts
        errors.ts
      auth/
      routes.ts
      query-keys.ts
      dictionaries/vi.ts
  test/
```

Mỗi feature chứa `api.ts`, `schema.ts`, component và test riêng; page chỉ ghép feature.
Không component nào tự gọi `fetch`.

### Thư viện đề xuất

- Tailwind CSS: cùng ngôn ngữ thiết kế với frontend công khai.
- TanStack Query: cache dữ liệu admin, mutation và invalidation có kiểm soát.
- React Hook Form + Zod resolver: form dài và lỗi theo trường.
- TanStack Table: DataTable headless, không khóa thiết kế.
- Lucide: icon nhất quán và có nhãn accessibility.
- dnd-kit: chỉ đưa vào khi làm reorder block/menu; không cần ở A1.

Không dùng UI kit nặng làm thay đổi markup ngoài kiểm soát. Component nền được dựng một
lần ở A1 và tái sử dụng toàn bộ A2–A5.

---

## 10. Lớp mở khóa backend/contracts cho admin

Controller CRUD đã phủ phần lớn nghiệp vụ. Các read-model quan trọng phải được cung cấp từ
backend; frontend không được bù bằng N+1. Trạng thái dưới đây là baseline sau đợt triển khai
ngày 2026-08-11.

| Hạng mục | Trạng thái hiện tại | Việc còn lại |
|---|---|---|
| Origin quản trị | Đã có `ADMIN_SITE_URL`; worker tạo link `/reset-password` từ origin admin; production kiểm HTTPS/origin thuần; admin app chạy origin riêng cổng 3002 | Xác nhận domain production trước khi triển khai |
| Hợp đồng admin | Đã có nhóm list view dùng chung, trạng thái entity, translation summary, publish-check và detail/write contract A2 cho taxonomy, sản phẩm, tài liệu, media | Bổ sung detail/write view nội dung/site theo A3–A4; loại dần các response `unknown` còn lại |
| Dashboard | Đã có `GET /admin/dashboard`, shared contract, count nội dung, inquiry/email health và recent metadata đã sanitize | Mở rộng biểu đồ chỉ khi có nhu cầu vận hành thực tế |
| Danh sách content | Đã có `AdminContentListItemView`, một query lấy VI/EN, tiêu đề ưu tiên, slug và thời gian | Dùng contract này trong bảng/selector của admin app |
| Tìm content | Đã có `q`, `locale`, `translation_status` và parent status | Bổ sung sort nếu UX từng màn cần ngoài mặc định cập nhật mới nhất |
| Danh sách sản phẩm | Đã có brand, primary category, thumbnail, status, deleted state và lọc `category_id` trong một read-model | Xác nhận thêm sort khi có nhu cầu thực tế |
| Danh sách taxonomy | Đã có parent label/slug, thumbnail, product count, search chung và đã dùng cho màn taxonomy/selector A2 | Tái sử dụng cho A3–A4 |
| Publish preflight | Đã có `POST /admin/publish-check` dùng chung `PublishService`; đã gắn vào product, brand và document A2 | Gắn vào các form dịch vụ/dự án/bài viết/trang ở A3; endpoint publish vẫn là lớp kiểm tra cuối |
| Relation selector | Component tìm/chọn, primary invariant và MediaPicker đã hoàn thành trong A2, không gọi detail từng hàng | Tái sử dụng cho nội dung/site ở A3–A4 |
| Preview draft | Public API cố ý không trả draft | P0 render preview trong admin từ admin detail; exact public preview để P1 |
| Delete semantics | Office/banner/menu xóa vĩnh viễn, tài liệu cũ nói soft delete chung | Giữ semantics hiện tại nhưng UI phải phân biệt rõ; chỉ thêm migration nếu DN muốn thùng rác |
| Settings | API trả key/value an toàn nhưng không có label/control metadata | Admin có registry cho các key đã biết; key lạ nằm trong “Nâng cao” |
| Health | `/health/ready` không phải dashboard contract | Dashboard endpoint chỉ trả trạng thái tối thiểu, không lộ host/secret |
| Banner → public | Public banner view đã trả desktop/mobile media URL; hero chọn banner đang active và có fallback tĩnh an toàn | A4 xây form/banner picker và invalidation sau mutation |
| Menu → public | Public menu đã mang `label_i18n_key`; header/mobile/footer resolve dictionary theo locale và fallback nhãn DB | A4 xây tree editor/reorder và invalidation sau mutation |

Các kiểu tối thiểu cần thêm vào contracts:

```text
AdminUserView, AdminSessionView, AdminEntityStatus
AdminDashboardView
AdminProductListItemView, AdminProductDetailView
AdminTaxonomyListItemView + các detail view
AdminContentListItemView, AdminContentDetailView, AdminTranslationView
AdminDocumentView, AdminCustomerView, AdminOfficeView, AdminBannerView
AdminMenuView, AdminSettingView, AdminRedirectView
InquiryView và MediaAdminView đã tồn tại — tiếp tục dùng
```

Quy tắc: controller phải khai báo kiểu trả về có tên; admin frontend không dùng `any`,
`unknown as`, hoặc sao chép thủ công hợp đồng backend.

### 10.1. Luồng dữ liệu banner và menu công khai

```text
Admin mutation
  -> bảng banners/menu_items
  -> public SiteService read-model + cache
  -> SiteBootstrapView
  -> Home hero hoặc Header/Mobile/Footer
```

- Banner công khai chỉ được chọn khi đúng cửa sổ `starts_at`/`ends_at`, đang `public` và
  không bị vô hiệu hóa. Desktop dùng `image_url`, mobile ưu tiên `mobile_image_url`.
- Menu ưu tiên dịch `label_i18n_key` từ dictionary của locale hiện tại; nếu key thiếu hoặc
  không hợp lệ thì dùng `label` lưu trong DB, vì vậy cấu hình lỗi không làm mất navigation.
- Site cache hiện có TTL; A4 phải invalidation đúng key sau mutation để thay đổi hiển thị
  ngay, không yêu cầu người vận hành đợi TTL.

---

## 11. Kế hoạch A1–A5

### A1 — Nền quản trị, auth và hợp đồng

**Trạng thái:** hoàn thành ngày 2026-08-11. Workspace `@ltv/admin`, dashboard backend và các
shared contract đã được triển khai; kiểm thử chi tiết nằm trong
[`22_BAO_CAO_HOAN_THANH_ADMIN_A1.md`](22_BAO_CAO_HOAN_THANH_ADMIN_A1.md).

**Mục tiêu:** đăng nhập an toàn, vào được shell admin, các component nền đủ để những phase
sau chỉ tập trung nghiệp vụ.

**Backend/contracts**

- Nhóm admin list contracts/read-model và publish preflight đã có; tiếp tục detail/write
  contracts và dashboard read-model.
- Bổ sung `GET /admin/dashboard`.
- Ghim quy ước lỗi field, conflict details và response envelope bằng test.
- Đối chiếu mọi endpoint admin trong `API_ENDPOINTS` với controller.

**Admin app**

- Scaffold workspace `admin`, cổng 3002, proxy API/media.
- Client server/browser; CSRF double-submit; timeout; FormData; 204 response.
- `/setup`, login, forgot/reset/change password, logout, session gate.
- AdminShell, Sidebar, Header, breadcrumb, PageHeader.
- Button, Field, Select, Checkbox, Dialog, Toast, StatusBadge.
- DataTable, FilterBar, Pagination, Empty/Error/Loading state.
- Dashboard thật; không đặt số liệu giả.
- `run-admin.cmd` và script root `dev:admin`.

**Test bắt buộc**

- Không lưu token vào web storage.
- Mutation thiếu/sai CSRF bị 403 và UI không retry.
- 401 giữ `next` URL; login thành công quay lại đúng trang.
- Logout/change password xóa phiên.
- Keyboard/focus cho sidebar, dialog, menu tài khoản.
- Dashboard không lộ secret/PII.

**Xong khi:** admin có thể khởi tạo, đăng nhập, điều hướng, xem dashboard và đăng xuất trên
desktop/mobile; typecheck/lint/test/build đều xanh.

### A2 — Media, taxonomy và sản phẩm

**Trạng thái:** hoàn thành ngày 2026-08-11. Chi tiết triển khai, lỗi route đã sửa và bằng chứng
kiểm thử nằm trong [`23_BAO_CAO_HOAN_THANH_ADMIN_A2.md`](23_BAO_CAO_HOAN_THANH_ADMIN_A2.md).

**Mục tiêu:** nhập được catalogue thật từ đầu đến cuối. Đây là phase giá trị cao nhất.

**Thứ tự bên trong**

```text
Media → Hãng/Danh mục/Tiêu chuẩn/Ứng dụng/Ngành → Sản phẩm → Tài liệu
```

**Màn hình/component**

- Media grid/list, upload queue, metadata, usage panel, MediaPicker.
- Taxonomy list/form; TreeSelector cho hãng và danh mục; ứng dụng hiển thị phẳng.
- Cảnh báo đổi parent làm thay đổi toàn nhánh.
- Product list read-model, filter trạng thái/hãng/danh mục/search.
- Quick create product rồi chuyển sang form section-based.
- Editors cho standards, specifications, applications/industries, media, related products.
- PublishPanel ánh xạ lỗi backend về section.
- Document list/form và liên kết sản phẩm/hãng/dịch vụ/bài viết.

**Quy tắc sản phẩm**

- Một ngôn ngữ kỹ thuật; không tab VI/EN.
- Đúng một danh mục chính trong tập categories.
- Đúng tối đa một ứng dụng chính.
- Featured image tách khỏi `product_media`; gallery không có role `featured`.
- PATCH relation có mặt là thay cả tập; form phải giữ snapshot và chỉ gửi tập đã đổi.
- MediaPicker không cho chọn PDF vào trường ảnh.

**Test bắt buộc**

- Tạo draft tối thiểu, cập nhật toàn bộ section, publish/hide/restore.
- Đổi quan hệ không làm mất tập khác không gửi trong PATCH.
- Chặn hai category chính/primary không thuộc tập.
- Media đang dùng không xóa được và liệt kê usage.
- Upload sai MIME/magic bytes/size hiển thị lỗi đúng.
- Không N+1 khi tải bảng 100 sản phẩm.

**Xong khi:** admin có thể tạo một sản phẩm hoàn chỉnh bằng dữ liệu thật, upload ảnh,
gắn taxonomy/tài liệu và xuất bản; frontend công khai nhìn thấy kết quả.

### A3 — Nội dung có bản dịch và block editor

**Trạng thái:** hoàn thành ngày 2026-08-11. Chi tiết triển khai và bằng chứng kiểm thử nằm
trong [`24_BAO_CAO_HOAN_THANH_ADMIN_A3.md`](24_BAO_CAO_HOAN_THANH_ADMIN_A3.md).

**Mục tiêu:** quản trị được pages, services, projects và posts theo VI/EN độc lập.

**Công việc**

- Admin content read-model có title/name và badge translation.
- Danh sách/trình chỉnh sửa Trang, Dịch vụ, Dự án, Bài viết, Danh mục bài viết.
- LanguageTabs chỉ cho bốn entity có translation.
- BlockEditor theo schema `doc/11`: heading, paragraph, list, image, gallery, table,
  external video, file, callout, divider.
- Reorder block bằng bàn phím và pointer; duplicate block chỉ nội bộ form.
- External video chỉ YouTube/Vimeo ID/URL hợp lệ.
- FAQ editor cho dịch vụ.
- Chế độ công khai khách hàng của dự án có cảnh báo mạnh.
- Preview nội bộ từ dữ liệu form chưa publish.
- RelationSelector dùng chung với catalogue/media.

**Spike bắt buộc trước editor đầy đủ**

Round-trip một tài liệu chứa mọi block:

```text
API ContentBlock[] → editor state → không sửa gì → ContentBlock[]
```

Kết quả phải deep-equal, giữ `id`, mark, link, media reference và thứ tự. Nếu phép thử này
không đạt, không triển khai editor diện rộng.

**Test bắt buộc**

- VI và EN lưu/publish/hide độc lập.
- Sửa EN không thay VI.
- Block round-trip không mất dữ liệu.
- Không tạo raw HTML hoặc iframe ngoài provider được duyệt.
- Slug đã publish đổi thì redirect được tạo và frontend URL cũ trả 301.
- System page không xóa được.

**Xong khi:** người biên tập có thể tạo nội dung hai ngôn ngữ, preview, publish riêng từng
ngôn ngữ và frontend công khai hiển thị đúng.

### A4 — Vận hành và cấu hình website

**Mục tiêu:** vận hành website hằng ngày không cần sửa code hoặc truy vấn DB.

**Công việc**

- Inquiry inbox: filter type/email status/handled, detail, mark handled.
- Homepage section: bật/tắt, giới hạn và cấu hình allowlist; không JSON editor thô.
- Banner list/form, thời gian hiển thị và media desktop/mobile.
- Khách hàng tiêu biểu với xác nhận quyền công khai.
- Văn phòng với map preview khi tọa độ hợp lệ.
- Menu tree, thêm/sửa item, reorder cơ bản, kiểm target theo link type.
- Footer UX ghép menu `footer_*` và settings công ty.
- Redirect list/form, loop/chain/conflict errors.
- Settings theo nhóm; secret luôn masked; không gửi lại `********` như giá trị mới.
- Tài khoản quản trị: danh sách, tạo, khóa/mở; chặn tự vô hiệu hóa nếu backend yêu cầu.

**Test bắt buộc**

- `email_failed` nổi bật và inquiry chưa xử lý đứng trước theo thiết kế.
- Mark handled không có ghi chú/trạng thái CRM ngoài phạm vi.
- Menu không tạo vòng lặp hoặc target chết.
- Redirect source=target/loop/chain hiển thị lỗi cụ thể.
- Cấu hình secret không bao giờ xuất hiện trong HTML/log/client cache.
- Homepage không cho key ngoài allowlist làm vỡ frontend.

**Xong khi:** admin kiểm soát được luồng yêu cầu và toàn bộ thành phần website vận hành
thường xuyên mà không chạm database.

### A5 — Nghiệm thu, bảo mật và khả dụng

**Mục tiêu:** chứng minh admin dùng được và an toàn, không chỉ “render được”.

**Trạng thái:** hoàn thành ngày 2026-08-11. Kết quả đo tại
[`26_BAO_CAO_NGHIEM_THU_ADMIN_A5.md`](26_BAO_CAO_NGHIEM_THU_ADMIN_A5.md), quy trình chạy lại tại
[`27_HUONG_DAN_VAN_HANH_ADMIN.md`](27_HUONG_DAN_VAN_HANH_ADMIN.md).

**Công việc**

- Responsive toàn bộ route; card-list mobile cho bảng rộng.
- Accessibility: keyboard, focus, label, live region, contrast, reduced motion.
- Error boundary, offline/retry có kiểm soát, session-expired flow.
- Performance budget cho route list và editor; virtualize media grid khi cần.
- Smoke admin chạy trên backend/PostgreSQL thật.
- Injection tests cho CSRF, auth gate, contract, unsaved guard, PATCH relation và secret mask.
- E2E hành trình sản phẩm/content/inquiry.
- Cập nhật README, script chạy, tài liệu vận hành và báo cáo nghiệm thu.

**Ngưỡng nghiệm thu đề xuất**

| Chỉ số | Ngưỡng |
|---|---:|
| Typecheck/lint/test/build | 100% đạt |
| Accessibility critical/serious | 0 |
| Console error trên hành trình smoke | 0 |
| List 100 hàng | không N+1, thao tác lọc không khóa UI |
| Mutation bị gửi trùng do double click | 0 |
| Form rời trang khi dirty mà không cảnh báo | 0 |
| Secret trong HTML/log/snapshot | 0 |
| Route protected truy cập không phiên | 100% bị chặn |

**Xong khi:** toàn bộ A1–A4 đạt trên môi trường thật, có báo cáo và không còn blocker P0.

---

## 12. Thứ tự và điểm mở khóa

```text
A1 ──> A2 ──> A3 ──> A4 ──> A5
       │       │       │
       │       │       └─ website vận hành không cần DB
       │       └───────── nội dung thật VI/EN
       └───────────────── catalogue và ảnh thật
```

A2 đi trước A3 vì MediaPicker, RelationSelector, form pattern và publish panel đều được A3
tái sử dụng. A4 đi sau vì trang chủ/menu phải chọn các nội dung đã quản trị được.

---

## 13. Luật kiến trúc ép bằng test

1. Không `fetch` ngoài `src/lib/api`.
2. Không token trong local/session storage.
3. Mọi mutation tự động gửi CSRF từ cookie và không retry mù.
4. Mọi route nằm trong manifest admin; sidebar chỉ dùng manifest.
5. Dữ liệu API dùng kiểu/schema từ `@ltv/contracts`, không `any`/cast kép.
6. Query admin luôn `no-store`; logout/401 xóa query cache.
7. Không raw HTML; content đi qua block schema/renderer.
8. Không chuỗi URL API viết rải rác; dùng endpoint helper.
9. Không N+1 ở DataTable/RelationSelector.
10. Secret masked không được hydrate hoặc log.
11. Status không truyền ý nghĩa chỉ bằng màu.
12. Mọi dialog giữ focus, Escape đóng khi an toàn và trả focus đúng chỗ.
13. Dirty form luôn có guard; mutation thành công mới reset dirty state.
14. Publish errors phải dẫn được đến section/trường tương ứng.
15. Xóa mềm và xóa vĩnh viễn phải có wording/confirmation khác nhau.

---

## 14. Quyết định cần doanh nghiệp xác nhận nhưng không chặn A1–A3

1. Thời hạn lưu inquiry — hiện vẫn `TBD`, không tự purge.
2. Người chịu trách nhiệm duyệt quyền công khai logo/tên khách hàng.
3. Có cho nhiều tài khoản admin cùng vai trò trong P0 hay chỉ tạo một tài khoản vận hành.
4. Admin production dùng `admin.ltvietnam.com.vn` hay một domain nội bộ khác.
5. Có cần thùng rác cho office/banner/menu hay chấp nhận delete vĩnh viễn như schema hiện tại.

Mặc định triển khai: nhiều tài khoản cùng vai trò `admin`, subdomain riêng, inquiry không
tự purge và office/banner/menu ưu tiên hide; delete vĩnh viễn chỉ nằm trong menu phụ.

---

## 15. Trạng thái triển khai và bước tiếp theo

A1–A5 đã hoàn tất ngày 2026-08-11. Admin đã có toàn bộ luồng auth, catalogue, nội dung song ngữ,
vận hành website và lớp nghiệm thu production. A5 xác nhận 72/72 responsive/E2E smoke, không có
console error, Lighthouse accessibility 100/100 trên bốn route, JavaScript lớn nhất 169/190 KiB,
full workspace test 725/725 và production build toàn workspace đạt.

Không còn phase code admin nào trong phạm vi A1–A5. Công việc tiếp theo là cấu hình hạ tầng
production, thay secret/SMTP/CAPTCHA thật và chốt hai quyết định nghiệp vụ còn mở về thời hạn lưu
inquiry và quyền công khai logo khách hàng. Thực hiện theo
[`27_HUONG_DAN_VAN_HANH_ADMIN.md`](27_HUONG_DAN_VAN_HANH_ADMIN.md).

Không dùng dữ liệu mock để che khoảng trống backend. Nếu màn hình cần thêm nhãn hoặc quan hệ,
phải mở rộng read-model/shared contract trước khi viết UI.
