# Trạng thái backend — cập nhật sau rà soát F1–F8

> Cập nhật: 2026-08-09 · nhánh `feat/p0-scaffold` · commit nền `e0a9be5`
> File này trả lời hai câu: **đang ở đâu** và **làm gì tiếp**.
> Mọi con số dưới đây là **đo được**, không phải tuyên bố — cách chạy lại ở mục 6.

---

## 1. Một dòng

Backend đã xong **đường đọc công khai và toàn bộ API quản trị F8**: 198/198 endpoint.
F8 cung cấp 136 endpoint cho taxonomy, sản phẩm, nội dung đa ngôn ngữ, site chrome,
settings, redirects và users. Rà soát ngày 2026-08-09 đã sửa các lỗi chức năng tìm thấy
và xác nhận lại trên PostgreSQL thật.

**Frontend có thể dựng gần như toàn bộ website công khai ngay bây giờ** — trang chủ,
catalogue, sản phẩm, dịch vụ, dự án, tin tức, menu, tìm kiếm đều đã có API thật.

---

## 2. Đã xong

| Phase | Nội dung | Endpoint | Trạng thái |
|---|---|---|---|
| **D1–D6** | Tầng DAO, 52/52 bảng | — | xong |
| **B2** | Đăng nhập, phiên, CSRF | 7/7 | xong |
| **F-1** | Vá nền: rate limit, vỏ `{data,meta}`, gộp `createPool`, 17 luật kiến trúc | 9/9 | xong |
| **F0** | `RouteResolver` — 301 cho ~200 URL `.aspx` cũ | 1/1 | xong |
| **F1** | Taxonomy: brands, categories, standards, applications, industries | 17/17 | xong |
| **F2** | Sản phẩm: lọc ADR-007, landing, chi tiết | 3/3 | xong |
| **F3** | Nội dung có bản dịch: pages, services, projects, posts, documents | 13/13 | xong |
| **F4** | Khung site: `/home`, `/navigation`, `/customers`, `/offices`, `/search` | 5/5 | xong |
| **F5** | Inquiry idempotent, CAPTCHA/rate limit, admin đọc, email worker + reset password | 4/4 | **vừa xong** |
| **F6** | Sitemap EN/VI, robots, canonical/robots/hreflang và ADR-011 §2b | 3/3 | xong |
| **F7** | Media upload/variants, public delivery, protected document download, soft-delete/purge | 7/7 | **vừa xong** |
| **F8** | Admin CRUD: F8a taxonomy · F8b products · F8c content · F8d site · F8e system | 136/136 | **vừa xong** |

### Số đo hiện tại

```
workspace test                 592/592 xanh
backend test                   533/533 xanh; integration chạy trên PostgreSQL thật, không skip
worker test                    5/5 xanh
contracts test                 33/33 xanh
config test                    8/8 xanh
db migration-runner            13/13 xanh
API                            198/198 endpoint (F8: 136/136)
PostgreSQL migration           37/37 đã apply; manifest 37/37 hợp lệ
smoke-api.mjs                  228/228 qua HTTP thật
smoke-auth.mjs                 41/41
inject-f4.mjs                  14/14 (đã sửa: trước đó 11/14 — xem mục 9)
pnpm build                     đạt; Next.js cảnh báo chưa khai báo plugin ESLint frontend
pnpm typecheck                 sạch (7 gói; tự build package dependency)
pnpm lint                      0 lỗi
pnpm format:check              sạch
```

---

## 3. Còn lại

| Phase | Nội dung | Endpoint | Ghi chú |
|---|---|---|---|
| — | Không còn phase backend nào để trống trong kế hoạch F-1…F8 | — | DB thật và smoke HTTP đã xác nhận |

Ngoài backend: **frontend gần như trống** (`layout.tsx`, `page.tsx`, `middleware.ts`).
Worker đã có claim/reaper/backoff và adapter file/SMTP.

> **Rủi ro cao nhất hiện nay không phải là mã còn thiếu, mà là mã chưa được lưu.**
> Toàn bộ F5–F8 đang nằm trong working tree **chưa commit**: 204 file thay đổi, trong
> đó 57 file hoàn toàn mới (`git status --short`). Commit gần nhất là `e0a9be5`, tức
> **F4**. Một lần `git checkout .`, `git clean -fd` hay một sự cố ổ đĩa sẽ xoá sạch
> toàn bộ F5, F6, F7 và 136 endpoint F8.
>
> Việc cần làm trước mọi việc khác: `git add -A && git commit` rồi `git push`.

---

## 4. Việc tiếp theo — đề xuất của tôi

### 4.1. Việc tiếp theo — frontend công khai và frontend quản trị

API F8 đã hoàn tất. Bước tiếp theo là nối giao diện công khai và giao diện quản trị vào
các hợp đồng mới.

### 4.2. Xác nhận môi trường — đã xong

Migration, toàn bộ integration test và smoke API đã chạy trên PostgreSQL thật. Trước khi
triển khai, vẫn phải thay giá trị `INQUIRY_RECIPIENT` không hợp lệ trong `.env` cục bộ bằng
địa chỉ email nhận inquiry thật.

### 4.3. Song song, không phụ thuộc tôi

**Frontend có thể bắt đầu ngay.** Đủ API cho: trang chủ, `/products` + lọc, chi tiết
sản phẩm, dịch vụ, dự án, tin tức, tài liệu, menu header/footer, tìm kiếm, và redirect
URL cũ. Hợp đồng nằm ở `packages/contracts` (kiểu TypeScript dùng chung, không phải tài
liệu văn xuôi), và `API_ENDPOINTS` là bản kiểm kê **máy đọc được** — có luật kiến trúc
đối chiếu nó với controller thật theo cả hai chiều.

---

## 5. Các quyết định sản phẩm/hạ tầng

Hai câu đầu còn mở; câu SMTP đã được đóng bằng cấu hình theo môi trường:

### 5.1. Sản phẩm PAC vào catalogue hay trỏ ra `paclp.com`?

Treo từ đầu dự án. Hiện catalogue đang dùng **dữ liệu demo** (12 sản phẩm, tên hãng và
mã tiêu chuẩn là thật, mọi đoạn mô tả là văn bản thay thế). Trước khi đưa lên thật thì
cần câu trả lời này **và** nội dung thật từ bộ phận kỹ thuật.

### 5.2. Có làm giao diện quản trị (F8) trong đợt này không? — **đã chốt làm**

Backend F8 đã hoàn tất; phần còn lại của quyết định này là triển khai giao diện frontend quản trị.

### 5.3. SMTP thật hay ghi ra tệp? — **đã xử lý**

Local/dev mặc định `EMAIL_TRANSPORT=file`, ghi vào `./.data/mail-outbox`. Production bị
từ chối khởi động nếu không chọn `smtp`, không có `SMTP_HOST`, hoặc thiếu CAPTCHA thật.

---

## 6. Chạy lại toàn bộ phép đo

```bash
pnpm install
pnpm build:packages
pnpm db:migrate
pnpm db:seed          # bootstrap: menu, homepage_sections, 3 hãng
pnpm db:seed:demo     # dữ liệu demo, idempotent

pnpm typecheck
pnpm lint
pnpm --filter @ltv/backend test        # tổng 533; integration cần DATABASE_URL
pnpm --filter @ltv/worker test         # 5 bài kiểm worker email
pnpm --filter @ltv/db test             # 13 bài kiểm migration runner

pnpm dev:backend                       # cửa sổ khác
pnpm smoke:api                         # 228 phép kiểm (gồm F5 + F6)
pnpm smoke:auth                        # 41 phép kiểm
```

Integration PostgreSQL, smoke HTTP và phép tiêm lỗi cần `DATABASE_URL` cùng backend đang chạy:

```bash
DATABASE_URL=... node scripts/inject-f4.mjs   # 14/14 phải ĐỎ đúng chỗ
```

---

## 7. Nợ kỹ thuật

### 7.1. Đã trả

| | Nợ | Trả ở đâu |
|---|---|---|
| 1 | `head_office` published không duy nhất | migration `035` (F6) |
| 2 | Worker đòi secret auth nó không dùng | F5 |
| 3 | Reset token vào log | F5, nối vào hàng đợi email |
| 4 | Năm bảng có DB default `published` | F8 truyền `initialStatus='draft'` cho đường tạo admin; seed cũ giữ nguyên hành vi |
| 5 | Ba endpoint `/admin/settings` thiếu trong manifest | đã thêm, Luật 16 đối chiếu với controller thật |

### 7.2. Còn nợ

| | Vấn đề | Khi nào làm |
|---|---|---|
| 1 | `/products/landing` **lần cache lạnh vẫn chạy đủ 10 câu**, gồm 5 câu `COUNT(*)` bị bỏ. Cache 60s chỉ xử lý trạng thái nóng. | chỉ làm khi đo được là vấn đề (khi chạy nhiều bản sao) |
| 2 | **Tiêm lỗi chỉ phủ F4.** `inject-f4.mjs` có 14 phép tiêm, tất cả cho F4. F5–F8 — gồm 136 endpoint admin, upload media và luồng email — có test hồi quy nhưng **chưa có phép tiêm nào chứng minh các test đó không rỗng.** Trong đó có bản sửa mức *Nghiêm trọng* (`hard=false` thành xóa cứng). | trước khi coi F8 là đã kiểm xong |
| 3 | Chưa có smoke HTTP đăng nhập chạy qua 136 endpoint admin (đã ghi ở `doc/15` §6) | khi làm UI quản trị |

---

## 8. Xác nhận môi trường đã hoàn tất

PostgreSQL cục bộ đã chạy; migration `034`–`037` được áp dụng và tổng trạng thái là
37/37. Toàn bộ 533 test backend (gồm integration DB) cùng 228 kiểm tra smoke HTTP đều xanh.
Smoke hiện bao phủ API công khai F1–F6; F7 và F8 được bảo vệ bởi unit/integration test,
kiểm tra kiến trúc và hợp đồng endpoint. Chưa có smoke HTTP đăng nhập riêng cho toàn bộ
136 endpoint quản trị F8.

Trong lần rà soát, `.env` cục bộ có `INQUIRY_RECIPIENT` không hợp lệ nên phép đo dùng biến
môi trường chỉ tồn tại trong tiến trình. File `.env` không bị tự ý sửa; cần cấu hình lại trước
khi chạy hoặc triển khai không có override.

Build frontend đạt nhưng Next.js vẫn cảnh báo cấu hình ESLint gốc chưa khai báo plugin Next.
`pnpm lint` hiện vẫn chạy sạch; nên thêm bộ luật `eslint-config-next` khi bắt đầu phát triển UI.

Báo cáo chi tiết: [`doc/15_BAO_CAO_RA_SOAT_F1_F8.md`](15_BAO_CAO_RA_SOAT_F1_F8.md).

---

## 9. Đính chính sau khi kiểm chứng lại (2026-08-09)

Toàn bộ số đo ở mục 2 đã được **chạy lại từ đầu** trên PostgreSQL thật (37 migration
áp dụng từ cơ sở dữ liệu trống, seed bootstrap + demo, backend khởi động thật). Hai
con số sai và một công cụ hỏng:

| Chỗ | Báo cáo ghi | Đo được | Ghi chú |
|---|---|---|---|
| `smoke-auth.mjs` | 38/38 | **41/41** | số cũ có từ trước F5; F5 thêm 3 phép kiểm |
| `inject-f4.mjs` | 14/14 | **11/14** (lúc đó) | 3 phép tiêm im lặng chuyển sang "BO QUA" |

**`inject-f4.mjs` đã tự hỏng, và hỏng đúng theo kiểu nó sinh ra để bắt.** Đợt dọn dẹp
chạy Prettier trên 146 file; formatter ngắt lại dòng và thêm dấu phẩy cuối ở ba chỗ mà
kịch bản trỏ tới bằng chuỗi nguyên văn, nên `src.includes(...)` không còn khớp. Ba phép
tiêm chuyển sang "BO QUA" — script vẫn **thoát 0**, và báo cáo chép con số cũ sang.

Ba bảo đảm đó vẫn còn nguyên trong mã; chỉ *phép đo* mất. Nhưng đó chính là trạng thái
nguy hiểm: nếu lần refactor sau làm mất bảo đảm thật thì không còn gì phát hiện.

Đã sửa: `timDoan()` so khớp trên bản đã gom khoảng trắng và bỏ qua dấu phẩy cuối, rồi
cắt đúng đoạn **nguyên văn** trong file để phép hoàn tác bằng băm vẫn đúng. Đổi tên
biến hay đổi logic vẫn làm nó không khớp — và đó là cố ý. Sau khi sửa: **14/14**.

Những con số còn lại **đúng nguyên văn**: 592 test workspace (533 backend / 35 file, 33
contracts, 8 config, 13 db, 5 worker), 198/198 endpoint, 37 migration, smoke-api
228/228, typecheck + lint + format:check + build đều sạch.
