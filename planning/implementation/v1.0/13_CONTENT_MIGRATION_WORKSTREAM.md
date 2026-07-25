# 13 — CONTENT MIGRATION WORKSTREAM

**Plan version:** v1.0  
**Status:** APPROVED FOR IMPLEMENTATION — PLANNING COMPLETE  
**Approval date:** 2026-07-25  
**Approval authority:** User  
**Gate A:** PASSED  
**Gate B:** NOT MET  
**Coding:** NOT AUTHORIZED UNTIL GATE B PASSES

Content migration là workstream CM0–CM4 song song P4–P11. Nó không block Gate A/Gate B/P0, nhưng C7 và C8 có deadline trước execution tương ứng và CM validation/cutover block release.

## 1. C7 ownership contract

**C7 phải được assign trước CM0 execution thực.** C7:

- xác định content in-scope;
- duyệt inventory và old→new mapping;
- xác nhận image/document rights;
- ký CM3 validation;
- ký CM4 cutover;
- duy trì accountability tới go-live sign-off.

Nếu C7 chưa assign, chỉ được thiết kế template/tooling; không crawl/inventory execution thật. Nếu C7 mất ownership hoặc chưa ký CM3/CM4, release vẫn bị block.

## 2. Stages

| Stage | Timing | Inputs | Outputs | Acceptance | Owner/Reviewer |
|---|---|---|---|---|---|
| CM0 Inventory | P4 | C7 assigned; C8 authorization | URL/status/type/media/PDF/locale/canonical/backlink inventory | 100% in-scope URLs recorded; scope signed | C7 + implementer / independent content reviewer |
| CM1 Mapping | P4–P5 | CM0 | old→new keep/301/410/archive, slug/locale/rights exceptions | 100% URLs have disposition; rights confirmed | C7+SEO / reviewer |
| CM2 Importer/Dry Run | P5–P7 | Approved map, target schema/contracts | idempotent dry-run/import plan, checksum manifest, exception report | dry-run reconcile; production guard intact | Implementer / DB+content reviewer |
| CM3 Validation | P7–P10 | Imported staging data | counts/relations/locale/redirect/link/file/visual results | counts reconcile; critical broken links=0; loops/chains=0; C7 signs | QA+C7 / independent verifier |
| CM4 Freeze/Delta/Cutover | P11 | CM3 PASS; C5/C9 | freeze, delta, final redirects, snapshots, post-live crawl | idempotent delta/cutoff; restore point; C7+user sign | Release captain+C7 / user |

## 3. Inventory and acceptance

Minimum inventory fields: old URL, status, type, name, locale availability, media/PDF, current canonical, proposed new URL, action, redirect, backlinks, rights owner/status.

Acceptance: 100% URL disposition; counts and relationships by type/locale reconcile; media/PDF checksum/MIME/size; no critical broken internal link; redirect chain/loop=0; delta reruns without duplication; explicit cutoff timestamp.

## 4. Technical constraints

- Redirects use Nest authoritative resolver/slug reservation and D17 delivery.
- Old published slugs enter redirect source and cannot be reused.
- Media imports use StoragePort, safe keys, checksums, MediaUsageService and D20 Semantics A.
- Controlled documents retain Nest publication gate.
- VI/EN publication stays independent; no invented fallback.
- CM outputs may use `IMPLEMENTATION MIGRATION 071+` only if schema change is separately approved; this planning round creates no SQL.

## 5. CM2 production hard-disable

CM2 defaults to local/development/staging. Production write is denied unless all are true:

1. Explicit environment/target allowlist, not `NODE_ENV` alone.
2. Separate production-write flag.
3. Approval/change record.
4. Dry-run PASS.
5. Same-cutoff DB+media backup/snapshot.
6. Exact target host/database displayed.
7. Human confirms displayed target.
8. Confirmation phrase/token, not simple yes/no.
9. Least-privilege import role.
10. Idempotent importer.
11. Transaction/batch rollback policy.
12. Structured sanitized audit evidence.

Missing any condition means no production write.

## 6. Tests and evidence

- Counts/checksums, slug collision, redirect coverage, link crawler, relation counts, locale publication, file availability/checksum, rights exception list, visual samples, delta idempotency and production-guard negative tests.
- Evidence has source cutoff, target/environment, SHA/tool versions, command/exit/raw log, manifest checksum and C7 signatures; no full PII.

## 7. Rollback

Before CM4: rerun/reset only approved staging batches. Production/cutover rollback uses DB+media same-cutoff snapshot, redirect/content delta snapshot, DNS/cache decision point and forward repair. Never roll DB without matching media state. Post-restore consistency scans must PASS before declaring recovery.

## 8. Out-of-scope

Unauthorized crawl/export, P1/Future content features, automatic rights assumptions, silent production import and content deletion without C7 disposition.
