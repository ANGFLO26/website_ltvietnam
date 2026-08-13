/**
 * CACHE NGAN TRONG BO NHO — cho hai endpoint TONG HOP.
 *
 * `doc/06` PHAN VIII ghi ro `GET /home` va `GET /products/landing` dung "cache
 * ngan". Ly do do duoc o F1/F2: hai endpoint nay moi cai ton 10 truy van (nam
 * nhom x rows+count), va trong do NAM CAU `COUNT(*)` bi bo di — `list()` luon
 * dem con landing khong dung `total_items`.
 *
 * Toi da ghi cho nay lai o `doc/13` va hoan sang F4. Hai cach sua:
 *
 *   1. them `listFeatured(limit)` cho bon DAO -> bo duoc nam cau dem
 *   2. cache ket qua -> bo duoc CA MUOI cau cho moi luot xem trong TTL
 *
 * Chon (2) vi no giai quyet dung van de that: hai trang nay duoc xem RAT NHIEU
 * va du lieu doi RAT IT (chi khi bien tap doi `is_featured`). Cach (1) van ton
 * nam truy van moi luot xem. Va (2) khong mo rong be mat DAO cho mot trang.
 *
 * GIOI HAN CO THAT, noi ro:
 *
 *   1. Cache nam trong bo nho TIEN TRINH. Chay nhieu ban sao thi moi ban co ban
 *      cache rieng, nen mot thay doi cua bien tap co the hien khong dong thoi
 *      giua cac ban — trong pham vi TTL.
 *   2. Mutation admin site xóa được đúng prefix trong cùng tiến trình. Khi chạy
 *      nhiều bản sao, mỗi bản vẫn có cache riêng nên độ trễ tối đa vẫn bằng TTL.
 *
 * Trước khi chạy nhiều bản sao và cần invalidation đồng thời phải chuyển sang
 * Redis/pub-sub. Cùng kết luận với `AttemptCounter` và `SlidingWindowLimiter`.
 */
export interface CacheEntry<T> {
  readonly value: T;
  readonly hetHanLuc: number;
}

export class TtlCache {
  private readonly kho = new Map<string, CacheEntry<unknown>>();
  /** Dem de test khang dinh cache THAT SU duoc dung, khong phai doan. */
  private thongKe = { hit: 0, miss: 0 };

  constructor(
    private readonly ttlMs: number,
    /**
     * Tran so khoa. Khoa cua hai endpoint nay la `('home', locale)` va
     * `('landing')` — tap huu han va nho, nen tran chi de chan mot loi lap trinh
     * (dat locale hoac tham so nguoi dung vao khoa) khoi lam phinh bo nho.
     */
    private readonly maxKeys = 64,
  ) {}

  /**
   * Doc tu cache, hoac tinh roi luu.
   *
   * Nhan HAM chu khong nhan gia tri: neu nhan gia tri thi noi goi phai tinh
   * TRUOC khi biet co cache hay khong, va cache khong tiet kiem duoc gi.
   */
  async lay<T>(khoa: string, tinh: () => Promise<T>, now = Date.now()): Promise<T> {
    const co = this.kho.get(khoa);
    if (co && co.hetHanLuc > now) {
      this.thongKe.hit += 1;
      return co.value as T;
    }
    this.thongKe.miss += 1;
    const value = await tinh();

    /**
     * Don muc HET HAN truoc khi ep tran — va DINH CHINH chinh toi.
     *
     * Toi viet o ban dau: "khong don thi tran se bo mot khoa CON HIEU LUC de
     * nhuong cho rac". Cau do SAI, va phep tiem loi chi ra: bai kiem "tran bo muc
     * het han truoc" VAN XANH sau khi toi bo han vong don nay.
     *
     * Ly do no khong the sai duoc: TTL o day la MOT con so cho ca cache, nen thu
     * tu het han LUON TRUNG voi thu tu chen vao. `Map` cua JavaScript giu thu tu
     * chen, va vong `while` duoi bo tu dau — tuc no da bo cai het han som nhat.
     * Khong co truong hop nao "rac moi hon mot khoa con hieu luc".
     *
     * Vay vong nay con lam gi: no giai phong TAT CA muc het han trong mot lan,
     * thay vi bo dung mot muc moi lan chen. Voi 64 khoa thi khac biet la khong
     * dang ke — no o day cho truong hop TTL tro thanh THAM SO THEO KHOA (khi
     * `/navigation` muon TTL dai hon `/home`), va luc do thu tu het han KHONG con
     * trung thu tu chen, va cau sai o tren tro thanh cau dung.
     *
     * KHONG co bai kiem cho vong nay, va do la ket luan chu khong phai su bo sot:
     * hieu ung cua no khong quan sat duoc qua be mat cong khai. Mot bai kiem giao
     * ve "co ve nhu co kiem" thi te hon la khong co bai kiem nao.
     */
    if (this.kho.size >= this.maxKeys) {
      for (const [k, v] of this.kho) if (v.hetHanLuc <= now) this.kho.delete(k);
      while (this.kho.size >= this.maxKeys) {
        const dauTien = this.kho.keys().next();
        if (dauTien.done === true) break;
        this.kho.delete(dauTien.value);
      }
    }
    this.kho.set(khoa, { value, hetHanLuc: now + this.ttlMs });
    return value;
  }

  /** Chi dung trong test. */
  stats(): { hit: number; miss: number } {
    return { ...this.thongKe };
  }

  /** Xoa het — dung khi test, va se la diem noi cho viec vo hieu hoa o F8. */
  clear(): void {
    this.kho.clear();
    this.thongKe = { hit: 0, miss: 0 };
  }

  /**
   * Xóa đúng nhóm read-model sau mutation admin. Prefix luôn là hằng số nội
   * bộ (`home:`/`nav:`), không nhận dữ liệu người dùng nên không làm phình key.
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.kho.keys()) if (key.startsWith(prefix)) this.kho.delete(key);
  }
}
