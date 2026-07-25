# 10 — FINAL VERIFICATION PACKAGE

**Plan version:** v0.4 · **Trạng thái:** `PROPOSED FOR FINAL VERIFICATION` · **Ngày:** 2026-07-22

Tài liệu này là entry point cho independent verifier. Nó không cấp approval và không thay user decision.

## 1. Verification target

- Đúng 17 file required trong directory candidate.
- Mọi file mang v0.4 và active status duy nhất `PROPOSED FOR FINAL VERIFICATION`.
- Không source code, migration SQL, Git mutation, Approved-doc mutation hoặc v1.0 output.
- Không normative dependency vào plan draft lịch sử; lịch sử chỉ xuất hiện trong disposition/changelog/provenance.

## 2. Standalone content assertions cần verify

- `01`: full A1–A25, D1–D20, exact D19, D20, open/business decisions, deadline/owner/status.
- `02`: full Foundation First/Vertical Slice/Hybrid comparison, trade-offs, selection and switch conditions.
- `06`: nine detailed layers, mandatory/conditional/deferred classification, evidence, phase matrix and numeric budgets.
- `09`: full R-01–R-33 with probability/impact/phase/owner/mitigation/trigger/status.
- `04/05/07/08`: phase I/O, acceptance, tests, evidence, rollback, scope, owners, DoR/DoD, gates, RACI.

Search in normative files must return no “giữ/xem draft cũ” phrasing. Historical references are allowed only in `11`, `14`, `15` and changelog/provenance context.

## 3. FV-01 verification — D19

- Global unique Inquiry idempotency scope and baseline `UNIQUE(idempotency_key)`.
- `IMPLEMENTATION MIGRATION 071+` direction for fingerprint + version; no SQL created.
- Exact versioned field list and “ALL ACCEPTED BUSINESS INPUT FIELDS MUST BE INCLUDED”.
- CAPTCHA/request metadata/server SMTP configuration excluded.
- UTF-8/NFC/whitespace/line ending/email/phone/UUID/locale/null/missing/empty/stable JSON/SHA-256 rules.
- Atomic insert-conflict-read transaction, exactly one Inquiry/Outbox, same replay/different 409, isolation wait and bounded DB retry.
- Unknown commit retry same key; legacy nullable/dual-write/backfill/quarantine/constraint-later policy.
- All nine mandatory scenarios in tests.

## 4. FV-02 verification — Readiness Model B

Proxy uses `/health/ready` only for Core API; endpoint checks config+PostgreSQL only. `/health/ready/media` and `/health/worker` are separate. Test PG UP + storage/SMTP/worker DOWN must show Inquiry+Outbox commit/202, DB catalogue success, media-dependent 503 and operational DEGRADED without removing core traffic.

## 5. FV-03 verification — Media Semantics A

Verify `PUBLIC-UNTIL-PURGE`, preliminary configurable 30 days, bounded 24-hour cache, identity≠infinite lifetime, privileged immediate purge, ordered purge, orphan/missing/broken rules, 404/410 after purge and same-cutoff DB+media restore with four scans.

## 6. FV-04 verification — Migration materialization

Verify 70 paired files are a P1 deliverable, not asserted present now. Acceptance must include separate execution, atomic history, every-prefix dependency, up/down mapping, rollback/reapply all N, failure injection, non-transactional inventory, all history cases, advisory lock and aggregate up/down/up. Statement “aggregate equivalence is necessary but not sufficient” must exist.

## 7. Gate/Git/staging verification

- B23/B24 block P2 only; B25 P3 only; none blocks Gate A/Gate B/P0.
- Git restore/init is Pre-P0 manual prerequisite; Gate B verifies it; P0 only re-verifies/setup.
- P0 name is Repository Verification, Tooling & Technical Bootstrap.
- Spike plan is P0 DoR; spike PASS is P0 DoD.

## 8. Operational verification

- Durable attempt history fields and preliminary configurable ≥90-day retention.
- Duplicate-suspected five rules, four manual outcomes, no-blind-resend.
- Route resolver p95 target `<200 ms`, ceiling `350 ms`, tune only `250–400 ms` with staging evidence; không còn legacy loose ceiling trong active contract.
- C7 before CM0 real execution; remains accountable through CM3/CM4/go-live.
- Exact 15-case Next.js spike matrix and pinned runtime/build/cache/proxy evidence.

## 9. Scope verification

Expected PASS: 25 modules, 13 phase labels, P6A/P6B, P7 parallel, Hybrid, product-only search, applications flat; no Users CRUD, advanced auto-save, site-wide search P0, facet P0, scheduled publish P0, video upload, Inquiry Admin CRM UI or ecommerce UI.

## 10. Provenance notes

- Approved `README_VERIFY.md` contains stale wording `STATIC VALIDATION ONLY`.
- PostgreSQL 16 execution result, raw log and release manifest are evidence that execution PASS occurred.
- **Stale wording does not override execution evidence.** Do not edit the Approved snapshot in this correction round.
- Add a future doc-change backlog item under the Approved-document governance process.
- Plan-history integrity currently has timestamp-only limitation; after Pre-P0 Git restoration, create hash manifest/commit/tag without rewriting history. This is not Gate A blocker.

## 11. Evidence verdict rule

Independent verifier records command, file set/hash, search outputs and issue disposition. Any missing required contract means candidate remains incomplete. Passing author checks alone cannot satisfy Gate A; independent verification and user approval remain required.

## 12. Expected independent verdict choices

The verifier should choose a concrete pass/correction verdict and must not infer active coding/approval state. This package requests verification of the candidate only.

## 13. Round 6 author self-check summary — not independent approval

Read-only validation after assembly reported:

- explicit filename inventory: PASS (17 numbered files plus the required changelog);
- status in every file: PASS;
- forbidden normative historical references: NONE;
- counts: A=25, D=20, R=33, test layers=9, application modules=25, phases=13, FV rows=14, spike cases=15;
- high-closure marker suite: PASS;
- legacy loose resolver ceiling occurrence: NONE;
- scope guard suite: PASS;
- non-Markdown/code/migration artifacts in candidate: NONE;
- prior-directory hashes for v0.3: unchanged across this pass;
- files outside v0.4 modified since candidate creation: NONE.

These are assembly checks only. They do not replace independent final verification, runtime P0/P1 evidence or user approval.
