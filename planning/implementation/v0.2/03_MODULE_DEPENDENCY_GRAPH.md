# 03 — MODULE DEPENDENCY GRAPH & CRITICAL PATH

**Plan version:** v0.2 · **Trạng thái:** PROPOSED FOR FINAL RECONCILIATION · **Ngày:** 2026-07-22

**25 application modules** (ME-01) + infrastructure/worker/frontend-app/shared-services đếm riêng. Sửa chiều bootstrap (HI-01), bỏ Auth↔Users cycle (HI-02), health probe registry (HI-03), validator trước P5 (HI-04), P6A/P6B (HI-07), edges P8 (ME-03).

Loại phụ thuộc: **S** schema · **D** domain/service · **A** API · **U** UI · **Se** seed · **I** hạ tầng.

---

## 1. Bootstrap direction (SỬA HI-01)

```
Repository/tooling decisions (D1–D16, Git)
  → Config (env, không đọc DB)
      → Logging + Error primitives
          → Database pool + Migration executor (raw SQL, D5)
              → feature modules
```
`settings` (DB-backed) là **module runtime**, KHÔNG đồng nhất với bootstrap Config. **Không** cạnh `config → DB`.

## 2. Auth / Users (SỬA HI-02 — không cycle)

```
Users/Identity (owns user repository)
   → exposes UserAuthenticationQueryPort
       → Auth application service (login/logout/reset/change-password)  [một chiều]
Admin guard/middleware → đăng ký ở app composition / global layer  (KHÔNG phải domain dependency)
```
- Users domain **không** import Auth. Không module gọi repository module khác.
- P0 một tài khoản: `/auth/me` + profile + change-password đủ. **Không Users CRUD** (HI-15).

## 3. Health probe registry (SỬA HI-03 — incremental)

```
Health = endpoint shell + probe registry
   P2: đăng ký DB probe + config validity probe        (/ready shell Done ở P2 chỉ với probe hiện có)
   P3: đăng ký storage read/write probe
   P7: đăng ký worker heartbeat/backlog + email-config probe
Deployment profile (D7) khai báo probe nào REQUIRED; required-nhưng-chưa-đăng-ký ⇒ readiness FAIL
```
Không ping SMTP thật mỗi request — dùng config validity + recent worker/provider signal.

## 4. Shared services trước P5 (SỬA HI-04)

`ContentBlock schema + ExternalVideo validator + Sanitization policy` đặt ở **P3** (media+content security) → dùng lại P5 (product content video) và P6 (services/projects/posts). Cùng nhóm service lõi: SlugService, PublishService, MediaUsageService, filter builder, canonical/robots resolver, locale condition, **route-resolution contract** (`12`).

## 5. Bảng DAG (25 module)

| Module | Phụ thuộc cứng | Song song với | Loại | Phase |
|---|---|---|---|---|
| config/logging/errors (infra) | tooling | — | I | P0/P2 |
| DB pool + migration executor (infra) | config/logging | — | S,I | P1 |
| users | DB | settings | S,D,A | P2 |
| auth | DB, users(port), config, logging | settings | D,A | P2 |
| settings | DB | users, health | S,D,A | P2 |
| health (probe registry) | DB | settings | A | P2→P7 |
| media (+StoragePort) | DB, users | ContentBlock validator | S,D,A,I | P3 |
| **ContentBlock/ExternalVideo validator** (shared) | media | — | D | **P3** |
| brands | media, SlugService, locale | categories/standards/applications/industries | S,D,A,U | P4 |
| product_categories | media, SlugService | brands/standards/applications/industries | S,D,A,U | P4 |
| standards | SlugService | (taxonomy song song) | S,D,A,U | P4 |
| applications | media(icon), SlugService | (taxonomy song song) | S,D,A,U | P4 |
| industries | media, SlugService | (taxonomy song song) | S,D,A,U | P4 |
| redirects (delivery proof) | SlugService, route-resolution (`12`) | navigation core | S,D,A | **P4→** |
| products | media, **brands(NOT NULL)**, categories, standards, applications, industries, SlugService, PublishService, ContentBlock validator, locale | search | S,D,A,U | P5 |
| search (product) | products (pg_trgm) | — | D,A | P5 |
| pages | media, SlugService, locale | customers, offices, post_categories | S,D,A,U | P6A |
| customers | media, industries | offices, pages | S,D,A,U | **P6A (trước projects)** |
| offices | media | customers, pages | S,D,A,U | P6A |
| post_categories | SlugService | (trước posts) | S,D,A,U | **P6A (trước posts)** |
| services (core) | media, SlugService, locale | pages, projects core | S,D,A,U | P6A |
| documents (core) | media(file), SlugService, locale | posts core | S,D,A,U | P6A |
| projects (core) | media, **customers**, SlugService, locale | posts core | S,D,A,U | P6A |
| posts (core) | media, **post_categories**, SlugService, locale | documents core | S,D,A,U | P6A |
| *cross-module links* (product/service/project/post/document relationships) | các entity core P6A + products P5 | — | S,D,A | **P6B** |
| inquiries + outbox worker | settings(email), products(SET NULL), services(SET NULL), SMTP-adapter, CAPTCHA | (parallel P6B/P8-partial) | S,D,A,I | P7 |
| navigation | menus/menu_items, brands/categories is_featured, **configured source** (settings/homepage) | homepage | D,A,U | P8 (start P4) |
| homepage | homepage_sections, **banners, media, pages, settings, industries**, products, brands, categories, services, projects, posts, customers, offices | navigation | D,A,U | P8 |
| seo | route providers (mọi public route), redirects, settings/base-url | — | D,A | P8 (rules start P4) |
| Next web app (public + admin) | route-resolution + SEO contract + OpenAPI client | — | U | thin P4+, completion P9/P10 |

## 6. Edges thêm/bỏ (audit §H2)

**Bỏ:** `config → DB`; `users → auth` domain edge; P2 health hard-check storage/outbox; **P8 hard dependency vào P7** (navigation/homepage/SEO không chờ worker; chỉ ContactForm integration cần P7); ExternalVideo validator chỉ-từ-P6.
**Thêm/thay:** `DB → dùng config+logging`; `auth → UserAuthenticationQueryPort`; `health registry → probes P2/P3/P7`; `ContentBlock/ExternalVideo → products+content` trước P5; `customers → projects`; `post_categories → posts`; service/project → post/document relationship (P6B); `navigation → configured-feature source`; `homepage → banners/media/pages/settings/industries`; `SEO sitemap → mọi public route provider + base URL`; `redirect delivery → public router` từ P4; `OpenAPI → generated-client freshness/backward-compat → FE deploy`.

## 7. Critical path (loại cycle — HI-06)

```
P0 decisions/Git → P1 raw baseline → P2 core/auth → P3 media+content-security
→ P4 taxonomy + slug/redirect proof → P5 product thin vertical
→ P6A content core → P6B relationships
→ P8 homepage/sitemap/web delivery → P10 public completion
→ P11 content delta/hardening/release
```

## 8. Nhánh song song & nút thắt (audit §I2/§I3)

- Sau P3: taxonomy modules; pages/customers/offices/post_categories/document-core; Admin/Public shell.
- Sau P4: navigation core, route/SEO rule tests, content core.
- Sau P5 + service core: **Inquiry/outbox P7 song song P6B**.
- Admin workstream liên tục theo contract; **P9 chỉ hội tụ**.
- Content migration inventory từ P4; importer/dry-run P5–P7; delta/cutover P11.
- **Nút thắt:** P5 products (thật, nhưng không duy nhất); **P6B relationships + P8 homepage/sitemap fan-in** (lớn hơn plan v0.1 mô tả); **public route/SEO/redirect topology trước cả P4** (kiến trúc); **Claude ownership shared service** (nguồn lực — giảm bằng RACI `08`).

## 9. Ghi chú
- `applications` giữ `parent_id` DB nhưng Admin phẳng (ADR-010) — giữ.
- `redirects` có bảng riêng nhưng **delivery** gắn topology (`12`, D11); logic authoritative ở Nest.
- `seo` không schema riêng (canonical/robots tự sinh — ADR-011) nhưng phụ thuộc runtime publication-state; SEO route-rules test được từ P4, sitemap aggregation cần toàn bộ published (P8).
