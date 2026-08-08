# Rà soát backend trước khi bắt đầu các phase

**Ngày:** 2026-08-07 · **Phạm vi:** mọi thứ đã code (dao, services, api, worker, packages)

---

# Kết luận ngắn

Tìm được **11 vấn đề**. Bốn cái phải sửa **trước** khi viết endpoint đầu tiên,
vì sửa sau sẽ phải sửa lại toàn bộ những gì viết trong lúc đó.

Một cái là **lỗ hổng khai thác được** trong mã tôi đã báo là "xong".

| # | Vấn đề | Mức | Khi nào sửa |
|---|---|---|---|
| 1 | Đăng nhập không có giới hạn tốc độ — Argon2 19 MiB/lần | **Nghiêm trọng** | **đã sửa — F-1a** |
| 2 | Vỏ phản hồi không thống nhất | Cao | **đã sửa — F-1b** |
| 3 | `createPool` trùng ở 2 chỗ, 3 biến thể | Cao | Trước F0 |
| 4 | Luật kiến trúc không quét `packages/` | Cao | Trước F0 |
| 5 | `UserService` / `SettingService` — **không một test nào** | Cao | Trước F0 |
| 6 | Không giới hạn kích thước thân yêu cầu | Trung bình | F0 |
| 7 | Không có security header | Trung bình | F0 |
| 8 | Lỗi kết nối DB → 500 thay vì 503 | Trung bình | F0 |
| 9 | `/auth/me` trả trường nội bộ | Thấp | **đã sửa — F-1b** (Luật 10b kéo lên sớm) |
| 10 | 8 khoá cấu hình khai báo mà không dùng | Thấp | rải theo phase |
| 11 | `worker/` vẫn là khung rỗng | — | F5 |
| **12** | `forgot-password`: hạn mức IP = hạn mức email = 3 | Trung bình | **đã sửa — F-1b** |

Số **12** không có trong bản rà soát đầu. Nó lộ ra khi chạy `smoke-auth.mjs`
trên HTTP thật ở F-1b: F-1a tách hạn mức IP khỏi hạn mức email cho `login` rồi
**để nguyên** `forgot-password` với cả hai bằng 3. Tôi sửa đúng ý đó ở một
endpoint rồi không hỏi "còn endpoint nào cũng thế không".

Ba món nợ đã ghi rõ trong mã (thẻ đặt lại vào log, bộ đếm trong RAM,
at-least-once) **không** nằm trong danh sách — chúng là đánh đổi có chủ đích,
đã chú thích, và đã có chỗ trả trong kế hoạch.

---

# 1. Đăng nhập không có giới hạn tốc độ — **nghiêm trọng**

## Bằng chứng

```
LOGIN_RATE_LIMIT           khai báo trong config, KHÔNG nơi nào dùng
LOGIN_RATE_WINDOW_MINUTES  khai báo trong config, KHÔNG nơi nào dùng
grep rate|Throttler trong main.ts, app.module.ts, auth.controller.ts → không có
```

## ĐÍNH CHÍNH — con số ban đầu của tôi SAI

Bản đầu của tài liệu này viết *"50 đồng thời = 950 MiB → tiến trình Node chết
vì hết bộ nhớ"*. Tôi đã **đo thật** khi bắt đầu sửa, và con số đó sai:

| | thời gian | bộ nhớ đỉnh | tiến trình |
|---|---|---|---|
| 60 yêu cầu, threadpool 4 (mặc định) | 0,8s | 265 MiB | sống |
| **200** yêu cầu, threadpool 4 | 2,7s | **270 MiB** | sống |
| 200 yêu cầu, threadpool **64** | 3,0s | **1491 MiB** | sống |

200 yêu cầu tốn **cùng** bộ nhớ như 60. Tôi bỏ qua một điều: `@node-rs/argon2`
là native bất đồng bộ nên chạy trên **threadpool của libuv**, mặc định chỉ 4
luồng. Bộ nhớ bị chặn tự nhiên ở 4 × 19 MiB — do **may mắn**, không do thiết kế.

## Vì sao vẫn nghiêm trọng — cơ chế THẬT

Đo tiếp với 30 kẻ dội liên tục:

| | |
|---|---|
| `/health/live` | 2 ms → 15 ms (vòng lặp sự kiện **không** bị chặn) |
| **đăng nhập thật của người dùng hợp lệ** | ~50 ms → **407 ms** (chậm 8×) |

Nên vấn đề không phải cạn bộ nhớ mà là **bão hoà threadpool của libuv** — và
threadpool đó dùng chung cho đọc tệp, DNS, nén. Ở F7 khi có phục vụ tệp media,
một cơn dội đăng nhập sẽ làm chậm cả việc đọc ảnh.

Cộng một **bẫy tiềm ẩn**: ai đó tăng `UV_THREADPOOL_SIZE` để tối ưu hiệu năng —
việc rất thường làm — thì bộ nhớ nhảy lên 1,5 GB.

Không cần tài khoản, không cần mật khẩu đúng. Chỉ cần gọi `POST /auth/login`
liên tục với email bất kỳ.

Điều làm nó tệ hơn: `burn()` là thứ **tôi cố ý thêm** để chống dò tài khoản
qua thời gian phản hồi. Nó đúng về mục đích đó, nhưng nó biến mỗi yêu cầu rác
thành 19 MiB — và tôi không hề nghĩ tới mặt đó khi viết. Một biện pháp bảo mật
mở ra một lỗ hổng khác.

## ĐÃ SỬA (F-1a)

Hai lớp, chặn hai thứ khác nhau:

| | |
|---|---|
| `RateLimitGuard` | chặn **một nguồn gửi nhiều** — chạy trước hàm băm |
| `HashGate` | chặn **tổng tài nguyên** bất kể đến từ đâu, không phụ thuộc libuv |

**Hai con số khác nhau cho hai mối đe doạ.** Bản vá đầu tôi đặt cả hai bằng 5,
và phép đo bắt được hậu quả: sau khi bị dội, người dùng gõ **đúng** mật khẩu
vẫn nhận 429. Con số cuối:

```
theo email : 5 / 15 phút    — chặn dò mật khẩu MỘT tài khoản
theo IP     : 30 / 15 phút  — chặn dội tài nguyên, đủ rộng cho một văn phòng
```

Đây là chỗ **cố ý lệch** khỏi `doc/06` ("5/15'/IP") — con số đó gộp hai mối đe
doạ thành một.

**Đăng nhập thành công xoá bộ đếm.** Thiếu dòng này thì hạn mức nghĩa là "5 lần
đăng nhập / 15 phút" cho cả một IP; có nó thì nghĩa là "5 lần **thất bại liên
tiếp**", và người dùng bình thường không bao giờ chạm tới.

### Đo lại sau khi vá — 300 yêu cầu từ một IP, 300 email khác nhau

```
0,6s · bộ nhớ +139 MiB · 30 lọt qua (đúng hạn mức), 270 bị chặn
đăng nhập đúng 12 lần liên tiếp     →  201 cả 12 lần
dò một tài khoản: 5 lần sai         →  lần thứ 6 bị chặn
người dùng ở IP KHÁC                →  201, không bị ảnh hưởng
```

Trước: 2,7s / 270 MiB, và 1491 MiB nếu threadpool được tăng. Sau: 0,6s /
139 MiB, và cái bẫy threadpool **không còn** — trần nằm trong mã, không phụ
thuộc cấu hình libuv.

### Điều KHÔNG sửa được, ghi lại thay vì im lặng

Người dùng ở **cùng IP** với kẻ tấn công vẫn bị chặn (đo được: 429). Đó là
thiệt hại kéo theo vốn có của giới hạn theo IP, không phải lỗi. Hạn mức 30 đã
chọn để một văn phòng bình thường không tự chạm tới; nhưng nếu kẻ tấn công ở
cùng NAT thì không có cách nào phân biệt.

### Ba lỗi tôi tự tạo trong lúc vá, và phép đo bắt được cả ba

1. `try/catch` của `verify` bọc **cả** cổng, nên "hệ thống quá tải" bị biến
   thành "sai mật khẩu" — và `AuthService` đếm đó là một lần sai, có thể **khoá
   oan** tài khoản.
2. Hai hạn mức bằng nhau → người dùng đúng mật khẩu bị 429 (mô tả ở trên).
3. Trần số khoá lệch một (`101 > 100`) vì `sweep` cắt trước khi `check` chèn.

12 bài kiểm mới, và **6 phép tiêm lỗi** chứng minh chúng không rỗng.

---

# 2. Vỏ phản hồi không thống nhất — sửa trước khi viết 32 endpoint

## Bằng chứng

`doc/06` PHẦN X quy định `{ data, meta }`. Vỏ **lỗi** đã đúng
(`exception.filter.ts`). Vỏ **thành công** thì không:

```ts
// auth.controller.ts — trả thẳng, không có `data`
return { user: result.user };
return { ok: true };
```

## Vì sao phải sửa trước

32 endpoint công khai + 20 module admin. Nếu để mỗi controller tự bọc, thì:
- một endpoint quên bọc là frontend hỏng ở đúng chỗ đó
- sửa sau = sửa lại tất cả

Phải là **interceptor toàn cục**, cộng một luật kiến trúc: controller không
được tự bọc `data`.

## ĐÃ SỬA (F-1b)

Nguyên tắc: **hướng sai phải là hướng ồn ào.** Với interceptor toàn cục, viết
đúng là *không làm gì cả* — không có gì để quên. Với một quy ước thì viết đúng
đòi hỏi nhớ, và người ta sẽ quên ở endpoint thứ 19.

Bốn quyết định về hợp đồng, chốt bây giờ lúc còn **một** controller:

| | |
|---|---|
| `{ data }` / `{ data, meta }` | `EnvelopeInterceptor` bọc, controller trả **tài nguyên** |
| `data` **chính là** tài nguyên | không phải `{ data: { user: {...} } }` — lớp lồng đó không nói gì |
| `204` thay cho `200 { ok: true }` | `{ ok: true }` không mang thông tin nào mà mã HTTP chưa nói |
| `snake_case` một chiều | `doc/06` đã dùng `page_size`, vỏ lỗi đã dùng `request_id` |

Bốn luật ép, mặc định **từ chối**:

```
10a  handler không được đặt khoá `data`        -> chặn { data: { data } }
10b  kiểu trả về phải có TÊN, không nội dòng   -> chặn vỏ tự chế
10c  @NoEnvelope() chỉ ở danh sách trắng       -> chặn đường thoát
11   view của API chỉ khai báo snake_case      -> chặn trộn hai kiểu viết
```

**Luật 10b tự kéo vấn đề số 9 lên sớm.** Bắt đặt tên kiểu trả về nghĩa là phải
*chọn* trường, và chọn trường là lúc thấy `/auth/me` đang trả cả
`passwordChangedAt` với `status`. Một luật về *hình dạng* tìm ra một lỗi về
*nội dung* — không phải ý định ban đầu của luật.

**Luật 1 báo động, và nó đúng.** `api/dto/user.view.ts` import
`dao/users/object.js`. Cái nó chỉ ra là một chỗ **đặt sai tên** chứ không phải
một vi phạm: `object.ts` là *thực thể nghiệp vụ* — chú thích đầu file của chính
nó viết vậy — nằm trong `dao/` chỉ vì Luật 4 xếp bốn file của một bảng cạnh
nhau. Tầng api **vẫn luôn** chạm thực thể đó; trước đây nó chỉ không đặt tên
(`Promise<{ user: unknown }>`). Nới đúng một khe, `import type` và chỉ
`object.ts`; `dao.ts`/`mapper.ts`/`query.ts` vẫn chặn tuyệt đối. Dọn `object.ts`
sang `domain/` là việc cho 23 bảng và phá Luật 4 — chưa làm, đã ghi lại.

## Bằng chứng đo được, không phải lời hứa

Bản **CŨ** của `smoke-auth.mjs` chạy trên backend **mới** — nó phải đỏ, và đó
là bằng chứng vỏ thật sự đã đổi trên dây:

```
FAIL  doi mat khau voi CSRF dung -> 201     204  (mong 201)
FAIL  email co that / khong co that cung ma HTTP
```

Bản **mới**: `38 đạt, 0 không đạt`, chạy lại ngay lần hai vẫn 38/38.
Toàn bộ: `298 test xanh` (trước F-1b: 271), `tsc` sạch từ kho đã xoá hết bản dịch.

**Mười phép tiêm lỗi**, mỗi phép làm đúng một bài kiểm đỏ: controller tự bọc ·
kiểu nội dòng · `@NoEnvelope()` lậu · `camelCase` trong view · bộ quét handler
hỏng · import `dao.js` · import giá trị thay `import type` · bỏ đường đi thẳng
của `undefined` · bỏ đường đi thẳng của `Buffer` · `Math.floor` thay `Math.ceil`
· nhận trang bằng `'items' in value` thay vì symbol.

## Hai cái bẫy chỉ lộ ra khi chạy, không khi đọc

**`res.statusCode` KHÔNG dùng được để nhận biết 204.** Tôi viết vậy trước.
Nest áp `@HttpCode(...)` trong `RouterResponseController`, tức là **sau** chuỗi
interceptor — lúc `map` chạy thì `res.statusCode` vẫn là 200 mặc định của
Express. Nên phép kiểm đó luôn sai và `@HttpCode(204)` sẽ nhận thân
`{ "data": null }`; 204 có thân là sai chuẩn HTTP. Đọc **giá trị trả về** thay
vì trạng thái thì không phụ thuộc nội tạng của Nest: handler nào không có gì để
nói thì khai `Promise<void>`.

**Một phép kiểm bảo mật cũ đã rỗng mà vẫn xanh.** Bản cũ của
`smoke-auth.mjs` có:

```js
check('KHONG lo ma bam mat khau', 'passwordHash' in (me.body.user ?? {}), false);
```

Sau khi vỏ đổi hình dạng, `me.body.user` thành `undefined`, nên
`'passwordHash' in {}` là `false` — **đúng kết quả mong đợi, vì không đọc gì cả**.
Một phép kiểm bảo mật không còn đọc đúng chỗ thì nó không còn kiểm gì. Bản mới
khẳng định **có** ở chỗ đúng trước (`data.email` khớp), rồi mới khẳng định
**không có** ở chỗ sai.

---

# 3. `createPool` trùng ở hai chỗ, ba biến thể

## Bằng chứng

```
packages/db/src/pool.ts:6        createPool  — có search_path, có statement_timeout
backend/src/dao/connection.ts:31 createPool  — GIỐNG HỆT, mã lặp lại
packages/db/src/cli.ts:24        new pg.Pool — KHÔNG search_path, KHÔNG timeout
```

`worker/` dùng bản của `packages/db`; `backend/` dùng bản của chính nó;
migration CLI dùng biến thể thứ ba.

## Vì sao là vấn đề thật

Đổi `statement_timeout` ở một chỗ, hai chỗ kia im lặng giữ giá trị cũ. Và
migration CLI chạy **không** có `search_path` — nó đang dựa vào một cơ chế khác
để tìm schema `ltv`, nên nếu cơ chế đó đổi thì migration hỏng theo cách khó lần.

## Cách sửa

Một nguồn duy nhất trong `packages/db`. `backend/src/dao/connection.ts` gọi lại
chứ không tự viết. CLI dùng cùng hàm đó.

---

# 4. Luật kiến trúc chỉ quét `backend/src`

## Bằng chứng

```ts
const SRC = resolve(import.meta.dirname, '../src');   // architecture.test.ts:13
```

Chín luật kiến trúc **không** biết gì về `packages/` và `worker/`.

## Hậu quả cụ thể

Vấn đề số 3 tồn tại được chính vì lý do này: `packages/db` xuất một `createPool`
song song mà không luật nào phản ứng. Và `worker/` import `createPool` trực tiếp
— tức là worker chạm driver mà không qua tầng dao, đúng thứ Luật 2 sinh ra để
chặn, nhưng Luật 2 không nhìn thấy `worker/`.

## Cách sửa

Mở rộng phạm vi quét sang `worker/src`, và thêm luật: `packages/db` là nơi
**duy nhất** được tạo pool.

---

# 5. `UserService` và `SettingService` — không một test nào

## Bằng chứng

```
grep UserServiceImpl|SettingServiceImpl trong test/  →  0 file
```

Hai service này chỉ xuất hiện trong `app.module.ts` và chính file của chúng.

## Điều tôi phải nói rõ

Tôi đã báo cáo "259 test xanh" nhiều lần. Con số đúng, nhưng nó **không** có
nghĩa là mọi thứ đã viết đều được kiểm. Hai service có luật nghiệp vụ thật mà
chưa ai chạm:

| Chưa kiểm | Hậu quả nếu sai |
|---|---|
| chặn vô hiệu hoá admin **hoạt động cuối cùng** | khoá toàn bộ đội ngũ ra khỏi hệ thống, chỉ sửa được bằng SQL |
| chặn tự vô hiệu hoá chính mình | như trên, ở dạng phổ biến hơn |
| `bootstrapFirstAdmin` chỉ chạy một lần | endpoint công khai tạo được admin thứ hai |
| gửi lại chuỗi `********` **không** ghi đè secret | mật khẩu SMTP bị thay bằng tám dấu sao, email ngừng gửi |
| chỉ sửa được setting đã có trong bản khởi tạo | tạo khoá không ai đọc, người dùng thắc mắc mãi |

Cái thứ tư đáng chú ý: tôi viết nó với chú thích dài giải thích tại sao cần,
rồi **không kiểm**. Đúng loại mã "trông có vẻ đúng".

---

# 6–9. Bốn vấn đề tầng HTTP

| | Bằng chứng | Hậu quả |
|---|---|---|
| **6** Không giới hạn thân yêu cầu | `main.ts` không có `json({ limit })` | Nội dung là JSONB không giới hạn; một yêu cầu 50 MB đi sâu vào hệ thống rồi mới bị chặn |
| **7** Không có security header | không có `helmet` hay tương đương | Thiếu `X-Content-Type-Options`, `Referrer-Policy`, HSTS |
| **8** Lỗi kết nối DB → 500 | filter chỉ nhận `DomainError`/`HttpException` | DB sập thì đăng nhập trả 500. Cảnh báo vận hành không phân biệt được "hệ thống lỗi" với "phụ thuộc sập" — mà `DependencyUnavailableError` đã có sẵn |
| **9** `/auth/me` trả trường nội bộ | `return { user }` — cả `User` | Lộ `passwordChangedAt` (mốc thu hồi) và `status`. Không nguy hiểm trực tiếp nhưng là vệ sinh API |

Số 8 tôi đã nhận ra khi chạy end-to-end và ghi lại, nhưng chưa sửa.

**Số 9 đã sửa ở F-1b**, sớm hơn dự kiến, và không phải vì tôi nhớ ra: Luật 10b
bắt kiểu trả về phải có tên, đặt tên thì phải chọn trường, và chọn trường là
lúc nhìn thấy hai trường nội bộ đang đi ra ngoài. `UserView` giờ lọc chúng, và
`smoke-auth.mjs` khẳng định cả năm cách viết tên đều không có mặt.

---

# 10. Tám khoá cấu hình khai báo mà không dùng

```
LOGIN_RATE_LIMIT   LOGIN_RATE_WINDOW_MINUTES   MEDIA_MAX_UPLOAD_BYTES
MEDIA_PURGE_DELAY_DAYS   WORKER_MAX_ATTEMPTS   CAPTCHA_SECRET
INQUIRY_RECIPIENT   SMTP_HOST
```

Phần lớn là tính năng chưa làm (media, inquiry) — bình thường. Nhưng hai khoá
đầu là vấn đề số 1, và **cấu hình chết tạo cảm giác an toàn giả**: người vận
hành đọc `.env`, thấy `LOGIN_RATE_LIMIT=5`, và tin rằng có giới hạn.

Cách sửa: thêm một test đối chiếu khoá cấu hình với chỗ dùng, cho phép danh
sách "chưa dùng, thuộc phase X" tường minh. Khoá mới không nằm trong danh sách
nào sẽ làm test đỏ.

---

# 11. `worker/` là khung rỗng

63 dòng: heartbeat và tắt máy an toàn. Không có vòng lặp lấy job. Đúng như
thiết kế P0 và đã chú thích. Thuộc F5.

Nhưng nó import `createPool` trực tiếp — thuộc vấn đề số 3 và 4.

---

# Đề xuất: chèn một phase F-1 trước F0

Bốn vấn đề đầu phải xong trước khi viết endpoint. Gộp thành một phase riêng
để không lẫn vào việc thêm tính năng.

## F-1 — Vá nền

| Việc | Từ vấn đề |
|---|---|
| Giới hạn tốc độ đăng nhập + trần băm đồng thời | 1 |
| Interceptor vỏ `{ data, meta }` + luật kiến trúc | 2 |
| Gộp `createPool` về `packages/db`, một nguồn | 3 |
| Mở rộng luật kiến trúc sang `packages/` và `worker/` | 4 |
| Test cho `UserService` + `SettingService` | 5 |
| Giới hạn thân yêu cầu, security header, 503 cho DB, lọc `/auth/me` | 6–9 |
| Test đối chiếu cấu hình với chỗ dùng | 10 |

## Tự kiểm

- 100 yêu cầu đăng nhập đồng thời: số lần băm ≤ trần, tiến trình còn sống
- mọi endpoint hiện có trả `{ data }` — kiểm bằng máy, không đọc mắt
- `grep "new pg.Pool"` chỉ còn **một** kết quả ngoài script
- luật kiến trúc quét cả ba thư mục, và **tiêm lỗi** vào `packages/` để chứng
  minh nó phản ứng
- test mới cho hai service, mỗi bảo đảm đều tiêm lỗi

## Kiểm liên kết

- 259 test cũ vẫn xanh sau khi đổi vỏ phản hồi (`smoke-auth.mjs` phải sửa theo,
  và việc nó đỏ trước khi sửa là **bằng chứng** vỏ đã thực sự đổi)
- worker khởi động được sau khi gộp pool
- `pnpm dev:backend` + `node scripts/smoke-auth.mjs` vẫn 20/20

## Ước lượng

F-1 nhỏ hơn mọi phase khác — không thêm tính năng, chỉ vá và siết. Nhưng nó là
phase duy nhất mà **hoãn lại sẽ đắt hơn làm ngay**: vỏ phản hồi và nguồn pool
càng để lâu càng nhiều chỗ phải sửa.

---

# Điều tôi rút ra từ chính bản rà soát này

Bốn trong mười một vấn đề (1, 4, 5, 10) có cùng một dạng: **thứ tôi viết ra
trông đầy đủ nhưng không được máy nào canh**.

- `LOGIN_RATE_LIMIT` nằm trong config, không ai gọi → không luật nào hỏi
- `packages/` có mã trùng → luật kiến trúc không quét tới
- hai service không có test → không con số nào phản ánh
- `burn()` chống dò tài khoản → mở ra cửa cạn bộ nhớ

Chín luật kiến trúc hiện có đều kiểm **hình dạng của mã đã viết**. Không luật
nào hỏi *"thứ này có được dùng không"* hay *"biện pháp này có mở ra vấn đề khác
không"*. Luật 8 và Luật 9 sinh ra đúng vì hai câu hỏi đó, và cả hai đều do
người phát hiện chứ không do test.

Đó là lý do bản rà soát bằng mắt vẫn cần, và tại sao tôi nên làm nó **trước mỗi
nhóm phase** chứ không chỉ một lần.
