# Báo cáo hoàn thành giao diện quản trị A1

> Ngày nghiệm thu: 2026-08-11
> Phạm vi: nền quản trị, xác thực, dashboard và component dùng chung
> Kết luận: **A1 hoàn thành; đủ điều kiện bắt đầu A2**

---

## 1. Kết quả

A1 cung cấp một ứng dụng Next.js quản trị độc lập tại `admin/`, chạy mặc định trên cổng 3002.
Ứng dụng không dùng dữ liệu mock, không dùng chung middleware SEO của website công khai và không
lưu token vào web storage.

Các luồng đã hoàn thành:

- Khởi tạo quản trị đầu tiên, đăng nhập, quên mật khẩu, đặt lại mật khẩu, đổi mật khẩu và đăng xuất.
- Middleware và server session gate cho toàn bộ route bảo vệ; giữ `next` URL nội bộ và chặn open redirect.
- API client server/browser hỗ trợ response envelope, timeout, JSON, FormData, 204, cookie session
  và CSRF double-submit.
- AdminShell responsive với sidebar desktop/mobile, breadcrumb, liên kết website và account menu.
- Bộ component nền: button, field, select, checkbox, dialog, toast, status badge, table, filter,
  pagination và loading/empty/error state.
- Dashboard dùng dữ liệu thật từ backend; không chứa PII của inquiry.
- Publish preflight client gọi `POST /admin/publish-check`, không sao chép business rule backend.
- Script chạy `run-admin.cmd` và lệnh root `pnpm dev:admin`.

## 2. Backend và shared contracts

Đã bổ sung:

- `AdminSessionView`, `AdminUserView` và các schema request auth dùng chung.
- `AdminDashboardView` với count nội dung, tình trạng inquiry/email và danh sách recent đã sanitize.
- `GET /api/v1/admin/dashboard` qua controller, service và DAO read-model.
- `POST /api/v1/admin/publish-check` dùng chung `PublishService`.
- Registry API đạt **200/200 endpoint**: A1 **1/1**, F8 **137/137**.

Recent inquiry trên dashboard chỉ trả mã inquiry, thời điểm tạo, loại nguồn, trạng thái xử lý và
trạng thái email. Contract cố ý không có tên, email, số điện thoại, nội dung yêu cầu hoặc secret.

## 3. Bảo mật và hành vi phiên

- Cookie phiên tiếp tục do backend đặt `HttpOnly`; Admin không đọc hoặc sao chép token.
- Mutation tự lấy CSRF cookie và gửi header tương ứng; request FormData không tự đặt sai
  `Content-Type`.
- Mutation không retry tự động. Lỗi 403 giữ nguyên code, details và request ID để UI hiển thị.
- API trả 401 phát sự kiện hết phiên, xóa toàn bộ TanStack Query cache rồi chuyển về login.
- Logout xóa cache kể cả khi request logout gặp lỗi, sau đó chuyển về login.
- Mọi trang Admin có `noindex`, chống MIME sniffing và chặn nhúng bằng `frame-ancestors 'none'`.

## 4. Kiểm thử tự động

| Gate | Kết quả |
|---|---:|
| `pnpm test` toàn workspace | PASS — 342 test chạy và đạt; integration cần DB được tách riêng |
| Admin unit/component/architecture | PASS — 13/13 |
| Shared contracts | PASS — 39/39 |
| Inquiry/dashboard trên PostgreSQL thật | PASS — 21/21 |
| `pnpm typecheck` | PASS toàn workspace |
| `pnpm lint` | PASS, 0 lỗi |
| `pnpm format:check` | PASS |
| `pnpm build` | PASS packages + backend + admin + frontend + worker |

Production build Admin tạo thành công các route `/login`, `/setup`, `/forgot-password`,
`/reset-password`, `/dashboard`, `/account` và `/account/password`.

## 5. Kiểm tra trình duyệt thật

Đã chạy Admin production cùng backend/PostgreSQL local và kiểm tra bằng trình duyệt:

| Kịch bản | Kết quả |
|---|---|
| Mở `/dashboard` khi chưa có phiên | Chuyển đúng tới `/login?next=%2Fdashboard` |
| Mở `/account/password` khi chưa có phiên | Chuyển đúng tới `/login?next=%2Faccount%2Fpassword` |
| `/forgot-password`, `/reset-password`, `/setup` | Render đúng trạng thái và tiêu đề |
| Submit login rỗng | Hai field có `aria-invalid`, focus về email, thông báo tiếng Việt rõ ràng |
| Mobile 390 × 844 | Không tràn ngang; input 16 px, tránh tự zoom trên thiết bị di động |
| Desktop 1440 × 900 | Bố cục hai vùng đúng; form rộng 440 px và không tràn ngang |
| Console trình duyệt | Không có warning/error |
| Backend health | HTTP 200, `{"status":"ok"}` |
| Admin proxy gọi auth không có phiên | HTTP 401 đúng hợp đồng |
| Header bảo mật | Có noindex, nosniff và CSP chống nhúng |

Trong quá trình kiểm tra đã phát hiện và sửa hai thông báo validation thiếu dấu tiếng Việt. Sau
khi build lại, trình duyệt hiển thị đúng “Email không hợp lệ” và “Hãy nhập mật khẩu”.

## 6. Giới hạn có chủ đích

- Không nhập hoặc thay đổi mật khẩu tài khoản Admin hiện có chỉ để chạy browser smoke. Dashboard
  có phiên được kiểm chứng bằng component test, service test và PostgreSQL integration; luồng login
  end-to-end bằng credential thật nên được chạy ở A5 hoặc khi chủ hệ thống cung cấp tài khoản test.
- Các menu A2–A4 xuất hiện ở trạng thái “Sắp có”, không dẫn tới route chết.
- `PublishPreflightPanel` đã sẵn sàng nhưng chỉ gắn vào form entity thật trong A2–A4.

## 7. Bước tiếp theo

Thực hiện **A2 — Media, taxonomy và sản phẩm** theo thứ tự:

```text
Media Library → taxonomy/selector → sản phẩm → tài liệu → publish preflight → public verification
```

Mỗi màn A2 phải mở rộng shared detail/write contract trước nếu read-model hiện tại chưa đủ; không
bù khoảng trống backend bằng N+1 hoặc dữ liệu giả ở Admin.
