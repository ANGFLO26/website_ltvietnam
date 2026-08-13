# 30 — BÁO CÁO RÀ SOÁT TOÀN HỆ THỐNG & DỌN DẸP

**Ngày:** 2026-08-12
**Phạm vi:** backend · frontend · admin · worker · packages · tài liệu · dữ liệu
**Kết luận:** không phát hiện lỗi logic nghiệp vụ. Tìm và sửa 4 vấn đề chất lượng, còn 1 nợ kỹ thuật đã khoanh vùng.

---

## 1. Các cổng kiểm tra

| Cổng | Kết quả |
|---|---|
| `pnpm typecheck` | ✅ 8/8 gói |
| `pnpm lint` | ✅ 0 lỗi (không cần ngoại lệ nào) |
| `pnpm build` | ✅ toàn bộ, kể cả production build của Next.js |
| `pnpm test` | ✅ 366 test |
| `pnpm test:db` | ✅ 563/563 test backend (kể cả tích hợp) |

---

## 2. Kiểm tra bảo mật — ĐẠT

Thực hiện trên hệ thống đang chạy thật, không phải đọc code.

| Phép thử | Kết quả |
|---|---|
| API quản trị khi chưa đăng nhập (`/admin/dashboard`, `/admin/products`, `/admin/inquiries`, `/admin/media`, `/admin/publish-check`) | **401** toàn bộ |
| Ghi/xoá khi chưa đăng nhập (`POST`, `DELETE /admin/products`) | **401** — không có đường vòng |
| Trang admin khi chưa đăng nhập (6 trang) | **307** → `/login?next=...` |
| Sản phẩm ở trạng thái nháp qua đường công khai | **404** — không rò rỉ |
| Danh sách công khai | chỉ trả 15 sản phẩm đã xuất bản (17 tổng) |
| SQL injection qua tham số lọc (`'; DROP TABLE ...`, `1 OR 1=1`, `%`) | xử lý như văn bản thường; bảng còn nguyên |

**Lưu ý:** chưa kiểm tra được luồng *sau khi đăng nhập* của admin vì hệ thống chưa có tài khoản nào. Việc tạo tài khoản quản trị đầu tiên phải do người dùng tự làm qua trang `/setup` — không nên nhờ công cụ tạo tài khoản hay nhập mật khẩu hộ.

---

## 3. Bốn vấn đề đã tìm ra và sửa

### 3.1 Test phụ thuộc dữ liệu môi trường (đã sửa)

`product-filter.integration.test.ts` khẳng định tìm ký tự `%` phải trả **0 kết quả**, tức ngầm giả định không sản phẩm nào chứa `%`. Giả định đó vô hiệu ngay khi nạp dữ liệu thật: mô tả ZyNthAir có cụm "nồng độ Oxy 20±0.05%".

Quan trọng: **mã nguồn không sai**. Nếu việc thoát ký tự hỏng thì phép tìm đã trả về toàn bộ 17 sản phẩm, không phải 1.

Đã đổi sang kiểm đúng bản chất — `%` không được hiểu là ký tự đại diện — thay vì so với một con số tuyệt đối.

### 3.2 Cạm bẫy làm hỏng dữ liệu thật (đã chặn)

`pnpm db:seed:demo` sẽ chèn 17 sản phẩm `DEMO-` vào catalogue đang chứa dữ liệu thật. Chúng mang tên thật (`OptiDist`, `HVM 472`) nhưng mọi đoạn mô tả đều là văn bản thay thế — nhìn qua rất khó phân biệt, và có thể bị dùng để báo giá.

Đã thêm chốt chặn trong `seed-demo.ts`: nếu phát hiện sản phẩm mã `LAB-`, script dừng lại kèm hướng dẫn. Đặt kiểm tra trong code chứ không chỉ ghi cảnh báo trong tài liệu — một dòng cảnh báo trong tài liệu không chặn được lệnh gõ nhầm.

### 3.3 63% test backend bị bỏ qua âm thầm (đã mở đường chạy)

`pnpm test` bỏ qua **356/563** test backend vì không nạp `DATABASE_URL`. Việc bỏ qua là cố ý (để chạy được trên máy không có DB) nhưng trước đây **không có lệnh nào** để chạy chúng — người mới vào dự án không biết chúng tồn tại.

Đã thêm `pnpm test:db`. Chạy đủ 563/563.

### 3.4 Script không chạy được (đã xoá)

`doc/data/lab-products/tools/build_docx.js` cần `docx` + `image-size` (không phải phụ thuộc của dự án) và một thư mục `images/` không có trong repo — tức là **không thể chạy**. Nó cũng là lý do duy nhất khiến `eslint.config.mjs` phải thêm một mục loại trừ.

Đã xoá script và gỡ luôn ngoại lệ eslint. `pnpm lint` vẫn xanh, và giờ xanh mà không cần miễn trừ.

---

## 4. Nợ kỹ thuật còn lại (đã khoanh vùng, chưa sửa)

### Test hàng đợi email chưa cô lập

`inquiry-outbox.integration.test.ts` hỏng ngẫu nhiên: chạy riêng ~1/6 lần, chạy cả bộ thì gần như mỗi lần.

**Nguyên nhân:** `claimJobs(worker, n, ...)` lấy `n` dòng **đầu của cả bảng**, không phải `n` job của riêng phép kiểm đang chạy. Các phép kiểm trước để lại job `pending`; khi tổng vượt `n`, một phần job của phép kiểm hiện tại nằm ngoài cửa sổ lấy, và `FOR UPDATE SKIP LOCKED` không quét lại để bù.

**Đã chứng minh mã nguồn ĐÚNG.** Viết một kịch bản tái hiện riêng chạy đúng câu lệnh `UPDATE ... FROM (SELECT ... FOR UPDATE SKIP LOCKED)` của `claimJobs` với hàng đợi sạch: **20/20 lần đúng**, không mất và không trùng job nào.

**Vì sao chưa sửa:** cách sửa hiển nhiên (`beforeEach` xoá sạch hàng đợi) làm hỏng phép kiểm "đếm theo trạng thái" — phép kiểm đó lại *dựa vào* job do phép kiểm trước tạo ra. Sửa tận gốc phải tách fixture cho từng phép kiểm lấy job; đó là việc riêng, không nên gộp vào đợt rà soát này. Đã ghi chú đầy đủ ngay trong file test.

**Đã giảm nhẹ:** dọn job của các tệp test khác ở `beforeAll`, và đặt `fileParallelism: false` cho backend — xử lý được nhóm lỗi đua giữa các tệp (ví dụ `translation.integration.test.ts` so sánh hai ảnh chụp tổng số toàn cục ở hai thời điểm).

---

## 5. Dọn dẹp đã làm

| Việc | Chi tiết |
|---|---|
| Xoá 6 file log rác | `.codex-*.log` ở gốc dự án (không được git theo dõi) |
| Xoá script không chạy được | `tools/build_docx.js` + ngoại lệ eslint đi kèm |
| Xoá dữ liệu thử trong DB | 1 inquiry "Smoke Test F5" và 2 job outbox mồ côi |

## 6. Đã rà nhưng KHÔNG xoá — và vì sao

| Thứ | Lý do giữ |
|---|---|
| `scripts/inject-*.mjs` | Công cụ tiêm lỗi để chứng minh test không rỗng — đang được `pnpm inject` dùng |
| `doc/archive/`, `planning/` | Hồ sơ lịch sử có mã băm kiểm chứng (`SHA256SUMS.txt`, `RELEASE_MANIFEST.md`). Xoá là phá hồ sơ kiểm toán — nếu muốn xoá, đó là quyết định của chủ dự án chứ không phải việc dọn dẹp |
| `implementation/evidence/` | Bằng chứng nghiệm thu Gate B |
| `seed-demo.ts` | Vẫn cần cho dịch vụ / dự án / bài viết / trang / banner — những thứ `seed:lab` không tạo |
| `.next`, `dist` (392 MB) | Sản phẩm build, đã được `.gitignore`. Xoá bằng `pnpm clean` khi cần, không phải rác trong repo |

**Không tìm thấy mã chết.** Quét toàn bộ `frontend/src`, `admin/src`, `backend/src`, `packages`: 6 file không được import ở đâu, và cả 6 đều là điểm vào hợp lệ (`vitest.config.ts` ×3, `cli.ts`, `seed.ts`, `generate-types.ts` — đều được tham chiếu trong `package.json`).

---

## 7. Việc còn lại cho người dùng

1. **Tạo tài khoản quản trị đầu tiên** qua `/setup` để kiểm tra luồng admin sau đăng nhập.
2. **Bổ sung ảnh** cho HVP 972 và OptiFuel → chạy lại `seed:lab` là hai sản phẩm tự lên sóng.
3. **Xác minh số liệu với hãng** — [doc 29](29_DIEM_CAN_XAC_MINH_VOI_HANG.md).
4. **Tách fixture cho test hàng đợi** nếu muốn bộ test xanh tuyệt đối (mục 4).
