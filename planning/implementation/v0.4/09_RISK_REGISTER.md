# 09 — RISK REGISTER

**Plan version:** v0.4 · **Trạng thái:** `PROPOSED FOR FINAL VERIFICATION` · **Ngày:** 2026-07-22

Probability/Impact: L = thấp, M = vừa, H = cao. Status: **OPEN**, **PHASE GATE**, **GATE B BLOCKER**, **CONTROL DEFINED**, **MONITOR**, **DEFERRED GOVERNANCE**. Risk chỉ được đóng khi có dated evidence; “control defined” không có nghĩa implementation đã PASS.

| ID | Risk | Prob. | Impact | Phase | Owner | Mitigation | Trigger/signal | Status |
|---|---|:---:|:---:|---|---|---|---|---|
| R-01 | Stack/framework choice proves incompatible | L | H | P0 | Tech lead/U | D1–D18 locked; exact Node/Next/router/proxy spike; pin toolchain and compatibility matrix | Build/runtime/SSR/worker limitation or unsupported dependency | CONTROL DEFINED |
| R-02 | Over-engineering Redis/microservices/CQRS | M | M | All | Architecture reviewer | Modular monolith; no Redis/serverless P0; YAGNI and scope review | PR adds distributed infrastructure without scale trigger | MONITOR |
| R-03 | P1/Future leaks into P0 | M | M | P4–P10 | Scope reviewer | DoR/DoD exclusions; automated phrase/UI audit; 25 modules/13 phases fixed | Users CRUD, advanced auto-save, facets, scheduled publish, video, site search, CRM/ecommerce UI appears | CONTROL DEFINED |
| R-04 | Multiple agents edit shared service/file concurrently | M | M | P0–P10 | Tech lead | Single active owner, CODEOWNERS, serialized migrations/contracts, fresh integration reviewer | Repeated conflicts or two PRs modify same shared contract | MONITOR |
| R-05 | Migration split/drift fails deployment/resume/rollback | M | H | P1+ | DB owner | Per-file/prefix/down/failure/history/lock/non-transactional tests; checksum freeze; 071+ only; forward fix | Prefix invalid, history mismatch, duplicate number, rerun cannot resume | PHASE GATE P1 |
| R-06 | API differs from Approved/OpenAPI | M | M | P2–P10 | API owner | OpenAPI contract, breaking check, generated-client freshness, consumer/mixed-version tests | Client failure, stale generated diff, semantic field change | MONITOR |
| R-07 | Locale publication mixed/fallback wrong | M | H | P4–P10 | Content API owner | Shared locale predicate, no Brand fallback, both-published hreflang tests | EN page shows VI, unpublished URL indexed, wrong alternate | PHASE GATE relevant slice |
| R-08 | Slug/redirect reuse, loop or chain | M | H | P4/P8 | Slug/Redirect owner | Three-source reservation, atomic rename, A→B→C direct, exact 301/cache tests | Old URL 404/200, chain/loop, reused published slug | PHASE GATE P4/P8 |
| R-09 | Inquiry lost, duplicated or idempotency replay wrong | M | H | P7 | Inquiry/DB owner | DB-first 202; D19 global atomic fingerprint; exactly one outbox; timeout/legacy tests; stable key | Two inquiry/outbox rows, false replay/409, lead lost after timeout | PHASE GATE P7 |
| R-10 | Business decisions arrive late | M | M | CM0/P7/P11 | U/Business | Named deadlines/owners; safe defaults; escalate before owning phase | Phase reaches DoR with decision still OPEN | OPEN staged |
| R-11 | Media exposed/deleted inconsistently | M | H | P3/P11 | Media/Ops | Semantics A, 30-day configurable delay, 24h bounded cache, usage check, orphan/missing rules, same-cutoff restore | Active image broken, deleted asset referenced, purged URL cached indefinitely, consistency scan fail | PHASE GATE P3/P11 |
| R-12 | N+1/query/payload growth | H | M | P5/P8/P10 | Module owner | Query/payload budgets, batch load, EXPLAIN, representative data and load tests | Query count scales with rows, p95/payload exceeds budget | MONITOR |
| R-13 | Canonical/robots/sitemap incorrect | M | H | P8/P10 | SEO owner | Nest authoritative resolver, complete URL matrix, escaping/crawler tests, cache invalidation | Filter indexed, canonical wrong, unpublished URL in sitemap | PHASE GATE P8/P10 |
| R-14 | False PASS or unverifiable evidence | M | H | All | Independent reviewer | Raw artifacts with SHA/env/exit/checksum; rerun; mutation-sanity; no screenshot-only claims | PASS without artifacts or test still passes after deliberate mutation | MONITOR |
| R-15 | Production topology/storage/email differs from staging | M | H | P11 | Ops/U | Production-like staging, adapters, Model B probes, deliverability and restore drills | Upload/email/health works locally but fails production | PHASE GATE P11 |
| R-16 | Real catalogue/content data unavailable | M | M | P5/CM/P11 | C7/U | Representative fixtures plus authorized real samples; CM0 inventory and rights | Filter/search/media QA lacks realistic cases | OPEN BUSINESS |
| R-17 | Secret committed or logged | L | H | All | Security reviewer | Ignore rules, secret scan, masked settings, no secrets in evidence | Scanner hit, token/password in log/history | MONITOR |
| R-18 | Inquiry PII leaks to log/attempt evidence | M | H | P2/P7 | Security/Worker owner | Fixed audit fields, masked/hash recipient, sanitized errors, no message body, retention | Full email/phone/message/provider payload in logs | PHASE GATE P7 |
| R-19 | Upload/content/email injection | M | H | P3/P6/P7 | Security owner | Magic bytes, allowlist, sanitization, CRLF protection, traversal/XSS/bomb tests | SVG/MP4 accepted, script executes, unsafe filename/header | PHASE GATE affected phase |
| R-20 | FE/API integration appears late | M | M | P4–P10 | Integration owner | Thin UI/E2E each slice; OpenAPI/generated client; mixed-version smoke | Large contract/UI rework delayed to P9/P10 | MONITOR |
| R-21 | Hidden concurrency races beyond outbox | M | M | P4–P7 | DB/module owner | Transaction/unique/version/lock policy and multi-connection tests | Duplicate redirect/primary relation, replace-set lost update | PHASE GATE affected slice |
| R-22 | SQL/provenance wording confuses execution state | L | M | Governance/P1 | Plan/DB owner | Known note: stale STATIC wording does not override raw PG16 result/release manifest; backlog doc change under Approved process | Reviewer treats execution as static-only or evidence paths disagree | DEFERRED GOVERNANCE |
| R-23 | Public routing bypasses authoritative redirect/SEO | M | H | P0/P4/P8 | Route/SEO owner | Routing matrix; Nest authoritative; Next pre-render delivery; exact spike; fail-safe resolver | Client-side redirect, duplicate resolver, cached old 200 | PHASE GATE P0/P4/P8 |
| R-24 | Single-host assumptions violated by deployment scale | M | H | P0/P11 | U/Ops | Explicit single-instance local state; abstraction; architecture review before scaling | Multiple API hosts cause inconsistent cache/rate/media/worker state | MONITOR |
| R-25 | Git metadata absent/invalid | H | H | Pre-P0 | U/authorized operator | Option A restore/clone/approved init; verify root/main/remote/baseline/status/tag before Gate B | Git commands fail or provenance unavailable | **GATE B BLOCKER** |
| R-26 | Node/Next/Nest version becomes EOL/incompatible | M | H | P0+ | Tech lead/U | Supported LTS only, lock/pin, dependency monitoring, exact spike | EOL notice, security support ends, build matrix fails | MONITOR |
| R-27 | Content/redirect migration incomplete at go-live | H | H | CM0–CM4 | C7/Release captain | C7 before CM0; complete inventory/map/rights; validation/cutover signatures; post-launch crawl | Unmapped old URLs, broken links, missing assets, unsigned CM3/CM4 | PHASE/RELEASE GATE |
| R-28 | Rollback destroys data or ignores side effects | M | H | P1–P11 | Ops/DB owner | Side-effect-specific rollback, restore/forward fix, no default prod down, worker drain and content snapshot | Rollback plan says only code revert; data/files/email inconsistent | PHASE GATE P11 |
| R-29 | Worker crash after provider acceptance causes duplicate/unknown email | M | H | P7/P11 | Worker/Ops | Durable attempt history ≥90d preliminary; stable Message-ID; duplicate rules; manual outcomes; no-blind-resend; reconciliation report | Provider ID exists but DB not sent, stale unknown reaped, multiple accept events | PHASE GATE P7/P11 |
| R-30 | Mixed API/Next versions break deployment | M | H | P0/P9–P11 | API/Release owner | D18 additive compatibility, generated client freshness, mixed-version smoke, expand/backfill/contract | Old FE fails new API or vice versa | PHASE GATE release-affecting change |
| R-31 | Demo seed/default credential reaches production | L | H | P1/P11 | DB/Security/U | Separate seed pipelines, one-time secret, forced password change, production guard | Demo rows/default password appear in production | PHASE GATE P1/P11 |
| R-32 | Image/PDF resource exhaustion/active content | M | H | P3 | Media/Security | Byte/dimension/pixel/memory/time limits, EXIF strip, force download/nosniff, benchmark | OOM/timeout, active PDF inline, oversized decoder allocation | PHASE GATE P3 |
| R-33 | Core readiness coupled to storage/SMTP/worker loses leads | M | H | P2/P3/P7 | API/Ops | Model B; proxy uses core `/health/ready`; separate media/worker; dependency-down inquiry 202 tests | Core removed from traffic when non-core dependency fails; form errors with PG up | PHASE GATE P2/P3/P7 |

## Priority and gate view

- **Gate A:** risk register itself has no deliberately unresolved High correction; independent audit/user approval remain external Gate A requirements.
- **Gate B:** R-25 only current explicit blocker in this register; environment/toolchain verification is also required by Gate B checklist.
- **Phase gates:** R-05 P1; R-33 P2/P3/P7; R-09/R-29 P7; R-11 P3/P11; R-27 CM/release.
- **Release:** C5/C7/C9 and all P11 DoD; open/unknown reconciliation cannot be silently waived.

## Review cadence

Review at phase DoR, midpoint and DoD; update probability/impact/status with evidence link. New risk gets next ID. A Critical risk stops the affected gate/phase immediately. Only independent evidence and accountable-owner acceptance can mark CLOSED.
