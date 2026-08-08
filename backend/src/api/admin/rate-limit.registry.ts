import { Injectable } from '@nestjs/common';
import { SlidingWindowLimiter } from '../../shared/rate-limit.js';

export const RATE_LIMIT_REGISTRY = Symbol('RATE_LIMIT_REGISTRY');

/**
 * Noi giu cac bo dem gioi han toc do, DUNG CHUNG giua guard va controller.
 *
 * Vi sao phai tach ra khoi guard:
 *
 * Guard chan TRUOC khi xu ly, nen no khong biet ket qua. Nhung "dang nhap
 * thanh cong" PHAI xoa bo dem, va day khong phai chi tiet nho — thieu no thi
 * han muc 5 lan / 15 phut ap cho ca mot dia chi IP, va mot van phong 10 nguoi
 * sau cung mot NAT chia nhau 5 lan dang nhap moi 15 phut.
 *
 * Do la dieu toi phat hien khi DO ket qua ban va, khong phai khi viet no:
 * 200 yeu cau rac tu cung mot IP -> 195 bi chan, dung y muon; nhung phep do
 * do cung cho thay moi yeu cau HOP LE tu IP do cung se bi chan nhu vay.
 *
 * Voi bo dem duoc xoa khi thanh cong, y nghia doi han: khong con la "5 lan
 * dang nhap moi 15 phut" ma la "5 lan THAT BAI LIEN TIEP", va nguoi dung binh
 * thuong khong bao gio cham toi.
 */
@Injectable()
export class RateLimitRegistry {
  private readonly limiters = new Map<string, SlidingWindowLimiter>();

  /** Lay (hoac tao) bo dem cho mot route. */
  forRoute(routeKey: string, limit: number, windowMs: number): SlidingWindowLimiter {
    let l = this.limiters.get(routeKey);
    if (!l) {
      l = new SlidingWindowLimiter(limit, windowMs);
      this.limiters.set(routeKey, l);
    }
    return l;
  }

  /**
   * Xoa bo dem cua mot route theo cac khoa da dung.
   *
   * Nhan danh sach khoa chu khong phai mot khoa: mot yeu cau bi tinh vao
   * NHIEU bo dem (theo IP va theo email), nen thanh cong phai xoa het. Xoa
   * mot cai thi cai kia van tich luy, va nguoi dung dang nhap dung van bi
   * chan sau vai lan.
   */
  reset(routeKey: string, keys: readonly string[]): void {
    /**
     * Xoa o MOI bo dem cua route nay.
     *
     * Mot route co the co HAI bo dem — mot cho han muc IP, mot cho han muc
     * email — vi hai chieu dung hai con so khac nhau. Khoa cua bo dem la
     * `${routeKey}#${han}`, nen phai quet theo tien to chu khong tra cuu
     * dung mot khoa. Xoa mot bo dem thi chieu con lai van tich luy, va
     * nguoi dung dang nhap dung van bi chan sau vai lan.
     */
    for (const [k, l] of this.limiters) {
      if (k === routeKey || k.startsWith(`${routeKey}#`)) {
        for (const key of keys) l.reset(key);
      }
    }
  }

  /** Chi dung trong test. */
  clearAll(): void {
    this.limiters.clear();
  }
}
