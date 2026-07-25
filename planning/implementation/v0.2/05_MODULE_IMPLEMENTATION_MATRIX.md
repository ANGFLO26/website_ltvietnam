# 05 — MODULE IMPLEMENTATION MATRIX

**Plan version:** v0.2 · **Trạng thái:** PROPOSED FOR FINAL RECONCILIATION · **Ngày:** 2026-07-22

Mỗi requirement P0 xuất hiện ≥1 lần. **Bỏ Users CRUD** (HI-15 → account profile/auth). Product search ở **P5**, P8 no new search (ME-02). Thêm rows cross-cutting (HI-21/HI-12/HI-13). **30 requirement rows ≠ số module**; inventory = **25 application modules** (`03`).

> Test viết tắt: U unit · I integration(DB) · A API/contract · C concurrency · E E2E · S security · SEO · P perf · M migration.

| # | Requirement | Module | Phase | API | Admin UI | Public UI | Database | Test | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Auth Admin** | auth | P2 | `/auth/login\|logout\|me\|change-password\|forgot\|reset` | Đăng nhập, đổi MK | — | users | U,I,A,E,S | login/cookie/key-rotation |
| 2 | **Account profile/auth** (KHÔNG Users CRUD) | users(identity) | P2 | `/auth/me` (no `/admin/users`) | Hồ sơ, đổi MK | — | users | U,I,A | profile flow |
| 3 | **Settings** | settings | P2 | `/admin/settings/:group` | Settings tabs | — | settings | U,I,A,S | mask secret |
| 4 | **Health** (probe registry) | health | P2→P7 | `/health/live`,`/ready` | Dashboard widget | — | — | I,A,S | probe registry P2/P3/P7 |
| 5 | **Structured audit logs** | (cross) | P2 | — | — | — | không bảng | U,S | log che PII |
| 6 | **Media** | media | P3 | `/admin/media` | Media library | (render) | media | U,I,A,E,S | 409/SVG/bomb/EXIF |
| 7 | **Content-block/external video validator** | (shared) | P3 | (validate) | Block editor | render an toàn | JSONB | U,E,S | reject raw iframe |
| 8 | **Brands + sub-brands** | brands | P4 | `/brands*` | Form (thin) | list + hồ sơ | brands+tr | U,I,A,E,S | no-loop/no-fallback EN |
| 9 | **Product Categories (cây)** | product_categories | P4 | `/product-categories*` | Cây kéo-thả | landing danh mục | +tr | U,I,A | tree no-N+1 |
| 10 | **Standards** | standards | P4 | `/standards*` | Bảng | landing tiêu chuẩn | +tr | U,I,A | unique(org,code) |
| 11 | **Applications (phẳng)** | applications | P4 | `/applications*` | Danh sách phẳng | landing ứng dụng | +tr | U,I,A | phẳng |
| 12 | **Industries** | industries | P4 | `/industries*` | Card | landing | +tr | U,I,A | — |
| 13 | **Slug lifecycle** | SlugService | P4 | (mọi entity slug) | slug field | (URL) | 12 tr + redirects | U,I,C | 3-nguồn/first_pub once |
| 14 | **Redirect delivery** (topology) | redirects | **P4→P8** | route-resolution (`12`) | redirect list/form | (301 trước render) | redirects | U,I,E | redirect-before-render qua topology |
| 15 | **Products** | products | P5 | `/products`,`/:slug` | Form nhiều section | detail | products+tr+specs+6 link | U,I,A,C,E,P | publish/concurrency |
| 16 | **Product Search/Filter** | products, search | **P5** | `/products?brand=...`,`/search` | filter Admin | FilterSidebar | pg_trgm | U,I,A,S,P | 3 tổ hợp/no-N+1 |
| 17 | **Product landing** | products | P5 | `/products/landing` | — | `/san-pham` | batch | A,P | landing shape (not /home) |
| 18 | **Services (cây)** | services | P6A/B | `/services*` | Form | detail | services+tr+links | U,I,A,E | flat URL |
| 19 | **Projects** | projects | P6A/B | `/projects*` | Form + visibility | detail | projects+tr+links | U,I,A,E,S | customer_visibility BE |
| 20 | **Posts (+categories)** | posts, post_categories | P6A/B | `/posts*`,`/post-categories*` | Form + block | detail | +tr | U,I,A,E | RESTRICT category |
| 21 | **Documents** | documents | P6A/B | `/documents*`,`/:slug/download` | Form | download | +tr+links | U,I,A,E,S | download slug + headers |
| 22 | **Customers** | customers | P6A | `/customers` | Danh sách | logo section | +tr | U,I,A | is_public gate |
| 23 | **Offices** | offices | P6A | `/offices` | Form | `/lien-he` | +tr | U,I,A | — |
| 24 | **Pages** | pages | P6A | `/pages/:slug` | Form | giới thiệu/policy | +tr | U,I,A,E | system page không xóa |
| 25 | **Cross-module relationships** | (links) | P6B | PATCH replace-set | RelationSelector | related | link tables | U,I,C | replace-set race |
| 26 | **Inquiry persistence** | inquiries | P7 | `POST /inquiries` (202) | widget failed | Modal/Form | inquiries | U,I,A,E,S | SMTP-lỗi-vẫn-202 |
| 27 | **Outbox worker** (process riêng) | worker | P7 | (worker) | — | — | inquiry_outbox | U,I,C,S,P | 2-worker/shutdown/reaper |
| 28 | **Locale publication** | PublishService | P4–P6 | (7 entity) | badge VI/EN | EN không trộn | 7 tr status | U,I,E | EN chưa publish ẩn |
| 29 | **Homepage** | homepage | P8 | `/home`,`/admin/homepage` | bật/tắt section | trang chủ | homepage_sections/banners | U,I,A,P | thứ tự cố định |
| 30 | **Navigation (mega menu)** | navigation | P8 | `/navigation/:location` | menu editor | header/mega | menus/menu_items+tr | U,I,A | auto-generated/configured-source |
| 31 | **SEO nền tảng** | seo | P8 | `/sitemap*.xml`,`/robots.txt` (Nest) | SEO defaults | `<head>` (Next serialize) | không lưu canonical/robots | U,I,SEO,E | resolver mọi loại trang |
| 32 | **Generated-client / API compatibility** | (cross) | P0,P9–P11 | OpenAPI + codegen | — | — | — | A | breaking-change/freshness/mixed-version |
| 33 | **Backup/restore + rollback ops** | (cross) | P1,P11 | — | — | — | DB+media | I,ops | restore drill |
| 34 | **Content migration (CM0–CM4)** | (workstream `13`) | P4–P11 | (importer) | — | (redirects) | import | I,E | counts/checksum/coverage |

**Độ phủ P0:** mọi mục P0 (Auth, Media, Brands, Categories, Standards, Applications, Industries, Products, Services, Projects, Posts, Documents, Customers, Offices, Homepage, Navigation, Redirect, SEO, Product search/filter, Inquiry, Outbox worker, Locale publication, Slug lifecycle, External video, Health, Structured audit logs) đều có ≥1 hàng. ✅ Bổ sung cross-cutting: redirect delivery, generated-client/compat, backup/restore, content migration.

**Ánh xạ ADR:** ADR-001/011→#8,9,14,31 · ADR-002→#13,14 · ADR-003→#26,27 · ADR-004→#8,28 · ADR-005/009→#6 · ADR-006/010→#11,15 · ADR-007→#16 · ADR-008→#15,25 · ADR-012→#7,21 · ADR-013→migration (`04` P1).
