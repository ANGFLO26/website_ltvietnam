import { Body, Controller, Get, Inject, Post, Req, Res } from '@nestjs/common';
import type { AppConfig } from '@ltv/config';
import type { Response } from 'express';
import { randomBytes } from 'node:crypto';
import type { ZodType } from 'zod';
import { APP_CONFIG, LOGGER } from '../../shared/tokens.js';
import type { Logger } from '../../shared/logging/logger.js';
import { DomainError } from '../../shared/errors.js';
import { AUTH_SERVICE, type AuthService } from '../../services/auth/interface.js';
import { USER_SERVICE, type UserService } from '../../services/users/interface.js';
import {
  bootstrapAdminSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from '../dto/auth.dto.js';
import { Public, type AuthedRequest } from './auth.guard.js';
import {
  clearCsrfCookie,
  clearSessionCookie,
  setCsrfCookie,
  setSessionCookie,
} from './session.cookie.js';

@Controller('auth')
export class AuthController {
  constructor(
    /**
     * Ten bien mang hau to `Service` la CO Y.
     *
     * Ban truoc dat la `users`, va `this.users.findById(...)` doc y nhu mot
     * DAO — trung khuon `this.daos.users.findById(...)` o tang duoi. Nguoi
     * doc phai mo file khac de biet day la service hay DAO, dung o cho ranh
     * gioi quan trong nhat cua kien truc. Kieu du lieu noi that, nhung ten
     * bien noi nguoc lai, va nguoi ta doc ten truoc.
     */
    @Inject(AUTH_SERVICE) private readonly authService: AuthService,
    @Inject(USER_SERVICE) private readonly userService: UserService,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
    @Inject(LOGGER) private readonly log: Logger,
  ) {}

  /**
   * The phien di vao COOKIE, khong vao than phan hoi.
   *
   * Tra the trong JSON buoc giao dien tu luu no — va cho luu duy nhat ma
   * JavaScript truy cap duoc la `localStorage` hoac bien trong bo nho. Ca hai
   * deu doc duoc boi ma XSS. Cookie `HttpOnly` thi khong.
   */
  @Public()
  @Post('login')
  async login(
    @Body() body: unknown,
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: unknown }> {
    const dto = parse(loginSchema, body);

    const result = await this.authService.login({
      email: dto.email,
      password: dto.password,
      ip: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });

    setSessionCookie(res, this.cfg, result.token, result.ttlSeconds);
    setCsrfCookie(res, this.cfg, randomBytes(32).toString('base64url'), result.ttlSeconds);

    // Ghi log CO chu the, KHONG co mat khau va KHONG co the.
    this.log.info('auth_login_ok', { user_id: result.user.id });
    return { user: result.user };
  }

  /**
   * Dang xuat luon tra ve 200, ke ca khi chua dang nhap.
   *
   * Khong co gi de bao ve o day, va tra loi cho mot yeu cau dang xuat chi lam
   * giao dien phai xu ly them mot nhanh. Ket qua mong muon — "phien nay khong
   * con" — dung o ca hai truong hop.
   */
  @Public()
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response): { ok: true } {
    clearSessionCookie(res, this.cfg);
    clearCsrfCookie(res, this.cfg);
    return { ok: true };
  }

  @Get('me')
  async me(@Req() req: AuthedRequest): Promise<{ user: unknown }> {
    // Guard da dat `principal`; toi day chac chan co.
    const user = await this.userService.findById(req.principal!.userId);
    return { user };
  }

  @Post('change-password')
  async changePassword(
    @Body() body: unknown,
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const dto = parse(changePasswordSchema, body);
    await this.authService.changePassword({
      userId: req.principal!.userId,
      currentPassword: dto.current_password,
      newPassword: dto.new_password,
    });

    /**
     * Xoa cookie NGAY sau khi doi mat khau.
     *
     * Doi mat khau thu hoi moi phien, KE CA phien dang goi. Neu khong xoa
     * cookie thi trinh duyet van gui cai the da chet o yeu cau tiep theo, va
     * nguoi dung nhan 401 giua chung ma khong hieu tai sao. Xoa o day bien
     * dieu do thanh "bi dua ve man hinh dang nhap" — dung ky vong.
     */
    clearSessionCookie(res, this.cfg);
    clearCsrfCookie(res, this.cfg);
    this.log.info('auth_password_changed', { user_id: req.principal!.userId });
    return { ok: true };
  }

  /**
   * Luon tra ve CUNG mot phan hoi, du email co ton tai hay khong.
   *
   * Neu tra 404 cho email khong co thi form "quen mat khau" tro thanh cong cu
   * kiem tra email nao dang ky trong he thong.
   */
  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() body: unknown): Promise<{ ok: true }> {
    const dto = parse(forgotPasswordSchema, body);
    const result = await this.authService.requestPasswordReset(dto.email);

    if (result) {
      /**
       * CHUA gui email — hang doi email la B7 (`inquiry_outbox` + worker).
       *
       * Tam thoi ghi vao log de con duong nay chay duoc tren may ca nhan.
       * The dat lai co han 30 phut va ky bang bi mat rieng, nhung MOT THE
       * NAM TRONG LOG VAN LA MOT THE. Truoc khi len that phai:
       *   1. noi vao hang doi email, va
       *   2. bo dong log nay.
       * `assertProductionSafe` chua chan duoc dieu nay — no la viec cua B7.
       */
      this.log.warn('auth_reset_token_logged_dev_only', {
        user_id: result.userId,
        token: result.token,
      });
    }
    return { ok: true };
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() body: unknown): Promise<{ ok: true }> {
    const dto = parse(resetPasswordSchema, body);
    await this.authService.resetPassword({ token: dto.token, newPassword: dto.new_password });
    return { ok: true };
  }

  /**
   * Tao quan tri vien DAU TIEN — chi chay duoc khi chua co tai khoan nao.
   *
   * Ban khoi tao co y khong tao tai khoan: mat khau co dinh trong seed nam
   * trong ma nguon, trong lich su git, va trong moi ban sao cua kho ma.
   *
   * Endpoint nay cong khai, nhung `bootstrapFirstAdmin` tu choi khi da co
   * tai khoan — nen no chi mo dung mot lan, luc kho du lieu con trong.
   */
  @Public()
  @Post('bootstrap')
  async bootstrap(@Body() body: unknown): Promise<{ user: unknown }> {
    const dto = parse(bootstrapAdminSchema, body);
    const user = await this.userService.bootstrapFirstAdmin({
      name: dto.name, email: dto.email, password: dto.password,
    });
    this.log.warn('auth_bootstrap_admin_created', { user_id: user.id, email: user.email });
    return { user };
  }
}

/**
 * Doi loi cua zod thanh `DomainError` de exception filter dich sang 422.
 *
 * Tra ve DANH SACH truong sai chu khong dung o cai dau tien — cung ly do voi
 * `PublishService`: sua mot vong roi bam lai, thay them mot loi nua, la trai
 * nghiem lam nguoi dung bo cuoc.
 */
function parse<T>(schema: ZodType<T>, body: unknown): T {
  const r = schema.safeParse(body);
  if (r.success) return r.data;
  throw new DomainError('VALIDATION_FAILED', 'Du lieu gui len khong hop le', 'VALIDATION_FAILED', {
    fields: r.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
  });
}
