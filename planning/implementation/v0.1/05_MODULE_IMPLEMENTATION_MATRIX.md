# 05 — MODULE IMPLEMENTATION MATRIX

**Plan version:** v0.1 · **Trạng thái:** PROPOSED FOR CROSS-REVIEW · **Ngày:** 2026-07-22

Mỗi requirement P0 xuất hiện ≥1 lần. Cột: Module · Phase · API · Admin UI · Public UI · Database · Test (lớp chính) · Evidence.

> Viết tắt test: U=unit, I=integration(DB), A=API/contract, C=concurrency, E=E2E, S=security, SEO, P=perf, M=migration.

| # | Requirement | Module | Phase | API | Admin UI | Public UI | Database | Test | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Auth Admin** | auth | P2 | `/auth/login\|logout\|me\|change-password\|forgot\|reset` | Đăng nhập, đổi MK | — | users | U,I,A,E,S | login test, cookie flags, rate-limit log |
| 2 | **Users** | users | P2 | `/admin/users`(tối thiểu) | Hồ sơ | — | users | U,I,A | test CRUD |
| 3 | **Settings** | settings | P2 | `/admin/settings/:group` | Settings tabs | — | settings | U,I,A,S | mask secret test |
| 4 | **Health** | health | P2 | `/health/live`,`/health/ready` | Dashboard widget | — | — | I,A,S | ready-down test |
| 5 | **Structured audit logs** | (cross) | P2 | — (log) | — | — | — (không bảng) | U,S | mẫu log che PII |
| 6 | **Media** | media | P3 | `/admin/media` CRUD | Media library, picker | (ảnh render) | media | U,I,A,E,S | 409 test, SVG/MP4 reject |
| 7 | **Brands + sub-brands** | brands | P4 | `/brands`,`/brands/:slug`,`/brands/:slug/children` | Form hãng | list + hồ sơ hãng | brands+tr | U,I,A,E,S | no-loop, no-fallback EN |
| 8 | **Product Categories (cây)** | product_categories | P4 | `/product-categories`,`/tree`,`/:slug/products` | Cây kéo-thả | landing danh mục | product_categories+tr | U,I,A | tree no-N+1 |
| 9 | **Standards** | standards | P4 | `/standards`,`/:slug/products` | Bảng | landing tiêu chuẩn | standards+tr | U,I,A | unique(org,code) |
| 10 | **Applications (phẳng Admin)** | applications | P4 | `/applications`,`/:slug/products` | Danh sách phẳng | landing ứng dụng | applications+tr | U,I,A | phẳng dù DB có parent |
| 11 | **Industries** | industries | P4 | `/industries`,`/:slug/products`,`/:slug/services` | Card | landing/list | industries+tr | U,I,A | — |
| 12 | **Slug lifecycle** | SlugService | P4 | (nội bộ mọi entity slug) | slug field | (URL) | 12 tr + redirects | U,I | 3-nguồn reject, first_published_at once |
| 13 | **Products** | products | P5 | `/products`,`/products/:slug` | Form nhiều section | detail | products+tr+specs+6 link | U,I,A,E,P | publish transaction |
| 14 | **Product Search/Filter** | products, search | P5 | `/products?brand=...`(OR/AND),`/search` | filter Admin | FilterSidebar | pg_trgm, links | U,I,A,S,P | 3 tổ hợp filter, no-N+1 |
| 15 | **Product landing** | products | P5 | `/products/landing` | — | `/san-pham` | (batch) | A,P | landing shape, not /home |
| 16 | **Services (cây)** | services | P6 | `/services`,`/tree`,`/:slug` | Form cây | detail `/dich-vu/{slug}` | services+tr+links | U,I,A,E | flat URL |
| 17 | **Projects** | projects | P6 | `/projects`,`/:slug` | Form + visibility | detail | projects+tr+links | U,I,A,E,S | customer_visibility BE |
| 18 | **Posts (+categories)** | posts, post_categories | P6 | `/posts`,`/:slug`,`/post-categories/:slug/posts` | Form + block editor | detail `/tin-tuc/{slug}` | posts/post_categories+tr | U,I,A,E | RESTRICT category |
| 19 | **Documents** | documents | P6 | `/documents`,`/:slug`,`/:slug/download` | Form | list + download | documents+tr+links | U,I,A,E,S | download by slug |
| 20 | **Customers** | customers | P6 | `/customers` | Danh sách | logo section | customers+tr | U,I,A | is_public gate |
| 21 | **Offices** | offices | P6 | `/offices` | Form | `/lien-he` | offices+tr | U,I,A | — |
| 22 | **Pages** | pages | P6 | `/pages/:slug` | Form | trang giới thiệu/policy | pages+tr | U,I,A,E | system page không xóa |
| 23 | **External video** | (cross) | P6 | (validate trong content) | Block editor | render an toàn | (JSONB block) | U,E,S | reject raw iframe/domain lạ |
| 24 | **Inquiry persistence** | inquiries | P7 | `POST /inquiries` (202) | — (widget failed) | InquiryModal/ContactForm | inquiries | U,I,A,E,S | SMTP-lỗi-vẫn-202 |
| 25 | **Outbox worker** | inquiry_outbox | P7 | (worker) | — | — | inquiry_outbox | U,I,**C**,S,P | 2-worker SKIP LOCKED, reaper |
| 26 | **Locale publication** | PublishService | P4–P6 | (mọi 7 entity) | badge VI/EN | EN không trộn | 7 tr status | U,I,E | EN chưa publish ẩn |
| 27 | **Homepage** | homepage | P8 | `/home`,`/admin/homepage` | bật/tắt section | trang chủ | homepage_sections/banners | U,I,A,P | thứ tự cố định |
| 28 | **Navigation (mega menu)** | navigation | P8 | `/navigation/:location` | menu editor | header/mega menu | menus/menu_items+tr | U,I,A | auto-generated |
| 29 | **Redirect (301)** | redirects | P8 | `/admin/redirects` + middleware | list/form | (301 phục vụ) | redirects | U,I,E | no loop/chain, hang→301 |
| 30 | **SEO nền tảng** | seo | P8 | `/sitemap*.xml`,`/robots.txt` | SEO defaults | `<head>` tags | (không lưu canonical/robots) | U,I,**SEO**,E | resolver mọi loại trang |

**Kiểm tra độ phủ:** mọi mục P0 trong đề bài (Auth, Media, Brands, Categories, Standards, Applications, Industries, Products, Services, Projects, Posts, Documents, Customers, Offices, Homepage, Navigation, Redirect, SEO, Product search/filter, Inquiry, Outbox worker, Locale publication, Slug lifecycle, External video, Health endpoints, Structured audit logs) đều có ≥1 hàng ở trên (30 hàng, dư để tách Pages/Users). ✅

**Ánh xạ ADR → hàng:** ADR-001/011 → #7,8,14,29,30 · ADR-002 → #12,29 · ADR-003 → #24,25 · ADR-004 → #7,26 · ADR-005/009 → #6 · ADR-006/010 → #10,13 · ADR-007 → #14 · ADR-008 → #13,17 · ADR-012 → #19,23 · ADR-013 → migration (xem `04` P1).
