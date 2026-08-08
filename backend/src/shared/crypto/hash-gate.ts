import { DependencyUnavailableError } from '../errors.js';

/**
 * CONG BAM — tran so lan bam CHAY CUNG LUC, va tran so lan DANG CHO.
 *
 * Vi sao can, do bang phep do that (`doc/13` muc 1):
 *
 *   `@node-rs/argon2` la thu vien native BAT DONG BO, nen no chay tren
 *   threadpool cua libuv — mac dinh 4 luong. Dieu do co hai hau qua ma toi
 *   da bo qua khi viet `AuthService`:
 *
 *   1. Threadpool cua libuv dung CHUNG cho doc tep, DNS va nen. Doi endpoint
 *      dang nhap lam bao hoa threadpool, va moi thu khac dung no phai cho.
 *      Do duoc: dang nhap that di tu ~50ms len 407ms khi co 30 ke doi.
 *
 *   2. Bo nho bi chan o 4 x 19 MiB nho threadpool nho — nhung do la MAY MAN,
 *      khong phai thiet ke. Ai do tang `UV_THREADPOOL_SIZE` de toi uu hieu
 *      nang — mot viec rat thuong lam — thi 200 yeu cau rac ngoi 1,5 GB.
 *      Do duoc: 270 MiB o threadpool 4, 1491 MiB o threadpool 64.
 *
 * Cong nay lam ca hai thanh CO CHU DINH: tran khong phu thuoc cau hinh cua
 * libuv, va vuot tran thi TU CHOI NGAY chu khong xep hang vo han.
 *
 * Vi sao tu choi thay vi xep hang: mot hang doi vo han bien "cham" thanh
 * "treo". Nguoi dung thu that thich nhan loi trong 50ms roi thu lai hon la
 * cho 30 giay khong biet chuyen gi.
 */
export class HashGate {
  private dangChay = 0;
  private dangCho = 0;

  constructor(
    /** So lan bam duoc chay cung luc. */
    private readonly maxConcurrent = 4,
    /**
     * So lan duoc XEP HANG cho toi luot.
     *
     * Khong phai 0: dang nhap that hoan toan binh thuong khi phai cho vai
     * chuc mili giay. Nhung hang doi phai co tran, neu khong thi tran
     * `maxConcurrent` chi doi cho tu "het bo nho" sang "cho vo han".
     */
    private readonly maxQueued = 32,
  ) {}

  /** Chay `fn` trong pham vi cong. Nem `DependencyUnavailableError` khi day. */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.dangChay >= this.maxConcurrent && this.dangCho >= this.maxQueued) {
      throw new DependencyUnavailableError(
        'AUTH_BUSY',
        'He thong dang qua tai, vui long thu lai sau it giay',
      );
    }

    if (this.dangChay >= this.maxConcurrent) {
      this.dangCho += 1;
      try {
        await this.choLuot();
      } finally {
        this.dangCho -= 1;
      }
    }

    this.dangChay += 1;
    try {
      return await fn();
    } finally {
      this.dangChay -= 1;
      this.danhThuc();
    }
  }

  /** Chi dung trong test va cho `/health/ready`. */
  trangThai(): { dangChay: number; dangCho: number } {
    return { dangChay: this.dangChay, dangCho: this.dangCho };
  }

  private readonly hangCho: (() => void)[] = [];

  private choLuot(): Promise<void> {
    return new Promise((resolve) => this.hangCho.push(resolve));
  }

  private danhThuc(): void {
    const tiep = this.hangCho.shift();
    if (tiep) tiep();
  }
}
