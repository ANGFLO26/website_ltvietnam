import type { DaoScope } from '../../dao/dao-scope.js';
import type { ResolveResult, RouteResolver } from './interface.js';

export type RedirectDaos = DaoScope<'redirects'>;

/** Tran so chang khi go chuoi. Xem chu thich trong `resolve`. */
const TRAN_CHANG = 5;

export class RouteResolverImpl implements RouteResolver {
  constructor(
    private readonly daos: RedirectDaos,
    private readonly onEvent?: (event: string, fields: Record<string, unknown>) => void,
  ) {}

  async resolve(path: string): Promise<ResolveResult> {
    const chuan = chuanHoa(path);

    let hienTai = chuan;
    let cuoi: { target: string; status: 301 | 302 } | null = null;
    const daQua = new Set<string>([chuan]);

    /**
     * GO CHUOI o duong DOC, du duong GHI da go san.
     *
     * `RedirectDao.createCollapsingChain` bao dam chuoi dai dung MOT chang khi
     * doi slug. Nen vong lap nay le ra chi chay mot lan.
     *
     * Van lam, vi hai duong ghi KHONG di qua ham do: `upsert` va `bulkInsert`
     * (nhap ~200 URL cu tu website cu). Mot lan nhap co the tao `A -> B` khi
     * `B -> C` da ton tai, va khi do khach di HAI chang. Google tinh do la chuoi
     * va giam gia tri truyen qua; qua ba chang thi co the bo qua han. Dung thu
     * bang `redirects` ra doi de giu.
     *
     * Va khi tim thay chuoi, PHAT SU KIEN muc canh bao: chuoi la dau hieu duong
     * GHI da lam sai, va no phai duoc sua o do chu khong phai chiu dung o day.
     */
    for (let i = 0; i < TRAN_CHANG; i += 1) {
      const r = await this.daos.redirects.findActiveBySourceCI(hienTai);
      if (!r) break;

      cuoi = { target: r.targetPath, status: r.redirectType };
      const tiep = chuanHoa(r.targetPath);

      /**
       * VONG LAP: A -> B -> A. `findLoops()` tim duoc chung trong mot lenh kiem
       * dinh ky, nhung o duong nong thi phai tu bao ve — khong duoc de mot ban
       * ghi sai lam treo moi yeu cau.
       *
       * Khi gap vong, tra ve chang DAU TIEN thay vi bo han: mot chuyen huong
       * den dung mot cho van tot hon 404, va trinh duyet tu chan vong.
       */
      if (daQua.has(tiep)) {
        this.onEvent?.('redirect_loop_detected', { path: chuan, at: hienTai });
        break;
      }
      daQua.add(tiep);
      hienTai = tiep;

      if (i > 0) {
        this.onEvent?.('redirect_chain_collapsed', { path: chuan, hops: i + 1 });
      }
    }

    if (!cuoi) return { kind: 'content' };

    /**
     * Dich CUOI CUNG, khong phai dich cua chang dau.
     *
     * `hienTai` la duong dan sau khi go het chuoi. Tra `cuoi.target` (dang thô,
     * chua chuan hoa) de giu dung hinh dang ma nguoi bien tap da nhap — chuan
     * hoa chi dung de TRA CUU, khong dung de tra ve.
     */
    return { kind: 'redirect', status: cuoi.status, target: cuoi.target };
  }
}

/**
 * Chuan hoa duong dan de TRA CUU. Khong dung cho gia tri tra ve.
 *
 *   - bo dau `/` o cuoi: `/a/` va `/a` la cung mot trang. Khong bo thi cung mot
 *     URL cu duoc lien ket hai cach chi chuyen huong duoc mot cach.
 *   - GIU nguyen hoa thuong: `findActiveBySourceCI` lo viec do bang chi muc ham,
 *     nen ha chu o day la lam hai lan.
 *   - duong rong -> `/`
 */
function chuanHoa(path: string): string {
  const p = path.trim();
  if (p === '' || p === '/') return '/';
  return p.replace(/\/+$/, '') || '/';
}
