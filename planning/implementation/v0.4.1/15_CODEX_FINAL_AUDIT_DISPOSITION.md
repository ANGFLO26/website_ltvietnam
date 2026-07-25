# 15 — CODEX FINAL AUDIT DISPOSITION

**Plan version:** v0.4.1 · **Trạng thái:** `PROPOSED FOR FINAL VERIFICATION` · **Ngày:** 2026-07-25

Disposition values: APPLIED, PARTIALLY APPLIED, REJECTED, DEFERRED WITH GATE, CLOSED. Validation describes what an independent verifier must confirm; it is not self-approval.

| Issue | Severity | Disposition | Correction | File/Section | Validation |
|---|---|---|---|---|---|
| FV-01 | High | **APPLIED** | Global D19; exact fingerprint; durable replay lookup before CAPTCHA/submission quota; replay writes nothing; atomic new-key conflict/read remains final arbiter; timeout/legacy tests | `01` §C; `04` P7; `05`; `06`; `07`; `09` R-09; `10`; `16` | Commit/response-lost with expired CAPTCHA and exhausted quota replays; different payload 409 pre-CAPTCHA; concurrent no-row lookup yields one Inquiry/Outbox |
| FV-02 | High | **APPLIED** | Model B core/media/worker readiness; proxy uses core; dependency-down 202 | `03` §2; `04` P2/P3/P7; `05`; `06`; `07`; `09` R-33; `10`; `12` | PG-up/storage-SMTP-worker-down matrix and route 503/core 202 |
| FV-03 | High | **APPLIED** | Semantics A plus physical boundary: `/media/*` only read-only `public-media/`; `protected-documents/` and private paths outside served root; orphan move+cache invalidation; namespace restore | `01` §D; `03`; `04` P3/P6A/P11; `05`; `06`; `07`; `09` R-11/R-19; `10`; `12`; `16` | Protected guessed/direct URL, traversal, symlink, dotfile/temp/quarantine denied; proxy not volume root; orphan old path revoked; permissions restored |
| FV-04 | High | **APPLIED** | Per-file/prefix/down/failure/history/non-transactional/concurrent migration acceptance | `04` P1; `06`; `08`; `09` R-05; `10` | Confirm all 12 acceptance items and necessary-not-sufficient statement |
| FV-05 | High | **APPLIED** | Candidate is standalone: full decisions, strategies, tests, risks and execution governance inline | `01`,`02`,`04`,`06`,`07`,`08`,`09` | Forbidden normative-reference search NONE; content/count checks PASS |
| FV-06 | Medium | **APPLIED** | One staging rule; B23/B24 P2 only; B25 P3 only | `00`,`01` §E, `07` §§3/8, `16` | No phrase that these decisions block Gate A/B/P0 |
| FV-07 | Medium | **APPLIED** | Option A Pre-P0; Gate B verifies; renamed P0; spike PASS P0 DoD | `00`; `04` Pre-P0/P0; `07`; `08`; `16` | Git remediation absent from P0 scope; no spike-PASS start condition |
| FV-08 | Medium | **APPLIED** | Attempt-start commits before provider call; no send on commit failure; network call outside DB transaction; result transaction; state/crash/reaper/new-attempt/manual-audit lifecycle; ≥90d retention/no blind resend | `01` D6/§C.7; `04` P7/P11; `05`; `06`; `07`; `08`; `09` R-29; `10`; `16` | Verify attempt-before-send, no transaction across SMTP, crash/DB-down after accept, new attempt number, actor/time/reason and no-blind-resend |
| FV-09 | Medium | **APPLIED** | Resolver p95 <200, ceiling 350, tuning 250–400 only with evidence | `04` P8; `06` §14; `12` §6 | Legacy loose ceiling absent; component-level latency evidence defined |
| FV-10 | Medium | **APPLIED** | C7 assigned before CM0 real execution and remains release blocker/signatory | `01` §F; `04` Pre/CM/P11; `07`; `08`; `13` | Search deadline/roles and CM3/CM4/go-live signatures |
| FV-11 | Medium | **APPLIED** | Exact Next/router/runtime/render/stream/build/proxy/cache evidence and 15 tests | `04` P0; `06`; `12` §8 | Check all pins and 15 numbered cases; PASS remains P0 DoD |
| FV-12 | Low | **DEFERRED WITH GATE** | Preserve history now; after Pre-P0 Git restoration generate hash manifest/commit/tag without rewrite | `04` Pre-P0; `10` §10; `16` | Governance task after Git restoration; not Gate A blocker |
| FV-13 | Low | **DEFERRED WITH GATE** | Record stale STATIC wording; execution result/raw PG16 log/release manifest prevail; Approved change backlog | `09` R-22; `10` §10; `16` | Provenance note present; no Approved file edited; backlog gated by doc governance |
| FV-14 | Low | **APPLIED** | Correct history inventory: v0.2 has 15 files | `PLAN_CHANGELOG` | Search changelog for exact count 15; old changelog untouched |

## Summary

| Severity | Total | Applied | Deferred with gate | Remaining undispositioned |
|---|---:|---:|---:|---:|
| High | 5 | 5 | 0 | 0 |
| Medium | 6 | 6 | 0 | 0 |
| Low | 3 | 1 | 2 | 0 |
| **Total** | **14** | **12** | **2** | **0** |

Independent verification may change a disposition if file evidence fails. Candidate is not promoted by this table.
