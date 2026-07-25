# 11 — ROUND 3 ISSUE DISPOSITION

**Plan version:** v0.4 · **Trạng thái:** `PROPOSED FOR FINAL VERIFICATION` · **Ngày:** 2026-07-22

Đây là historical disposition/provenance. Nội dung implementation normative nằm trong các file chủ đề của v0.4.

## Critical

| Issue | Disposition in candidate | Current location/validation |
|---|---|---|
| CR-01 public routing/redirect/SEO topology | ACCEPTED AND MATERIALIZED | Nest authoritative + Next delivery in `01/03/04/12`; exact P0 spike; proxy routing matrix |

## High

| Issue | Disposition | Candidate correction |
|---|---|---|
| HI-01 config→DB direction | ACCEPTED | Config→logging→pool, settings runtime only |
| HI-02 Auth↔Users cycle | ACCEPTED | One-way UserAuthenticationQueryPort |
| HI-03 readiness timing | ACCEPTED, strengthened | Model B core/media/worker separation |
| HI-04 validator too late | ACCEPTED | Validators P3 before P5/P6 |
| HI-05 no real thin UI P4–P7 | ACCEPTED | Minimal Admin/Public + E2E per slice |
| HI-06 critical-path cycle | ACCEPTED | P8 before P10, P7 parallel |
| HI-07 P6 cross dependency | ACCEPTED | P6A core then P6B relations |
| HI-08 missing deploy topology | ACCEPTED | Single persistent host matrix |
| HI-09 worker lifecycle | ACCEPTED | Separate worker, drain/lease/reaper/heartbeat |
| HI-10 runtime query vs migrations conflated | ACCEPTED | D4 Kysely/runtime, D5 raw SQL migration |
| HI-11 seeds mixed | ACCEPTED | Production/dev/test pipelines separated |
| HI-12 content migration absent | ACCEPTED | CM0–CM4, C7 before CM0 |
| HI-13 rollback too simplistic | ACCEPTED | Side-effect rollback/restore/forward fix |
| HI-14 test gaps | ACCEPTED | Full nine layers + failure suites |
| HI-15 Users CRUD scope leakage | REMOVED | Explicitly excluded from P0 |
| HI-16 advanced auto-save scope leakage | REMOVED | Manual save/warning only |
| HI-17 runtime support | ACCEPTED | Node 24 preferred/22 fallback, no EOL |
| HI-18 invalid Git | ACCEPTED AS PRE-P0 GATE | Option A; R-25 Gate B only |
| HI-19 reviewer independence | ACCEPTED | Task-level RACI and fresh integration review |
| HI-20 concurrency beyond worker | ACCEPTED | Slug/product/replace-set/media/migration races |
| HI-21 API compatibility/client freshness | ACCEPTED | D18, CI and mixed-version tests |

## Medium

| Issue | Disposition | Candidate correction |
|---|---|---|
| ME-01 module count | ACCEPTED | Exactly 25 application modules |
| ME-02 P8 search leakage | ACCEPTED | Search product-only in P5; P8 adds no search |
| ME-03 missing nav/home/SEO edges | ACCEPTED | Full dependency table |
| ME-04 taxonomy rich detail leakage | ACCEPTED | P0 taxonomy list landing only |
| ME-05 decision staging | ACCEPTED | Phase-only staging; B23/B24/B25 do not block gates/P0 |
| ME-06 migration registry | ACCEPTED, strengthened | History/checksum/advisory lock/prefix tests |
| ME-07 evidence location | ACCEPTED | Evidence outside plan version directories |
| ME-08 performance budget | ACCEPTED | Numeric preliminary budgets and tuning phases |

## Low/observations

The historical static-evidence wording remains a governed provenance backlog item; current execution evidence is recognized without editing Approved files. Historical plan immutability will gain a hash manifest after Pre-P0 Git restoration. No historical issue disposition grants plan approval.
