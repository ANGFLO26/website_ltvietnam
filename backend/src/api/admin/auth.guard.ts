import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  SetMetadata,
  type CustomDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AppConfig } from '@ltv/config';
import type { Request } from 'express';
import { APP_CONFIG } from '../../shared/tokens.js';
import { ForbiddenError, UnauthorizedError } from '../../shared/errors.js';
import { AUTH_SERVICE, type AuthService, type Principal } from '../../services/auth/interface.js';
import { readCookie } from './session.cookie.js';

/**
 * Danh dau endpoint KHONG can dang nhap.
 *
 * Vi sao mac dinh la CAN, va mien tru phai go tay: mot endpoint quan tri moi
 * viet ma quen gan guard se mo cong. Mot endpoint cong khai ma quen gan
 * `@Public()` thi chi tra 401 — nguoi ta phat hien ngay va sua trong mot phut.
 * Huong sai le ra la huong on ao, khong phai huong im lang.
 */
export const IS_PUBLIC = 'auth:public';
export const Public = (): CustomDecorator => SetMetadata(IS_PUBLIC, true);

/** Request da qua guard mang theo nguoi goi. */
export interface AuthedRequest extends Request {
  principal?: Principal;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    /**
     * `@Inject(Reflector)` TUONG MINH, khong de Nest tu suy ra tu kieu.
     *
     * Suy ra kieu dua vao sieu du lieu `design:paramtypes` do
     * `emitDecoratorMetadata` cua tsc sinh. Trinh chay phat trien (`tsx`,
     * nhan la esbuild) KHONG phat sieu du lieu do, nen `reflector` thanh
     * `undefined` va MOI yeu cau do voi mot loi kho hieu.
     *
     * Ban bien dich bang tsc thi chay dung — nghia la loi chi xuat hien o
     * che do phat trien, dung noi it duoc kiem nhat. Khai bao tuong minh thi
     * dung o ca hai.
     */
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AUTH_SERVICE) private readonly auth: AuthService,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();

    const token = readCookie(req, this.cfg.COOKIE_NAME);
    if (!token) throw new UnauthorizedError('AUTH_NO_SESSION', 'Chua dang nhap');

    const principal = await this.auth.verifySession(token);
    if (!principal) throw new UnauthorizedError('AUTH_SESSION_INVALID', 'Phien khong hop le');

    this.assertCsrf(req);

    req.principal = principal;
    return true;
  }

  /**
   * CSRF — lop chan THU HAI, sau `SameSite=strict`.
   *
   * Vi sao can ca hai: `SameSite` do TRINH DUYET thuc thi. Trinh duyet cu,
   * mot cau hinh proxy la, hoac mot ngay nao do phai ha xuong `lax` de ho tro
   * mot luong dang nhap — bat ky cai nao trong so do cung lam lop mot bien
   * mat. Lop hai nam trong ma nguon cua ta va khong phu thuoc dieu gi ben ngoai.
   *
   * CHI kiem cho phuong thuc DOI TRANG THAI. `GET` phai di qua duoc: mot the
   * `<img>` tren trang la co the gui `GET` kem cookie, nhung `GET` khong duoc
   * doi gi ca — do la hop dong cua HTTP, va ta giu no.
   */
  private assertCsrf(req: AuthedRequest): void {
    const method = req.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return;

    const fromCookie = readCookie(req, this.cfg.CSRF_COOKIE_NAME);
    const fromHeader = req.headers[this.cfg.CSRF_HEADER_NAME.toLowerCase()];
    const header = Array.isArray(fromHeader) ? fromHeader[0] : fromHeader;

    if (!fromCookie || !header || !timingSafeEqual(fromCookie, header)) {
      throw new ForbiddenError('CSRF_TOKEN_MISMATCH', 'Thieu hoac sai ma CSRF');
    }
  }
}

/**
 * So sanh khong ro ri thoi gian.
 *
 * `===` cua JavaScript thoat ngay o ky tu dau tien khac nhau, nen thoi gian
 * so sanh ti le voi so ky tu dau trung khop. Voi ma CSRF thi kha nang khai
 * thac dieu do rat thap — ke tan cong phai do duoc chenh lech vai nano giay
 * qua mang. Nhung ham nay dai bon dong va bo di khong duoc gi.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
