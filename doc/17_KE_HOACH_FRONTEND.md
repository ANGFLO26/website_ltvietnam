# Kế hoạch frontend — chia phase

**Ngày:** 2026-08-10 · **Mục tiêu:** dựng website công khai với **cùng mức kiểm soát** đã
dùng cho backend — mỗi phase kết thúc bằng một lệnh chạy được, không phải một đoạn mô tả.

Đọc kèm: `doc/02` (sitemap), `doc/08` (wireframe công khai), `doc/09` (ADR),
`doc/12` (kế hoạch backend — bản mẫu của tài liệu này), `doc/14` (trạng thái backend).

> **Bản kế hoạch CODE cụ thể đến từng tệp:**
> [`doc/19_KE_HOACH_CODE_FRONTEND.md`](19_KE_HOACH_CODE_FRONTEND.md).
> Tài liệu này giữ phần **chia phase và luật kiến trúc**; `doc/19` trả lời **viết tệp nào,
> thứ tự nào, xong khi nào** — và điều chỉnh ngưỡng nghiệm thu theo mục tiêu mới (kiểm
> chức năng trước, làm đẹp sau).

---

# 0. Hai mâu thuẫn tài liệu phải chốt TRƯỚC khi viết dòng mã nào

Cả hai đều định hình **toàn bộ cây route**. Phát hiện khi đối chiếu `doc/08` với
`ADR-001 v1.3` và `packages/contracts/src/routes.ts`. Nếu không chốt bây giờ thì sẽ chốt
vào giữa W4, khi đã có vài chục file phải sửa.

## 0.1. `doc/08` PHẦN VII nói ngược ADR-001

> "VI tại đường dẫn gốc, EN tại `/`."

Câu này vừa **tự mâu thuẫn** (cả hai vế đều là gốc) vừa **ngược với ADR-001 v1.3**, vốn
đã đổi sang **tiếng Anh ở gốc, tiếng Việt ở `/vi`** — kèm lý do rõ ràng: website đang vận
hành `ltvietnam.com.vn` toàn bộ là tiếng Anh, đặt tiếng Việt ở gốc buộc phải biên soạn
xong toàn bộ nội dung tiếng Việt trước khi ra mắt.

`routes.ts` (26 route, có test) và toàn bộ backend đã theo ADR-001. **`doc/08` PHẦN VII là
tàn dư của Frontend 1.2**, viết trước ADR-014/ADR-001 v1.3.

→ **Nguồn đúng là `routes.ts`.** Cần sửa `doc/08` PHẦN VII, không sửa mã.

## 0.2. `doc/08` cho rằng brand/product/document có bản dịch — chúng không có

> "Trang tiếng Anh của product/service/project/post/**brand**/page/document chỉ hiển thị
> khi bản dịch EN `published`."

Sau **ADR-014** chỉ còn **bốn** bảng translation: `pages`, `posts`, `services`,
`projects`. `products`, `brands`, `documents` **không có bảng dịch nào cả** —
`routes.ts` đánh dấu chúng `localized: false`.

Hệ quả cụ thể cho frontend: **`/vi/brands/...`, `/vi/products/...`, `/vi/resources/...`
KHÔNG tồn tại.** Bộ chuyển ngôn ngữ ở những trang đó phải đưa về trang danh sách tương
ứng, không phải đổi tiền tố.

→ Cũng cần sửa `doc/08`. Câu "Brand detail KHÔNG fallback VI" thì **vẫn đúng** nhưng vì
một lý do khác hẳn: không phải "không fallback", mà là **không có bản dịch để mà fallback**.

**15 route có `/vi`, 11 route không.** Đây là con số phải đúng ngay từ W0.

---

# 1. Chỗ đứng hiện tại

| | Trạng thái |
|---|---|
| Backend | **198/198 endpoint**, 594 test, 38 phép tiêm lỗi, smoke 228+38 |
| `packages/contracts` | 13 file kiểu dùng chung + `ROUTES` + `API_ENDPOINTS` (máy đọc được) |
| `frontend/` | **4 file**: `layout.tsx`, `page.tsx`, `middleware.ts`, `next.config.mjs` |
| Test frontend | **chưa có** — `package.json` không có test runner |

`middleware.ts` là thứ duy nhất đã hoàn chỉnh và **đã được chứng minh bằng đo đạc**
(spike P0: `redirect()` → 307 + 5.858 byte HTML; middleware → 301 + 18 byte). Không thay
nó bằng helper của App Router.

## Điều quyết định thứ tự

Backend đi từ dưới lên (DAO → service → API) vì tầng trên không chạy được khi tầng dưới
chưa có. **Frontend ngược lại**: mọi trang đều gọi được API ngay, nên thứ tự do **giá trị
kinh doanh** quyết định, không do phụ thuộc kỹ thuật.

`doc/12` đã đo: **trang sản phẩm là 60% giá trị của site**. Nên W2–W3 (catalogue + chi
tiết) đứng trước mọi thứ khác trừ phần khung bắt buộc.

---

# 2. Hợp đồng chung — chốt trước, vì sửa sau là sửa mọi trang

Backend có bốn thứ khiến 198 endpoint không trôi khỏi nhau: vỏ phản hồi, kiểu dùng chung,
manifest endpoint, và 17 luật ép bằng máy. Frontend cần bốn thứ tương đương.

## 2.1. MỘT cửa gọi API, không component nào tự `fetch`

```
src/lib/api/client.ts     — fetch + vỏ { data, meta } + lỗi + timeout + revalidate
src/lib/api/<nhóm>.ts     — hàm theo nhóm, kiểu vào/ra từ @ltv/contracts
```

Vì sao bắt buộc: vỏ `{ data, meta }` phải được bóc **một lần**. Nếu mỗi component tự bóc
thì component thứ 19 sẽ quên, và cái giá là một trang hỏng riêng lẻ — đúng lý lẽ đã dùng
cho `EnvelopeInterceptor` ở backend.

**Không sinh mã từ OpenAPI.** Kiểu đã có sẵn trong `@ltv/contracts` và backend `import`
đúng những kiểu đó — đổi hình dạng phản hồi làm **frontend đỏ lúc biên dịch**. Thêm một
bộ sinh mã ở giữa là thêm một chỗ để hai bên lệch nhau.

## 2.2. Manifest route — bản sao của Luật 16

`ROUTES` trong contracts đã là danh sách 26 route. Cần **một luật đối chiếu hai chiều**
với thư mục `app/`:

- mọi `page.tsx` trong `app/` phải khớp một `ROUTES.path`
- mọi `ROUTES.path` (trừ những cái đánh dấu `phase` chưa tới) phải có `page.tsx`

Luật 16 của backend ra đời vì "đã xong API công khai" là một câu **không ai xác minh
được**. "Đã xong trang sản phẩm" cũng vậy.

Cần thêm trường `phase: 'W0'..'W8'` và `status: 'todo' | 'done'` vào `ROUTES`, y hệt
`API_ENDPOINTS` — để tiến độ **đọc ra từ mã**, không phải từ lời nói.

## 2.3. SEO tự sinh từ MỘT nơi

`ROUTES` đã mang sẵn `robots: 'index' | 'noindex' | 'conditional'`. Một helper duy nhất
`buildMetadata(routeKey, data)` sinh canonical + robots + hreflang + OG.

Vì sao không để mỗi trang tự viết: ADR-011 §2b là **quy tắc có điều kiện** (landing phân
loại có mô tả → `index`; rỗng → `noindex` + canonical về cha). Rải nó ra 26 trang nghĩa là
26 cơ hội viết sai, và **sai thì Google không báo gì cả** — nó âm thầm hạ độ tin cậy.

Ba route `conditional`: `products.category`, `products.standard`, `products.application`.

## 2.4. Chiến lược render và cache — quyết định một lần

| Loại trang | Render | Vì sao |
|---|---|---|
| Chi tiết (sản phẩm, bài viết, dịch vụ…) | RSC + `revalidate` | SEO cần HTML đầy đủ; nội dung đổi ít |
| Danh sách có lọc (`/products/all?...`) | RSC, `noindex,follow` | Tổ hợp lọc vô hạn, không cache theo URL |
| Trang chủ | RSC + `revalidate` ngắn | Backend đã cache 60s; đừng cache hai lớp lệch nhau |
| Form, modal | Client | Cần trạng thái |

Backend đã có `TtlCache` 60s cho `/home` và `/products/landing`. Đặt `revalidate` frontend
**dài hơn** TTL đó thì biên tập sửa xong phải đợi tổng hai lớp — phải chọn có ý thức, không
để mặc định.

---

# 3. Các phase

## W0 — Nền, và những thứ không ai muốn làm sau

### Làm gì

```
src/lib/api/          client + vỏ { data, meta } + lỗi + timeout
src/lib/routes.ts     helper sinh URL TỪ ROUTES (không viết chuỗi đường dẫn tay)
src/lib/seo.ts        buildMetadata() — canonical/robots/hreflang/OG
src/lib/i18n/         từ điển chữ giao diện VI/EN (ADR-014: việc của frontend)
src/app/layout.tsx    khung + font + biến CSS
src/app/not-found.tsx  src/app/error.tsx  loading.tsx
vitest + testing-library + eslint-config-next
```

Cộng: thêm `phase`/`status` vào `ROUTES`, và **luật kiến trúc frontend** (mục 5).

### Tự kiểm

- `buildMetadata` cho cả 26 route: canonical đúng, `robots` khớp `ROUTES.robots`
- gọi API lỗi (500, timeout, JSON hỏng) → `error.tsx`, **không** stack trace ra người dùng
- 404 render được **khi backend tắt hẳn** — trang lỗi không được phụ thuộc API
- `pnpm --filter @ltv/frontend test` chạy được (hiện chưa có test runner nào)

### Kiểm liên kết

- luật "mọi route trong `app/` phải có trong `ROUTES`" chạy và **đếm đúng số route**
  (bài học Luật 16: bộ quét bỏ sót cả một file mà vẫn xanh)

---

## W1 — Khung site

### Làm gì

```
TopBar · Header · MegaMenu · MobileMenu · Footer · Breadcrumb · LanguageSwitcher
src/app/page.tsx      trang chủ, 13 section theo thứ tự cố định (doc/08 PHẦN III)
```

API: `GET /navigation/:location`, `GET /home`, `GET /offices`, `GET /customers`.

### Tự kiểm

- header + footer lấy **từ `/navigation`**, không viết cứng mục nào
- mega menu sinh từ `product_mega_menu` của API — thêm một hãng `is_featured` ở DB thì
  menu đổi mà **không sửa mã**
- tắt một `homepage_sections` → khối biến mất khỏi trang chủ
- **số lần gọi API của một lần tải trang chủ là CỐ ĐỊNH** (ngân sách request — bản sao
  của "ngân sách truy vấn" ở backend), không tăng theo số sản phẩm
- menu có mục `url: null` (tiêu đề nhóm) → render thành chữ, **không** thành thẻ `<a>` rỗng

### Kiểm liên kết

- backend đã bỏ mục menu chết; frontend **không** được tự thêm `href="#"` cho `url: null`
- chuyển VI/EN ở trang **không có** bản dịch (brand, product, resource) → về trang danh
  sách tương ứng, **không** đổi tiền tố thành URL 404 (mục 0.2)

---

## W2 — Catalogue — **60% giá trị của site**

### Làm gì

```
/products                        landing (5 nhóm nổi bật)
/products/all                    danh sách + lọc + phân trang
/products/category|standard|application/:slug
FilterSidebar · MobileFilterDrawer · Chip · Pagination · ProductCard · EmptyState
```

### Tự kiểm — đây là phần dễ sai nhất, và `doc/08` PHẦN XII đã viết sẵn ca kiểm

- **ADR-007**: chọn PAC + Herzog (cùng dimension) → **OR**; thêm ASTM D86 (khác
  dimension) → **AND**. URL: `?brand=pac&brand=herzog&standard=astm-d86`
- bỏ chip PAC **chỉ** xóa PAC, không xóa cả nhóm
- URL là **nguồn sự thật của bộ lọc** — tải lại trang giữ nguyên trạng thái; nút back của
  trình duyệt hoạt động
- **ADR-015**: lọc `category=petroleum-testing` ra cả sản phẩm gắn ở danh mục con
- trang lọc → `noindex,follow`, canonical về `/products/all` (ADR-011)
- landing phân loại **có mô tả** → `index` + self-canonical; **rỗng** → `noindex` +
  canonical về cha (ADR-011 §2b)
- 0 kết quả → EmptyState kèm CTA tư vấn, **không** trang trắng
- **ADR-002**: sản phẩm ngừng kinh doanh **vẫn nằm trong danh sách**, kèm nhãn

### Kiểm liên kết

- mỗi slug lọc đến từ API, không viết cứng danh sách hãng/tiêu chuẩn
- slug không tồn tại → **404**, không phải danh sách rỗng (backend đã phân biệt hai
  trường hợp này; frontend không được gộp lại)

---

## W3 — Chi tiết sản phẩm — trang quan trọng nhất

### Làm gì

```
/products/:slug
ProductGallery · TechnicalSpecificationTable · DocumentDownload · RelatedProducts
structured data Product (KHÔNG giá) · BreadcrumbList
```

### Tự kiểm

- bảng thông số cuộn ngang trên mobile, **không** vỡ layout
- sản phẩm ngừng KD: giữ trang, hiện nhãn + sản phẩm thay thế (ADR-002) — **URL cũ vẫn
  200, vẫn index**
- structured data `Product` **không có** `price`/`offers` (không bán hàng)
- CTA báo giá cố định ở mobile
- tài liệu tải qua **slug**, không qua id
- `external_video` chỉ render embed YouTube/Vimeo đã được backend validate; nội dung chứa
  raw `iframe` → **không render** (ADR-012)

---

## W4 — Hãng, nội dung có bản dịch, và `/vi`

### Làm gì

```
/brands · /brands/:slug
/services · /services/:slug          + /vi/...
/projects · /projects/:slug          + /vi/...
/news · /news/category/:slug · /news/:slug   + /vi/...
/resources · /resources/:slug
/about · /about/:slug                + /vi/...
```

Đây là phase **duy nhất** đụng tới `/vi`. 15 route có, 11 route không (mục 0.2).

### Tự kiểm

- **hreflang chỉ khi CẢ HAI bản published** (ADR-004) — bản EN còn nháp → **không có**
  thẻ hreflang EN
- trang EN chưa publish → **404**, tuyệt đối **không trộn** nội dung VI vào trang EN
- `/vi/brands/...` → **404** (brands không có bản dịch), không phải trang trắng
- ba khối của dự án (phạm vi/triển khai/kết quả) render riêng, không gộp
- tên khách hàng chỉ hiện khi `customer_name != null` — `null` nghĩa là "không được nêu
  tên", **không** phải "không có khách hàng"

---

## W5 — Form báo giá và liên hệ — đường tiền

### Làm gì

```
InquiryModal (dùng chung) · ContactForm · /contact · /request-success
```

### Tự kiểm

- gửi **hai lần cùng `Idempotency-Key`** → một yêu cầu, cả hai lần đều thấy "đã tiếp nhận"
- form **tự nhận** sản phẩm/dịch vụ nguồn từ trang đang đứng
- SMTP lỗi vẫn hiện "đã tiếp nhận" — backend đã lưu DB trước rồi mới gửi (ADR-003)
- bấm Gửi hai lần nhanh → nút khoá, **không** gửi hai request
- lỗi validate hiện **bằng chữ**, không chỉ bằng màu (a11y)
- `/request-success` **không lộ** dữ liệu nhạy cảm và là `noindex`
- **không có** ô đính kèm ở P0 (`doc/08` PHẦN XI muc 3)

---

## W6 — SEO toàn site, đo bằng máy

W0 đã đặt cơ chế; phase này **xác minh trên site đã dựng xong**.

### Làm gì

Structured data (Organization/LocalBusiness, Product, Article, BreadcrumbList, FAQPage),
OG image theo chuỗi fallback (featured → cover → logo → default_social_image),
`CookieBanner`, nối `sitemap.xml`/`robots.txt` của backend.

### Tự kiểm — **bằng cách bò qua site thật**, không đọc mã

- mọi URL trong `sitemap.xml` gọi thật trả **200** (backend đã kiểm phía nó; đây là kiểm
  phía render)
- **không** URL nào trong sitemap là nguồn của một redirect
- mỗi trang đúng **một** `<h1>`
- `canonical` của mọi trang khớp `ROUTES.robots`
- không trang nào vừa `noindex` vừa nằm trong sitemap

---

## W7 — Tìm kiếm và trang hệ thống

```
/search?q=  ·  404  ·  error  ·  /privacy-policy /terms-of-use /cookie-policy
```

### Tự kiểm

- `q` dưới 2 ký tự → **không gọi API** (backend trả 422; frontend không nên tạo ra 422)
- 0 kết quả → gợi ý, không trang trắng
- `/search` là `noindex`
- 404 có ô tìm kiếm + link về nhóm sản phẩm (`doc/08` PHẦN VIII)

---

## W8 — Chất lượng đo được

Không phải "đánh bóng" — là **ngưỡng có số**, đo bằng lệnh.

- **Ngân sách JS** cho mỗi route, kiểm bằng `next build` (in ra kích thước từng route)
- **LCP / CLS** trên trang chủ và chi tiết sản phẩm
- **A11y**: điều hướng bàn phím qua toàn bộ menu; modal giữ focus; menu mobile đóng bằng
  `Esc`; tương phản đủ
- **Responsive**: 4 mốc (<768, 768–1023, ≥1024, ≥1440)
- ảnh qua `next/image`, WebP/AVIF, lazy load

---

# 4. Thứ tự và điểm mở khóa

```
W0 ──> W1 ──> W2 ──> W3 ──┬──> W6 ──> W8
                          ├──> W4
                          ├──> W5
                          └──> W7
```

| Xong phase | Xem được gì |
|---|---|
| W1 | site có khung, trang chủ chạy bằng dữ liệu thật |
| **W3** | **catalogue đầy đủ — phần lớn giá trị của site** |
| W4 | toàn bộ nội dung, hai ngôn ngữ |
| W5 | **nhận được yêu cầu báo giá** |
| W6 | Google index được đúng cách |
| W7–W8 | đủ điều kiện lên sóng |

**Track quản trị (A1–A5) tách riêng**, làm sau W5 hoặc song song nếu có người thứ hai.
136 endpoint admin đã sẵn. `doc/14` §5.2 đã chốt là **có làm**, nhưng nó không chặn việc
đưa website công khai lên.

---

# 5. Luật kiến trúc frontend — ép bằng máy, không bằng review

Backend có 17 luật chạy như test. Đây là bộ tương đương, và mỗi luật **đóng một lỗi cụ
thể** chứ không phải một sở thích:

| # | Luật | Đóng lỗi gì |
|---|---|---|
| 1 | Không component nào gọi `fetch` trực tiếp — chỉ qua `src/lib/api/` | vỏ `{data}` bị bóc sai ở một chỗ |
| 2 | Mọi route trong `app/` ↔ `ROUTES`, **cả hai chiều** | "đã xong trang X" không ai xác minh được |
| 3 | Không viết chuỗi đường dẫn tay — dùng helper từ `ROUTES` | đổi URL làm chết link rải rác |
| 4 | Mọi `page.tsx` phải xuất `generateMetadata` (hoặc dùng helper chung) | trang thiếu canonical/robots, Google không báo |
| 5 | Không `redirect()`/`permanentRedirect()` của App Router | chúng phát 307/308 — **đã đo** ở spike P0 |
| 6 | Không `<img>` thô | mất WebP/AVIF + lazy load, LCP xấu |
| 7 | Không `process.env` ngoài `src/config.ts` | biến môi trường thiếu chỉ lộ lúc chạy |
| 8 | Không `dangerouslySetInnerHTML` ngoài renderer block đã kiểm | XSS từ nội dung quản trị (ADR-012) |
| 9 | Không chuỗi hiển thị cứng trong component — qua từ điển i18n | ADR-014 giao việc dịch chữ giao diện cho frontend |
| 10 | Không `any`/`as unknown as` với dữ liệu API | mất đúng cái lợi của `@ltv/contracts` |

Cộng hai công cụ, **bản sao của backend**:

- **`scripts/smoke-web.mjs`** — bò qua site **đang chạy thật**, kiểm mã trạng thái,
  canonical, robots, hreflang, số `<h1>`, và `sitemap` ↔ trang thật. Đối lại
  `smoke-api.mjs` (228 phép kiểm).
- **`scripts/inject-web.mjs`** — tiêm lỗi. Dùng lại
  `scripts/lib/inject-harness.mjs` đã có (nó nhận `cwd`, nên chỉ cần truyền `frontend`).

**Bài học phải mang sang:** F5–F8 từng có test hồi quy cho cả 10 lỗi đã sửa mà **không có
phép tiêm nào** chứng minh chúng không rỗng — và khi làm phép tiêm thì lộ ra một bài kiểm
dùng mock cho **chính thứ nó tuyên bố kiểm** (`doc/13` mục 23.4). Với frontend, rủi ro đó
còn cao hơn: test giao diện rất dễ trở thành "render được là xanh".

---

# 6. Ba thứ cần chốt

## 6.1. Thư viện giao diện

`doc/08` liệt kê ~35 component. Ba hướng: tự viết + CSS Modules · Tailwind · Tailwind +
shadcn/ui. Quyết định này ảnh hưởng W0 và không đổi được rẻ sau đó.

## 6.2. Nội dung thật cho catalogue

**Đã phân tích riêng ở [`doc/18_DU_LIEU_TU_WEB_CU.md`](18_DU_LIEU_TU_WEB_CU.md)** (đọc
web cũ thật ngày 2026-08-10). Kết luận quan trọng nhất: **tính năng chính của web mới —
lọc theo danh mục/tiêu chuẩn/ứng dụng — không có nguồn dữ liệu ở web cũ.** Web cũ tổ chức
theo hãng, không có danh mục chức năng, không có tiêu chuẩn gắn với máy. Copy sang thì
những trang đó rỗng.

Đã chốt **đưa sản phẩm PAC vào catalogue** (`doc/14` §5.1). Nghĩa là cần nội dung kỹ thuật
thật từ bộ phận kỹ thuật cho từng máy. Frontend **không chặn** — dựng bằng dữ liệu demo
được — nhưng lên sóng thì chặn.

Đề nghị làm sớm trong W2: **nâng seed demo lên quy mô thật (~300 sản phẩm)**. Bug
`LinkResolver` vừa rồi ẩn được suốt vì DB demo chỉ có 12 sản phẩm (`doc/13` mục 23.7); một
catalogue giả nhỏ sẽ giấu đúng lớp lỗi đó ở frontend (phân trang, lọc, sitemap).

## 6.3. Ảnh sản phẩm

Backend F7 đã có upload + biến thể. Nhưng **chưa có ảnh thật nào**. Không có ảnh thì
không đánh giá được layout card, gallery hay LCP.

---

# 7. Cách tự kiểm mỗi phase — giữ nguyên từ backend

1. **Chạy thật, không đọc lại.** Mỗi phase kết thúc bằng một lệnh chạy được.
2. **Tiêm lỗi mọi bảo đảm mới.** Phép kiểm không đỏ khi phá mã thì nó không kiểm gì.
3. **Đo, đừng tuyên bố.** "Trang nhanh" là một câu; "LCP 1,8s trên 4G mô phỏng" là một số.
4. **Mỗi lần tiêm một tệp sao lưu riêng + đối chiếu băm sau khi hoàn tác.**
5. **Sau mỗi lần chạy formatter diện rộng, chạy lại bộ tiêm** trước khi trích số vào báo
   cáo (`doc/13` mục 22.3 — Prettier từng làm hỏng 3/14 phép tiêm trong im lặng).
