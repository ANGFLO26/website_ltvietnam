# V1.0 PROMOTION RECOMMENDATION — IMPLEMENTATION PLAN v0.4.1

**Verifier:** Claude (independent final verifier, Round 7) · **Date:** 2026-07-25
**Companion documents:** `CLAUDE_FINAL_VERIFICATION.md`, `FINAL_ISSUE_REGISTER.md`

---

## 1. Recommendation

**Verdict: `PASS WITH MINOR v1.0 EDITS`**

| Question | Answer |
|---|---|
| Can v0.4.1 be promoted to standalone v1.0? | **Yes**, once the user approves and the six deltas below are applied during assembly. |
| Is a v0.4.2 correction candidate required? | **No.** Zero Critical, zero High. No architecture correction pass is needed. |
| Can the residual findings be handled by minor v1.0 edits? | **Yes.** All six are text-level, self-contained, and supplied verbatim in §3. |
| Does anything change architecture, scope, schema, URLs, module count, phase count or strategy? | **No.** |

"Minor" describes the mechanics of the edits, not their importance. **CF-01 through CF-04 are mandatory content for v1.0.** In particular, assembling v1.0 without Delta 1 would ship a baseline whose own precedence rule contradicts its two headline corrections (RI-01 and FV-02/Model B).

If the user prefers these to be applied through a formal correction round rather than at assembly, a v0.4.2 pass is a legitimate alternative — but it is not required, and it would not change any finding's severity.

---

## 2. Basis for the recommendation

| Gate A criterion | Status |
|---|---|
| 0 Critical | PASS |
| 0 unresolved High | PASS |
| Medium have disposition and gate | PASS — FV-06–FV-11 APPLIED, FV-12/FV-13 DEFERRED WITH GATE, CF-01–CF-04 dispositioned with exact text below |
| Candidate standalone | PASS — full A1–A25, D1–D20, strategy comparison, 13 phases, nine test layers, R-01–R-33, DoR/DoD, RACI, topology, CM0–CM4 all inline |
| A1–A25 and D1–D20 complete | PASS — independently counted 25 and 20 |
| FV-01–FV-14 verified | PASS |
| RI-01–RI-03 verified | PASS |
| Scope audit | PASS — cross-checked against Approved `doc/01`, not the plan's self-assertion |
| Independent final verification | **PASS WITH MINOR v1.0 EDITS** |
| User approves promotion | **PENDING — user action, the sole remaining condition** |

Git validity and B23/B24/B25 are correctly excluded from Gate A.

---

## 3. Exact delta to apply when assembling v1.0

Six deltas. Text is paste-ready. Nothing else in the candidate needs to change.

### Delta 1 — CF-01 · Approved-document reconciliation register

**Target:** new section in `01`, placed after §B (D1–D20); cross-reference it from `10` §10 alongside the existing FV-13 provenance note.

**Rationale:** the plan's precedence chain (`00:14`) ranks Backend/API above both the plan and D1–D20. Three v0.4.1 refinements contradict Approved `doc/06` and none is declared, so a literal precedence application would reverse RI-01 and Model B. ADR-003 — the top of the chain — requires only CAPTCHA and rate limit before the **write transaction** (`doc/09:184`), which the plan preserves for every new key, so there is no ADR-level conflict to resolve. This register makes the divergence explicit and routes it to the same governance path the plan already uses for FV-13.

> ## B-bis. Approved-document reconciliation register
>
> The precedence order in `00` §1 places Backend/API above this plan. The refinements below intentionally supersede specific sections of Approved `06` and are recorded here so that precedence does not silently reverse a verified correction. Each entry carries a rationale and a governance gate. No Approved file is edited by this plan; every entry is queued as a backlog item under the Approved-document governance process, in the same manner as the stale `README_VERIFY.md` wording recorded in `10` §10.
>
> | # | Approved section | Approved text | v0.4.1 position | Rationale | Governance gate |
> |---|---|---|---|---|---|
> | AR-1 | `06` PHẦN VII, Inquiry flow | `Validate DTO → CAPTCHA → Rate limit → Kiểm idempotency_key` | Durable existing-key lookup runs **before** CAPTCHA and the new-submission rate limit (§C.4 Step 2); CAPTCHA and rate limit still run for every genuinely new key (§C.4 Step 3) | ADR-003 requires CAPTCHA and rate limit before the **write transaction**, which is preserved. The Approved ordering causes a committed submission whose response was lost to be refused on retry once the CAPTCHA token expires or the IP quota is exhausted — the lead loss ADR-003 exists to prevent. | Backlog item: update `06` PHẦN VII flow to place the idempotency lookup first. Not a Gate A or Gate B condition. |
> | AR-2 | `06`, internal endpoints | `GET /health/ready` (readiness: DB/storage/outbox/email) | Readiness Model B: `/health/ready` validates bootstrap config and PostgreSQL only and never checks storage, SMTP, worker, outbox backlog, CDN or media processor (`03` §2, `12` §2) | Coupling core readiness to non-core dependencies removes the Core API from proxy traffic when storage or SMTP fails, so `POST /inquiries` fails while PostgreSQL is fully usable. A20's intent is internal readiness, not lead loss. | Backlog item: split the `06` readiness description into core, media and worker profiles. Not a Gate A or Gate B condition. |
> | AR-3 | `06`, internal endpoints | No equivalent endpoints defined | `/health/ready/media` and `/health/worker` added as separate internal diagnostic profiles (`03` §2, `12` §2) | Carries the dependency checks removed from core readiness by AR-2 so that no probe coverage is lost. Both are internal and non-public; no public URL and no Approved public route changes. | Backlog item: add both endpoints to the `06` internal endpoint list. Not a Gate A or Gate B condition. |
> | AR-4 | — | Approved design defines no public media URL prefix; `05` stores `storage_disk`, `storage_path`, `public_url`, and `06` defines only the `/admin/media/:id` API | `/media/*` is the public read-only delivery prefix mapped to `public-media/` (`01` §D, `12` §4) | **Additive; no Approved conflict.** Recorded for completeness so future reviewers need not re-derive it. | None required. |
>
> **Precedence rule for declared divergences.** Where a divergence is recorded in this register with a rationale and a governance gate, this plan's position is authoritative for implementation until the corresponding Approved document is updated. Undeclared differences are **not** covered by this rule: any other conflict between this plan and an Approved document resolves in favour of the Approved document per `00` §1, and must be raised as a plan defect rather than implemented.

### Delta 2 — CF-02 · Idempotency-Key format, entropy and transport

**Target:** `01` §C.1, appended after the existing key-reuse sentence.

> **Key format, entropy and comparison.** `Idempotency-Key` is a UUID version 4 in canonical lowercase hyphenated form (36 characters, at least 122 bits of cryptographic randomness), consistent with Approved `06` PHẦN VII. The durable column is `VARCHAR(100)`, so 100 characters is the hard maximum. The API rejects an absent, empty, whitespace-only, over-length or non-conforming key with a stable `400` validation error **before** the durable lookup; it never generates or substitutes a key on the client's behalf. Comparison is byte-exact and case-sensitive, matching the `VARCHAR` (not `CITEXT`) column type: the key is never trimmed, lowercased, or otherwise normalized, because any such transformation would change request identity. One key identifies exactly one logical submission for its entire retry lifetime. Per Approved `06`, the key may arrive either as the `Idempotency-Key` header or as `body.request_id`; if both are present the header is authoritative, and a mismatch between the two is rejected as a `400` validation error.

**Tests** — add to `01` §C.6 and `06` §10 (D19 suite):

> 11. Malformed, empty, whitespace-only, over-length and case-variant keys are rejected with a stable `400` before any durable lookup, and create no Inquiry, Outbox or attempt.
> 12. The key is accepted from the `Idempotency-Key` header and from `body.request_id`; when both are present the header wins; a header/body mismatch is rejected as `400`.

### Delta 3 — CF-03 · Definition of the original stable result

**Target:** `01` §C.4 Step 2, replacing the bare phrase "trả original stable result" and the self-referential "stable result đã định nghĩa" at item 4.

> **Original stable result (definition).** The replayed result is HTTP `202 Accepted` carrying the standard A24 `{data}` envelope with the body defined in Approved `06` PHẦN VII: `{ request_id, message }`, where `request_id` is the client-supplied idempotency key echoed verbatim and `message` is a static locale-appropriate acknowledgement string. The response contains no Inquiry UUID and no personal data of any kind — no name, company, email, phone, message body, source URL or consent timestamp. It is byte-identical to the original response and does **not** vary with `inquiry_outbox.status`, `inquiries.email_status`, worker availability or elapsed time. It is reconstructed deterministically from the idempotency key plus the existence of the committed Inquiry row; **no raw response body is stored**. Replay is recorded in internal logs and metrics only — the public response carries no replay marker header or field, because such a marker would act as a key-existence oracle on an unauthenticated endpoint.

**Test** — add to `01` §C.6 and `06` §10:

> 13. Replayed response is byte-identical to the original across outbox `pending`/`processing`/`sent`/`failed` and inquiry `email_pending`/`email_sent`/`email_failed`, contains no PII field, and is produced without reading any stored response body.

### Delta 4 — CF-04 · Attempt state model and result-transaction scope

**Target:** `01` §C.7, replacing the "Minimum attempt states" paragraph; and `04` P7, replacing the `outcome` entry in the attempt field list and the "Minimum attempt states" / "Manual outcomes" lines.

> **Attempt state model.** Each `inquiry_outbox_attempts` row carries three orthogonal fields.
>
> `attempt_state` — machine-observed lifecycle, the only field the worker writes automatically: `started` → `accepted` | `failed` | `unknown`, then optionally → `resolved` once a manual resolution is recorded.
>
> `provider_outcome` — nullable, recording what the provider actually returned: `accepted`, `rejected`, `timeout`, `error`. Null until the provider call returns.
>
> `manual_resolution` — nullable, written only by a human operator and always with actor, time and reason: `confirmed-sent`, `confirmed-duplicate`, `confirmed-not-sent`, `unknown`. Writing `manual_resolution` moves `attempt_state` to `resolved`; it never rewrites `provider_outcome` or any timestamp.
>
> `unknown` as an `attempt_state` means the system could not determine the outcome. `unknown` as a `manual_resolution` means an operator reviewed the case and concluded it is not determinable. The two are reported separately and are never merged.
>
> **Result transaction scope.** The attempt result (`attempt_state`, `provider_outcome`, provider identifiers and codes, `accepted_at`, `finished_at`), `inquiry_outbox.status` and `inquiries.email_status` are written in **one single result transaction**, distinct from the short attempt-start transaction and opened only after the provider call has returned. No database transaction is ever held open across the provider call. If the result transaction fails, the attempt remains `started` or `unknown` and enters reconciliation; it is never blindly resent.

In `04` P7, replace `outcome` in the attempt field list with `attempt_state`, `provider_outcome`, `manual_resolution`, so `01` and `04` use one vocabulary.

**Tests** — add to `06` §10 (Outbox reconciliation suite):

> 11. Attempt result, outbox status and inquiry email status commit in a single transaction; an injected failure leaves all three at their prior values, and no combination of two-updated/one-stale is observable.
> 12. Recording a manual resolution sets `attempt_state='resolved'` and preserves the prior `provider_outcome` and all timestamps; system-`unknown` and manual-`unknown` remain distinguishable in the reconciliation report.

### Delta 5 — CF-05 · A9 enum literals

**Target:** `01` §A, row A9.

Replace `Inquiry email status: pending/sent/failed` with `Inquiry email status: email_pending/email_sent/email_failed`, matching the Approved CHECK constraint at `doc/05:773-774`. Leave the outbox literals (`pending/processing/sent/failed`) unchanged — they already match `doc/05:788-789`.

### Delta 6 — CF-06 · Canonical field set v1 naming

**Target:** `01` §C.2.

Rename `source_page` and `source_path` to the single field `source_url`, and `consent` to `privacy_consent`, matching the Approved DTO at `doc/06:196-198` and the schema at `doc/05:768`/`doc/05:772`. Either remove `location` and `company_tax_code`, or retain them explicitly annotated as not accepted by the P0 DTO and therefore always carrying the `missing` marker. Keep the fixed key order and the `v1` version label unchanged — the canonicalization rules in §C.3 are unaffected.

---

## 4. Assembly conditions

Applies on top of the existing rules in `16` "V1.0 assembly rule".

1. Apply Deltas 1–6 during assembly. Do not defer any of them to a post-v1.0 backlog.
2. Assemble normative content solely from v0.4.1 plus these deltas. Never pull normative text from `v0.1`–`v0.4`.
3. Preserve 25 application modules, 13 phase labels, Hybrid strategy, P6A/P6B, P7 parallel, product-only search and every scope boundary. None of the deltas touches any of these.
4. Change the status line only after the user's explicit approval.
5. Generate a checksum/file manifest for the assembled baseline — this also closes the current inability to verify historical content equality (see §6).
6. An independent reviewer confirms the assembled v1.0 matches the approved candidate plus exactly these six deltas, with no missing file.
7. Re-run the integrity checks from this audit against the assembled baseline: artifact count, single status value, no forbidden normative back-reference, and the counts A=25, D=20, R=33, C=9, modules=25, phases=13, test layers=9, spike cases=15.

---

## 5. Gate status

### Gate A — plan promotion eligibility

**ELIGIBLE.** All verifier-determinable criteria are met: 0 Critical, 0 High, Medium dispositioned with exact text, candidate standalone, scope PASS, independent final verification complete.

**The sole remaining condition is the user's explicit approval**, which by design cannot be supplied by a verifier. Git validity and B23/B24/B25 are not Gate A conditions.

### Gate B — coding start

**NOT MET.** Confirmed by direct read-only inspection, not inherited from the plan's own statement.

| Condition | Status |
|---|---|
| Pre-P0 Git restoration | **FAIL** — `.git` is an empty directory; `git status` returns `fatal: not a repository` |
| Root / `main` / remote-or-no-remote / baseline commit / status / tag `docs-v1.2.1-approved` | **FAIL** — not verifiable, no repository exists |
| Plan-history hash manifest | **NOT DONE** — deferred with gate under FV-12, blocked on Git restoration |
| Supported Node/pnpm toolchain | **NOT VERIFIED** — outside the scope of a read-only plan audit |
| Docker / PostgreSQL 16 | **NOT VERIFIED** |
| CI / evidence path | **NOT VERIFIED** |
| P0 DoR including exact spike plan | **NOT VERIFIED** |

Gate B failure is **not** used to reject promotion. This confirms R-25 (`09:33`) as the current explicit Gate B blocker.

---

## 6. Permissions after this verification

| Action | Permitted now? | Condition |
|---|---|---|
| Promote v0.4.1 → standalone v1.0 | **Not yet** | Requires the user's explicit approval. Once given, assemble with Deltas 1–6. |
| Create a v0.4.2 correction candidate | **Not required** | Optional alternative if the user prefers a formal correction round over assembly-time edits. |
| Cleanup / archive of v0.1–v0.4 or review directories | **Not permitted** | Requires user approval **and** should follow Pre-P0 Git restoration, so history is captured by hash manifest and commit before anything is moved. Until then, timestamp-only evidence is all that protects the history. |
| Start coding / P0 implementation | **Not permitted** | Gate B is not met — Git absent, toolchain/Docker/PostgreSQL 16/CI unverified. |
| Edit Approved documents in `doc/` | **Not permitted** | The AR-1…AR-3 divergences are backlog items under the Approved-document governance process, not edits this plan may make. |
| Create migration SQL | **Not permitted** | Baseline 001–070 stays frozen; all new schema work is `IMPLEMENTATION MIGRATION 071+`, materialized no earlier than P1/P7. |

---

## 7. Recommended sequence

1. User reviews this verification and decides on promotion.
2. On approval, assemble v1.0 from v0.4.1 with Deltas 1–6 and generate the file manifest with checksums.
3. Independent reviewer confirms the assembled baseline against §4.
4. User/authorized operator performs the Pre-P0 Git restoration (Option A, D15) — this is the Gate B critical path and is independent of steps 1–3.
5. After restoration: create the plan-history hash manifest, commit and tag without rewriting history, closing FV-12.
6. Verify toolchain, Docker, PostgreSQL 16 and the CI/evidence path; complete the P0 DoR including the exact spike plan.
7. Gate B evaluation. Only then does P0 begin.
8. Cleanup/archive of historical plan directories, if the user wants it, after step 5 — never before.

---

## 8. Statement of limits

This verification does **not** approve the plan, does **not** promote it to v1.0, and does **not** authorize coding, cleanup or archiving. It records an independent read-only assessment against the Approved design and reports a verdict. Promotion requires the user's explicit approval; coding additionally requires Gate B.

No file in `planning/implementation/v0.4.1/`, `v0.1`–`v0.4`, or `doc/` was modified during this audit. Only the three files in `planning/implementation/reviews/claude-final-v0.4.1/` were created.
