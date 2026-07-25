# 07 — DEFINITION OF READY & DEFINITION OF DONE

**Plan version:** v0.1 · **Trạng thái:** PROPOSED FOR CROSS-REVIEW · **Ngày:** 2026-07-22

Hai cổng chất lượng cho mỗi phase. Thiếu một điều kiện DoR → phase **NOT READY** (không code). Thiếu một điều kiện DoD → phase **NOT DONE** ("chạy trên máy tôi" ≠ DONE).

---

## PHẦN A — DEFINITION OF READY (trước khi code một phase)

- [ ] **Phạm vi phase rõ** — module, in/out, boundary xác định (theo `04`).
- [ ] **Không còn quyết định kỹ thuật bắt buộc còn mở** ảnh hưởng phase (OPEN DECISION liên quan đã chốt ở `01`).
- [ ] **Input/output xác định** — dữ liệu vào, kết quả ra, side-effect.
- [ ] **API contract xác định** — endpoint, request/response shape, error codes (OpenAPI cập nhật).
- [ ] **Database objects xác định** — bảng/cột/constraint liên quan (đã có trong baseline 001–070; phase không thêm bảng ngoài P1).
- [ ] **Acceptance criteria rõ** — điều kiện chấp nhận cụ thể, đo được.
- [ ] **Test cases viết trước** — danh sách test theo `06` cho phase, kể cả concurrency/security nếu áp dụng.
- [ ] **Không P1/Future lẫn P0** — kiểm chiếu ADR-006/`01` PHẦN A.
- [ ] **Người implement & reviewer đã rõ** — theo `08` (implementer ≠ reviewer).
- [ ] **Branch/file ownership rõ** — thư mục module + branch theo phase/task (không giẫm chân).

### DoR đặc thù
- **P0:** OPEN DECISIONS B1–B10, B19 đã chốt.
- **P1:** `05` §XIV thứ tự migration nắm rõ; Postgres 16 sẵn sàng.
- **P7:** phương án SMTP test (MailHog nếu C5 chưa xong) + settings.email seed.
- **P8/P10:** SEO resolver spec (ADR-011 bảng robots) rõ ràng.
- **P11:** C1/C4/C5 chốt cho release.

---

## PHẦN B — DEFINITION OF DONE (một phase mới DONE)

- [ ] **Code được implement** đúng phạm vi.
- [ ] **Unit tests PASS.**
- [ ] **Integration tests PASS** (DB thật với phase có DB).
- [ ] **API/contract tests PASS** — khớp OpenAPI.
- [ ] **Migration test PASS** (P1 và bất kỳ phase chạm DB).
- [ ] **Concurrency tests PASS** (P7 và nơi liên quan).
- [ ] **Không lỗi lint/type check.**
- [ ] **Không Critical/High security issue.**
- [ ] **API contract khớp tài liệu** (06/OpenAPI) — không drift.
- [ ] **Không sửa ngoài phạm vi** (diff giới hạn trong module/ownership).
- [ ] **Review độc lập hoàn thành** — bởi AI không implement phase.
- [ ] **Comment review đã xử lý hoặc giải trình.**
- [ ] **Evidence được lưu** (`evidence/<phase>/`) — test report + log + screenshot theo `06`.
- [ ] **Rollback đã được kiểm tra** — theo mục Rollback của phase (`04`).
- [ ] **Changelog implementation cập nhật** (`PLAN_CHANGELOG.md` khi planning; changelog code khi coding).

### DoD đặc thù (bổ sung)
- **P1:** tái lập ALL CHECKS PASSED (migration+rollback+lần hai); baseline **đóng băng** sau đó.
- **P2:** security test auth không Critical/High; audit log không PII.
- **P3:** SVG/MP4/MIME-spoof reject; 409 media đang dùng.
- **P5:** 3 tổ hợp filter PASS; no N+1 ở list/detail; publish transaction PASS.
- **P7:** SMTP-lỗi-vẫn-202; 2-worker SKIP LOCKED; reaper; idempotency.
- **P8:** canonical/robots resolver PASS mọi loại trang; redirect no loop/chain.
- **P10:** 14 luồng E2E PASS; SEO audit sạch.
- **P11:** backup/restore PASS; load test đạt ngưỡng; go-live checklist ký; người dùng phê duyệt.

---

## PHẦN C — Gate chuyển planning → coding (toàn dự án)

Plan chỉ lên `v1.0 — APPROVED FOR IMPLEMENTATION / PLANNING COMPLETE` khi:
- [ ] Không còn **Critical**.
- [ ] Không còn **High** chưa giải quyết.
- [ ] Mọi **Medium** có disposition rõ (accept/reject/defer có lý do).
- [ ] OPEN DECISION bắt buộc (đặc biệt **B1 stack**) đã được người dùng chốt.
- [ ] **Phase 0 và Phase 1 đạt Definition of Ready.**

Chỉ sau đó mới tạo coding prompt cho phase đầu tiên (Round 6).
