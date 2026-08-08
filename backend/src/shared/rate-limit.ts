/**
 * GIOI HAN TOC DO — cua so truot, trong bo nho.
 *
 * Dung o day va KHONG dung o tang service: giai han theo IP can biet IP, ma
 * IP la khai niem cua HTTP. Tang service khong duoc biet gi ve HTTP.
 *
 * GIOI HAN CO THAT phai noi ro (giong `AttemptCounter` trong AuthService):
 *
 *   1. Bo dem nam trong bo nho TIEN TRINH. Chay nhieu ban sao thi moi ban dem
 *      rieng, nen tran thuc te = tran cau hinh x so ban sao.
 *   2. Khoi dong lai thi bo dem ve khong.
 *
 * Vi sao van du cho luc nay: muc dich cua no la chan mot ke doi endpoint dat
 * tien, khong phai dem chinh xac cho hoa don. Voi mot tien trinh tren mot may
 * — dung hien trang — no chinh xac. Truoc khi chay nhieu ban sao phai chuyen
 * sang Redis, va cho do da ghi trong `doc/13`.
 *
 * Vi sao CUA SO TRUOT chu khong phai cua so co dinh: cua so co dinh cho phep
 * gui gap doi han muc quanh ranh gioi — 5 lan o giay cuoi cua so nay va 5 lan
 * o giay dau cua so sau la 10 lan trong hai giay. Cua so truot khong co ke ho do.
 */

export interface RateLimitResult {
  readonly allowed: boolean;
  /** Con bao nhieu lan trong cua so. */
  readonly remaining: number;
  /** Giay phai cho truoc khi thu lai. `0` khi con luot. */
  readonly retryAfterSeconds: number;
}

export class SlidingWindowLimiter {
  /** khoa -> danh sach moc thoi gian cua cac lan goi con trong cua so. */
  private readonly hits = new Map<string, number[]>();
  private lastSweep = Date.now();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    /**
     * Tran so khoa duoc theo doi.
     *
     * Khong co tran thi mot ke tan cong doi IP lien tuc se lam `Map` phinh ra
     * cho toi khi het bo nho — tuc la bien chinh cong cu chong lam dung thanh
     * mot duong lam dung. Vuot tran thi don nhung khoa cu nhat.
     */
    private readonly maxKeys = 50_000,
  ) {}

  check(key: string, now = Date.now()): RateLimitResult {
    this.sweep(now);

    const cutoff = now - this.windowMs;
    const list = (this.hits.get(key) ?? []).filter((t) => t > cutoff);

    if (list.length >= this.limit) {
      // Lan cu nhat con trong cua so quyet dinh khi nao co luot moi.
      const retryAfter = Math.ceil((list[0]! + this.windowMs - now) / 1000);
      this.hits.set(key, list);
      return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, retryAfter) };
    }

    list.push(now);
    this.hits.set(key, list);

    /**
     * Ep tran SAU KHI chen, khong phai truoc.
     *
     * `sweep` cat ve dung `maxKeys`, roi dong tren them mot khoa nua — nen
     * tong thanh `maxKeys + 1`. Mot bai kiem bat duoc dieu do (`expected 101
     * to be less than or equal to 100`). Lech mot khoa thi vo hai, nhung tran
     * phai la tran that: neu khong thi con so trong cau hinh khong con nghia
     * gi chinh xac, va lan sau ai do doc no se tin sai.
     */
    if (this.hits.size > this.maxKeys) this.donKhoaCuNhat(this.hits.size - this.maxKeys);

    return { allowed: true, remaining: this.limit - list.length, retryAfterSeconds: 0 };
  }

  /** Xoa bo dem cua mot khoa — goi khi dang nhap thanh cong. */
  reset(key: string): void {
    this.hits.delete(key);
  }

  /** Chi dung trong test. */
  size(): number {
    return this.hits.size;
  }

  /**
   * Don khoa het han. Chay theo NHIP chu khong theo bo dem thoi gian:
   * `setInterval` giu tien trinh song va lam test kho tat sach.
   */
  private sweep(now: number): void {
    if (now - this.lastSweep < this.windowMs) {
      if (this.hits.size <= this.maxKeys) return;
    }
    this.lastSweep = now;

    const cutoff = now - this.windowMs;
    for (const [k, list] of this.hits) {
      const con = list.filter((t) => t > cutoff);
      if (con.length === 0) this.hits.delete(k);
      else this.hits.set(k, con);
    }

    // Van qua tran sau khi don -> bo khoa cu nhat.
    if (this.hits.size > this.maxKeys) this.donKhoaCuNhat(this.hits.size - this.maxKeys);
  }

  /** Bo `n` khoa co lan goi gan nhat CU NHAT. */
  private donKhoaCuNhat(n: number): void {
    const theoTuoi = [...this.hits.entries()].sort(
      (a, b) => (a[1][a[1].length - 1] ?? 0) - (b[1][b[1].length - 1] ?? 0),
    );
    for (const [k] of theoTuoi.slice(0, n)) this.hits.delete(k);
  }
}
