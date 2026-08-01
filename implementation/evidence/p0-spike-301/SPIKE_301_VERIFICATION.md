# Bằng chứng spike HTTP 301 — Definition of Done của P0

**Ngày:** 2026-08-01
**Yêu cầu:** D17, ADR-001, plan `12` §5 và §8 (ma trận bắt buộc 15 case)
**Kết quả:** **15/15 PASS**

---

## 1. Câu hỏi spike cần trả lời

> Next.js có phát được **HTTP 301 chính xác**, **không kèm HTML đã render**, **trước khi streaming bắt đầu**, ở chế độ production, sau reverse proxy hay không?

Plan `12` §5 ghi rõ: *"Framework helpers that emit 307/308 or client-side JavaScript redirects do not satisfy D17."*

## 2. 🔴 Phát hiện quan trọng nhất — helper của App Router KHÔNG dùng được

Đo thật trên Next.js 15.5.22, production build:

| Cách làm | Status | Body | Có HTML? | Thỏa D17? |
|---|---:|---:|---|---|
| `redirect()` của App Router | **307** | 5.858 byte | **Có** | ❌ |
| `permanentRedirect()` của App Router | **308** | 5.861 byte | **Có** | ❌ |
| **middleware `NextResponse.redirect(url, 301)`** | **301** | **18 byte** | Không | ✅ |

Hai helper vi phạm **ba** yêu cầu cùng lúc:

1. Sai mã trạng thái — 307/308 thay vì 301.
2. Gửi kèm **5,8 KB HTML đã render** — vi phạm yêu cầu #2 "body không chứa HTML".
3. Vì có HTML nghĩa là **trang đã render xong rồi mới redirect** — vi phạm yêu cầu #3 "redirect trước streaming".

**Kết luận: bắt buộc dùng middleware. Không được thay bằng helper của App Router ở bất kỳ phase nào sau này.**

Kịch bản đo: `probe-helpers.mjs`.

## 3. Ma trận 15 case — kết quả đo

```
PASS  1. Ma trang thai dung 301                  status=301 location=/products/optidist
PASS  2. Body khong co HTML da render            bodyLen=18 body="/products/optidist"
PASS  3. Redirect truoc streaming                trang that render=true, redirect body=18B, header sau 9ms
PASS  4. Development build                       status=301 bodyLen=18
PASS  5. Production build                        status=301
PASS  6. Qua reverse proxy                       status=301 location=/products/optidist
PASS  7. Cache miss                              status=301 cache-control=no-store
PASS  8. Cache hit (lan hai giong het)           lan1=301 lan2=301, Location giong nhau
PASS  9. A -> B                                  -> /b
PASS 10. A->B->C truc tiep (mot hop)             -> /chain-c
PASS 11. Resolver timeout -> 503 fail-safe       status=503 ms=359
PASS 12. Resolver khong san sang -> 503          status=503
PASS 13. Ban cache trang cu khong de len redirect trang that=200, duong cu=301
PASS 14. Redirect khong bi cache (no-store)      cache-control=no-store
PASS 15. 20 request dong thoi nhat quan          chi mot ma trang thai duy nhat
```

### Cách chứng minh case 3 — "redirect trước streaming"

Không đo bằng thời gian, mà bằng **trang đích có chạy hay không**:

- Trang `/products/[slug]` render chuỗi mốc `SPIKE_PRODUCT_RENDERED`.
- Gọi `/products/optidist` trực tiếp → body **có** chuỗi đó → trang thật sự render, phép thử có ý nghĩa.
- Gọi `/old-product` (đường bị redirect) → body 18 byte, **không** có chuỗi đó → **thành phần trang chưa từng được thực thi**.

Header về sau **9 ms**, trong khi ngưỡng fail-fast là 350 ms.

### Case 11 — hành vi fail-safe

Resolver treo → middleware hủy sau `RESOLVER_CEILING_MS` → trả **503** ở mốc 359 ms. Không render nội dung đoán, không phục vụ bản cache 200 khi đường dẫn có thể đã đổi thành redirect (plan `12` §6).

## 4. Ghim phiên bản (plan `12` §8 yêu cầu)

```text
next_version        = 15.5.22
react_version       = 19.0.0
node_version        = v22.22.3
pnpm_version        = 10.34.5
lockfile_sha256     = 0dd6a54ffb28210205dd81613f19d68d36b00583a8058eda47e6cb83e5010f50
middleware_sha256   = 159e71dc7dd1511be89c008a695ab6baf137f7d8b8ecce4bbb883d2c942bc521
next_config_sha256  = 29319861201bbbabbf2a864d98181ae79ef9a01b7d936b7012f3481c3e559265
router              = App Router
middleware_runtime  = Edge (mặc định của Next)
rendering_mode      = force-dynamic (server-rendered on demand)
streaming           = bật (mặc định App Router)
proxy               = reverse proxy Node tối thiểu, chuyển tiếp nguyên status và header
os                  = Linux 6.8.0-124-generic
verified_at_utc     = 2026-08-01T06:29:23Z
```

## 5. 🔴 Phát hiện phụ — Next 15.1.3 có lỗ hổng bảo mật

Bản 15.1.3 mà khung P0 ghim ban đầu bị npm cảnh báo:

```
WARN deprecated next@15.1.3: This version has a security vulnerability.
Please upgrade to a patched version. See https://nextjs.org/blog/CVE-2025-66478
```

Đã đổi sang **15.5.22** và spike chạy trên đúng bản này. `apps/web/package.json` đã cập nhật.

> Đây là lý do plan yêu cầu **ghim chính xác phiên bản** thay vì dùng dải `^15.x`: một bản vá bảo mật hoặc một thay đổi hành vi redirect đều làm bằng chứng này hết hiệu lực.

## 6. Điều kiện để bằng chứng này còn hiệu lực

Phải chạy lại toàn bộ ma trận khi **bất kỳ** thứ nào dưới đây đổi:

- Phiên bản Next.js, kể cả bản vá
- Đổi runtime của middleware (Edge ↔ Node)
- Đổi App Router sang Pages Router
- Đổi chế độ render hoặc bật/tắt streaming
- Đổi reverse proxy hoặc cấu hình proxy
- Node lên bản major mới

## 7. Cách chạy lại

```bash
cd implementation/evidence/p0-spike-301
pnpm install            # theo pin.txt
pnpm exec next build
node probe-helpers.mjs  # chứng minh 307/308 của helper
node matrix.mjs         # ma trận 15 case
```

## 8. Ràng buộc cho các phase sau

1. **Middleware là nơi duy nhất phát redirect.** Không dùng `redirect()`/`permanentRedirect()` cho redirect nghiệp vụ.
2. **Nest là nguồn authoritative** (D11). Middleware chỉ gọi resolver và giao kết quả; không có luật nghiệp vụ nào trong Next.
3. **Resolver phải trả mã trạng thái**, không để Next tự chọn — 302 chỉ dùng khi là luật nghiệp vụ tường minh.
4. **Fail-safe là 503**, không bao giờ render nội dung đoán.
5. Chuỗi `A→B→C` phải được Nest giải **trực tiếp về C**; middleware không tự lần theo chuỗi.
