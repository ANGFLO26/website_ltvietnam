import { describe, expect, it } from 'vitest';
import { TtlCache } from '../src/shared/cache.js';

/**
 * `TtlCache` — bai kiem KHONG dung dong ho that.
 *
 * `lay()` nhan `now` lam tham so thu ba chinh vi ly do nay: mot bai kiem het han
 * dua vao `setTimeout` phai NGU that, va mot bai kiem ngu la mot bai kiem se bi ai
 * do bo di khi bo test cham. Tiem thoi gian thi phep kiem chay tuc thi va do dung
 * dieu no noi.
 */
describe('TtlCache', () => {
  it('lan dau tinh, lan hai lay lai — ham chi chay MOT lan', async () => {
    const c = new TtlCache(1000);
    let goi = 0;
    const f = async (): Promise<number> => {
      goi += 1;
      return 7;
    };
    expect(await c.lay('k', f, 0)).toBe(7);
    expect(await c.lay('k', f, 500)).toBe(7);
    expect(goi).toBe(1);
    expect(c.stats()).toEqual({ hit: 1, miss: 1 });
  });

  it('qua TTL thi tinh lai', async () => {
    const c = new TtlCache(1000);
    let n = 0;
    const f = async (): Promise<number> => {
      n += 1;
      return n;
    };
    expect(await c.lay('k', f, 0)).toBe(1);
    // Dung `1000` chu khong `1001`: `hetHanLuc > now` la dieu kien CON hieu luc,
    // nen dung moc het han la HET, khong phai con.
    expect(await c.lay('k', f, 1000)).toBe(2);
  });

  it('khoa khac nhau khong dam nhau', async () => {
    const c = new TtlCache(1000);
    expect(await c.lay('a', async () => 1, 0)).toBe(1);
    expect(await c.lay('b', async () => 2, 0)).toBe(2);
    expect(await c.lay('a', async () => 99, 0)).toBe(1);
  });

  /**
   * BAI KIEM NAY DA BI XOA, va ly do dang ghi lai.
   *
   * Ban dau o day co `it('tran so khoa: bo muc HET HAN truoc')`, dua tren mot cau
   * toi viet trong `cache.ts`: "khong don muc het han thi tran se bo mot khoa CON
   * HIEU LUC de nhuong cho rac".
   *
   * Phep tiem loi (`scripts/inject-f4.mjs`) cho thay bai kiem do RONG: bo han vong
   * don muc het han di thi no VAN XANH. Va khi tim hieu tai sao thi cau noi tren
   * hoa ra SAI: TTL la mot con so duy nhat cho ca cache, nen thu tu het han luon
   * trung thu tu chen, va vong `while` (bo tu dau `Map`) da bo dung cai het han som
   * nhat roi. Khong ton tai truong hop no mo ta.
   *
   * Nen thay vi sua bai kiem cho no "do duoc", toi xoa no va giu lai phep kiem
   * duoi — cai do dung MOT bao dam co that va quan sat duoc: vuot tran thi khoa CU
   * NHAT bi bo, va khoa MOI NHAT con lai.
   */
  it('tran so khoa: khoa CU NHAT bi bo, khoa MOI NHAT con lai', async () => {
    const c = new TtlCache(10_000, 3);
    for (const k of ['a', 'b', 'c', 'd', 'e']) await c.lay(k, async () => k, 0);
    /**
     * Khong co API doc so khoa (co y — no khong phai mot phan hop dong). Do gian
     * tiep: `a` la khoa cu nhat nen no phai da bi bo, tuc lay lai `a` la mot MISS
     * va ham duoc goi lai.
     */
    let goiLai = 0;
    await c.lay(
      'a',
      async () => {
        goiLai += 1;
        return 'a';
      },
      0,
    );
    expect(goiLai).toBe(1);

    /**
     * Nua thu hai, va no bat mot loi KHAC: neu tran duoc ep SAU khi ghi (hoac vong
     * `while` bo ca khoa vua ghi) thi `e` da bien mat. Chi kiem "a bi bo" thoi thi
     * mot cai tran bo SACH cache moi lan cham nguong van xanh — va cache do khong
     * bao gio dung duoc gi.
     */
    let goiLaiE = 0;
    expect(
      await c.lay(
        'e',
        async () => {
          goiLaiE += 1;
          return 'khac';
        },
        0,
      ),
    ).toBe('e');
    expect(goiLaiE, 'khoa moi nhat phai con trong cache').toBe(0);
  });

  it('`clear()` xoa ca du lieu va thong ke', async () => {
    const c = new TtlCache(1000);
    await c.lay('k', async () => 1, 0);
    await c.lay('k', async () => 1, 0);
    expect(c.stats().hit).toBe(1);
    c.clear();
    expect(c.stats()).toEqual({ hit: 0, miss: 0 });
    let goi = 0;
    await c.lay(
      'k',
      async () => {
        goi += 1;
        return 1;
      },
      0,
    );
    expect(goi).toBe(1);
  });

  /**
   * Loi tu ham tinh KHONG duoc luu vao cache.
   *
   * Neu luu thi mot loi tam thoi (database chop mat mot giay) se bi giu lai ca TTL,
   * va trang chu tra loi trong 60 giay vi mot su co keo dai mot giay.
   */
  it('ham tinh nem loi thi khong luu gi', async () => {
    const c = new TtlCache(1000);
    await expect(
      c.lay(
        'k',
        async () => {
          throw new Error('vo');
        },
        0,
      ),
    ).rejects.toThrow('vo');
    expect(await c.lay('k', async () => 5, 0)).toBe(5);
  });
});
