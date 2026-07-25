# 02 — STRATEGY OPTIONS & RECOMMENDATION

**Plan version:** v0.3 · **Trạng thái:** PROPOSED FOR FINAL VERIFICATION · **Ngày:** 2026-07-22

Giữ **Hybrid** (v0.2). Round 5B: **13 phase labels**; `/tim-kiem` **product-only**; đồng bộ gate/301/media/health.

---

## 1. Ba chiến lược + ràng buộc
Foundation-First (A) · Vertical Slice (B) · **Hybrid (C, chọn)**. Bảng so sánh 7 tiêu chí giữ `v0.1/02` §2. Ràng buộc: schema một-khối (materialize P1, CASE B); media+users dependency cứng; products phụ thuộc taxonomy; **request/redirect/SEO topology là nút thắt kiến trúc trước P4** (D17 accepted); content migration phụ thuộc dữ liệu thật; deploy compatibility (D18) từ P0; thin UI mỗi slice.

## 2. Hybrid — cụ thể

### 2.1. Foundation-first (P0–P3)
P0 tech decisions (D1–D20) + Git (Gate B) + **HTTP 301 spike** + codegen/compat tooling; P1 **materialize** raw baseline 001–070 + 3 seed pipeline; P2 core/auth + **health liveness/readiness**; P3 media + **`/media/*` delivery + document-download-gated** + ContentBlock/ExternalVideo validator.

### 2.2. Thin vertical slice (P4–P7) — mỗi slice có UI + E2E

| Slice | Minimal Admin | Minimal Public route | Browser E2E |
|---|---|---|---|
| P4 Taxonomy | brand/category create/edit/publish; applications phẳng | brand list/hồ sơ; product-list theo taxonomy route | brand draft→publish; **đổi slug→explicit 301 qua topology**; EN không fallback |
| P5 Product | product create/edit/publish | landing/list/detail | tạo→publish; lọc `(PAC OR Herzog) AND ASTM D86`; **product search** |
| P6A/B Content | mỗi entity create/edit/publish + relations | detail routes + related | publish→hiển thị; download slug; replace-set |
| P7 Inquiry | dashboard `email_failed` | InquiryModal/ContactForm | SMTP OK/lỗi/retry/idempotency; **SMTP down→vẫn 202** |

> P4 taxonomy P0 = **chỉ product-list landing theo taxonomy URL**. Rich taxonomy detail = P1.

### 2.3. Convergence + Completion
P8 web delivery (nav/homepage/redirect **explicit 301**/SEO/sitemap-robots-Nest) — **KHÔNG search feature mới** (`/tim-kiem` product-only, xử lý ở P5). P9/P10 completion (không bắt đầu FE; no Users CRUD/auto-save). P11 content delta/hardening/release.

### 2.4. Chống rủi ro tích hợp muộn
OpenAPI + generated client (D18: breaking-change + freshness + consumer smoke + mixed-version); redirect/SEO topology chứng minh sớm (P4 explicit-301 proof); content migration CM0–CM4 song song, CM3 gate trước P10.

## 3. Vì sao Hybrid hiệu chỉnh tốt hơn
Loại cycle P8/P10; UI/routing risk trong slice (thin UI P4–P7); tách fan-in P6 (P6A/P6B); P7 song song; giữ DB foundation-first (materialize); đưa content migration + operability vào release thật.

## 4. Kết luận
Hybrid: foundation P0–P3 + thin vertical P4–P7 + convergence P8 + completion P9/P10 + release P11; content migration song song. **13 phase labels**. Critical path & chi tiết `03`/`04`; topology `12`.
