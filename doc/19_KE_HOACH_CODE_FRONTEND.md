# Kế hoạch code frontend — cụ thể đến từng tệp

**Ngày:** 2026-08-10 · **Bổ sung cho** [`doc/17`](17_KE_HOACH_FRONTEND.md) (chia phase và
10 luật kiến trúc). Tài liệu này trả lời câu khác: **viết tệp nào, theo thứ tự nào, và khi
nào coi là xong.**

**Trạng thái:** W0–W8 đã hoàn thành ngày 2026-08-10; test, typecheck, lint, production
build, crawler SEO, ngân sách hiệu năng, accessibility và kiểm thử responsive đều xanh.
Frontend công khai đã đủ điều kiện chuyển sang chuẩn bị triển khai; track tiếp theo độc lập
là giao diện quản trị A1–A5.

---

# 1. Mục tiêu đã đổi — và điều đó đổi cái gì

`doc/17` viết theo mục tiêu **lên sóng**. Mục tiêu bạn nêu sau đó khác:

> "Làm giao diện để test toàn bộ chức năng web mình xây đã đúng chưa, sau đó cải thiện UI
> sau cho đẹp."

**Thứ tự phase giữ W0…W8**, nhưng chốt rõ W6 là tìm kiếm/trang hệ thống và W7 là kiểm SEO
toàn site. Thứ tự này có chủ ý: crawler SEO chỉ chạy sau khi mọi trang công khai đã tồn tại.
Cái đổi so với mục tiêu lên sóng là
**ngưỡng nghiệm thu**: một phase xong khi *chức năng đúng và kiểm được*, không phải khi
*trông đẹp*.

Nói thẳng để khỏi hiểu nhầm: **tôi không viết mã xấu.** Tôi bỏ phần **thẩm mỹ**, không bỏ
phần **cấu trúc**.

| Bỏ lại sau (rẻ khi làm sau) | Làm ngay từ đầu (đắt khi làm sau) |
|---|---|
| Màu, khoảng cách, bo góc, bóng | HTML đúng ngữ nghĩa, một `<h1>` mỗi trang |
| Font chữ, tỉ lệ cỡ chữ | Landmark (`header`/`nav`/`main`/`footer`) |
| Ảnh nền, minh họa, hiệu ứng | Nhãn form, thông báo lỗi bằng chữ |
| Bố cục tinh, lưới đẹp | Thứ tự focus, thao tác bằng bàn phím |
| Animation | `alt` cho ảnh, `next/image` |

Lý do: đổi CSS là đổi một tệp. Đổi cấu trúc là viết lại component. Dựng bằng `<div>` lồng
nhau thì "cải thiện UI sau" **là làm lại từ đầu**, và khoản đầu tư vào W1–W7 mất trắng.

---

# 2. Chốt thư viện giao diện — đề xuất

**Tailwind CSS v4, KHÔNG dùng thư viện component (không shadcn/ui, không MUI).**

| | Vì sao hợp với mục tiêu hiện tại |
|---|---|
| Tailwind | Giai đoạn "chưa đẹp" chỉ cần vài lớp tiện ích để mọi thứ đọc được. Giai đoạn "làm đẹp" sau này sửa **trong chính tệp component**, không phải đi tìm tệp CSS tương ứng. |
| Không thư viện component | Component dựng sẵn mang theo **thẩm mỹ của nó**. Ta sẽ thay thẩm mỹ đó ở W8 — tức trả tiền hai lần. Và nó che mất HTML thật, đúng thứ ta cần giữ đúng. |

Thêm sau vẫn được, nhưng **thêm thì rẻ, gỡ thì đắt** — nên chưa thêm.

Cần cài ở W0: `tailwindcss`, `@tailwindcss/postcss`, `vitest`, `@vitejs/plugin-react`,
`@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`,
`@next/eslint-plugin-next` ghim cùng phiên bản Next.js. Repository đã có ESLint flat config riêng,
nên không lắp thêm một cấu hình Next độc lập dễ chồng luật.

---

# 3. Dữ liệu để dựng — hai lớp, chạy song song

Đã chốt: bỏ phụ thuộc web cũ, dùng **5 máy đặc trưng** để minh họa.

**Lớp 1 — minh họa (5 máy thật).** Để nhìn thấy trang thật trông ra sao:

| Máy | Hãng | Danh mục | Tiêu chuẩn |
|---|---|---|---|
| OptiDist 2 | ISL | Chưng cất | ASTM D86, D1078, D850 |
| OptiFlash | ISL | Điểm chớp cháy | ASTM D93, D92 |
| HVM 472 | Herzog | Độ nhớt | ASTM D445 *(cần xác nhận)* |
| OptiCPP | ISL | Tính chất lạnh | ASTM D2500, D5771, D97, D5950 |
| OptiMPP | ISL | Tính chất lạnh | ASTM D2500, D7346 |

**Lớp 2 — kiểm thử nghiệp vụ (seed hiện có, GIỮ NGUYÊN).** 12 sản phẩm + các trường hợp đối nghịch:
bản nháp, bản dịch thiếu, sản phẩm ngừng kinh doanh, menu trỏ tới nội dung đã xóa, banner
liên kết chết, khách hàng chưa cho phép dùng logo.

**Lớp 3 — kiểm thử tải (sinh/xóa độc lập).** Tạo hơn 100 sản phẩm bằng fixture có tiền tố
riêng để lộ lỗi kiểu "chỉ tra 100 bản ghi đầu" (`doc/13` §23.7), không làm phình seed demo.

**Vì sao phải có cả ba:** với 5 hay 17 sản phẩm thì phân trang và lỗi giới hạn 100 bản ghi
không thể lộ ra. Bỏ lớp 2 làm mất các ca đối nghịch; bỏ lớp 3 làm phép kiểm quy mô luôn xanh
dù truy vấn bị cắt ngầm.

Lớp 1 dùng tiền tố slug riêng để tách khỏi lớp 2 và xóa lại được bằng một câu lệnh.

---

# 4. Thứ tự viết mã — từng phase, từng tệp

## W0 — Nền

```
frontend/package.json              + tailwind, vitest, testing-library, Next ESLint plugin
frontend/vitest.config.ts          jsdom + alias @/
frontend/postcss.config.mjs
frontend/src/app/globals.css       @import "tailwindcss" + biến CSS
frontend/next.config.mjs           proxy /api/v1, /media, sitemap, robots
frontend/src/config.ts             nơi duy nhất trong src/** đọc process.env (Luật 7)
frontend/src/lib/api/client.server.ts  fetch nội bộ + timeout + revalidate
frontend/src/lib/api/client.browser.ts fetch same-origin cho mutation
frontend/src/lib/api/{envelope,errors}.ts kiểm vỏ + một biên kiểu được kiểm soát
frontend/src/lib/api/site.ts       home · navigation · customers · offices · search
frontend/src/lib/api/taxonomy.ts   brands · categories · standards · applications · industries
frontend/src/lib/api/products.ts   landing · list · detail
frontend/src/lib/api/content.ts    pages · services · projects · posts · documents
frontend/src/lib/api/inquiries.ts  POST /inquiries
frontend/src/lib/routes.ts         sinh URL TỪ ROUTES (Luật 3)
frontend/src/lib/seo.ts            buildMetadata() (Luật 4)
frontend/src/lib/i18n/{vi,en}.ts   từ điển chữ giao diện (Luật 9)
frontend/src/app/layout.tsx        html/body + landmark + font
frontend/src/app/not-found.tsx     KHÔNG gọi API
frontend/src/app/error.tsx         KHÔNG lộ stack trace
frontend/test/architecture.test.ts 10 luật kiến trúc (doc/17 §5)
packages/contracts/src/routes.ts   + phase/status cho 26 route
```

**Xong khi:** `pnpm --filter @ltv/frontend test` chạy · `buildMetadata` đúng cho cả 26
route · 404 render được **khi backend tắt hẳn** · luật kiến trúc đếm đúng số route.

**Chưa có trang nào để xem.** Đây là phase duy nhất không có gì nhìn được, và cũng là
phase duy nhất không thể làm sau.

## W1 — Khung site + trang chủ

```
src/components/layout/{TopBar,Header,MegaMenu,MobileMenu,Footer}.tsx
src/components/layout/{Breadcrumb,LanguageSwitcher}.tsx
src/components/ui/{Card,EmptyState,Skeleton,Pagination}.tsx
src/app/page.tsx                   trang chủ — 13 khối theo thứ tự API trả về
```

**Xong khi:** menu vẽ **từ `/navigation`**, không viết cứng mục nào · tắt một
`homepage_sections` ở DB thì khối biến mất khỏi trang chủ · mục menu `url: null` render
thành chữ, không thành thẻ `<a>` rỗng · số lần gọi API của một lần tải trang chủ **cố
định**.

**Đã đo W1:** đúng 5 request (`header` + `mobile` + `footer` + `home` + `offices`), không
tăng theo số card. Seed hiện có menu mobile rỗng; frontend dùng chính menu header từ API
làm fallback, không thêm request và không viết cứng mục điều hướng.

## W2 — Catalogue và bộ lọc — **phase quan trọng nhất**

```
src/app/products/page.tsx                       landing
src/app/products/all/page.tsx                   danh sách + lọc
src/app/products/category/[slug]/page.tsx
src/app/products/standard/[slug]/page.tsx
src/app/products/application/[slug]/page.tsx
src/components/product/{ProductCard,ProductGrid}.tsx
src/components/filter/{FilterSidebar,FilterChips,MobileFilterDrawer}.tsx
src/lib/filter.ts                               đọc/ghi bộ lọc TỪ URL
```

**Xong khi** (ca kiểm đã có sẵn ở `doc/08` PHẦN XII):

- PAC + Herzog cùng nhóm → **OR**; thêm ASTM D86 khác nhóm → **AND**
- bỏ chip PAC chỉ xóa PAC
- tải lại trang giữ nguyên bộ lọc; nút back của trình duyệt hoạt động
- lọc `category=cold-properties` ra **cả OptiCPP lẫn OptiMPP** (ADR-015)
- trang lọc `noindex,follow`, canonical về `/products/all`
- slug không tồn tại → **404**, không phải danh sách rỗng
- 0 kết quả → EmptyState kèm CTA, không trang trắng

`src/lib/filter.ts` là chỗ dễ sai nhất của cả frontend: **URL là nguồn sự thật**, không
phải state của component. Làm ngược lại thì nút back hỏng và chia sẻ link ra kết quả khác.

**Đã đo W2:** 5/5 route hoàn thành · catalogue tổng dùng 6 request API cố định (1 danh sách
+ 5 nguồn taxonomy) · truy vấn card vẫn 2 câu SQL dù trả 1 hay 100 dòng · fixture tải độc
lập 105 sản phẩm đi đến đúng trang cuối rồi tự xóa · seed demo có 17 sản phẩm/16 tiêu chuẩn.
Browser test đã xác nhận PAC + Herzog + ASTM D86 trả đúng 2 máy, bỏ riêng chip PAC giữ
Herzog, Back khôi phục URL, `cold-properties` trả OptiCPP + OptiMPP, empty state có CTA,
slug taxonomy sai trả HTTP 404 thật, và desktop/mobile không tràn ngang. Trang có bộ lọc
phát `noindex,follow` với canonical `/products/all`; catalogue gốc vẫn `index,follow`.

## W3 — Chi tiết sản phẩm

```
src/app/products/[slug]/page.tsx
src/components/product/{ProductGallery,SpecificationTable,StandardList,RelatedProducts}.tsx
src/components/product/DiscontinuedNotice.tsx
src/components/content/ContentBlocks.tsx             renderer an toàn, không nhận HTML thô
src/lib/structured-data.ts                      Product (KHÔNG giá) + BreadcrumbList
```

**Xong khi:** bảng thông số cuộn ngang trên mobile không vỡ · sản phẩm ngừng kinh doanh
**vẫn 200, vẫn index**, có nhãn + sản phẩm thay thế (ADR-002) · structured data `Product`
**không có** `price`/`offers` · `external_video` chỉ render embed đã được backend duyệt,
nội dung chứa `iframe` thô **không render** (ADR-012).

**Đã đo W3:** 1/1 route hoàn thành · contracts 35/35 và frontend 39/39 test xanh · route
chi tiết có First Load JS 111 kB · OptiDist 2 có 4 dòng thông số và 2 sản phẩm liên quan ·
AD 86 5G ngừng kinh doanh vẫn trả HTTP 200, `index,follow` và liên kết tới OptiDist 2 ·
slug không tồn tại trả HTTP 404 thật. Ở viewport 390 px, toàn trang không tràn ngang,
bảng 672 px cuộn trong khung 342 px và CTA báo giá ở vị trí fixed. Mỗi trang có một `<h1>`,
hai JSON-LD `Product`/`BreadcrumbList`; `Product` không chứa `price` hoặc `offers`. Nội dung
`iframe` thô chỉ hiện như chữ, còn video chỉ dựng URL từ provider YouTube/Vimeo và video ID
đã duyệt. Gallery dùng placeholder cho đến khi có tệp ảnh thật, không phát URL ảnh hỏng.

## W4 — Nội dung có bản dịch và `/vi`

```
src/app/brands/page.tsx · [slug]/page.tsx
src/app/services · projects · news · resources · about   (+ bản /vi cho 4 nhóm)
src/app/vi/about · services · projects · news             9 route /vi của W4
src/components/content/{ContentBlocks,PostCard,ProjectCard,ServiceCard,DocumentCard}.tsx
```

Tổng cộng có **15** biến thể `/vi`, nhưng được hoàn thành qua ba phase: 9 route ở W4,
`contact` + `request-success` ở W5, và `search` + ba trang policy ở W6. Viết route tường minh,
không dùng catch-all `src/app/vi/[...]`.

**Xong khi:** hreflang **chỉ khi cả hai bản published** (ADR-004) · trang EN chưa publish
→ **404**, không trộn nội dung VI · `/vi/brands/...` → **404** (brands không có bản dịch) ·
chuyển ngôn ngữ ở trang không có bản dịch → về trang danh sách, không đổi tiền tố thành URL
404.

**Đã đo W4:** 13/13 route trong manifest hoàn thành, tương ứng 22 tệp `page.tsx` của W4
(13 EN + 9 VI) và đưa toàn cây `app/` lên 29 trang · contracts 35/35 và frontend 45/45
test xanh · typecheck, lint, format và production build đều xanh; các trang nội dung có
First Load JS tối đa 111 kB. Browser test xác nhận chuyển EN→VI tải đúng document với
`<html lang="vi">`; hreflang chỉ sinh cho cặp bản dịch đã published; bản nháp, bản dịch
thiếu và `/vi/brands`, `/vi/products`, `/vi/resources` đều trả HTTP 404 thật. Hai trang
About EN/VI trả 200; dự án giữ riêng ba khối nội dung, không lộ tên khách hàng khi giá trị
`null`; tài liệu tải bằng slug. Ở viewport 390 px, trang VI có đúng một `<h1>` và không
tràn ngang.

## W5 — Form báo giá

```
src/components/inquiry/{InquiryModal,InquiryForm,ContactForm}.tsx
src/app/contact/page.tsx · src/app/request-success/page.tsx
src/lib/idempotency.ts
```

**Xong khi:** gửi hai lần cùng `Idempotency-Key` → **một** yêu cầu, cả hai lần đều thấy
"đã tiếp nhận" · form tự nhận sản phẩm nguồn từ trang đang đứng · SMTP lỗi vẫn hiện "đã
tiếp nhận" · bấm Gửi hai lần nhanh → nút khóa · lỗi validate hiện **bằng chữ**.

**Đã đo W5:** 2/2 route manifest hoàn thành, tương ứng 4 trang EN/VI và đưa toàn cây
`app/` lên 33 `page.tsx` · contracts 35/35, frontend 48/48 test xanh · typecheck, lint,
format và production build đều xanh; route nặng nhất có First Load JS 137 kB. Form dùng
một UUID cho suốt lần mở, khóa ngay lần submit đầu và gửi slug công khai để backend ánh
xạ sang `product_id`/`service_id`; phép gửi thật hai lần cùng key trả đúng cùng một
`request_id`. Browser test xác nhận modal native giữ focus, đóng xong trả focus về CTA,
form nhận đúng OptiDist 2 hoặc dịch vụ nguồn, submit chuyển sang trang thành công, lỗi
validate hiện bằng chữ, `/request-success` là `noindex,follow`, và trang VI 390 px có đúng
một `<h1>` mà không tràn ngang. Hai inquiry QA được kiểm tra có `product_id` rồi đã xóa
cùng outbox tương ứng.

## W6 — Tìm kiếm và trang hệ thống

```
src/app/search/page.tsx
src/app/privacy-policy · terms-of-use · cookie-policy
src/components/ui/CookieBanner.tsx
```

**Xong khi:** `q` dưới 2 ký tự → **không gọi API** · 0 kết quả → gợi ý, không trang trắng ·
`/search` là `noindex`.

**Đã đo W6:** 4/4 route manifest hoàn thành, tương ứng 8 trang EN/VI và đưa toàn cây
`app/` lên 41 `page.tsx`; toàn bộ 26/26 route công khai hiện ở trạng thái `done`. Contracts
35/35 và frontend 54/54 test xanh; typecheck, lint, format và production build đều xanh,
route nặng nhất giữ First Load JS 137 kB. Browser test xác nhận search EN/VI trả đúng sản
phẩm và chỉ có một `<h1>`, truy vấn ngắn hiển thị hướng dẫn mà unit test chứng minh không
gọi API, kết quả rỗng có link danh mục/liên hệ, `/search` có canonical sạch và
`noindex,follow`. Cả sáu trang policy lấy nội dung đã publish từ CMS, có đúng locale,
canonical và hreflang; Cookie Banner lưu cả lựa chọn đồng ý/từ chối và không hiện lại sau
điều hướng; 404 vẫn không phụ thuộc API nhưng có ô tìm kiếm, link trang chủ và sản phẩm.

## W7 — Kiểm SEO toàn site

Cơ chế đã đặt ở W0; phase này **xác minh trên site đã dựng xong**.

```
scripts/smoke-web.mjs              bò qua site đang chạy thật
src/lib/structured-data.ts         + Organization/LocalBusiness, Article, FAQPage
```

**Xong khi:** mọi URL trong `sitemap.xml` gọi thật trả **200** · không URL nào trong
sitemap là nguồn của một redirect · mỗi trang đúng **một** `<h1>` · canonical khớp
`ROUTES.robots` · không trang nào vừa `noindex` vừa nằm trong sitemap.

**Đã đo W7 ngày 2026-08-10:** `smoke-web.mjs` đạt **380/380** phép kiểm trên toàn bộ URL
được lấy từ sitemap thật: tất cả trả 200 trực tiếp, đúng một `<h1>`, canonical tự tham
chiếu và được index; `/search` cùng `/request-success` không nằm trong sitemap và giữ
`noindex,follow`. Structured data đã có Organization/LocalBusiness, Product,
NewsArticle, BreadcrumbList và FAQPage; trình duyệt xác nhận FAQ hiển thị và JSON-LD dùng
chính cùng câu hỏi/đáp án. FAQ dịch vụ được chuẩn hóa bằng migration `038`; chuỗi fallback
OG image đã có unit test. Frontend **58/58** test xanh; toàn monorepo test, typecheck, lint
và production build đều đạt, route nặng nhất giữ First Load JS **137 kB**. Các URL ảnh OG
cấp site vẫn để trống trong môi trường cục bộ; khi triển khai cần cấu hình ít nhất một trong
`SEO_SITE_COVER_IMAGE_URL`, `SEO_SITE_LOGO_URL` hoặc `SEO_DEFAULT_SOCIAL_IMAGE_URL`.

## W8 — Thẩm mỹ, hiệu năng, a11y — **sau khi nghiệm thu chức năng**

Đây là phase bạn nói "cải thiện sau". Nó chỉ bắt đầu khi W1–W7 đã xanh.

```
scripts/check-web-budgets.mjs      ép ngân sách JavaScript theo route
scripts/measure-web-vitals.mjs     đo Lighthouse LCP/CLS/a11y
scripts/smoke-responsive.mjs       kiểm 4 viewport + bàn phím + focus
scripts/inject-web.mjs             tiêm lỗi cho frontend
```

**Xong khi:** ngân sách JS mỗi route có số · LCP/CLS trang chủ và chi tiết sản phẩm có số ·
điều hướng bàn phím qua toàn bộ menu · modal giữ focus · 4 mốc responsive.

**Đã đo W8 ngày 2026-08-10:** đủ **41 route** nằm dưới ngân sách 150 KiB gzip; route lớn
nhất đạt **133,8 KiB**. Lighthouse mobile mô phỏng ghi LCP **1.892 ms** ở trang chủ và
**1.964 ms** ở chi tiết sản phẩm, CLS **0,000** cho cả hai, Performance **99/100** và
Accessibility **100/100**. Bộ responsive đạt **11/11** phép kiểm tại 390, 768, 1024 và
1440 px: không tràn ngang, menu mobile đóng bằng `Esc` rồi trả focus, toàn bộ menu desktop
đi được bằng bàn phím, modal giữ vòng Tab và trả focus về CTA. `inject-web.mjs` đạt **8/8**
phép tiêm; frontend **64/64** test xanh. Toàn monorepo test, typecheck, lint, format,
production build và crawler SEO 380/380 đều đạt. Báo cáo chi tiết nằm tại
[`doc/20`](20_BAO_CAO_NGHIEM_THU_FRONTEND_W0_W8.md).

---

# 5. Kiểm soát — giống hệt backend

| Backend | Frontend |
|---|---|
| 17 luật kiến trúc | **10 luật** (`doc/17` §5) — W0 |
| `API_ENDPOINTS` + Luật 16 hai chiều | `ROUTES` + `phase`/`status` — W0 |
| `smoke-api.mjs` 228 phép kiểm | `smoke-web.mjs` — W7 |
| `inject-f4` + `inject-f5-f8` 38 phép tiêm | `inject-web.mjs` — W8, dùng lại `scripts/lib/inject-harness.mjs` |
| Ngân sách truy vấn | Ngân sách **request API** mỗi trang — W1 |

Ba luật giữ nguyên từ backend:

1. **Chạy thật, không đọc lại.** Mỗi phase kết thúc bằng một lệnh chạy được.
2. **Tiêm lỗi mọi bảo đảm mới.** Phép kiểm không đỏ khi phá mã thì nó không kiểm gì. Với
   frontend rủi ro này **cao hơn** backend — test giao diện rất dễ thành "render được là
   xanh".
3. **Đo, đừng tuyên bố.**

---

# 6. Còn chặn

| | Chặn gì | Cần ai |
|---|---|---|
| Thư viện giao diện | Đã chốt Tailwind CSS v4, không component library | — |
| Ảnh thật cho thiết bị | Chất lượng nội dung khi lên sóng, không chặn mã nguồn | bạn cung cấp; hiện có trạng thái giữ chỗ |
| Mô tả kỹ thuật sản phẩm | Chất lượng nội dung khi lên sóng, không chặn mã nguồn | bộ phận kỹ thuật duyệt |
| Ảnh Open Graph cấp site | Preview khi chia sẻ liên kết | cấu hình biến môi trường sau khi có tài sản đã xuất bản |

W0–W8 đã hoàn thành. Không còn blocker mã nguồn cho frontend công khai; các mục trên là
nội dung/vận hành trước khi triển khai hoặc thuộc track quản trị A1–A5 độc lập.
