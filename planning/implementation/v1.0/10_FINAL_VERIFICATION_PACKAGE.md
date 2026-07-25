# 10 — FINAL VERIFICATION PACKAGE

**Plan version:** v1.0  
**Status:** APPROVED FOR IMPLEMENTATION — PLANNING COMPLETE  
**Approval date:** 2026-07-25  
**Approval authority:** User  
**Gate A:** PASSED  
**Gate B:** NOT MET  
**Coding:** NOT AUTHORIZED UNTIL GATE B PASSES

Tài liệu này là entry point để verify baseline v1.0 đã được assembly đúng từ candidate được duyệt. User approval và Gate A PASS đã được ghi nhận; package này không tuyên bố Gate B PASS và không cấp quyền coding.

## 1. Verification target

- Đúng **21 artifacts**: 19 numbered Markdown files `00`–`18`, `PLAN_CHANGELOG.md` và `V1_0_FILE_MANIFEST.sha256`.
- Mọi Markdown file mang version v1.0, approved status, approval date/authority, Gate A PASSED, Gate B NOT MET và coding prohibition.
- Không source code, migration SQL, Git mutation, Approved-doc mutation, cleanup hoặc archive mutation.
- Không normative dependency vào plan draft lịch sử; lịch sử chỉ xuất hiện trong disposition/changelog/provenance.
- Manifest dùng relative paths, stable ordering, loại chính manifest khỏi hash set và phải verify đủ 20 hashed artifacts.

## 2. Standalone content assertions cần verify

- `01`: full A1–A25, D1–D20, Approved-document reconciliation register AR-1–AR-4, exact D19, D20, open/business decisions, deadline/owner/status.
- `02`: full Foundation First/Vertical Slice/Hybrid comparison, trade-offs, selection and switch conditions.
- `06`: nine detailed layers, mandatory/conditional/deferred classification, evidence, phase matrix and numeric budgets.
- `09`: full R-01–R-33 with probability/impact/phase/owner/mitigation/trigger/status.
- `04/05/07/08`: phase I/O, acceptance, tests, evidence, rollback, scope, owners, DoR/DoD, gates, RACI.

Search in normative files must return no “giữ/xem draft cũ” phrasing. Historical references are allowed only in `11`, `14`, `15` and changelog/provenance context.

## 3. FV-01 verification — D19

- Global unique Inquiry idempotency scope and baseline `UNIQUE(idempotency_key)`.
- `IMPLEMENTATION MIGRATION 071+` direction for fingerprint + version; no SQL created.
- Exact versioned field list and “ALL ACCEPTED BUSINESS INPUT FIELDS MUST BE INCLUDED”.
- UUID-v4 lowercase hyphenated 36-character key, at least 122-bit cryptographic randomness, hard maximum 100, stable pre-lookup 400 validation, byte-exact case-sensitive comparison and header/body transport precedence.
- CAPTCHA/request metadata/server SMTP configuration excluded.
- UTF-8/NFC/whitespace/line ending/email/phone/UUID/locale/null/missing/empty/stable JSON/SHA-256 rules.
- Atomic insert-conflict-read transaction, exactly one Inquiry/Outbox, same replay/different 409, isolation wait and bounded DB retry.
- Existing-key lookup occurs before CAPTCHA/new-submission quota; same replay and different 409 bypass those guards; early lookup does not replace atomic unique write.
- Original stable result is byte-identical HTTP 202 in the A24 `{data}` envelope with `{request_id,message}`, no Inquiry UUID/PII/raw stored response body/public replay marker and no dependency on worker/outbox/email status.
- Unknown commit retry same key replays despite expired CAPTCHA/exhausted submission quota; replay lookup failure is retriable-safe; replay writes no Inquiry/Outbox/attempt.
- Legacy nullable/dual-write/backfill/quarantine/constraint-later policy and all mandatory scenarios in tests.

## 4. FV-02 verification — Readiness Model B

Proxy uses `/health/ready` only for Core API; endpoint checks config+PostgreSQL only. `/health/ready/media` and `/health/worker` are separate. Test PG UP + storage/SMTP/worker DOWN must show Inquiry+Outbox commit/202, DB catalogue success, media-dependent 503 and operational DEGRADED without removing core traffic.

## 5. FV-03 verification — Media Semantics A

Verify `PUBLIC-UNTIL-PURGE`, preliminary configurable 30 days, bounded 24-hour cache, identity≠infinite lifetime, privileged immediate purge and ordered purge. `/media/*` must map read-only only to `public-media/`, never volume root or `protected-documents/`; direct protected/internal, traversal, symlink, dotfile/temp/quarantine tests deny access. Orphan file moves outside served root with cache invalidation. Same-cutoff restore preserves namespace and permissions.

## 6. FV-04 verification — Migration materialization

Verify 70 paired files are a P1 deliverable, not asserted present now. Acceptance must include separate execution, atomic history, every-prefix dependency, up/down mapping, rollback/reapply all N, failure injection, non-transactional inventory, all history cases, advisory lock and aggregate up/down/up. Statement “aggregate equivalence is necessary but not sufficient” must exist.

## 7. Gate/Git/staging verification

- B23/B24 block P2 only; B25 P3 only; none blocks Gate A/Gate B/P0.
- Git restore/init is Pre-P0 manual prerequisite; Gate B verifies it; P0 only re-verifies/setup.
- P0 name is Repository Verification, Tooling & Technical Bootstrap.
- Spike plan is P0 DoR; spike PASS is P0 DoD.

## 8. Operational verification

- Durable attempt-start row commits before provider call; commit failure prevents send.
- Provider call occurs outside DB transaction; one result transaction atomically writes attempt result, `inquiry_outbox.status` and `inquiries.email_status`.
- Verify the orthogonal fields: `attempt_state` = started/accepted/failed/unknown/resolved; nullable `provider_outcome` = accepted/rejected/timeout/error; nullable operator-only `manual_resolution` = confirmed-sent/confirmed-duplicate/confirmed-not-sent/unknown with actor/time/reason.
- Verify system-unknown and manual-unknown remain separate; manual resolution preserves provider outcome/timestamps; result-transaction failure routes to reconciliation without blind resend.
- New attempt per retry, crash/DB-down-after-accept/reaper suites and preliminary configurable ≥90-day retention.
- Duplicate-suspected rules, manual resolutions and no-blind-resend.
- Route resolver p95 target `<200 ms`, ceiling `350 ms`, tune only `250–400 ms` with staging evidence; không còn legacy loose ceiling trong active contract.
- C7 before CM0 real execution; remains accountable through CM3/CM4/go-live.
- Exact 15-case Next.js spike matrix and pinned runtime/build/cache/proxy evidence.

## 9. Scope verification

Expected PASS: 25 modules, 13 phase labels, P6A/P6B, P7 parallel, Hybrid, product-only search, applications flat; no Users CRUD, advanced auto-save, site-wide search P0, facet P0, scheduled publish P0, video upload, Inquiry Admin CRM UI or ecommerce UI.

## 10. Provenance notes

- `01` §B-bis is the **Approved-document reconciliation register**. AR-1–AR-3 are declared divergences with engineering rationale and governance backlog; AR-4 records `/media/*` as additive with no Approved conflict. For these declared entries, the v1.0 position is authoritative until the corresponding Approved document is updated; undeclared conflicts still resolve to the Approved source under `00` §1.
- Approved `README_VERIFY.md` contains stale wording `STATIC VALIDATION ONLY`.
- PostgreSQL 16 execution result, raw log and release manifest are evidence that execution PASS occurred.
- **Stale wording does not override execution evidence.** No Approved snapshot is edited by v1.0 assembly.
- Add a future doc-change backlog item under the Approved-document governance process.
- Plan-history integrity currently has timestamp-only limitation; after Pre-P0 Git restoration, create hash manifest/commit/tag without rewriting history. This is not Gate A blocker.

## 11. Evidence verdict rule

Assembly verifier records command, file set/hash, search outputs and delta disposition. A missing CF-01–CF-06 contract makes the assembly invalid and must be corrected before the baseline is used. Claude independent verification and user approval already satisfied Gate A; assembly verification does not imply Gate B PASS.

## 12. Gate verdict rule

Gate A is PASSED. Gate B is NOT MET until the Pre-P0 Git prerequisite, environment/toolchain/CI checks and P0 DoR are evidenced. The approved planning status must never be interpreted as `READY TO CODE`, `IMPLEMENTATION STARTED`, `P0 STARTED` or `GATE B PASSED`.

## 13. Promotion and assembly verification summary

Required assembly validation:

- explicit filename inventory: 21 artifacts (numbered `00`–`18`, changelog, manifest);
- version/header/status in every Markdown file;
- forbidden normative historical references: NONE;
- counts: A=25, D=20, R=33, C=9, test layers=9, application modules=25, phases=13, FV rows=14, RI rows=3, spike cases=15;
- AR-1–AR-4 and CF-01–CF-06 markers;
- UUID-v4 transport/key, stable 202 response and three-axis attempt/result-transaction tests;
- high-closure marker suite: PASS;
- legacy loose resolver ceiling occurrence: NONE;
- scope guard suite: PASS;
- non-Markdown artifact only the `.sha256` manifest; no code, SQL or binary;
- RI-01 markers/tests/references: PASS;
- RI-02 markers/tests/references: PASS;
- RI-03 markers/tests/references: PASS;
- v0.4.1 source SHA-256 set unchanged across assembly;
- v1.0 manifest verifies all 20 hashed artifacts.

Actual commands/results and the CF delta table are recorded under `reviews/v1.0-assembly/`. They verify assembly only and do not replace runtime P0/P1 evidence or Gate B.
