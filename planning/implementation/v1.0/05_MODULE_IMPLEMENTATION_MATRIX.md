# 05 — MODULE IMPLEMENTATION MATRIX

**Plan version:** v1.0  
**Status:** APPROVED FOR IMPLEMENTATION — PLANNING COMPLETE  
**Approval date:** 2026-07-25  
**Approval authority:** User  
**Gate A:** PASSED  
**Gate B:** NOT MET  
**Coding:** NOT AUTHORIZED UNTIL GATE B PASSES

Test codes: ST static, U unit, DB database integration, API contract, C concurrency, E E2E, SEC security, SEO, PERF, MIG migration/restore.

| # | Capability | Module(s) | Phase | API/UI/DB output | Required tests | Acceptance evidence |
|---:|---|---|---|---|---|---|
| 1 | Auth | auth | P2 | auth APIs + login/profile/change password | U,DB,API,C,E,SEC | cookie/CSRF/reset/key rotation |
| 2 | Identity profile, no Users CRUD | users | P2 | `/auth/me`, profile | U,DB,API,SEC | no `/admin/users` |
| 3 | Settings | settings | P2 | settings APIs/tabs | U,DB,API,SEC | secret masking |
| 4 | Core readiness | health | P2 | `/health/live`, `/health/ready` | DB,API,SEC | config+PG only; storage/SMTP/worker excluded |
| 5 | Media readiness | health/media | P3 | `/health/ready/media` | DB,API,SEC | storage down isolated to media routes |
| 6 | Worker/operational health | health/worker | P7 | `/health/worker`, HEALTHY/DEGRADED/UNAVAILABLE | DB,API,C,PERF | backlog/heartbeat/provider signals |
| 7 | Structured audit logs | cross | P2 | app logs, no table/UI | U,SEC | required fields, no full PII |
| 8 | Media upload/library | media | P3 | Admin media + StoragePort | U,DB,API,C,E,SEC,PERF | 409, magic bytes, bomb/EXIF/timeout |
| 9 | Public media Semantics A | media/infra | P3/P11 | `/media/*` → read-only `public-media/` only; purge/consistency | DB,API,C,E,SEC,MIG | proxy not volume root; traversal/symlink/dotfile denied; orphan moved outside served root |
| 10 | Controlled documents | documents | P3/P6A | `protected-documents/` outside web root; slug download via Nest | DB,API,E,SEC | guessed public URL=404; direct internal location denied; publication/deleted/existence gate |
| 11 | Content/video validators | shared | P3 | block validation/render policy | U,API,E,SEC | raw iframe/script rejected |
| 12 | Brands | brands | P4 | CRUD/publish/list/profile | U,DB,API,C,E,SEO | no fallback, no loop |
| 13 | Product categories | product-categories | P4 | tree CRUD + list landing | U,DB,API,E,PERF | no N+1; rich detail excluded |
| 14 | Standards | standards | P4 | CRUD/publish/landing | U,DB,API | org/code uniqueness |
| 15 | Applications | applications | P4 | flat Admin/list landing | U,DB,API,E | flat presentation |
| 16 | Industries | industries | P4 | CRUD/publish/landing | U,DB,API | publication |
| 17 | Slug lifecycle | shared/redirects | P4 | SlugService + redirect rows | U,DB,C,E,SEO | three-source, first publish once |
| 18 | Redirect delivery | redirects | P0/P4/P8 | resolver + explicit 301 in Next | API,C,E,SEO,PERF | exact spike matrix, cache invalidation |
| 19 | Products | products | P5 | CRUD/publish/list/detail | U,DB,API,C,E,SEC,PERF | publish/concurrency/no-N+1 |
| 20 | Product filter/search | products/search | P5 | repeated-slug filters + product search | U,DB,API,SEC,PERF | OR/AND, binding, product-only |
| 21 | Product landing | products | P5 | landing endpoint/page | API,E,PERF | bounded query/payload |
| 22 | Pages | pages | P6A | CRUD/publish/system pages | U,DB,API,E,SEO | system-page rules |
| 23 | Customers | customers | P6A | CRUD/public logo | U,DB,API,E | `is_public` gate |
| 24 | Offices | offices | P6A | CRUD/contact rendering | U,DB,API,E | translation behavior |
| 25 | Post categories/posts | post-categories/posts | P6A/B | CRUD/publish/relations | U,DB,API,C,E,SEC | category RESTRICT |
| 26 | Services | services | P6A/B | CRUD/publish/relations | U,DB,API,C,E | flat detail URL |
| 27 | Projects | projects | P6A/B | CRUD/publish/relations | U,DB,API,C,E,SEC | customer visibility |
| 28 | Document metadata/relations | documents | P6A/B | CRUD/publish/relations | U,DB,API,C,E | file RESTRICT/download gate |
| 29 | Cross-module replace-set | content links | P6B | relationship PATCH/UI/render | U,DB,API,C,E | no lost update/duplicates |
| 30 | Inquiry persistence | inquiries | P7 | `POST /inquiries` → 202 | U,DB,API,C,E,SEC | PG up + dependencies down still 202; new-key CAPTCHA failure writes nothing |
| 31 | Atomic idempotency D19 | inquiries | P7 | UUID-v4 dual-transport key validation; durable replay lookup before CAPTCHA/submission quota; stable 202 result; global atomic write | U,DB,API,C | malformed/mismatch 400 before lookup; lost-response replay with expired CAPTCHA/exhausted quota; byte-identical no-PII replay; different payload 409 before guards; replay writes nothing; one winner |
| 32 | Outbox worker/reconciliation | worker | P7/P11 | committed attempt-before-send; three-axis attempt model; provider call outside DB transaction; one result transaction; reports | U,DB,C,E,SEC,PERF | no call if attempt commit fails; atomic attempt/outbox/inquiry result; manual resolution preserves provider evidence; crash/DB-down after accept; new attempt per retry; no-blind-resend |
| 33 | Locale publication | seven entity modules | P4–P6 | public conditions/hreflang | U,DB,API,E,SEO | EN unpublished hidden |
| 34 | Homepage | homepage | P8 | public/Admin home | U,DB,API,E,PERF | fixed section order/no-N+1 |
| 35 | Navigation | navigation | P8 | mega menu + editor | U,DB,API,E | auto/configured sources |
| 36 | SEO | seo | P8/P10 | canonical/robots/sitemap/structured data | U,DB,API,E,SEC,SEO,PERF | every route kind, escaping |
| 37 | API compatibility | cross | P0/P9–P11 | OpenAPI/generated client | ST,API,E | no breaking/stale client; mixed versions |
| 38 | Migration materialization | DB infra | P1 | 70 up/down + history/manifest | DB,C,MIG | per-prefix/failure/history/lock + aggregate |
| 39 | Backup/restore | cross | P1/P3/P11 | DB+media same cutoff with public/protected namespaces | DB,MIG | namespace and permission consistency scans PASS |
| 40 | Content migration | CM0–CM4 | P4–P11 | inventory/map/import/validate/cutover | DB,E,SEO,MIG | C7 signatures, counts/checksums/coverage |

## Coverage and scope assertions

- Inventory remains exactly 25 application modules; matrix rows are capabilities and may exceed 25.
- Every MVP capability has phase, owner path, required tests and evidence acceptance.
- Search is product-only; no Users CRUD, advanced auto-save, site-wide search, facet count, scheduled publish, video upload, Inquiry CRM UI or ecommerce UI.
- Applications are flat in P0. All implementation schema deltas use `IMPLEMENTATION MIGRATION 071+` and are not materialized in this planning round.
