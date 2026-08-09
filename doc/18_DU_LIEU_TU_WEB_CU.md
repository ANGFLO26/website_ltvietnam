# Lấy dữ liệu từ web cũ — phân tích và đề xuất

**Ngày:** 2026-08-10 · **Nguồn:** `https://www.ltvietnam.com.vn/` (đọc thật ngày 2026-08-10)

> Tài liệu này trả lời: **lấy gì từ web cũ, không lấy gì, và phải tự tạo gì.**
> Mục 4 và 5 **cần bạn duyệt** trước khi tôi crawl toàn bộ và nạp dữ liệu.

---

# 1. Phát hiện lớn nhất — tính năng chính của web mới không có nguồn dữ liệu ở web cũ

Web cũ tổ chức **theo hãng**: `PAC` / `BAKER HUGHES` / `OTHER PRODUCTS`. Trang
`/m/69/HERZOG` liệt kê 12 máy. Không có **danh mục theo chức năng** nào — không "chưng
cất", không "điểm chớp cháy", không "độ nhớt". Không có tiêu chuẩn ASTM gắn với sản phẩm.
Không ứng dụng. Không ngành.

Nhưng toàn bộ giá trị tăng thêm của web mới nằm đúng ở đó:

| Tính năng đã xây | Cần dữ liệu gì | Web cũ có? |
|---|---|---|
| Lọc đa chiều OR/AND (ADR-007) | category · standard · application · industry | **không** |
| Mở rộng nhánh con (ADR-015) | cây danh mục ≥ 2 cấp | **không** |
| Mega menu tự sinh | danh mục `is_featured` | **không** |
| `/products/category\|standard\|application/:slug` | như trên | **không** |
| Lọc theo hãng | cây hãng | **có** |

**Copy web cũ sang thì những trang đó rỗng.** Phải có người định nghĩa cây danh mục và
gán từng máy vào — công việc chuyên môn, không phải công việc lập trình.

→ Đã chốt: **tôi đề xuất, bộ phận kỹ thuật duyệt lại sau** (mục 4).

---

# 2. Ba đính chính cho tài liệu của chúng ta

## 2.1. URL cũ **không chỉ** là `.aspx` — ít nhất ba dạng

`doc/14` ghi *"301 cho ~200 URL `.aspx` cũ"*. Đo thật:

```
/m/69/HERZOG                                   trang hãng          KHÔNG .aspx
/m/63/1/About-Us-LT-Viet-Nam                   trang giới thiệu    KHÔNG .aspx
/m2/1/Contacts-Us                              trang liên hệ       KHÔNG .aspx
/m/69/25/CID-510--Cetane-Ignition-Delay….aspx  chi tiết sản phẩm   CÓ .aspx
```

Bản đồ redirect chỉ phủ `.aspx` sẽ để **toàn bộ trang hãng và trang giới thiệu trả 404** —
đúng những URL được link nhiều nhất từ bên ngoài và từ chính menu. `RouteResolver` (F0) xử
lý được cả bốn dạng vì nó tra bảng chứ không đoán theo đuôi; vấn đề nằm ở **nội dung bảng**,
không ở mã.

`doc/03` mục 175 đã nói đúng bản chất: *"URL cũ dùng ID nội bộ nên không suy ra được URL
mới. Bảng ánh xạ phải lập thủ công từng dòng."*

## 2.2. Tên sản phẩm đang **song ngữ trong một chuỗi**

```
"OptiDist: Atmospheric Distillation / Thiết bị phân tích thành phần chưng cất tự động
 tại áp suất khí quyển"
```

Sơ đồ của ta coi sản phẩm là **một ngôn ngữ** (ADR-014 — không có bảng dịch cho
`products`). Nạp nguyên chuỗi vào `name` thì thẻ sản phẩm dài gấp ba, tiêu đề SEO xấu, và
người đọc bản tiếng Anh thấy cả tiếng Việt.

→ Đã chốt: **tách**, tôi đề xuất từng dòng để soát (mục 5).

## 2.3. Footer web cũ có một khối bán backlink

Khối `LIÊN KẾT` ở chân trang chứa ~30 liên kết **không liên quan gì tới ngành**: chống
thấm, xe đạp trợ lực điện, đồ gỗ, xi măng, huấn luyện chó. Đây là link farm.

Ba việc: **không** mang sang; **không** đưa vào bản đồ redirect; và nên nói với chủ site —
nó có thể là dấu hiệu site bị chèn hoặc đã bán chỗ đặt link, và điều đó ảnh hưởng uy tín
tên miền khi chuyển sang web mới.

---

# 3. Lấy gì · không lấy gì · phải tự tạo gì

## 3.1. LẤY — bộ xương

| Dữ liệu | Số lượng | Ghi chú |
|---|---|---|
| Văn phòng | **3** | Hà Nội (HQ) · HCM · Quảng Ngãi — đủ địa chỉ/ĐT/email, dùng ngay |
| Hãng | **18**, có cây cha–con thật | PAC → ALCOR·HERZOG·ISL·ANTEK·AC·PHASE; Baker Hughes → Masoneilan·Consolidated |
| Dịch vụ | **4** | Lab instrument · Plate heat exchanger · Rotating equipment · Valve |
| Sản phẩm | HERZOG 12 → ước cả site **~100–150** | tên · model · ảnh · URL cũ |
| Ảnh sản phẩm | có thật | `/hinhanh/sanpham/*.jpg\|png` |
| Mô tả công ty | 1 đoạn | dùng cho `/about` và meta description |
| Bản đồ URL cũ | ~200 dòng | **cả bốn dạng** ở mục 2.1 |

Cây hãng cha–con là thứ **làm ADR-015 có nghĩa**: lọc theo `PAC` phải ra cả máy gắn vào
`HERZOG`. Đây là dữ liệu thật, không phải giả định.

## 3.2. KHÔNG lấy

- **IA / menu cũ.** Web cũ theo hãng; `doc/02` đã thiết kế IA mới theo danh mục. Copy menu
  cũ là hoàn tác thiết kế mới.
- **Khối link farm** (mục 2.3).
- **Văn bản marketing dài** — sẽ viết lại; hiện tại dùng văn bản thay thế.
- **Giao diện.** Không tham chiếu.

## 3.3. PHẢI TỰ TẠO — web cũ không có

- Cây danh mục theo chức năng + gán sản phẩm (mục 4)
- Tiêu chuẩn ASTM gắn với từng máy
- Ứng dụng, ngành
- Nội dung `/vi` (web cũ **toàn tiếng Anh** — đúng như ADR-001 đã lập luận)
- **Toàn bộ tổ hợp trạng thái đối nghịch**: bản nháp, bản dịch thiếu, máy ngừng kinh
  doanh, menu trỏ tới nội dung đã xóa, sản phẩm thiếu ảnh, tên rất dài

Điểm cuối quan trọng và dễ bị bỏ qua: **web cũ chỉ chứa đường hạnh phúc.** Backend đã xây
để xử lý đúng những trường hợp kia, và giao diện phải nhìn thấy chúng. Dữ liệu thật không
thay được dữ liệu kiểm thử.

---

# 4. ĐỀ XUẤT — cây danh mục theo chức năng · **cần duyệt**

Suy từ tên máy và phương pháp thử. Áp cho 12 máy HERZOG làm mẫu; các hãng khác theo cùng
nguyên tắc.

```
Petroleum Testing                        (gốc)
├── Distillation                         chưng cất
│     OptiDist (khí quyển) · HDV 632 (chân không)
├── Flash Point                          điểm chớp cháy
│     OptiFlash Pensky-Martens · Cleveland Open Cup · Small Scale · Tag & Abel
├── Viscosity                            độ nhớt
│     HVM 472 · HVU 481 & 482
├── Vapor Pressure                       áp suất hơi
│     HVP 972
├── Combustion & Ignition                cháy và đánh lửa
│     CID 510
├── Contamination & Stability            tạp chất và độ ổn định
│     HGT 915 & 917
└── Physical Properties                  tính chất vật lý
      HRB 754
```

**Vì sao chia thế này:** người mua thiết bị phân tích tìm theo **phép thử họ cần làm**
("tôi cần đo điểm chớp cháy"), không theo hãng. Cây hai cấp đủ để ADR-015 có việc làm, và
`Flash Point` có 4 máy nên bộ lọc OR trong cùng dimension có ý nghĩa ngay.

**Cần bộ phận kỹ thuật xác nhận**, không phải tôi:

| Máy | Tiêu chuẩn tôi **đề xuất** | Độ tin |
|---|---|---|
| OptiDist | ASTM D86 | cao |
| HDV 632 | ASTM D1160 | cao |
| OptiFlash Pensky-Martens | ASTM D93 | cao |
| OptiFlash Cleveland Open Cup | ASTM D92 | cao |
| OptiFlash Tag & Abel | ASTM D56 · IP 170 | trung bình |
| OptiFlash Small Scale | ASTM D3828 · D7236 | trung bình |
| HVM 472 · HVU 481/482 | ASTM D445 | cao |
| HVP 972 | ASTM D5191 · D323 | trung bình |
| CID 510 | ASTM D6890 · D7170 | trung bình |
| HGT 915 & 917 | ASTM D381 | cao |
| HRB 754 | ASTM D36 | cao |

Đây là **suy luận từ tên phép thử**, không phải trích từ tài liệu hãng. Mã tiêu chuẩn sai
trên một web B2B thiết bị phân tích là lỗi uy tín, nên **không nạp dòng nào chưa được xác
nhận** — cho tới lúc đó để trống trường `standards`, trang vẫn chạy.

---

# 5. ĐỀ XUẤT — luật tách tên song ngữ · **cần soát**

## Luật

1. Cắt ở `" / "` đầu tiên → **vế trái = tiếng Anh**, **vế phải = tiếng Việt**
2. Bỏ tiền tố tên hãng ở vế trái (`"HERZOG: "`)
3. `model` = cụm mã ở đầu vế trái (chữ + số), giữ nguyên hoa/thường
4. `name` = vế trái sau khi bỏ tiền tố hãng
5. `short_description` = vế phải
6. Dòng **không có** `" / "` → đánh dấu **cần soát tay**

## Bảng soát — 12 máy HERZOG (lấy thật)

| # | `model` | `name` (EN) | `short_description` (VI) | Cần soát |
|---|---|---|---|---|
| 1 | `CID 510` | CID 510 - Cetane Ignition Delay | Thiết bị đo chỉ số Derived Cetane number | |
| 2 | `HDV 632` | HDV 632: Vacuum Distillation | Thiết bị chưng cất tự động ở áp suất chân không | |
| 3 | `HGT 915 & 917` | HGT 915 & 917: Gum Test | Thiết bị phân tích hàm lượng nhựa | model có `&` |
| 4 | `HRB 754` | HRB 754 Ring & Ball | Thiết bị đo điểm hóa mềm | đã bỏ tiền tố `HERZOG:` |
| 5 | `HVM 472` | HVM 472: Multirange Viscometer | Thiết bị đo độ nhớt động học tự động | |
| 6 | `HVP 972` | HVP 972: Vapor Pressure | Thiết bị đo áp suất hơi bão hòa tự động | |
| 7 | `HVU 481 & 482` | HVU 481 & 482 Ubbelohde Viscometers | Thiết bị đo độ nhớt động học bán tự động | model có `&` |
| 8 | `OptiDist` | OptiDist: Atmospheric Distillation | Thiết bị phân tích thành phần chưng cất tự động tại áp suất khí quyển | |
| 9 | `OptiFlash` | OptiFlash - Pensky Martens | Thiết bị đo điểm chớp cháy cốc kín Pensky Martens | **model trùng** |
| 10 | `OptiFlash` | OptiFlash Cleveland Open Cup | Thiết bị đo điểm chớp cháy cốc hở Cleveland | **model trùng** |
| 11 | `OptiFlash` | OptiFlash Small Scale | Thiết bị đo điểm chớp cháy cốc kín theo phương pháp small scale | **model trùng** |
| 12 | `OptiFlash` | OptiFlash Tag & Abel | Thiết bị đo điểm chớp cháy cốc kín TAG | **model trùng** |

## Hai chỗ luật chưa đủ, cần bạn quyết

**a. `model` trùng nhau (dòng 9–12).** Bốn máy đều là dòng `OptiFlash`. `model` không phải
khóa duy nhất trong sơ đồ nên database chấp nhận — nhưng thẻ sản phẩm hiện `model` ngay
dưới tên, và bốn thẻ cạnh nhau cùng ghi `OptiFlash` thì cột đó vô nghĩa.

Ba cách: (1) `model` = biến thể đầy đủ (`OptiFlash PM`, `OptiFlash COC`…); (2) để trùng và
chấp nhận; (3) bỏ trống `model`, để tên gánh.

**b. `slug`.** Đề xuất sinh từ `name` tiếng Anh, bỏ dấu, chữ thường:
`optidist-atmospheric-distillation`, `optiflash-cleveland-open-cup`. Ngắn và ổn định. Đây
là URL vĩnh viễn nên đổi sau tốn một redirect mỗi dòng.

---

# 6. Việc tiếp theo, theo thứ tự

| | Việc | Chặn bởi |
|---|---|---|
| 1 | Bạn duyệt mục 4 (cây danh mục) và mục 5 (luật tách + hai câu a/b) | **bạn** |
| 2 | Crawl 16 trang hãng còn lại, trích tên · model · ảnh · URL cũ | (1) |
| 3 | Sinh seed thật: 18 hãng + cây · ~100–150 sản phẩm · 4 dịch vụ · 3 văn phòng | (2) |
| 4 | Bản đồ redirect từ **cả bốn dạng URL** ở mục 2.1 | (2) |
| 5 | Giữ nguyên seed đối nghịch hiện có, chạy **song song** seed thật | — |
| 6 | Sửa `doc/14` (`.aspx`) và `doc/08` PHẦN VII (hai mâu thuẫn ở `doc/17` mục 0) | — |

Mục 5 đáng nhấn: **seed thật không thay seed đối nghịch.** Seed thật cho hình dáng và quy
mô; seed đối nghịch cho các tổ hợp trạng thái làm lỗi hiện ra. Bỏ cái thứ hai là lặp lại
đúng lỗi đã khiến bug `LinkResolver` ẩn được suốt (`doc/13` mục 23.7).

---

# 7. Về mục tiêu "làm UI để test chức năng"

Ghi lại để không trôi:

**UI là công cụ tồi để kiểm lại backend.** 594 test và 266 phép kiểm smoke làm việc đó
nhanh hơn và chắc hơn; nhìn bằng mắt còn dễ bỏ sót — một trang render "trông ổn" trong khi
hiển thị sai dữ liệu.

**Giá trị thật của UI như một phép kiểm là kiểm HỢP ĐỒNG:** API có trả đủ những gì màn
hình trong `doc/08` cần vẽ không? Ví dụ đã thấy ngay — thẻ sản phẩm theo `doc/08` PHẦN III
cần *ảnh · hãng · tên · model · mô tả ngắn · **tiêu chuẩn nổi bật***, nhưng
`ProductCardView` **không có trường tiêu chuẩn**. Loại thiếu sót đó chỉ lộ ra khi dựng màn
hình thật, và chưa ai kiểm.

**Điều kiện để "đẹp sau" không thành "viết lại":** phần rẻ là CSS, phần đắt là cấu trúc.
Bản xấu vẫn phải có HTML đúng ngữ nghĩa, một `<h1>` mỗi trang, landmark, nhãn form, thứ tự
focus, tương phản. Việc đó không tốn thêm thời gian ở giai đoạn này. Dựng bằng `<div>` lồng
nhau thì cải thiện UI sau là làm lại từ đầu.
