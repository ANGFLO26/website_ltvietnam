# 12 — REQUEST ROUTING AND DEPLOYMENT TOPOLOGY

**Plan version:** v0.4.1 · **Trạng thái:** `PROPOSED FOR FINAL VERIFICATION` · **Ngày:** 2026-07-25

## 1. Single-host deployment

```text
Internet
  → Nginx/Caddy TLS reverse proxy
      → Next web (public + /admin)
      → Nest Core API (/api/v1, core health, sitemap, robots, downloads)
      → /media/* read-only `public-media/` delivery
      → Worker process (internal health)
  Nest + Worker → PostgreSQL 16
  Nest/StoragePort → `public-media/`, `protected-documents/`, private temp/quarantine
  Proxy → `public-media/` only; never persistent volume root
  Backup → DB + media at same cutoff
```

No serverless or Redis P0. In-process cache/rate-limit is single-instance only.

## 2. Routing matrix

| Path | Destination | Traffic/readiness | Cache | Failure behavior |
|---|---|---|---|---|
| `/api/v1/*` | Nest Core API | Proxy uses `/health/ready` | per endpoint | DB/core unavailable → controlled 503 |
| `/api/v1/admin/*`, `/api/v1/auth/*` | Nest | Core readiness | no-store | auth/error envelope |
| `POST /api/v1/inquiries` | Nest→PostgreSQL | Core readiness only | no-store | storage/SMTP/worker down + PG up → commit+202 |
| `/api/v1/documents/:slug/download` | Nest→`protected-documents/` controlled delivery | Core + route-local media dependency | no-store/policy | media down/missing → stable 503/404; internal redirect not Internet-accessible |
| `/health/live` | Nest | liveness | no-cache | process only |
| `/health/ready` | Nest | **Core config+PG; proxy traffic probe** | no-cache | never checks storage/SMTP/worker/CDN/backlog |
| `/health/ready/media` | Nest/media adapter | diagnostics/media routing only | no-cache | storage/processor profile |
| `/health/worker` | Worker/internal | worker diagnostics | no-cache | heartbeat/lease/claim/reaper/SMTP signal |
| `/sitemap*.xml`, `/robots.txt` | Nest | Core readiness | bounded | fail-safe, no guessed content |
| `/media/*` | Proxy→read-only `public-media/` root only | route-local media readiness | versioned, max-age preliminary 24h | protected/volume-root/traversal/symlink/dotfile/temp/quarantine denied |
| `/admin/*` | Next | Next readiness + API calls | no-store/dynamic | no security authority in FE |
| Public pages | Next→Nest resolver/API | Next checks resolver before render | bounded route/page caches | resolver ceiling → 503/500, no guessed cached 200 |

## 3. Model B health and operational status

Operational aggregator reports HEALTHY/DEGRADED/UNAVAILABLE using media availability, SMTP failures, worker heartbeat, oldest pending, backlog, email_failed and missing/broken media. DEGRADED is informational/operational and does not remove core traffic while `/health/ready` passes.

Required failure acceptance:

| PG | Storage | SMTP | Worker | Core ready | Inquiry | DB-only catalogue | Media routes | Operational |
|---|---|---|---|---|---|---|---|---|
| UP | DOWN | DOWN | DOWN | PASS | 202 after Inquiry+Outbox commit | available | controlled 503 | DEGRADED |

## 4. Public media — Semantics A

- Required logical/physical boundary:

  ```text
  persistent-media-volume/
  ├── public-media/
  │   ├── originals/
  │   └── variants/
  └── protected-documents/
  ```

  Exact internal names may change at implementation, but the security boundary is normative.
- `/media/*` is mounted only to `public-media/`, never to the persistent volume root. Delivery permission is read-only; directory listing is disabled.
- Canonical path resolution must remain inside public root. Deny `..` traversal, symlink escape into protected/private roots, dotfiles, internal metadata, temp and quarantine.
- `protected-documents/` is outside public web root and has no direct public URL. Nest checks publication, locale, deletion and existence before streaming or a protected internal redirect. The internal redirect location is inaccessible directly from the Internet.
- Validated storage class, not filename extension alone, routes public marketing originals/variants to `public-media/`, gated PDF/documents to `protected-documents/`, and temp/quarantine to a private non-public location.
- Public marketing images/variants use storage-safe content-addressed/versioned paths, MIME allowlist, `nosniff`, no listing/traversal and trusted cache key.
- Soft-delete removes active selection/API visibility but old URL remains reachable until purge.
- Preliminary configurable purge delay 30 days. Immediate purge is privileged, confirmed and reference-checked.
- Content identity is immutable; cache lifetime is not infinite. Preliminary public max-age 24h; purge CDN/proxy if available; otherwise effective revocation waits bounded client cache expiry.
- Purge order: eligibility + no active usage → job mark → cache purge → variants → original → DB purge timestamp/status → consistency scan.
- DB missing/file present → move outside served public root into private orphan quarantine and invalidate/purge cache; a report-only mark while Nginx still serves the file is forbidden. DB present/file missing → BROKEN/DEGRADED + alert/repair; soft-deleted/file present is expected until purge; purged URL 404/410.
- DB+media restore shares cutoff and preserves namespaces/permissions; existence/checksum/orphan/missing/namespace/permission scans must PASS.

Controlled documents never use direct public-volume inference; Nest checks publication, locale, deleted and existence, then streams or uses protected internal redirect.

Mandatory namespace tests: public image delivery succeeds; guessed protected PDF under `/media/*` returns 404; direct protected internal location is denied; traversal and public→protected symlink are denied; dotfile/temp/quarantine are not served; orphan move makes the old public path ineffective under cache policy; restore retains namespace and permissions.

## 5. Route-resolution lifecycle

1. Browser → Proxy → Next page boundary.
2. Next calls Nest route resolver **before SSR and before streaming**.
3. Resolver returns content, redirect, not_found or gone with locale/canonical/robots/alternate metadata.
4. Redirect result makes Next emit explicit 301 before any page HTML. Temporary redirect is only an explicit business rule.
5. Content then fetches/render; not_found/gone uses locale-aware 404/410.

Framework helpers that emit 307/308 or client-side JavaScript redirects do not satisfy D17. Nest owns record/lifecycle/target/loop rules; Next only delivers response.

## 6. Resolver performance and failure

- Target resolver p95 `<200 ms`.
- Preliminary fail-fast ceiling **350 ms**.
- Tuning is permitted only within **250–400 ms** after staging evidence.
- Measure resolver, Nest DB/query, internal network, page TTFB, server/resolver cache hit/miss and timeout/error rate separately.
- On ceiling/unavailable: return fail-safe 503/500, do not render guessed content, do not serve cached 200 when the route could now redirect, and do not cache failure as content/not-found.

## 7. Cache invalidation

Rename A→B invalidates A, B, route resolver cache, page cache and relevant sitemap cache. A→B→C resolves A directly to C. Public media cache invalidation follows purge policy, not slug cache policy.

## 8. Exact Next.js P0 spike evidence

Pin in artifact: exact Next.js version, package-lock/pnpm-lock hash, Node runtime, App Router or Pages Router, Node/Edge runtime, rendering mode, streaming enabled/disabled, dynamic/static mode, production build, reverse-proxy version/config checksum, route cache mode, server cache hit/miss and resolver cache hit/miss.

Mandatory matrix:

1. Explicit 301 status.
2. Response body contains no rendered page HTML.
3. Redirect occurs before streaming.
4. Development build.
5. Production build.
6. Reverse proxy path.
7. Cache hit.
8. Cache miss.
9. A→B.
10. A→B→C direct.
11. Resolver timeout.
12. Resolver unavailable.
13. Existing old-page cache.
14. Sitemap cache invalidation.
15. Concurrent slug change/request.

Spike plan exists before P0; this matrix PASS is P0 DoD. Runtime compatibility is not claimed until evidence exists.

## 9. Security and observability

Proxy normalizes trusted forwarding headers; request ID propagates Proxy→Next→Nest→worker. Internal health and protected-delivery locations are access-controlled and not directly Internet-routable. Public media does not expose directory/host/path internals. Logs contain no full PII or content body.
