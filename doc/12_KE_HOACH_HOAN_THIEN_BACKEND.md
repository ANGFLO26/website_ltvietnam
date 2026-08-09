# Kế hoạch hoàn thiện backend — chia phase

**Ngày:** 2026-08-07 · **Mục tiêu:** frontend có thể bắt đầu code và không phải chờ

---

# 1. Chỗ đứng hiện tại

Đã xong và có test bảo vệ:

| Tầng | Trạng thái |
|---|---|
| `dao/` | 52/52 bảng, 23 thư mục, 9 luật kiến trúc ép bằng máy |
| `services/shared` | SlugService, PublishService, MediaUsageService |
| `services/auth` | đăng nhập, phiên, CSRF, đổi/đặt lại mật khẩu |
| `api/` | **chỉ có** `auth` và `health` |

259 test xanh. Nền tảng vững, nhưng **frontend chưa gọi được gì cả**.

## Còn thiếu — đếm theo `doc/06`

```
API công khai        ~32 endpoint   0 đã làm
API admin            20 module      0 đã làm
Media upload         1 luồng        0
Inquiry + email      1 luồng        0
SEO (sitemap/robots) 3 endpoint     0
Route resolver + 301 1 middleware   đã có spike, CHƯA nối vào
Dữ liệu demo         —              chưa có
```

## Điều quyết định thứ tự

Frontend cần **dữ liệu để dựng giao diện**, không cần admin để tạo dữ liệu.
Nên thứ tự là: dữ liệu demo trước, API đọc trước, admin sau. Làm ngược lại thì
frontend chờ hết admin mới bắt đầu được, và admin là phần dài nhất.

---

# 2. Hợp đồng chung — quyết định trước khi code phase nào

Ba thứ này phải chốt trước, vì mọi phase sau đều dựa vào và **sửa sau thì phải
sửa mọi endpoint đã viết**.

## 2.1. Vỏ phản hồi

```json
{ "data": {...} }                                        // một bản ghi
{ "data": [...], "meta": { "page", "page_size", "total_items", "total_pages" } }
{ "error": { "code", "message", "details", "request_id" } }
```

Vỏ lỗi đã có trong `exception.filter.ts`. Vỏ thành công **chưa** — hiện
`auth.controller.ts` trả `{ user }` trực tiếp. Phải thống nhất, và phải là
interceptor toàn cục chứ không phải mỗi controller tự bọc.

## 2.2. Kiểu chia sẻ với frontend

Đặt trong `@ltv/contracts`: kiểu phản hồi của mọi endpoint công khai. Frontend
import cùng một kiểu, nên đổi hình dạng phản hồi làm **frontend đỏ lúc biên
dịch** thay vì hỏng lúc chạy.

Đây là lợi thế lớn nhất của monorepo và hiện chưa dùng.

## 2.3. Bảng endpoint máy đọc được

`doc/06` liệt kê endpoint bằng văn xuôi. Chuyển thành hằng số trong
`@ltv/contracts`, rồi thêm **Luật 10**: mọi endpoint trong bảng phải có
controller thật, và mọi controller phải nằm trong bảng.

Không có luật này thì "đã làm xong API công khai" là một câu không kiểm được —
đúng loại tuyên bố tôi đã nói sai nhiều lần trong dự án này.

---

# 3. Các phase

Mỗi phase có **ba** mục: làm gì · tự kiểm thế nào · kiểm liên kết thế nào.

Quy ước: phase chỉ được coi là xong khi **cả ba** đạt, và lệnh kiểm phải chạy
lại được bất cứ lúc nào.

---

## F0 — Hợp đồng + dữ liệu demo + định tuyến

**Vì sao trước tiên:** không có dữ liệu thì mọi endpoint đọc đều trả mảng rỗng,
và không phân biệt được "code sai" với "chưa có dữ liệu".

### Làm gì

1. Interceptor vỏ `{ data, meta }` toàn cục
2. `@ltv/contracts`: kiểu phản hồi + bảng endpoint máy đọc được
3. **Luật 10** — đối chiếu bảng endpoint với controller thật
4. Dữ liệu demo: lấy từ website đang chạy — PAC/HERZOG/ISL, ~15 sản phẩm thật
   (OptiDist, FZP...), 3 cấp danh mục, tiêu chuẩn ASTM/ISO/IP, 2 dịch vụ,
   2 bài viết, trang giới thiệu/liên hệ, menu, banner
5. Nối `RouteResolver` + middleware 301 (spike đã chứng minh, chưa dùng)

### Tự kiểm

```
pnpm db:seed:demo          → dữ liệu demo vào DB, chạy lại không nhân đôi
pnpm --filter @ltv/backend test   → Luật 10 xanh
node scripts/smoke-api.mjs --phase 0
```

Điểm phải chứng minh: URL `.aspx` cũ → **301 đúng 18 byte** (không phải 307/308,
không kèm HTML). Đây là kết luận của spike P0; giờ phải đúng trên đường chạy thật.

### Kiểm liên kết

- Vỏ phản hồi: `auth` (đã có) và endpoint mới **cùng một hình dạng**
- Kiểu trong `@ltv/contracts` khớp phản hồi thật — test so sánh, không đọc mắt
- 259 test cũ vẫn xanh

---

## F1 — Đọc taxonomy

Nhóm dễ nhất, và mở đường cho mọi trang danh sách.

### Làm gì

```
GET /brands            ?type= &featured= &parent=
GET /brands/:slug      GET /brands/:slug/children
GET /product-categories            GET /product-categories/tree
GET /product-categories/:slug      GET /product-categories/:slug/products
GET /standards         GET /standards/:slug     GET /standards/:slug/products
GET /applications      GET /applications/:slug  GET /applications/:slug/products
GET /industries        GET /industries/:slug    GET /industries/:slug/products
```

`services/catalog/` — một service cho cả nhóm, `DaoScope` gồm 5 bảng taxonomy
+ `products`.

### Tự kiểm

- `/product-categories/tree` trả cây **đúng thứ tự**, một truy vấn
- `/brands/:slug/children` chỉ con trực tiếp, không cả nhánh
- `/product-categories/:slug/products` bắt sản phẩm gắn ở **cấp 2–3** (ADR-015)
- bản nháp **không** lọt ra
- ngân sách truy vấn: mỗi endpoint danh sách ≤ 2 câu, đo bằng bộ đếm

### Kiểm liên kết

- so sánh với `daos.products.filter()` đã có: `/product-categories/:slug/products`
  và `GET /products?category=` phải trả **cùng tập** — hai đường vào một logic
- Luật 10: 15 endpoint mới đều có trong bảng

---

## F2 — Sản phẩm

Phần lõi. Bộ lọc đã xong ở tầng DAO; phase này là tầng HTTP + service.

### Làm gì

```
GET /products              (bộ lọc ADR-007, phân trang, sắp xếp)
GET /products/:slug        (chi tiết đầy đủ + sản phẩm liên quan + tài liệu)
GET /products/landing      (ProductLandingQueryService RIÊNG, không dùng /home)
```

### Tự kiểm

Ba ca của `doc/06` PHẦN XVI qua **HTTP thật**, không chỉ ở tầng DAO:

```
?brand=pac                                → 3
?brand=pac&standard=astm-d86              → 2
?brand=pac&brand=herzog&standard=astm-d86 → 2
```

- máy ngừng kinh doanh **vẫn trả**, kèm cờ + gợi ý thay thế (ADR-011)
- `page_size` chặn trần 100
- cột sắp xếp lạ → 422, không ghép vào SQL
- ngân sách: danh sách 2 câu, chi tiết ≤ 10 câu, **không đổi theo số dòng**

### Kiểm liên kết

- `/products/landing` chỉ đọc `is_featured`, **không** đọc danh sách id từ
  `homepage_sections.settings` — kiểm bằng cách đổi settings và xác nhận kết quả
  không đổi
- `/products/:slug` của một slug đã đổi tên → 301 sang slug mới (F0 + SlugService)
- tài liệu của sản phẩm dùng `documents.findByProduct`, một truy vấn

---

## F3 — Nội dung có bản dịch

Nhóm phức tạp nhất về ngữ nghĩa: locale, hreflang, `/vi` prefix.

### Làm gì

```
GET /services   /services/tree   /services/:slug
GET /projects   /projects/:slug
GET /posts      /posts/:slug     /post-categories   /post-categories/:slug/posts
GET /pages/:slug
GET /documents  /documents/:slug  /documents/:slug/download
GET /customers  GET /offices
```

Mọi endpoint nhận `?locale=en|vi`, mặc định `en` (ADR-001).

### Tự kiểm

- bản `vi` chưa publish → `/vi/...` trả 404, `/...` vẫn 200
- `hreflang` **chỉ** xuất hiện khi cả cha lẫn bản dịch published (đã có ở DAO,
  giờ kiểm qua HTTP)
- `/documents/:slug/download` cần `published` **và** `visibility=public`;
  tăng `download_count`; trả tệp từ `protected-documents/` **không** qua web root
- tên khách hàng của dự án đi qua `resolvePublicCustomerName` — `confidential`
  trả `null` (đây là ranh giới pháp lý, phải kiểm qua HTTP)

### Kiểm liên kết

- URL `/vi/services/x` giải đúng qua RouteResolver của F0
- `customers` công khai cần `status=published` **và** `is_public` **và** có logo
- đổi slug bản dịch → redirect mang đúng tiền tố locale

---

## F4 — Khung site

Những gì mọi trang cần.

### Làm gì

```
GET /home                    (HomepageQueryService — CHỈ trang chủ)
GET /navigation/:location    (header | mobile | footer)
GET /customers               (logo khách hàng: published VÀ is_public VÀ có logo)
GET /offices
GET /search                  (MVP: sản phẩm)
```

**Đính chính (viết khi làm F4):** bản kế hoạch ban đầu ghi `GET /settings` ở đây và
**không** ghi `/customers` với `/offices`. Cả hai đều sai so với `doc/06`:

- `doc/06` PHẦN IV (danh sách API **công khai**) không có `/settings`. Setting chỉ lộ
  qua `GET /admin/settings` + `GET/PATCH /admin/settings/:group` (PHẦN IX), tức **F8**,
  và ở đó mới có chuyện che `smtp_password`. Kéo nó vào F4 sẽ tạo một đường công khai
  mà `doc/06` không định nghĩa.
- `/customers` và `/offices` **có** trong PHẦN IV và chúng đúng là "thứ mọi trang cần"
  (chân trang, trang liên hệ) — chúng thuộc F4.

Nên tự kiểm "`/settings` không bao giờ trả `smtp_password`" **chuyển sang F8**. Nó vẫn
là một phép kiểm phải có, chỉ là không phải ở đây.

Một khoảng mở khác phát hiện cùng lúc: **ba endpoint `/admin/settings` không có trong
`API_ENDPOINTS`** — Luật 16 đối chiếu bảng với mã theo cả hai chiều, nhưng nó không
phát hiện được một dòng **chưa từng được thêm**. Bảng đó tự nhận là bản kiểm kê
endpoint, nên khoảng mở này phải được đóng ở F8 (thêm dòng trước khi viết mã).

### Tự kiểm

- `/home` **một** yêu cầu, batch load, ngân sách truy vấn cố định theo số khối
  đang bật — không theo số phần tử
- `/navigation/footer_company` + 3 menu footer khác lấy bằng **2 truy vấn** cho
  cả bốn (`findTreesByLocations`), không phải 8
- tắt một `homepage_sections` → khối biến mất khỏi `/home` (có bài kiểm; và nó bật
  lại rồi khẳng định khối **quay về** — chỉ kiểm nửa "biến mất" thì một hàm luôn trả
  mảng rỗng cũng xanh)
- menu/banner trỏ tới nội dung **đã xóa hoặc chưa publish** không được phát ra ngoài —
  `link_target_id` là đa hình và **không có khóa ngoại**, xem `doc/13` mục 22.1
- ~~`/settings` không bao giờ trả `smtp_password`~~ → **chuyển sang F8** (xem đính
  chính ở trên)

### Kiểm liên kết

- `/home` và `/products/landing` là **hai** service khác nhau (doc/06 nhấn mạnh)
- menu trỏ tới nội dung đã xoá → mục đó bị bỏ, **không** phát link gãy
- `/search` và `GET /products?search=` cùng dùng chỉ mục trigram

---

## F5 — Yêu cầu báo giá + worker email

Đường tiền. Tầng DAO đã xong (D19 + FV-08); phase này là HTTP + worker.

### Làm gì

```
POST /inquiries              (không đăng nhập, Idempotency-Key, CAPTCHA)
worker/                      vòng lặp lấy job, gửi SMTP, backoff, reaper
GET  /admin/inquiries        ?status= &handled= &type= &page=
GET  /admin/inquiries/:id
PATCH /admin/inquiries/:id/handled
```

### Tự kiểm

- hai yêu cầu cùng `Idempotency-Key` → **một** bản ghi, cả hai nhận 201
- gửi SMTP **ngoài** transaction (D6/FV-08); commit outbox trước khi gọi
- worker: hai tiến trình cùng chạy không lấy trùng job (đã kiểm ở DAO, giờ kiểm
  ở worker thật)
- SMTP hỏng → `email_failed`, **inquiry vẫn còn** trong DB
- Message-ID sinh xác định từ `outbox.id`, retry dùng **cùng** Message-ID
- `last_error` không chứa PII

### Kiểm liên kết

- **Bỏ dòng log thẻ đặt lại mật khẩu** trong `auth.controller.ts` và nối vào
  hàng đợi email này — món nợ đã ghi ở B2, đây là chỗ trả
- `/admin/inquiries` chỉ đọc, không phải CRM

---

## F6 — SEO

### Làm gì

```
GET /sitemap.xml   GET /sitemap-:locale.xml   GET /robots.txt
```
Cộng `canonical` + `robots` + `hreflang` trong phản hồi chi tiết (ADR-011).

### Tự kiểm

- sitemap **chỉ** chứa nội dung published, chưa xoá
- `lastmod` lấy từ `updated_at`
- URL lọc (`?brand=`) **không** vào sitemap
- landing phân loại: có mô tả → `index`; rỗng → `noindex` + canonical về cha
  (ADR-011 §2b — quy tắc có điều kiện, dễ làm sai)

### Kiểm liên kết

- mọi URL trong sitemap gọi thật trả 200 — test đi qua từng URL
- không URL nào trong sitemap là nguồn của một redirect (tự trỏ vào 301)

---

## F7 — Media

### Làm gì

```
POST/GET/PATCH/DELETE /admin/media
GET /media/*                    (phục vụ tệp công khai)
```
Kiểm magic bytes, whitelist MIME, sinh biến thể (sharp), định tuyến
`storage_class` theo D20.

### Tự kiểm

- tệp `.jpg` nhưng nội dung là PHP → **từ chối** (kiểm magic bytes, không tin
  phần mở rộng)
- SVG bị từ chối (có thể chứa script)
- `../../etc/passwd` trong tên tệp → từ chối
- PDF → `protected-documents/`, ảnh → `public-media/`
- xoá ảnh đang dùng → 409 kèm danh sách chỗ dùng (MediaUsageService)

### Kiểm liên kết

- ảnh tải lên rồi gán làm `featured_image` → xuất hiện trong `/products/:slug`
- `protected-documents/` **không** truy cập được qua `/media/*`

---

## F8 — Admin CRUD

Phần dài nhất, chia theo nhóm để không dồn.

| | Module |
|---|---|
| F8a | brands · product-categories · standards · applications · industries |
| F8b | products (nặng nhất: 7 tập quan hệ) |
| F8c | services · projects · posts · post-categories · pages |
| F8d | documents · customers · offices · banners · homepage · menus |
| F8e | settings · redirects · users |

### Tự kiểm (mỗi nhóm)

- PATCH theo ADR-008: trường mảng **có mặt → thay cả tập**, **vắng → giữ nguyên**
- publish gọi `PublishService`, thiếu điều kiện → 422 kèm danh sách trường
- đổi slug gọi `SlugService`, tạo redirect trong cùng transaction
- soft delete rồi restore
- hard delete chỉ khi chưa từng publish

### Kiểm liên kết

- tạo bằng admin → xuất hiện ở API công khai sau khi publish
- ẩn bằng admin → biến khỏi API công khai **ngay**
- đổi slug bằng admin → URL cũ 301 sang URL mới

---

# 4. Thứ tự và điểm mở khoá cho frontend

```
F0 ──> F1 ──> F2 ──┬──> F4 ──> F6
                   ├──> F3
                   └──> F5
F7 ──> F8a..e
```

| Xong phase | Frontend làm được gì |
|---|---|
| F0 | dựng khung, gọi API thật, redirect hoạt động |
| F1 | trang danh mục, hãng, tiêu chuẩn |
| **F2** | **trang sản phẩm — 60% giá trị của site** |
| F3 | dịch vụ, dự án, tin tức, tài liệu |
| F4 | trang chủ, menu, tìm kiếm |
| F5 | form báo giá |
| F6 | SEO đầy đủ |
| F7–F8 | giao diện quản trị |

**Frontend có thể bắt đầu ngay sau F0**, và làm song song từ F1.

---

# 5. Ba thứ tôi cần bạn chốt

## 5.1. Sản phẩm PAC vào catalogue hay trỏ ra `paclp.com`?

Câu hỏi này treo từ đầu dự án và **quyết định khối lượng của F2**. Nếu trỏ ra
ngoài thì phần lớn catalogue biến mất.

## 5.2. Có làm giao diện quản trị trong đợt này không?

F8 là phần dài nhất (5 nhóm module). Nếu ban đầu bạn nhập nội dung bằng SQL
hoặc một công cụ tạm, có thể **hoãn F8** và đưa website công khai lên sớm hơn
nhiều.

## 5.3. SMTP thật hay ghi ra tệp?

F5 cần một đường gửi mail. Chưa có SMTP thì tôi làm một adapter ghi ra tệp để
luồng chạy được, đổi sang SMTP thật sau là một dòng cấu hình.

---

# 6. Cách tôi sẽ tự kiểm mỗi phase

Học từ những lỗi đã mắc trong dự án này:

1. **Chạy thật, không đọc lại.** Mỗi phase kết thúc bằng một lệnh chạy được,
   không phải một đoạn mô tả.
2. **Tiêm lỗi cho mọi bảo đảm quan trọng.** Bài kiểm nào PASS ngay lần đầu thì
   phải phá code để xem nó có đỏ. Ba lần trong dự án này bài kiểm của tôi hoá ra
   rỗng, và phép tiêm là thứ duy nhất phát hiện.
3. **Kiểm từ trạng thái sạch.** `rm -rf dist` trước khi kết luận. Ba lỗi
   `pnpm dev:backend` tồn tại vì tôi luôn kiểm trên môi trường đã dựng sẵn.
4. **Ngân sách truy vấn là con số đo được**, không phải lời hứa "no N+1".
5. **Nói rõ cái gì CHƯA kiểm.** Sandbox thiếu `pgcrypto`, không có Docker —
   những chỗ đó tôi phải nói ra chứ không im lặng.
