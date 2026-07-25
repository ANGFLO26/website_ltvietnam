# RECOMMENDED PLAN DELTA — CODEX ROUND 3

**Mục đích:** chỉ ra thay đổi cần áp dụng khi Claude cập nhật plan sau audit. File này **không** viết lại plan và không sửa trực tiếp v0.1.  
**Priority:** P0 = phải sửa trước reconciliation/coding; P1 = phải có trong v1.0 trước affected phase/release; P2 = cải thiện tài liệu/operability.

---

## 1. Delta theo plan file

| Plan file | Section | Change required | Reason | Priority |
|---|---|---|---|---|
| `00_IMPLEMENTATION_PLAN_OVERVIEW.md` | §3 Bộ file | Đổi “DAG 26 module” thành “25 application modules + infrastructure/workers/shared services” | Khớp Approved `06` §I | P0 |
| `00_IMPLEMENTATION_PLAN_OVERVIEW.md` | §4 Strategy | Ghi P4–P7 có thin Admin/Public deliverable + browser E2E; P9/P10 là completion; hoặc đổi tên strategy thành domain API slices + staged FE | Hiện chưa phải vertical slice đầy đủ | P0 |
| `00_IMPLEMENTATION_PLAN_OVERVIEW.md` | §5 Critical path | Bỏ `P5→P10→P8`; dùng path qua P6A/P6B→P8→P10; tách P7 parallel | Loại cycle lịch và phản ánh homepage/sitemap fan-in | P0 |
| `00_IMPLEMENTATION_PLAN_OVERVIEW.md` | §6 Phases | Tách P6A/P6B; đổi P8 thành “Web delivery: Navigation, Homepage, Redirects, SEO” (bỏ Search); ghi content migration parallel workstream | Dependency và scope chính xác | P0 |
| `00_IMPLEMENTATION_PLAN_OVERVIEW.md` | §7 Gate | Thêm gate Git repository hợp lệ, request topology, deployment topology, raw baseline policy, supported runtime | Root blockers hiện thiếu | P0 |
| `01_LOCKED_DECISIONS_AND_OPEN_QUESTIONS.md` | A2 | Sửa diễn giải 25 modules; không tính locale publication/worker/infra là module application mới | Inventory drift | P0 |
| `01_LOCKED_DECISIONS_AND_OPEN_QUESTIONS.md` | A17/A20 | Giữ quyết định Approved nhưng thêm note implementation ownership phải được chốt: Nest state/sitemap/robots, Next page metadata, redirect delivery | Tránh duplicate/route bypass | P0 |
| `01_LOCKED_DECISIONS_AND_OPEN_QUESTIONS.md` | B2 | **Tách thành hai quyết định:** runtime query/data access và raw SQL migration executor/history | Baseline SQL verified không được ORM regenerate | P0 |
| `01_LOCKED_DECISIONS_AND_OPEN_QUESTIONS.md` | B4 | Tách rõ 4 option Admin: Vite riêng; Next app riêng; cùng Next public; backend-rendered; không gọi SPA riêng là security boundary | Security/deploy comparison hiện đơn giản hóa quá mức | P0 |
| `01_LOCKED_DECISIONS_AND_OPEN_QUESTIONS.md` | B11/B12/B18/B19 | Thêm open decision gốc “deployment topology”; làm storage/cache/rate-limit/worker phụ thuộc nó | In-process/local disk không phù hợp mọi topology | P0 |
| `01_LOCKED_DECISIONS_AND_OPEN_QUESTIONS.md` | B19 | Khuyến nghị worker process riêng cùng codebase; thêm managed cron option; define shutdown/heartbeat/reaper | Reliability/operability | P0 decision; P7 build |
| `01_LOCKED_DECISIONS_AND_OPEN_QUESTIONS.md` | B21 | Loại Node 20; prefer Node 24 LTS nếu compatible, Node 22 fallback; cấm EOL runtime và pin version | Node 20 EOL tại ngày audit | P0 |
| `01_LOCKED_DECISIONS_AND_OPEN_QUESTIONS.md` | New B22 | Thêm “public request routing + redirect/SEO delivery owner” với routing matrix | CR-01 | P0 |
| `01_LOCKED_DECISIONS_AND_OPEN_QUESTIONS.md` | New B23 | Thêm cookie/API/admin/public origin + reverse proxy trusted IP/TLS topology | Auth, CORS, CSRF, rate limit phụ thuộc | P0/P2 |
| `01_LOCKED_DECISIONS_AND_OPEN_QUESTIONS.md` | New B24 | Thêm auth session/logout/revocation/key rotation policy | Test/security contract thiếu | Trước P2 |
| `01_LOCKED_DECISIONS_AND_OPEN_QUESTIONS.md` | New B25 | Thêm content block schema/sanitization/image/PDF processing policy | Product P5 cần validator trước P6 | Trước P3/P5 |
| `01_LOCKED_DECISIONS_AND_OPEN_QUESTIONS.md` | New B26 | Thêm API compatibility/codegen/deploy migration policy | Rollback P9/P10/P11 | P0 tooling |
| `01_LOCKED_DECISIONS_AND_OPEN_QUESTIONS.md` | New release decisions | Thêm content freeze/delta migration, canonical domain, backup RPO/RTO, content owner | Release/cutover chưa có owner | P1 trước release |
| `01_LOCKED_DECISIONS_AND_OPEN_QUESTIONS.md` | B6/B7/B15/B20 | Hạ thành implementation details trừ khi user/team có constraint | Không cần user chốt mọi library nhẹ | P1 |
| `02_STRATEGY_OPTIONS_AND_RECOMMENDATION.md` | §3 constraints | Bổ sung request topology, content migration, deploy compatibility và thin UI constraints | Strategy hiện chỉ xét DB/media | P0 |
| `02_STRATEGY_OPTIONS_AND_RECOMMENDATION.md` | §4.2 | Với từng P4–P7 ghi exact minimal Admin/Public route, acceptance, browser E2E | Chứng minh vertical slice | P0 |
| `02_STRATEGY_OPTIONS_AND_RECOMMENDATION.md` | §4.3 | Ghi P9/P10 là completion; P8 convergence; P7 parallel; content migration parallel P4–P11 | Sequence tối ưu hơn | P0 |
| `02_STRATEGY_OPTIONS_AND_RECOMMENDATION.md` | §4.4 | Thêm generated-client freshness/backward-compat and mixed-version smoke, không chỉ OpenAPI shape | Integration/rollback | P0/P1 |
| `03_MODULE_DEPENDENCY_GRAPH.md` | Header/§1 | Sửa module count; phân biệt application modules vs infrastructure/shared services | 25/26 mismatch | P0 |
| `03_MODULE_DEPENDENCY_GRAPH.md` | Config/logging/errors/DB | Thay cạnh bằng `config→logging/errors→DB` | Bootstrap direction | P0 |
| `03_MODULE_DEPENDENCY_GRAPH.md` | Auth/Users | Bỏ Users→Auth domain edge; Auth→UserAuthenticationQueryPort; guards ở composition | Loại cycle | P0 |
| `03_MODULE_DEPENDENCY_GRAPH.md` | Health | Thay hard dependency bằng probe registry incremental P2/P3/P7 và deployment profile | Readiness phase mismatch | P0 |
| `03_MODULE_DEPENDENCY_GRAPH.md` | Shared services | Đặt ContentBlock/ExternalVideo validator trước Products P5 | Backward dependency | P0 |
| `03_MODULE_DEPENDENCY_GRAPH.md` | Content | Tách P6A core/P6B relationships và thêm exact edges customer→project, category→post, service/project→post/document links | Song song an toàn | P0 |
| `03_MODULE_DEPENDENCY_GRAPH.md` | Navigation/Homepage/SEO | Thêm navigation configured-source; homepage→banners/media/pages/settings/industries; sitemap→route providers/settings; redirect→public router; bỏ P7 hard prerequisite | Missing/over-broad edges | P0 |
| `03_MODULE_DEPENDENCY_GRAPH.md` | Critical path | Thay path và ghi branch/convergence/bottleneck theo Audit §I | Cycle hiện tại | P0 |
| `04_PHASES_MILESTONES_AND_CRITICAL_PATH.md` | P0 | Thêm Git recovery/verification, deployment topology, public routing matrix, Node LTS, raw migration executor, worker decision, cookie/origin, codegen compatibility | P0 root decisions thiếu | P0 |
| `04_PHASES_MILESTONES_AND_CRITICAL_PATH.md` | P1 | Ghi baseline raw SQL 001–070 + manifest/checksum/history; không ORM regenerate; down chỉ disposable; future 071+; backup/restore | Migration safety | P0 |
| `04_PHASES_MILESTONES_AND_CRITICAL_PATH.md` | P1 seed | Tách production bootstrap/dev-demo/test fixtures; cấm fixed admin password; force reset | Security/scope | P0 |
| `04_PHASES_MILESTONES_AND_CRITICAL_PATH.md` | P2 | Bỏ Users CRUD; profile/auth only; sửa config order/auth port; health DB probe only; thêm auth race/replay/key tests | Design drift/dependency/test | P0 |
| `04_PHASES_MILESTONES_AND_CRITICAL_PATH.md` | P3 | Thêm ContentBlock/ExternalVideo validator, image/PDF resource limits, orphan/purge strategy, storage readiness | P5 dependency/security/rollback | P0 |
| `04_PHASES_MILESTONES_AND_CRITICAL_PATH.md` | P4 | Định nghĩa thin UI/E2E; chứng minh redirect chạy qua production-like topology; giới hạn taxonomy P0 list landing | Vertical slice/route risk | P0 |
| `04_PHASES_MILESTONES_AND_CRITICAL_PATH.md` | P5 | Thêm product relation concurrency/lost-update strategy; full thin Admin/Public product vertical; generated client gate | Nút thắt phải usable end-to-end | P0 |
| `04_PHASES_MILESTONES_AND_CRITICAL_PATH.md` | P6 | Tách P6A/P6B; reassign owners/files/tests; không coi mọi content độc lập | Dependency chéo | P0 |
| `04_PHASES_MILESTONES_AND_CRITICAL_PATH.md` | P7 | Worker process/lifecycle/health; idempotency payload mismatch; poison/fairness/timeout tests; P7 parallel rule | Reliability | P1 trước P7 |
| `04_PHASES_MILESTONES_AND_CRITICAL_PATH.md` | P8 | Đổi tên bỏ Search; thêm explicit Nest/Next/root-route ownership; ghi work bắt đầu P4 vs convergence P8 | Scope/topology | P0 |
| `04_PHASES_MILESTONES_AND_CRITICAL_PATH.md` | P9 | Xóa auto-save khỏi P0 work/E2E; ghi completion only; no Users CRUD/ecommerce fields render | Design drift | P0 |
| `04_PHASES_MILESTONES_AND_CRITICAL_PATH.md` | P10 | Ghi completion only; thêm locale mapping/hydration/download headers/responsive/a11y and redirect-before-render | Test/integration | P1 |
| `04_PHASES_MILESTONES_AND_CRITICAL_PATH.md` | P11 | Thêm content freeze/delta/cutover, mixed-version/blue-green, worker drain, forward-fix, rollback decision points | Release operability | P1 |
| `04_PHASES_MILESTONES_AND_CRITICAL_PATH.md` | Every rollback | Thay “revert code” bằng code revert/feature disable/forward fix/down/data repair/restore theo Audit §L | Rollback không thực tế | P1 |
| `04_PHASES_MILESTONES_AND_CRITICAL_PATH.md` | New parallel workstream | Thêm CM0–CM4 content migration P4–P11 với deliverables/owner/acceptance | Approved checklist chưa plan hóa | P1 |
| `05_MODULE_IMPLEMENTATION_MATRIX.md` | Row 2 Users | Xóa `/admin/users` CRUD; đổi thành Account profile/auth flows hoặc loại row khỏi business module coverage | P0 drift | P0 |
| `05_MODULE_IMPLEMENTATION_MATRIX.md` | Product/content rows | Thêm minimal Admin/Public deliverable + browser E2E per slice | Vertical proof | P0 |
| `05_MODULE_IMPLEMENTATION_MATRIX.md` | Search row/P8 | Ghi product search ở P5; no new search P8; site-wide P1 | Tránh duplicate/leak | P0 |
| `05_MODULE_IMPLEMENTATION_MATRIX.md` | New rows | Thêm public route/redirect delivery, content migration, worker lifecycle, generated-client/compatibility, backup/restore evidence | Missing cross-cutting coverage | P1 |
| `05_MODULE_IMPLEMENTATION_MATRIX.md` | Coverage statement | Không dùng 30 requirement rows để suy ra 26 modules; link 25-module inventory | Terminology | P0 |
| `06_TEST_AND_QUALITY_STRATEGY.md` | §§2–9 | Thêm toàn bộ mandatory tests ở Audit §K1 | Coverage gaps | P1 before affected phase |
| `06_TEST_AND_QUALITY_STRATEGY.md` | New §P0 vs defer | Phân loại explicit mandatory/conditional defer ở Audit §K2 | Không phải mọi test cùng gate | P1 |
| `06_TEST_AND_QUALITY_STRATEGY.md` | Contract tests | Thêm OpenAPI breaking change, generated client freshness, consumer/mixed-version smoke | Deploy rollback | P0 tooling/P1 |
| `06_TEST_AND_QUALITY_STRATEGY.md` | Evidence §11 | Chuyển evidence khỏi `planning/.../v0.1`; yêu cầu SHA/command/env/exit/raw log | Governance | P0 |
| `06_TEST_AND_QUALITY_STRATEGY.md` | Performance §9 | Thêm budget tạm P0/P5 và SLO infra P11 | Test đo được | P1 |
| `07_DEFINITION_OF_READY_AND_DONE.md` | DoR P0 | Thêm Git valid; topology/deployment/runtime/migration/worker decisions; public route matrix | Root blockers | P0 |
| `07_DEFINITION_OF_READY_AND_DONE.md` | DoR phase | Thêm content-block policy P3/P5, thin UI route per slice, content migration inputs, rollback mode | Phase readiness thiếu | P1 |
| `07_DEFINITION_OF_READY_AND_DONE.md` | DoD | Thêm generated-client freshness, backward compatibility, evidence provenance, task-level independent review | Quality governance | P0/P1 |
| `07_DEFINITION_OF_READY_AND_DONE.md` | Rollback DoD | Không yêu cầu production schema down mặc định; yêu cầu tested chosen strategy | Down có thể destructive | P1 |
| `08_AI_COLLABORATION_AND_FILE_OWNERSHIP.md` | Roles/phase table | Đổi “implementer≠reviewer per phase” thành per task/PR/file; fresh integration reviewer nếu cả hai sửa | Independence hiện không đủ | P0 |
| `08_AI_COLLABORATION_AND_FILE_OWNERSHIP.md` | New RACI | Thêm Implementer/Reviewer/Approver/Runner/Evidence owner như Audit §M | Owner thiếu | P0 |
| `08_AI_COLLABORATION_AND_FILE_OWNERSHIP.md` | Shared services | Giảm Claude bottleneck: một owner tại thời điểm, nhưng có explicit handoff/delegation; integration contracts freeze theo PR | Critical path capacity | P1 |
| `08_AI_COLLABORATION_AND_FILE_OWNERSHIP.md` | Migration | Registry/manifest/checksum/CI/CODEOWNERS/serialized allocation; not only one DB owner | Duplicate/drift | P0/P1 |
| `08_AI_COLLABORATION_AND_FILE_OWNERSHIP.md` | Git/evidence | Ghi repository currently invalid as P0 prerequisite; evidence path by commit/CI | Current workflow không chạy | P0 |
| `08_AI_COLLABORATION_AND_FILE_OWNERSHIP.md` | Handoff | Yêu cầu reviewer đọc code/test, rerun, raw evidence; AI cannot self-approve/merge | Hallucinated PASS | P0 |
| `09_RISK_REGISTER.md` | Add risks | Thêm routing-owner split, deployment topology, Node EOL, Git invalid, content migration/cutover, destructive rollback, worker shutdown, stale client/mixed version, seed leakage, image/PDF bomb | Risk register hiện thiếu root risks | P0/P1 |
| `09_RISK_REGISTER.md` | R-03 | Thêm Users CRUD và auto-save vào leakage signals | Hai leak thật | P0 |
| `09_RISK_REGISTER.md` | R-05 | Thêm raw baseline checksum/071+ rule/production forward-fix | Migration policy | P0 |
| `09_RISK_REGISTER.md` | R-20 | Thay mitigation “scaffold” bằng thin UI acceptance/E2E per slice | Scaffold không đủ | P0 |
| `10_CODEX_REVIEW_PACKAGE.md` | §§4–7 | Cập nhật strategy, DAG, critical path và module count sau correction | Package hiện lặp lỗi | P1 reconciliation |
| `10_CODEX_REVIEW_PACKAGE.md` | §§8–12 | Ghi disposition Round 3, không giữ open concern đã xác minh như câu hỏi mơ hồ | Audit traceability | P1 reconciliation |
| `PLAN_CHANGELOG.md` | New Round 3/Round 4 entry | Ghi issue accepted/rejected/partial, file/section thay đổi, không đổi trạng thái thành Approved trước gate | Audit trail | P0 |

---

## 2. Section cần thêm

1. `01`: Deployment Topology; Public Request Routing/SEO/Redirect Ownership; Auth Session Lifecycle; Content Processing Policy; API Compatibility/Codegen; Release/Cutover Decisions.
2. `03`: Probe-registration lifecycle; Public delivery dependency; P6A/P6B graph.
3. `04`: CM0–CM4 Content Migration Workstream; phase rollback mode table; thin UI deliverables.
4. `06`: Mandatory vs conditional-defer tests; mixed-version/contract compatibility; file/PDF resource exhaustion; content migration validation.
5. `08`: Task-level RACI; evidence provenance; migration registry/CI enforcement.
6. `09`: Risks routing split, topology, Git, runtime EOL, cutover, seed, worker shutdown, stale client.

---

## 3. Section/requirement cần xóa khỏi P0

- `users CRUD tối thiểu` và `/admin/users`.
- `auto-save nháp` trong P9 work/E2E.
- Từ `Search` trong tên P8 nếu không có task product-search integration cụ thể.
- Bất kỳ wording nào làm rich standard/application/industry detail page thành P0; giữ product-list taxonomy route thôi.
- Mọi implication ORM sẽ generate baseline 001–070.
- Mọi implication production rollback luôn chạy `down` hoặc Git revert là đủ.

---

## 4. Section cần đổi tên/tách/gộp/đảo

| Current | Recommended |
|---|---|
| P6 Content | P6A Core Content Entities + P6B Cross-module Relationships |
| P8 Navigation, Homepage, Redirects, SEO, Search | P8 Web Delivery: Navigation, Homepage, Redirects, SEO |
| P9 Admin Frontend | P9 Admin Completion |
| P10 Public Frontend | P10 Public Completion |
| P11 Integration...Release | P11 Content Delta, Integration, Hardening & Release |
| “P7 then P8” hard sequence | P7 parallel P6B/P8 partial; converge before P10/P11 |

Không cần gộp P7 với P8. Không nên đảo toàn bộ P7/P8; cần bỏ hard dependency và chạy song song theo prerequisites.

---

## 5. Dependency cần thêm/bỏ

### Bỏ

- `config → DB`.
- `users → auth` domain dependency.
- P2 health hard-check storage/outbox/email trước khi module tồn tại.
- P8 hard dependency vào P7 cho navigation/homepage/SEO.
- External video service chỉ tồn tại từ P6.

### Thêm/thay

- `config → logging/errors → DB`.
- `auth → UserAuthenticationQueryPort`; guards at app shell.
- `health registry → probes registered P2/P3/P7`.
- `ContentBlock/ExternalVideo policy → products + content` trước P5.
- `customers → projects`; `post_categories → posts`; services/projects → posts/document relationship stage.
- `navigation → configured-feature source`.
- `homepage → banners/media/pages/settings/industries + selected published modules`.
- `SEO sitemap → every public route provider + base URL/settings`.
- `redirect repository → public HTTP delivery layer` từ P4.
- `OpenAPI → generated client freshness/backward compatibility → FE deploy`.

---

## 6. Open decisions cần thêm và thời điểm

| Decision | Deadline | Owner |
|---|---|---|
| Deployment topology | Before P0 | User/Ops |
| Public routing/redirect/SEO owner | Before P0 | User/Architecture |
| Admin shape (same Next/separate Vite/etc.) | Before P0 | User |
| Node supported LTS | Before P0 | Tech lead/User |
| Raw migration executor vs runtime query builder | Before P0 | DB/Architecture |
| Cookie/origin/proxy trust | Before P2 | Security/Ops |
| Auth logout/revocation/key rotation | Before P2 | Security/User |
| Storage/persistence/backup | Before P3 | Ops/User |
| Content block/image/PDF processing | Before P3/P5 | Security/Architecture |
| Worker runtime/shutdown/health | Before P7; choose topology P0 | Ops/Backend |
| Canonical production base URLs | Before P8/P10 | User/Ops |
| Content migration owner/freeze/delta | Begin P4; final before P11 | User/Content owner |
| RPO/RTO/rollback decision points | Before P11 | User/Ops |

Implementation details không cần user chốt riêng nếu stack đã chọn: formatter/linter library, unit-test runner, logging library, naming/class layout, exact image variant names.

---

## 7. Tests cần thêm

Áp dụng toàn bộ danh sách ở `CODEX_ROUND3_AUDIT.md` §K. Tối thiểu phải bổ sung vào phase matrix:

- P2: key/cookie/logout/reset/CSRF/account-lock/proxy/CSP tests.
- P3: dimensions/decompression/PDF/EXIF/Unicode/concurrent duplicate/purge/orphan tests.
- P4: create/rename/chain/restore/locale slug concurrency; redirect-before-render.
- P5: primary category/replace-set/taxonomy race/self-link/duplicate relation/lost update.
- P7: shutdown/crash-after-SMTP/exhaustion/clock/timeout/reaper race/payload mismatch/recipient snapshot/poison/fairness.
- P8/P10: base URL/trailing slash/query order/pagination/404/410/sitemap/XML/structured escaping/locale mapping/hydration.
- P9/P10/P11: OpenAPI backward compatibility/generated-client freshness/mixed-version/mobile/a11y/download headers.
- CM workstream: counts/checksums/slug collision/redirect coverage/broken-link/delta idempotency.

---

## 8. Risks cần thêm

Suggested new risk IDs after existing R-22:

| Suggested ID | Risk | Initial rating |
|---|---|---|
| R-23 | Public request bypasses redirect middleware / duplicate SEO owner | H×H |
| R-24 | Deployment topology incompatible with local disk/in-process state | M×H |
| R-25 | Git metadata absent; collaboration/revert evidence impossible | H×H before P0 |
| R-26 | Node/runtime EOL or unsupported framework combination | M×H |
| R-27 | Old-site content/redirect migration incomplete at go-live | H×H |
| R-28 | Production rollback destroys data or cannot undo side effects | M×H |
| R-29 | Worker killed with in-flight jobs / stale locks | M×H |
| R-30 | Generated client/API versions incompatible | M×H |
| R-31 | Demo/test seed or default admin credential reaches production | L×H |
| R-32 | Image/PDF resource exhaustion or active-content exposure | M×H |

---

## 9. Reconciliation acceptance checklist

Plan correction chỉ sẵn sàng reconciliation khi:

- [ ] `CR-01` có topology/routing matrix và owner duy nhất.
- [ ] DAG không còn config đảo/auth cycle/readiness phase mismatch.
- [ ] P4–P7 có thin UI DoD hoặc strategy được đổi tên trung thực.
- [ ] Critical path/phase sequence không còn P10→P8 cycle.
- [ ] P6A/P6B và P7 parallel prerequisites rõ.
- [ ] B2 được tách; raw baseline/checksum/071+ policy rõ.
- [ ] Deployment/worker/runtime/storage decisions được stage.
- [ ] Users CRUD và auto-save bị loại khỏi P0.
- [ ] Node 20 bị loại.
- [ ] Git repository integrity trở thành P0 prerequisite.
- [ ] Content migration workstream + owner + acceptance có trong plan.
- [ ] Test, rollback, compatibility và RACI/evidence gaps có correction.
- [ ] Plan vẫn giữ `PROPOSED` cho tới Round 5 và không bắt đầu code.
