# 09 — RISK REGISTER

**Plan version:** v0.1 · **Trạng thái:** PROPOSED FOR CROSS-REVIEW · **Ngày:** 2026-07-22

Xác suất/Tác động: L(thấp)/M(vừa)/H(cao). Owner: C=Claude, X=Codex, U=Người dùng.

| ID | Rủi ro | XS | TĐ | Phase | Biện pháp | Dấu hiệu phát hiện | Owner |
|---|---|---|---|---|---|---|---|
| R-01 | **Chọn sai stack** (khó đổi về sau) | M | H | P0 | Chốt B1 qua cross-review trước bootstrap; ưu tiên hệ có SSR+Postgres tốt | Sau P0 phát sinh giới hạn SSR/queue/type-sharing | U |
| R-02 | **Over-engineering** (Redis/microservice/CQRS sớm) | M | M | mọi | Bám A21 (Redis optional, in-process); modular monolith; YAGNI cho P1/Future | PR thêm hạ tầng ngoài scope | X |
| R-03 | **P1/Future lọt vào MVP** (facet count, bulk, scheduled, product_videos, audit UI, attachment) | M | M | P4–P10 | Checklist DoR "không P1/Future"; đối chiếu ADR-006/`01`A; review chéo | UI/endpoint xuất hiện tính năng P1 | X |
| R-04 | **Hai AI sửa xung đột** cùng file/service lõi | M | M | P4–P10 | Ownership theo module; service lõi = Claude; branch theo phase; rebase | Merge conflict lặp; hai PR chạm SlugService | C |
| R-05 | **Migration drift** (migration lệch `05`; sửa baseline đã freeze) | M | H | P1 | Đối chiếu từng bảng/cột với `05`; freeze 001–070; migration mới ≥071 do 1 owner | verify_checks fail; số migration trùng | C |
| R-06 | **API khác tài liệu** (drift so 06/OpenAPI) | M | M | P2–P10 | OpenAPI là hợp đồng; contract test mỗi phase; review đối chiếu 06 | contract test fail; FE lệch shape | X |
| R-07 | **Thiếu locale-status / trộn ngôn ngữ** (fallback brand, hreflang sai) | M | H | P4–P10 | Query công khai đủ điều kiện locale-status; unit test không-fallback-brand; hreflang cả-hai-published | trang EN hiện nội dung VI; hreflang EN khi EN chưa publish | C |
| R-08 | **Slug/redirect sai** (chain/loop, tái dùng slug, không tạo redirect) | M | H | P4/P8 | SlugService 3-nguồn; redirect loop/chain detector; test đổi slug transaction | redirect loop; 404 sau đổi slug; slug tái dùng | C |
| R-09 | **Inquiry mất hoặc gửi trùng** (mất lead / spam nội bộ) | M | H | P7 | Lưu DB trước email + 202; SKIP LOCKED+reaper; idempotency; **at-least-once + Message-ID ổn định** | inquiry mất khi SMTP lỗi; nhiều email cùng inquiry | C |
| R-10 | **Thiếu quyết định DN chặn tiến độ** (C1–C6) | M | M | P7/P11 | Ghi rõ ở `01` C; dùng MailHog/giá trị mặc định để build; escalate sớm | P7/P11 chờ domain/SPF; retention chưa chốt | U |
| R-11 | **Media xóa nhầm** (mất ảnh âm thầm) | L | H | P3 | FK RESTRICT + MediaUsageService + 409; purge có trễ; không SET NULL | ảnh vỡ; xóa media đang dùng không báo | C |
| R-12 | **N+1 query** (list/detail/homepage/landing) | H | M | P5/P8/P10 | Batch load; EXPLAIN; N+1 detection ở perf test | query count cao; latency tăng theo số bản ghi | C |
| R-13 | **SEO sai canonical/robots/noindex** | M | H | P8/P10 | Resolver theo bảng ADR-011; unit test mọi loại trang; SEO audit P11 | filter được index; canonical sai; sitemap chứa noindex | C |
| R-14 | **Test giả / báo PASS không evidence** | M | H | mọi | DoD yêu cầu evidence; mutation-sanity; DB thật (không SQLite); review chéo | PASS nhưng không log/report; test không fail khi phá logic | X |
| R-15 | **Deploy không tương thích storage/email** | M | H | P11 | Adapter storage/SMTP; test trên staging giống prod; kiểm SPF/DKIM/DMARC | email vào spam; upload lỗi trên prod | U |
| R-16 | **Thiếu nội dung thật để test** (catalogue/brand thật) | M | M | P5/P11 | Seed dữ liệu gần thật (PAC/Herzog/ASTM); yêu cầu DN cấp mẫu | filter/search không phản ánh thực tế | U |
| R-17 | **Secrets bị commit** | L | H | mọi | `.gitignore` + secret scan CI; settings mask; không log secret | secret trong git history/log | X |
| R-18 | **PII logging** (inquiry message, email khách) | M | H | P2/P7 | Audit log field-list cố định; last_error sanitize; không log full message | log chứa email/nội dung inquiry | C |
| R-19 | **Lỗ hổng upload/injection** (SVG/MIME spoof/XSS block/header injection/path traversal) | M | H | P3/P6/P7 | magic-bytes; sanitize whitelist; email header sanitize; security test bắt buộc | SVG/MP4 nhận; script chạy trong content; CRLF header | C |
| R-20 | **Tích hợp FE↔API muộn** | M | M | P9/P10 | OpenAPI + scaffold FE sớm (P4); contract test | FE dồn cuối; nhiều đổi contract sát release | X |
| R-21 | **Concurrency ngầm định sai** (2 request đổi slug; publish đua) | L | M | P4/P5/P7 | Transaction + unique + test 2-request; SKIP LOCKED | redirect trùng; hai primary category | C |
| R-22 | **Baseline verify mới STATIC/one-run** (chưa chạy lại độc lập) | M | M | P1 | Người dùng/CI chạy migration thật; Codex chạy lại độc lập | khác biệt giữa môi trường | U |

## Rủi ro theo mức ưu tiên
- **Cao nhất (H×M+):** R-05, R-07, R-08, R-09, R-13, R-14, R-19 → cần test/review chuyên sâu + evidence.
- **Cần DN:** R-10, R-15, R-16, R-22 (người dùng/DN owner).
- **Điều phối 2 AI:** R-04, R-14, R-20 (Codex giám sát).

## Cơ chế theo dõi
Risk register cập nhật mỗi phase; rủi ro mới → thêm ID; rủi ro đóng → ghi ngày + evidence. Bất kỳ **Critical** phát sinh → chặn gate `07` C cho tới khi xử lý.
