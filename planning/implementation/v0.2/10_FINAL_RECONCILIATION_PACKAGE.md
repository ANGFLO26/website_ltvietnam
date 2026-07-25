# 10 — FINAL RECONCILIATION PACKAGE

**Plan version:** v0.2 · **Trạng thái:** PROPOSED FOR FINAL RECONCILIATION · **Ngày:** 2026-07-22
**Gửi:** ChatGPT + Codex (Round 5 reconciliation). **Yêu cầu:** KHÔNG cần đồng ý — **tìm issue còn lại** trước khi plan lên v1.0.

Bản độc lập tóm tắt v0.2 sau khi áp dụng D1–D16 và correction toàn bộ issue Round 3.

---

## 1. Quyết định người dùng đã chốt (D1–D16)
D1 NestJS · D2 một Next app (public + `/admin`) · D3 pnpm monorepo (apps/api,web,worker; packages/contracts,route-rules,config,testing) · D4 Kysely runtime + raw SQL bắt buộc (SKIP LOCKED/filter/PG) · D5 raw SQL baseline 001–070 + manifest/checksum + 071+ (down chỉ disposable) · D6 worker process riêng (drain/lease/heartbeat/reaper) · D7 single VPS Docker Compose (no serverless/no Redis P0) · D8 persistent volume qua StoragePort · D9 in-process cache/rate-limit **single-instance only** · D10 reverse-proxy routing matrix · D11 Nest authoritative redirect + Next delivery · D12 Nest authoritative SEO + Next serialize · D13 sitemap/robots ở Nest · D14 content migration workstream · D15 Git integrity = P0 prerequisite · D16 Node 24/22, cấm EOL.

## 2. Topology cuối (`12`)
Single persistent host: Nginx/Caddy → {Next web (public+admin), Nest API, worker process, PostgreSQL 16, persistent media volume, backup}. In-process cache/rate-limit single-instance only.

## 3. Routing matrix (`12` §2)
`/api/v1/*`,`/health/*`,`/sitemap*.xml`,`/robots.txt` → **Nest**; public page routes + `/admin/*` → **Next**. Page request: Next → Nest route-resolution **trước render** → redirect(301/302)/content/not_found. Sitemap/robots **chỉ Nest** (D13).

## 4. Stack
NestJS API + một Next app (public+admin) + worker process riêng, pnpm monorepo, Kysely runtime, raw SQL migration baseline, PostgreSQL 16, Node 24/22, single VPS Docker Compose.

## 5. Phase sequence
P0 decisions+Git · P1 raw baseline+bootstrap-sep · P2 core/auth/health-registry · P3 media+content-security · P4 taxonomy+redirect-proof · P5 product thin vertical · **P6A** content core · **P6B** relationships · P7 inquiry+worker (parallel) · **P8 Web Delivery (nav/homepage/redirect/SEO — no search)** · **P9 Admin Completion** · **P10 Public Completion** · P11 content delta+hardening+release.

## 6. Critical path (loại cycle)
`P0→P1→P2→P3→P4→P5→P6A→P6B→P8→P10→P11`; **P7 parallel** sau P5+service core; Admin liên tục, hội tụ P9.

## 7. Parallel branches
Sau P3: 5 taxonomy; content core; FE shell. Sau P4: navigation core, SEO route-rules. Sau P5+service core: P7 song song P6B. Content migration CM0(P4)→CM4(P11) song song.

## 8. P6A/P6B
P6A core entities (pages/customers/offices/post_categories + services/documents/posts/projects core, thứ tự dependency); P6B cross-module link tables + replace-set + integration.

## 9. Thin vertical deliverables (P4–P7)
Mỗi slice: DB→API→**minimal Admin create/edit/publish**→**minimal Public route**→**browser E2E**. P9/P10 = completion. (Chi tiết `02` §4.2, `04`.)

## 10. Content migration (`13`)
CM0 Inventory(P4)/CM1 Mapping(P4–P5)/CM2 Importer-DryRun(P5–P7)/CM3 Validation(P7–P10)/CM4 Cutover(P11). Acceptance: 100% URL disposition; counts reconcile; redirect chain/loop=0; delta idempotent. Business owner = **OPEN ASSIGNMENT (C7)**.

## 11. Test additions (`06` §K)
Auth race/replay/key-rotation; media dimension/bomb/EXIF/PDF/Unicode; slug/redirect concurrency + redirect-before-render; product primary/replace-set/archive/lost-update (+ **lock strategy chốt trước P5**); inquiry shutdown/poison/fairness/reaper-race/**idempotency mismatch→409**; SEO base-url/404/410/XML+JSON-LD escape/locale; contract **backward-compat/generated-client freshness/mixed-version/hydration/a11y/download-headers**; CM counts/checksum/coverage/delta-idempotency. Phân MANDATORY/CONDITIONAL/DEFERRED.

## 12. Rollback additions (`04` §L)
Phase rollback theo side-effect: P1 restore+forward-fix (down chỉ disposable); P2 feature-disable+key-rotation; P3 disable-upload/purge+orphan-reconcile+restore-media+DB; P4–P6 stop-writes+preserve-redirects+data-repair; P7 stop-claim→drain→quarantine+preserve-outbox; P8 cache-purge+redirect-snapshot+forward-SEO-fix; P9/P10 versioned+backward-compat+blue-green; P11 tested-backup/restore+cutover-runbook+decision-points.

## 13. RACI (`08`)
Task/PR-level (Implementer/Reviewer/Approver/Runner/Evidence owner); AI không approve PR mình sửa; integration PR (C+X) → fresh reviewer + user merge; migration registry+checksum+CI+CODEOWNERS+serialized; evidence commit-SHA ngoài plan.

## 14. Issue disposition summary (`11`)
| Severity | Total | Accept | Partial | Reject | Defer-with-gate | Closed-no-change |
|---|---|---|---|---|---|---|
| CRITICAL | 1 | 1 | 0 | 0 | 0 | 0 |
| HIGH | 21 | 21 | 0 | 0 | 0 | 0 |
| MEDIUM | 8 | 8 | 0 | 0 | 0 | 0 |
| LOW | 1 | 0 | 0 | 0 | 1 | 0 |
| OBSERVATION | 3 | 0 | 0 | 0 | 0 | 3 |
| **Tổng** | **34** | **30** | **0** | **0** | **1** | **3** |

(Nhiều High mang tính "ACCEPT — REMOVE/RENAME/USER-CONFIRMED"; không có REJECT — không issue nào bị chứng minh sai bởi nguồn Approved.)

## 15. Remaining open decisions
- **before-P2:** B23 cookie/origin/proxy; B24 auth session/logout/revocation/key-rotation.
- **before-P3/P5:** B25 content-block/image/PDF policy.
- **before-P7:** SMTP/CAPTCHA provider; worker batch/timeout; recipient snapshot.
- **before-P8/P10:** canonical production domain/base URL/OG defaults.
- **before-P11:** RPO/RTO; content freeze/cutover; SPF/DKIM/DMARC; retention; discontinued-product policy.
- **B26** API compatibility/codegen (tooling P0, enforce P9–P11).
- **D11 redirect-delivery clarification** — cần user/architecture **ký** (`12` §8).

## 16. Business decisions không chặn P0
C1 retention · C2 duyệt logo · C3 email xác nhận khách · C4 redirect SP ngừng KD · C6 mức EN. **Chặn release:** C5 domain+SPF/DKIM/DMARC · C7 content owner (chặn CM) · C9 RPO/RTO+freeze.

## 17. Git blocker
`.git` rỗng → **R-25 OPEN BLOCKER trước P0**. R4 chỉ lập kế hoạch khôi phục; không chạy lệnh Git (D15).

## 18. Câu hỏi cụ thể cho Final Reconciliation (tìm issue còn lại)
1. Với D11 **Next-delivery** redirect (Next emit sau khi hỏi Nest resolver), còn edge case nào khiến redirect **không xảy ra trước render** (streaming SSR/caching/CDN)?
2. `packages/route-rules` (shared FE/BE) có nguy cơ rò business/DB logic sang frontend không? Ranh giới đủ chặt chưa?
3. Health probe registry incremental — có phase nào readiness vẫn báo green giả không?
4. Idempotency **fingerprint field** không có trong baseline Approved — giải pháp (header-only hash / bảng phụ 071+ / so payload runtime) nào an toàn nhất mà **không** đổi baseline 001–070?
5. Worker process riêng + in-process rate-limit (D9 single-instance) — có mâu thuẫn nào khi worker và API là hai process (rate-limit/lock state)?
6. P6A/P6B tách có còn phụ thuộc chéo ẩn (services↔projects↔posts↔documents) gây chặn song song không?
7. Critical path mới có bỏ sót fan-in nào (P8 sitemap phụ thuộc mọi published — có dài hơn product path không)?
8. Content migration CM2 "no production write without approval" — cơ chế enforce kỹ thuật (staging-only credential) đã đủ chưa?
9. Rollback P7 "email đã gửi không rollback" + at-least-once — có cần reconciliation/dedup report mạnh hơn không?
10. Generated-client/mixed-version (B26) — expand/contract có đủ cho breaking API change giữa Next và Nest cùng repo không?

## 19. Verdict Round 4
`PLAN v0.2 PROPOSED FOR FINAL RECONCILIATION` — không Critical/High chưa xử lý; còn OPEN (B23–B26, C1–C9), Git chưa khôi phục, D11 chưa ký → **chưa** đạt gate `07` C. **KHÔNG** Approved/Ready to Code/Planning Complete.
