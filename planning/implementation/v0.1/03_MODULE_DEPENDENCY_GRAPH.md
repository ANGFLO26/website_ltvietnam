# 03 — MODULE DEPENDENCY GRAPH & CRITICAL PATH

**Plan version:** v0.1 · **Trạng thái:** PROPOSED FOR CROSS-REVIEW · **Ngày:** 2026-07-22

Phạm vi 26 module MVP (06 §I + health/seo/redirects/search/navigation). Phân biệt 6 loại phụ thuộc:
**S**=schema · **D**=domain/service · **A**=API contract · **U**=UI · **Se**=seed/fixture · **I**=hạ tầng.

---

## 1. Bảng DAG phụ thuộc module

| Module | Phụ thuộc **cứng** | Phụ thuộc **mềm** | Song song được với | Loại | Phase |
|---|---|---|---|---|---|
| infra/tooling | — | — | — | I | P0 |
| migration/DB baseline | tooling | — | — | S,I | P1 |
| config | DB | — | logging | I | P2 |
| errors | config | — | logging | D | P2 |
| logging | config | — | errors | I,D | P2 |
| **auth** | DB, users, config, errors | logging | settings | D,A | P2 |
| **users** | DB | auth | settings | S,D,A | P2 |
| **settings** | DB | auth | users, health | S,D,A | P2 |
| health | DB, storage(check) | outbox(check) | settings | A | P2 |
| **media** | DB, users, storage-adapter | — | (mọi taxonomy) | S,D,A,I | P3 |
| **brands** | DB, media, SlugService, locale | users | product_categories, standards, applications, industries | S,D,A,U | P4 |
| **product_categories** | DB, media, SlugService | users | brands, standards, applications, industries | S,D,A,U | P4 |
| **standards** | DB, SlugService | — | brands, categories, applications, industries | S,D,A,U | P4 |
| **applications** | DB, media(icon), SlugService | — | brands, categories, standards, industries | S,D,A,U | P4 |
| **industries** | DB, media, SlugService | — | brands, categories, standards, applications | S,D,A,U | P4 |
| **products** | DB, media, **brands(NOT NULL)**, product_categories, standards, applications, industries, SlugService, PublishService, locale | search | — (nút thắt) | S,D,A,U | P5 |
| search (product) | DB(pg_trgm), products | — | — | D,A | P5 |
| **pages** | DB, media, SlugService, locale | — | services, projects, posts, documents, customers, offices | S,D,A,U | P6 |
| **services** | DB, media, SlugService, locale | products, brands, industries (link) | pages, projects, posts, documents, customers, offices | S,D,A,U | P6 |
| **customers** | DB, media, industries | — | offices, pages | S,D,A,U | P6 |
| **projects** | DB, media, customers(SET NULL), SlugService, locale | products, services, brands (link) | pages, posts, documents | S,D,A,U | P6 |
| **post_categories** | DB, SlugService | — | (before posts) | S,D,A,U | P6 |
| **posts** | DB, media, post_categories(RESTRICT), SlugService, locale | products, services, projects, brands (link) | documents, pages | S,D,A,U | P6 |
| **documents** | DB, media(file RESTRICT), SlugService, locale | products, brands, services, posts (link) | pages, customers, offices | S,D,A,U | P6 |
| **offices** | DB, media | — | customers, pages | S,D,A,U | P6 |
| **inquiries** + outbox worker | DB, settings(email), products(SET NULL), services(SET NULL), SMTP-adapter, CAPTCHA | logging | — | S,D,A,I | P7 |
| **navigation** (menu + mega menu) | DB(menus/menu_items), brands, product_categories, standards, applications | — | homepage | D,A,U | P8 |
| **homepage** | DB(homepage_sections/banners), products, brands, categories, services, projects, posts, customers, offices | — | navigation | D,A,U | P8 |
| **redirects** | DB, SlugService | — | seo | S,D,A | P8 |
| **seo** | products, brands, all content, redirects | — | — | D,A | P8 |
| Admin FE | OpenAPI contracts (P2+) | mọi module Admin | Public FE | U | P9 (scaffold P4+) |
| Public FE | OpenAPI contracts (P4+), seo | mọi module public | Admin FE | U | P10 (scaffold P4+) |

> **Service lõi dùng chung** (không phải module riêng nhưng là dependency ngang): **SlugService** (3-nguồn, redirect), **PublishService** (locale rules, first_published_at), **MediaUsageService** (409), **filter query builder** (OR/AND), **canonical/robots resolver**, **locale query condition**. Khung tạo ở P2; hoàn thiện ở entity slug đầu tiên (brands, P4) và product (P5).

---

## 2. Đồ thị rút gọn (tầng phụ thuộc)

```
Tầng 0: tooling
Tầng 1: DB baseline 001–070 (một khối, ADR-013)
Tầng 2: config · logging · errors · users · auth · settings · health
Tầng 3: media (+ storage adapter)          ← dependency cứng của mọi content/catalogue
Tầng 4: brands · product_categories · standards · applications · industries   (song song)
Tầng 5: PRODUCTS  ← nút thắt (cần cả tầng 4) → search
Tầng 6: pages · services · customers · projects · post_categories → posts · documents · offices  (song song nhiều)
Tầng 7: inquiries + outbox worker  (cần settings.email + products/services)
Tầng 8: navigation · homepage · redirects · seo  (cross-cutting, cần tầng 4–6)
Tầng 9: Admin FE / Public FE (scaffold sớm theo OpenAPI, hoàn thiện sau backend tương ứng)
Tầng 10: integration/security/perf/a11y/release
```

## 3. CRITICAL PATH (chuỗi phụ thuộc dài nhất)

```
tooling → DB baseline 001–070 → core+auth → media
   → brands + product_categories (+ standards/applications/industries)
   → PRODUCTS + filter/search
   → public product list/detail
   → SEO (canonical/robots/sitemap) + redirect
   → integration/security/perf → release
```

- **Nút thắt: `products` (P5).** Phụ thuộc nhiều nhất (brands NOT NULL, 3 taxonomy, media, SlugService, PublishService, locale) và được nhiều thứ phụ thuộc (search, filter, homepage, navigation, inquiry link, sitemap). Chậm ở đây kéo lùi cả dự án ⇒ ưu tiên nguồn lực + review kỹ.
- **Điểm phân nhánh song song:** sau P3 (media) → 5 taxonomy chạy song song; sau P5 → nhiều content module chạy song song; Admin/Public FE scaffold song song từ P4.
- **Điểm hội tụ:** P8 (seo/navigation/homepage) hội tụ toàn bộ catalogue+content; P11 hội tụ toàn hệ.

## 4. Phần có thể làm song song (phân công 2 AI — chi tiết ở `08`)

| Nhóm song song | Module | Điều kiện tiên quyết |
|---|---|---|
| Taxonomy | brands ∥ categories ∥ standards ∥ applications ∥ industries | media (P3) + khung SlugService/locale |
| Content | (services ∥ customers ∥ offices) rồi (projects ∥ posts ∥ documents ∥ pages) | media + taxonomy + products (cho link) |
| Frontend scaffold | Admin FE ∥ Public FE (theo OpenAPI) | có contract từ P4 |
| Cross-cutting nội bộ | navigation ∥ homepage ; redirects ∥ seo | catalogue+content xong |

> **Ràng buộc chống xung đột:** slice song song phải **khác thư mục module** và **không sửa chung service lõi cùng lúc**. Khi cần đổi SlugService/PublishService/filter builder → do 1 owner (Claude) đổi, AI kia rebase. Xem `08`.

## 5. Ghi chú phụ thuộc đặc biệt

- `posts` cần `post_categories` **trước** (RESTRICT) → trong P6, post_categories là sub-bước trước posts.
- `projects.customer_id` SET NULL nhưng UI cần `customers` để chọn → customers trước projects (mềm, không cứng schema).
- `inquiries.product_id/service_id` SET NULL → không chặn schema, nhưng UI form tự điền cần products/services tồn tại.
- `seo` không có schema riêng (canonical/robots tự sinh — ADR-011) nhưng phụ thuộc **runtime** vào trạng thái published của mọi entity → test SEO chỉ đủ nghĩa sau khi content publish được.
- `redirects` có bảng riêng nhưng **được tạo bởi SlugService** → logic redirect gắn chặt slug lifecycle (A7).
