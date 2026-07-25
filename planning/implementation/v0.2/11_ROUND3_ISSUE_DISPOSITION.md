# 11 — ROUND 3 ISSUE DISPOSITION

**Plan version:** v0.2 · **Trạng thái:** PROPOSED FOR FINAL RECONCILIATION · **Ngày:** 2026-07-22
**Nguồn:** `reviews/codex-round3/` (`CODEX_ROUND3_AUDIT.md`, `ISSUE_REGISTER.md`, `RECOMMENDED_PLAN_DELTA.md`).

Disposition chỉ dùng: **ACCEPT** · **PARTIALLY ACCEPT** · **REJECT** · **DEFER WITH GATE** · **CLOSED — NO CHANGE**.
Quy tắc: không bỏ sót issue; REJECT phải chỉ nguồn Approved/logic; không reject vì severity; issue người dùng đã chốt (D1–D16) phản ánh đúng quyết định; mọi Critical/High có correction hoặc gate.

> "USER-CONFIRMED (Dx)" = correction đã được người dùng chốt qua quyết định Dx ở đề bài Round 4 §III.

---

## PHẦN A — CRITICAL

| Issue | Sev | Disposition | Lý do | File v0.2 | Section | Cách kiểm tra |
|---|---|---|---|---|---|---|
| CR-01 Public routing/redirect/SEO không có topology chạy được | CRITICAL | **ACCEPT** — USER-CONFIRMED (D7/D10/D11/D12/D13) | Đúng: reverse proxy gửi `/san-pham/{slug}` tới Next thì Nest middleware không thấy request. Giải bằng routing matrix + Nest authoritative state + Next delivery adapter + sitemap/robots ở Nest | `12` toàn bộ; `01` B22; `04` P8; `03` public delivery | 12 §2/§3/§4/§8 | Routing matrix tồn tại; route-resolution contract; redirect-before-render test (`06`); D11 clarification flag |

---

## PHẦN B — HIGH (HI-01..21)

| Issue | Sev | Disposition | Lý do | File v0.2 | Section | Cách kiểm tra |
|---|---|---|---|---|---|---|
| HI-01 Config phụ thuộc DB (đảo bootstrap) | HIGH | **ACCEPT** | Đúng: DB connection cần config+logging trước. Sửa chiều `config → logging/errors → DB pool → modules`; tách DB-backed Settings khỏi bootstrap Config | `03` §1; `04` P2 | 03 §1, §Bootstrap | Grep không còn `config → DB`; DAG có chiều mới |
| HI-02 Auth↔Users cycle | HIGH | **ACCEPT** | Đúng: guard không phải domain dep. Users expose `UserAuthenticationQueryPort`; Auth một chiều; guard ở composition; bỏ Users→Auth | `03` §Auth; `04` P2 | 03 Auth/Users | Grep không còn Users→Auth; port tồn tại |
| HI-03 Readiness Done trước storage/outbox/email | HIGH | **ACCEPT** | Đúng P2/P3/P7 lệch. Probe registry incremental: DB(P2)/storage(P3)/worker+email(P7); deployment profile khai báo required | `03` health; `04` P2/P3/P7; `07` DoD | 03 Health registry | Probe registry theo phase; missing required probe = not ready |
| HI-04 External video validator sau consumer P5 | HIGH | **ACCEPT** | Đúng: Product P5 dùng video. Chuyển ContentBlock/ExternalVideo/Sanitization vào P3 (shared content security), dùng lại P5/P6 | `03` shared services; `04` P3/P5 | 03, 04 P3 | Validator ở P3 DoD; P5 dùng lại |
| HI-05 P4–P7 chưa có thin UI deliverable | HIGH | **ACCEPT** — USER-CONFIRMED (D2) | Đúng: FE dồn P9/P10. Mỗi P4–P7 có minimal Admin/Public + browser E2E; P9/P10 = completion | `00` §4; `02` §4.2; `04` P4–P7; `05` | 02 §4.2 | Mỗi slice có thin UI route + E2E DoD |
| HI-06 Critical path P10 trước P8 (cycle) | HIGH | **ACCEPT** | Đúng cycle lịch. Path mới P0→P1→P2→P3→P4→P5→P6A→P6B→P8→P10→P11; P7 parallel | `00` §5; `03` §3; `04` sequence | 00 §5/§6 | Grep không còn P10→P8; sequence khớp |
| HI-07 P6 dependency chéo giao song song sai | HIGH | **ACCEPT** | Đúng: projects↔customers, posts↔categories, documents↔posts... Tách P6A core/P6B relationships; thứ tự customers/post_categories trước consumers | `03` content; `04` P6A/P6B | 03 P6A/P6B graph | P6A/P6B tồn tại; edges chính xác |
| HI-08 Deployment topology không phải open decision gốc | HIGH | **ACCEPT** — USER-CONFIRMED (D7) | Đúng: local disk + in-process + "multi-instance safe" mâu thuẫn. Chốt single persistent host; storage/cache/rate-limit/worker phụ thuộc topology; **không tuyên bố multi-instance safe** (D9) | `01` B11→topology; `12` §1; `09` R-24 | 12 §1 | Topology decision gốc; D9 single-instance caveat |
| HI-09 Worker thiếu lifecycle/shutdown/health/reaper | HIGH | **ACCEPT** — USER-CONFIRMED (D6) | Đúng. Worker **process riêng** cùng codebase; drain/lease/heartbeat/reaper/stop-claim/backoff/structured log | `01` B19→worker; `04` P7; `09` R-29 | 04 P7 | Worker lifecycle contract; in-process = phương án đã-không-chọn |
| HI-10 B2 gộp runtime query + migration (nguy cơ regenerate baseline) | HIGH | **ACCEPT** — USER-CONFIRMED (D4/D5) | Đúng. Tách: Kysely runtime (B2a) + raw SQL migration executor/history/checksum (B2b); baseline 001–070 không ORM-regenerate; 071+ sau freeze | `01` B2a/B2b; `04` P1; `08` migration | 01 B2a/B2b | Grep không có ORM-generate baseline; checksum policy |
| HI-11 Seed production/demo/test trộn | HIGH | **ACCEPT** | Đúng. 3 pipeline: production bootstrap (one-time admin, secret, force reset, no fixed pw), dev/demo (PAC/Herzog/ASTM), test fixtures (isolated/teardown) | `04` P1; `07` P1 DoD | 04 P1 §Bootstrap/Seed | 3 pipeline tách; no fixed admin password |
| HI-12 Thiếu content migration workstream | HIGH | **ACCEPT** — USER-CONFIRMED (D14) | Đúng: Approved `03` §XX + `06` §XII có checklist. Thêm CM0–CM4 song song P4–P11 + owner/acceptance | `13` toàn bộ; `04` parallel; `09` R-27 | 13 | CM0–CM4 với owner/gate |
| HI-13 Rollback chủ yếu "revert code" | HIGH | **ACCEPT** | Đúng: P3 file, P4–P6 data, P7 email, P8 cache không undo bằng Git. Phase rollback matrix theo side-effect | `04` mỗi phase; `07` DoD; `08` | 04 rollback matrix | Grep "revert code" không phải rollback duy nhất |
| HI-14 Thiếu failure/concurrency/security/SEO/media/contract tests | HIGH | **ACCEPT** | Đúng. Bổ sung toàn bộ §K1; phân MANDATORY/CONDITIONAL/DEFERRED | `06` §K | 06 §2–9, §K | Test matrix mở rộng theo phase |
| HI-15 Users CRUD `/admin/users` ngoài Approved | HIGH | **ACCEPT — REMOVE SCOPE** | Đúng: Approved 1 admin, `06` không có endpoint, `07` chỉ Profile/Change-password. Bỏ CRUD; giữ `/auth/me`+profile+change-password | `04` P2; `05` row 2; `07`; `09` R-03 | 04 P2 | Grep không còn `/admin/users` active |
| HI-16 Auto-save nháp vào P0 | HIGH | **ACCEPT — REMOVE SCOPE** | Đúng: ADR-006 xếp P1; P0 chỉ unsaved warning. Xóa auto-save khỏi P9; giữ manual save + warning | `04` P9; `07`; `09` R-03 | 04 P9 | Grep auto-save chỉ ở P1/history |
| HI-17 Node 20/22 lỗi thời | HIGH | **ACCEPT** — USER-CONFIRMED (D16) | Đúng: Node 20 EOL. Node 24 LTS preferred (sau compat test), 22 fallback, cấm EOL, pin toolchain+CI | `01` B21 | 01 B21 | Grep Node 20 chỉ nhắc EOL |
| HI-18 `.git` rỗng, repo không hợp lệ | HIGH | **ACCEPT — ENVIRONMENT BLOCKER** — USER-CONFIRMED (D15) | Đúng: 2 lệnh git fatal. Git integrity = P0 prerequisite; chỉ lập kế hoạch khôi phục (không chạy lệnh Git) | `04` P0; `08` Git; `09` R-25 | 04 P0 §Git | R-25 OPEN BLOCKER; checklist P0 |
| HI-19 Reviewer independence chỉ ở phase | HIGH | **ACCEPT** | Đúng: C+X cùng implement rồi review chéo. RACI task/PR-level; fresh integration reviewer; AI không approve PR mình sửa; user merge authority | `08` RACI | 08 §RACI | Bảng RACI task-level |
| HI-20 Concurrency ngoài outbox thiếu | HIGH | **ACCEPT** | Đúng: thiếu primary-category/replace-set/archive/payload mismatch. Chốt lock/optimistic + idempotency mismatch semantics; DB-real tests | `06` concurrency; `04` P4/P5/P7 | 06 §5, §K | Concurrency test list; lock strategy chốt trước P5 |
| HI-21 Thiếu backward-compat/generated-client/mixed-version gate | HIGH | **ACCEPT** — USER-CONFIRMED (B26) | Đúng: OpenAPI chỉ test shape hiện tại. CI breaking-change + client freshness + consumer smoke + expand/contract + blue/green | `01` B26; `06` contract; `08`; `04` P9–P11; `09` R-30 | 06 §Contract | CI gate mô tả |

---

## PHẦN C — MEDIUM (ME-01..08)

| Issue | Sev | Disposition | Lý do | File v0.2 | Section | Cách kiểm tra |
|---|---|---|---|---|---|---|
| ME-01 25/26 module không nhất quán | MEDIUM | **ACCEPT** | Approved `06` §I = 25 module. Ghi **25 application modules**; infra/worker/services đếm riêng | `00`; `01` A2; `03` header; `05` | 00 §3, 03 §1 | Grep không "26 module" active |
| ME-02 P8 tên "Search" nhưng không search mới | MEDIUM | **ACCEPT — RENAME** | Product search ở P5; site-wide P1. Đổi P8 = "Web Delivery: Navigation, Homepage, Redirects, SEO" | `00`; `04` P8; `05` | 04 P8 | Grep P8 không "Search" |
| ME-03 Navigation/Homepage/SEO thiếu/over-broad edges | MEDIUM | **ACCEPT** | Navigation configured-source; homepage→banners/media/pages/settings/industries; sitemap→route providers+base URL; bỏ P7 hard-edge | `03` P8 edges; `04` P8 DoR | 03 §nav/home/seo | Edges chính xác |
| ME-04 Taxonomy landing P0/P1 mơ hồ | MEDIUM | **ACCEPT — CLARIFY** | P0 chỉ product-list landing theo taxonomy URL; rich taxonomy detail = P1 | `04` P4; `05` | 04 P4 out-of-scope | Ghi rõ list-only |
| ME-05 Open decisions không staged; implementation-detail đẩy cho user | MEDIUM | **ACCEPT — RECLASSIFY** | Stage before-P0/before-phase/release/impl-detail; hạ B6/B7/B15/B20 xuống detail; thêm decisions thiếu | `01` §staging | 01 §4 staging | Bảng deadline |
| ME-06 Một DB owner chưa đủ chống trùng số/checksum | MEDIUM | **ACCEPT** | Registry + manifest/checksum + CI (duplicate/non-monotonic/drift) + CODEOWNERS + serialized allocation PR | `08` migration | 08 §Migration | CI rule mô tả |
| ME-07 Evidence dưới `v0.1/` | MEDIUM | **ACCEPT — MOVE** | Plan versioned bị mutate. Chuyển `implementation/evidence/<sha>/<phase>/` hoặc CI artifact; plan chỉ link index | `06` §11; `08` | 06 §11 | Grep evidence không dưới v0.1/v0.2 |
| ME-08 Performance threshold chỉ P11 | MEDIUM | **ACCEPT** | Budget tạm P0/P5; SLO infra P11. Ghi PRELIMINARY ENGINEERING BUDGET | `06` §9; `04` P5 DoD | 06 §9 | Budget tạm tồn tại |

---

## PHẦN D — LOW / OBSERVATION

| Issue | Sev | Disposition | Lý do | Cách kiểm tra |
|---|---|---|---|---|
| LO-01 Evidence không ghi minor 16.14; note STATIC cũ trong Approved | LOW | **DEFER WITH GATE** | Không làm plan sai; PASS tổng thể đủ. **Không sửa Approved trong R4.** Gate: vòng verify sau in `server_version`/`psql --version`; dọn note STATIC qua doc-change process riêng | `09` (ghi nhận); gate ở release doc process |
| OBS-01 Plan status đúng proposed | OBS | **CLOSED — NO CHANGE** | Tích cực; v0.2 giữ PROPOSED FOR FINAL RECONCILIATION | Header mọi file |
| OBS-02 Working docs khớp approved archive (11/11 SHA) | OBS | **CLOSED — NO CHANGE** | Nguồn audit toàn vẹn; không action | — |
| OBS-03 Không leak site-wide search/facet/audit-UI/scheduled/video-upload/inquiry-UI/ecommerce-UI/app-tree | OBS | **CLOSED — NO CHANGE** | Giữ explicit out-of-scope | `04` out-of-scope |

---

## PHẦN E — 18 Round-2 concern (đối chiếu)

Tất cả 18 concern Codex xác nhận (CONFIRMED/PARTIALLY) đã ánh xạ vào CR-01/HI/ME ở trên và **ACCEPT**: (1)→CR-01; (2)→HI-06; (3)→HI-05 (PARTIALLY→thin UI DoD); (4)→HI-01; (5)→HI-02; (6)→HI-03; (7)→HI-04; (8)→HI-07; (9)→HI-08; (10)→HI-15; (11)→HI-16; (12)→HI-12; (13)→ME-01; (14)→ME-02; (15)→HI-10; (16)→HI-11; (17)→ME-07; (18)→HI-18. Không concern nào bị REJECT.

---

## PHẦN F — Câu trả lời cho §P "Questions for Claude"

1. **Request `/san-pham/{slug}` đi qua process nào, redirect thực thi ở đâu?** → Reverse proxy → Next (public route); Next gọi Nest route-resolution contract **trước render**; nếu `result=redirect` → Next emit 301/302 trước render. Nest authoritative cho redirect record/validation/loop-prevention (`12` §3/§4; **D11**).
2. **Vì sao P10 trước P8?** → Đó là **lỗi v0.1**, đã sửa: critical path mới P8 (web delivery) **trước** P10 (public completion) (HI-06).
3. **Thin deliverable P4–P7?** → `02` §4.2 + `04` mỗi phase: minimal Admin create/edit/publish + minimal Public route + browser E2E (HI-05).
4. **Config→DB & Auth↔Users cycle?** → Sửa `config→logging→DB` (HI-01); `Auth→UserAuthenticationQueryPort`, guard ở composition (HI-02).
5. **P2 `/ready` DoD khi storage/outbox chưa có?** → Probe registry: P2 chỉ DB/config probe; storage(P3)/worker+email(P7) đăng ký sau (HI-03).
6. **P5 validate external_video bằng gì?** → Shared validator chuyển về **P3** (HI-04).
7. **P6 song song services/projects/posts/documents?** → Tách P6A core / P6B relationships; thứ tự dependency (HI-07).
8. **Nguồn nào cho `/admin/users` + auto-save P0?** → **Không có** — cả hai bị loại khỏi P0 (HI-15/16).
9. **Baseline raw SQL hay ORM-regenerate? 071+?** → Raw SQL + checksum (D5); thiếu index phát hiện ở P5 → **071+**, không sửa 001–070 (HI-10).
10. **Tạo admin không mật khẩu cố định? Chặn demo/test seed prod?** → One-time bootstrap command + secret/force-reset; 3 pipeline tách; demo never prod (HI-11).
11. **Vì sao content migration chỉ là câu hỏi?** → Đã sửa: workstream CM0–CM4 (HI-12/D14).
12. **Rollback ngoài Git revert?** → Phase rollback matrix theo side-effect (HI-13).
13. **Ai review integration PR khi cả C+X sửa?** → Fresh reviewer/ChatGPT + user merge; AI không approve PR mình sửa (HI-19).
14. **Vì sao 26 module?** → Lỗi thuật ngữ; chuẩn hóa **25** (ME-01).
