# Báo cáo nghiệm thu Admin A5

**Ngày:** 2026-08-11
**Phạm vi:** bảo mật, khả dụng, responsive, accessibility, performance và smoke A1–A5
**Trạng thái:** hoàn tất — không còn blocker P0

## 1. Kết quả triển khai

- Thêm global error boundary và thông báo offline bằng live region.
- Query chỉ retry một lần cho lỗi mạng/408/5xx; lỗi 4xx không retry, mutation không retry.
- Gộp hai mutation JSON giống hệt đang chạy theo fingerprint không chứa payload/secret; request
  khác payload vẫn được gửi độc lập.
- Dialog và drawer mobile có focus trap, Escape, `aria-modal` và trả focus về nút mở.
- Dirty guard được phủ cho editor catalogue/content, quick-create và các form vận hành A4;
  Settings/Footer cập nhật baseline sau save và xóa secret đã nhập khỏi client state.
- Giữ card-list mobile cho bảng, focus-visible và reduced-motion toàn hệ thống.
- Thêm budget, Lighthouse, responsive/E2E script và fixture tài khoản PostgreSQL có cleanup chính xác.

## 2. Bằng chứng tự động hiện có

| Gate | Kết quả |
|---|---:|
| Admin typecheck | Đạt |
| Admin lint | Đạt |
| Admin Vitest | 30/30 đạt |
| Admin production build | Đạt, 34 route |
| JavaScript budget | Đạt; lớn nhất 169.0/190 KiB gzip |
| Full workspace test với PostgreSQL | 725/725 đạt |
| Full workspace production build | Đạt |
| `git diff --check` | Đạt |

## 3. Phép đo môi trường thật

| Gate | Kết quả |
|---|---:|
| Migration/PostgreSQL | 38/38 đã apply |
| Integration/security mục tiêu | 46/46 đạt |
| Media regression | 9/9 đạt |
| Admin list `page_size=100` / N+1 | 1 SQL, đạt |
| Responsive 4 viewport × 16 route | 64/64 đạt; tổng smoke 72/72 |
| E2E product/content/inquiry | 3/3 hành trình đạt |
| Accessibility critical/serious | 0; Lighthouse 100/100 cả 4 route |
| Console/page error | 0 |

Lighthouse production:

| Route | Performance | Accessibility | LCP | CLS |
|---|---:|---:|---:|---:|
| `/login` | 99 | 100 | 1.979 s | 0.000 |
| `/products` | 94 | 100 | 2.356 s | 0.000 |
| `/products/new` | 98 | 100 | 2.302 s | 0.000 |
| `/content/pages/new` | 94 | 100 | 2.209 s | 0.000 |

Kiểm tra trực quan trong in-app browser xác nhận dashboard và form tạo sản phẩm hiển thị đúng,
có heading/trường bắt buộc và không có console error.

## 4. Đối chiếu ngưỡng A5

| Chỉ số | Cách bảo vệ |
|---|---|
| Double mutation = 0 | Pending-map theo method/path/fingerprint và test payload giống/khác. |
| Dirty form mất dữ liệu = 0 | `beforeunload`, bắt link nội bộ và baseline reset sau save. |
| Secret lộ client = 0 | Mask contract, không hydrate `********`, xóa secret input sau save. |
| Protected route bị lọt = 0 | Middleware allowlist chỉ gồm bốn route auth; smoke không cookie. |
| List không N+1 | Admin read-model gom relation/count trong một SQL; integration đếm query. |
| A11y nghiêm trọng = 0 | Lighthouse 100 + keyboard/focus smoke. |

## 5. Lỗi tìm thấy và đã sửa trong nghiệm thu

1. Query từng retry cả lỗi 4xx — đổi sang chỉ retry một lần cho network/408/5xx.
2. Dialog/drawer chưa trap Tab đầy đủ và chưa luôn trả focus — đã sửa và thêm test.
3. Double-click có thể gọi cùng mutation hai lần — thêm fingerprint pending không chứa secret.
4. Form vận hành A4 và quick-create chưa đủ dirty guard — phủ toàn bộ và reset baseline sau save.
5. Toast có ARIA không hợp lệ, link “Xem website” mất accessible name trên mobile và muted text
   thiếu contrast — sửa tới Lighthouse 100/100.
6. Seed F4 tạo row ảnh nhưng không tạo file, gây 404 console — seed JPEG thật; đường legacy chỉ
   được mở trong public directory và có regression test.
7. Thiếu favicon gây 404 — thêm icon SVG và route favicon tương thích.
8. Kịch bản smoke ban đầu bị chính beforeunload giữ bước session-expired — sửa script chấp nhận
   cảnh báo ở lần rời trang có chủ đích; ứng dụng không thay đổi hành vi bảo vệ.
9. Integration test navigation tạo 205 sản phẩm dùng timeout mặc định 5 giây, có thể bị ngắt và để
   các ca sau đọc fixture chưa cleanup khi chạy full suite — đặt timeout riêng 20 giây; full suite
   hiện đạt 725/725 và fixture lỗi đã được xóa chính xác theo tag.

## 6. Tệp và lệnh vận hành

- Cấu hình: `admin/admin-quality.config.json`
- Budget: `scripts/check-admin-budgets.mjs`
- Lighthouse: `scripts/measure-admin-quality.mjs`
- Responsive/E2E: `scripts/smoke-admin-responsive.mjs`
- Fixture: `backend/scripts/admin-e2e-fixture.ts`
- Runbook: `doc/27_HUONG_DAN_VAN_HANH_ADMIN.md`

Fixture A5 đã được cleanup sau phép đo; credential/cookie không xuất hiện trong JSON hoặc báo cáo.
