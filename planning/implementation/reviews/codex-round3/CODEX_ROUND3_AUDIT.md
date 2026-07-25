# CODEX ROUND 3 — INDEPENDENT TECHNICAL AUDIT

**Dự án:** Website LT Vietnam  
**Đối tượng audit:** Implementation Plan v0.1  
**Ngày audit:** 2026-07-22  
**Vai trò:** Independent technical auditor; không phê duyệt plan, không triển khai code  
**Kết luận:** `PLAN NEEDS CORRECTIONS BEFORE RECONCILIATION`

---

## A. Executive verdict

Plan v0.1 có nền tảng tốt: bám khá sát 13 ADR, nhận diện đúng PostgreSQL baseline 001–070, locale publication, slug lifecycle, media RESTRICT, filter OR/AND, outbox at-least-once và phần lớn ranh giới P0/P1/Future. Plan **khả thi sau chỉnh sửa**, không thuộc loại `PLAN NOT VIABLE`.

Tuy nhiên plan chưa sẵn sàng để reconciliation thành v1.0 vì còn:

- **1 Critical:** không có topology request thực tế và single owner cho redirect/SEO khi Next.js phục vụ URL công khai nhưng NestJS được giao redirect middleware/SEO resolver.
- **21 High:** DAG có chiều sai/vòng phụ thuộc; readiness xuất hiện trước dependency; external video validator đến muộn; “vertical slice” chưa có thin UI deliverable; phase order mâu thuẫn critical path; P6 chưa thể song song như mô tả; deployment/worker topology chưa chốt; migration/seed/rollback chưa an toàn; content migration chưa có workstream; test còn nhiều lỗ hổng; Users CRUD và auto-save làm rò scope; Node 20 đã EOL; `.git` không phải repository hợp lệ; RACI/review independence chưa đủ; concurrency và compatibility còn thiếu.
- **8 Medium** và một số observation về số module, tên P8 Search, dependency P8, taxonomy landing, staging open decisions, migration registry, evidence path và performance thresholds.

Các kết luận trên được hình thành từ việc đọc plan và đối chiếu nguồn Approved trước khi phân loại 18 candidate concerns Round 2.

### Gate đề xuất

Không bắt đầu coding cho tới khi tối thiểu các issue `CR-01`, `HI-01`–`HI-11`, `HI-15`–`HI-18` có correction/disposition được người có thẩm quyền chốt. Content migration, rollback, test/RACI và compatibility có thể không chặn bootstrap kỹ thuật, nhưng phải được đưa vào v1.0 trước khi plan được reconciliation.

---

## B. Files inspected

### B1. Inventory plan

Đã đọc đủ 12/12 file:

1. `00_IMPLEMENTATION_PLAN_OVERVIEW.md`
2. `01_LOCKED_DECISIONS_AND_OPEN_QUESTIONS.md`
3. `02_STRATEGY_OPTIONS_AND_RECOMMENDATION.md`
4. `03_MODULE_DEPENDENCY_GRAPH.md`
5. `04_PHASES_MILESTONES_AND_CRITICAL_PATH.md`
6. `05_MODULE_IMPLEMENTATION_MATRIX.md`
7. `06_TEST_AND_QUALITY_STRATEGY.md`
8. `07_DEFINITION_OF_READY_AND_DONE.md`
9. `08_AI_COLLABORATION_AND_FILE_OWNERSHIP.md`
10. `09_RISK_REGISTER.md`
11. `10_CODEX_REVIEW_PACKAGE.md`
12. `PLAN_CHANGELOG.md`

Kết quả integrity:

- Đủ 12 file.
- Cả 12 file đều thể hiện trạng thái hiện hành `PROPOSED FOR CROSS-REVIEW`.
- Không file nào tự nhận trạng thái hiện hành `READY TO CODE`, `APPROVED` hoặc `IMPLEMENTATION STARTED`.
- Các cụm `APPROVED FOR IMPLEMENTATION` trong `07`/changelog chỉ là gate tương lai, không phải trạng thái hiện hành.

### B2. Nguồn sự thật Approved

Đã đối chiếu 11/11 file `doc/00`–`doc/10`. `doc/00` và `doc/09` xác nhận version 1.2.1, trạng thái Approved/READY FOR IMPLEMENTATION. Hash SHA-256 của toàn bộ 11 file working copy **khớp** bản `doc/archive/releases/v1.2.1-approved/` và `RELEASE_MANIFEST.md`.

### B3. SQL evidence

Đã kiểm tra:

- `doc/verify/schema_up.sql`
- `doc/verify/schema_down.sql`
- `doc/verify/verify_checks.sql`
- `doc/verify/run_verification.ps1`
- `doc/verify/execution/POSTGRESQL16_EXECUTION_RESULT.md`
- `doc/verify/execution/postgresql16_execution.log`

Raw log xác nhận: 63 bảng, 3 extensions, 23 triggers, enum/CHECK, unique, FK, migration 001→070, rollback 070→001, lần chạy thứ hai và cleanup đều PASS. Evidence ghi “PostgreSQL 16”, nhưng không ghi output exact server minor version `16.14`; xem `LO-01`.

### B4. Git read-only check

Hai lệnh bắt buộc đều đã chạy và đều thất bại:

```text
git -C "D:\Work\LTVN\Website" rev-parse --show-toplevel
git -C "D:\Work\LTVN\Website" status --short
fatal: not a git repository (or any of the parent directories): .git
```

Read-only inspection cho thấy `D:\Work\LTVN\Website\.git` là **directory rỗng**. Đây không phải một “environment quirk” đã được chứng minh; các khả năng hợp lý là metadata Git bị loại khi copy/export, repository chưa được khởi tạo, hoặc `.git` bị dọn dang dở. Không chạy `git init` hay lệnh sửa Git.

---

## C. Critical issues

### CR-01 — Public routing/redirect/SEO ownership không tạo thành một request topology chạy được

**Evidence**

- `01` B3 khuyến nghị Next.js public; B4 khuyến nghị Admin React/Vite.
- `04` P8 giao redirect middleware, canonical/robots resolver, sitemap/robots cho backend; P10 giao Next/public FE render `<head>`.
- `06_KIEN_TRUC_BACKEND_VA_API.md` §I, §IX, §XII khóa `redirects` middleware “phục vụ trước router” và backend sinh sitemap/robots.
- ADR-011 §6 khóa frontend sinh title/meta/canonical/robots/OG/hreflang.

Nếu reverse proxy gửi `/san-pham/{slug}` trực tiếp tới Next.js, NestJS redirect middleware không thấy request và redirect đổi slug không chạy. Nếu cả Nest và Next cùng quyết định canonical/robots/hreflang, logic dễ lệch. Nếu cả hai cùng phục vụ sitemap/robots, route ownership xung đột. Plan cũng chưa xác định 404 locale, redirect trước render, canonical host và structured data được quyết định ở đâu.

**Impact**

Kiến trúc có thể build thành công nhưng chạy sai SEO/redirect ở production; URL cũ trả 404, canonical bị viết hai lần hoặc phản hồi không nhất quán. Đây là điểm chặn P0 vì ảnh hưởng topology deploy, contract API, reverse proxy, cache và E2E.

**Correction bắt buộc**

Thêm một open decision gốc và routing matrix trước P0. Nếu chọn Next.js, topology đề xuất là:

```text
Browser
  → Reverse proxy / edge
      → /api/v1/*, /health/*                         → NestJS
      → /sitemap.xml, /sitemap-*.xml, /robots.txt   → NestJS (đúng Approved)
      → public pages và /admin                       → Next.js
```

Nhưng redirect dữ liệu phải chạy **trước render**. Chọn minh bạch một trong hai:

1. **Backend-gateway:** mọi public page request đi qua Nest redirect gateway rồi mới proxy sang Next; khớp literal “backend middleware” nhưng thêm một hop.
2. **Next-delivery:** Next kiểm redirect qua internal Nest redirect-resolver và tự emit 301/302 trước render; Nest vẫn sở hữu dữ liệu/validation. Cách này đơn giản hơn cho Next, nhưng phải reconciliation rõ với câu “backend middleware” trong Approved, không được âm thầm đổi owner.

Phân quyền SEO đề xuất:

- Nest là nguồn authoritative cho trạng thái publish, cross-locale mapping, SEO title/description, social image và relative canonical/alternate path.
- Next là owner của HTTP page render và serialize `<head>`/JSON-LD.
- Sitemap/robots do Nest sinh và reverse proxy route đúng root path.
- Một package route rules dùng chung chỉ chứa route templates/enums; không tạo hai resolver nghiệp vụ độc lập.
- Contract tối thiểu cần: `entity_type`, `entity_id`, `route_kind`, `locale`, `canonical_path`, `robots`, `published_locales[{locale,path}]`, `title`, `description`, `social_image_url`, `structured_data_input`. Absolute base URL lấy từ environment đã chốt.

**Disposition đề xuất:** `ACCEPT — CORRECT BEFORE P0`.

---

## D. High issues

### HI-01 — Config bị mô tả phụ thuộc DB

`03` dòng 16 ghi `config | DB`. Chiều đúng phải là:

```text
config
  → logging/error primitives
  → database connection/pool
  → feature modules
```

`settings` trong DB là module runtime riêng, không được đồng nhất với bootstrap config. Nếu giữ cạnh hiện tại, bootstrap và recovery khi DB down có nguy cơ vòng/không log được lỗi kết nối. Blocks coding: P0/P2.

### HI-02 — Auth ↔ Users tạo cycle khái niệm và module import

`03` ghi Auth phụ thuộc Users, Users có soft dependency Auth. Guard/middleware không phải domain dependency. Đề xuất:

- Users/Identity sở hữu user repository và expose `UserAuthenticationQueryPort`.
- Auth phụ thuộc port đó; Auth sở hữu login/logout/reset/change-password.
- Admin guard đăng ký ở app composition/global layer; Users domain không import Auth.
- Không module nào gọi repository của module kia.
- Với P0 một tài khoản, `/auth/me` + profile/change-password đủ; không cần Users CRUD.

Blocks coding: P2.

### HI-03 — `/health/ready` xuất hiện trước storage/outbox/email

P2 có `/ready`, P3 mới có storage và P7 mới có worker/outbox/email. P2 không thể đồng thời Done và kiểm đủ dependency như Approved. Cần probe registry/lifecycle:

- P2: endpoint shell + DB/config probe.
- P3: đăng ký storage read/write probe.
- P7: worker heartbeat/backlog + email configuration/provider policy.
- Deployment profile khai báo probe nào là required; dependency required nhưng chưa đăng ký phải làm readiness fail.
- Không ping SMTP thật ở mọi request; dùng config validity + recent worker/provider signal.

Blocks coding: P2 DoD.

### HI-04 — External video validator được tạo sau consumer đầu tiên

Product content ở P5 cho phép `external_video`, test P5 cũng yêu cầu validate, nhưng shared service nằm P6. Đây là backward dependency hoặc dẫn tới implementation tạm/duplicate. Chuyển `ContentBlockSchema/ExternalVideoValidator/SanitizationPolicy` vào P2/P3 hoặc đầu P5, rồi dùng lại P6.

Blocks coding: P5.

### HI-05 — P4–P7 chỉ “partially vertical”, chưa có thin UI DoD

Mỗi phase liệt kê Admin/Public nhưng thường ghi “scaffold, hoàn thiện P9/P10”. Acceptance chủ yếu backend. E2E có vẻ đi qua UI nhưng không định nghĩa màn tối thiểu, route nào usable, owner, hay artefact trình diễn. Vì vậy plan chạm các lớp nhưng chưa bảo đảm `DB → API → Admin tối thiểu → Public tối thiểu → browser E2E`.

Chọn một trong hai cách và ghi nhất quán:

- **Khuyến nghị:** giữ tên Hybrid nhưng mỗi P4–P7 có thin UI deliverable + browser E2E; P9/P10 chỉ là completion/hardening.
- Hoặc đổi tên thành **foundation + domain API slices + staged FE integration**, không gọi P4–P7 là vertical slices.

Blocks coding: phase definition P4.

### HI-06 — Critical path mâu thuẫn phase order và bỏ sót fan-in content

`00`/`03` mô tả `P5 → public product pages (P10) → P8 SEO/redirect`, trong khi phase order là P8 → P9 → P10 và P10 phụ thuộc SEO P8. Đây là cycle ở mức lịch. Ngoài ra homepage/sitemap fan-in vào P6 content có thể dài hơn product path.

Critical path hợp lý hơn:

```text
P0 decisions/Git → P1 raw DB baseline → P2 core → P3 media/content policy
→ P4 taxonomy → P5 product thin vertical
→ P6A content core → P6B relationships
→ P8 homepage/sitemap/web delivery → P10 public completion
→ P11 content cutover/hardening/release
```

P7 chạy song song sau P5 + service core; Admin workstream chạy liên tục và hội tụ P9.

### HI-07 — P6 song song không an toàn nếu chưa tách core và relationships

Dependencies thật:

- `services` core không cần products, nhưng relations cần products/brands/industries/documents.
- `projects` core cần customers; relations cần products/services/brands.
- `posts` cần post_categories; relations cần projects/services/products/brands.
- `documents` core cần media; relations cần posts/services/products/brands.

Phân công C/X hiện tại khiến hai người đồng thời cần service/project/post/document contract và shared validators. Tách:

- **P6A Core content entities:** pages, customers, offices, post_categories; core services/documents/posts/projects theo thứ tự mềm.
- **P6B Cross-module relationships:** các link table, replace-set transaction và integration tests.

### HI-08 — Deployment topology chưa phải open decision gốc

Phải chốt trước các B12/B18/B19:

| Topology | Local disk | In-process cache/rate limit | In-process worker | Readiness/deploy |
|---|---|---|---|---|
| Single persistent instance | Có thể | Có thể chấp nhận | Có thể, nhưng shutdown phải rõ | Đơn giản; single point |
| Multi-instance containers | Không nên; dùng object storage | Không bảo đảm global limit | Mọi web instance chạy scheduler là rủi ro | Cần worker riêng, migration job, compatible deploy |
| Serverless/stateless | Không | Không bền | Không phù hợp | Cần managed job/queue/object storage/pooler |

Không có quyết định này thì khuyến nghị “local disk + in-process cache/rate-limit + in-process worker nhưng an toàn multi-instance” tự mâu thuẫn.

### HI-09 — Worker runtime chưa có lifecycle/reliability contract

So sánh:

| Phương án | Reliability | Multi-instance/shutdown | Complexity | Kết luận MVP |
|---|---|---|---|---|
| Scheduler trong web | Trung bình/thấp | Drain khó; scale web kéo theo worker | Thấp | Chỉ single-instance có chấp nhận rủi ro |
| Worker process riêng, cùng codebase | Cao | Drain/scale/health độc lập; vẫn dùng SKIP LOCKED | Vừa | **Khuyến nghị** |
| Queue framework + Redis | Cao | Tốt nhưng thêm dual infrastructure | Cao | Defer nếu chưa cần Redis |
| Managed cron/job | Khá | Phụ thuộc platform; latency theo cadence | Vừa | Alternative nếu platform hỗ trợ |

At-least-once semantics không đổi. Cần define signal shutdown, stop claim, lease timeout, in-flight completion, exit timeout, heartbeat và reaper ownership.

### HI-10 — B2 gộp runtime data access và migration, đe dọa baseline đã verify

Baseline 001–070 là SQL đã execution-tested. P1 dùng cụm “viết migration 001–070” và B2 gộp ORM/query builder/migration tool, tạo khả năng ORM tái sinh schema khác baseline.

Tách quyết định:

- **Data access runtime:** Kysely hoặc Drizzle/Kysely SQL-first; raw SQL cho SKIP LOCKED/filter đặc thù.
- **Migration executor/history:** chạy raw SQL 001–070 được trích từ baseline verified; lưu manifest/checksum; không ORM introspect rồi generate lại.

Sau shared environment đầu tiên, thiếu index/constraint phát hiện ở P5 phải dùng **071+**, không sửa 001–070. Baseline `down` chỉ dùng DB disposable/test; production ưu tiên forward fix/restore.

### HI-11 — Seed production, demo và test fixture bị trộn

P1 đưa admin, settings, standards mẫu và FK/CHECK fixtures vào “seed tối thiểu”; P4/P5 đưa PAC/Herzog/ASTM/sản phẩm mẫu nhưng không định danh environment.

Tách bắt buộc:

- **Production bootstrap:** tạo admin đầu tiên qua one-time command/secret, không mật khẩu cố định, force password change; settings bắt buộc không chứa secret mặc định.
- **Development/demo:** PAC, Herzog, ASTM D86, products/content mẫu; không chạy production.
- **Test fixtures:** tạo/xóa cô lập theo test/transaction/schema.

### HI-12 — Thiếu workstream migration nội dung website cũ

Approved đã có inventory/checklist ở `03` §XX và `06` §XII. Plan không loại trừ công việc này nhưng chỉ nêu thành câu hỏi trong review package. Thiếu URL inventory, crawl, mapping, import, media/PDF, VI/EN, SEO metadata, rights, delta cutover và validation.

Đề xuất workstream song song P4–P11; chi tiết ở mục N. Không chặn P0 bootstrap, nhưng chặn release.

### HI-13 — Rollback phần lớn phase không thể chỉ “revert code”

P3 tạo file; P4–P6 tạo/đổi slug, redirect, quan hệ và dữ liệu; P7 gửi email không thể thu hồi; P8 cache/redirect/SEO; P9/P10 có contract version; P11 có migration/data. Plan thiếu feature disable, forward fix, data repair, deploy compatibility, worker drain và backup restore theo phase. Chi tiết mục L.

### HI-14 — Test strategy có coverage rộng nhưng thiếu các failure mode bắt buộc

Thiếu các nhóm auth race/replay/key rotation, product replace-set race, redirect chain evolution, outbox shutdown/poison/fairness, image/PDF resource exhaustion, canonical normalization/XML escaping, generated-client freshness, hydration/mobile/a11y, download headers/range và locale mapping. Danh sách P0/defer ở mục K.

### HI-15 — `Users CRUD` là DESIGN DRIFT và P0 SCOPE LEAKAGE

Plan P2 và matrix đưa `users CRUD tối thiểu`, `/admin/users`. Approved chỉ có một admin, sidebar `Hồ sơ · Đổi mật khẩu`; API Admin không có `/admin/users`. Multi-user/role là Future. Sửa thành account profile + auth flows; muốn Users CRUD phải có scope/ADR change do user phê duyệt.

### HI-16 — Auto-save nháp là DESIGN DRIFT và P0 SCOPE LEAKAGE

Plan P9 đưa auto-save vào công việc và E2E. Approved scope/ADR/changelog xếp “Auto-save nâng cao (auto-save vào nháp)” vào P1; P0 chỉ bắt buộc cảnh báo rời trang khi chưa lưu. Xóa auto-save khỏi P0 acceptance/E2E.

### HI-17 — B21 còn cho phép Node 20 dù đã EOL tại ngày audit

Tại 2026-07-22, Node.js chính thức đánh dấu v20 EOL; v22 và v24 còn LTS. Không được chọn Node 20 cho dự án mới. Cập nhật B21 thành “Node 24 LTS nếu compatibility matrix của Nest/Next/dependency PASS; Node 22 LTS là fallback có thời hạn; cấm EOL runtime”. Nguồn: [Node.js previous releases](https://nodejs.org/en/about/previous-releases), [Node.js EOL](https://nodejs.org/en/about/eol).

### HI-18 — Git repository không hợp lệ

`.git` rỗng và cả hai lệnh bắt buộc thất bại. Điều này chặn branch/PR/CODEOWNERS/evidence-by-commit/tag/revert strategy ở `08`. P0 phải có task khôi phục/clone/khởi tạo repository **sau khi được user cho phép**, xác nhận remote/branch/history phù hợp và chạy lại hai lệnh. Audit này không sửa Git.

### HI-19 — “Implementer ≠ reviewer” chưa được bảo đảm ở mức task/PR

P4/P6/P8/P9/P10/P11 đều có C và X cùng implement rồi “review chéo”; không có independent integration reviewer khi cả hai đã chạm phase. Claude sở hữu gần như toàn bộ critical-path service, tạo bottleneck và self-context bias. Chưa chỉ rõ merge authority, test runner, evidence owner, generated OpenAPI owner, hay cách ngăn AI tự báo PASS.

Cần RACI task-level, CI raw evidence và rule: AI đã sửa file/logic không được approve PR đó; nếu cả C và X cùng sửa integration PR, dùng fresh reviewer/ChatGPT + user approval.

### HI-20 — Concurrency contract ngoài outbox còn thiếu

Plan chưa xử lý đầy đủ:

- hai request tạo/đổi cùng slug và A→B→C redirect chain;
- hai publish/replace-set cùng thay primary category;
- taxonomy archive/delete trong lúc publish;
- lost update giữa hai tab Admin;
- related product self/duplicate;
- Idempotency-Key tái dùng với payload khác.

Phải chốt row locking/optimistic concurrency/idempotency conflict semantics và test DB thật. Với cùng idempotency key nhưng payload khác, đề xuất trả 409/422 mã rõ thay vì im lặng trả response cũ.

### HI-21 — Thiếu deploy compatibility và generated-client gate

OpenAPI được gọi là hợp đồng nhưng chưa có:

- backward compatibility check;
- CI fail khi generated client stale;
- consumer-driven smoke giữa version API/Next/Admin;
- expand/contract migration;
- blue/green mixed-version window;
- rollback matrix khi frontend cũ gặp backend mới và ngược lại.

Điểm này liên kết trực tiếp rollback P9/P10/P11.

---

## E. Medium issues

### ME-01 — Số module 25/26 không thống nhất

Approved `06` §I liệt kê đúng **25 module MVP**. `01` A2 cũng nói 25 nhưng `00`, `03`, changelog plan nói DAG 26; matrix có 30 requirements chứ không phải modules. Sửa thuật ngữ: 25 application modules; infra/tooling, migration, worker và cross-cutting services được đếm riêng, không đổi module scope.

### ME-02 — P8 có tên “Search” nhưng không có search mới

Product search đã triển khai P5. P8 không có task search, out-of-scope nói toàn-site search P1. Bỏ “Search” khỏi tên P8 hoặc ghi rõ “search integration only; no new search capability”.

### ME-03 — Dependency Navigation/Homepage/SEO còn thiếu

- Navigation cần nguồn “standards/applications phổ biến được cấu hình”; phải xác định thuộc `settings`, `menu_items` hay `homepage_sections`.
- Homepage thiếu cạnh tới banners/media/pages/settings/industries; không cần inquiry/outbox như hard dependency.
- Redirect delivery phải có từ P4 khi slug rename được test, không chờ P8.
- SEO route rules có thể làm song song từ P4; sitemap aggregation mới cần all published modules.

### ME-04 — Taxonomy landing P0/P1 còn mơ hồ

P4 nói public landing category/standard/application. Approved P0 có product listing/filter routes, nhưng `02`/`08` xếp “trang tiêu chuẩn/ứng dụng/ngành chi tiết” vào P1. V1.0 phải nói rõ P0 chỉ có product-list landing theo taxonomy URL; rich taxonomy detail page là P1.

### ME-05 — Open decisions chưa được xếp theo thời điểm và có implementation detail bị đẩy cho user

B6 package manager, B7 test runner, B15 logging library, B20 lint/format thường là implementation details sau khi stack chốt. Ngược lại deployment topology, route delivery, cookie/origin, content block schema, migration executor, compatibility strategy và content cutover đang thiếu. Phân loại lại: before P0, before phase, release-only, implementation detail.

### ME-06 — Một DB owner chưa đủ ngăn trùng migration number

Thêm migration registry/history table + checked-in manifest/checksum; CI reject duplicate/non-monotonic number và checksum drift; CODEOWNERS cho migration directory; serialize PR cấp migration. Baseline applied không được sửa hash.

### ME-07 — Evidence gắn vào `planning/implementation/v0.1/`

`06`/`08` định lưu evidence dưới plan v0.1. Điều này làm bản plan proposed bị mutate trong coding, khó immutable/versioned. Dùng CI artifact store và/hoặc `implementation/evidence/<commit-sha>/<phase>/`; plan chỉ link tới evidence index.

### ME-08 — Performance thresholds để tới P11 là quá muộn

Hosting-specific SLO có thể chốt P11, nhưng cần budget tạm từ P0/P5: max query count, payload size, upload dimensions/bytes, response percentile cho catalogue, sitemap generation mode, worker batch/timeout. Nếu không, “no N+1/latency hợp lý” không đo được.

---

## F. Low issues / observations

### LO-01 — Evidence version/notes chưa tự nhất quán hoàn toàn

Execution log chứng minh PASS trên PostgreSQL 16, nhưng không in `server_version`/`psql --version`, nên claim exact `16.14` không tự chứng minh từ artefact hiện có. Ngoài ra `doc/verify/README_VERIFY.md` và `doc/05` §XIV vẫn chứa câu `STATIC VALIDATION ONLY`, trong khi changelog §O–P và execution folder đã PASS. Đây không làm plan sai, nhưng nên dọn ở một vòng tài liệu riêng; Round 3 không sửa Approved docs.

### OBS-01 — Status/integrity đạt

Plan giữ đúng trạng thái proposed; docs Approved snapshot khớp hash; SQL execution evidence tồn tại. Không có dấu hiệu plan tự chuyển sang Approved/Ready to Code.

### OBS-02 — Các scope leak được kiểm tra nhưng không phát hiện

Không thấy plan đưa các mục sau thành P0: site-wide search, facet count, audit log UI/table, scheduled publishing, product video upload/table, Inquiry Admin UI, ecommerce UI, application tree UI. Dashboard `email_failed` là widget health được Approved cho phép, không phải Inquiry Admin UI.

---

## G. Design drift findings

| Finding | Kết luận | Nguồn Approved | Correction |
|---|---|---|---|
| Users CRUD `/admin/users` | **DESIGN DRIFT / P0 SCOPE LEAKAGE** | `01` một admin; `06` không có endpoint; `07` chỉ Profile/Change password | Bỏ CRUD khỏi P2/matrix |
| Auto-save nháp P9 + E2E | **DESIGN DRIFT / P0 SCOPE LEAKAGE** | ADR-006/P1; changelog C27 | Chỉ giữ unsaved-change warning P0 |
| 26 module | **DESIGN DRIFT về inventory** | `06` §I có 25 module | Chuẩn hóa 25 + components riêng |
| Rich taxonomy detail in P4 | **Ambiguous; có thể leak P1** | `02`/`08` P1 detail; P0 có product-list taxonomy routes | Giới hạn P0 list landing |
| Site-wide search | Không leak | P5/P10 chỉ product search; P8 không có task mới | Đổi tên P8 |
| Facet count | Không leak | Out-of-scope P5/P8/P10 | Giữ |
| Audit UI/table | Không leak | Structured log only | Giữ |
| Scheduled publish | Không leak | P1 | Giữ |
| Video upload/product_videos | Không leak | External block only | Giữ |
| Inquiry Admin UI | Không leak | Chỉ `email_failed` widget | Giữ |
| Ecommerce fields | Không thấy lộ UI thực thi; wording còn mơ hồ | ADR-010: ẩn khỏi flow P0 | Ghi “không render fields” |
| Applications Admin | Đúng phẳng | ADR-010 | Giữ |

---

## H. Dependency graph audit

### H1. DAG thay thế rút gọn

```text
Repository/tooling decisions
  → Config
      → Logging + Error primitives
          → Database pool/migration runtime
              → Users/Identity repository
                  → Auth application service
              → Settings
              → Health probe registry (DB first; add probes incrementally)
              → Media + Storage adapter
                  → Shared content-block/video sanitizer
                  → Slug/Publish/Locale policies
                      → Catalogue taxonomy
                          → Product core + product search/filter
                      → Content core entities
                          → Cross-module relationships
              → Inquiry API + Outbox worker

Catalogue taxonomy → Navigation core
Products + selected content + banners/pages/settings → Homepage
Published route providers + settings → SEO sitemap aggregation
Redirect repository + public delivery topology → Redirect execution
All API contracts → Admin/Public thin slices continuously
All modules → UI completion → Release/cutover
```

### H2. Các cạnh cần thêm/bỏ

| Action | Edge |
|---|---|
| Bỏ | `config → DB` |
| Thêm | `DB → config + logging` |
| Bỏ | `users → auth` domain dependency |
| Giữ một chiều | `auth → UserAuthenticationQueryPort` |
| Thay | `health → storage/outbox` hard edge ở P2 bằng probe registration theo phase |
| Thêm sớm | `products → ContentBlockValidator` có trước P5 |
| Tách | `content core → content relationship integration` |
| Thêm | `navigation → configured-feature source` sau khi chọn owner |
| Thêm | `homepage → banners/media/pages/settings/industries + selected content` |
| Bỏ | `P7 inquiry` khỏi hard prerequisite của navigation/SEO/homepage trừ form integration |
| Thêm | `SEO sitemap → all public route providers + settings/base URL` |
| Thêm | `redirect execution → public request router` từ P4 |

---

## I. Phase and critical-path audit

### I1. Critical path đúng hơn

```text
Decision/topology/Git
→ raw SQL baseline
→ core/auth/config/logging
→ media + shared content security
→ taxonomy + slug/redirect proof
→ product thin vertical
→ content core
→ cross-module relationships
→ homepage/sitemap/web delivery
→ public completion
→ content delta migration + release hardening
```

### I2. Nhánh song song

- Sau P3: taxonomy modules; pages/customers/offices/post_categories/document core; Admin/Public shell.
- Sau P4: navigation core, route/SEO rule tests, content core tiếp tục.
- Sau P5 + service core: Inquiry/outbox P7 chạy song song P6B.
- Admin completion chạy liên tục theo contracts; P9 chỉ hội tụ.
- Content migration inventory bắt đầu P4, importer/dry-run theo schema từ P5/P6, delta/cutover P11.

### I3. Điểm hội tụ/nút thắt

- P5 products là một nút thắt thật nhưng không phải duy nhất.
- P6B relationships và P8 homepage/sitemap là fan-in lớn hơn plan mô tả.
- Public route/SEO/redirect topology là nút thắt kiến trúc trước cả P4.
- Claude ownership trên mọi shared service là nút thắt nguồn lực.

### I4. P7 so với P8

P7 không cần chờ SEO/navigation. Chạy P7 song song P6B/P8 partial sau khi products và service core có contract. Homepage/nav/SEO cũng không cần đợi worker; chỉ ContactForm integration phụ thuộc P7. Không nên ép P7→P8 thành đường tuần tự cứng.

### I5. P9/P10

P9/P10 phải là **completion phases**, không phải nơi bắt đầu UI. Mỗi vertical slice trước đó phải có thin UI + E2E rõ. Nếu team không muốn làm thin UI, đổi tên strategy như HI-05.

---

## J. Stack and topology audit

### J1. So sánh stack

Thang điểm 1–5; 5 là phù hợp nhất với LT Vietnam. Điểm không thay cho quyết định của user.

| Tiêu chí | A: Nest + Next + Vite Admin | B: Nest + một Next Public/Admin | C: Laravel + Next/Inertia |
|---|---:|---:|---:|
| Modular monolith | 5 | 5 | 4 |
| Giữ raw SQL baseline | 5 | 5 | 3 |
| SKIP LOCKED worker | 4 | 4 | 5 |
| SSR/SEO | 5 | 5 | 3–5 tùy Next/Inertia SSR |
| Admin editor complexity | 5 | 4 | 5 với Inertia; 4 với Next |
| Type sharing/API client | 5 | 5 | 2–3 |
| Testing | 5 | 5 | 5 |
| Deployment simplicity | 3 | 4 | 4 với Inertia; 3 với Next |
| Learning curve | 4 nếu team TS | 4 nếu team TS | Phụ thuộc năng lực PHP |
| Hai AI cộng tác | 5 | 4 | 3 |
| Operational simplicity | 3 | 4 | 5 với Laravel monolith |
| Upgradeability | 4 | 4 | 4 |
| Over-engineering risk | 3 | 4 | 3 nếu Laravel+Next |

**Recommended:** Option B — NestJS API + một Next app chứa public/admin route groups, pnpm monorepo, raw SQL migration, Kysely runtime queries, worker process riêng trong cùng codebase. Lý do: hai deployable chính thay vì ba, cùng-origin/reverse-proxy đơn giản hơn cho cookie+CSRF, vẫn giữ SSR và type sharing. Security boundary thật vẫn là Nest authorization, không phải việc tách bundle.

**Acceptable alternative:** Option A — khi doanh nghiệp thật sự cần admin deploy/release/subdomain độc lập và chấp nhận ba deployable, CORS, cookie domain và CSRF phức tạp hơn.

**Not recommended cho plan hiện tại:** Option C như một thay đổi muộn không re-plan. Laravel + Inertia/Blade là kiến trúc kỹ thuật khả thi và queue ecosystem tốt, nhưng Laravel + Next tạo hai hệ ngôn ngữ/type, còn chuyển sang Inertia thay đổi topology/front-end plan. Chỉ chọn nếu user/team ưu tiên PHP vận hành và chấp nhận cập nhật toàn bộ v1.0.

### J2. Admin alternatives

| Option | Security/cookie | Deploy/build | Shared code | Nhận xét |
|---|---|---|---|---|
| A. React/Vite riêng | Boundary bundle rõ nhưng API auth vẫn là boundary thật; CORS/cookie khó hơn | 3 app | Tốt qua packages/OpenAPI | Acceptable |
| B. Next admin app riêng | SSR không cần thiết; vẫn 3 deployable | Phức tạp hơn giá trị nhận | Tốt | Ít lợi hơn A/C |
| C. Cùng Next app | Same-origin thuận lợi; phải no-store/dynamic cho admin | Đơn giản nhất | Tốt nhất | **Khuyến nghị MVP** |
| D. Backend server-rendered | Đơn giản nếu Laravel/Blade/Inertia; lệch nếu Nest+Next | Tùy stack | Thấp với TS FE | Không khuyến nghị cùng Nest option |

### J3. Node runtime

Node 20 không còn được hỗ trợ. B21 nên kiểm compatibility matrix của phiên bản Nest/Next đã chọn và pin exact major/minor trong lock/toolchain. Tại ngày audit, Node 24 LTS là default khuyến nghị; Node 22 LTS là fallback được hỗ trợ tới EOL của dòng 22.

---

## K. Test strategy gaps

### K1. Bắt buộc P0/release gate

| Nhóm | Test phải thêm |
|---|---|
| Auth/session | JWT verification-key overlap/rotation drill; cookie expiry; logout/current-session semantics; password-change/reset invalidation; reset replay + hai request reset đồng thời; CSRF rotation login/logout; account-lock race; trusted proxy/IP spoof; distributed brute force nếu multi-instance |
| Browser security | CSP/HSTS/referrer/permissions/nosniff/frame policy cho Next public/admin; SSR error không lộ stack; JSON-LD/metadata escaping |
| Upload/PDF | oversized pixel dimensions; image decompression/resource bomb; PDF active-content/download policy; EXIF orientation/privacy; filename Unicode; processor timeout/memory cap |
| Slug/redirect | hai create cùng slug; hai rename về cùng slug; redirect source race; A→B→C không chain; restore soft-delete; same slug text khác locale; redirect phải xảy ra trước render |
| Product relations | hai primary category concurrent; PATCH replace-set race/lost update; publish trong lúc taxonomy archive/delete; self related-product; duplicate links |
| Inquiry/outbox | graceful shutdown; SMTP success rồi crash; retry exhaustion; clock skew/boundary; provider timeout; reaper/worker race; same idempotency key/different payload; recipient snapshot; poison job; batch fairness/starvation |
| SEO | base URL theo environment; trailing slash; query sorting/allowlist; pagination canonical; VI/EN duplicate rules; 404/410; sitemap size/pagination; XML escaping; structured-data escaping |
| Media consistency | concurrent duplicate checksum; purge/read race; DB record nhưng file thiếu; file còn nhưng DB đã purge; generated variant cleanup/rollback |
| Contract/E2E | OpenAPI backward compatibility; generated client freshness; mixed API/FE version smoke; SSR hydration mismatch; mobile responsive; keyboard/focus/a11y; download Content-Disposition/nosniff; locale switch giữ entity mapping |

### K2. Có thể defer có điều kiện

- Automated JWT key rotation service có thể defer nếu P0 có manual overlap/rollback drill và key inventory.
- Distributed rate-limit test không cần nếu user khóa single-instance; trở thành bắt buộc ngay khi multi-instance.
- Antivirus/CDR cho PDF có thể defer nếu P0 force download, `nosniff`, no inline execution, size limit và documented residual risk.
- Sitemap index/chunking có thể defer khi dataset có hard threshold thấp hơn 50.000 URL và CI test/alert; XML escaping không được defer.
- HTTP range có thể defer nếu contract công khai rõ “full download only” và file size bounded; Content-Disposition/nosniff không được defer.
- Exhaustive device/browser matrix có thể defer; keyboard/focus, các breakpoint chính và mobile form vẫn là P0.

---

## L. Rollback and operability gaps

| Phase | Không đủ nếu chỉ revert code | Strategy cần có |
|---|---|---|
| P1 DB | `down 070→001` phá toàn bộ data | Chỉ down trên disposable DB; production backup + restore drill; future schema dùng expand/contract/forward fix |
| P2 Auth/settings | Token/cookie/config đã phát hành | Backward-compatible key set; feature disable login/reset; preserve settings; revoke/expire procedure |
| P3 Media | File/variants đã tạo, purge có thể chạy | Disable upload/purge flag; dual-readable variants; orphan reconciliation; restore media + DB together |
| P4–P6 Content | Slug/redirect/data/relations đã thay | Disable write/publish; keep redirects; forward fix/data repair; content version/export; không xóa data bằng Git revert |
| P7 Inquiry | Email đã gửi không thể thu hồi; jobs in-flight | Stop claim → drain → stop; quarantine poison jobs; preserve outbox; no destructive down; reconciliation report |
| P8 Web/SEO | CDN/cache/redirect đã public | Feature disable, cache purge, redirect snapshot, route compatibility; forward SEO fix |
| P9/P10 FE | Client/API version mismatch, cached assets | Versioned deploy, backward-compatible API, blue/green/canary, generated-client gate |
| P11 Release | Migration + real content + traffic | Tested backup/restore, cutover runbook, rollback decision point, DNS/CDN/cache plan, forward-fix policy |

Feature flags không cần cho mọi CRUD, nhưng nên có cho: public route/redirect layer, publishing, upload/purge, outbox claiming, new homepage/SEO delivery và content cutover.

---

## M. AI collaboration audit

### M1. RACI đề xuất

| Task | Implementer | Reviewer | Approver | Runner | Evidence owner |
|---|---|---|---|---|---|
| Raw baseline 001–070 | DB owner (C) | X, đọc SQL + rerun độc lập | User | CI/User Postgres 16 | CI artifact + User xác nhận |
| Core shared service PR | C hoặc X, chỉ một | AI không sửa PR | User | CI | CI |
| Module PR của C | C | X | User/maintainer | CI | CI |
| Module PR của X | X | C | User/maintainer | CI | CI |
| Integration PR cả C+X đã sửa | Một integration owner | Fresh reviewer/ChatGPT không sửa logic | User | CI/User | Release evidence owner |
| OpenAPI/client generation | API contract owner generate | AI còn lại review diff | User | CI freshness job | CI |
| Migration number/checksum | DB owner cấp/commit | AI còn lại + CI rule | User | CI/staging runner | Migration registry + CI |
| Release/cutover | Release captain do user chỉ định | C/X theo phần không tự sửa | User | User/CI | Release captain |

### M2. Quy tắc chống “AI hallucinated PASS”

- Evidence phải có commit SHA, command, environment/version, exit code, raw log và checksum/artifact URL.
- Reviewer đọc code/test gốc và rerun test trọng yếu; không dựa vào summary của implementer.
- Screenshot không thay cho raw result; “PASS” không có artifact = NOT RUN.
- PR path allowlist/CODEOWNERS kiểm file ownership; shared files merge tuần tự.
- AI không merge/approve code của chính mình; user/maintainer giữ merge authority.

---

## N. Content migration assessment

### N1. Kết luận

Content migration không được Approved loại khỏi project; ngược lại `03` §XX và `06` §XII đã yêu cầu inventory/crawl mapping. Vì vậy thiếu workstream là gap thật.

### N2. Workstream đề xuất P4–P11

| Stage | Thời điểm | Deliverables | Owner/acceptance |
|---|---|---|---|
| CM0 Inventory | P4 | crawl URL cũ, content/media/PDF inventory, HTTP status, backlinks/metadata | Content owner accountable; 100% URL có record |
| CM1 Mapping | P4–P5 | old→new URL, keep/rewrite/archive/410, slug collision, VI/EN, rights, broken asset list | SEO + content owner duyệt |
| CM2 Importer/dry run | P5–P7 | idempotent import, media hash manifest, relationship mapping, exception report | Implementer + independent reviewer |
| CM3 Validation | P7–P10 | before/after counts, locale/publish checks, redirect coverage, broken link/file scan, sample visual QA | QA/evidence owner |
| CM4 Freeze/delta/cutover | P11 | content freeze, delta export/import, final redirect map, rollback snapshot, post-go-live crawl | User approves go-live |

Acceptance tối thiểu:

- 100% URL cũ in-scope có disposition `keep/301/410/archive`.
- Counts và relationship totals reconcile theo loại nội dung/locale.
- Media/PDF có checksum, MIME/size validation; broken/copyright-unclear asset có exception owner.
- Không critical broken internal link; redirect chain/loop = 0; sampled and automated redirect coverage PASS.
- Delta migration có thể rerun idempotently và có cutoff timestamp.

---

## O. Alternative sequence

### P0 — Decision gate + repository integrity

Chốt stack/admin shape, deployment topology, public routing/SEO/redirect owner, Node supported LTS, cookie/origin/proxy, runtime query vs migration executor, worker model, storage, codegen/compatibility; khôi phục Git repository hợp lệ.

### P1 — Frozen raw SQL baseline + bootstrap separation

Chạy raw 001–070 bằng migration executor, manifest/checksum/history; up/down/up trên disposable Postgres; production bootstrap riêng demo/test fixture; backup/restore dry run.

### P2 — Core platform

Config → logging/errors → DB; Auth/Users one-way; settings; OpenAPI/codegen gate; audit log; health registry + DB probe.

### P3 — Media/storage + shared content security

Storage theo topology, MediaUsage, upload/image/PDF hardening, readiness storage probe, ContentBlock/ExternalVideo validator. Có thin Admin media UI.

### P4 — Taxonomy thin verticals + redirect proof

Brands/categories/standards/applications/industries; Slug/Publish/Locale; minimal Admin; public brand/category list/route; đổi slug phát 301 thật qua topology; E2E. Navigation core có thể bắt đầu.

### P5 — Product thin vertical

Product API + relationships + filter/search/landing; minimal Admin create/publish; public landing/list/detail; product SEO contract; concurrency/E2E. Đây là milestone catalogue usable, không chỉ API.

### P6A — Core content entities

Pages, customers, offices, post_categories; services/documents/posts/projects core theo dependency; thin Admin/Public routes.

### P6B — Cross-module content relationships

Service/project/post/document links, replace-set transaction, privacy visibility và integration E2E.

### P7 — Inquiry/outbox

Public form, Nest inquiry API, worker process + reaper + readiness/monitoring, dashboard `email_failed`, full failure/concurrency E2E. Chạy song song P6B sau P5 + service core.

### P8 — Web delivery: Navigation, Homepage, Redirects, SEO

Hoàn thiện navigation/homepage, centralized redirect delivery, SEO resolver contract, root sitemap/robots, cache. **Không có search feature mới.** Nhiều route-rule task bắt đầu từ P4; P8 là convergence.

### P9 — Admin completion

Hoàn thiện editor/component/responsive/a11y trên thin UIs đã có; không bắt đầu lại toàn bộ Admin; không Users CRUD, không auto-save advanced.

### P10 — Public completion

Hoàn thiện layout/system pages/content pages/a11y/performance. Product/brand/form/redirect đã usable từ P4/P5/P7; P10 là polish/integration.

### P11 — Content delta + hardening + release

CM4 cutover, mixed-version tests, security/perf/a11y, backup/restore, worker drain, SEO/broken-link crawl, monitoring, rollback decision points và user go-live approval.

**Lý do tốt hơn plan v0.1:** loại cycle P8/P10; làm UI/routing risk xuất hiện đúng trong slice; tách fan-in P6; cho P7 chạy song song; giữ DB baseline foundation-first; đưa content migration và operability vào đường release thật.

---

## P. Questions for Claude

1. Với reverse proxy thật, request `/san-pham/{slug}` đi qua process nào trước và redirect DB được thực thi ở đâu?
2. Vì sao critical path đặt P10 trước P8 trong khi phase order và P10 input đặt P8 trước P10?
3. Thin Admin/Public deliverable cụ thể của từng P4–P7 là gì, và browser E2E chạy qua UI nào trước P9/P10?
4. Vì sao config phụ thuộc DB; cách tránh AuthModule↔UsersModule import cycle là gì?
5. P2 `/ready` đạt DoD thế nào khi storage P3 và outbox/email P7 chưa tồn tại?
6. Product P5 validate `external_video` bằng service nào nếu shared validator đến P6?
7. Claude giải quyết dependency services/projects/posts/documents khi hai AI làm P6 song song như thế nào?
8. Nguồn Approved nào cho phép `/admin/users` CRUD và auto-save nháp thành P0?
9. Baseline 001–070 sẽ được giữ raw SQL/checksum hay tái sinh qua ORM? P5 phát hiện index thiếu sẽ dùng 071+ đúng không?
10. Cơ chế tạo admin đầu tiên mà không có mật khẩu cố định là gì? Demo/test seed được chặn khỏi production ra sao?
11. Vì sao content migration chỉ là câu hỏi trong review package dù Approved có checklist?
12. Với mỗi phase có side effect, rollback ngoài Git revert là gì?
13. Ai review integration PR khi cả Claude và Codex đều đã implement phase đó? Ai merge, rerun và sở hữu evidence?
14. Vì sao plan gọi 26 module khi `06` §I liệt kê 25?

---

## Q. Questions for the user

1. Deployment dự kiến là single persistent host, multi-instance container hay serverless/stateless?
2. User có chấp nhận khuyến nghị Option B: Nest API + một Next app Public/Admin + worker process riêng không, hay cần Admin deploy độc lập?
3. Ai là content/data migration owner phía doanh nghiệp, và Codex/Claude có được truy cập/crawl/export website cũ khi bước đó bắt đầu không?
4. Canonical production domain, admin origin, API origin và cookie domain dự kiến là gì?
5. Mục tiêu backup RPO/RTO và cửa sổ content freeze/go-live là bao nhiêu?
6. Team vận hành có năng lực PHP/Laravel đáng kể khiến Option C cần được ưu tiên lại không?

---

## R. Final verdict

`PLAN NEEDS CORRECTIONS BEFORE RECONCILIATION`

Plan khả thi và phần lớn bám thiết kế Approved, nhưng Critical topology issue, dependency/sequence defects, scope leakage, migration/worker/deployment gaps, missing content migration, incomplete tests/rollback/RACI và Git invalid phải được correction/disposition trong Round 4 trước khi reconciliation. Kết luận này **không** có nghĩa `READY TO CODE`, `APPROVED` hay `IMPLEMENTATION STARTED`.
