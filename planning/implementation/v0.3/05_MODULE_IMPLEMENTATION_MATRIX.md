# 05 — MODULE IMPLEMENTATION MATRIX

**Plan version:** v0.3 · **Trạng thái:** PROPOSED FOR FINAL VERIFICATION · **Ngày:** 2026-07-22

Mỗi requirement P0 ≥1 lần. **No Users CRUD**; **product-only search** (P5, P8 no new search); Round 5B: health tách 4 loại, media delivery `/media/*`, idempotency fingerprint, outbox reconciliation. **Requirement rows ≠ số module**; inventory = **25 application modules** (`03`).

> Test: U unit · I integration · A API/contract · C concurrency · E E2E · S security · SEO · P perf · M migration.

| # | Requirement | Module | Phase | API | Admin UI | Public UI | Database | Test | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Auth Admin | auth | P2 | `/auth/*` | Đăng nhập/đổi MK | — | users | U,I,A,E,S | login/cookie/key-rotation |
| 2 | Account profile/auth (no Users CRUD) | users(identity) | P2 | `/auth/me` | Hồ sơ | — | users | U,I,A | profile flow |
| 3 | Settings | settings | P2 | `/admin/settings/:group` | Settings tabs | — | settings | U,I,A,S | mask secret |
| 4 | **Health (4 loại)** | health | P2→P7 | `/health/live`,`/ready`,`/worker` | Dashboard (degraded) | — | — | I,A,S | liveness/readiness(no SMTP)/worker/degraded |
| 5 | Structured audit logs | (cross) | P2 | — | — | — | không bảng | U,S | log che PII |
| 6 | Media | media | P3 | `/admin/media` | Media library | (render) | media | U,I,A,E,S | 409/SVG/bomb/EXIF |
| 7 | **Public media delivery `/media/*`** | (infra/media) | P3 | `/media/*` (proxy) | — | ảnh/variants | media | I,S | traversal/nosniff/cache/no-listing |
| 8 | **Document download (gated)** | documents | P3/P6A | `/api/v1/documents/:slug/download` | — | download | documents | I,E,S | publication gate + Content-Disposition/nosniff |
| 9 | Content-block/external video validator | (shared) | P3 | (validate) | Block editor | render an toàn | JSONB | U,E,S | reject raw iframe |
| 10 | Brands + sub-brands | brands | P4 | `/brands*` | Form (thin) | list + hồ sơ | brands+tr | U,I,A,E,S | no-loop/no-fallback |
| 11 | Product Categories (cây) | product_categories | P4 | `/product-categories*` | Cây kéo-thả | landing danh mục | +tr | U,I,A | tree no-N+1 |
| 12 | Standards | standards | P4 | `/standards*` | Bảng | landing | +tr | U,I,A | unique(org,code) |
| 13 | Applications (phẳng) | applications | P4 | `/applications*` | Danh sách phẳng | landing | +tr | U,I,A | phẳng |
| 14 | Industries | industries | P4 | `/industries*` | Card | landing | +tr | U,I,A | — |
| 15 | Slug lifecycle | SlugService | P4 | (mọi entity slug) | slug field | (URL) | 12 tr + redirects | U,I,C | 3-nguồn/first_pub once |
| 16 | **Redirect delivery (explicit 301)** | redirects | P4→P8 | route-resolution (`12`) | redirect list/form | (301 trước render) | redirects | U,I,E | explicit-301 redirect-before-render + cache invalidation |
| 17 | Products | products | P5 | `/products`,`/:slug` | Form nhiều section | detail | products+tr+specs+6 link | U,I,A,C,E,P | publish/concurrency |
| 18 | **Product Search/Filter (product-only)** | products, search | P5 | `/products?brand=...`,`/search` (product) | filter Admin | FilterSidebar | pg_trgm | U,I,A,S,P | 3 tổ hợp/no-N+1; no site-wide |
| 19 | Product landing | products | P5 | `/products/landing` | — | `/san-pham` | batch | A,P | landing shape |
| 20 | Services (cây) | services | P6A/B | `/services*` | Form | detail | +tr+links | U,I,A,E | flat URL |
| 21 | Projects | projects | P6A/B | `/projects*` | Form + visibility | detail | +tr+links | U,I,A,E,S | customer_visibility BE |
| 22 | Posts (+categories) | posts, post_categories | P6A/B | `/posts*`,`/post-categories*` | Form + block | detail | +tr | U,I,A,E | RESTRICT category |
| 23 | Documents | documents | P6A/B | `/documents*` | Form | (download #8) | +tr+links | U,I,A,E | metadata/links |
| 24 | Customers | customers | P6A | `/customers` | Danh sách | logo section | +tr | U,I,A | is_public gate |
| 25 | Offices | offices | P6A | `/offices` | Form | `/lien-he` | +tr | U,I,A | — |
| 26 | Pages | pages | P6A | `/pages/:slug` | Form | giới thiệu/policy | +tr | U,I,A,E | system page không xóa |
| 27 | Cross-module relationships | (links) | P6B | PATCH replace-set | RelationSelector | related | link tables | U,I,C | replace-set race |
| 28 | Inquiry persistence | inquiries | P7 | `POST /inquiries` (202) | widget failed | Modal/Form | inquiries | U,I,A,E,S | SMTP-lỗi-vẫn-202 |
| 29 | **Idempotency fingerprint** | inquiries | P7 | `POST /inquiries` (key+fp) | — | — | inquiries (+`request_fingerprint` **071+**) | U,I,C | same key+diff fp→409 |
| 30 | **Outbox worker + reconciliation** | worker | P7/P11 | (worker) `/health/worker` | reconciliation report | — | inquiry_outbox | U,I,C,S,P | 2-worker/shutdown/reaper/reconciliation |
| 31 | Locale publication | PublishService | P4–P6 | (7 entity) | badge VI/EN | EN không trộn | 7 tr status | U,I,E | EN chưa publish ẩn |
| 32 | Homepage | homepage | P8 | `/home`,`/admin/homepage` | bật/tắt section | trang chủ | homepage_sections/banners | U,I,A,P | thứ tự cố định |
| 33 | Navigation (mega menu) | navigation | P8 | `/navigation/:location` | menu editor | header/mega | menus/menu_items+tr | U,I,A | auto/configured-source |
| 34 | SEO nền tảng | seo | P8 | `/sitemap*.xml`,`/robots.txt` (Nest) | SEO defaults | `<head>` (Next serialize) | không lưu canonical/robots | U,I,SEO,E | resolver mọi loại trang |
| 35 | Generated-client / API compatibility (D18) | (cross) | P0,P9–P11 | OpenAPI + codegen | — | — | — | A | breaking-change/freshness/mixed-version |
| 36 | Backup/restore + rollback ops | (cross) | P1,P11 | — | — | — | DB+media | I,ops | restore drill |
| 37 | Content migration (CM0–CM4) | (workstream `13`) | P4–P11 | (importer) | — | (redirects) | import | I,E | counts/checksum/coverage; CM2 prod-guard |

**Độ phủ P0:** mọi mục P0 (Auth, Media, Brands, Categories, Standards, Applications, Industries, Products, Services, Projects, Posts, Documents, Customers, Offices, Homepage, Navigation, Redirect, SEO, Product search/filter, Inquiry, Outbox worker, Locale publication, Slug lifecycle, External video, Health, Structured audit logs) ≥1 hàng. ✅ Cross-cutting: media delivery, doc download, redirect delivery, fingerprint, reconciliation, generated-client/compat, backup/restore, content migration.
