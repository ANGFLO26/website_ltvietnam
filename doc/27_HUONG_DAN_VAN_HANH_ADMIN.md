# Hướng dẫn vận hành và nghiệm thu Admin

**Cập nhật:** 2026-08-11
**Phạm vi:** Admin A1–A5 tại `http://localhost:3002`

## 1. Điều kiện môi trường

- Node.js 22–24, pnpm 10, PostgreSQL đã chạy và đủ 38 migration.
- `.env` có `ADMIN_SITE_URL=http://localhost:3002`, `INTERNAL_API_URL` trỏ tới backend và
  `INQUIRY_RECIPIENT` là một email hợp lệ.
- Không dùng tài khoản hoặc dữ liệu production cho smoke test.

Khởi động ở ba terminal riêng:

```powershell
.\run-backend.cmd
.\run-admin.cmd
.\run-frontend.cmd
```

Các URL mặc định:

- Website công khai: `http://localhost:3000`
- Backend: `http://localhost:3001/api/v1`
- Admin: `http://localhost:3002`

## 2. Quality gate không cần server

```powershell
pnpm build:packages
pnpm --filter @ltv/admin typecheck
pnpm --filter @ltv/admin lint
pnpm --filter @ltv/admin test
pnpm --filter @ltv/admin build
pnpm quality:admin
```

`quality:admin` đọc production build và dừng với exit code 1 nếu thiếu route hoặc một route
vượt 190 KiB JavaScript gzip.

## 3. Smoke có xác thực trên PostgreSQL thật

Dùng riêng một tài khoản tạm. Fixture chỉ xóa đúng user, inquiry và các sản phẩm/nội dung do
user đó tạo; không xóa dữ liệu khác.

```powershell
$env:ADMIN_SMOKE_EMAIL='a5-e2e@ltvietnam.local'
$env:ADMIN_SMOKE_PASSWORD='<mật-khẩu-test-dài-tối-thiểu-12-ký-tự>'

pnpm e2e:admin:create
node scripts/smoke-admin-responsive.mjs --output .tmp/admin-responsive.json
node scripts/measure-admin-quality.mjs --output .tmp/admin-lighthouse.json
pnpm e2e:admin:cleanup
```

Luôn chạy cleanup trong `finally` của quy trình CI, kể cả khi smoke thất bại. Không ghi mật khẩu
vào file, command được commit, log hoặc báo cáo. Hai script chỉ đọc credential từ môi trường và
không đưa cookie/credential vào JSON kết quả.

Smoke kiểm:

- route protected chuyển về `/login?next=...` khi không có phiên;
- đăng nhập thật, tạo draft sản phẩm, tạo draft page và xử lý inquiry fixture;
- 16 route đại diện ở 390/768/1024/1440 px, không tràn ngang và mỗi trang có đúng một `h1`;
- bảng có nhãn card-list trên mobile;
- focus trap/return của menu mobile, dirty-form guard và session-expired gate;
- không có `console.error` hoặc `pageerror` trong hành trình;
- Lighthouse cho login, product list, product create và content create với ngưỡng A11y 100,
  LCP ≤ 2.5 giây và CLS ≤ 0.1.

Nếu cơ sở dữ liệu chưa có hãng/danh mục, chạy `pnpm db:seed:demo` trước smoke sản phẩm.

## 4. Quy tắc vận hành

- Mutation không tự retry; khi offline, admin hiển thị live status và giữ form để người dùng
  chủ động gửi lại.
- Hai mutation giống hệt nhau đang chạy được gộp ở API client; payload khác nhau không bị gộp.
- Khi API trả 401, private query cache bị xóa và trình duyệt chuyển về login với `next` nội bộ.
- Form dirty cảnh báo trước khi rời trang. Sau khi lưu thành công, baseline được cập nhật; secret
  input được xóa khỏi state trình duyệt.
- Không nhập lại chuỗi mask `********`; để trống nghĩa là giữ secret hiện tại.
- Không sửa database trực tiếp cho các thao tác đã có trên admin.

## 5. Sự cố thường gặp

| Hiện tượng | Kiểm tra |
|---|---|
| Backend báo `INQUIRY_RECIPIENT: Invalid email` | Đặt email hợp lệ trong `.env`, không để placeholder không hợp lệ. |
| Admin quay về login liên tục | Kiểm `COOKIE_NAME`, backend port, `INTERNAL_API_URL` và thời gian hệ thống. |
| Mutation trả 403 CSRF | Tải lại trang để nhận cookie CSRF mới; không retry mù request cũ. |
| Smoke không có option hãng/danh mục | Chạy `pnpm db:seed:demo`. |
| Lighthouse không đo route authenticated | Đặt cả `ADMIN_SMOKE_EMAIL` và `ADMIN_SMOKE_PASSWORD`. |
| Vitest/Next báo `spawn EPERM` trên Windows | Cho phép Node/esbuild tạo child process hoặc chạy terminal với policy phù hợp. |

## 6. Trước production

- Dùng HTTPS cho `ADMIN_SITE_URL`, `COOKIE_SECURE=true` và `COOKIE_SAME_SITE` đúng topology.
- Thay toàn bộ secret local, cấu hình SMTP/CAPTCHA thật và không dùng fixture A5.
- Chạy full `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, smoke API/admin/frontend.
- Chốt thời hạn lưu inquiry và người duyệt quyền công khai logo khách hàng; đây vẫn là hai quyết
  định nghiệp vụ ngoài phạm vi code A5.
