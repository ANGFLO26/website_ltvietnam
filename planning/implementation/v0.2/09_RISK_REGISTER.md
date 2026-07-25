# 09 — RISK REGISTER

**Plan version:** v0.2 · **Trạng thái:** PROPOSED FOR FINAL RECONCILIATION · **Ngày:** 2026-07-22

Giữ R-01..R-22 (v0.1) + thêm **R-23..R-32** (audit §8). Cập nhật mitigation theo D1–D16. XS/TĐ: L/M/H. Owner: C/X/U.

---

## R-01..R-22 (giữ, cập nhật)
Giữ như `v0.1/09`, sửa:
- **R-01 (chọn sai stack):** giảm còn **L×H** — D1–D16 đã chốt (NestJS/Next/pnpm/Kysely/raw-SQL/worker-riêng/Node24). Owner U.
- **R-03 (P1/Future lọt P0):** thêm signals **Users CRUD** + **auto-save advanced** (đã loại khỏi P0 — HI-15/16). Mitigation: DoR "không P1/Future" + grep validation (`10`/§XXIV).
- **R-05 (migration drift):** thêm **checksum manifest/registry + CI + 071+ + production forward-fix** (không destructive down default — D5). Owner C.
- **R-20 (tích hợp muộn):** thay mitigation "scaffold" bằng **thin UI acceptance + browser E2E per slice** (HI-05). Owner X.

## R-23..R-32 (mới)

| ID | Rủi ro | XS | TĐ | Phase | Biện pháp | Dấu hiệu | Owner |
|---|---|---|---|---|---|---|---|
| **R-23** | Public request bypass redirect middleware / duplicate SEO owner | M | H | P0/P4/P8 | Routing matrix + Nest authoritative + Next delivery (`12`); một owner sitemap/robots (Nest, D13); D11 clarification ký | redirect đổi slug không chạy; canonical viết hai lần; sitemap trùng owner | C+U |
| **R-24** | Deployment topology incompatible với local disk/in-process state | M | H | P0/P11 | Chốt single persistent host (D7); in-process cache/rate-limit/worker **chỉ single-instance** (D9); abstraction để chuyển distributed | rate-limit không nhất quán; worker chạy nhiều nơi; media mất khi ephemeral FS | U/Ops |
| **R-25** | Git metadata absent (`.git` rỗng) — collaboration/revert/evidence impossible | H | H | **before P0** | **OPEN BLOCKER**: khôi phục/clone/init sau user approval; verify root/status/remote/history/tag (D15); không code khi chưa hợp lệ | `git rev-parse`/`status` fatal | U |
| **R-26** | Node/runtime EOL hoặc framework combo không tương thích | M | H | P0 | Node 24 LTS (sau compat test)/22 fallback; cấm EOL; pin toolchain+CI (D16) | dependency yêu cầu runtime EOL; security patch dừng | U/Tech lead |
| **R-27** | Content/redirect migration incomplete tại go-live | H | H | P4–P11 | Workstream CM0–CM4 (`13`) + owner + acceptance; CM3 validation gate trước P10; CM4 freeze/delta; post-go-live crawl | URL cũ 404; SEO tụt; broken link | U/Content owner |
| **R-28** | Production rollback phá data / không undo side-effect | M | H | P1–P11 | Phase rollback matrix theo side-effect (§L); restore backup/forward-fix; **không default destructive `down`**; blue/green | rollback = data loss; orphan files/jobs | Ops/DB |
| **R-29** | Worker bị kill với in-flight jobs / stale locks | M | H | P7 | Worker process riêng (D6): graceful shutdown/stop-claim/drain/lease/heartbeat/reaper; at-least-once | email trùng/mất; job kẹt processing | C/Ops |
| **R-30** | Generated client / API versions không tương thích (mixed-version) | M | H | P9–P11 | OpenAPI breaking-change CI + client freshness + consumer smoke + expand/contract + blue/green (B26) | FE cũ gặp BE mới lỗi; stale client | API/Release |
| **R-31** | Demo/test seed hoặc default admin credential lọt production | L | H | P1 | 3 pipeline tách (HI-11); one-time bootstrap secret/force-reset/no-fixed-pw; demo never prod; settings không secret giả | admin default pw trên prod; demo data trên prod | C/Security+U |
| **R-32** | Image/PDF resource exhaustion hoặc active-content exposure | M | H | P3 | magic-bytes; dimension/pixel cap; decompression-bomb guard; processor timeout/memory; PDF force-download+nosniff; EXIF strip (B25) | OOM khi upload; PDF chạy script; ảnh bom | C/Security |

## Rủi ro theo ưu tiên
- **OPEN BLOCKER trước P0:** **R-25 (Git)**.
- **Cao (H×H / M×H):** R-23, R-24, R-26, R-27, R-28, R-29, R-30, R-32 + (giữ) R-07/R-08/R-09/R-13/R-14/R-19.
- **Cần DN/User:** R-10, R-15, R-16, R-22, R-24, R-25, R-27, R-31.
- **Điều phối 2 AI:** R-04, R-14, R-20, R-30.

## Theo dõi
Cập nhật mỗi phase; rủi ro mới → ID mới; đóng → ghi ngày + evidence. Bất kỳ **Critical** phát sinh → chặn gate `07` C. **R-25 phải đóng trước P0.**
