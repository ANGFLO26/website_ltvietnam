# 04 — PHASES, MILESTONES AND CRITICAL PATH

**Plan version:** v0.4 · **Trạng thái:** `PROPOSED FOR FINAL VERIFICATION` · **Ngày:** 2026-07-22

**13 phase labels:** P0, P1, P2, P3, P4, P5, P6A, P6B, P7, P8, P9, P10, P11. Mỗi phase dưới đây có input, output, acceptance, tests, evidence, rollback, out-of-scope, owner/reviewer.

## Pre-P0 — Manual Git prerequisite (ngoài implementation phases)

**Owner:** User/authorized operator. **Reviewer:** user-designated maintainer.  
**Input:** project history/known origin. **Output:** repository hợp lệ hoặc explicit approved new initialization.

- Xác định repo gốc; restore/clone đúng repo nếu tồn tại, hoặc user phê duyệt init mới; xử lý `.git` rỗng.
- Verify root, `main`, remote hoặc explicit no-remote, baseline commit, status và tag `docs-v1.2.1-approved`.
- Sau restore tạo hash manifest cho plan history, commit nguyên trạng và tag/archive reference; không rewrite file lịch sử. Timestamp-only evidence hiện tại là known limitation.
- Gate B verify kết quả. Không source implementation ở bước này.

## P0 — Repository Verification, Tooling & Technical Bootstrap

**Input:** Gate B PASS; D1–D20; routing/topology; spike plan.  
**Output:** re-verified repo, branch/CODEOWNERS/CI/evidence structure, monorepo skeleton, OpenAPI/codegen tooling, exact 301 spike evidence.

- Re-verify Git; không thực hiện restore/init trong phase.
- Scaffold Nest/Next/worker/contracts/route-rules/config/testing; pin Node and package manager.
- Add OpenAPI lint, breaking-change check, generated-client freshness, consumer smoke and expand/contract policy.
- HTTP 301 spike pin exact Next.js version, lock hash, Node, router, runtime, render/stream/cache modes, production build và proxy config.
- **Tests:** pipeline/build; compose skeleton; codegen freshness; 15-case spike matrix ở `12`.
- **Acceptance/DoD:** build xanh; tooling chạy; exact explicit 301/no rendered HTML/pre-stream PASS ở dev+production+proxy/cache/failure cases. Spike PASS là P0 DoD, không phải P0 start condition.
- **Evidence:** SHA, lock hash, versions, commands, exit codes, raw response headers/body, proxy config checksum, logs under evidence path.
- **Rollback:** revert scaffold/tooling PR; preserve Pre-P0 Git history.
- **Out-of-scope:** business tables/endpoints, migration 001–070 materialization, Git restoration.
- **Owner/Reviewer:** Technical bootstrap owner / independent reviewer; user approves merge.

## P1 — Raw SQL Database Baseline and Migration Materialization

**Input:** P0; Approved aggregate `schema_up`, `schema_down`, verification checks.  
**Output:** executable `001_*.up.sql`, `001_*.down.sql` … `070_*.up.sql`, `070_*.down.sql`, manifest/checksums/history runner, three seed pipelines, restore evidence.

### Migration materialization acceptance — CASE B

1. Unique monotonic 001–070; every up has mapped down; manifest records checksum.
2. Execute each up separately and in order; update migration history after each successful migration.
3. For transactional DDL, history row and DDL commit atomically; failure leaves neither marked successful.
4. Validate dependencies and known schema state after every prefix N; test upgrade from every valid prefix N to N+1.
5. Vì Approved aggregate down chỉ có năm group markers, reviewer phải tạo/audit mapping up N ↔ down N. Down N chỉ đảo đúng object/change owned by up N và không làm hỏng object của migration trước.
6. Disposable DB automation: apply 001..N → rollback N → verify prefix N-1 → reapply N, for N=1..70 or equivalent exhaustive evidence.
7. Inject failure inside migration N; transaction-supported work returns to prefix N-1; history stays N-1; rerun resumes safely.
8. Inventory non-transactional DDL (`CREATE INDEX CONCURRENTLY`, extensions/special operations). Isolate it and define resumability, compensation and failure detection; never assume all DDL transactional.
9. History tests: empty, valid prefix, full, checksum mismatch, gap, duplicate, out-of-order, unknown migration, modified applied file. Invalid history fails closed.
10. Concurrent runners use PostgreSQL advisory lock or equivalent; only one applies, the other waits/fails safely; no duplicate history.
11. Aggregate evidence still required: concat up ≡ Approved aggregate; concat down ≡ Approved aggregate; 001→070→001→070; verification checks PASS.
12. **Aggregate equivalence is necessary but not sufficient.** Freeze checksums only after all per-file/prefix/failure/history/lock checks PASS.

- **Seeds:** separate production bootstrap, dev/demo and test fixtures; no fixed production password/demo leakage.
- **Tests:** PostgreSQL 16 real DB, dependency inventory, 63 tables/extensions/functions/triggers/constraints/index/FK, backup+restore.
- **Acceptance/DoD:** all 12 migration criteria, seed separation and restore PASS; no active 071.
- **Evidence:** per-prefix result matrix, failure injection logs, lock logs, history negative tests, checksums, raw PG16 logs.
- **Rollback:** disposable down; production restore + forward fix, not destructive down by default.
- **Out-of-scope:** schema redesign, ORM regeneration, implementation migration 071+.
- **Owner/Reviewer:** DB owner / independent DB reviewer who reruns critical cases.

## P2 — Core Platform, Auth, Settings and Core Readiness

**Input:** P1; B23+B24 must be closed before start.  
**Output:** config→logging→DB bootstrap, one-way Auth/Users, settings, audit logs, `/health/live`, `/health/ready`.

- `/health/live` process only. `/health/ready` validates bootstrap config + minimal PostgreSQL query/schema compatibility only.
- Auth implements Approved cookie/CSRF/CORS/reset/lock semantics; no `/admin/users`.
- **Tests:** auth races, reset replay, key overlap/rotation, proxy spoof, audit PII redaction, DB readiness fail/recover; assert storage/SMTP/worker not queried by core readiness.
- **Acceptance/DoD:** auth E2E, settings masked, no Users CRUD, core readiness Model B PASS, no Critical/High security.
- **Evidence:** contract/security/concurrency/raw health results.
- **Rollback:** disable affected auth flows; retain backward-compatible keys/settings; code revert.
- **Out-of-scope:** media probe, worker probe, audit UI, multi-role.
- **Owner/Reviewer:** Core/Auth owner / security reviewer.

## P3 — Media, Storage and Shared Content Security

**Input:** P2; B25 closed.  
**Output:** secure upload/processing, StoragePort, MediaUsageService, validators, `/health/ready/media`, public Semantics A lifecycle.

- Enforce magic bytes/MIME, JPG/PNG/WebP/PDF only, no SVG/video, resource limits, EXIF policy and safe storage keys.
- `/media/*` public marketing content uses PUBLIC-UNTIL-PURGE, default preliminary 30-day delay, bounded 24h cache, purge/consistency rules.
- Controlled document download remains through Nest publication gate.
- **Tests:** traversal, MIME spoof, SVG/video, decompression bomb, processor timeout/memory, concurrent duplicate, soft-delete URL still accessible until purge, purge 404/410, cache expiry/purge, orphan/missing pairs, restore consistency, storage-down 503 only on media routes.
- **Acceptance/DoD:** media security PASS; Model B media endpoint reflects storage; core API and inquiry acceptance unaffected by storage down; restore scan PASS.
- **Evidence:** upload rejection logs, cache headers, purge run evidence, DB/file scan reports without PII.
- **Rollback:** disable upload/purge, restore DB+media at same cutoff, repair orphans; do not delete DB record on missing file.
- **Out-of-scope:** customer attachments, video upload, Semantics B immediate revocation.
- **Owner/Reviewer:** Media owner / independent security+operations reviewer.

## P4 — Taxonomy Thin Verticals and Redirect Proof

**Input:** P3; P0 301 spike PASS; route resolver contract.  
**Output:** brands, product-categories, standards, applications, industries; SlugService; minimal UI; explicit 301 proof.

- Admin applications stays flat. Public taxonomy scope is list/landing, not rich taxonomy detail.
- **Tests:** slug create/rename races, reserved source, A→B→C direct, restore soft-delete, locale separation, explicit 301 before render through production-like proxy, cache invalidation.
- **Acceptance/DoD:** five taxonomies publish; thin Admin/Public E2E; exact 301/no HTML/EN no fallback PASS.
- **Evidence:** concurrency logs and network-level redirect capture.
- **Rollback:** stop writes/publish, preserve redirects, forward repair.
- **Out-of-scope:** products, facet count, rich taxonomy detail.
- **Owner/Reviewer:** Taxonomy/Slug owner(s) / cross-reviewer; integration change gets fresh reviewer.

## P5 — Product Thin Vertical

**Input:** P4; validators; product lock strategy closed.  
**Output:** products, relationships, PublishService, filters, product-only search, landing/list/detail and thin Admin.

- **Tests:** three OR/AND combinations, parameter binding, primary category race, replace-set lost-update, taxonomy archive during publish, duplicate/self links, search relevance, query budgets/no-N+1.
- **Acceptance/DoD:** catalogue usable E2E; `(PAC OR Herzog) AND ASTM D86`; publish/locale/discontinued correct; product-only search; performance budgets measured.
- **Evidence:** API/E2E/concurrency results, EXPLAIN/query counts, payload sizes.
- **Rollback:** disable publish/search, forward fix/data repair, expand/contract if 071+ needed.
- **Out-of-scope:** site-wide search, facet count, ecommerce UI, duplicate/bulk.
- **Owner/Reviewer:** Product owner / independent reviewer.

## P6A — Core Content Entities

**Input:** P5/P3 shared services.  
**Output:** pages, customers, offices, post categories; services/documents/posts/projects core; thin UI/routes.

- Dependency order: customers before projects; post categories before posts.
- **Tests:** publish/locale per entity, customer visibility, category RESTRICT, external video, gated document download, headers and hidden document denial.
- **Acceptance/DoD:** all core entities publish/render; external video safe; document gate correct; thin E2E PASS.
- **Evidence:** entity matrices, download/security results.
- **Rollback:** stop writes/publish, preserve redirects, forward data repair.
- **Out-of-scope:** cross-module relation completion, rich P1 components.
- **Owner/Reviewer:** split by entity / cross-reviewer.

## P6B — Cross-module Content Relationships

**Input:** P6A + products. **Output:** relationship endpoints/UI/related rendering.

- **Tests:** PATCH replace-set, lost update, duplicate/self reference, transaction rollback and integration E2E.
- **Acceptance/DoD:** relationship contract and concurrency PASS; fresh integration review.
- **Evidence:** DB/API/concurrency/E2E logs.
- **Rollback:** data repair + forward fix; no destructive blanket rollback.
- **Out-of-scope:** P1 bulk relationship tools.
- **Owner/Reviewer:** entity owners / fresh reviewer for fan-in PR.

## P7 — Inquiry and Outbox Worker (parallel)

**Input:** P5 + service core; SMTP/CAPTCHA/batch/timeout/recipient policy closed; D19 contract.  
**Output:** Inquiry API, atomic idempotency, worker, durable attempt history, reconciliation and worker health.

- Inquiry transaction implements D19 global unique/fingerprint v1 and exactly one outbox on winner.
- `IMPLEMENTATION MIGRATION 071+` direction includes fingerprint fields and recommended `inquiry_outbox_attempts`; no SQL is specified here.
- Attempt history fields: `id`, `outbox_id`, `attempt_number`, `worker_id`, `stable_message_id`, `provider_message_id`, `provider_response_code`, `provider_response_status`, `started_at`, `accepted_at`, `finished_at`, `outcome`, `sanitized_error_code`, `sanitized_error_summary`, `created_at`. Do not overwrite prior attempts.
- Preliminary attempt retention minimum 90 days, configurable; no full body/full PII; recipient masked/hash or approved snapshot.
- Duplicate-suspected: multiple provider accepts for stable Message-ID; provider ID but DB not sent after timeout; crash after acceptance before DB update; stale reaper claim after unknown; ambiguous timeout later proven accepted.
- Manual outcomes: confirmed-sent, confirmed-duplicate, confirmed-not-sent, unknown. Unknown/duplicate-suspected has **no blind resend**; automatic retry only when previous attempt is known not accepted.
- `/health/worker` checks PG/heartbeat/lease/claim/reaper/SMTP signal. Provider dedup is conditional; stable Message-ID + attempt history + reconciliation mandatory.
- **Tests:** all D19 races/timeouts/legacy cases; two workers; shutdown/drain; reaper race; accepted-then-crash; unknown outcome; poison/fairness; SMTP/storage/worker down while PG up → Inquiry 202; no duplicate outbox.
- **Acceptance/DoD:** lead-safe 202, atomic idempotency, worker lifecycle, durable reconciliation report with sent/pending/processing/retrying/failed/stale-processing/duplicate-suspected/unknown/confirmed-duplicate.
- **Evidence:** DB row assertions, attempt/reconciliation samples, sanitized logs, worker timing.
- **Rollback:** stop claim, drain, quarantine unknown/poison; preserve Inquiry/outbox/attempt evidence; reconcile sent email, never “undo” email.
- **Out-of-scope:** attachment, customer confirmation unless approved, Inquiry CRM/Admin management UI.
- **Owner/Reviewer:** Inquiry/Worker owner / independent concurrency+operations reviewer.

## P8 — Web Delivery: Navigation, Homepage, Redirects and SEO

**Input:** P4/P5/P6 route providers; domain/base URL decision for affected work.  
**Output:** navigation, homepage, centralized redirect, canonical/robots, sitemap/robots.

- Route resolver p95 target `<200 ms`, preliminary fail-fast ceiling `350 ms`; tuning only 250–400 ms after staging evidence.
- **Tests:** canonical/robots all route kinds, hreflang, XML/JSON-LD escaping, sitemap publication, open redirect, 301/cache hit/miss/invalidation/resolver down/old page cache.
- **Acceptance/DoD:** Nest authoritative; Next delivery; no guessed content on resolver failure; no new search; SEO outputs correct.
- **Evidence:** latency component report, network traces, sitemap/robots samples.
- **Rollback:** disable feature, cache purge, redirect snapshot restore, forward SEO fix.
- **Out-of-scope:** site-wide search, scheduled publishing, drag/drop P1.
- **Owner/Reviewer:** SEO/Redirect + Navigation/Home owners / cross-review.

## P9 — Admin Completion

**Input:** P4–P8 thin Admin surfaces. **Output:** consistent components/editor/accessibility and complete P0 Admin flows.

- **Tests:** Admin E2E, unsaved warning/manual draft save, media/relations/spec/SEO editor, generated-client freshness, compatibility/mixed-version.
- **Acceptance/DoD:** no Users CRUD, advanced auto-save, ecommerce controls, video upload or Inquiry CRM UI.
- **Evidence:** E2E/a11y/contract reports.
- **Rollback:** versioned deploy/feature flags/backward-compatible API.
- **Out-of-scope:** all P1/Future controls.
- **Owner/Reviewer:** Admin owners / independent integration reviewer.

## P10 — Public Completion

**Input:** P4–P8 public surfaces + CM3 validation. **Output:** P0 pages, responsive/a11y/performance/locale completion.

- **Tests:** 14 core flows plus hydration, mobile, keyboard/focus, locale mapping, controlled download headers, 301-before-render, resolver failure, product search and inquiry degraded dependencies.
- **Acceptance/DoD:** public scope complete, SEO clean, EN no mix, performance budgets measured, no scope leakage.
- **Evidence:** E2E/a11y/Lighthouse/API latency reports and network captures.
- **Rollback:** blue/green/canary, versioned assets, backward-compatible API, cache purge.
- **Out-of-scope:** site-wide search, campaign/FAQ/timeline, attachments.
- **Owner/Reviewer:** Public owners / independent integration reviewer.

## P11 — Content Delta, Integration, Hardening and Release

**Input:** P0–P10; C5/C9; C7 remains accountable; CM3 PASS. **Output:** CM4, restore/hardening/release evidence and user go-live decision.

- Run security/regression/load/no-N+1, mixed-version/blue-green, DB+media restore consistency, content counts/links/redirects, worker reconciliation/drain.
- Operational health thresholds are tuned and documented; DEGRADED does not remove core API when PG is usable.
- **Acceptance/DoD:** no Critical/High security; budgets/SLO disposition; backup/restore + media scans PASS; CM4 signed by C7; C5/C9 complete; user go-live approval.
- **Evidence:** signed go-live package, raw restore/load/security/CM/reconciliation reports.
- **Rollback:** tested DB+media snapshot, DNS/CDN/cache plan, worker drain, content delta snapshot, forward fix decision points.
- **Out-of-scope:** every P1/Future item.
- **Owner/Reviewer:** Release captain / independent reviewers by untouched area; user is final approver.

## Milestones and transition rule

M0 P0 · M1 P3 · M2 P5 · M3 P6B · M4 P7 · M5 P8 · M6 P10 · M7 P11. A phase transitions only when its DoD/evidence/rollback acceptance passes. An open decision only marks its own phase NOT READY according to `01`; B23/B24/B25 never retroactively block Gate A, Gate B or P0.
