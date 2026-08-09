# Trạng thái backend — cập nhật sau F4

> Cập nhật: 2026-08-09 · nhánh `feat/p0-scaffold` · commit cuối `21fea7a`
> File này trả lời hai câu: **đang ở đâu** và **làm gì tiếp**.
> Mọi con số dưới đây là **đo được**, không phải tuyên bố — cách chạy lại ở mục 6.

---

## 1. Một dòng

Backend đã xong **toàn bộ đường ĐỌC công khai**: 48/56 endpoint, 493 bài kiểm xanh.
Còn lại là đường **GHI** (form báo giá, media, quản trị) và SEO.

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
| **F4** | Khung site: `/home`, `/navigation`, `/customers`, `/offices`, `/search` | 5/5 | **vừa xong** |

### Số đo hiện tại

```
493 bài kiểm (28 tệp)          xanh
API                            48/56 endpoint
smoke-api.mjs                  204/204 phép kiểm trên HTTP thật
smoke-auth.mjs                 38/38
inject-f4.mjs                  14/14 phép tiêm lỗi làm phép kiểm ĐỎ
HTTP 5xx trong toàn bộ phép đo  0
pnpm -r typecheck              sạch (7 gói)
pnpm lint                      0 lỗi
seed demo chạy lại             0 mới, 68 đã có (idempotent)
```

---

## 3. Còn lại

| Phase | Nội dung | Endpoint | Ghi chú |
|---|---|---|---|
| **F5** | RFQ `POST /inquiries` + worker gửi email + 3 endpoint admin đọc | 0/4 | **cần bạn chốt mục 5.3** |
| **F6** | `sitemap.xml`, `sitemap-:locale.xml`, `robots.txt` + canonical/hreflang | 0/3 | phụ thuộc F4 (đã xong) |
| **F7** | Media: upload, magic bytes, biến thể ảnh, `/documents/:slug/download` | 0/1 | |
| **F8** | Admin CRUD — 5 nhóm (F8a…F8e) | 0 dòng trong bảng | **phần dài nhất; cần bạn chốt mục 5.2** |

Ngoài backend: **frontend gần như trống** (`layout.tsx`, `page.tsx`, `middleware.ts`),
**worker chỉ có `main.ts`**.

---

## 4. Việc tiếp theo — đề xuất của tôi

### 4.1. Nếu mục tiêu là **đưa website lên sớm**: F6 trước F5

Đây là đề xuất chính, và nó khác thứ tự trong `doc/12`.

`doc/12` xếp F5 (báo giá) trước F6 (SEO) vì F5 là "đường tiền". Nhưng có ba lý do
để đổi:

1. **F6 không cần bạn chốt gì cả.** F5 bị kẹt ở câu hỏi SMTP (mục 5.3) — tôi có thể
   làm adapter ghi tệp, nhưng nếu bạn đã có SMTP thì làm hai lần.
2. **F6 khoá nốt giá trị của F1–F4.** Toàn bộ nội dung đã có API nhưng **chưa có
   sitemap** — Google chưa có đường vào. Với một site B2B đang chuyển từ tên miền cũ,
   sitemap + 301 (đã xong ở F0) là cặp quyết định việc **không mất thứ hạng**.
3. **F6 nhỏ và tự chứa**: 3 endpoint, đọc từ những DAO đã có bài kiểm.

Một chỗ trong F6 dễ làm sai và tôi sẽ đo riêng: **ADR-011 §2b** — trang landing phân
loại có mô tả thì `index`, rỗng thì `noindex` + canonical về cha. Quy tắc có điều kiện,
và sai thì Google âm thầm hạ độ tin cậy cả cụm trang.

### 4.2. Nếu mục tiêu là **nhận được đơn hàng**: F5

Thì tôi cần bạn trả lời mục 5.3 trước. Xem mục 5.

### 4.3. Song song, không phụ thuộc tôi

**Frontend có thể bắt đầu ngay.** Đủ API cho: trang chủ, `/products` + lọc, chi tiết
sản phẩm, dịch vụ, dự án, tin tức, tài liệu, menu header/footer, tìm kiếm, và redirect
URL cũ. Hợp đồng nằm ở `packages/contracts` (kiểu TypeScript dùng chung, không phải tài
liệu văn xuôi), và `API_ENDPOINTS` là bản kiểm kê **máy đọc được** — có luật kiến trúc
đối chiếu nó với controller thật theo cả hai chiều.

---

## 5. Ba thứ đang chờ bạn chốt

Chưa có câu trả lời thì tôi vẫn đi tiếp được (theo 4.1), nhưng ba câu này quyết định
khối lượng:

### 5.1. Sản phẩm PAC vào catalogue hay trỏ ra `paclp.com`?

Treo từ đầu dự án. Hiện catalogue đang dùng **dữ liệu demo** (12 sản phẩm, tên hãng và
mã tiêu chuẩn là thật, mọi đoạn mô tả là văn bản thay thế). Trước khi đưa lên thật thì
cần câu trả lời này **và** nội dung thật từ bộ phận kỹ thuật.

### 5.2. Có làm giao diện quản trị (F8) trong đợt này không?

F8 là phần dài nhất. Nếu ban đầu bạn nhập nội dung bằng SQL hoặc công cụ tạm thì **hoãn
F8** và website công khai lên sớm hơn nhiều.

### 5.3. SMTP thật hay ghi ra tệp? — **câu này chặn F5**

Chưa có SMTP thì tôi làm adapter ghi ra tệp để luồng chạy được và có bài kiểm; đổi sang
SMTP thật sau là một dòng cấu hình.

---

## 6. Chạy lại toàn bộ phép đo

```bash
pnpm install
pnpm build:packages
pnpm db:migrate
pnpm db:seed          # bootstrap: menu, homepage_sections, 3 hãng
pnpm db:seed:demo     # dữ liệu demo, idempotent

pnpm -r typecheck
pnpm lint
pnpm --filter @ltv/backend test        # 493 bài kiểm

pnpm dev:backend                       # cửa sổ khác
pnpm smoke:api                         # 204 phép kiểm
pnpm smoke:auth                        # 38 phép kiểm
```

Riêng phép tiêm lỗi (chứng minh bài kiểm không rỗng) cần `DATABASE_URL`:

```bash
DATABASE_URL=... node scripts/inject-f4.mjs   # 14/14 phải ĐỎ đúng chỗ
```

---

## 7. Nợ kỹ thuật đã ghi nhưng CHƯA vá

Cả bốn đều đã ghi trong `doc/13`; để đây để không bị quên.

| | Vấn đề | Vá ở đâu |
|---|---|---|
| 1 | **Không có ràng buộc chặn hai `head_office` cùng published**, và `findHeadOffice()` trả về **bất kỳ** hàng nào trong số đó. Hàm này là nguồn `schema.org LocalBusiness` của toàn site. | cần một chỉ mục UNIQUE có điều kiện → một migration; làm cùng F6 (SEO) |
| 2 | **Năm bảng mặc định `status='published'`** (`offices`, `standards`, `applications`, `industries`, `post_categories`). Màn hình quản trị của chúng sẽ tạo bản ghi **đã công khai ngay lúc bấm Lưu** — một văn phòng điền nửa xuất hiện trên trang liên hệ. | F8: hoặc form đầy đủ mới cho Lưu, hoặc `unpublish()` ngay sau `insert()` |
| 3 | **Ba endpoint `/admin/settings` không có trong `API_ENDPOINTS`.** Luật 16 đối chiếu bảng với mã theo cả hai chiều, nhưng không phát hiện được dòng **chưa từng được thêm**. | F8: thêm dòng **trước** khi viết mã |
| 4 | **Worker đòi `JWT_SECRET` và `PASSWORD_RESET_SECRET` mà nó không dùng.** | F5, khi worker có việc thật |
| 5 | **Dòng log thẻ đặt lại mật khẩu** trong `auth.controller.ts` — nợ từ B2, phải nối vào hàng đợi email. | F5 |
| 6 | `/products/landing` **lần cache lạnh vẫn chạy đủ 10 câu**, gồm 5 câu `COUNT(*)` bị bỏ. Cache 60s đã xử lý trạng thái nóng. | chỉ làm khi đo được là vấn đề (khi chạy nhiều bản sao) |

---

## 8. Một việc bạn cần làm ngay

**`git push`.** Hiện có **22 commit chưa đẩy** trên `feat/p0-scaffold`. Tôi không đẩy
được từ hộp cát (không có credentials, và không có DNS tới `github.com`).

```bash
git push origin feat/p0-scaffold
```
