# 16 — V1.0 PROMOTION CHECKLIST

**Plan version:** v1.0  
**Status:** APPROVED FOR IMPLEMENTATION — PLANNING COMPLETE  
**Approval date:** 2026-07-25  
**Approval authority:** User  
**Gate A:** PASSED  
**Gate B:** NOT MET  
**Coding:** NOT AUTHORIZED UNTIL GATE B PASSES

This checklist records the completed Gate A promotion and the still-open Gate B conditions. Approval of the plan does not authorize coding before Gate B.

## Gate A checklist

- [x] No Critical.
- [x] No unresolved High.
- [x] Four Medium CF findings have exact v1.0 dispositions; two Low findings are corrected.
- [x] Source v0.4.1 standalone checks PASS.
- [x] A1–A25 and D1–D20 complete.
- [x] FV-01–FV-14 disposition independently verified.
- [x] RI-01 replay lookup precedes CAPTCHA/submission quota; unknown-commit retry and no-replay-write tests PASS.
- [x] RI-02 public/protected namespace isolation, orphan move and restore-permission tests PASS.
- [x] RI-03 committed attempt-before-send, outside-transaction provider call and crash/reconciliation tests PASS.
- [x] CF-01 reconciliation register AR-1–AR-4 and declared-divergence precedence applied.
- [x] CF-02 UUID-v4 key/transport contract and tests applied.
- [x] CF-03 stable 202 response definition and test applied.
- [x] CF-04 three-axis attempt model, one result transaction and DB tests applied.
- [x] CF-05/CF-06 enum and DTO-field naming corrections applied.
- [x] Scope audit PASS.
- [x] Claude independent final verification: `PASS WITH MINOR v1.0 EDITS`.
- [x] User explicitly approved promotion on 2026-07-25.

**Gate A: PASSED.** FV-12/FV-13 remain governed post-Git/document-process tasks and are not misrepresented as completed. Git validity and B23/B24/B25 are not Gate A conditions.

## Gate B checklist

- [ ] Pre-P0 Git restoration/approved init complete.
- [ ] Root/main/remote-or-no-remote/baseline commit/status/tag valid.
- [ ] Plan-history hash manifest/commit/tag created without rewrite.
- [ ] Supported Node/pnpm toolchain available.
- [ ] Docker/PostgreSQL 16 available.
- [ ] CI/evidence path ready.
- [ ] P0 DoR complete, including exact spike plan.

B23/B24 do not block Gate B or P0; they block P2 only. B25 blocks P3 only. HTTP 301 spike PASS is P0 DoD.

## Phase/release decisions after Gate B

- B23/B24 before P2; B25 before P3; product concurrency before P5; SMTP/CAPTCHA/worker tuning before P7; domain/base URL before relevant P8/P10 work.
- C7 before CM0 execution and through CM3/CM4/go-live.
- C5/C9 and remaining release decisions before P11/go-live.

## V1.0 assembly record

The approved assembly follows these completed rules:

1. Assembled solely from full normative v0.4.1 content plus CF-01–CF-06.
2. Pulled no normative text from v0.1–v0.4.
3. Preserved 25 modules, 13 phases, Hybrid, P6A/P6B, P7 parallel and scope boundaries.
4. Retained full decisions, strategy, phases, matrix, tests, DoR/DoD, RACI, risks, topology, content migration and dispositions.
5. Changed status only after explicit user approval.
6. Added `18_V1_0_PROMOTION_RECORD.md` and `V1_0_FILE_MANIFEST.sha256`.
7. Recorded assembly verification under `reviews/v1.0-assembly/`.

## Round 6B verification markers

- Existing-key replay lookup is before CAPTCHA and new-submission rate limit; **atomic insert remains final arbiter** for concurrent no-row requests; replay creates no Inquiry/Outbox/attempt.
- `/media/*` maps only the read-only `public-media/` root; `protected-documents/`, internal redirect, temp and quarantine have no direct Internet route.
- Every provider call has a committed `started` attempt; no database transaction remains open across SMTP; every retry creates a new attempt and unknown outcomes use reconciliation/no-blind-resend.

## Claude v1.0 markers

- Key is UUID v4, canonical lowercase hyphenated, 36 characters, at least 122-bit randomness and hard maximum 100; header/body mismatch is 400 before durable lookup.
- Stable replay is byte-identical HTTP 202 A24 `{data}` with `{request_id,message}`, no Inquiry UUID/PII/raw body/public replay marker.
- `attempt_state`, `provider_outcome` and `manual_resolution` are orthogonal; attempt result + outbox status + inquiry email status commit in one result transaction after provider I/O.
- Inquiry email status is `email_pending`/`email_sent`/`email_failed`; canonical P0 fields use `source_url` and `privacy_consent`.

**Gate B: NOT MET. Coding remains unauthorized until every Gate B checkbox passes.**
