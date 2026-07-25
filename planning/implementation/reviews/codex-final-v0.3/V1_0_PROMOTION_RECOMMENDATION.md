# V1.0 PROMOTION RECOMMENDATION

**Audit target:** Implementation Plan v0.3  
**Date:** 2026-07-22  
**Recommendation:** `NEEDS v0.4 CORRECTION BEFORE PROMOTION`

## 1. Có thể promote trực tiếp hay không

**Không.** Không recommend đổi nhãn/copy trực tiếp v0.3 thành v1.0.

Không cần major plan rewrite, nhưng cần một **v0.4 correction pass có mục tiêu** vì các residual High liên quan lead safety, idempotency, media lifecycle và migration execution không phải chỉ là wording. Sau v0.4 cần verification ngắn dựa trên file thật; chỉ người dùng mới quyết định promotion.

Không được coi báo cáo này là `APPROVED`, `READY TO CODE`, `PLANNING COMPLETE` hoặc `IMPLEMENTATION STARTED`.

## 2. Vì sao cần v0.4 thay vì sửa âm thầm khi tạo v1.0

Các delta sau thay đổi acceptance/operational semantics, cần nhìn thấy và review trước khi khóa baseline:

- transaction và concurrency contract của D19;
- dependency profile của readiness/proxy routing;
- public URL semantics sau media soft-delete;
- cách chứng minh 70 migration chạy/rollback/resume độc lập;
- boundary pre-P0/P0 và Gate B.

Đây không phải architectural redesign; v0.4 có thể giữ nguyên 13 phase, module graph, strategy Hybrid và scope.

## 3. Exact delta bắt buộc cho v0.4/v1.0

### Delta 1 — D19 atomic idempotency contract

Ghi một contract duy nhất, tối thiểu gồm:

1. Scope của `Idempotency-Key`: khuyến nghị **global unique** như baseline Approved `inquiries.idempotency_key UNIQUE`; nếu scope khác phải nêu composite key và lý do.
2. Fingerprint version và algorithm; exact field set phải bao gồm mọi request field có ý nghĩa nghiệp vụ, tối thiểu `inquiry_type`, `full_name`, `company_name`, `phone`, `email`, `message`, `product_id`, `service_id`, `locale` và các optional field được API chấp nhận.
3. Quy tắc normalize Unicode/whitespace/case/email/phone/null-vs-missing/UUID/line ending; hash encoding và algorithm versioned.
4. Không đưa CAPTCHA token, timestamp, `request_id`, volatile headers hoặc SMTP recipient/config hiện tại vào fingerprint. Nếu `destination` là business input thì định nghĩa rõ; nếu là server routing config thì loại.
5. Single atomic transaction: insert inquiry+fingerprint+outbox; unique conflict phải đọc row đã thắng và so fingerprint để replay hoặc 409.
6. Nêu isolation/locking đủ cho hai request đồng thời cùng key; test same fingerprint và different fingerprint.
7. Retry sau DB/network timeout dùng cùng key, chờ/read committed result; không tạo record mới.
8. Policy cho row cũ có `request_fingerprint IS NULL`: backfill từ durable source trước validate, hoặc quarantine/explicit conflict; không mặc định coi mọi payload là giống nhau.

### Delta 2 — Readiness bảo toàn Inquiry

Chọn **Model B** (recommended) hoặc Model A:

- core API readiness = config + PostgreSQL;
- media/storage readiness riêng;
- worker readiness riêng;
- SMTP/storage/worker failure → DEGRADED, không loại core API khỏi traffic;
- storage down + PG up → Inquiry vẫn commit DB+outbox và 202;
- routes cần storage trả lỗi có kiểm soát riêng.

Routing/proxy config phải nói endpoint nào thực sự dùng để add/remove Nest API khỏi traffic.

### Delta 3 — Public media lifecycle

Chọn rõ:

- **Semantics A (recommended):** public hash/version URL tiếp tục truy cập đến purge; soft-delete ngăn reference/query mới; hoặc
- **Semantics B:** URL mất hiệu lực ngay, bắt buộc có move/deny/auth proxy.

Ghi purge delay, immutable URL, cache TTL/CDN purge, DB missing/file present, file missing/DB present, orphan quarantine/reconciliation, restore DB+media cùng snapshot và post-restore consistency scan.

### Delta 4 — Migration materialization acceptance

Ngoài concat equivalence, thêm:

- chạy riêng từng up 001..070;
- transaction boundary và migration history atomic;
- dependency validity tại mỗi prefix;
- down N map đúng up N và rollback từng prefix trên disposable DB;
- injected failure N để DB/history dừng ở prefix biết trước và resume an toàn;
- inventory DDL non-transactional + compensation/resume rule;
- test prefix N→N+1;
- test empty DB và DB có history/checksum;
- concurrent executor lock;
- chứng minh cách split down aggregate hiện chỉ có group markers thành 70 mapping thật.

### Delta 5 — Gate staging

Xóa/sửa câu `07:84`. Normative rule duy nhất:

- B23/B24 chỉ block P2.
- B25 chỉ block P3.
- Không decision nào trong ba decision này block Gate A.
- Không decision nào block P0, trừ task P0 cụ thể được chứng minh phụ thuộc trực tiếp.

### Delta 6 — Git/P0 boundary

Chọn **Option A — Pre-P0 manual prerequisite**:

- authorized user/operator restore/clone/init Git trước P0;
- Gate B verify root/main/remote-or-no-remote/baseline commit/tag/status;
- P0 chỉ re-verify và thiết lập branch/CI/tooling/scaffold;
- 301 spike **plan** có trước P0, nhưng spike **PASS** là P0 DoD, không phải `P0 READY TO START` condition.

Đổi tên P0 hoặc mô tả subheading nếu cần để không hiểu Git restoration nằm sau Gate B.

### Delta 7 — Redirect spike evidence

P0 spike phải pin exact Next.js version/package lock, router, runtime, rendering mode và production build. Test exact 301/no HTML before render với reverse proxy, streaming, cache hit/miss, route invalidation, resolver timeout/down và A→B→C.

### Delta 8 — Outbox reconciliation

Ghi nơi lưu/retention của provider response ID và acceptance evidence. Định nghĩa `duplicate-suspected` theo stable Message-ID + nhiều provider acceptance, provider accepted nhưng DB chưa sent, hoặc stale processing sau unknown outcome. Có manual outcomes `confirmed-sent`, `confirmed-duplicate`, `unknown`; không blind resend.

Provider dedup/idempotency vẫn **optional khi provider hỗ trợ**, không phải điều kiện chọn provider P0. Stable Message-ID, at-least-once disclosure và reconciliation là bắt buộc.

### Delta 9 — Performance budget

Giữ toàn bộ budget là preliminary/non-SLA. Route resolver:

- target <200 ms giữ nguyên;
- thay hard ceiling 800 ms bằng fail-fast ceiling được đo ở staging/local topology; khuyến nghị benchmark range 250–400 ms;
- report riêng resolver latency và end-to-end page TTFB.

Các upload/image/outbox/p95 budget được phép chốt bằng environment data tại phase đã ghi.

### Delta 10 — Content owner deadline

C7 phải được assign trước khi chạy CM0 thật và phải ký mapping/validation/cutover; tiếp tục là release blocker. Không đặt C7 chỉ ở before-P11.

### Delta 11 — Standalone v1.0 baseline

v1.0 phải inline đầy đủ:

- A1–A25 và D1–D20;
- strategy comparison cần để hiểu lựa chọn Hybrid;
- full nine-layer test strategy + mandatory/conditional/deferred rules;
- full R-01..R-33 với status/owner/mitigation/trigger;
- phase inputs/outputs/acceptance/rollback/evidence;
- Gate A/Gate B, DoR/DoD, RACI/file ownership;
- phase-specific open decisions và business/release decisions.

Không được dùng “giữ nguyên, xem v0.1/v0.2” như normative content. Old versions chỉ xuất hiện trong changelog/history.

### Delta 12 — Small integrity cleanup

- Sửa v0.2 inventory từ 16 thành 15 trong changelog mới.
- Ghi known note rằng `README_VERIFY.md`/một số Approved wording còn nói STATIC nhưng execution result/raw log/release manifest là evidence PASS; không sửa Approved snapshot.
- Sau khi Git được khôi phục, tạo baseline commit/tag/hash cho plan history mà không rewrite v0.1/v0.2.

## 4. Gate A status

**NOT MET.**

Gate A model đúng và Git không phải Gate A condition. Tuy nhiên 5 High chưa có correction nên điều kiện “không High chưa xử lý” chưa đạt. Codex audit này không PASS promotion và người dùng chưa phê duyệt v1.0.

Sau v0.4, Gate A có thể được re-evaluate độc lập với Git.

## 5. Gate B status

**NOT MET.**

Git hiện invalid: các lệnh `status`, `rev-parse`, `log` đều báo không phải Git repository. B23/B24/B25 không được tính là Gate B blockers. Toolchain/Docker/PostgreSQL/CI chỉ được xác nhận khi user chuẩn bị implementation environment.

## 6. Git remediation nằm ở đâu

**Trước P0, theo Option A.**

User/authorized operator restore/clone/init repository và tạo/verify baseline trước khi Gate B mở. Trong P0, team re-verify Git rồi mới scaffold, thiết lập branch/CI và chạy technical spikes. Không dùng vòng “P0 không bắt đầu vì Git, nhưng Git chỉ sửa trong P0”.

## 7. Open decisions được phép giữ theo phase

Các decision sau không chặn Gate A/v1.0 nếu deadline và owner được giữ rõ:

| Decision | Latest permitted deadline | Blocks |
|---|---|---|
| B23 cookie/origin/trusted proxy | Before P2 | P2 only |
| B24 session/logout/revocation/key rotation/account lock | Before P2 | P2 only |
| B25 content block/image/PDF processing policy | Before P3 | P3 only |
| Product lock/optimistic strategy | Before P5 | P5 only |
| SMTP/CAPTCHA, batch/timeout, recipient snapshot | Before P7 | P7 only |
| Canonical production domain/base URL/OG defaults | Before P8/P10 as applicable | P8/P10 only |
| Final RPO/RTO, freeze/cutover/DNS | Before P11 release work | P11/release |

D19 atomic semantics, readiness profile, media deletion semantics và migration acceptance **không** được defer như phase tuning; chúng phải có trong v0.4 vì là plan contract.

## 8. Business decisions được phép giữ đến release

- C1 retention có thể mở khi `expires_at=NULL` và không auto-purge; phải chốt trước production retention/purge activation.
- C2 logo approval, C3 customer confirmation email, C4 discontinued-product redirect và C6 English completeness có thể staged theo content/release, với feature/default an toàn.
- C5 domain + SPF/DKIM/DMARC phải chốt trước go-live/email production.
- C9 RPO/RTO + freeze/cutover phải chốt trước P11 release.
- C7 không được chờ đến release: phải assign trước CM0 execution và vẫn chặn release.
- C8 crawl/export authorization phải có trước khi truy cập/export site cũ.

## 9. Promotion sequence recommended

1. Tạo v0.4 chỉ với Delta 1–12; không code/migration SQL/Git mutation trong correction pass.
2. Independent verification lại High/Medium bằng file thật.
3. Khi High = 0, assemble **standalone** v1.0 từ full normative content.
4. Người dùng review và tự quyết định Gate A/promotion.
5. Khôi phục Git theo Option A và verify Gate B.
6. Chỉ sau Gate B mới bắt đầu P0 implementation.

## 10. Final recommendation

**`NEEDS v0.4 CORRECTION BEFORE PROMOTION`**

Không promote trực tiếp. Không cần major plan rework. Một correction pass hẹp, sau đó một verification ngắn, là đủ nếu tất cả High được đóng bằng nội dung plan rõ ràng.
