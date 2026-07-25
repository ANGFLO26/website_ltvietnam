# 01 — LOCKED DECISIONS AND OPEN QUESTIONS

**Plan version:** v1.0  
**Status:** APPROVED FOR IMPLEMENTATION — PLANNING COMPLETE  
**Approval date:** 2026-07-25  
**Approval authority:** User  
**Gate A:** PASSED  
**Gate B:** NOT MET  
**Coding:** NOT AUTHORIZED UNTIL GATE B PASSES

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
| A9 | Inquiry email status: email_pending/email_sent/email_failed; outbox status: pending/processing/sent/failed | API/DB/checks dùng đúng enum |
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

## B-bis. Approved-document reconciliation register

The precedence order in `00` §1 places Backend/API above this plan. The refinements below intentionally supersede specific sections of Approved `06` and are recorded here so that precedence does not silently reverse a verified correction. Each entry carries a rationale and a governance gate. No Approved file is edited by this plan; every entry is queued as a backlog item under the Approved-document governance process, in the same manner as the stale `README_VERIFY.md` wording recorded in `10` §10.

| # | Approved section | Approved text | v0.4.1 position | Rationale | Governance gate |
|---|---|---|---|---|---|
| AR-1 | `06` PHẦN VII, Inquiry flow | `Validate DTO → CAPTCHA → Rate limit → Kiểm idempotency_key` | Durable existing-key lookup runs **before** CAPTCHA and the new-submission rate limit (§C.4 Step 2); CAPTCHA and rate limit still run for every genuinely new key (§C.4 Step 3) | ADR-003 requires CAPTCHA and rate limit before the **write transaction**, which is preserved. The Approved ordering causes a committed submission whose response was lost to be refused on retry once the CAPTCHA token expires or the IP quota is exhausted — the lead loss ADR-003 exists to prevent. | Backlog item: update `06` PHẦN VII flow to place the idempotency lookup first. Not a Gate A or Gate B condition. |
| AR-2 | `06`, internal endpoints | `GET /health/ready` (readiness: DB/storage/outbox/email) | Readiness Model B: `/health/ready` validates bootstrap config and PostgreSQL only and never checks storage, SMTP, worker, outbox backlog, CDN or media processor (`03` §2, `12` §2) | Coupling core readiness to non-core dependencies removes the Core API from proxy traffic when storage or SMTP fails, so `POST /inquiries` fails while PostgreSQL is fully usable. A20's intent is internal readiness, not lead loss. | Backlog item: split the `06` readiness description into core, media and worker profiles. Not a Gate A or Gate B condition. |
| AR-3 | `06`, internal endpoints | No equivalent endpoints defined | `/health/ready/media` and `/health/worker` added as separate internal diagnostic profiles (`03` §2, `12` §2) | Carries the dependency checks removed from core readiness by AR-2 so that no probe coverage is lost. Both are internal and non-public; no public URL and no Approved public route changes. | Backlog item: add both endpoints to the `06` internal endpoint list. Not a Gate A or Gate B condition. |
| AR-4 | — | Approved design defines no public media URL prefix; `05` stores `storage_disk`, `storage_path`, `public_url`, and `06` defines only the `/admin/media/:id` API | `/media/*` is the public read-only delivery prefix mapped to `public-media/` (`01` §D, `12` §4) | **Additive; no Approved conflict.** Recorded for completeness so future reviewers need not re-derive it. | None required. |

**Precedence rule for declared divergences.** Where a divergence is recorded in this register with a rationale and a governance gate, this plan's position is authoritative for implementation until the corresponding Approved document is updated. Undeclared differences are **not** covered by this rule: any other conflict between this plan and an Approved document resolves in favour of the Approved document per `00` §1, and must be raised as a plan defect rather than implemented.

## C. D19 — Atomic idempotency contract

### C.1. Scope và durable schema direction

- Scope là **GLOBAL UNIQUE trong Inquiry API**, khớp `UNIQUE(idempotency_key)` của baseline.
- Không sửa 001–070. `IMPLEMENTATION MIGRATION 071+` bổ sung tối thiểu `request_fingerprint` và `request_fingerprint_version` vào durable idempotency/inquiry data.
- Fingerprint lưu SHA-256 dạng lowercase hex 64 ký tự hoặc `bytea`; version lưu chuỗi ngắn, version đầu là `v1`.
- Key được client tạo một lần cho logical submission. Retry sau timeout phải dùng lại chính key đó; API/client không tự tạo key mới.

**Key format, entropy and comparison.** `Idempotency-Key` is a UUID version 4 in canonical lowercase hyphenated form (36 characters, at least 122 bits of cryptographic randomness), consistent with Approved `06` PHẦN VII. The durable column is `VARCHAR(100)`, so 100 characters is the hard maximum. The API rejects an absent, empty, whitespace-only, over-length or non-conforming key with a stable `400` validation error **before** the durable lookup; it never generates or substitutes a key on the client's behalf. Comparison is byte-exact and case-sensitive, matching the `VARCHAR` (not `CITEXT`) column type: the key is never trimmed, lowercased, or otherwise normalized, because any such transformation would change request identity. One key identifies exactly one logical submission for its entire retry lifetime. Per Approved `06`, the key may arrive either as the `Idempotency-Key` header or as `body.request_id`; if both are present the header is authoritative, and a mismatch between the two is rejected as a `400` validation error.

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
11. `preferred_contact_method`
12. `source_url`
13. `privacy_consent`

Các optional field 10–13 mang marker `missing` khi không được gửi. `location` và `company_tax_code` không thuộc accepted P0 Inquiry DTO và bị validation reject nếu xuất hiện; chúng không nằm trong fingerprint v1. **ALL ACCEPTED BUSINESS INPUT FIELDS MUST BE INCLUDED.** CI/contract review phải fail nếu DTO nhận thêm business field mà canonical schema version chưa thêm field/version. Unknown input bị validation reject, không bị silently dropped rồi hash.

Không đưa vào fingerprint: CAPTCHA token, timestamp, `request_id`, IP, User-Agent, volatile headers, SMTP recipient, current email configuration, worker/provider metadata. `destination` server-side không phải client business input và bị loại.

### C.3. Canonicalization version `v1`

- Encode UTF-8; Unicode normalize NFC cho string.
- Trim leading/trailing whitespace cho mọi textual field.
- `full_name`, `company_name`, `province`, `preferred_contact_method`: collapse mọi run whitespace nội bộ thành một space.
- `message`: normalize CRLF/CR thành `\n`, trim đầu/cuối; giữ whitespace nội bộ ngoài line-ending vì có thể mang nghĩa.
- `source_url`: trim; URL/path normalization chỉ theo Approved route normalization, không tự resolve sang host khác.
- Email: trim/NFC; lowercase **domain**; local-part giữ nguyên case sau trim để không tự thay đổi semantics.
- Phone: nếu có country context hợp lệ thì E.164; nếu không, bỏ formatting separators nhưng giữ leading `+` và digits, không tự suy country code.
- UUID: lowercase canonical hyphenated string.
- Locale: lowercase allowed enum `vi|en`.
- `privacy_consent`: Boolean literal `true`/`false`.
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

   **Original stable result (definition).** The replayed result is HTTP `202 Accepted` carrying the standard A24 `{data}` envelope with the body defined in Approved `06` PHẦN VII: `{ request_id, message }`, where `request_id` is the client-supplied idempotency key echoed verbatim and `message` is a static locale-appropriate acknowledgement string. The response contains no Inquiry UUID and no personal data of any kind — no name, company, email, phone, message body, source URL or consent timestamp. It is byte-identical to the original response and does **not** vary with `inquiry_outbox.status`, `inquiries.email_status`, worker availability or elapsed time. It is reconstructed deterministically from the idempotency key plus the existence of the committed Inquiry row; **no raw response body is stored**. Replay is recorded in internal logs and metrics only — the public response carries no replay marker header or field, because such a marker would act as a key-existence oracle on an unauthenticated endpoint.

3. Nếu version/fingerprint khác: trả 409 `IDEMPOTENCY_KEY_REUSED` trước CAPTCHA và không lộ payload cũ.
4. Đây là replay-resolution/read path, không phải write path. Replay response chỉ chứa Original stable result được định nghĩa ở trên, không mở rộng sang payload nhạy cảm.

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
11. Malformed, empty, whitespace-only, over-length and case-variant keys are rejected with a stable `400` before any durable lookup, and create no Inquiry, Outbox or attempt.
12. The key is accepted from the `Idempotency-Key` header and from `body.request_id`; when both are present the header wins; a header/body mismatch is rejected as `400`.
13. Replayed response is byte-identical to the original across outbox `pending`/`processing`/`sent`/`failed` and inquiry `email_pending`/`email_sent`/`email_failed`, contains no PII field, and is produced without reading any stored response body.

### C.7. D6/D19 durable outbox-attempt lifecycle

`IMPLEMENTATION MIGRATION 071+` hoặc migration tiếp theo khả dụng tạo durable `inquiry_outbox_attempts`; Round này không tạo SQL.

**Before provider send**

1. Worker claim outbox job.
2. Tạo attempt mới với `attempt_number`, `worker_id`, `stable_message_id`, `attempt_state='started'`, `started_at`.
3. Commit attempt-start row trong transaction ngắn trước khi gọi SMTP/provider.
4. Nếu attempt-start không commit, provider tuyệt đối không được gọi.

**Provider call và result**

- Provider call dùng stable Message-ID và diễn ra **ngoài database transaction**. Provider correlation/idempotency key chỉ dùng khi hỗ trợ.
- Provider accepted: result transaction mới cập nhật `attempt_state='accepted'`, `provider_outcome='accepted'`, provider id/status/code, `accepted_at`, `finished_at` cùng outbox/inquiry statuses.
- Known rejection/failure: result transaction mới cập nhật `attempt_state='failed'`, `provider_outcome='rejected'` hoặc `error`, sanitized error, `finished_at`, retry eligibility cùng outbox/inquiry statuses.
- Ambiguous timeout/crash: attempt hiện hữu chuyển/được reconcile ở `attempt_state='started'` hoặc `attempt_state='unknown'`; `provider_outcome` có thể là `timeout` hoặc null theo evidence; không blind resend.
- Mỗi retry tạo `attempt_number` mới; không overwrite attempt cũ.

**Attempt state model.** Each `inquiry_outbox_attempts` row carries three orthogonal fields.

`attempt_state` — machine-observed lifecycle, the only field the worker writes automatically: `started` → `accepted` | `failed` | `unknown`, then optionally → `resolved` once a manual resolution is recorded.

`provider_outcome` — nullable, recording what the provider actually returned: `accepted`, `rejected`, `timeout`, `error`. Null until the provider call returns.

`manual_resolution` — nullable, written only by a human operator and always with actor, time and reason: `confirmed-sent`, `confirmed-duplicate`, `confirmed-not-sent`, `unknown`. Writing `manual_resolution` moves `attempt_state` to `resolved`; it never rewrites `provider_outcome` or any timestamp.

`unknown` as an `attempt_state` means the system could not determine the outcome. `unknown` as a `manual_resolution` means an operator reviewed the case and concluded it is not determinable. The two are reported separately and are never merged.

**Result transaction scope.** The attempt result (`attempt_state`, `provider_outcome`, provider identifiers and codes, `accepted_at`, `finished_at`), `inquiry_outbox.status` and `inquiries.email_status` are written in **one single result transaction**, distinct from the short attempt-start transaction and opened only after the provider call has returned. No database transaction is ever held open across the provider call. If the result transaction fails, the attempt remains `started` or `unknown` and enters reconciliation; it is never blindly resent.

Outbox business status vẫn là `pending`/`processing`/`sent`/`failed`; Inquiry email status là `email_pending`/`email_sent`/`email_failed`. Hai business status này không thay thế immutable attempt history.

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
