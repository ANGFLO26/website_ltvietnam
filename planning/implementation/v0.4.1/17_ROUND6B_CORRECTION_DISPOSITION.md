# 17 — ROUND 6B CORRECTION DISPOSITION

**Plan version:** v0.4.1 · **Trạng thái:** `PROPOSED FOR FINAL VERIFICATION` · **Ngày:** 2026-07-25

Round 6B only corrects the three residual contracts below. This file does not approve the plan or promote it.

| Residual issue | Severity | Disposition | Files changed | Validation |
|---|---|---|---|---|
| RI-01 Idempotency replay ordering | HIGH | **APPLIED** | `00`,`01`,`03`,`04`,`05`,`06`,`07`,`09`,`10`,`15`,`16`, changelog, `17` | **PASS:** existing-key lookup before CAPTCHA/submission quota; expired-CAPTCHA/exhausted-quota replay; atomic unique final arbiter; retriable lookup failure; no replay write; seven tests present |
| RI-02 Public/protected storage boundary | HIGH | **APPLIED** | `00`,`01`,`03`,`04`,`05`,`06`,`07`,`08`,`09`,`10`,`12`,`15`,`16`, changelog, `17` | **PASS:** both roots; proxy not volume root; protected direct denial; traversal/symlink/dotfile/temp/quarantine tests; orphan move; namespace/permission restore |
| RI-03 Durable attempt lifecycle | HIGH | **APPLIED** | `00`,`01`,`03`,`04`,`05`,`06`,`07`,`08`,`09`,`10`,`15`,`16`, changelog, `17` | **PASS:** committed attempt before send; no call on commit failure; no DB transaction across SMTP; states/crash/DB-down/reaper/new-attempt/manual-audit/no-blind-resend tests |

## RI-01 normative closure

Replay resolution is a durable read path before CAPTCHA and new-submission quota. Same fingerprint returns the stable original result; different fingerprint returns 409; neither path performs business write. Only a missing key reaches guards and atomic insert. Concurrent early misses still resolve through the global unique constraint. Unknown-commit retry reuses the key and does not depend on an old CAPTCHA token.

## RI-02 normative closure

`/media/*` maps read-only only to `public-media/`, never the volume root. `protected-documents/`, temp and quarantine are outside public served roots. Protected delivery is Nest-authorized; direct/internal/guessed paths, traversal, symlink escape and dotfiles are denied. Orphans move outside served root and caches are invalidated. Restore preserves namespaces and permissions.

## RI-03 normative closure

Every provider call requires a committed `started` attempt first. Provider I/O occurs outside DB transactions; accepted/failed/unknown and business-status updates use a subsequent transaction. Each retry adds an attempt. Crash/ambiguous/DB-down outcomes preserve stable Message-ID and enter reconciliation; unknown outcomes are never blindly resent. Manual resolution records actor, time and reason.

## Author validation result

Read-only validation after assembly:

- artifact inventory 19/19, version/status 19/19 and Markdown-only: PASS;
- RI-01 core markers, seven tests and all required cross-file references: PASS;
- RI-02 namespace markers, security/restore tests and all required cross-file references: PASS;
- RI-03 lifecycle markers, nine reconciliation cases and all required cross-file references: PASS;
- inventory wording, file 17 existence and no v1.0 output: PASS;
- v0.4 SHA-256 set unchanged; files outside v0.4.1 modified during the pass: NONE.

This author validation is not independent final verification and does not approve or promote the plan.
