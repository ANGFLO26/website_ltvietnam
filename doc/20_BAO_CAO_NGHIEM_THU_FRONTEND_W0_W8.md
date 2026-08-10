# Báo cáo nghiệm thu frontend công khai W0–W8

**Ngày nghiệm thu:** 2026-08-10  
**Phạm vi:** frontend công khai EN/VI từ W0 đến W8  
**Kết luận:** **Đạt** — không còn blocker mã nguồn cho frontend công khai.

---

## 1. Kết quả tổng hợp

| Hạng mục | Kết quả |
|---|---:|
| Route manifest | 26/26 route `done`, tương ứng 41 `page.tsx` |
| Frontend test | 64/64 xanh |
| Tiêm lỗi W8 | 8/8 phát hiện đúng lỗi được cố ý đưa vào |
| SEO crawler | 380/380 phép kiểm |
| Responsive/runtime | 11/11 phép kiểm |
| Typecheck · lint · format | Đạt |
| Production build | Đạt |
| Monorepo test chuẩn | 319 bài đạt; 349 integration DB bỏ qua đúng cấu hình mặc định |

## 2. Ngân sách JavaScript

Lệnh `pnpm quality:web` đọc trực tiếp `frontend/.next/app-build-manifest.json`, nén gzip
từng tập chunk thực của mỗi route và thất bại nếu vượt ngưỡng.

| Số route đã đo | Ngưỡng | Route lớn nhất | Kết quả lớn nhất |
|---:|---:|---|---:|
| 41 | 150 KiB gzip | `/products/[slug]` | 133,8 KiB gzip |

Các route `/services`, `/services/[slug]` và bản VI dùng cùng bundle lớn nhất nhưng vẫn còn
16,2 KiB khoảng an toàn.

## 3. LCP, CLS và accessibility

Lệnh `pnpm measure:web` chạy Lighthouse trên Chrome headless với mobile 390 × 844 và chế
độ throttling mô phỏng.

| Trang | LCP | Ngưỡng LCP | CLS | Ngưỡng CLS | Performance | Accessibility |
|---|---:|---:|---:|---:|---:|---:|
| Trang chủ | 1.892 ms | 2.500 ms | 0,000 | 0,100 | 99/100 | 100/100 |
| Chi tiết OptiDist 2 | 1.964 ms | 2.500 ms | 0,000 | 0,100 | 99/100 | 100/100 |

Lighthouse ban đầu phát hiện ba lỗi thật và cả ba đã được sửa:

1. tiêu đề banner dùng màu link xanh trên nền tối;
2. link hãng trong đoạn văn chỉ phân biệt bằng màu;
3. chip tiêu chuẩn có vùng chạm nhỏ hơn yêu cầu.

## 4. Responsive và bàn phím

`pnpm smoke:responsive` chạy Chrome thật trên trang chủ và chi tiết sản phẩm tại bốn mốc:

| Mốc | Kích thước | Tràn ngang |
|---|---:|---:|
| Mobile | 390 × 844 | Không |
| Tablet | 768 × 1024 | Không |
| Desktop | 1024 × 768 | Không |
| Wide | 1440 × 900 | Không |

Ba luồng tương tác bổ sung đều đạt:

- menu mobile đóng bằng `Esc`, cập nhật `aria-expanded` và trả focus về nút mở;
- Tab đi qua toàn bộ menu desktop, gồm các link trong mega menu sau khi mở;
- modal báo giá giữ vòng Tab bên trong, đóng xong trả focus về đúng CTA.

Breakpoint menu desktop được chuyển từ 768 px lên 1024 px sau khi phép đo phát hiện header
tràn 3 px đúng tại mốc tablet.

## 5. Ảnh và chuyển động

- mọi ảnh nội dung tiếp tục dùng `next/image`;
- bật định dạng đầu ra AVIF và WebP;
- khai báo `sizes` cho gallery và content block;
- chỉ ảnh chính có `priority`, ảnh còn lại dùng lazy load mặc định;
- `prefers-reduced-motion: reduce` rút ngắn animation/transition;
- focus ring có tỷ lệ tương phản tối thiểu 3:1 trên nền trắng.

## 6. Chứng minh test không rỗng

`pnpm inject:web` dùng chung `scripts/lib/inject-harness.mjs`, lần lượt phá tám bảo đảm:

1. phím `Esc` của menu mobile;
2. `aria-expanded` của menu mobile;
3. trả focus của modal;
4. vòng Tab của modal;
5. tương phản focus ring;
6. reduced motion;
7. cấu hình AVIF/WebP;
8. trần ngân sách JavaScript.

Cả 8/8 lần, bài kiểm tương ứng chuyển từ xanh sang đỏ; sau hoàn tác, checksum nguồn khớp
ban đầu.

## 7. Các lệnh nghiệm thu

```text
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm --filter @ltv/frontend build
pnpm quality:web
pnpm measure:web
pnpm smoke:responsive
pnpm inject:web
pnpm smoke:web
```

## 8. Việc còn lại trước khi lên sóng

Không còn blocker mã nguồn frontend công khai. Ba việc còn lại thuộc nội dung/vận hành:

- cung cấp ảnh thật và duyệt mô tả kỹ thuật sản phẩm;
- cấu hình ảnh Open Graph cấp site;
- cấu hình môi trường production, reverse proxy/CDN và quy trình triển khai.

Giao diện quản trị A1–A5 là track riêng, không chặn việc đưa frontend công khai lên sóng.
