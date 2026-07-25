# 01 — LOCKED DECISIONS AND OPEN QUESTIONS

**Plan version:** v0.4.1 · **Trạng thái:** `PROPOSED FOR FINAL VERIFICATION` · **Ngày:** 2026-07-25

Phân loại: **LOCKED** = Approved design; **USER-CONFIRMED** = D1–D20; **OPEN** = được staged theo phase; **BUSINESS** = doanh nghiệp quyết. D1–D20 là implementation decisions, không phải ADR mới.

## A. Locked decisions A1–A25

| ID | Quyết định khóa | Ảnh hưởng triển khai |
|---|---|---|
| A1 | Modular monolith; REST `/api/v1`; tách public/admin/auth | Controller → validation → application service → repository; module giao tiếp qua service/query port, không gọi repository của module khác |
| A2 | 25 application modules MVP | Không tự thêm/bớt module; infrastructure, worker, frontend và shared services nằm ngoài inventory 25 |
| A3 | PostgreSQL 16+, schema `ltv`, UUID, `TIMESTAMPTZ`, `VARCHAR+CHECK`, `pgcrypto/citext/pg_trgm` | Runtime/migration phải hỗ trợ schema riêng, extensions, CHECK và raw PostgreSQL semantics |
| A4 | Baseline 001–070, 63 bảng; 067 FK indexes, 068 search indexes, 069 partial indexes, 070 updated-at triggers; rollback 070→001; không có 071 active | P1 materialize CASE B; freeze sau full acceptance; mọi thay đổi mới dùng `IMPLEMENTATION MIGRATION 071+` |
| A5 | URL detail phẳng; taxonomy list URLs theo Approved routes | Router/API dùng slug và đúng URL đã khóa |
| A6 | Brand profile tự canonical khác brand filter; `/san-pham/hang/{slug}` → 301 filter URL | Không hợp nhất hai page type; filter noindex,follow |
| A7 | Slug không tái dùng; soft-delete giữ slug; 12 translation tables có `first_published_at`; SlugService kiểm current slug, redirect source, reserved route; rename published tạo 301 cùng transaction | Slug lifecycle là shared contract, race-tested |
| A8 | Inquiry lưu DB trước email; Inquiry + outbox cùng transaction; 202 sau commit; worker SKIP LOCKED + reaper; global `UNIQUE(idempotency_key)`; at-least-once; stable Message-ID từ outbox id | Không hứa exactly-once; D19 bổ sung fingerprint atomic mà không đổi scope global |
| A9 | Inquiry email status: pending/sent/failed; outbox status: pending/processing/sent/failed | API/DB/checks dùng đúng enum |
| A10 | Locale publication cho product/service/project/post/brand/page/document; entity + translation đều published; no Brand VI→EN fallback; hreflang chỉ khi cả hai published | Query public và PublishService phải enforce đầy đủ |
| A11 | Taxonomy/config translations không có locale publication status; năm taxonomy slug có `first_published_at` | Chỉ fallback dữ liệu độc lập ngôn ngữ theo policy |
| A12 | Media FK RESTRICT; media đang dùng trả 409; MediaUsageService quét mọi reference; chỉ JPG/JPEG/PNG/WebP/PDF; no SVG/video; magic bytes; public query loại deleted | Media hardening, reference check và D20 lifecycle bắt buộc |
| A13 | P0/P1/Future khóa; ecommerce fields có trong schema nhưng ẩn UI; applications P0 phẳng | Không scope leakage |
| A14 | Public filter dùng repeated slug keys; same dimension OR, different dimensions AND; parameter binding; whitelist sort/order; no facet count P0; Admin dùng UUID | Filter builder phải có contract/security/performance tests |
| A15 | PATCH array present = replace toàn bộ set; missing = giữ; một transaction | Replace-set concurrency test bắt buộc |
| A16 | Product primary category nằm ở link `is_primary`; featured image ở product; no featured media role; no service_documents; brand NOT NULL; draft tối thiểu; PublishService kiểm completeness | Không tạo duplicate schema/concept |
| A17 | Canonical/robots tự sinh, không lưu DB; translation chỉ seo title/description; social fallback; sitemap/robots backend; structured data Approved | Nest authoritative; Next chỉ serialize head/JSON-LD |
| A18 | External video chỉ YouTube/Vimeo; validate domain/id/canonical URL; không raw iframe/script, không upload video, document type không video | Trả mã validation đã khóa |
| A19 | Admin auth Argon2id; JWT HttpOnly/Secure/SameSite=Strict, 8h; CSRF writes; explicit CORS; login throttling/lock; reset invalidated by password change | B23/B24 phải chốt trước P2 |
| A20 | `/health/live` public; readiness nội bộ; structured audit application log, không bảng audit; fields bắt buộc; không full PII/secrets | Dùng Readiness Model B để hiện thực intent mà không làm mất lead |
| A21 | Redis không bắt buộc MVP; local storage qua adapter; SMTP adapter; DB outbox worker; product landing endpoint riêng | Single-instance assumption được ghi rõ; abstraction cho scale sau |
| A22 | Search dùng pg_trgm, engine thay sau không đổi API; P0 product-only | Site-wide search là P1 |
| A23 | `inquiries.expires_at` nullable, không default; retention months TBD; không auto purge/anonymize hiện tại | C1 là business decision; khác với media purge delay D20 |
| A24 | Response `{data}`/`{data,meta}`; error envelope chuẩn; HTTP/code set; validation frontend→DTO→DB | Contract tests đối chiếu OpenAPI/Approved API |
| A25 | Enum thống nhất cho link types, media role, statuses, document type, email/outbox state | Không phát sinh synonym hoặc enum drift |

**Ownership clarification cho A17/A20:** Nest là nguồn authoritative cho route resolution, publication/locale/canonical/robots/SEO/sitemap; Next là delivery/serialization adapter. Model B tách core/media/worker readiness, không làm thay đổi URL Approved.

## B. User-confirmed implementation decisions D1–D20

| ID | Quyết định | Contract |
|---|---|---|
| D1 | NestJS backend | Modular monolith, DI, module boundary |
| D2 | Một Next.js app | Public + `/admin`; security authority ở Nest |
| D3 | pnpm monorepo | `apps/api`, `apps/web`, `apps/worker`; shared contracts/route rules/config/testing |
| D4 | Kysely runtime + raw SQL bắt buộc | Raw SQL cho PostgreSQL-specific locking/filter khi cần; không để abstraction che semantics |
| D5 | Raw SQL migration baseline | Materialize 001–070, history/checksum; 071+ sau freeze; down chỉ disposable/test, production dùng restore/forward fix |
| D6 | Worker process riêng | Stop-claim, drain, heartbeat, lease, reaper, retry, structured logs; durable attempt row commit trước provider call; provider call ngoài DB transaction; result update bằng transaction mới; attempt history không overwrite |
| D7 | Single persistent VPS + Docker Compose | Proxy, Next, Nest, worker, PostgreSQL 16, persistent media, DB+media backup; no serverless/Redis P0 |
| D8 | Persistent volume qua StoragePort | Không dùng ephemeral container filesystem; có đường chuyển S3/R2 sau |
| D9 | In-process cache/rate limit P0 | Chỉ single-instance safe; chuyển shared store khi scale ngang |
| D10 | Reverse-proxy routing matrix | Cùng public origin; proxy route theo file `12` |
| D11 | Nest authoritative redirect | Next gọi resolver trước render và phát HTTP redirect; không business redirect logic ở Next |
| D12 | Nest authoritative SEO | Next serialize head; shared package chỉ constants/types/normalization thuần |
| D13 | Sitemap/robots ở Nest | Proxy route root URLs tới Nest |
| D14 | Content migration CM0–CM4 | Workstream song song P4–P11, C7 trước CM0 thực |
| D15 | Git integrity prerequisite | Option A: user/operator khôi phục trước P0; Gate B verify; P0 chỉ re-verify/setup |
| D16 | Node supported LTS | Node 24 preferred nếu compatible, Node 22 fallback; cấm EOL; pin toolchain |
| D17 | Next-delivery redirect accepted | Exact 301 trước streaming/render; resolver failure fail-safe; P0 exact-version spike |
| D18 | `/api/v1` compatibility | Additive compatible changes; breaking → v2 hoặc approved deprecation; CI breaking/freshness; mixed-version; expand→backfill→contract |
| D19 | Atomic idempotency contract | Global unique key, versioned durable fingerprint; durable replay lookup trước CAPTCHA/submission rate limit; atomic inquiry+outbox write remains final arbiter; deterministic replay/409; chi tiết §C |
| D20 | Public media delivery | `/media/*` chỉ map `public-media/`; protected documents nằm ngoài public root và chỉ qua Nest; Semantics A public-until-purge; chi tiết §D |

## C. D19 — Atomic idempotency contract

### C.1. Scope và durable schema direction

- Scope là **GLOBAL UNIQUE trong Inquiry API**, khớp `UNIQUE(idempotency_key)` của baseline.
- Không sửa 001–070. `IMPLEMENTATION MIGRATION 071+` bổ sung tối thiểu `request_fingerprint` và `request_fingerprint_version` vào durable idempotency/inquiry data.
- Fingerprint lưu SHA-256 dạng lowercase hex 64 ký tự hoặc `bytea`; version lưu chuỗi ngắn, version đầu là `v1`.
- Key được client tạo một lần cho logical submission. Retry sau timeout phải dùng lại chính key đó; API/client không tự tạo key mới.

### C.2. Exact canonical field set v1

Fingerprint lấy từ **validated business request object**, theo thứ tự key cố định:

1. `inquiry_type`
2. `full_name`
3. `company_name`
4. `phone`
5. `email`
6. `message`
7. `product_id`
8. `service_id`
9. `locale`
10. `province`
11. `location`
12. `preferred_contact_method`
13. `source_page`
14. `source_path`
15. `consent`
16. `company_tax_code`

Các field 10–16 chỉ có giá trị khi OpenAPI/DTO P0 thực sự chấp nhận; nếu không được chấp nhận chúng mang marker `missing`. **ALL ACCEPTED BUSINESS INPUT FIELDS MUST BE INCLUDED.** CI/contract review phải fail nếu DTO nhận thêm business field mà canonical schema version chưa thêm field/version. Unknown input bị validation reject, không bị silently dropped rồi hash.

Không đưa vào fingerprint: CAPTCHA token, timestamp, `request_id`, IP, User-Agent, volatile headers, SMTP recipient, current email configuration, worker/provider metadata. `destination` server-side không phải client business input và bị loại.

### C.3. Canonicalization version `v1`

- Encode UTF-8; Unicode normalize NFC cho string.
- Trim leading/trailing whitespace cho mọi textual field.
- `full_name`, `company_name`, `province`, `location`, `preferred_contact_method`, `company_tax_code`: collapse mọi run whitespace nội bộ thành một space.
- `message`: normalize CRLF/CR thành `\n`, trim đầu/cuối; giữ whitespace nội bộ ngoài line-ending vì có thể mang nghĩa.
- `source_page`/`source_path`: trim; path normalization chỉ theo Approved route normalization, không resolve sang absolute host.
- Email: trim/NFC; lowercase **domain**; local-part giữ nguyên case sau trim để không tự thay đổi semantics.
- Phone: nếu có country context hợp lệ thì E.164; nếu không, bỏ formatting separators nhưng giữ leading `+` và digits, không tự suy country code.
- UUID: lowercase canonical hyphenated string.
- Locale: lowercase allowed enum `vi|en`.
- Boolean: literal `true`/`false`.
- `missing`, JSON `null` và empty string có representation riêng, ổn định; không tự coi tương đương.
- Serialize deterministic JSON với key order đúng danh sách trên, không insignificant whitespace, stable escaping và stable scalar representation.
- Hash bytes UTF-8 của serialization bằng SHA-256; lưu fingerprint cùng `request_fingerprint_version='v1'`.

### C.4. Replay ordering, atomic write và race behavior

**Step 1 — Parse and normalize**

1. Validate request shape/type.
2. Canonicalize business fields và tính fingerprint v1.
3. Không thực hiện business write.

**Step 2 — Existing-key replay lookup**

1. Lookup durable winner theo global `Idempotency-Key` trước CAPTCHA và new-submission rate limit.
2. Nếu stored fingerprint version + fingerprint giống request: trả original stable result; không chạy lại CAPTCHA, không tiêu thụ submission quota và không tạo Inquiry, Outbox hoặc attempt.
3. Nếu version/fingerprint khác: trả 409 `IDEMPOTENCY_KEY_REUSED` trước CAPTCHA và không lộ payload cũ.
4. Đây là replay-resolution/read path, không phải write path. Replay response chỉ chứa stable result đã định nghĩa, không mở rộng sang payload nhạy cảm.

**Step 3 — New-submission guards**

Chỉ khi durable lookup xác nhận key chưa tồn tại: validate CAPTCHA, apply new-submission rate limit và kiểm các external guards còn lại. CAPTCHA failure cho một genuinely new key dừng flow trước business write.

**Step 4 — Atomic write**

1. Begin database transaction.
2. Thực hiện atomic insert Inquiry theo global `idempotency_key`.
3. Winner tạo đúng một Outbox row trong cùng transaction, commit Inquiry + Outbox rồi trả 202/result mới.
4. Nếu unique conflict vì request đồng thời dù cả hai early lookup đều thấy chưa có row: chờ/read winner. Same version+fingerprint → replay; khác → 409.
5. Early lookup chỉ tối ưu replay resolution và không thay thế unique constraint/atomic conflict handling. Không có check-before-insert race.

Isolation mặc định có thể là READ COMMITTED nếu unique constraint + conflict/read behavior được chứng minh; deadlock/serialization failure chỉ retry bounded ở repository bằng cùng key/fingerprint, có jitter và telemetry, không retry vô hạn. Hai request đến đúng đồng thời chỉ tạo một Inquiry và một Outbox.

**Abuse protection:** replay path có thể có read/abuse rate limit riêng, nhưng control này không được làm legitimate retry mất khả năng resolve, không gửi email lại, không tạo record/attempt mới và không trả dữ liệu ngoài stable result.

### C.5. Unknown commit, rollback và legacy NULL

- Timeout/network loss sau commit không rõ: client retry cùng key và đi vào Step 2. Retry không phụ thuộc CAPTCHA token cũ còn hiệu lực và không bị new-submission quota từ chối; repository resolve committed winner và trả original result. Nếu replay lookup DB timeout/failure, trả retriable safe error, không tạo key mới và không chuyển sang write path.
- Rollback trước commit để lại không Inquiry/Outbox/history thắng; retry cùng key có thể trở thành winner.
- Khi áp migration trên DB có data: add nullable columns → dual-write records mới → chỉ backfill khi durable source đủ để tái tạo đúng → validate coverage → constraint/NOT NULL ở migration sau.
- Row không thể backfill được mark/quarantine `legacy-unresolved`; retry cùng key trả explicit legacy conflict/resolution path, không mặc định coi payload mới là trùng.
- Fingerprint version mismatch không được so raw như tương đương; replay chỉ khi policy hỗ trợ exact old version, nếu không trả explicit conflict và operator-safe resolution.

### C.6. Mandatory tests

1. First request commit, response lost, CAPTCHA expired; retry same key vẫn replay original result.
2. First request commit, submission quota exhausted; retry same key vẫn replay.
3. Existing key + different payload trả 409 trước CAPTCHA.
4. Hai simultaneous requests cùng thấy no row; unique constraint vẫn chỉ cho một winner và đúng một Inquiry/Outbox.
5. CAPTCHA failure cho genuinely new key không tạo business write.
6. Replay lookup DB timeout/failure trả retriable safe error; client không tạo key mới.
7. Replay path không tạo Inquiry, Outbox hoặc attempt mới.
8. Concurrent same-key/same-fingerprint và same-key/different-fingerprint.
9. Unique conflict after transaction wait; rollback before commit; commit succeeded/response lost.
10. Legacy NULL row; fingerprint version mismatch; canonical-equivalent và materially-different inputs.

### C.7. D6/D19 durable outbox-attempt lifecycle

`IMPLEMENTATION MIGRATION 071+` hoặc migration tiếp theo khả dụng tạo durable `inquiry_outbox_attempts`; Round này không tạo SQL.

**Before provider send**

1. Worker claim outbox job.
2. Tạo attempt mới với `attempt_number`, `worker_id`, `stable_message_id`, `state='started'`, `started_at`.
3. Commit attempt-start row trong transaction ngắn trước khi gọi SMTP/provider.
4. Nếu attempt-start không commit, provider tuyệt đối không được gọi.

**Provider call và result**

- Provider call dùng stable Message-ID và diễn ra **ngoài database transaction**. Provider correlation/idempotency key chỉ dùng khi hỗ trợ.
- Provider accepted: transaction mới cập nhật attempt thành `accepted` với provider id/status/code, `accepted_at`, `finished_at`, rồi cập nhật outbox/inquiry status theo atomic rule phù hợp.
- Known rejection/failure: transaction mới cập nhật `failed`, sanitized error, `finished_at` và retry eligibility.
- Ambiguous timeout/crash: attempt hiện hữu chuyển/được reconcile ở `started` hoặc `unknown`; không blind resend.
- Mỗi retry tạo `attempt_number` mới; không overwrite attempt cũ.

**Minimum attempt states:** `started`, `accepted`, `failed`, `unknown`, `confirmed-sent`, `confirmed-duplicate`, `confirmed-not-sent`. Manual resolution lưu actor, time và reason audit. Outbox business status vẫn có thể là pending/processing/sent/failed nhưng không thay thế attempt history.

**Crash/lease rules**

- Crash trước provider call: durable started attempt được phân loại bằng evidence; chỉ retry khi policy xác định provider chưa nhận.
- Crash sau provider accepted nhưng trước DB update, hoặc DB unavailable sau acceptance: preserve stable Message-ID, mark/resolve unknown, query provider hoặc manual reconciliation; không gửi lại ngay.
- Claim/attempt-start transaction ngắn; result update dùng transaction mới; không giữ DB transaction suốt SMTP call.
- Lease/heartbeat ngăn reaper claim khi provider call hợp lệ đang chạy. Reaper gặp `started`/`unknown` phải chuyển qua reconciliation rule, không blind resend.

## D. D20 — Public media semantics A

- **SEMANTICS A — PUBLIC-UNTIL-PURGE** áp dụng public marketing images, generated variants và content-addressed/versioned URLs.
- Physical/logical namespace security boundary:

  ```text
  persistent-media-volume/
  ├── public-media/
  │   ├── originals/
  │   └── variants/
  └── protected-documents/
  ```

  Exact internal names có thể đổi khi implement, nhưng boundary không được đổi.
- `/media/*` chỉ map tới `public-media/`, không map volume root và không thể reach `protected-documents/`. Proxy delivery là read-only, no directory listing, no symlink traversal; canonical resolved path phải nằm trong public root; dotfiles/internal metadata/temp/quarantine bị deny.
- `protected-documents/` nằm ngoài public web root, không có direct public URL. Nest kiểm publication/locale/deleted/existence rồi stream hoặc dùng protected internal redirect; internal redirect location không accessible trực tiếp từ Internet.
- Storage routing dựa validated media type/storage class, không chỉ filename extension: public marketing original/variant → `public-media/`; gated PDF/document → `protected-documents/`; temp/quarantine → private non-public location.
- Soft-delete ngăn reference mới và ngăn Admin/Public API trả record active, nhưng không xóa file ngay; URL cũ có thể truy cập đến purge.
- Preliminary purge delay: **30 ngày**, configurable, độc lập C1. Chốt lại trước P3 nếu business yêu cầu khác.
- Immediate purge chỉ qua privileged action + confirmation + MediaUsageService usage check.
- URL có immutable content identity nhưng cache lifetime hữu hạn: preliminary `max-age=24h`; không dùng unbounded immutable cache. CDN/proxy purge khi hạ tầng hỗ trợ; nếu browser cache không purge được, effective revocation tối đa là cache TTL.
- Purge: verify soft-delete → retention elapsed → no active reference → mark job → purge CDN/proxy → delete variants → delete original → update purge status/timestamp → consistency check → sanitized evidence.
- DB missing/file present: move file ra khỏi served public root vào private orphan quarantine, purge/invalidate cache và delete sau grace nếu không recover; không chỉ ghi report trong khi proxy còn serve. DB present/file missing: mark BROKEN/DEGRADED, alert, không tự xóa DB. Purged URL trả 404 hoặc 410 theo route policy sau cache expiry/purge.
- Backup/restore dùng cùng snapshot/cutoff cho DB + media, giữ đúng namespace và permissions; restore chỉ PASS sau existence, checksum, orphan, missing-file và namespace/permission scans.
- Controlled documents luôn qua `/api/v1/documents/:slug/download` để Nest kiểm publication/locale/deleted/existence; client không suy filesystem path.

## E. Open decisions và staging normative

| Decision | Deadline | Owner | Status | Blocks |
|---|---|---|---|---|
| Pre-P0 Git restoration Option A | Before Gate B | User/authorized operator | OPEN | Gate B/P0 only |
| B23 cookie/origin/trusted proxy | Before P2 | Security/Ops | OPEN | P2 only |
| B24 session/logout/revocation/key rotation/CSRF/account lock | Before P2 | Security/User | OPEN | P2 only |
| B25 content-block/image/PDF processing limits/policy | Before P3 | Security/Architecture | OPEN | P3 only |
| Product optimistic/row-lock strategy | Before P5 | Product/DB owner | OPEN | P5 only |
| SMTP/CAPTCHA/provider, batch/timeout, recipient snapshot | Before P7 | User/Ops | OPEN | P7 only |
| Canonical domain/public base URL/OG defaults | Before P8/P10 | User/Ops | OPEN | Relevant phase only |
| RPO/RTO, freeze, DNS/cutover | Before P11 release work | User/Ops | OPEN | P11/release |

B23/B24/B25 không chặn Gate A, Gate B hoặc P0. Chỉ phase liên quan trở thành NOT READY nếu deadline decision chưa được đáp ứng.

## F. Business decisions C1–C9

| ID | Decision | Deadline | Owner | Status | Safe default hoặc effect |
|---|---|---|---|---|---|
| C1 | Inquiry retention months | Before production retention | Business/Privacy | OPEN | NULL/no automated purge until approved; không liên quan media 30-day purge |
| C2 | Customer logo approver | Before public logo workflow | Content owner | OPEN | Manual approval + `is_public` |
| C3 | Customer confirmation email | Before enabling channel | Business/Ops | OPEN | Internal notification only P0 unless approved |
| C4 | Discontinued-product redirect | Before policy activation | Content/SEO | OPEN | Keep URL unless case approved |
| C5 | Domain + SPF/DKIM/DMARC | Before production email/go-live | Ops | OPEN — RELEASE GATE | Release blocker |
| C6 | English completeness | Before EN launch sign-off | Content | OPEN | Independent publication; no fallback |
| C7 | Content/data migration owner | **Before CM0 execution thực** | User | OPEN — CM/RELEASE GATE | Owner approves inventory/mapping/rights, signs CM3 and CM4; remains blocker through go-live |
| C8 | Crawl/export authorization | Before accessing old site | User/Legal | OPEN — ACCESS GATE | No crawl/export without authorization |
| C9 | RPO/RTO + freeze/cutover | Before P11 release work | User/Ops | OPEN — RELEASE GATE | Release blocker |

## G. Implementation details không cần user approval riêng

Test runner, logging library, lint/format tool, class/DTO names, image variant names, exact folder internals, validation library và backoff value trong approved range do implementer chọn theo stack. Nếu một detail làm đổi schema/URL/scope hoặc phá contract ở trên, nó phải quay lại decision review.
