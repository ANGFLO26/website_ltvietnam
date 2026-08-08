/**
 * Hau to `_SERVICE` la CO Y, va no do mot luat ep.
 *
 * Luat 9 co danh sach TRANG mac dinh tu choi cho nhung gi tang api duoc tiem:
 * `^([A-Z_]+_SERVICE|APP_CONFIG|LOGGER|Reflector|RATE_LIMIT_REGISTRY)$`. Ban dau
 * toi dat ten `ROUTE_RESOLVER` va bai kiem do ngay — dung y muon cua luat.
 *
 * Hai cach sua, va toi chon cach nay:
 *   - them `ROUTE_RESOLVER` vao danh sach trang: dung cho `RATE_LIMIT_REGISTRY`
 *     vi cai do la HA TANG cua tang api, khong phai service nghiep vu.
 *   - theo quy uoc dat ten: dung o day, vi `RouteResolver` DUNG LA mot service
 *     nghiep vu nam trong `services/redirects/`.
 *
 * Ten interface van la `RouteResolver` khong hau to — `Service` o ten interface
 * la tieng on; o ten TOKEN thi no la thong tin cho luat.
 */
export const ROUTE_RESOLVER_SERVICE = Symbol('ROUTE_RESOLVER_SERVICE');

/**
 * KET QUA GIAI DUONG DAN — hop dong voi middleware cua Next.js.
 *
 * Vi sao backend quyet dinh chu khong phai frontend (D11): bang `redirects` la
 * du lieu, va du lieu thuoc backend. Frontend chi GIAO ket qua.
 *
 * Vi sao phai la middleware o phia Next chu khong phai `redirect()` cua App
 * Router: spike P0 da do — `redirect()` phat **307 kem 5.8 KB HTML da render**,
 * con middleware phat **301 dung 18 byte** truoc khi streaming bat dau. 307 sai
 * ngu nghia (tam thoi) va Google khong chuyen gia tri lien ket qua no.
 */
export type ResolveResult =
  | { readonly kind: 'redirect'; readonly status: 301 | 302; readonly target: string }
  | { readonly kind: 'content' };

export interface RouteResolver {
  /**
   * `path` la duong dan DA BO query string (`req.nextUrl.pathname`).
   *
   * Tra ve `content` khi khong co luat nao — KHONG tra `not_found`. Resolver
   * khong biet mot slug co ton tai hay khong, va di tim thi phai truy van moi
   * bang co slug o duong nong cho MOI yeu cau. Trang tu quyet dinh 404 cua no,
   * boi no phai lay du lieu do dang nao.
   */
  resolve(path: string): Promise<ResolveResult>;
}
