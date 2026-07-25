# CLAUDE FINAL VERIFICATION — IMPLEMENTATION PLAN v0.4.1

**Verifier:** Claude (independent final verifier, Round 7)
**Candidate:** `planning/implementation/v0.4.1/`
**Approved design:** `doc/`
**Date:** 2026-07-25
**Mode:** READ-ONLY audit. No plan file modified, no v1.0 created, no cleanup/archive, no source code, no migration SQL, no Git mutation, no Approved-document edit.

> Codex authored v0.4 and v0.4.1. No Codex self-check result is used as evidence in this report. Every assertion below was re-derived by reading the actual files and, where the plan makes a claim about Approved design, by reading the Approved document directly.

---

## A. Executive verdict

**`PASS WITH MINOR v1.0 EDITS`**

- Residual **Critical: 0**
- Residual **High: 0**
- New findings: **6** (4 Medium, 2 Low), IDs `CF-01`–`CF-06`
- All six are closable with exact clarification text applied during v1.0 assembly. **No v0.4.2 correction candidate is required.**

The candidate is internally coherent, standalone, scope-clean, and the fourteen FV corrections plus the three RI corrections are genuinely materialized in the files — not merely asserted in a disposition table. The three clarification candidates raised for Round 7 (FC-01, FC-02, FC-03) are all real gaps, but all three are **Medium**, and two of them are already answered by the Approved design itself, which the plan simply failed to restate.

The single most consequential finding is **CF-01**, which is not one of the three nominated candidates: the plan's own source-of-truth precedence ranks Backend/API above the plan, and three deliberate refinements in v0.4.1 contradict `doc/06`. Because those divergences are nowhere declared, a literal application of the plan's precedence rule would resolve **against** the plan and silently reinstate the exact RI-01 and FV-02 defects that this correction round closed. The remedy is a declaration/governance register, not a redesign, so it does not raise to High — but v1.0 must not be assembled without it.

---

## B. Files inspected

### Candidate — all 19 read in full

| # | File | Bytes |
|---:|---|---:|
| 1 | `00_IMPLEMENTATION_PLAN_OVERVIEW.md` | 6,484 |
| 2 | `01_LOCKED_DECISIONS_AND_OPEN_QUESTIONS.md` | 23,948 |
| 3 | `02_STRATEGY_OPTIONS_AND_RECOMMENDATION.md` | 5,486 |
| 4 | `03_MODULE_DEPENDENCY_GRAPH.md` | 6,374 |
| 5 | `04_PHASES_MILESTONES_AND_CRITICAL_PATH.md` | 19,788 |
| 6 | `05_MODULE_IMPLEMENTATION_MATRIX.md` | 6,263 |
| 7 | `06_TEST_AND_QUALITY_STRATEGY.md` | 15,041 |
| 8 | `07_DEFINITION_OF_READY_AND_DONE.md` | 5,554 |
| 9 | `08_AI_COLLABORATION_AND_FILE_OWNERSHIP.md` | 5,213 |
| 10 | `09_RISK_REGISTER.md` | 10,530 |
| 11 | `10_FINAL_VERIFICATION_PACKAGE.md` | 7,264 |
| 12 | `11_ROUND3_ISSUE_DISPOSITION.md` | 3,374 |
| 13 | `12_REQUEST_ROUTING_AND_DEPLOYMENT_TOPOLOGY.md` | 8,488 |
| 14 | `13_CONTENT_MIGRATION_WORKSTREAM.md` | 4,441 |
| 15 | `14_ROUND5B_CORRECTION_DISPOSITION.md` | 2,365 |
| 16 | `15_CODEX_FINAL_AUDIT_DISPOSITION.md` | 4,518 |
| 17 | `16_V1_0_PROMOTION_CHECKLIST.md` | 3,125 |
| 18 | `17_ROUND6B_CORRECTION_DISPOSITION.md` | 3,262 |
| 19 | `PLAN_CHANGELOG.md` | 3,157 |

### Approved design — read for cross-verification

- `doc/01_PHAM_VI_CHUC_NANG_VA_MVP.md` — scope inclusions/exclusions
- `doc/05_DATABASE_SCHEMA_POSTGRESQL.md` — `ltv.inquiries`, `ltv.inquiry_outbox`, `ltv.media`, baseline 001–070
- `doc/06_KIEN_TRUC_BACKEND_VA_API.md` — public/admin API surface, Inquiry contract (PHẦN VII), health endpoints
- `doc/09_ADR_QUYET_DINH_KIEN_TRUC.md` — ADR index, ADR-001, ADR-003
- `doc/` directory listing, `doc/archive/`, `doc/verify/`

### History — listing/metadata only, not modified

`planning/implementation/v0.1/`, `v0.2/`, `v0.3/`, `v0.4/`, `reviews/codex-final-v0.3/`, `reviews/codex-round3/`

### Commands executed (all read-only)

```
ls -la planning/implementation/v0.4.1/
ls planning/implementation/v0.4/  |  ls planning/implementation/
ls -la --time-style=+%Y-%m-%d  (v0.4, v0.4.1, doc/*.md)
ls v0.4.1 | wc -l ; ls v0.4.1 | grep -v '\.md$' | wc -l
grep -rniE "READY TO CODE|PLANNING COMPLETE|IMPLEMENTATION STARTED|APPROVED" v0.4.1/
grep -rl "v0\.4\.1" v0.4.1/ | wc -l ; grep -rl "PROPOSED FOR FINAL VERIFICATION" v0.4.1/ | wc -l
grep -rnoE "v0\.(1|2|3|4)\b" v0.4.1/
grep -rniE "giữ như|xem v0|chi tiết ở draft|như draft|see v0\.|as in v0\." v0.4.1/
grep -cE "^\| A[0-9]+ \|" / "^\| D[0-9]+ \|" / "^\| R-[0-9]+ \|" / "^\| C[0-9] \|" / "^\| FV-[0-9]+ \|"
grep -n -A40 "CREATE TABLE ltv.inquiries" doc/05_...
grep -n -A22 "CREATE TABLE ltv.media" doc/05_...
grep -n -B3 -A30 "POST.*inquiries" doc/06_...
grep -n -A25 "ADR-003" doc/09_...
git status / git log        → fails: "not a repository"
ls -la .git                 → empty directory
```

---

## C. Integrity and standalone result

### C.1 Inventory — **PASS**

`ls | wc -l` = **19**. `ls | grep -v '\.md$' | wc -l` = **0**.

Composition matches the stated contract exactly: 17 numbered files `00`–`16`, plus `17_ROUND6B_CORRECTION_DISPOSITION.md`, plus `PLAN_CHANGELOG.md`. The changelog (`PLAN_CHANGELOG.md:13`) states the arithmetic explicitly and it checks out: 17 numbered + 1 changelog = 18 pre-existing, + file `17` = 19.

### C.2 Version and status — **PASS**

`grep -rl "v0.4.1"` = 19/19. `grep -rl "PROPOSED FOR FINAL VERIFICATION"` = 19/19. Every file carries both in its header line (line 3, except `00` which uses lines 3–6).

### C.3 No premature-approval wording — **PASS**

Search for `APPROVED`, `READY TO CODE`, `PLANNING COMPLETE`, `IMPLEMENTATION STARTED` as a status claim returns nothing. The only occurrences of "APPROVED" are as a disposition value in tables (`15:5` defines `APPLIED, PARTIALLY APPLIED, REJECTED, DEFERRED WITH GATE, CLOSED`) and in "Approved design/Approved docs" as a noun for the `doc/` baseline. `07:86-88` and `PLAN_CHANGELOG.md:54-56` both affirmatively state the candidate has passed neither gate.

### C.4 No code / SQL / binary — **PASS**

All 19 files are Markdown. No `.sql`, no source file, no binary. `01:69`, `01:168`, `04:149`, `05:55` and `13:43` each state explicitly that this round creates no SQL and that new schema work is deferred to `IMPLEMENTATION MIGRATION 071+`.

### C.5 No normative dependency on v0.1–v0.4 — **PASS**

`grep -rniE "giữ như|xem v0|chi tiết ở draft|như draft|see v0\.|as in v0\."` returns **zero hits**.

Every `v0.x` token in the candidate falls into one of two permitted classes:
- the file's own header version string `v0.4.1` (matched as `v0.4` by the regex), present once per file;
- provenance/disposition context in `11`, `14`, `15`, `17`, `16:46`, `10:100-101` and `PLAN_CHANGELOG.md`.

No normative sentence anywhere instructs an implementer to consult a historical directory. `00:10` states the rule affirmatively.

### C.6 v0.4 preserved — **PASS (timestamp evidence only)**

`planning/implementation/v0.4/` contains 18 files, all with mtime `2026-07-22`, directory mtime `2026-07-22 03:09`. The candidate directory is entirely `2026-07-25`. No v0.4 file bears a `2026-07-25` timestamp.

**Stated limitation, and I do not overstate this:** no SHA-256 baseline manifest for v0.4 exists in the repository, so I cannot verify content equality — only that no file was written after v0.4.1 assembly began. `10:100` and `17:34` claim "v0.4 SHA-256 set unchanged"; I can corroborate that claim by filesystem metadata but I cannot independently reproduce it, because the reference hash set was never persisted. This matches the known limitation the plan itself records at `04:14` and `10:75`. It is not a Gate A blocker; it is a reason to create the hash manifest as soon as Git is restored.

### C.7 Approved docs unmodified — **PASS**

`doc/*.md` mtimes: 8 files at `2026-07-21`, 3 files at `2026-07-22`. All precede v0.4.1 assembly. `10:73` explicitly forbids editing the Approved snapshot in this round, and no edit occurred.

### C.8 Git state — read-only check

`git status` and `git log` both fail with `fatal: not a git repository`. Direct cause established: **`.git` exists but is an empty directory** (`ls -la .git` → only `.` and `..`).

This is first-hand confirmation of R-25 (`09:33`, status `GATE B BLOCKER`) and of the Pre-P0 prerequisite at `04:12` ("xử lý `.git` rỗng"). The plan's characterization is accurate and its remediation placement — user/authorized operator, before Gate B, outside P0 scope — is correct. **Not a Gate A blocker** per `00:47`, `07:76`, `16:22`.

### C.9 Standalone content — **PASS**

Independently re-derived counts, not taken from any disposition table:

| Content | Required | Counted | Source of count | Result |
|---|---:|---:|---|:--:|
| Locked decisions A1–A25 | 25 | **25** | `01` §A table rows | PASS |
| User-confirmed D1–D20 | 20 | **20** | `01` §B table rows | PASS |
| Risks R-01–R-33 | 33 | **33** | `09` table rows | PASS |
| Business decisions C1–C9 | 9 | **9** | `01` §F table rows | PASS |
| FV disposition rows | 14 | **14** | `15` table rows | PASS |
| Application modules | 25 | **25** | `03` §4 numbered table | PASS |
| Phase labels | 13 | **13** | `04:5` and `00:23` | PASS |
| Test layers | 9 | **9** | `06` §§1–9 headings | PASS |
| Spike matrix cases | 15 | **15** | `12` §8 numbered list | PASS |
| RI disposition rows | 3 | **3** | `17` table rows | PASS |

Required content confirmed present and materialized inline:

- **Open decisions / business decisions** — `01` §E (8 rows with deadline/owner/status/blocks), §F (C1–C9).
- **Foundation First / Vertical Slice / Hybrid comparison** — `02` §§1–2, a full 10-criterion comparison table, plus §6 switch conditions. Not a stub.
- **P0–P11 full phase spec** — `04`. Every phase carries Input, Output, Tests, Acceptance/DoD, Evidence, Rollback, Out-of-scope, Owner/Reviewer. Verified individually for Pre-P0, P0, P1, P2, P3, P4, P5, P6A, P6B, P7, P8, P9, P10, P11.
- **Nine-layer test strategy** — `06` §§1–9, plus classification `06` §11, evidence rules §12, phase matrix §13, numeric budgets §14.
- **Gate A / Gate B** — `00` §4, `07` §§7–8, `16`.
- **DoR/DoD** — `07` §§1–5, general and phase-specific.
- **RACI / file ownership** — `08` §§1–3, 13-row RACI table.
- **Request/deployment topology** — `12` §§1–2, 13-row routing matrix.
- **Content migration CM0–CM4** — `13` §2, 5-stage table with acceptance and owner/reviewer.
- **FV-01–FV-14 disposition** — `15`, with per-issue file/section pointers.
- **RI-01–RI-03 disposition** — `17`.

**Conclusion: FV-05 (standalone) is genuinely satisfied.** An implementer can execute from v0.4.1 alone.

---

## D. FV-01 – FV-14 verification

Verified against file content, not against the `15` disposition table.

### FV-01 / D19 — **PASS**

| Required element | Evidence | Result |
|---|---|:--:|
| Global `UNIQUE(idempotency_key)` | `01:18` (A8), `01:68`, `10:26`; matches Approved `doc/05:775` `idempotency_key VARCHAR(100) NOT NULL UNIQUE` | PASS |
| Durable fingerprint + version via 071+ | `01:69-70` — `request_fingerprint`, `request_fingerprint_version`, SHA-256 lowercase hex 64 or `bytea`, first version `v1` | PASS |
| Exact canonical field set | `01:73-96` — 16 ordered fields, plus explicit exclusion list | PASS (naming gap → CF-06) |
| UTF-8 / NFC / stable JSON / SHA-256 | `01:100-112` — encoding, NFC, whitespace, CRLF, email domain-lowercase, phone E.164, UUID lowercase, locale enum, boolean literals, null/missing/empty distinction, deterministic key order, SHA-256 | PASS |
| Existing-key lookup before CAPTCHA/quota | `01:122-124` Step 2; `03:48`; `04:146`; `06:25`, `06:47`; `07:58`; `16:58` | PASS |
| Same fingerprint → replay | `01:125` | PASS (result undefined → CF-03) |
| Different fingerprint → 409 | `01:126` — `409 IDEMPOTENCY_KEY_REUSED`, before CAPTCHA, no old-payload disclosure | PASS |
| Atomic insert remains final arbiter | `01:133-139` Step 4, esp. `01:139` "Early lookup chỉ tối ưu replay resolution và không thay thế unique constraint"; `16:58` | PASS |
| Exactly one Inquiry + one Outbox | `01:137`, `01:141`, `06:111` | PASS |
| Unknown commit retry | `01:147` — retry does not depend on old CAPTCHA token, not refused by new-submission quota; lookup failure → retriable safe error, no new key, no write path | PASS |
| Legacy NULL / version policy | `01:149-151` — nullable → dual-write → conditional backfill → validate → constrain; `legacy-unresolved` quarantine; version mismatch never compared raw | PASS |
| Replay creates no Inquiry/Outbox/attempt | `01:125`, `01:127`, `06:114`, `05:39`, `17:15` | PASS |

### FV-02 — **PASS**

`/health/ready` = config + PostgreSQL only: `03:24`, `04:66`, `05:12`, `12:31`. Separate `/health/ready/media` (`03:25`, `12:32`) and `/health/worker` (`03:26`, `12:33`). `12:31` states the endpoint "never checks storage/SMTP/worker/CDN/backlog". Degraded matrix at `12:45-47` and `03:32-37`: PG up + storage/SMTP/worker down → core ready PASS, Inquiry 202 after commit, DB-only catalogue available, media routes controlled 503, operational DEGRADED, core API retained in traffic. `03:30` explicitly forbids using the media probe to evict Core API. Negative assertion is testable: `04:68` requires asserting storage/SMTP/worker are *not queried* by core readiness. → See **CF-01(b)** for the undeclared divergence from `doc/06:119`.

### FV-03 / D20 — **PASS**

Semantics A PUBLIC-UNTIL-PURGE `01:196`. Namespace tree `01:199-205` and `12:53-59`. `/media/*` maps only read-only `public-media/`, never volume root: `01:208`, `12:62`, `12:16`, `03:50`, `03:109`. `protected-documents/` outside public root with no direct public URL and a non-Internet-routable internal redirect: `01:209`, `12:64`, `12:126`. Traversal/symlink/dotfile/temp/quarantine denied: `01:208`, `12:63`, `04:82`, `06:81`. Orphan moved out of served root with cache invalidation, report-only explicitly forbidden: `01:216`, `12:71`. 30-day preliminary purge `01:212`, `12:68`. Bounded 24-hour cache, unbounded immutable cache forbidden: `01:214`, `12:69`. Same-cutoff DB+media restore preserving namespace and permissions: `01:217`, `12:72`, `07:66`. Namespace/permission consistency scans: `05:47`, `06:37`, `04:86`.

### FV-04 — **PASS**

`04:38-51` carries all twelve acceptance criteria: 70 up/down pairs as a P1 *deliverable* (`04:36`, `05:46`, `07:51`), per-migration execution (2), atomic history (3), prefix validity and N→N+1 (4), reviewer-audited up N ↔ down N mapping (5), rollback/reapply for N=1..70 (6), failure injection (7), non-transactional DDL inventory including `CREATE INDEX CONCURRENTLY` (8), nine history negative cases with fail-closed (9), advisory-lock concurrent runners (10), aggregate up/down/up equivalence (11). The required sentence is present verbatim at `04:51` and `06:127`: **"Aggregate equivalence is necessary but not sufficient."**

### FV-05 — **PASS.** See §C.9.

### FV-06 – FV-11 — **PASS**

- FV-06: `01:233`, `07:35`, `16:34`, `00:55` — B23/B24 → P2 only, B25 → P3 only, no gate coupling.
- FV-07: `04:7-15` Pre-P0 owned by user/operator; P0 renamed "Repository Verification, Tooling & Technical Bootstrap" (`04:17`); `04:27` and `07:18` state spike PASS is P0 DoD, not a start condition; `04:30` puts Git restoration out of P0 scope.
- FV-08: `01:166-192`, `04:150-158`. See §G.
- FV-09: `04:171`, `06:207`, `12:90-92` — p95 <200 ms, ceiling 350 ms, tuning only 250–400 ms with staging evidence. `06:212` states all looser legacy ceilings are removed from the active contract; I searched and found no surviving looser value.
- FV-10: `01:245` (C7 `Before CM0 execution thực`), `13:7-18`, `07:32-33`, `08:30`.
- FV-11: `12:100-122` — pinned Next version, lock hash, Node, router, runtime, render/stream/cache mode, production build, proxy config checksum, plus exactly 15 numbered cases.

### FV-12 / FV-13 — **DEFERRED WITH GATE, correctly governed**

FV-12 (`04:14`, `10:75`, `16:28`): plan-history hash manifest after Git restoration, no rewrite. Explicitly not a Gate A blocker. FV-13 (`09:30` R-22, `10:71-74`): stale `STATIC VALIDATION ONLY` wording in Approved `README_VERIFY.md` recorded as provenance; execution evidence prevails; change routed to Approved-document governance backlog; no Approved file edited. Both deferrals name their gate, so neither is a disguised open issue. `16:22` guards against misrepresenting them as complete.

**Note:** FV-13 is the exemplar for how CF-01 should be handled — the mechanism already exists in this plan.

### FV-14 — **PASS.** `PLAN_CHANGELOG.md:46` states v0.2 inventory was 15 files; prior directories untouched.

---

## E. RI-01 verification — replay ordering

**Result: PASS.**

### Flow, in the required order

| Step | Requirement | Evidence |
|---|---|---|
| 1 | Parse / normalize / fingerprint, no business write | `01:116-120` |
| 2 | Durable existing-key lookup before CAPTCHA and new-submission rate limit | `01:122-124` |
| 3 | Existing + same fingerprint → replay, no CAPTCHA re-run, no quota consumption, no Inquiry/Outbox/attempt | `01:125` |
| 4 | Existing + different fingerprint → 409 before CAPTCHA, no payload disclosure | `01:126` |
| 5 | Only a genuinely new key reaches CAPTCHA / submission rate limit / external guards | `01:129-131` |
| 6 | Atomic unique write still resolves concurrent early misses | `01:133-139` |

Cross-file consistency verified — the ordering is stated identically in `00:59`, `03:48`, `04:146-148`, `05:39`, `06:25`, `06:47`, `07:58`, `09:17` (R-09), `16:58`, `17:15`. No file contradicts it.

### Mandatory tests — all seven present

`01` §C.6 and `06` §10 both carry the suite; `06:108-115` is the canonical list:

1. Response lost + expired CAPTCHA → replay original stable result — `01:155`, `06:108`
2. Response lost + exhausted submission quota → replay — `01:156`, `06:109`
3. Different payload → 409 **before CAPTCHA** — `01:157`, `06:110`
4. Two simultaneous no-row lookups → one winner, one Inquiry/Outbox — `01:158`, `06:111`
5. New-key CAPTCHA failure → no business write — `01:159`, `06:112`
6. Replay lookup DB timeout/failure → retriable safe error, no new key, no write — `01:160`, `06:113`
7. Replay path creates no Inquiry/Outbox/attempt — `01:161`, `06:114`

Plus `01:162-164` and `06:115`: concurrent same/same and same/different, rollback-before-commit, legacy NULL, version mismatch, canonical-equivalent vs materially-different inputs. Layer placement is correct — unit `06:24-25`, DB `06:35`, API `06:47`, concurrency `06:56`, E2E `06:71`.

### Abuse-risk analysis

`01:143` is well constructed and I concur with it. It permits a separate read/abuse rate limit on the replay path while imposing four constraints: it must not deprive a legitimate retry of the ability to resolve; it must not resend email; it must not create records or attempts; it must not return data beyond the stable result. That is the correct balance — moving the lookup ahead of the submission quota does create a cheap unauthenticated read path, and the plan neither ignores that nor lets the mitigation defeat the correction.

Residual concern: the stable result is not defined, so "không trả dữ liệu ngoài stable result" is currently unenforceable as written. That is **CF-03**, not an RI-01 failure.

---

## F. RI-02 verification — storage security boundary

**Result: PASS.**

Boundary declared identically in two normative locations (`01:199-205`, `12:53-59`), with `01:207` and `12:61` stating that internal names may change but the boundary is normative — a correct separation of contract from implementation detail.

| Check | Evidence | Result |
|---|---|:--:|
| Proxy read-only, `public-media/` only | `01:208`, `12:35`, `12:62`, `05:17` | PASS |
| Volume root never mapped | `12:16`, `12:62`, `03:109`, `09:19` | PASS |
| Protected docs only via Nest | `01:209`, `01:218`, `12:64`, `12:74`, `05:18` | PASS |
| Internal redirect denied from Internet | `01:209`, `12:64`, `12:126`, `04:123` | PASS |
| Storage class, not extension, decides namespace | `01:210`, `12:65`, `04:81`, `06:81` | PASS |
| Orphan moved out of served root | `01:216`, `12:71`, `05:17`, `07:66` | PASS |
| Backup/restore preserves namespace + permissions | `01:217`, `12:72`, `04:86`, `07:66`, `05:47` | PASS |

### Required tests — all eight classes present

`04:85`, `06:71`, `06:81`, `06:123`, `12:76` collectively cover: public image delivery succeeds; guessed protected PDF under `/media/*` → 404; direct internal protected route denied; `../` traversal denied; public→protected symlink escape denied; dotfile/temp/quarantine denied; orphan move makes the old served path ineffective under cache policy; restore namespace/permission scan PASS.

DoD enforcement is real, not advisory: `07:53` (P3), `07:56` (P6A), `07:62` (P11) and `07:66` all make these blocking conditions. `07:66` further states that soft-delete is not proof of file revocation under Semantics A — the correct reading, and one that a weaker plan would have gotten wrong.

Ownership is assigned to a single security owner with mandatory independent Security review for any change to public root, protected location, symlink policy or permissions (`08:38`).

---

## G. RI-03 verification — attempt lifecycle

**Result: PASS on lifecycle and transaction boundaries. The state/outcome *model* is ambiguous — see §J / CF-04.**

| Check | Evidence | Result |
|---|---|:--:|
| Worker claims job | `01:172`, `04:151` | PASS |
| Commit durable `started` attempt before provider call | `01:173-174`, `04:151`, `06:36`, `07:58`, `10:57`, `17:23` | PASS |
| Commit failure → provider must not be called | `01:175`, `04:151`, `06:131`, `05:40` | PASS |
| Provider call outside DB transaction | `01:179`, `01:191`, `04:152`, `06:60`, `12` n/a, `17:23` | PASS |
| Result update in a new transaction | `01:180-181`, `04:152` | PASS (scope ambiguous → CF-04) |
| Retry creates a new attempt | `01:183`, `04:153`, `06:26`, `06:137` | PASS |
| Attempt history never overwritten | `01:183`, `04:150`, `06:36` | PASS |
| Crash / DB-down after provider accepted → reconciliation | `01:190`, `04:155`, `06:133-135` | PASS |
| Unknown → no blind resend | `01:182`, `04:156`, `06:138`, `09:37`, `17:23` | PASS |
| Manual resolution records actor/time/reason | `01:185`, `04:153`, `06:139`, `17:23` | PASS |

### Lease / reaper

`01:192` and `04:157` both state that lease/heartbeat must prevent the reaper from claiming a legitimately active provider call, and that a reaper encountering `started`/`unknown` must route to reconciliation rather than resend. `06:136` makes it a mandatory concurrency case, `06:60` requires a barrier test proving no DB transaction is held during the network wait. `09:37` (R-29) lists the exact detection signals, including "DB transaction spans SMTP" and "attempt overwritten". This is correct and complete.

### Retention / PII

`04:154` sets preliminary ≥90-day configurable retention, no full body, no full PII, masked/hashed recipient. `06:140` and `09:26` (R-18) enforce it as a test and a risk. Consistent.

---

## H. FC-01 — Idempotency-Key format and entropy

**Classification: `MINOR v1.0 CLARIFICATION` (Medium). Registered as CF-02.**

### What the plan says

`01:71` is the entirety of it:

> "Key được client tạo một lần cho logical submission. Retry sau timeout phải dùng lại chính key đó; API/client không tự tạo key mới."

Semantics of *usage* are specified. Format, entropy, length bounds, character set, empty/short rejection, and comparison rules are not.

### What the Approved design already settles

This is the decisive point, and it is why this is not a High contract gap. Two Approved sources already answer most of the question:

- `doc/06:192` — `Header: Idempotency-Key: <uuid>  (hoặc body.request_id)`
  → the format is **UUID**, and there is a **second accepted transport** the plan never mentions.
- `doc/05:775` — `idempotency_key VARCHAR(100) NOT NULL UNIQUE`
  → maximum length is **100**; the type is `VARCHAR`, **not** `CITEXT` (which the schema does use elsewhere, e.g. `email CITEXT` at `doc/05:764`), so comparison is **byte-exact and case-sensitive** as a property of the Approved schema, not an implementer's choice.

So a diligent implementer following the plan's own precedence rule would reach the right answer on format, length and case-sensitivity. The genuine residue is narrower than the question implies: minimum entropy, rejection of empty/whitespace-only/malformed keys, the prohibition on trimming or lowercasing the key, and the header-vs-body precedence rule.

### Why it still matters

The key is globally unique across all inquiries. With no server-side validation rule, a conforming implementation may accept a low-entropy key such as `"1"`. A second, unrelated submitter using the same weak key with a different payload receives `409 IDEMPOTENCY_KEY_REUSED` — a lost lead, which is precisely the failure mode ADR-003 and the whole D19 contract exist to prevent. No mandatory test in `06` currently exercises key validation.

Additionally, `doc/05:775` permits the empty string (`NOT NULL` does not exclude `''`), so rejection must happen at the API layer or not at all.

### Recommended exact text — for v1.0 assembly, not applied here

To be inserted in `01` §C.1:

> **Key format, entropy and comparison.** `Idempotency-Key` is a UUID version 4 in canonical lowercase hyphenated form (36 characters, ≥122 bits of cryptographic randomness), consistent with Approved `06` PHẦN VII. The durable column is `VARCHAR(100)`, so 100 characters is the hard maximum. The API rejects an absent, empty, whitespace-only, over-length or non-conforming key with a stable `400` validation error **before** the durable lookup; it never generates or substitutes a key. Comparison is byte-exact and case-sensitive, matching the `VARCHAR` (not `CITEXT`) column type: the key is never trimmed, lowercased, or otherwise normalized, because any such transformation would change request identity. One key identifies exactly one logical submission for its entire retry lifetime. Per Approved `06`, the key may arrive either as the `Idempotency-Key` header or as `body.request_id`; if both are present the header is authoritative and a mismatch between the two is rejected as a `400` validation error.

Add to `01` §C.6 and `06` §10: one unit case (malformed/empty/over-length/case-variant keys rejected before lookup) and one API case (header and `body.request_id` transports, both-present precedence, mismatch rejection).

---

## I. FC-02 — Original stable replay result

**Classification: `MINOR v1.0 CLARIFICATION` (Medium). Registered as CF-03.**

### What the plan says

`01:125` — "trả original stable result".
`01:127` — "Replay response chỉ chứa **stable result đã định nghĩa**, không mở rộng sang payload nhạy cảm."

The phrase "as defined" is self-referential: the stable result is **not defined anywhere in the 19 files**. I searched all of them. The only concrete signal is `06:47`, "D19 **202** replay before CAPTCHA/submission quota", which pins the status code and nothing else.

Consequently the constraint at `01:143` — "không trả dữ liệu ngoài stable result" — is presently unenforceable as written, and no reviewer could fail an implementation against it.

### What the Approved design already settles

`doc/06:208` defines the original response precisely:

```
→ 202 Accepted { request_id, message }
```

and `doc/06:203` already establishes the replay semantic: "nếu đã tồn tại → trả lại 202 của inquiry cũ (KHÔNG tạo mới)".

This resolves the substance of FC-02 outright. The body carries only `request_id` and a `message`. It contains no email, phone, name, company, or message body, so the no-PII requirement is satisfied by construction. And because `request_id` corresponds to the client-supplied key and `message` is a static acknowledgement, **the replay response is fully reconstructible from the request key plus the existence of the Inquiry row** — no raw response body ever needs to be persisted. That last point matters: without it stated, an implementer could reasonably add a `response_body` column, duplicating PII and colliding with R-18 (`09:26`).

### Points genuinely still open

1. Whether `request_id` echoes the client key or exposes the internal Inquiry UUID. `doc/06:192` implies the former; it should be pinned, since exposing the internal UUID would widen the surface unnecessarily.
2. Independence from worker/email state — a replay must not vary with `outbox.status` or `inquiries.email_status`, or it stops being stable.
3. Whether a replay marker is returned. Recommendation: **no** marker in the public body, because a marker is an existence oracle usable for key probing; record the replay in internal logs and metrics instead.

### Recommended exact text — for v1.0 assembly, not applied here

To be inserted in `01` §C.4, Step 2, replacing "trả original stable result":

> **Original stable result (definition).** The replayed result is HTTP `202 Accepted` with the standard A24 `{data}` envelope, matching Approved `06` PHẦN VII: `{ request_id, message }`, where `request_id` is the client-supplied idempotency key echoed verbatim and `message` is a static locale-appropriate acknowledgement string. The response contains no Inquiry UUID and no personal data of any kind — no name, company, email, phone, message body, source URL or consent timestamp. It is byte-identical to the original response and does **not** vary with `inquiry_outbox.status`, `inquiries.email_status`, worker availability or elapsed time. It is reconstructed deterministically from the idempotency key plus the existence of the committed Inquiry row; **no raw response body is stored**. Replay is recorded in internal logs and metrics only; the public response carries no replay marker header or field, since such a marker would act as a key-existence oracle.

---

## J. FC-03 — Attempt state / outcome model

**Classification: `MINOR v1.0 CLARIFICATION` (Medium). Registered as CF-04.**

The lifecycle, transaction boundaries and reconciliation rules are correct (§G). The **model** is ambiguous in three distinct ways, all of which an implementer would hit on day one.

### Ambiguity 1 — two names for one concept

- `01:173` instructs: create the attempt with `state='started'`.
- `04:150` gives the authoritative field list: `id, outbox_id, attempt_number, worker_id, stable_message_id, provider_message_id, provider_response_code, provider_response_status, started_at, accepted_at, finished_at, **outcome**, sanitized_error_code, sanitized_error_summary, created_at`.

The field list contains `outcome` and **no** `state`. Two normative files name the same column differently, and nothing reconciles them.

### Ambiguity 2 — `unknown` is overloaded

- `01:182` and `04:152`: an ambiguous timeout/crash puts the attempt into `started` or `unknown` — a **system** state.
- `04:156`: "Manual outcomes: confirmed-sent, confirmed-duplicate, confirmed-not-sent, **unknown**" — a **manual resolution**.

The same token means "the system does not know" and "a human reviewed it and concluded it is unknowable". Those are operationally different and must be distinguishable in reconciliation reporting.

### Ambiguity 3 — one flat list mixing two kinds of thing

`01:185` and `04:153`: "Minimum attempt states: `started`, `accepted`, `failed`, `unknown`, `confirmed-sent`, `confirmed-duplicate`, `confirmed-not-sent`." The first four are machine-observed; the last three are human decisions. Collapsing them into one enum loses the actor distinction that `01:185` itself requires ("Manual resolution lưu actor, time và reason audit") and makes it impossible to express "provider accepted, then a human confirmed duplicate" without destroying the first fact.

### Transaction scope — the second half of the question

Three normative statements, three different scopes, none conclusive:

- `01:180` — "transaction mới cập nhật attempt thành `accepted` …, **rồi** cập nhật outbox/inquiry status theo atomic rule phù hợp" ("then … according to an appropriate atomic rule"). "Then" reads as sequencing; "appropriate atomic rule" is undefined.
- `04:152` — "A new result transaction writes `accepted` or `failed` **and then coordinates** outbox/inquiry status."
- `17:23` — "accepted/failed/unknown **and business-status updates use a subsequent transaction**" (singular — reads as one shared transaction).

**Nowhere does the plan state that attempt result, `inquiry_outbox.status` and `inquiries.email_status` are written in one and the same transaction.** If an implementer splits them, an attempt can read `accepted` while the outbox remains `processing`, producing a split state.

Mitigating factor, and the reason this is Medium rather than High: that split state is already inside the plan's reconciliation envelope — `06:135` ("DB unavailable after provider accepted"), `01:190`, and the no-blind-resend rule handle it without data loss or duplicate email. The consequence is operational noise and inconsistent reporting, not an unsafe system.

### Recommended exact model — for v1.0 assembly, not applied here

Replace the flat list in `01` §C.7 and `04` P7 with three orthogonal axes:

> **Attempt state model.** Each `inquiry_outbox_attempts` row carries three orthogonal fields.
>
> `attempt_state` — machine-observed lifecycle, the only field the worker writes automatically:
> `started` → `accepted` | `failed` | `unknown`, then optionally → `resolved` once a manual resolution is recorded.
>
> `provider_outcome` — nullable, what the provider actually returned: `accepted`, `rejected`, `timeout`, `error`. Null until the provider call returns.
>
> `manual_resolution` — nullable, written only by a human operator, always with actor, time and reason: `confirmed-sent`, `confirmed-duplicate`, `confirmed-not-sent`, `unknown`. Writing `manual_resolution` moves `attempt_state` to `resolved`; it never rewrites `provider_outcome` or any timestamp.
>
> `unknown` as `attempt_state` means the system could not determine the outcome. `unknown` as `manual_resolution` means an operator reviewed the case and concluded it is not determinable. The two are reported separately and are never merged.
>
> **Result transaction scope.** The attempt result (`attempt_state`, `provider_outcome`, provider ids/codes, `accepted_at`, `finished_at`), `inquiry_outbox.status` and `inquiries.email_status` are written in **one single result transaction**, distinct from the short attempt-start transaction and opened only after the provider call has returned. No transaction is ever held open across the provider call. If the result transaction fails, the attempt remains `started`/`unknown` and enters reconciliation; it is never blindly resent.

Also align `04:150`: rename `outcome` in the field list to the three fields above, so `01` and `04` use one vocabulary. Add one DB integration case asserting all three status writes commit atomically, and one asserting a manual resolution preserves the prior `provider_outcome`.

---

## K. Residual Critical

**None.**

No finding in this audit prevents safe implementation or violates Approved architecture or scope.

---

## L. Residual High

**None.**

All five prior High issues (FV-01 – FV-05) and all three Round 6B residuals (RI-01 – RI-03) are verified materialized in file content, with cross-file consistency and mandatory test coverage. No previously closed High issue reopens.

I considered and rejected High classification for CF-01, the strongest candidate. Reasoning: the plan's contracts are internally complete and coherent; what is missing is a *declaration* that certain refinements supersede a lower-precedence Approved document, plus the governance backlog entry. The plan already contains the exact mechanism for this (FV-13 / R-22 handle stale Approved wording precisely this way). The fix is bounded text, requires no architecture pass and no new correction candidate, which places it in Medium per the stated severity definitions. It is nonetheless the highest-priority delta and v1.0 must not be assembled without it.

---

## M. Medium / Low

| ID | Severity | Summary |
|---|---|---|
| CF-01 | **MEDIUM** | No Approved-document divergence register; plan precedence silently resolves against RI-01 and Model B |
| CF-02 | **MEDIUM** | FC-01 — Idempotency-Key format, entropy, validation and `body.request_id` transport unstated |
| CF-03 | **MEDIUM** | FC-02 — "original stable result" self-referential, never defined |
| CF-04 | **MEDIUM** | FC-03 — `state` vs `outcome`, overloaded `unknown`, result-transaction scope unstated |
| CF-05 | **LOW** | A9 inquiry email-status literals differ from the Approved CHECK constraint |
| CF-06 | **LOW** | D19 canonical field set v1 misaligned with the Approved inquiry DTO field names |

Full detail in `FINAL_ISSUE_REGISTER.md`.

### CF-01 in detail

The plan's precedence chain (`00:14`, restated in this audit's brief) is:

`ADR → MVP scope → PostgreSQL Schema → ERD → Data model → Backend/API → Admin Wireframe → Public Frontend Wireframe → D1–D20 → plan → audit reports`

**Backend/API outranks both the plan and D1–D20.** Three v0.4.1 refinements contradict `doc/06`, and none is declared as a divergence:

| # | Approved `doc/06` | Plan v0.4.1 | Effect if precedence applied literally |
|---|---|---|---|
| a | `06:202-203` — `Validate DTO → CAPTCHA → Rate limit → Kiểm idempotency_key` | `01:122-131` — durable lookup **before** CAPTCHA and quota | **RI-01 is reversed**; response-lost retry with an expired CAPTCHA fails again |
| b | `06:119` — `/health/ready` (readiness: **DB/storage/outbox/email**) | `03:24`, `12:31` — config + PostgreSQL only | **FV-02 / Model B is reversed**; storage or SMTP failure evicts Core API and leads are lost |
| c | Approved API surface has no such endpoints | `/health/ready/media`, `/health/worker` (`03:25-26`, `12:32-33`) | Two endpoints exist with no Approved authority |

A fourth, benign case: `/media/*` has no Approved definition at all. `doc/05:71-73` stores `storage_disk`, `storage_path`, `public_url` without prescribing a public URL prefix, and `doc/06:179-181` defines only the `/admin/media/:id` API. The plan's `/media/*` is therefore **additive with no Approved conflict** — but it belongs in the register for completeness, so a future reviewer does not have to re-derive that conclusion.

**Materially important mitigating fact, which I verified directly:** ADR-003 — the top of the precedence chain — specifies at `doc/09:184` only:

```
Form → Validate → CAPTCHA + Rate limit
     → Transaction { INSERT inquiries; INSERT inquiry_outbox }
     → Commit → 202 Accepted
```

The ADR says nothing about where the idempotency lookup sits. It requires CAPTCHA and rate limit before the **write transaction**, and the plan honors that for every new key (`01:129-131`). So **there is no ADR-level conflict** — only a Backend/API-document conflict. Furthermore, ADR-003's stated motivation (`doc/09:178`) is that losing a lead is "rủi ro kinh doanh nghiêm trọng"; RI-01 serves that intent more faithfully than `06`'s literal ordering does. The plan is right on the merits. It simply never says so.

Similarly for (b): the plan is visibly aware of the tension — `01:30` renders A20 as "Dùng Readiness Model B để hiện thực **intent** mà không làm mất lead", and `01:37` notes Model B separates core/media/worker readiness. That is an oblique acknowledgment, not a declaration, and it does not name `doc/06:119` or route the change to document governance.

---

## N. Scope

**PASS.** Verified against Approved `doc/01_PHAM_VI_CHUC_NANG_VA_MVP.md` directly, not against the plan's self-assertion.

| Must be absent | Plan | Approved corroboration |
|---|---|---|
| Users CRUD | `01:29`, `04:67`, `04:184`, `05:10`, `07:60` — no `/admin/users` | `doc/01:249` (P1: Phân quyền) |
| Advanced auto-save | `00:26`, `04:183`, `07:60` — manual save + unsaved warning only | `doc/01:71` |
| Site-wide search P0 | `00:25`, `02:75`, `03:106`, `04:176` — product-only | `doc/01:246` (P1), `doc/06:111` |
| Facet count P0 | `01:24` (A14), `04:102`, `05:54` | `doc/01:52`, `doc/01:64`, `doc/01:154` |
| Scheduled publishing P0 | `04:176`, `05:54` | `doc/01:70`, `doc/01:180` |
| Video upload | `01:28` (A18), `04:89`, `05:54` | `doc/01:72`, `doc/01:135` (ADR-012) |
| Inquiry Admin CRM UI | `04:163`, `05:54`, `07:60` | `doc/01:25`, `doc/01:225` (ADR-003), `doc/01:249` |
| Ecommerce UI | `01:23` (A13), `04:114`, `05:54` | `doc/01:16`, `doc/01:141`, `doc/01:255` |
| Rich taxonomy detail P0 | `04:97`, `04:102`, `11:46` | `doc/01` taxonomy list/landing scope |

| Must be present | Plan | Result |
|---|---|:--:|
| Applications Admin flat | `01:23`, `03:65`, `04:97`, `05:23`, `05:55` | PASS |
| Product-only search | `01:32` (A22), `05:28`, `02:75` | PASS |
| Exactly 25 modules | `03` §4, counted = 25; `03:82` excludes infrastructure/worker/frontend/shared from the count | PASS |
| 13 phase labels | `00:23`, `04:5` | PASS |
| P6A / P6B split | `04:117`, `04:130`, `03:93` | PASS |
| P7 parallel | `00:35`, `02:46`, `03:94`, `04:141` | PASS |
| Hybrid strategy | `02` §§1–7, `02:75` | PASS |

One nuance handled correctly: `05:52` notes the matrix has 40 capability rows while the module inventory stays at 25, and explains why. That is not a count discrepancy — capabilities and modules are different units, and the plan says so.

---

## O. Gate A

| Criterion | Status | Basis |
|---|---|---|
| 0 Critical | **PASS** | §K |
| 0 unresolved High | **PASS** | §L |
| Medium have disposition and gate | **PASS** | FV-06–FV-11 APPLIED, FV-12/FV-13 DEFERRED WITH GATE (`15`), CF-01–CF-04 dispositioned in this report with exact text |
| Candidate standalone | **PASS** | §C.9 |
| A1–A25, D1–D20 complete | **PASS** | Counted 25 and 20 |
| FV-01–FV-14 disposition verified | **PASS** | §D |
| RI-01–RI-03 verified | **PASS** | §§E–G |
| Scope audit | **PASS** | §N |
| Independent final verification | **PASS WITH MINOR v1.0 EDITS** | This report |
| User approves promotion | **PENDING — user action** | Sole remaining condition |

**Gate A: all verifier-determinable criteria are met.** The only outstanding condition is the user's explicit approval, which by design cannot be supplied by a verifier.

Git is correctly excluded as a Gate A condition (`00:47`, `07:76`, `16:22`), as are B23/B24/B25.

---

## P. Gate B

**NOT MET.** Confirmed independently, not inherited from the plan's own statement.

| Condition | Status | Evidence |
|---|---|---|
| Pre-P0 Git restoration | **FAIL** | `.git` is an empty directory; `git status` → `fatal: not a repository` |
| Root / `main` / remote-or-no-remote / baseline commit / status / tag `docs-v1.2.1-approved` | **FAIL** | Not verifiable — no repository exists |
| Plan-history hash manifest | **NOT DONE** | Deferred with gate per FV-12; blocked on Git restoration |
| Supported Node/pnpm toolchain | **NOT VERIFIED** | Out of scope for a read-only plan audit |
| Docker / PostgreSQL 16 | **NOT VERIFIED** | Same |
| CI / evidence path | **NOT VERIFIED** | Same |
| P0 DoR incl. spike plan | **NOT VERIFIED** | Requires Gate B environment |

Per the audit brief and `07:76`, Gate B failure is **not** used to reject plan promotion. Gate A and Gate B are correctly independent in this plan, and I confirm that separation is coherent as written.

**Coding remains not permitted.**

---

## Q. Exact v1.0 delta

Six deltas, applied at v1.0 assembly. Full paste-ready text in `V1_0_PROMOTION_RECOMMENDATION.md`.

| Delta | Closes | Target | Nature |
|---|---|---|---|
| 1 | CF-01 | `01` (new section), referenced from `10` | Approved-document reconciliation register + precedence sentence + governance backlog gate |
| 2 | CF-02 | `01` §C.1, tests in `01` §C.6 / `06` §10 | Key format, entropy, validation, comparison, dual transport |
| 3 | CF-03 | `01` §C.4 Step 2 | Definition of the original stable result |
| 4 | CF-04 | `01` §C.7 and `04` P7 | Three-axis state model + single result transaction |
| 5 | CF-05 | `01` A9 | Enum literals corrected to the Approved CHECK values |
| 6 | CF-06 | `01` §C.2 | Canonical field names aligned to the Approved DTO |

None changes architecture, scope, schema, URLs, module count, phase count or strategy. All are text-level and self-contained.

---

## R. Final verdict

# `PASS WITH MINOR v1.0 EDITS`

- Residual **Critical: 0**
- Residual **High: 0**
- Medium: 4 (`CF-01`–`CF-04`) — all closable with the exact text supplied
- Low: 2 (`CF-05`, `CF-06`) — literal corrections
- **Gate A: eligible**, pending user approval only
- **Gate B: not met** — Git absent, environment unverified; correctly not a promotion blocker
- **v0.4.2 correction round: not required**

"Minor" describes the *mechanics* of the edits, not their importance. **CF-01 through CF-04 are mandatory content for v1.0.** Assembling v1.0 without CF-01 in particular would ship a baseline whose own precedence rule contradicts its two headline corrections.

This verification does not approve the plan, does not promote it to v1.0, and does not authorize coding, cleanup or archiving. Promotion requires the user's explicit approval; coding additionally requires Gate B.
