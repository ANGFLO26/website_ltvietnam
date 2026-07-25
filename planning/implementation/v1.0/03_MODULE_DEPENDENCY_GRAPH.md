# 03 — MODULE DEPENDENCY GRAPH AND CRITICAL PATH

**Plan version:** v1.0  
**Status:** APPROVED FOR IMPLEMENTATION — PLANNING COMPLETE  
**Approval date:** 2026-07-25  
**Approval authority:** User  
**Gate A:** PASSED  
**Gate B:** NOT MET  
**Coding:** NOT AUTHORIZED UNTIL GATE B PASSES

Loại edge: **S** schema, **D** domain/service, **A** API contract, **U** UI, **I** infrastructure, **Se** seed.

## 1. Bootstrap direction

```text
Pre-P0 Git verification
  → P0 repository/tooling
  → Config (không đọc DB)
  → Logging + error primitives
  → PostgreSQL pool + migration executor
  → application modules
```

`settings` là DB-backed runtime module, không phải bootstrap config. Không tạo edge Config → Settings → DB. Users/Identity sở hữu user repository và expose `UserAuthenticationQueryPort`; Auth phụ thuộc port đó. Users không import Auth.

## 2. Readiness Model B — separate core/media/worker

```text
/health/live          = process liveness only
/health/ready         = CORE: valid bootstrap config + minimal PostgreSQL query/schema compatibility
/health/ready/media   = media volume mount + safe read/write + storage adapter + required processor
/health/worker        = PostgreSQL + heartbeat + lease + claim + reaper + SMTP/provider signal
operational health    = HEALTHY | DEGRADED | UNAVAILABLE
```

Reverse proxy dùng **`/health/ready`** để giữ Nest Core API trong traffic. Endpoint này không kiểm storage, SMTP, worker, outbox backlog, CDN hoặc media processor. `/health/ready/media` không được dùng để loại toàn Core API khỏi traffic.

Khi PostgreSQL UP nhưng Storage/SMTP/Worker DOWN:

- `POST /inquiries` vẫn tạo Inquiry + Outbox cùng transaction và trả 202.
- Catalogue DB-only APIs vẫn chạy.
- Upload/download/media-dependent routes trả 503 với stable error code như `MEDIA_STORAGE_UNAVAILABLE`.
- Operational health là DEGRADED; core API vẫn trong traffic.

Probe registry tăng dần: core DB ở P2, media ở P3, worker/email ở P7. Missing required probe làm chính endpoint profile đó fail, không lan sang core profile khác.

## 3. Shared-service dependencies

- P3 trước P5/P6: ContentBlock schema, ExternalVideo validator, sanitization, StoragePort, MediaUsageService.
- P4: SlugService + route-resolution contract + redirect delivery proof.
- P5: PublishService, filter builder và product search.
- P8: canonical/robots resolver + sitemap/route providers.
- D19: inquiry repository phụ thuộc global unique key, durable fingerprint và atomic outbox creation.
- D19 replay resolution đọc durable winner trước CAPTCHA/new-submission rate limit; early lookup không thay atomic unique-conflict write path.
- D6 worker lifecycle: claim → commit durable `attempt_state='started'` → provider call ngoài DB transaction → một result transaction commit attempt + outbox + inquiry email statuses; `attempt_state`/`provider_outcome`/`manual_resolution` tách biệt; reaper phải hiểu system-unknown và manual-unknown.
- D20: `public-media/` và `protected-documents/` là hai namespace security boundary; proxy chỉ có read-only served root ở `public-media/`. Public lifecycle phụ thuộc MediaUsageService, purge job, cache purge/expiry, orphan move và consistency scanner.

## 4. Inventory và dependency table — đúng 25 modules

| # | Module | Hard dependencies | Phase |
|---:|---|---|---|
| 1 | auth | users query port, DB, config/logging | P2 |
| 2 | users | DB | P2 |
| 3 | media | DB, users, StoragePort, MediaUsageService, public/protected namespace router | P3 |
| 4 | settings | DB | P2 |
| 5 | pages | media, SlugService, locale | P6A |
| 6 | homepage | banners/media/pages/settings/industries + published providers | P8 |
| 7 | brands | media, SlugService, locale | P4 |
| 8 | product-categories | media, SlugService | P4 |
| 9 | standards | SlugService | P4 |
| 10 | applications | SlugService; Admin flat | P4 |
| 11 | industries | media, SlugService | P4 |
| 12 | products | brand NOT NULL, four taxonomy modules, media, validators, PublishService, locale | P5 |
| 13 | services | media, SlugService, locale, validators | P6A/B |
| 14 | customers | media, locale rules | P6A |
| 15 | projects | customers, media, SlugService, locale, validators | P6A/B |
| 16 | post-categories | SlugService | P6A |
| 17 | posts | post-categories, media, SlugService, locale, validators | P6A/B |
| 18 | documents | media, protected-document storage class, SlugService, locale, Nest-controlled download | P3/P6A/B |
| 19 | offices | media/config translations | P6A |
| 20 | navigation | menus/menu-items + configured source + published providers | P8 |
| 21 | redirects | SlugService + route resolution + Next delivery | P4→P8 |
| 22 | search | products + pg_trgm; product-only | P5 |
| 23 | inquiries | settings/email, products/services SET NULL, D19 replay/write repository, durable worker attempts | P7 |
| 24 | seo | route providers, redirects, settings/base URL | P8 |
| 25 | health | core DB profile, media profile, worker profile, operational aggregator | P2→P7 |

Infrastructure, worker, frontend và shared services là components riêng, không tăng module count.

## 5. Main DAG

```text
P0 tooling
  → P1 DB baseline
    → P2 core/auth/settings/core-readiness
      → P3 media/security/media-readiness
        → P4 taxonomies + slug + redirect proof
          → P5 products + product search
            → P6A content core → P6B relationships
            └→ P7 inquiry/worker (parallel after service core)
              P6B + route providers → P8 web delivery
                → P9/P10 completion → P11 release
```

Content migration: `C7 assigned → CM0 → CM1 → CM2 → CM3 → CM4`, song song P4–P11.

## 6. Edges intentionally absent

- Không Auth↔Users cycle.
- Không config→DB-backed settings bootstrap cycle.
- Không hard edge storage/SMTP/worker→core readiness.
- Không P8 hard edge tới P7 nếu web delivery không dùng inquiry.
- Không site-wide search edge ở P8.
- Không media soft-delete→immediate file delete; purge là delayed lifecycle theo D20.
- Không proxy→persistent volume root edge; `/media/*` chỉ edge tới `public-media/`, không tới protected/temp/quarantine.

## 7. Critical path và bottleneck

Critical path là P0→P1→P2→P3→P4→P5→P6A→P6B→P8→P10→P11. Bottleneck: P1 migration materialization, P5 products, P6B/P8 fan-in, routing/301 compatibility và content CM3/CM4. P7 parallel giảm critical-path coupling nhưng P7 reconciliation vẫn là release acceptance.
