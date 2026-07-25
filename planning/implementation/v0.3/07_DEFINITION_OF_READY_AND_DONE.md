# 07 — DEFINITION OF READY & DEFINITION OF DONE

**Plan version:** v0.3 · **Trạng thái:** PROPOSED FOR FINAL VERIFICATION · **Ngày:** 2026-07-22

DoR/DoD v0.2 giữ + Round 5B: **gate tách đôi** (Correction 1), **staging B23–B26 đúng** (Correction 2), DoD API compatibility (D18), health split (Correction 6).

---

## PHẦN A — DEFINITION OF READY

### A.1. DoR chung (giữ)
Phạm vi rõ · không còn quyết định kỹ thuật bắt buộc mở cho phase · I/O + API contract + DB objects xác định · acceptance rõ · test cases viết trước · không P1/Future lẫn P0 · implementer≠reviewer · branch/file ownership rõ · **rollback mode đã chọn** (không mặc định "revert code").

### A.2. DoR — Coding Start (Gate B, P0 root)
> **KHÔNG** phải điều kiện Gate A (Plan Approval). Đây là điều kiện **bắt đầu code P0** → `P0 READY TO START`.
- [ ] **Git repository hợp lệ** (root/main/remote-hoặc-no-remote/baseline-commit/tag `docs-v1.2.1-approved`) — R-25.
- [ ] Node/toolchain chạy; Docker/PostgreSQL sẵn sàng; branch/PR/CI/evidence structure.
- [ ] Deployment topology (D7) + routing/redirect/SEO owner (D10–D13/**D17 accepted**) + admin shape (D2) + Node LTS (D16) + migration executor (D4/D5) + worker model (D6) locked.
- [ ] **B26/D18 tooling** trong P0 acceptance (OpenAPI lint/breaking-change/client-freshness/expand-contract).
- [ ] **HTTP 301 spike** kế hoạch sẵn (thực hiện trong P0).

### A.3. DoR bổ sung theo phase (SỬA staging — Correction 2)
- **Before P2:** **B23** cookie/origin/proxy + **B24** auth session/logout/revocation/key-rotation/account-lock.
- **Before P3:** **B25** content-block/image/PDF processing policy; ContentBlock/ExternalVideo validator (P3).
- **Before P4–P7:** thin UI route + browser E2E định nghĩa cho slice.
- **Before P5:** lock/optimistic concurrency strategy chốt.
- **Before P7:** SMTP/CAPTCHA + worker batch/timeout + recipient snapshot + **fingerprint strategy (D19)**.
- **Before P8/P10:** canonical production base URL / OG defaults.
- **Before P11:** RPO/RTO + content freeze/cutover (C9) + SPF/DKIM/DMARC (C5) + content owner (C7).

> **KHÔNG** còn câu "D1–D16 + B22–B26 đều phải chốt before-P0". B23/B24 = before-P2; B25 = before-P3 (Correction 2).

Thiếu một điều → **NOT READY**.

---

## PHẦN B — DEFINITION OF DONE

### B.1. DoD chung (giữ)
Code · unit/integration/API/migration tests PASS · concurrency PASS (nơi áp dụng) · không lỗi lint/type · không Critical/High security · API contract khớp tài liệu · không sửa ngoài phạm vi · review độc lập · comment xử lý · evidence lưu · rollback đã test · changelog cập nhật.

### B.2. DoD bổ sung
- [ ] **Thin UI + browser E2E PASS** cho slice P4–P7.
- [ ] **Generated-client freshness** PASS (CI không stale — D18).
- [ ] **Backward compatibility** check PASS (OpenAPI breaking-change) cho phase chạm contract.
- [ ] **Mixed-version compatibility test** nếu phase ảnh hưởng deployment (D18).
- [ ] **Evidence provenance:** SHA + command + env/version + exit code + raw log; ngoài plan.
- [ ] **Task-level independent review:** AI sửa code không approve PR đó; integration PR (C+X) → fresh reviewer + user merge.
- [ ] **Rollback mode đã test** theo side-effect (không yêu cầu production schema `down` mặc định).

### B.3. DoD đặc thù (Round 5B)
- **P0:** Git hợp lệ; **HTTP 301 spike PASS**; B26 tooling chạy.
- **P1:** **materialized 001–070 concat ≡ verified aggregate** (CASE B); ALL CHECKS PASSED; checksum manifest/registry; 3 seed pipeline; backup/restore.
- **P2:** security §K1 không Critical/High; **không `/admin/users`**; **readiness không phụ thuộc SMTP/worker**.
- **P3:** SVG/MP4/bomb/EXIF/PDF reject; 409 media; **`/media/*` + document download an toàn**; validator dùng được P5; storage probe.
- **P4:** SlugService + **explicit HTTP 301 redirect-before-render qua topology thật** PASS; thin UI+E2E.
- **P5:** 3 filter tổ hợp + concurrency PASS; **catalogue usable end-to-end**; no-N+1; **product-only search**.
- **P7:** 2-worker + shutdown drain + reaper + **idempotency fingerprint mismatch 409** PASS; SMTP-lỗi-vẫn-202; **outbox reconciliation report**.
- **P8:** canonical/robots resolver PASS mọi loại trang; sitemap/robots ở Nest; **explicit 301 + cache invalidation**; **no new search**.
- **P9:** **no Users CRUD, no auto-save advanced**; no ecommerce fields render.
- **P10:** 14 luồng + hydration/a11y/mobile/download-headers/locale-mapping; SEO audit sạch.
- **P11:** backup/restore PASS; mixed-version/blue-green; CM4 cutover; **user go-live approval**.

"Chạy trên máy tôi" / "PASS không artifact" ≠ DONE.

---

## PHẦN C — HAI GATE (Correction 1)

### Gate A — Plan Approval Gate → `IMPLEMENTATION PLAN v1.0` / `PLANNING COMPLETE` / `APPROVED FOR IMPLEMENTATION`
- [ ] Không Critical; không High chưa xử lý; Medium có disposition.
- [ ] D1–D20 ghi nhận; **D17 accepted**; **D18/B26 chốt**.
- [ ] Dependency/sequence/test/rollback/RACI đầy đủ.
- [ ] Không design conflict chưa có disposition.
- [ ] **Codex final verification PASS**.
- [ ] **Người dùng phê duyệt plan**.
> **Git chưa hợp lệ KHÔNG phải điều kiện Gate A.**

### Gate B — Coding Start Gate → `P0 READY TO START`
- [ ] Toàn bộ A.2 (Git hợp lệ + toolchain + Docker/PG + decisions locked + B26 tooling + 301 spike plan).
- [ ] Phase P0 đạt DoR.
> **Git R-25 là blocker của Gate B, KHÔNG phải Gate A.**

**Round 5B chưa đạt:** Gate A chờ Codex final verification + user duyệt; Gate B chờ Git khôi phục + before-P2/P3 decisions. Trạng thái: `PROPOSED FOR FINAL VERIFICATION`.
