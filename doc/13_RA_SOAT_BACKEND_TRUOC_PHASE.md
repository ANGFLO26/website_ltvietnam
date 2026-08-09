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
| 3 | `createPool` trùng ở **6** chỗ (tôi đếm thiếu) | Cao | **đã sửa — F-1c** |
| 4 | Luật kiến trúc không quét `packages/` | Cao | **đã sửa — F-1c** |
| 5 | `UserService` / `SettingService` — **không một test nào** | Cao | **đã sửa — F-1d** |
| 6 | Không giới hạn kích thước thân yêu cầu | Trung bình | **đã sửa — F-1e** |
| 7 | Không có security header | Trung bình | **đã sửa — F-1e** |
| 8 | Lỗi kết nối DB → 500 thay vì 503 | Trung bình | **đã sửa — F-1e** |
| 9 | `/auth/me` trả trường nội bộ | Thấp | **đã sửa — F-1b** (Luật 10b kéo lên sớm) |
| 10 | ~~8~~ **22** khoá cấu hình chưa dùng — nay có test canh | Thấp | **đã canh — F-1e** |
| 11 | `worker/` vẫn là khung rỗng | — | F5 |
| **12** | `forgot-password`: hạn mức IP = hạn mức email = 3 | Trung bình | **đã sửa — F-1b** |
| **13** | `pnpm lint` chưa bao giờ xanh — 68 lỗi giả che 13 lỗi thật | Trung bình | **đã sửa — F-1c** |
| **14** | `pnpm dev:worker` chưa bao giờ chạy được | Cao | **đã sửa — F-1c** |
| **15** | **LEO THANG ĐẶC QUYỀN** — chỉ cần biết email quản trị | **Nghiêm trọng** | **đã sửa — F-1d** |
| **16** | `express` là **phantom dependency** — `tsc` xanh, chạy thì vỡ | Cao | **đã sửa — F-1e** |
| **17** | Thân yêu cầu quá lớn → **500** thay vì 413 | Trung bình | **đã sửa — F-1e** |

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

## ĐÍNH CHÍNH — sáu chỗ, không phải hai

Tôi viết "trùng ở 2 chỗ, 3 biến thể". Đếm lại:

| chỗ | `search_path` | `statement_timeout` | bộ đọc DATE |
|---|---|---|---|
| `packages/db/src/pool.ts` | có | có | **không** |
| `backend/src/dao/connection.ts` | có | có | có |
| `packages/db/src/cli.ts` | **không** | không | **không** |
| `packages/db/scripts/seed.ts` | **không** | không | **không** |
| `packages/db/scripts/generate-types.ts` | **không** | không | **không** |
| `packages/testing/src/index.ts` | **không** | không | **không** |

Cộng **15 chỗ nữa** trong `backend/test/` tự viết `new pg.Pool(...)`.

Và `packages/testing` là **mã chết** — không một ai `import '@ltv/testing'`.
Biến thể thứ sáu là biến thể không ai dùng.

## Nó KHÔNG phải rủi ro về sau — nó đã phân hoá rồi

Đo với `TZ=Asia/Ho_Chi_Minh`:

```
SELECT '2026-03-15'::date
  qua pool của @ltv/db  (worker + CLI dùng)  ->  Date   "2026-03-14T17:00:00Z"
  qua pool của backend                       ->  String "2026-03-15"
```

Worker đọc **lệch một ngày**, trên máy thật đặt giờ Việt Nam. Đó là đúng lỗi
tôi đã sửa ở `backend/src/dao/connection.ts` và viết cả một đoạn chú thích để
cảnh báo — rồi không mang nó sang bản sao thứ hai, vì **không có gì buộc phải
mang**. Bản sao không phân hoá vì ai cố ý; nó phân hoá vì không có gì buộc hai
bản phải giống nhau.

Và trên pool "thô" (`cli.ts`, `seed.ts`, `packages/testing`):

```
SHOW search_path                         ->  "$user", public
SELECT 1 FROM users                      ->  relation "users" does not exist
CREATE TABLE thu_khong_qualify (id int)  ->  nằm ở schema `public`
```

Câu thứ ba là cái đáng lo: một migration quên viết `ltv.` sẽ tạo bảng trong
`public` mà **không báo lỗi**, và mọi migration sau đó có viết `ltv.` sẽ thất
bại theo cách rất khó lần.

## ĐÃ SỬA (F-1c)

`packages/db/src/pool.ts` là nơi **duy nhất** gọi `new pg.Pool` / `new pg.Client`.

**Không gộp tất cả thành một hàm** — đó là chỗ dễ sai. Đo trên pool ứng dụng:

```
SHOW statement_timeout  ->  10s
SELECT pg_sleep(10)     ->  canceling statement due to statement timeout
```

`CREATE INDEX` trên bảng lớn mất vài phút. Cho migration dùng
`statement_timeout` của ứng dụng nghĩa là migration bị **huỷ giữa đường** khi
dữ liệu lớn lên — trên máy thật, không phải trên máy phát triển. Nên có **hai**
hàm có tên, chứ không phải một hàm với một cờ:

| | DATE | `search_path` | `statement_timeout` | `lock_timeout` |
|---|---|---|---|---|
| `createAppPool` | string | `ltv,public` | 10s | — |
| `createMigrationPool` | string | `ltv,public` | **0** | **10s** |
| `createTestPool` | string | `ltv,public` | 30s | — |
| `createPoolFrom` (seed) | string | `ltv,public` | 0 | — |

`lock_timeout = 10s` cho migration là **hai loại kiên nhẫn khác nhau**: thất
bại nhanh khi không lấy được khoá, còn việc thì cho chạy bao lâu cũng được.
Thiếu nó thì `statement_timeout = 0` biến một migration đợi khoá thành một
migration treo vô hạn đang **giữ khoá DDL**, chặn cả ứng dụng.

`packages/testing` từ mã chết thành nguồn duy nhất cho test, và 15 chỗ trong
`backend/test/` gọi nó. Điều đó biến một **sự tình cờ** thành một bảo đảm: bộ
đọc DATE đăng ký ở phạm vi module của `pool.ts`, nên trước đây test chỉ đọc DATE
đúng khi nó *tình cờ* kéo file đó theo.

Ba luật mới, quét **cả kho** kể cả file test:

```
12  chỉ `pool.ts` được gọi new pg.Pool / new pg.Client
13  `pool.ts` PHẢI đăng ký OID 1082 ở phạm vi module, và không nơi nào khác
14  `pg` chỉ được import như GIÁ TRỊ ở `pool.ts` (`import type` vẫn được)
```

Luật 13 là một khẳng định **khẳng định**, không phải một lệnh cấm. Luật 12 một
mình không đủ: ai viết lại `pool.ts` và bỏ dòng `setTypeParser` thì Luật 12 vẫn
xanh, và lỗi lệch một ngày quay lại ở **mọi** tiến trình cùng lúc — tệ hơn hiện
trạng trước F-1c, vì lúc đó ít nhất backend còn đúng.

Để **file test** ra ngoài phạm vi quét là để đúng chỗ nguy hiểm nhất không được
canh: 15 chỗ tự tạo pool đều nằm trong test.

---

# 13. `pnpm lint` chưa bao giờ xanh

Phát hiện khi chạy kiểm liên kết của F-1c, không có trong bản rà soát.

```
113 vấn đề, 79 lỗi
   68 × no-undef   `console`/`process` "không tồn tại" trong tệp .mjs
```

68 lỗi **giả** — cấu hình không khai báo biến toàn cục của Node. Cái giá thật
là chúng **che 13 lỗi thật**: `consistent-type-imports` (6),
`no-unused-vars` (6), `no-unused-expressions` (1). Không ai đọc qua được 68
dòng vô nghĩa để thấy 13 dòng có nghĩa, nên kết quả thực tế là không ai chạy
lint — và một công cụ không ai chạy thì không bảo vệ gì. Một cổng báo động liên
tục thì giống như không có cổng.

Trong 13 lỗi thật có hai cái đáng kể:

- `packages/db/src/schema-types.ts` khai `DateOnlyGen` và `Json` mà không bảng
  nào dùng. Tệp này ghi "**SINH TỰ ĐỘNG — ĐỪNG SỬA TAY**", nên sửa bằng tay sẽ
  bị `gen:types` ghi đè. Đã sửa **bộ sinh** để chỉ in bí danh nào được dùng.
  Sinh lại và diff: chỉ mất hai bí danh, 52 bảng không đổi kiểu nào.
- Và chính lúc diff mới thấy tệp "đừng sửa tay" đó **đã bị sửa tay**: chú thích
  trong nó trỏ tới `dao/connection.ts` như nơi đăng ký OID 1082 — một câu đã
  sai sau F-1c. Bây giờ bộ sinh in đúng `packages/db/src/pool.ts`.

Sau khi sửa: `0 lỗi`.

---

# 14. `pnpm dev:worker` chưa bao giờ chạy được

Cũng phát hiện khi chạy kiểm liên kết. Hai lỗi, cả hai tôi **đã sửa cho backend
rồi**:

```
node --experimental-strip-types --watch src/main.ts
```

- `--experimental-strip-types` không viết lại `.js` → `.ts` trong import. Tôi
  đã đổi backend sang `tsx` vì đúng lý do này, và không đổi worker.
- không có `--env-file-if-exists`, nên `loadConfig()` chết với
  `JWT_SECRET: Required` dù `.env` hợp lệ nằm ngay đó.

Đây là lần thứ ba trong F-1: sửa đúng một chỗ rồi không hỏi "còn chỗ nào cũng
thế không". Ba lần đó là `forgot-password` (F-1b), bộ đọc DATE, và cái này.

Sau khi sửa, worker khởi động thật:

```
{"ts":"...","worker_id":"worker-1","msg":"worker_start","poll_ms":5000}
```

**Còn một điều CHƯA sửa, ghi lại thay vì im lặng:** worker gọi `loadConfig()`
nên nó đòi `JWT_SECRET` và `PASSWORD_RESET_SECRET` — hai khoá nó không bao giờ
dùng. Người triển khai riêng worker phải cấp một bí mật vô nghĩa. Đó là vấn đề
cấu hình, thuộc F-1e.

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


---

# 15. LEO THANG ĐẶC QUYỀN — **nghiêm trọng**, phát hiện ở F-1d

F-1d lẽ ra chỉ là "viết test cho `UserService`". Bài test đầu tiên cho
`bootstrapFirstAdmin` làm lộ ra một lỗ hổng khai thác được, **chỉ cần biết email
quản trị**, không cần mật khẩu.

## Chuỗi khai thác — chạy thật trên HTTP

```
0. quản trị thật bootstrap                  ->  201, active admins = 1
1. kẻ tấn công gửi mật khẩu sai 5 lần       ->  401 x5, rồi 429
   trạng thái tài khoản                     ->  locked
2. quản trị thật, mật khẩu ĐÚNG             ->  không vào được
3. POST /auth/bootstrap   (@Public)         ->  201
   {"data":{"email":"ke-tan-cong@evil.test","role":"admin"}}
4. kẻ tấn công đăng nhập bằng tài khoản đó  ->  201

bảng users:  admin@ltvietnam.local  admin  locked
             ke-tan-cong@evil.test  admin  active
```

(Đo với `LOGIN_LOCK_AFTER_ATTEMPTS=5` để vừa **một** cửa sổ hạn mức. Mặc định là
10; hạn mức 5/email/15 phút nên kẻ tấn công cần **hai** cửa sổ, khoảng 30 phút.
Bộ đếm lần sai refresh mốc thời gian mỗi lần nên nó không hết hạn giữa hai cửa
sổ. Cùng một chuỗi, chỉ lâu hơn.)

## Nguyên nhân gốc là một CÂU HỎI SAI

```
bootstrapFirstAdmin hỏi   "còn quản trị HOẠT ĐỘNG nào không?"
câu hỏi đúng là           "hệ thống ĐÃ KHỞI TẠO chưa?"
```

Một hệ thống có quản trị bị `locked` là hệ thống **đã** khởi tạo. Hai câu hỏi
trả lời hai chuyện khác nhau — và `AuthService` thì tự đặt `status='locked'`,
nên kẻ tấn công **điều khiển được câu trả lời của câu hỏi sai**.

Điều đáng ghi lại: 9 luật kiến trúc, 4 luật vỏ phản hồi, 304 test — **không cái
nào thấy được**. Chúng kiểm *hình dạng* và *cơ chế*. Cái này là một câu hỏi sai,
viết đúng ngữ pháp, ở đúng tầng. Không có luật tự động nào bắt được loại lỗi đó;
nó lộ ra vì phải *đặt tên* cho hành vi khi viết test.

## Hai bản vá, mỗi bản đóng một nửa

1. `bootstrapFirstAdmin` dùng `countAll()` — bảng `users` phải **rỗng**.
   `countAll` cố ý **không lọc gì**, kể cả `deleted_at`: nếu lọc thì xoá mềm
   quản trị cuối cùng sẽ mở lại cổng, cùng lỗ hổng qua cửa khác.
2. `AuthService` **không khoá quản trị hoạt động cuối cùng**. Khoá quản trị duy
   nhất biến một cuộc tấn công *thất bại* thành một cuộc từ chối dịch vụ *thành
   công*, và ai biết email quản trị là làm được.

**Đánh đổi của bản vá 2, nói rõ:** hệ thống một quản trị — đúng hiện trạng dự
án — sẽ **không còn cơ chế khoá tài khoản nào**. Tôi chọn vậy vì bảo vệ thật
không phải là khoá: là hạn mức 5 lần sai/15 phút/email, cộng Argon2id ~50 ms mỗi
lần đoán, cộng mật khẩu tối thiểu 12 ký tự — 480 lần đoán một ngày không phá
được. Phát `auth_lock_skipped_last_admin` mức `warn` để việc này không im lặng.

## Đo lại sau khi vá, cùng kịch bản

```
đoán sai 5 lần        ->  401 x5, 429;  trạng thái VẪN `active`
log                   ->  auth_lock_skipped_last_admin
POST /auth/bootstrap  ->  409 USER_BOOTSTRAP_DONE
quản trị thật         ->  201
bảng users            ->  chỉ còn admin@ltvietnam.local, active
```

## Hai lỗi tôi tự tạo trong chính bộ test, cả hai chỉ lộ khi CHẠY

1. Bài test mới chạy `UPDATE ltv.users SET status='disabled' WHERE
   status='active'` rồi không trả lại. 343 test xanh, rồi `smoke-auth.mjs`
   thất bại ngay sau: nó đã vô hiệu hoá tài khoản của phép thử.
2. Tệ hơn: helper `voiBangRong` gọi `pool.query('BEGIN')` / `DELETE` /
   `ROLLBACK` trên một pool thường. **Pool không bảo đảm ba câu lệnh đi cùng
   một kết nối**, nên `DELETE FROM ltv.users` chạy ngoài transaction và **xoá
   thật**; `ROLLBACK` không hoàn tác gì. Test vẫn xanh, tài khoản mất vĩnh
   viễn. Tôi viết đúng cảnh báo này trong `createClientFrom` ở F-1c rồi mắc
   đúng lỗi đó vài phút sau. Sửa bằng `max: 1`, và kiểm lại bằng một hàng "cọc
   mốc" phải **còn** sau khi chạy test.

---

# 16. `express` là phantom dependency — `tsc` xanh, chạy thì vỡ

F-1e cần `import { json } from 'express'` để đặt trần thân yêu cầu.
`pnpm -r typecheck` **xanh**. Chạy thì:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'express'
```

`@types/express` có trong `devDependencies` nên kiểu giải được; gói **thực thi**
thì chỉ có mặt vì `@nestjs/platform-express` kéo theo. Kiểu và thực thi đến từ
hai nguồn khác nhau, nên typecheck không thể bắt.

pnpm dùng `node_modules` phẳng nên gói bóng **vẫn chạy trên máy này**. Đó là chỗ
nó nguy hiểm: chạy ở đây và đổ ở chỗ khác — hoặc đổ vào ngày
`@nestjs/platform-express` bỏ `express` khỏi cây phụ thuộc, lúc đó không ai liên
hệ được sự cố với thay đổi đó.

**Luật 15** quét mọi import giá trị và đối chiếu với `package.json` của gói sở
hữu tệp. Nó tìm thêm **ba** gói bóng nữa: `packages/config` và
`packages/contracts` có script `test: vitest run` và import `vitest` mà **không
khai báo** — chạy được chỉ vì pnpm hoist devDependency của gốc.

Kèm một phát hiện thứ hai: `@types/express` là `^5` còn thực thi là Express
`4.22.1` (nest 10 ghim). Đã hạ về `^4.17.21`.

---

# 17. Thân yêu cầu quá lớn → 500 thay vì 413

Đặt trần rồi, gửi thân 2 MB với `BODY_LIMIT_BYTES = 1 MiB`, và nhận:

```
500  {"error":{"code":"INTERNAL_ERROR","message":"Da co loi xay ra."}}
```

body-parser ném lỗi kiểu `http-errors` — một `Error` thường có `.status = 413`
và `.type = 'entity.too.large'` — **không** phải `HttpException` của Nest, nên
filter rơi vào nhánh "lỗi không lường trước".

Hậu quả: người gọi gửi yêu cầu quá lớn — **lỗi của họ** — và nhận "đã có lỗi
xảy ra", không biết phải gửi nhỏ hơn. Người vận hành thấy 500 và đi tìm bug
trong mã nguồn.

Đã sửa: tin `.status` trong khoảng **4xx** (quy ước `http-errors`, Express dùng
khắp nơi). Lỗi 5xx từ thư viện vẫn đi nhánh "không lường trước" để được ghi log
đầy đủ. Đo lại: `413 PAYLOAD_TOO_LARGE`.

Và một điều tôi **đo rồi mới biết**: JSON sai cú pháp **không** đi qua nhánh
này — Nest bọc nó thành `BadRequestException` trước (`ctor=BadRequestException
status=400 type=undefined`). Nên 400 là đúng, chỉ đến bằng đường khác. Bảng tra
`MA_THEO_TYPE` ban đầu tôi viết theo *tài liệu* của body-parser có 5 dòng; bốn
dòng trong đó **không bao giờ chạy**. Đã cắt xuống đúng một dòng đã đo được —
cùng thứ "cấu hình chết" mà `config-usage.test.ts` ra đời để chặn.


---

# 18–20. Rà soát lại F1 và F2 (trước khi code F3)

Ba phase F0/F1/F2 đều "xanh" khi tôi báo xong. Rà soát lại tìm được **ba vấn
đề**, và điều đáng nói là *cách* tìm ra: tôi đã **không tiêm lỗi** cho F1/F2 —
chỉ chạy test và thấy xanh. Đó là bỏ đúng bước đã bắt được lỗi ở mọi phase trước.

## 18. Hai bài kiểm của F2 RỖNG — tiêm lỗi không bị bắt

Tiêm 10 lỗi vào F1/F2. **8 bị bắt, 2 không:**

```
sort=newest  ->  đổi `published_at desc` thành `name desc`   TEST VẪN XANH
landing      ->  bỏ `isFeatured: true` khỏi truy vấn danh mục TEST VẪN XANH
```

- `sort=newest` là thứ người dùng bấm để xem hàng mới. Hai bài kiểm sắp xếp cũ
  chỉ kiểm `sort=name`; bài còn lại chỉ kiểm "ba lựa chọn đều gọi được". Nên
  **thứ tự thật chưa từng được đo**.
- Bài kiểm landing chỉ khẳng định `featured_brands`. Bốn nhóm còn lại — danh mục,
  tiêu chuẩn, ứng dụng, sản phẩm — **không được đo**. Bỏ bộ lọc ở bất kỳ nhóm nào
  trong bốn nhóm đó đều không bị phát hiện.

Cả hai là cùng một hình dạng: **kiểm một đại diện rồi coi như đã kiểm cả nhóm.**
Đã sửa: `sort=newest` giờ đặt mốc publish cách biệt rồi đối chiếu thứ tự thật
(và khẳng định `name` cho thứ tự KHÁC — nếu giống thì phép kiểm vô nghĩa);
landing kiểm cả năm nhóm.

## 19. Một chú thích khẳng định bảo đảm KHÔNG tồn tại

`packages/contracts/src/taxonomy.view.ts` — do tôi viết — có câu:

> "Dưới `.view.ts` nên Luật 11 quét và ép `snake_case`, dù nó nằm ngoài
> `backend/`"

**Câu đó sai.** Luật 11 chỉ quét `backend/src/api/dto/*.view.ts`. 11 kiểu view
mới của F1/F2 nằm trong `packages/contracts` và **không được canh gì cả**.

Một chú thích khẳng định một bảo đảm không tồn tại còn tệ hơn không có chú
thích: người đọc sau sẽ tin và không kiểm lại. Đã mở phạm vi Luật 11 sang
`packages/contracts/src/*.view.ts`, kèm một phép kiểm khẳng định **cả hai** nơi
đều được quét — nên thu phạm vi lại sẽ làm test đỏ.

## 20. Byte NUL trong đường dẫn → **500**

```
GET /api/v1/brands/pac%00
500  {"code":"INTERNAL_ERROR","message":"Da co loi xay ra."}
log: invalid byte sequence for encoding "UTF8": 0x00
```

`pg` từ chối byte NUL và ném lỗi; filter không nhận ra loại lỗi đó nên trả 500.
**Một ký tự** do người gọi gửi biến thành lỗi máy chủ: người gọi không biết mình
sai ở đâu, người vận hành thấy 500 rồi đi tìm bug trong mã nguồn.

Nguyên nhân gốc là một **bất đối xứng** tôi không nhận ra: tầng api xác thực
tham số **truy vấn** bằng zod ở mọi endpoint, nhưng tham số **đường dẫn** thì
`@Param('slug') slug: string` nhận bất kỳ chuỗi nào. Hai cửa vào, một cửa được
canh.

`SlugPipe` một mình không đủ — 11 chỗ phải nhớ gắn, và chỗ thứ 12 sẽ quên. Nên
thêm **Luật 17**: mọi `@Param(...)` ở tầng api phải có pipe. Quên là build đỏ.

`SlugPipe` **cố ý KHÔNG** ép định dạng slug (`^[a-z0-9-]+$`): ép ở tầng HTTP sẽ
đổi 404 thành 422 cho mọi URL cũ gõ sai, mà URL cũ là đúng thứ `redirects` đang
cố giữ. `/San-Pham/OptiDist.aspx` phải đi đến được resolver. Chỉ chặn cái làm
**vỡ** hệ thống (NUL) và cái vô nghĩa (rỗng / quá 255).

## Những gì rà soát KHÔNG tìm ra vấn đề — đo được, không phải đoán

```
SQL injection qua slug và ?q=       404/200, không 5xx nào
?q=%  ?q=_  ?q=%%%                 total=0  -> ký tự wildcard KHÔNG lọt vào LIKE
?page=1e9                          2–4 ms   -> không phải đường DoS
mảng 50 phần tử                    422 (trần 20)
POST/DELETE lên endpoint chỉ GET   404
```

## Ngân sách truy vấn — lần đầu được đo

```
/products (1 dòng)                   2      không N+1
/products (100 dòng)                 2
/products?brand&standard             2
/products/:slug                      9      cố định, không theo dữ liệu
/products/landing                   10      5 nhóm, chạy SONG SONG
/brands                              2
/product-categories/tree             2
/product-categories/:slug/products   3      kiểm slug + rows + count
```

**Điều tôi CHƯA sửa, ghi lại thay vì im lặng:** `/products/landing` dùng 10 truy
vấn, trong đó **5 câu `COUNT(*)` bị bỏ đi** — `list()` luôn đếm, còn landing
không dùng `total_items`. Chúng chạy song song nên thời gian thực tế ≈ một câu,
nhưng đó vẫn là 5 truy vấn vô ích trên trang catalogue chính. Sửa đúng cách là
thêm `listFeatured(limit)` cho bốn DAO — mở rộng bề mặt DAO cho một trang.
`doc/06` PHẦN VIII đã ghi landing dùng **cache ngắn**, nên tôi để cho F4 giải
quyết cùng lúc với cache thay vì thêm bốn phương thức bây giờ.

## Công cụ để lần sau không phải làm lại bằng tay

`scripts/smoke-api.mjs` (`pnpm smoke:api`) — 74 phép kiểm trên HTTP thật: vỏ
`{data, meta}` ở **mọi** endpoint, không lộ `id`/`status`, cây ≥ 2 cấp, mở rộng
nhánh con lồng **chặt**, ADR-007, ADR-010, ADR-011, và 14 dạng đầu vào rác phải
ra 4xx chứ không bao giờ 5xx.


---

# 21. Dữ liệu demo cho F3 — và một lỗi trong *cách tôi đo*

## Lỗ hổng của dữ liệu, hậu quả giống lỗ hổng của mã

Sau F3, `GET /services`, `/projects`, `/posts`, `/documents` đều trả **mảng rỗng**
trên HTTP thật: seed không có dữ liệu nào cho chúng. Bộ test tích hợp tự tạo dữ
liệu riêng nên nó xanh, nhưng `smoke-api.mjs` — phép thử trên máy chủ thật —
không kiểm được gì. Cùng một lỗ hổng với `featured_standards` rỗng ở F2: **một
đường không bao giờ được thử.**

Đã bổ sung: 5 dịch vụ (cây 2 cấp), 2 dự án, 2 danh mục tin, 4 bài viết, 3 tài
liệu, 2 trang tĩnh. Seed vẫn idempotent (chạy lại: 0 mới).

Ba chi tiết của bộ dữ liệu là **cố ý**, vì thiếu chúng thì phép thử không chứng
minh được gì:

```
draft-translation-only  cha publish, BẢN DỊCH nháp   -> phải VẮNG
draft-parent-only       CHA nháp, bản dịch publish   -> phải VẮNG
new-optidist-launch     cả hai locale publish        -> hreflang có 2 mục
astm-d86-explained      chỉ EN                        -> hreflang RỖNG
qc-lab-commissioning    customer_visibility=confidential -> không nêu tên
```

Nếu seed chỉ có bài "cả hai publish" thì một cài đặt **bỏ hết** điều kiện trạng
thái vẫn cho ra đúng kết quả đó.

`smoke-api.mjs`: **74 → 123** phép kiểm.

## Tôi đo trên MÃ NGUỒN ĐÃ BỊ HỎNG mà không biết

Khi tiêm lỗi vào server đang chạy, tôi dùng chung một `/tmp/bak` cho các phép
tiêm lồng nhau. Phép tiêm thứ hai ghi đè bản sao tốt, nên lần "phục hồi" trả về
một file **vẫn thiếu** `AND t.status = 'published'`.

Kết quả: `BAN DICH nhap -> vang` đổ ở **cả** những lần tiêm không liên quan đến
nó. Tôi gần như kết luận "F3 có bug thật".

Điều dừng tôi lại là **đối chiếu hai con số**:

```
SQL viết tay          -> 2 dòng
API                   -> 3 dòng
```

Hai con số phải bằng nhau. Chênh lệch đó không thể là bug của điều kiện lọc — nó
có nghĩa **SQL được sinh ra khác với SQL tôi tưởng**. Bắt câu lệnh thật ra thì
thiếu đúng dòng tôi đã tiêm. `git diff` trên kho thật thì **sạch** — sai sót nằm
hoàn toàn trong bản sao sandbox.

Hai điều rút ra, ghi lại vì tôi sẽ còn tiêm lỗi nhiều lần nữa:

1. **Mỗi phép tiêm phải có bản sao RIÊNG.** Dùng chung một tên tệp tạm là tự tạo
   ra một trạng thái không ai theo dõi được.
2. **Sau khi phục hồi, phải KIỂM đã phục hồi** — không phải giả định `cp` xong là
   xong. Rẻ hơn nhiều so với việc đi tìm một bug không tồn tại.

Và một hazard nữa cùng họ: mỗi lần chạy `pnpm dev:backend` trong sandbox mà tiến
trình cũ chưa chết thì **máy chủ cũ (đã bị tiêm) vẫn giữ cổng 3001 và trả lời**.
Phép đo khi đó nói về một phiên bản mã không còn tồn tại. Giờ tôi khởi động trên
một cổng khác cho mỗi lần đo sạch.

## Ba phép tiêm — sau khi sửa cách đo

Trên mã nguồn đã xác nhận phục hồi, cả ba đều làm `smoke-api.mjs` đỏ đúng chỗ:

```
bỏ AND t.status='published' khỏi SQL   -> BAN DICH nhap -> vang           FAIL
chi tiết chỉ kiểm CHA                 -> draft-translation-only -> 404   FAIL
hreflang luôn trả 1 mục               -> cả hai bài hreflang               FAIL
```

---

# 22. F4 — khung site: bốn phát hiện, hai trong số đó là chú thích của tôi sai

F4 thêm 5 endpoint (`/home`, `/navigation/:location`, `/customers`, `/offices`,
`/search`) và trả nợ 5 câu `COUNT(*)` bị bỏ của `/products/landing`. Phần đáng ghi
lại không phải mã, mà là bốn thứ **đo được** đã lộ ra khi làm.

## 22.1. Liên kết đa hình không có khóa ngoại — và menu nằm trên MỌI trang

`menu_items.link_target_id` và `banners.link_target_id` trỏ tới một trong tám loại
thực thể, **không có khóa ngoại**. Chú thích của chính tầng DAO đã nói trước hậu quả:

> "Tầng trên phải chịu được trường hợp đích đã bị xóa — bỏ qua mục đó chứ không
> phát một liên kết gãy lên menu."

Chưa ai làm việc đó, vì trước F4 chưa ai đọc hai bảng này qua HTTP. Nếu để nguyên và
trả cặp `(link_type, link_target_id)` ra cho frontend thì có hai hệ quả, và cái thứ
hai tệ hơn:

1. luật dựng URL bị sao chép sang một kho mã khác, và hai bản sẽ lệch
2. frontend **không biết** đích còn tồn tại và đã publish hay chưa → một mục trỏ tới
   nội dung đã xóa thành một liên kết 404 **trên toàn bộ site**

`LinkResolver` giải `(loại, id)` → đường dẫn theo **LÔ** (một truy vấn cho mỗi LOẠI
có mặt, không phải mỗi mục), và id không có trong `Map` nghĩa là **bỏ mục đó**.

Bốn quyết định trong đó, mỗi cái một lý do khác nhau:

| trường hợp | xử lý | vì sao |
|---|---|---|
| mục menu giải không ra | **BỎ** mục | một dòng chữ trỏ tới 404; bỏ đi thì không ai thấy |
| **banner** giải không ra | **GIỮ ảnh**, bỏ liên kết | banner là ảnh lớn đầu trang chủ; bỏ đi thì băng chạy trống, trang chủ trông như bị hỏng |
| `link_type='none'` | **GIỮ**, `url=null` | đó là **tiêu đề nhóm** (cột chân trang thường có dòng đầu không bấm được) |
| cha giải không ra nhưng **có con sống** | **GIỮ** cha làm tiêu đề | bỏ cả nhánh là mất luôn năm liên kết đúng vì một liên kết sai |

Và một cửa nữa: `custom_url` chỉ được nhận nếu bắt đầu bằng `https://` hoặc `/`.
Đầu vào này đến từ **màn hình quản trị**, không từ mã nguồn — một
`javascript:alert(1)` người biên tập dán vào sẽ thành liên kết thực thi được trên mọi
trang. Có phép kiểm cho cả năm trường hợp, và cả năm đều được **tiêm lỗi** xác nhận.

## 22.2. `x = NULL` — hai đường trả về TẬP RỖNG trong im lặng

`TranslationSupport.listPublicByLocale(locale, page, where)` duyệt
`Object.entries(where)` và sinh `AND p.<cột> = <giá trị>`. Hai cách gọi **tự nhiên**
đều sinh ra `= NULL`, và `x = NULL` trong SQL **không bao giờ đúng**:

```ts
{ is_featured: filter?.featured }   // `featured` chưa đặt -> = NULL -> danh sách RỖNG
{ parent_id: null }                 // ý là "chỉ lấy nút gốc"  -> = NULL -> RỖNG
```

Không ngoại lệ, không cảnh báo, `tsc` xanh. Chỉ là một danh sách trống. Tôi phát hiện
khi định viết đúng dòng thứ nhất cho bộ lọc `featured` của F4.

Đã vá tại **nguồn** chứ không tại nơi gọi: `undefined` → bỏ hẳn khóa,
`null` → `IS NULL`. Vá ở nơi gọi thì cách gọi thứ hai vẫn sai, và `parent_id` **nằm
trong** `TCol` của `ServiceDao` — tức đó là một cách gọi kiểu-cho-phép.

**Phép tiêm đầu tiên KHÔNG ĐẠT**: bỏ bộ lọc đi thì mọi bài kiểm vẫn xanh — không bài
nào truyền `undefined` hay `null` vào `where`. Đã thêm ba phép kiểm ở tầng DAO
(`translation.integration.test.ts`), và tiêm lại thì cả hai nửa đều đỏ.

## 22.3. Chú thích của tôi về `maxKeys` là SAI — và bài kiểm cho nó RỖNG

`TtlCache` dọn mục hết hạn trước khi ép trần số khóa. Tôi viết:

> "Không dọn thì một khóa hết hạn vẫn chiếm chỗ, và trần sẽ bỏ một khóa **còn hiệu
> lực** để nhường cho rác."

Phép tiêm (bỏ hẳn vòng dọn) cho bài kiểm **vẫn xanh**. Tìm hiểu thì câu trên **không
thể đúng**: TTL là **một** con số cho cả cache, nên thứ tự hết hạn luôn trùng thứ tự
chèn, và vòng `while` (bỏ từ đầu `Map`) đã bỏ đúng cái hết hạn sớm nhất rồi. Trường
hợp tôi mô tả không tồn tại.

Đã sửa chú thích, **xóa** bài kiểm rỗng, và giữ vòng dọn với lý do thật của nó: nó
giải phóng *tất cả* mục hết hạn trong một lần, và nó ở đó cho lúc TTL trở thành tham
số **theo khóa** (khi `/navigation` muốn TTL dài hơn `/home`) — lúc đó câu sai ở trên
mới thành câu đúng.

Thử phép tiêm thứ hai (`while (size >= maxKeys)` → `while (size > 0)`) cũng **không
đạt**: `set()` chạy sau vòng dọn nên khóa mới vẫn có mặt. Kết luận: bảo đảm "khóa mới
nhất còn lại" bền với mọi biến thể bỏ-từ-đầu, nên không có phép tiêm hợp lý nào phá
được nó. **Để trống trong `inject-f4.mjs`, có ghi lý do** — một dòng "đạt" giả còn tệ
hơn không có dòng nào.

## 22.4. `ltv.offices.status` mặc định là `'published'` — năm bảng như vậy

Seed demo của tôi ghi "chưa publish → phép kiểm ngược", rồi `/offices` trả về **cả ba**
hàng, kể cả hàng tôi tưởng là bản nháp. Đối chiếu toàn bộ schema:

```
draft:      banners brands customers documents pages posts products projects services
            + 4 bảng *_translations
published:  applications  industries  offices  post_categories  standards
active:     menus  menu_items  redirects  users
```

Năm bảng `published` là nhóm **dữ liệu tham chiếu**, và mặc định đó **có lý**: ASTM D86
là một sự thật, không phải một bài viết cần duyệt; địa chỉ công ty cũng vậy.

Nhưng nó có một hệ quả cho **F8** cần ghi trước: màn hình quản trị của năm nhóm này
tạo ra bản ghi **đã công khai ngay từ lúc bấm Lưu**. Một văn phòng điền nửa (địa chỉ
trống) sẽ xuất hiện trên trang liên hệ trước khi người biên tập điền xong. Cần một
trong hai: hoặc form tạo phải đầy đủ mới cho Lưu, hoặc luồng tạo phải `unpublish()`
ngay sau `insert()`.

Cùng chỗ này còn một khoảng mở nữa: **không có ràng buộc nào chặn hai `head_office`
cùng `published`**, và `findHeadOffice()` chỉ `orderBy('display_order')` rồi
`executeTakeFirst()` — với hai hàng cùng `display_order` thì kết quả là **bất kỳ**.
Hàm này là nguồn cho `schema.org LocalBusiness` của toàn site. Chưa vá (cần một chỉ
mục UNIQUE có điều kiện, tức một migration); ghi lại ở đây.

Và một bài kiểm cũ hóa ra **vừa rỗng vừa giòn**:

```ts
it('tim tru so chinh — chi lay ban da xuat ban', async () => {
  const found = await daos.offices.findHeadOffice();
  expect(found?.name).toBe(`${tag} Tru so`);   // mac dinh status = 'published'
});
```

Nó **không** kiểm điều nó nói: bài kiểm chưa bao giờ tạo một trụ sở *chưa* xuất bản,
nên điều kiện `status='published'` trong `findHeadOffice()` không được đo. Bỏ hẳn điều
kiện đó đi thì bài kiểm cũ **vẫn xanh**. Và nó cho rằng trụ sở của nó là trụ sở duy
nhất trong database — nên khi dữ liệu demo F4 thêm một `head_office`, nó đỏ vì một lý
do không liên quan gì tới điều nó muốn kiểm. Đã viết lại.

## 22.5. Năm câu `COUNT(*)` bị bỏ của `/products/landing` — vá bằng cache

Đã ghi ở F2 và hoãn sang đây. `landing()` gọi bốn `list()` + một
`findFeaturedCards()`; mỗi cái chạy **hai** câu (một lấy dòng, một đếm), nhưng
`ProductLandingView` là năm mảng **không có `meta`** — nên năm câu đếm là công việc bị
bỏ đi hoàn toàn.

Hai cách sửa, và tôi nói rõ đã chọn cái nào **và cái nào chưa làm**:

| | bỏ được | còn lại |
|---|---|---|
| (a) thêm `listFeatured(limit)` cho 4 DAO | 5 câu đếm, **mọi** lượt xem | 5 truy vấn mỗi lượt xem |
| (b) cache 60s **(đã chọn)** | cả 10 câu, trong TTL | lần cache lạnh vẫn đủ 10 câu |

Chọn (b) vì số lượt xem cao hơn số lần biên tập đổi `is_featured` vài bậc độ lớn. **(a)
chưa làm**, và nó **cộng** được với (b) chứ không thay thế — nếu sau này chạy nhiều bản
sao (mỗi bản một cache riêng, số lần lạnh nhân theo số bản) thì (a) là bước tiếp.

Hai giới hạn của cache này là **thật** và đã viết vào `shared/cache.ts`:
nó nằm trong bộ nhớ **một tiến trình**, và **không có cơ chế vô hiệu hóa** — biên tập
đổi `is_featured` thì phải đợi hết TTL. Đó là lý do TTL phải **ngắn** (60s), không phải
"vài phút cho hiệu quả hơn". Có một bài kiểm **nêu thẳng cái giá đó** thay vì để nó
trong chú thích: đổi dữ liệu → phản hồi vẫn cũ → `clear()` → mới.

## 22.6. Tìm kiếm theo tên hãng: `EXISTS`, KHÔNG được dùng alias của `JOIN`

`doc/06` PHẦN IX đòi `/search` phủ cả **hãng/danh mục/tiêu chuẩn**; `buildWhere` cũ
chỉ có `name`/`model`/`short_description`. Ba trường kia ở bảng khác, và cách nối vào
quan trọng: đoạn `where` được dùng cho **HAI** câu, và câu **đếm** không có `JOIN`:

```sql
SELECT ... FROM ltv.products p JOIN ltv.brands b ON ... WHERE {where}   -- có b
SELECT count(*) AS n FROM ltv.products p WHERE {where}                 -- KHÔNG có b
```

Viết `b.name ILIKE ...` thì câu lấy dòng chạy đúng và câu đếm nổ
`missing FROM-clause entry for table "b"` — tức `/search` trả về đúng kết quả rồi vỡ ở
bước đếm. Tôi định viết `b.name` vì thấy `b` có sẵn ở câu trên. Nên phép kiểm phải đọc
`total_items` (đến từ câu đếm), không chỉ đọc `data` — có phép tiêm cho đúng chỗ này.

## Trạng thái sau F4 — đo, không phải tuyên bố

```
492 bài kiểm (28 tệp)          xanh
API 48/56 endpoint             F-1 9/9 · F0 1/1 · F1 17/17 · F2 3/3 · F3 13/13 · F4 5/5
smoke-api.mjs                  204/204   (123 -> 204)
smoke-auth.mjs                 38/38
HTTP 5xx trong toàn bộ phép đo 0
pnpm -r typecheck              sạch (7 gói)
pnpm lint                      0 lỗi
inject-f4.mjs                  13/13 phép tiêm làm phép kiểm đỏ
seed demo chạy lại             0 mới, 68 đã có (idempotent)
```

## Công cụ mới, để lần sau không làm lại bằng tay

- `scripts/inject-f4.mjs` — 13 phép tiêm tự động. Mỗi lần tiêm có **tệp sao lưu
  riêng** và **đối chiếu băm sau khi hoàn tác** (hai luật ra từ lần tôi tự làm hỏng
  phép đo ở F3). Nó cũng bắt được cả trường hợp bài kiểm **đỏ từ trước** — vì lúc đó
  phép tiêm không kết luận được gì.
- `implementation/evidence/p0-sandbox/sandbox-pg.sh` — bản lưu cách khởi động PostgreSQL
  trong hộp cát. Dùng `pg_isready` chứ
  **không** dùng `[ -S socket ]`: tệp socket **vẫn còn** sau khi tiến trình chết, nên
  phép kiểm "có socket không" báo là đang chạy rồi mọi lệnh sau đó thất bại với
  "Connection refused". Tôi đã dính đúng cái bẫy đó.
