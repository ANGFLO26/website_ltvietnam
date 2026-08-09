# Kế hoạch code frontend — cụ thể đến từng tệp

**Ngày:** 2026-08-10 · **Bổ sung cho** [`doc/17`](17_KE_HOACH_FRONTEND.md) (chia phase và
10 luật kiến trúc). Tài liệu này trả lời câu khác: **viết tệp nào, theo thứ tự nào, và khi
nào coi là xong.**

---

# 1. Mục tiêu đã đổi — và điều đó đổi cái gì

`doc/17` viết theo mục tiêu **lên sóng**. Mục tiêu bạn nêu sau đó khác:

> "Làm giao diện để test toàn bộ chức năng web mình xây đã đúng chưa, sau đó cải thiện UI
> sau cho đẹp."

**Thứ tự phase không đổi** — vẫn W0…W8, vì phụ thuộc kỹ thuật không đổi. Cái đổi là
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
`@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `eslint-config-next`.

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

**Lớp 2 — kiểm thử (seed hiện có, GIỮ NGUYÊN).** 12 sản phẩm + các trường hợp đối nghịch:
bản nháp, bản dịch thiếu, sản phẩm ngừng kinh doanh, menu trỏ tới nội dung đã xóa, banner
liên kết chết, khách hàng chưa cho phép dùng logo.

**Vì sao phải có cả hai:** với 5 sản phẩm thì phân trang không có gì để phân, mega menu
gần như trống, và lỗi kiểu "chỉ tra 100 bản ghi đầu" (`doc/13` §23.7) **không thể lộ ra**.
Bỏ lớp 2 là lặp lại đúng lỗi vừa gặp.

Lớp 1 dùng tiền tố slug riêng để tách khỏi lớp 2 và xóa lại được bằng một câu lệnh.

---

# 4. Thứ tự viết mã — từng phase, từng tệp

## W0 — Nền

```
frontend/package.json              + tailwind, vitest, testing-library, eslint-config-next
frontend/vitest.config.ts          jsdom + alias @/
frontend/postcss.config.mjs
frontend/src/app/globals.css       @import "tailwindcss" + biến CSS
frontend/src/config.ts             NƠI DUY NHẤT đọc process.env (Luật 7)
frontend/src/lib/api/client.ts     fetch + bóc { data, meta } + lỗi + timeout + revalidate
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
src/components/ui/{Card,EmptyState,ErrorState,Skeleton,Pagination}.tsx
src/app/page.tsx                   trang chủ — 13 khối theo thứ tự API trả về
```

**Xong khi:** menu vẽ **từ `/navigation`**, không viết cứng mục nào · tắt một
`homepage_sections` ở DB thì khối biến mất khỏi trang chủ · mục menu `url: null` render
thành chữ, không thành thẻ `<a>` rỗng · số lần gọi API của một lần tải trang chủ **cố
định**.

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

## W3 — Chi tiết sản phẩm

```
src/app/products/[slug]/page.tsx
src/components/product/{ProductGallery,SpecificationTable,StandardList,RelatedProducts}.tsx
src/components/product/DiscontinuedNotice.tsx
src/lib/structured-data.ts                      Product (KHÔNG giá) + BreadcrumbList
```

**Xong khi:** bảng thông số cuộn ngang trên mobile không vỡ · sản phẩm ngừng kinh doanh
**vẫn 200, vẫn index**, có nhãn + sản phẩm thay thế (ADR-002) · structured data `Product`
**không có** `price`/`offers` · `external_video` chỉ render embed đã được backend duyệt,
nội dung chứa `iframe` thô **không render** (ADR-012).

## W4 — Nội dung có bản dịch và `/vi`

```
src/app/brands/page.tsx · [slug]/page.tsx
src/app/services · projects · news · resources · about   (+ bản /vi cho 4 nhóm)
src/app/vi/[...]                                          15 route có /vi
src/components/content/{ContentBlocks,PostCard,ProjectCard,ServiceCard,DocumentCard}.tsx
```

**Xong khi:** hreflang **chỉ khi cả hai bản published** (ADR-004) · trang EN chưa publish
→ **404**, không trộn nội dung VI · `/vi/brands/...` → **404** (brands không có bản dịch) ·
chuyển ngôn ngữ ở trang không có bản dịch → về trang danh sách, không đổi tiền tố thành URL
404.

## W5 — Form báo giá

```
src/components/inquiry/{InquiryModal,InquiryForm,ContactForm}.tsx
src/app/contact/page.tsx · src/app/request-success/page.tsx
src/lib/idempotency.ts
```

**Xong khi:** gửi hai lần cùng `Idempotency-Key` → **một** yêu cầu, cả hai lần đều thấy
"đã tiếp nhận" · form tự nhận sản phẩm nguồn từ trang đang đứng · SMTP lỗi vẫn hiện "đã
tiếp nhận" · bấm Gửi hai lần nhanh → nút khóa · lỗi validate hiện **bằng chữ**.

## W6 — Tìm kiếm và trang hệ thống

```
src/app/search/page.tsx
src/app/privacy-policy · terms-of-use · cookie-policy
src/components/ui/CookieBanner.tsx
```

**Xong khi:** `q` dưới 2 ký tự → **không gọi API** · 0 kết quả → gợi ý, không trang trắng ·
`/search` là `noindex`.

## W7 — Kiểm SEO toàn site

Cơ chế đã đặt ở W0; phase này **xác minh trên site đã dựng xong**.

```
scripts/smoke-web.mjs              bò qua site đang chạy thật
src/lib/structured-data.ts         + Organization/LocalBusiness, Article, FAQPage
```

**Xong khi:** mọi URL trong `sitemap.xml` gọi thật trả **200** · không URL nào trong
sitemap là nguồn của một redirect · mỗi trang đúng **một** `<h1>` · canonical khớp
`ROUTES.robots` · không trang nào vừa `noindex` vừa nằm trong sitemap.

## W8 — Thẩm mỹ, hiệu năng, a11y — **sau khi nghiệm thu chức năng**

Đây là phase bạn nói "cải thiện sau". Nó chỉ bắt đầu khi W1–W7 đã xanh.

```
scripts/inject-web.mjs             tiêm lỗi cho frontend
```

**Xong khi:** ngân sách JS mỗi route có số · LCP/CLS trang chủ và chi tiết sản phẩm có số ·
điều hướng bàn phím qua toàn bộ menu · modal giữ focus · 4 mốc responsive.

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
| Thư viện giao diện | **W0** | bạn duyệt mục 2 |
| Ảnh 5 máy | W2 nhìn được, W3 gallery | bạn cung cấp, hoặc dùng ảnh giữ chỗ |
| `ProductCardView` thiếu trường tiêu chuẩn | W2 | tôi thêm, một trường |
| `doc/08` PHẦN VII hai câu sai | W4 | tôi sửa tài liệu |
| Mô tả kỹ thuật 5 máy | lên sóng, **không** chặn dựng | bộ phận kỹ thuật duyệt |

Không khoản nào chặn việc bắt đầu W0 trừ khoản đầu.
