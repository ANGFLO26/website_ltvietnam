# CODEX FINAL VERIFICATION — IMPLEMENTATION PLAN v0.3

**Ngày audit:** 2026-07-22  
**Đối tượng:** `planning/implementation/v0.3/`  
**Nguồn ưu tiên:** ADR → MVP scope → PostgreSQL schema → ERD/data model → Backend/API → Admin/Public wireframe → plan v0.3 → audit reports  
**Phạm vi thay đổi:** Chỉ tạo bộ báo cáo audit này; không sửa plan v0.3, tài liệu Approved, SQL, Git hoặc source code.

## A. Executive verdict

**Verdict: `NEEDS v0.4 CORRECTION BEFORE PROMOTION`.**

Plan v0.3 có nền tảng tốt, bám đúng scope Approved, không có **CRITICAL** và không phát hiện **DESIGN DRIFT** đã xác định chắc chắn. D17 và D18 đạt phần cốt lõi; 13 phase labels, product-only search, CM2 guard và các ranh giới P0/P1/Future đều được giữ đúng.

Tuy nhiên chưa thể promote trực tiếp vì còn **5 HIGH**:

1. D19 chưa định nghĩa fingerprint đầy đủ và chưa khóa atomic/concurrency/timeout semantics.
2. `/health/ready` coi storage là hard dependency của toàn API, có thể làm proxy loại API và mất lead dù PostgreSQL vẫn ghi được.
3. `/media/*` đi thẳng proxy→volume nhưng chưa chọn semantics soft-delete/public URL/cache/purge.
4. Migration acceptance mới chứng minh aggregate equivalence, chưa chứng minh từng migration độc lập và down mapping.
5. v0.3 không self-contained; promote nguyên trạng sẽ tạo baseline v1.0 phải mở v0.1/v0.2 để thực thi.

Kết quả 14 correction: **7 PASS, 7 PARTIAL, 0 FAIL, 0 NOT VERIFIABLE**. Gate A chưa đạt vì còn High; Gate B chưa đạt vì Git vẫn invalid. Không có trạng thái `APPROVED`, `READY TO CODE`, `PLANNING COMPLETE` hoặc `IMPLEMENTATION STARTED` được xác nhận cho plan hiện tại.

## B. Files inspected

### B.1. Plan và lịch sử

- Đọc trực tiếp đủ 16 file trong `planning/implementation/v0.3/`: `00`–`14` và `PLAN_CHANGELOG.md`.
- Đối chiếu inventory/timestamp của `v0.1/` và `v0.2/`.
- Đọc audit Round 3: `CODEX_ROUND3_AUDIT.md`, `ISSUE_REGISTER.md`, `RECOMMENDED_PLAN_DELTA.md`.

### B.2. Approved sources

- Đối chiếu trực tiếp `doc/00`–`doc/10`, trọng tâm ADR, scope, schema, data model, Backend/API, Admin/Public wireframe.
- Cả **11/11** file active có SHA-256 trùng snapshot `doc/archive/releases/v1.2.1-approved/` và `RELEASE_MANIFEST.md`.

### B.3. SQL evidence

- `doc/verify/schema_up.sql`: aggregate 001–070, có đúng **70 up block markers**.
- `doc/verify/schema_down.sql`: aggregate rollback, chỉ có **5 marker nhóm**, không có 70 down file/marker tương ứng từng up.
- `verify_checks.sql`, runner PowerShell/shell, `execution/POSTGRESQL16_EXECUTION_RESULT.md` và raw log đều tồn tại.
- Raw log xác nhận migrate up → checks → down → up lần hai, kết thúc `ALL STEPS PASSED - EXECUTION TESTED ON POSTGRESQL 16`.
- `README_VERIFY.md` vẫn ghi `STATIC VALIDATION ONLY`; đây là wording stale, không phủ định raw execution evidence nhưng cần được xử lý như known documentation observation, không sửa trong audit này.

### B.4. Inventory/integrity findings

| Check | Result | Evidence/nhận xét |
|---|---|---|
| Đủ 16 file v0.3 | PASS | File count = 16; đúng danh sách yêu cầu |
| Mọi file nhận diện v0.3 | PASS | `00`–`14` có header line 3; changelog có active section v0.3 line 7 |
| Active status | PASS | Tất cả là `PROPOSED FOR FINAL VERIFICATION` |
| Không tự nhận Approved/Ready to Code/Planning Complete/Implementation Started | PASS | Các từ Approved/Planning Complete xuất hiện trong nguồn thiết kế, gate tương lai hoặc câu phủ định; không phải active state. Không có `IMPLEMENTATION STARTED` |
| v0.1/v0.2 không bị sửa | NOT FULLY VERIFIABLE | Timestamp mới nhất v0.1 = 00:56, v0.2 = 01:57, trước v0.3 sớm nhất = 02:09; nhưng Git invalid và không có prior hash manifest cho hai plan cũ nên không thể chứng minh bất biến bằng mật mã |
| Approved snapshot | PASS | 11/11 SHA-256 match archive |
| SQL evidence tồn tại | PASS | Execution result + raw log tồn tại và PASS |
| Aggregate hay migration riêng | CASE B CONFIRMED | Chỉ aggregate SQL; không có 001–070 file riêng |
| Git | INVALID | `git status`, `git rev-parse`, `git log` đều trả `fatal: not a git repository` |

Lưu ý lịch sử: `v0.3/PLAN_CHANGELOG.md:47` ghi v0.2 có 16 file, nhưng inventory thực tế v0.2 có **15** file. Đây là lỗi lịch sử LOW.

## C. D17–D20 verification

| Decision | Result | Direct evidence | Assessment |
|---|---|---|---|
| D17 Redirect delivery | PASS | `01:25`; `12:56-69,90-108`; `04:20,112-126`; `06:22-23` | Nest authoritative; Next chỉ delivery adapter; resolver trước SSR/streaming; explicit 301; cấm client redirect/helper 307/308; invalidation đủ old/new/resolver/page/sitemap; A→B→C đi thẳng; resolver failure trả 503/500 và không cached 200 sai |
| D18 API compatibility | PASS | `01:26`; `04:15,219,246`; `06:34-35`; `07:44-46`; `10:31-32` | `/api/v1` additive/backward-compatible; field mới optional/default; không rename/xóa/đổi nghĩa trong window; breaking→v2/deprecation; OpenAPI breaking check; generated-client freshness; mixed-version; expand→migrate/backfill→contract; deployment order hợp lý |
| D19 Idempotency fingerprint | PARTIAL | `01:27`; `04:176-177,182`; `05:39`; `06:28-29`; Approved schema `05:775` | Durable PG + 071+ + replay/409 có, nhưng canonical set thiếu `inquiry_type`/`company_name` và đưa `destination` mơ hồ; chưa khóa unique scope trong standalone decision, transaction/isolation/race/timeout và legacy NULL policy |
| D20 Public media | PARTIAL | `01:28`; `12:40,46,50-54`; `04:92-106`; `06:19-20` | Phân tách public marketing media với document publication gate đúng; key/MIME/nosniff/no-listing/traversal/cache đã có. Chưa chọn soft-delete URL semantics và chưa đủ purge/cache/orphan/backup consistency |

### D17 spike assessment

P0 spike có phạm vi đủ tốt để **phát hiện** incompatibility cơ bản: exact Next.js version, exact 301, pre-render, reverse proxy và route-cache invalidation. Tuy nhiên audit hiện tại **không thể xác nhận compatibility thật** vì plan chưa pin exact Next.js version/router/render mode và spike chưa chạy. v0.4 nên yêu cầu evidence matrix gồm exact package lock/version, App Router/rendering mode, streaming on/off, dev và production build, reverse proxy, cache hit/miss, resolver timeout/failure, response body rỗng/không HTML và status 301.

## D. Fourteen-correction verification

| Correction | Result | Evidence | Remaining issue | Blocks v1.0 |
|---|---|---|---|---|
| 1. Gate separation | PASS | `00:74-89`; `07:68-82`; `10:46-47` | Gate A và Gate B đã tách đúng | No |
| 2. Staging B23–B26 | PARTIAL | `01:36-60`; `07:22-31`, nhưng `07:84` | `07:84` vẫn nói Gate B chờ before-P2/P3 decisions | Yes—direct promotion |
| 3. Exact HTTP 301 | PASS | `12:56-69,90-108`; `04:20,112-126`; `06:22-23` | Runtime compatibility để P0 spike chứng minh | No |
| 4. Media routing | PARTIAL | `12:33-54`; `06:19-20` | Chưa chọn soft-delete/public URL semantics và cache purge | Yes |
| 5. Migration materialization | PARTIAL | `04:38-64`; `08:37-41`; aggregate-only confirmed | Concat equivalence không chứng minh từng migration/down mapping/history transaction | Yes |
| 6. Health split | PARTIAL | `03:21-33`; `04:70-86,178`; `10:28-29` | Storage vẫn hard-fail toàn API readiness | Yes |
| 7. API compatibility | PASS | `01:26`; `06:34-35`; `07:44-46`; `10:31-32` | Nên ghi rõ duration/exit rule của compatibility window trong v1.0 | No |
| 8. Fingerprint | PARTIAL | `01:27`; `04:176-177`; `06:28-29` | Field set/normalization/unique scope/race/timeout/NULL chưa khóa | Yes |
| 9. Phase count | PASS | `00:52-70`; `04:3-5`; `03:71` | Đúng 13 labels | No |
| 10. Product-only search | PASS | `02:21-29`; `04:132-145,195-209,227-235`; `05:28` | Không có site-wide search P0 | No |
| 11. Numeric performance budget | PASS | `06:46-69` | Có số/range, owner, phase, ghi rõ không SLA; một số cần tuning | No |
| 12. CM2 production guard | PASS | `13:40-58`; `06:37-38` | Guard đầy đủ và không chỉ dựa `NODE_ENV` | No |
| 13. Outbox reconciliation | PARTIAL | `04:174-187`; `06:28-29`; `09:10-11` | Chưa định nghĩa durable provider-response evidence và rule xác định `duplicate-suspected` | Yes—direct promotion |
| 14. Correction disposition completeness | PARTIAL | `14:10-44` | Có đủ 4 decision + 14 row, nhưng kết luận “tất cả APPLIED” không đúng với residual findings | Yes—direct promotion |

## E. Residual Critical issues

**Không có CRITICAL.** Các vấn đề có nguy cơ mất lead/unsafe migration vẫn đang ở mức plan và có correction rõ ràng trước implementation, nên được phân loại HIGH thay vì CRITICAL.

## F. Residual High issues

### FV-01 — D19 chưa đủ để bảo đảm idempotency atomic

Fingerprint list hiện thiếu các trường request có ý nghĩa (`inquiry_type`, `company_name`; cần rà cả province/preferred-contact/source URL/consent boolean), trong khi `destination` không rõ là client intent hay SMTP recipient cấu hình và có thể thay đổi giữa retry. Sequence `idempotency check → transaction insert` chưa nói cách xử lý hai request đồng thời, unique conflict, transaction timeout và retry không biết commit đã xảy ra hay chưa.

Required: khóa global scope theo baseline `UNIQUE(idempotency_key)` hoặc scope khác có lý do; versioned canonicalization; atomic insert/conflict/read semantics; isolation/locking; same-key concurrent same/different payload; timeout retry; và policy cho fingerprint NULL.

### FV-02 — Storage-coupled readiness có thể làm mất lead

`03:25`, `10:29`, `12:42` đặt config+PG+storage vào `/health/ready`. Nếu reverse proxy/orchestrator dùng endpoint này để route toàn Nest API, storage down sẽ loại cả `POST /inquiries`, dù luồng inquiry chỉ cần PostgreSQL để ghi inquiry+outbox. Điều này trái mục tiêu bắt buộc “SMTP/worker/storage failure không làm mất Inquiry khi PG vẫn ghi được”.

Required: dùng Model A (core readiness = config+PG; storage DEGRADED) hoặc Model B (core/media/worker readiness riêng). Model C không có justification và không được chấp nhận.

### FV-03 — Public media soft-delete semantics chưa được khóa

`/media/*` đi trực tiếp Nginx/Caddy→volume, nên không đọc `media.deleted_at`. Plan chỉ ghi “soft-deleted theo purge/retention rõ” mà không định nghĩa URL có tiếp tục truy cập trong retention hay mất hiệu lực ngay. Cache immutable còn làm việc thu hồi khó hơn.

Required: chọn Semantics A hoặc B; khuyến nghị A cho public marketing asset content-addressed, với public-until-purge được ghi rõ. Phải chốt purge delay, cache TTL/purge, immutability, DB-missing/file-present, file-missing/DB-present, orphan quarantine, restore DB+volume cùng snapshot và kiểm tra consistency.

### FV-04 — Migration materialization acceptance chưa đủ

Aggregate up/down/up đã PASS, nhưng split thành 70 file tạo ra ranh giới transaction và dependency mới. `schema_down.sql` chỉ có 5 group markers, vì vậy `concat(down) ≡ aggregate` không tự chứng minh down N tương ứng up N. Approved `05:877-879` yêu cầu mỗi migration có down đúng object và rollback từng bước.

Required: acceptance theo từng file/prefix, transaction/history atomicity, failure injection, non-transactional DDL inventory, down mapping, prefix upgrade và existing-history execution.

### FV-05 — Direct v1.0 promotion không tạo được standalone baseline

`01:12`, `02:10`, `06:11-14`, `09:5,36` và các “giữ v0.2” khác buộc implementer mở v0.1/v0.2 để lấy full decisions, strategy comparison, nine-layer test detail và R-01..R-32. Điều này chấp nhận được cho correction draft v0.3, nhưng không chấp nhận được cho Approved baseline v1.0.

Required: v1.0 phải chứa đầy đủ nội dung thực thi; phiên bản cũ chỉ dùng history/changelog.

## G. Medium/Low issues

| ID | Severity | Finding |
|---|---|---|
| FV-06 | MEDIUM | `07:84` sai khi nói Gate B chờ before-P2/P3 decisions; B23/B24 chỉ block P2, B25 chỉ block P3 |
| FV-07 | MEDIUM | Git remediation được ngầm đặt pre-P0 cho user, nhưng P0 title/checklist/acceptance còn trộn; `04:29` còn đưa P0 spike PASS vào điều kiện `P0 READY TO START`, tạo vòng logic riêng |
| FV-08 | MEDIUM | Reconciliation có field/status nhưng chưa định nghĩa `duplicate-suspected` rule và nơi lưu provider response ID bền vững |
| FV-09 | MEDIUM | Route-resolution hard timeout 800 ms là quá lỏng cho dependency trước SSR; target <200 ms hợp lý hơn nhưng final threshold cần staging data |
| FV-10 | MEDIUM | C7 được `13:35-36` yêu cầu trước CM0 thực, nhưng `07:29` đặt cùng nhóm before-P11; cần một deadline duy nhất: trước CM0 execution và vẫn là release blocker |
| FV-11 | MEDIUM | P0 redirect spike chưa pin exact Next/router/render/cache matrix; plan đủ định hướng nhưng chưa verifiable ở Gate A |
| FV-12 | LOW | Không thể chứng minh v0.1/v0.2 bất biến bằng hash do Git invalid/no historical manifest; chỉ có timestamp evidence |
| FV-13 | LOW | `README_VERIFY.md` và một số Approved wording còn nói STATIC dù execution evidence PASS; known stale provenance note |
| FV-14 | LOW | `PLAN_CHANGELOG.md:47` ghi v0.2 có 16 file; thực tế có 15 |

## H. Gate A/Gate B audit

### Gate A

Mô hình tách Gate A/Gate B là đúng và Git không chặn Gate A. Tuy nhiên Gate A **chưa đạt** vì còn 5 High. Audit này không cấp approval và không đổi status.

### Gate B

Gate B **chưa đạt** vì Git invalid. B23/B24/B25 không được là Gate B blocker. Câu `07:84` phải sửa ở correction version. Gate B chỉ cần pre-P0 Git/toolchain/PG/topology decisions/DoR và **kế hoạch** 301 spike; spike PASS là P0 DoD, không phải điều kiện bắt đầu P0.

## I. Git/P0 audit

Plan nghiêng về **Option A — Pre-P0 manual prerequisite**:

- `08:34` gọi Git là Gate B prerequisite, restore/clone/init sau user approval.
- `04:28` nói user chạy Git, Claude chỉ scaffold sau Git valid.
- `07:14-20` yêu cầu Git valid trước code P0.

Nhưng ranh giới chưa hoàn toàn sạch vì P0 vẫn mang tên “Git Integrity & Repository Bootstrap”, có §Git restoration checklist và acceptance Git; thêm nữa `04:29` yêu cầu 301 spike PASS trước `P0 READY TO START` dù spike thực hiện trong P0.

Kết luận: **chọn và ghi rõ Option A**. User/authorized operator restore/init Git trước P0; Gate B verify Git. P0 chỉ re-verify, thiết lập branch/CI/tooling và chạy spike/scaffold. Không cần Option B nếu áp dụng delta này.

## J. Health/readiness audit

Model hiện tại trên thực tế là **Model C** cho toàn API vì storage nằm trong `/health/ready`, nhưng không có lý do chứng minh storage là hard dependency của mọi API. Model này không được chấp nhận.

Khuyến nghị **Model B**:

- `/health/live`: process liveness.
- `/health/ready` hoặc `/health/ready/core`: config + PostgreSQL; endpoint proxy dùng để giữ core API và Inquiry online.
- `/health/ready/media`: storage/media upload/download readiness.
- `/health/worker`: worker/PG/heartbeat/lease/email signal.
- Operational status: DEGRADED khi storage/SMTP/worker lỗi, không loại core API khỏi traffic.

Acceptance bắt buộc: storage down + PG up → `POST /inquiries` vẫn transactionally tạo inquiry/outbox và trả 202; catalogue DB-only APIs vẫn hoạt động; chỉ media/upload/download cần storage mới fail có kiểm soát.

## K. Media delivery audit

Đạt: public prefix chỉ marketing media/variants; document/PDF có publication gate qua Nest; storage-safe key; MIME/nosniff/no-listing/traversal/cache rules; client không suy filesystem path.

Chưa đạt: semantics soft-delete với direct proxy, purge delay, cache purge, immutable URL lifecycle, orphan/missing pair handling và backup/restore consistency.

Khuyến nghị **Semantics A** cho P0: public content-addressed asset đã phát hành có thể truy cập bằng URL cũ đến purge; soft-delete ngăn tham chiếu mới và public query không trả record; purge sau retention làm URL 404/410 sau khi cache hết hoặc được purge. Nếu business yêu cầu thu hồi ngay thì phải chọn Semantics B và thêm move/deny-manifest/auth-proxy—không thể chỉ set `deleted_at`.

## L. Migration materialization audit

`concat(up) ≡ schema_up.sql` và `concat(down) ≡ schema_down.sql` là **necessary nhưng insufficient**.

Acceptance bổ sung bắt buộc:

1. Chạy từng up migration riêng, đúng thứ tự, không chỉ concatenate rồi chạy một batch.
2. Mỗi migration có transaction boundary rõ; history row được ghi atomically trong cùng transaction và chỉ commit cùng DDL thành công.
3. Kiểm dependency function/table/trigger/index tại từng prefix.
4. Mỗi down N map đúng up N; test rollback N và rollback từng prefix trên disposable DB.
5. Inject failure giữa migration N; DB/history phải còn ở prefix N-1 đã biết và rerun an toàn.
6. Inventory DDL không transactional; nếu có, định nghĩa resumability/compensation, không giả định rollback transaction.
7. Test upgrade prefix N→N+1, ít nhất tự động cho toàn bộ 001–070.
8. Test empty DB và DB có migration history hợp lệ; reject checksum mismatch, gap, duplicate, out-of-order.
9. Test concurrent migration runners/lock để chỉ một executor áp dụng.
10. Chứng minh down aggregate được materialize thành mapping thực, vì file hiện tại không có 70 down boundaries.

## M. Self-contained v1.0 audit

Đây là **điều kiện bắt buộc** khi promote. v0.3 có thể là correction draft, nhưng v1.0 phải là standalone approved baseline và không được cần v0.1/v0.2 để:

- đọc A1–A25/D1–D20;
- hiểu/so sánh strategy;
- thực thi đủ nine-layer test strategy;
- theo dõi R-01..R-33;
- biết gate, DoR/DoD, RACI, phase acceptance, rollback và open decisions.

Các bản cũ chỉ được tham chiếu trong changelog/history, không phải normative execution source.

## N. Scope audit

| Scope check | Result |
|---|---|
| `/tim-kiem` chỉ product search P0 | PASS |
| Không site-wide search P0 | PASS |
| Không Users CRUD | PASS |
| Không auto-save nâng cao | PASS |
| Không rich taxonomy detail P0 | PASS |
| Không facet count P0 | PASS |
| Không scheduled publishing P0 | PASS |
| Không video upload | PASS |
| Không Inquiry Admin management UI | PASS; widget/reconciliation là operational, không CRM workflow |
| Không ecommerce UI | PASS |
| Applications Admin phẳng | PASS |
| 25 application modules | PASS |
| 13 phase labels | PASS |

**Không phát hiện `P0 SCOPE LEAKAGE`.**

## O. Performance budget audit

Các giá trị là preliminary engineering budget, không phải SLA—plan đã ghi đúng.

| Metric/value | Assessment | Note |
|---|---|---|
| Product list ≤5 SQL queries | REASONABLE INITIAL | Có count + batch load |
| Product detail ≤8 queries | REASONABLE INITIAL | Cần giữ batch relations |
| Homepage ≤12 queries | REASONABLE INITIAL | Đo theo enabled sections |
| List payload ≤150 KB/20 items | REASONABLE INITIAL | Đo uncompressed và compressed riêng |
| Detail payload ≤400 KB | REASONABLE INITIAL | Hợp catalogue nhiều specs; theo dõi outlier |
| PDF 15 MB / image 10 MB | REASONABLE INITIAL | Đồng bộ proxy/body limit và memory policy |
| 8000 px mỗi chiều | NEEDS ENVIRONMENT DATA | Phải áp đồng thời 40 MP và decoder memory cap |
| 40 MP | NEEDS ENVIRONMENT DATA | Benchmark image library/CPU/RAM |
| Processing 20 s/file | NEEDS ENVIRONMENT DATA | Phải rõ sync hay async; 20 s sync là dài |
| DB statement timeout 3 s, target <500 ms | REASONABLE INITIAL | 3 s là safety cutoff, không phải latency goal |
| Outbox batch 10–50, default 20 | NEEDS ENVIRONMENT DATA | Tune theo SMTP throughput/lock time |
| Worker timeout 30 s, lease ≥2× | NEEDS ENVIRONMENT DATA | Tune theo provider timeout và shutdown grace |
| Route resolver max 800 ms, target <200 ms | TOO LOOSE | 800 ms nằm trước SSR và cộng thẳng vào TTFB; giữ target <200 ms, chọn fail-fast ceiling từ staging |
| Sitemap chunk >10k, hard 50k | REASONABLE INITIAL | Conservative và đúng hard limit |
| p95 list 400/detail 600 ms | NEEDS ENVIRONMENT DATA | Cần data volume/concurrency profile |
| Lighthouse 80/90/95 | REASONABLE INITIAL | Chốt trên mobile CI profile cố định |

## P. Worker/outbox audit

Đạt: process riêng; stop claim; drain in-flight; lease; heartbeat; reaper; stable Message-ID; provider response ID trong report; SMTP success-then-crash test; at-least-once; reconciliation; không full PII; email đã gửi không rollback; API nhận Inquiry khi SMTP/worker lỗi.

Chưa đủ: `duplicate-suspected` mới là label, chưa có rule. v0.4 nên định nghĩa ít nhất:

- same stable Message-ID có hơn một provider acceptance/success event;
- provider acceptance ID tồn tại nhưng DB chưa `sent` sau timeout;
- stale-processing được reaped sau provider success/unknown outcome;
- evidence lưu bền vững hoặc log retention/SIEM đủ để reconciliation không phụ thuộc log tạm;
- manual outcome `confirmed-sent`, `confirmed-duplicate`, `unknown`, không tự gửi bù mù quáng.

Provider dedup/idempotency là **optional/conditional**: dùng nếu SMTP/provider hỗ trợ, theo Approved ADR-003; stable Message-ID + reconciliation vẫn bắt buộc.

## Q. Content migration audit

CM0–CM4, 100% URL disposition, hard-disable production, allowlist, explicit flag, approval record, dry-run PASS, backup, target DB display, confirmation phrase, least privilege, idempotency, transaction/batch policy và audit đều có.

C7 vẫn là release blocker. Cần đồng bộ deadline: content owner phải được chỉ định **trước CM0 execution thực**, không chỉ before P11; assignment này tiếp tục chặn release nếu bị mất/không ký validation. Guard không chỉ dựa vào `NODE_ENV`—PASS.

## R. Required changes before v1.0

1. Hoàn chỉnh D19: exact canonical field set/version/normalization; global unique scope; atomic transaction/isolation/race/timeout; legacy NULL policy.
2. Chuyển API readiness sang Model A hoặc B; bảo đảm storage/SMTP/worker down không làm mất Inquiry khi PG up.
3. Chọn public media Semantics A/B và chốt purge/cache/orphan/restore rules.
4. Mở rộng P1 migration acceptance theo 10 điểm ở §L.
5. Sửa `07:84`: loại before-P2/P3 khỏi Gate B.
6. Chọn rõ Git Option A; đưa remediation trước P0; bỏ 301 spike PASS khỏi điều kiện `P0 READY TO START`.
7. Pin exact Next.js/router/build/cache matrix cho P0 redirect spike evidence.
8. Định nghĩa durable outbox reconciliation và `duplicate-suspected` classification.
9. Đổi route resolver 800 ms thành staging-derived fail-fast ceiling; giữ target <200 ms.
10. Đồng bộ C7: trước CM0 execution và vẫn chặn release.
11. Tạo v1.0 standalone: inline full decisions, strategy comparison, test strategy, R-01..R-33, gates/DoR/DoD/RACI/phase/rollback/open decisions.
12. Sửa lỗi lịch sử v0.2 file count khi tạo changelog mới; ghi nhận stale SQL wording như known provenance note, không sửa Approved snapshot.

## S. Final verdict

**`NEEDS v0.4 CORRECTION BEFORE PROMOTION`**

Không recommend promote trực tiếp v0.3→v1.0. v0.4 chỉ cần correction có mục tiêu, không cần major architecture rewrite. Sau khi các High được sửa và audit lại bằng file thật, người dùng mới quyết định promotion. Báo cáo này không cấp trạng thái Approved, Ready to Code, Planning Complete hoặc Implementation Started.
