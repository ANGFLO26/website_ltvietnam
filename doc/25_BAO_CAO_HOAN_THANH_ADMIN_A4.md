# Báo cáo hoàn thành Admin A4 — Vận hành và cấu hình website

**Ngày nghiệm thu:** 2026-08-11
**Phạm vi:** `@ltv/admin`, shared contracts, backend admin site/system/inquiry và public site cache
**Kết luận:** hoàn thành A4; sẵn sàng chuyển sang A5

## 1. Kết quả chính

A4 đã bổ sung các route vận hành:

```text
/inquiries
/inquiries/[id]
/website/homepage
/website/banners
/website/customers
/website/offices
/website/menus
/redirects
/settings
/users
```

- Inquiry inbox lọc loại yêu cầu, trạng thái email và trạng thái xử lý; chi tiết chỉ đọc và
  thao tác mark handled, không mở rộng thành CRM.
- Inquiry chưa xử lý đứng trước; trong cùng nhóm, `email_failed` đứng trước và có badge lỗi rõ ràng.
- Homepage dùng registry section/field allowlist, không cho nhập JSON thô.
- Banner chọn ảnh desktop/mobile, lịch bắt đầu/kết thúc và đích liên kết theo loại nội dung.
- Khách hàng nổi bật bắt buộc xác nhận quyền công khai tên/logo trước khi public/publish.
- Văn phòng quản lý thông tin liên hệ và chỉ hiện map preview khi có đủ cặp tọa độ hợp lệ.
- Menu hỗ trợ tạo menu, cây tối đa hai cấp, thêm/sửa/reorder item và chọn target bằng nhãn.
- Footer ghép menu `footer_*` và settings công ty trong cùng màn hình.
- Redirect hiển thị lỗi riêng cho loop, chain, route conflict và source conflict.
- Settings chia nhóm; secret không hydrate vào HTML và chuỗi `********` không được gửi lại.
- Tài khoản quản trị hỗ trợ danh sách, tạo, khóa/mở khóa; UI và backend chặn tự khóa, backend
  tiếp tục chặn vô hiệu hóa quản trị viên hoạt động cuối cùng.

## 2. Contract và invariant backend

- Thêm `admin.operations.ts` làm shared contract cho customer, office, banner, homepage,
  menu, settings, redirect và managed user.
- Homepage chỉ nhận các key đã công bố; `limit` trong 1–24 và `autoplay_ms` trong
  2.000–30.000 ms.
- Banner/menu enforce đúng bộ ba `link_type`, `link_target_id`, `custom_url`; URL tùy chỉnh
  chỉ nhận HTTPS hoặc đường dẫn nội bộ an toàn.
- Office yêu cầu latitude/longitude xuất hiện cùng nhau.
- Menu backend chặn self-cycle, parent khác menu, cấp sâu hơn hai và reorder thiếu/trùng item.
- Public read-model tiếp tục bỏ target chết; không phát menu link 404 ra frontend.
- Mutation homepage/banner/customer/office invalidates `home:*`; mutation menu invalidates
  `nav:*`. Hai prefix độc lập và dùng chung đúng cache instance của public SiteService.

## 3. UX và an toàn dữ liệu

- Các form dùng select/media picker theo nhãn thay vì bắt người vận hành nhập UUID.
- Mỗi danh sách có trạng thái bằng chữ, không truyền ý nghĩa chỉ qua màu.
- Form secret khởi tạo rỗng với hướng dẫn “để trống để giữ nguyên”; giá trị thật và cả chuỗi
  che không nằm trong DOM.
- Footer settings cũng áp cùng quy tắc omit secret, không có đường vòng gửi lại mask.
- Redirect source bị khóa khi edit vì API chỉ cho đổi target/type/status.
- Form banner tự xóa target không còn phù hợp khi đổi loại liên kết.
- Sidebar manifest đã mở toàn bộ route A4 và thêm mục Chuyển hướng URL.

## 4. Bằng chứng kiểm thử

| Cổng kiểm tra | Kết quả |
|---|---:|
| Contracts typecheck | pass |
| Backend typecheck/build | pass |
| Admin typecheck/build | pass |
| ESLint toàn workspace | pass |
| Toàn bộ admin tests | 22/22 pass |
| A4 + setting + user unit tests | 37/37 pass |
| PostgreSQL A4/site/menu/user integration | 57/57 pass |
| A4 cache invalidation test | 4/4 pass trong suite A4 cuối |
| Protected routes browser QA | 9/9 chuyển đúng về login với `next` |

PostgreSQL test xác nhận thứ tự thực tế là `Unhandled failed → Unhandled sent → Handled failed`.
Site integration xác nhận menu không phát target chết, customer logo giữ điều kiện quyền công khai
và các public read-model vẫn tương thích.

Production build cuối liệt kê đầy đủ mọi route A4 ở dạng dynamic server-rendered và không có lỗi
TypeScript/Next.js.

## 5. Browser QA và giới hạn có chủ ý

Backend/admin production được khởi động tạm trên cổng 3001/3002. Trình duyệt xác nhận trang login
có nhãn form truy cập được và cả chín route A4 đều bị auth gate chuyển về đúng
`/login?next=...`. Các tiến trình tạm đã được dừng sau kiểm tra.

Workspace không có phiên hoặc mật khẩu tài khoản thử dành cho browser QA. Không tạo, reset hoặc
thay đổi tài khoản thật chỉ để vượt auth gate. E2E authenticated trên tài khoản test cô lập được đưa
vào A5; phần sau đăng nhập của A4 hiện đã được bao phủ bằng component test, contract test,
PostgreSQL integration, typecheck, lint và production build.

## 6. Bước tiếp theo

Tiếp tục **A5 — Nghiệm thu, bảo mật và khả dụng**: E2E authenticated, responsive/accessibility,
session-expired/CSRF/unsaved guard, performance và báo cáo nghiệm thu toàn bộ A1–A5.
