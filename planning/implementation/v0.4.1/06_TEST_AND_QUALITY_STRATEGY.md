# 06 — TEST AND QUALITY STRATEGY

**Plan version:** v0.4.1 · **Trạng thái:** `PROPOSED FOR FINAL VERIFICATION` · **Ngày:** 2026-07-25

Test phải được định nghĩa trong DoR, fail khi logic sai và có evidence trong DoD. PASS không có artifact = **NOT RUN**.

## 1. Static tests — MANDATORY mọi phase có code/config

- Format, lint, type check, unused/dead-code scan.
- Circular dependency/import-boundary check; module không được gọi repository module khác.
- Dependency/license/vulnerability audit; Critical/High fail gate trừ approved exception có owner/expiry.
- Secret scan, generated-file drift, OpenAPI lint/breaking check, generated-client freshness.
- Migration manifest rules: duplicate/non-monotonic/missing pair/checksum drift.

**Evidence:** tool versions, config checksum, command, exit code, raw SARIF/log, exception register.

## 2. Unit tests — MANDATORY cho logic thuần

- PublishService completeness, locale publication, `first_published_at` once.
- SlugService current/redirect/reserved route checks; route normalization.
- Filter builder OR/AND, whitelist và parameter binding.
- Canonical/robots/social/hreflang resolver mọi page kind.
- MediaUsageService reference inventory; ContentBlock/ExternalVideo validation; email header/error sanitization.
- D19 canonicalization từng field, null/missing/empty, Unicode/NFC, line endings, email/phone/UUID/locale, hash version.
- D19 flow decision: durable same-key replay/different-key-reuse resolution occurs before CAPTCHA/submission quota; new key alone reaches guards.
- Outbox retry schedule, stable Message-ID, attempt-state transitions, new attempt number per retry, duplicate-suspected classification và no-blind-resend.

**Evidence:** coverage theo critical branch, mutation-sanity sample ở P11, raw test report.

## 3. Database integration tests — MANDATORY với PostgreSQL 16 thật

- P1: từng up/down 001–070, prefix validity, history atomicity, failure injection, advisory lock, non-transactional inventory, full aggregate equivalence.
- FK RESTRICT/CASCADE/SET NULL; unique/check/index/function/trigger behavior; soft-delete/slug reservation.
- Publish/rename/replace-set transaction rollback.
- D19 existing-key lookup and atomic global unique conflict/winner read; exactly one inquiry/outbox; replay creates no attempt; legacy NULL/version mismatch.
- Worker claim/reaper/lease; committed attempt-start before provider call; accepted/failed/unknown/manual transitions; attempt history never overwritten.
- Media purge and DB/file consistency metadata plus public/protected namespace and permission inventory.
- Không dùng SQLite hoặc in-memory substitute cho behavior PostgreSQL.

**Evidence:** database version, schema/checksum, setup/teardown, SQL-level assertions/logs (test artifacts, không phải migration SQL trong plan).

## 4. API and contract tests — MANDATORY cho endpoint/contract thay đổi

- Public only published/not-deleted/correct locale; Admin auth/authz; standard response/error envelope.
- Validation, pagination, repeated filters, sort whitelist, locale precedence and stable business error codes.
- `/health/live`, `/health/ready`, `/health/ready/media`, `/health/worker` profile isolation.
- D19 202 replay before CAPTCHA/submission quota and 409 mismatch before CAPTCHA, without old payload disclosure; replay lookup failure returns retriable safe error.
- Media-dependent 503 error code; `/media/*` only public root; controlled document download gate and direct protected/internal URL denial.
- OpenAPI schema comparison, backward compatibility, generated client freshness and consumer smoke.

**Evidence:** OpenAPI checksum/diff, request/response fixtures with PII redacted, exit logs.

## 5. Concurrency tests — MANDATORY nơi có shared state

- Two worker claim same job; SKIP LOCKED; lease/reaper race; shutdown drain; poison/fairness.
- D19 concurrent same/same and same/different, exact simultaneous no-row lookup, uncommitted winner wait, timeout retry, response lost, expired CAPTCHA/exhausted quota replay, one outbox.
- Two create/rename same slug; redirect source race; A→B→C.
- Two primary-category updates; replace-set lost update; publish versus taxonomy archive.
- Concurrent media checksum upload; purge/read/orphan-move race; symlink escape; migration concurrent runners.
- Worker barriers: attempt row commit before mocked provider invocation; result update after provider call; reaper behavior for started/unknown; no DB transaction held during network wait.
- Chạy bằng nhiều process/connection thật, không tuần tự giả lập.

**Evidence:** timing/barrier setup, transaction IDs where safe, final-row assertions and raw logs.

## 6. End-to-end tests — MANDATORY cho thin slice và completion

Core 14 flows:

1. Admin login. 2. Secure media upload. 3. Draft brand/category/product. 4. Publish product VI. 5. EN unpublished hidden. 6. Filter `(PAC OR Herzog) AND ASTM D86`. 7. Rename slug → exact 301. 8. Inquiry SMTP up. 9. Inquiry SMTP down → accepted 202. 10. Outbox retry/reconcile. 11. Public document download by slug. 12. Brand EN no VI fallback. 13. Valid YouTube/Vimeo renders. 14. Raw iframe/foreign provider rejected.

Additional mandatory flows: redirect before streaming/no HTML; storage down + PG up inquiry 202; upload/download controlled 503; D19 retry after response loss with expired CAPTCHA or exhausted submission quota; protected PDF guessed under `/media/*`=404; direct internal protected route denied; orphan move invalidates old served path under cache policy; media soft-delete accessible until purge then 404/410; locale switch preserves entity; hydration/mobile/keyboard/focus.

**Evidence:** browser version, production-like topology, trace/video/screenshots plus raw network assertions; screenshot alone không đủ.

## 7. Security tests — MANDATORY

- Argon2 parameters, cookie flags/expiry, CSRF lifecycle, CORS, logout/revocation, reset replay/concurrency, account-lock race, proxy spoof.
- CSP/HSTS/referrer/permissions/nosniff/frame, SSR stack/metadata/JSON-LD escaping.
- Rate limits, SQL injection/filter binding, XSS/sanitization, email CRLF/header injection.
- MIME spoof, SVG/video rejection, path traversal, Unicode filename, image bomb/dimension/memory/timeout, EXIF, PDF active-content/download policy.
- Public root cannot traverse/symlink into protected root; proxy is not mounted at volume root; dotfiles/temp/quarantine/internal redirect denied; namespace classification is not extension-only.
- Secret/PII logging and settings masking; public media no listing/unsafe host cache key; attempt/reconciliation no full body/PII; open redirect prevention.

**Evidence:** security tool/manual case results, redacted payloads, dependency report; no full PII.

## 8. SEO tests — MANDATORY cho route/public changes

- Self canonical detail; filter/search noindex and canonical base; page/query/trailing-slash policy.
- Hreflang only both published; 404/410 robots; brand profile versus filter.
- Exact 301 for slug and legacy brand route; no redirect chain/loop/client-side redirect.
- Sitemap only published locale, XML escaping, threshold/chunking; robots; structured data escaping/types.
- Cache invalidation for old/new resolver/page/sitemap; resolver failure never guessed cached 200.

**Evidence:** URL matrix, header/body assertions, crawler report and generated samples.

## 9. Performance tests — MANDATORY theo phase matrix

- Query count and EXPLAIN for list/detail/homepage/landing/search; N+1 sweep.
- Payload size uncompressed và compressed; upload decoder/processor CPU/RAM/timeout.
- Public API p95, page TTFB, worker throughput/lease, sitemap generation and Lighthouse fixed profile.
- Route delivery measures separately: resolver latency, Nest DB/query, Next→Nest network, page TTFB, cache hit/miss and timeout/error rate.
- Load profile/data size/concurrency/environment phải nằm trong evidence; preliminary budgets không phải SLA.

## 10. Mandatory domain/failure suites

### D19 atomic idempotency

1. Commit + response lost + expired CAPTCHA → replay original stable result.
2. Commit + exhausted new-submission quota → replay.
3. Existing key + different payload → 409 before CAPTCHA.
4. Two simultaneous no-row lookups → one unique winner and one Inquiry/Outbox.
5. Genuinely new key + failed CAPTCHA → no business write.
6. Replay lookup DB timeout/failure → retriable safe error; no new key/write.
7. Replay path creates no Inquiry/Outbox/attempt.
8. Concurrent same/same and same/different; rollback; legacy NULL; version mismatch; canonical-equivalent/materially-different inputs.

### Readiness Model B

PG down; storage down; SMTP down; worker down; multiple failure combination. Với PG up + storage/SMTP/worker down: core ready, inquiry 202, DB-only catalogue success, media route 503, operational DEGRADED.

### Media Semantics A

Soft-delete blocks new refs/query but old URL remains until purge; preliminary 30-day config; bounded 24h cache; privileged immediate purge guard; active-reference denial; cache purge/expiry; variants/original deletion order; missing file mark BROKEN. `public-media/` versus `protected-documents/` namespace suite: public image works; protected PDF guessed via `/media/*`=404; Internet direct protected internal location denied; traversal/symlink/dotfile/temp/quarantine denied; orphan moved outside served root and cache purged/expired; DB+media restore preserves namespaces and permissions.

### Migration materialization

Per-file apply, prefix/down/reapply all N, failure injection, history negative cases, modified applied file, non-transactional recovery, two runners, aggregate up/down/up and verification checks. Aggregate equivalence alone cannot PASS P1.

### Outbox reconciliation

1. Attempt-start row commit fails → provider is not called.
2. Crash after attempt commit but before provider call.
3. Crash after provider accepted but before attempt update.
4. Provider timeout later confirmed accepted.
5. DB unavailable after provider accepted.
6. Reaper encounters `started`/`unknown`.
7. Retry creates next `attempt_number` and does not overwrite old attempt.
8. No-blind-resend for unknown.
9. Manual outcome has actor/time/reason.
10. No full PII/body in attempt or reconciliation evidence.

Each provider call is bracketed by short transactions: claim/commit attempt-start → provider call outside DB transaction → new result/status transaction. Minimum states: started, accepted, failed, unknown, confirmed-sent, confirmed-duplicate, confirmed-not-sent. Configurable attempt retention remains at least preliminary 90 days.

### Redirect spike P0

Exact Next.js/router/runtime/render/stream/cache/build/proxy matrix in `12`; explicit 301, no rendered page HTML, before stream, dev/prod, hit/miss, A→B→C, timeout/down, old page cache, sitemap invalidation, concurrent rename/request.

## 11. Test classification

### MANDATORY

All checks marked mandatory above and every phase DoD test. Security/atomicity/readiness/migration/media lifecycle/redirect delivery cannot be deferred from their owning phase.

### CONDITIONAL

- Distributed rate-limit tests activate at multi-instance.
- Provider idempotency/dedup activates only if provider supports it; attempt history/reconciliation remain mandatory.
- Automated JWT rotation service may defer if manual overlap/rollback drill + key inventory exists.
- PDF antivirus/CDR may defer only with force-download, nosniff, no-inline, size cap and recorded risk.
- HTTP range may defer for bounded full-download-only contract; download headers remain mandatory.
- Exhaustive browser/device matrix may defer; primary mobile, keyboard/focus and critical flows remain mandatory.
- Sitemap chunking execution may defer below 10,000 URLs; escaping and hard-limit test remain mandatory.

### DEFERRED WITH DOCUMENTED RISK

Requires risk ID, owner, expiry/trigger, safe default, phase/release impact and user acceptance where relevant. Không dùng classification này để né High issue hoặc phase DoD.

## 12. Evidence rules

Path: `implementation/evidence/<commit-sha>/<phase>/` hoặc immutable CI artifact store; không đặt evidence trong plan version directory. Mỗi artifact có commit SHA, command, environment/version, config/lock checksum, start/end time, exit code, raw log and result summary. Sensitive data redacted deterministically. Reviewer phải đọc implementation/test và rerun critical cases; screenshot/status text không thay raw result.

## 13. Phase matrix

| Phase | Static | Unit | DB | API | Conc | E2E | Sec | SEO | Perf | Migr/Ops |
|---|---|---|---|---|---|---|---|---|---|---|
| P0 | M | C | — | M | — | M | M | C | M | M tooling |
| P1 | M | C | M | — | M | — | M | — | C | **M** |
| P2 | M | M | M | M | M | M | M | — | C | C |
| P3 | M | M | M | M | M | M | M | C | M | M restore |
| P4 | M | M | M | M | M | M | M | M | M | C |
| P5 | M | M | M | M | M | M | M | M | M | C 071+ |
| P6A | M | M | M | M | C | M | M | M | M | C |
| P6B | M | M | M | M | M | M | M | C | M | C |
| P7 | M | M | M | M | M | M | M | C | M | M attempts |
| P8 | M | M | M | M | M | M | M | M | M | M cache |
| P9 | M | M | C | M | C | M | M | C | M | M compat |
| P10 | M | M | C | M | C | M | M | M | M | M deploy |
| P11 | M | M | M | M | M | M | M | M | M | M restore/release |

M = mandatory, C = conditional when capability changed/applies, — = not normally applicable.

## 14. Preliminary numeric engineering budgets

| Metric | Preliminary target/ceiling | Validation phase |
|---|---|---|
| Product list SQL queries | ≤5, target 1–3 + count | P5/P11 |
| Product detail SQL queries | ≤8 | P5 |
| Homepage SQL queries | ≤12 | P8 |
| Product list payload | ≤150 KB/20 items | P5 |
| Product detail payload | ≤400 KB | P5 |
| Image/PDF upload | image ≤10 MB, PDF ≤15 MB | P3/B25 |
| Image dimensions/pixels | ≤8000 px each and ≤40 MP | P3/B25 |
| Image processing | ≤20 s/file plus memory cap | P3 |
| Public DB statement | safety ≤3 s; target <500 ms | P2/P5 |
| Outbox batch | 10–50, initial 20 | P7 |
| SMTP job/lease | job ≤30 s; lease ≥2× timeout | P7 |
| **Route resolver** | **p95 <200 ms; preliminary fail-fast ceiling 350 ms; tune only 250–400 ms with staging evidence** | P0/P4/P8 |
| Sitemap chunk | >10,000 URLs; hard 50,000 | P8 |
| Public API p95 staging | list ≤400 ms; detail ≤600 ms | P11 |
| Lighthouse mobile | Perf ≥80, A11y ≥90, SEO ≥95 | P10/P11 |

Nếu resolver ceiling bị vượt: fail-safe 503/500, không render guessed content và không fallback cached 200 khi route có thể đã redirect. Mọi ceiling cũ lỏng hơn đã bị loại khỏi active contract.

## 15. Quality truth

Mutation-sanity phải chứng minh test bắt được logic sai; DB/concurrency/topology phải dùng môi trường thật tương ứng. Evidence provenance là một phần của result, không phải phụ lục tùy chọn.
