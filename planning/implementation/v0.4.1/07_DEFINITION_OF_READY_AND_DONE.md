# 07 — DEFINITION OF READY AND DONE

**Plan version:** v0.4.1 · **Trạng thái:** `PROPOSED FOR FINAL VERIFICATION` · **Ngày:** 2026-07-25

## 1. Definition of Ready chung

Một phase/task READY khi: scope và out-of-scope rõ; dependency/input sẵn; open decision tới deadline đã đóng; API/DB/I/O contract xác định; acceptance/test/evidence/rollback viết trước; owner/reviewer độc lập; file ownership rõ; không P1/Future leakage; security/privacy impact được review.

Thiếu một điều áp dụng cho phase → phase đó NOT READY; không làm phase trước hoặc gate không liên quan bị block.

## 2. Gate B / P0 DoR

- Pre-P0 Git restoration hoàn tất và Gate B verify root/main/remote-or-no-remote/baseline commit/status/tag.
- Toolchain, Docker, PostgreSQL 16, CI/evidence path khả dụng.
- D1–D20/topology/migration/worker contracts locked.
- OpenAPI/codegen/compatibility scope và **spike plan** đã sẵn.

Spike PASS không thuộc P0 DoR. Git restore/init không nằm trong P0.

## 3. Phase-specific DoR

| Phase | Additional DoR |
|---|---|
| P1 | aggregate sources và acceptance harness design available |
| P2 | B23+B24 closed |
| P3 | B25 closed; 30-day media purge default accepted as preliminary or replaced; public/protected namespace mapping and permissions defined |
| P4 | P0 spike PASS; thin routes/E2E defined |
| P5 | product concurrency strategy closed |
| P6A/B | entity and relation contracts frozen |
| P7 | SMTP/CAPTCHA/batch/timeout/recipient policy closed; D19 replay-before-guards flow and committed-attempt-before-send transaction contract ready |
| P8/P10 | production base URL/OG decisions for affected output |
| CM0 | **C7 assigned** and C8 authorization available |
| P11 | C5/C9 closed; C7 still accountable; CM3 PASS |

B23/B24 block P2 only. B25 blocks P3 only. Chúng không block Gate A, Gate B hoặc P0.

## 4. Definition of Done chung

- Implementation scope complete; static/unit/DB/API/concurrency/E2E/security/SEO/performance tests theo matrix PASS.
- No Critical/High security; no unresolved contract drift; OpenAPI and generated client current.
- Independent review complete; implementer không approve chính PR; user/maintainer merge authority.
- Evidence has SHA/command/env/version/checksum/exit/raw log; no artifact means NOT DONE.
- Rollback/forward-fix/restore mode tested in proportion to side effect; changelog and risk status updated.
- No unrelated Approved/schema/URL/scope mutation.

## 5. Phase-specific DoD

| Phase | Required Done conditions |
|---|---|
| P0 | Repo re-verified; tooling/CI/codegen works; exact 15-case Next.js 301 spike PASS; no business code |
| P1 | 70 up/down materialized; per-file/prefix/failure/history/lock/non-transactional/aggregate suites PASS; checksums frozen; seeds/restore PASS |
| P2 | Auth/security PASS; no Users CRUD; `/health/ready` only config+PG |
| P3 | Upload/media security; Semantics A; `/media/*` maps only read-only `public-media/`; `protected-documents/`/direct/traversal/symlink/temp access denied; orphan moved outside served root; namespace/permission restore tests; storage down does not remove core API |
| P4 | Five taxonomy thin slices; applications flat; exact 301-before-render and cache invalidation PASS |
| P5 | Product filter/search/publish/concurrency/no-N+1 PASS; search product-only |
| P6A | Core content publish/download/video validation E2E; protected files outside public root; guessed/direct internal URLs denied |
| P6B | Replace-set concurrency/integration PASS; fresh reviewer |
| P7 | Replay lookup before CAPTCHA/submission quota; lost-response retry bypasses stale guards; atomic new-key write gives one Inquiry/Outbox; attempt-start commits before provider call; no DB transaction spans SMTP; retry adds attempt; crash/DB-down reconciliation/manual audit/no-blind-resend; PG-only 202 |
| P8 | Nest authoritative SEO/redirect; resolver budget/metrics; no guessed cached content; no new search |
| P9 | Admin complete; no Users CRUD/advanced auto-save/ecommerce/video/Inquiry CRM controls |
| P10 | Public E2E/a11y/mobile/SEO/perf; EN no mix; controlled downloads |
| P11 | Security/load/compatibility/DB+media namespace/permission restore, orphan move and durable-attempt crash/DB-down/reconciliation suites PASS; CM4 and C7/C5/C9 sign-offs; user go-live decision |

## 6. Media and rollback Done rules

P3/P11 are not DONE if DB+media restore uses different cutoff, public/protected namespace or permissions are not preserved, or consistency scan is missing. Soft-delete is not proof of file revocation under Semantics A; purge/cache expiry evidence is required. DB-missing public file must move outside served root and purge cache; missing file never triggers automatic DB record deletion.

## 7. Gate A — promotion checklist summary

- 0 Critical, 0 unresolved High; Medium disposition.
- Candidate standalone, decisions/strategy/tests/risks/phases/gates/RACI complete.
- FV-01–FV-14 disposition and scope audit PASS.
- Independent final verification PASS.
- User explicitly approves promotion.

Git and phase-specific B23/B24/B25 are not Gate A conditions.

## 8. Gate B — coding-start checklist summary

- Pre-P0 Git valid.
- Toolchain/Docker/PostgreSQL/CI/evidence ready.
- P0 DoR complete, including spike **plan**, not spike result.

Gate B does not wait for B23/B24/B25. P0 spike PASS is P0 DoD.

## 9. Status rule

Candidate này chưa qua Gate A hoặc Gate B. Không suy diễn trạng thái active ngoài `PROPOSED FOR FINAL VERIFICATION`.
