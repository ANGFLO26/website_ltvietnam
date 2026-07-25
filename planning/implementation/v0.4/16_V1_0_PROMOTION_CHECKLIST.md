# 16 — V1.0 PROMOTION CHECKLIST

**Plan version:** v0.4 · **Trạng thái:** `PROPOSED FOR FINAL VERIFICATION` · **Ngày:** 2026-07-22

This is a future promotion checklist. Round 6 does not create v1.0 or change active status.

## Gate A checklist

- [ ] No Critical.
- [ ] No unresolved High.
- [ ] Medium dispositions independently accepted.
- [ ] v0.4 standalone checks PASS.
- [ ] A1–A25 and D1–D20 complete.
- [ ] FV-01–FV-14 disposition verified.
- [ ] Scope audit PASS.
- [ ] Independent final verification PASS.
- [ ] User explicitly approves promotion.

FV-12/FV-13 deferred governance tasks must have the stated gate/backlog and must not be misrepresented as completed. Git validity and B23/B24/B25 are not Gate A conditions.

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

## V1.0 assembly rule

Only after Gate A criteria pass:

1. Copy/assemble solely from full normative v0.4 content.
2. Do not pull normative text from historical draft directories.
3. Preserve 25 modules, 13 phases, Hybrid, P6A/P6B, P7 parallel and scope boundaries.
4. Include full decisions, strategy, phases, module matrix, tests, DoR/DoD, RACI, risks, topology, content migration and verified disposition.
5. Change status only after user approval.
6. Generate checksum/file manifest for assembled baseline.
7. Independent reviewer verifies assembled content matches approved candidate and has no missing file.

No v1.0 directory/file is created by this candidate pass.
