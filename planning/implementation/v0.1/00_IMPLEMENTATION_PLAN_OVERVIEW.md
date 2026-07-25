# 00 — IMPLEMENTATION PLAN OVERVIEW — WEBSITE LT VIETNAM

**Plan version:** v0.1
**Ngày:** 2026-07-22
**Trạng thái:** `PROPOSED FOR CROSS-REVIEW` (KHÔNG phải Approved / KHÔNG phải READY TO CODE)
**Tác giả:** Claude (Round 1)
**Nguồn sự thật thiết kế:** bộ tài liệu `doc/00`–`10` v1.2.1 (Approved) + `doc/verify/` (PostgreSQL 16 ALL CHECKS PASSED).

---

## 1. Mục đích của bộ tài liệu này

Đây là **kế hoạch triển khai kỹ thuật** (không phải thiết kế lại, không phải code) cho website B2B LT Vietnam. Nó trả lời: bắt đầu từ đâu, module phụ thuộc nhau ra sao, phần nào làm song song, phần nào bắt buộc trước, mỗi giai đoạn tạo ra gì, kiểm tra bằng cách nào, khi nào xong, rollback thế nào, ai làm, ai review, làm sao 2 AI không giẫm chân nhau, và điều kiện chính xác để chuyển từ planning sang coding.

Bộ tài liệu này được thiết kế để đi qua **6 vòng cross-review** (xem `08` mục quy trình): Claude v0.1 → ChatGPT structural → Codex audit → Claude response → reconciliation v1.0 → coding prompt. Chỉ sau reconciliation (Round 5) mới được ghi `APPROVED FOR IMPLEMENTATION — PLANNING COMPLETE`.

## 2. Ranh giới nhiệm vụ (điều KHÔNG làm)

- KHÔNG viết code ứng dụng, migration, `package.json`, `Dockerfile`, source.
- KHÔNG sửa `doc/00`–`10`, `doc/verify/`, `doc/archive/`; không đổi ADR/schema/URL/phạm vi MVP.
- KHÔNG âm thầm chốt framework — mọi quyết định công nghệ chưa khóa được ghi **OPEN DECISION** + khuyến nghị.
- KHÔNG đưa chức năng P1/Future vào yêu cầu bắt buộc của P0.

## 3. Bộ 12 file & cách đọc

| # | File | Nội dung | Đọc khi |
|---|---|---|---|
| 00 | `00_IMPLEMENTATION_PLAN_OVERVIEW.md` | Tổng quan, trạng thái, cách đọc, tóm tắt chiến lược | Bắt đầu |
| 01 | `01_LOCKED_DECISIONS_AND_OPEN_QUESTIONS.md` | Quyết định LOCKED / OPEN / BUSINESS / IMPLEMENTATION | Cần biết cái gì đã chốt |
| 02 | `02_STRATEGY_OPTIONS_AND_RECOMMENDATION.md` | So sánh 3 chiến lược + khuyến nghị Hybrid | Cần hiểu vì sao thứ tự này |
| 03 | `03_MODULE_DEPENDENCY_GRAPH.md` | DAG 26 module + critical path | Lập lịch, phân công |
| 04 | `04_PHASES_MILESTONES_AND_CRITICAL_PATH.md` | 12 phase, mỗi phase 24 mục | Trước khi code một phase |
| 05 | `05_MODULE_IMPLEMENTATION_MATRIX.md` | Ma trận Requirement × (Phase/API/UI/DB/Test/Evidence) | Kiểm tra độ phủ P0 |
| 06 | `06_TEST_AND_QUALITY_STRATEGY.md` | 9 lớp test + test bắt buộc theo ADR | Viết test trước |
| 07 | `07_DEFINITION_OF_READY_AND_DONE.md` | DoR/DoD | Cổng vào/ra mỗi phase |
| 08 | `08_AI_COLLABORATION_AND_FILE_OWNERSHIP.md` | Phân công, ownership, Git, handoff, xung đột | Khi phối hợp 2 AI |
| 09 | `09_RISK_REGISTER.md` | Risk register đầy đủ | Kiểm soát rủi ro |
| 10 | `10_CODEX_REVIEW_PACKAGE.md` | Bản độc lập gửi Codex phản biện | Round 3 |
| — | `PLAN_CHANGELOG.md` | Nhật ký plan | Theo dõi thay đổi plan |

## 4. Tóm tắt chiến lược (chi tiết ở `02`)

**Khuyến nghị: Hybrid.**
- **Foundation-first cho Phase 0–3** (tooling · DB baseline 001–070 · core auth/users/settings/health · media). Lý do cứng: schema PostgreSQL lên **một khối** (ADR-013 — baseline 001–070 đóng băng), *không thể* làm "DB per slice"; `media` + `users` là dependency cứng của mọi thứ.
- **Vertical slice cho Phase 4–7** (mỗi domain đi qua DB-đã-có → API → Admin → Public FE): taxonomy → **products (nút thắt)** → content → inquiry.
- **Cross-cutting cuối cho Phase 8–11**: navigation/homepage/SEO/search → hardening/release.

## 5. Critical path (chi tiết ở `03`/`04`)

```
P0 Tech decisions → P1 DB baseline 001–070 → P2 core+auth → P3 media
   → P4 brands+categories → P5 PRODUCTS + filter/search
   → P10 public product pages → P8 SEO/redirect → P11 hardening/release
```
`products` (P5) là **nút thắt**: phụ thuộc nhiều nhất (brands NOT NULL, categories, standards, applications, industries, media) và được nhiều thứ phụ thuộc (search, filter, homepage, navigation, inquiry, sitemap).

## 6. 12 Phase (một dòng — chi tiết ở `04`)

| Phase | Tên | Sản phẩm chính |
|---|---|---|
| P0 | Technology decisions & repo bootstrap | OPEN DECISIONS được chốt; skeleton repo/tooling/CI |
| P1 | Dev env + DB baseline | Migration 001–070 chạy thật + rollback + seed tối thiểu |
| P2 | Core foundation | config/error/logging/auth/users/settings/health/audit-log |
| P3 | Media & storage | Upload an toàn + MediaUsageService + storage adapter |
| P4 | Catalogue taxonomy | brands, categories, standards, applications, industries + SlugService |
| P5 | Products & relationships | products + PublishService + filter builder + search + landing |
| P6 | Content | pages, services, projects, posts, documents, customers, offices + external_video |
| P7 | Inquiry & outbox worker | Persist + 202 + worker SKIP LOCKED + reaper + idempotency + email |
| P8 | Navigation, homepage, redirects, SEO, search | mega menu, homepage, redirect middleware, module seo |
| P9 | Admin frontend | Toàn bộ màn Admin (07) |
| P10 | Public frontend | Toàn bộ trang công khai SSR (02/08) |
| P11 | Integration, security, performance, a11y, release | E2E + security + perf + SEO audit + go-live |

## 7. Điều kiện chuyển planning → coding (tóm tắt)

Chỉ khi (chi tiết ở `07`/`08`): (a) không còn **Critical**; (b) không còn **High** chưa xử lý; (c) mọi **Medium** có disposition rõ; (d) OPEN DECISION bắt buộc (đặc biệt stack backend/frontend) đã được người dùng chốt; (e) **Phase 0 và Phase 1 đạt Definition of Ready**. Khi đó plan lên `v1.0 — PLANNING COMPLETE`, rồi mới tạo coding prompt cho phase đầu tiên.

## 8. Câu hỏi cần người dùng chốt (chi tiết ở `01`)

1. **Hệ công nghệ backend + frontend** (gốc của ~15 OPEN DECISION) — khuyến nghị hệ TypeScript, chờ chốt.
2. Monorepo vs multi-repo; hosting; CI/CD.
3. **6 Business decisions** (retention inquiry, duyệt logo KH, email xác nhận khách, redirect SP ngừng KD, domain+SPF/DKIM/DMARC, mức hoàn thiện tiếng Anh).

Không câu nào chặn việc *tạo* plan v0.1; chúng chặn *Round 5* và *coding*.
