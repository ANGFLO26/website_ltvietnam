# 18 — V1.0 PROMOTION RECORD

**Plan version:** v1.0  
**Status:** APPROVED FOR IMPLEMENTATION — PLANNING COMPLETE  
**Approval date:** 2026-07-25  
**Approval authority:** User  
**Gate A:** PASSED  
**Gate B:** NOT MET  
**Coding:** NOT AUTHORIZED UNTIL GATE B PASSES

## 1. Promotion authority

- **Source candidate:** `planning/implementation/v0.4.1/`, 19 Markdown artifacts.
- **Independent verifier:** Claude, Round 7.
- **Independent verdict:** `PASS WITH MINOR v1.0 EDITS`.
- **Findings:** Critical 0, High 0, Medium 4, Low 2.
- **User approval:** explicit promotion approval received in the current conversation on 2026-07-25.
- **Promotion result:** standalone Implementation Plan v1.0 assembled from v0.4.1 plus exactly CF-01–CF-06.

## 2. Applied Claude deltas

| Delta | Finding | Applied contract | Primary locations | Result |
|---|---|---|---|---|
| 1 | CF-01 | Approved-document reconciliation register AR-1–AR-4, engineering rationale, governance backlog and declared-divergence precedence | `01` §B-bis; `10` §§2/10; `15`; `16` | PASS |
| 2 | CF-02 | UUID-v4 key format/entropy/length, pre-lookup validation, byte-exact comparison and header/body transport | `01` §§C.1/C.6; `05`; `06`; `10`; `15`; `16` | PASS |
| 3 | CF-03 | Original stable 202 `{request_id,message}` result; byte-identical, no Inquiry UUID/PII/raw response body/public replay marker | `01` §§C.4/C.6; `05`; `06`; `10`; `15`; `16` | PASS |
| 4 | CF-04 | Orthogonal `attempt_state`/`provider_outcome`/`manual_resolution`; one result transaction; two DB tests | `01` §C.7; `03`–`10`; `15`–`17` | PASS |
| 5 | CF-05 | Inquiry email enum corrected to `email_pending`/`email_sent`/`email_failed`; outbox enum unchanged | `01` A9 | PASS |
| 6 | CF-06 | Canonical DTO names aligned to `source_url` and `privacy_consent`; non-P0 `location`/`company_tax_code` excluded from the accepted field list | `01` §§C.2/C.3; related tests/checks | PASS |

No delta changes architecture, Approved schema, URL scope, module count, phase count, Hybrid strategy, P6A/P6B, P7 parallel or product-only search.

## 3. Assembly scope

All 19 source artifacts were copied into v1.0. Every Markdown header was promoted to v1.0 and records the approval authority/date and gate state. Normative delta edits were applied to:

`00`, `01`, `03`, `04`, `05`, `06`, `07`, `08`, `09`, `10`, `11`, `14`, `15`, `16`, `17`, and `PLAN_CHANGELOG.md`.

`02`, `12` and `13` retain their normative content from v0.4.1 with only the required v1.0 approval header. This record is new, and `V1_0_FILE_MANIFEST.sha256` is the final checksum manifest.

## 4. Gate result

- **Gate A:** PASSED after Claude independent verification, exact CF-01–CF-06 assembly deltas and explicit user approval.
- **Gate B:** NOT MET. Git is not yet valid and the toolchain, Docker/PostgreSQL 16, CI/evidence path and P0 DoR are not yet verified.
- **Coding:** NOT AUTHORIZED UNTIL GATE B PASSES.
- B23/B24 remain P2-only decisions and B25 remains P3-only; none is a Gate A or Gate B blocker.

## 5. Mutation boundary

This promotion round:

- created no source code;
- created no migration SQL;
- performed no Git mutation;
- performed no cleanup, archive, delete or move of historical plan directories;
- edited no Approved document under `doc/`;
- edited no v0.4.1 or older plan/review artifact.

Read-only Git inspection and a future cleanup plan are recorded under `planning/implementation/reviews/v1.0-assembly/`.

## 6. Validation result

- Inventory: 21 artifacts — 19 numbered Markdown files `00`–`18`, `PLAN_CHANGELOG.md`, and one `.sha256` manifest.
- Headers/status: all 20 Markdown files carry v1.0 approval metadata, Gate A PASSED, Gate B NOT MET and the coding prohibition.
- Counts: A=25, D=20, R=33, C=9, FV=14, RI=3, modules=25, phase labels=13, test layers=9, Next spike cases=15.
- CF-01–CF-06: PASS.
- Scope guard suite: PASS.
- Source v0.4.1 SHA-256 preservation: PASS.
- Manifest verification: PASS for every one of the 20 hashed artifacts.

Detailed commands and results are recorded in `reviews/v1.0-assembly/V1_0_ASSEMBLY_REPORT.md` and `V1_0_DELTA_VERIFICATION.md`.

## 7. Final checksum manifest

`V1_0_FILE_MANIFEST.sha256`

The manifest intentionally excludes itself, uses relative paths and stable filename ordering, and includes verification commands for Windows PowerShell and POSIX shells.
