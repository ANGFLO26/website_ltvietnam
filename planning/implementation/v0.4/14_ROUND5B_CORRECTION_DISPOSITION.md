# 14 — ROUND 5B CORRECTION DISPOSITION

**Plan version:** v0.4 · **Trạng thái:** `PROPOSED FOR FINAL VERIFICATION` · **Ngày:** 2026-07-22

Historical disposition/provenance for the prior correction set. Normative implementation content is fully materialized in the topical v0.4 files.

## Decisions D17–D20

| Decision | Candidate disposition | Materialized correction | Validation location |
|---|---|---|---|
| D17 Next-delivery redirect | APPLIED | Nest authoritative; Next exact 301 before render; exact spike matrix | `01`, `04` P0/P4, `06`, `12` |
| D18 API compatibility | APPLIED | Additive v1, breaking detection, client freshness, mixed-version, expand/contract | `01`, `04`, `06`, `07` |
| D19 durable fingerprint | APPLIED AND STRENGTHENED | Global atomic/versioned contract, timeout/legacy/race cases | `01` §C; P7/test/risk files |
| D20 public media | APPLIED AND STRENGTHENED | Semantics A, purge/cache/consistency/restore | `01` §D; P3/topology/tests/risk |

## Fourteen prior correction themes

| # | Theme | Candidate disposition | Current implementation-plan result |
|---:|---|---|---|
| 1 | Gate separation | APPLIED | Gate A independent of Git; Gate B Pre-P0 only |
| 2 | B23–B26 staging | APPLIED | B23/B24 P2 only, B25 P3 only |
| 3 | Exact 301 | APPLIED | Exact status/no HTML/pre-stream/cache/failure matrix |
| 4 | Media routing | APPLIED | Public media separate from controlled documents |
| 5 | Migration materialization CASE B | APPLIED AND STRENGTHENED | Per-file/prefix/failure/history/lock acceptance |
| 6 | Health split | APPLIED AND STRENGTHENED | Model B core/media/worker |
| 7 | Compatibility D18 | APPLIED | Tooling and DoD across deploy phases |
| 8 | Idempotency D19 | APPLIED AND STRENGTHENED | Atomic global contract |
| 9 | Phase count | APPLIED | 13 labels including P6A/P6B |
| 10 | Product-only search | APPLIED | P5 only; no P8/site-wide scope |
| 11 | Numeric performance | APPLIED | Resolver corrected to <200/350/250–400 |
| 12 | CM2 production guard | APPLIED | 12 mandatory controls |
| 13 | Outbox reconciliation | APPLIED AND STRENGTHENED | Durable attempts/classification/no-blind-resend |
| 14 | Disposition completeness | APPLIED | This provenance plus final FV disposition in `15` |

Prior status claims do not approve this candidate. Independent final verification remains required.
