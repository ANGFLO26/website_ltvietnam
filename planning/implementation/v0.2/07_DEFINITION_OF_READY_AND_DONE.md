# 07 — DEFINITION OF READY & DEFINITION OF DONE

**Plan version:** v0.2 · **Trạng thái:** PROPOSED FOR FINAL RECONCILIATION · **Ngày:** 2026-07-22

DoR/DoD v0.1 giữ + bổ sung theo audit: Git/topology/runtime/migration/worker gate (P0); content-block policy + thin UI per slice (phase); generated-client/backward-compat/evidence provenance/task-level review (DoD); rollback không mặc định production `down`.

---

## PHẦN A — DEFINITION OF READY

### A.1. DoR chung (giữ v0.1)
Phạm vi rõ · không còn quyết định kỹ thuật bắt buộc mở · I/O + API contract + DB objects xác định · acceptance rõ · test cases viết trước · **không P1/Future lẫn P0** · implementer≠reviewer rõ · branch/file ownership rõ.

### A.2. DoR bổ sung — P0 root gate (BẮT BUỘC trước bất kỳ code nào)
- [ ] **Git repository hợp lệ** (rev-parse/status/branch/remote/first-commit/tag `docs-v1.2.1-approved`) — R-25 blocker.
- [ ] **Deployment topology** locked (single persistent host — D7).
- [ ] **Public routing + redirect/SEO owner** locked + routing matrix (`12`, D10–D13) + **D11 clarification ký**.
- [ ] **Admin shape** locked (một Next app — D2).
- [ ] **Supported Node LTS** locked (Node 24/22 — D16).
- [ ] **Migration executor vs runtime query** locked (raw SQL baseline + Kysely — D4/D5).
- [ ] **Worker model** locked (process riêng — D6).
- [ ] **API compatibility/codegen policy** locked (B26).

### A.3. DoR bổ sung theo phase
- **P2:** cookie/origin/proxy trust (B23) + auth session/logout/revocation/key-rotation (B24).
- **P3/P5:** **content-block schema + image/PDF processing policy** (B25) sẵn sàng; **ContentBlock/ExternalVideo validator** tồn tại (P3).
- **P4–P7:** **thin UI route + browser E2E** định nghĩa cho slice (không chỉ backend acceptance).
- **P5:** **lock/optimistic concurrency strategy** chốt (HI-20).
- **P8/P10:** canonical production base URL / OG defaults; SEO resolver spec (ADR-011).
- **P7:** SMTP/CAPTCHA provider + worker batch/timeout + recipient snapshot policy.
- **CM0+:** content owner (C7) + quyền crawl/export site cũ (C8).
- **P11:** RPO/RTO + content freeze/cutover (C9) + SPF/DKIM/DMARC (C5).
- **Mọi phase:** **rollback mode** đã chọn (bảng §L/`04`), không mặc định "revert code".

Thiếu một điều → **NOT READY**.

---

## PHẦN B — DEFINITION OF DONE

### B.1. DoD chung (giữ v0.1)
Code implement · unit/integration/API/migration tests PASS · concurrency tests PASS (nơi áp dụng) · không lỗi lint/type · không Critical/High security · **API contract khớp tài liệu** · không sửa ngoài phạm vi · review độc lập xong · comment xử lý/giải trình · evidence lưu · rollback đã test · changelog cập nhật.

### B.2. DoD bổ sung (audit)
- [ ] **Thin UI + browser E2E PASS** cho slice P4–P7 (không chỉ backend — HI-05).
- [ ] **Generated-client freshness** PASS (CI không stale — HI-21).
- [ ] **Backward compatibility** check PASS (OpenAPI breaking-change — HI-21) cho phase chạm contract.
- [ ] **Evidence provenance:** commit SHA + command + env/version + exit code + raw log; **ngoài** `planning/.../v0.x/` (ME-07).
- [ ] **Task-level independent review:** AI sửa code **không** approve PR đó; integration PR (cả C+X sửa) có **fresh reviewer** + user merge (HI-19).
- [ ] **Rollback mode đã test** theo side-effect (không yêu cầu production schema `down` mặc định — HI-13/§L).

### B.3. DoD đặc thù (bổ sung/sửa)
- **P1:** ALL CHECKS PASSED + **checksum manifest/registry** + 3 seed pipeline + backup/restore drill.
- **P2:** security §K1 (key rotation/reset replay/lock race) không Critical/High; **không `/admin/users`**.
- **P3:** SVG/MP4/bomb/EXIF/PDF reject; 409 media; **validator dùng được ở P5**; storage probe.
- **P4:** SlugService + **redirect-before-render qua topology thật** PASS; thin UI+E2E.
- **P5:** 3 filter tổ hợp + **concurrency (primary/replace-set/archive)** PASS; **catalogue usable end-to-end**; no-N+1.
- **P7:** 2-worker + **shutdown drain** + reaper + **idempotency mismatch 409** PASS; SMTP-lỗi-vẫn-202.
- **P8:** canonical/robots resolver PASS mọi loại trang; sitemap/robots **ở Nest**; **no new search**.
- **P9:** **no Users CRUD, no auto-save advanced**; no ecommerce fields render.
- **P10:** 14 luồng E2E + hydration/a11y/mobile/download-headers/locale-mapping; SEO audit sạch.
- **P11:** backup/restore PASS; mixed-version/blue-green; CM4 cutover; **user go-live approval**.

"Chạy trên máy tôi" / "PASS không artifact" ≠ DONE.

---

## PHẦN C — Gate planning → coding (toàn dự án)

Plan lên `v1.0 — PLANNING COMPLETE` khi:
- [ ] Không còn **Critical**; không **High** chưa xử lý; **Medium** có disposition rõ.
- [ ] OPEN DECISION bắt buộc **before-P0** đã chốt (D1–D16 + B22–B26 + **D11 clarification ký**).
- [ ] **Git repository hợp lệ** (R-25).
- [ ] **Phase 0 và Phase 1 đạt DoR** (A.2 + P1).

Chỉ sau đó tạo coding prompt (Round 6). **Round 4 KHÔNG đạt gate này** — còn OPEN (B23–B26, C1–C9), Git chưa khôi phục, D11 chưa ký. Trạng thái: `PROPOSED FOR FINAL RECONCILIATION`.
