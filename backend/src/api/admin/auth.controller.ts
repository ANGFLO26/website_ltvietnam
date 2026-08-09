import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
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
import {
  toUserIdentityView,
  toUserView,
  type UserIdentityView,
  type UserView,
} from '../dto/user.view.js';
import { Public, type AuthedRequest } from './auth.guard.js';
import { RateLimit, type RateLimitedRequest } from './rate-limit.guard.js';
import { RATE_LIMIT_REGISTRY, type RateLimitRegistry } from './rate-limit.registry.js';
import {
  NOTIFICATION_SERVICE,
  type NotificationService,
} from '../../services/notifications/interface.js';
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
    @Inject(RATE_LIMIT_REGISTRY) private readonly rateLimits: RateLimitRegistry,
    @Inject(NOTIFICATION_SERVICE) private readonly notifications: NotificationService,
  ) {}

  /**
   * The phien di vao COOKIE, khong vao than phan hoi.
   *
   * Tra the trong JSON buoc giao dien tu luu no — va cho luu duy nhat ma
   * JavaScript truy cap duoc la `localStorage` hoac bien trong bo nho. Ca hai
   * deu doc duoc boi ma XSS. Cookie `HttpOnly` thi khong.
   */
  /**
   * Han muc TRUOC ham bam — HAI con so KHAC nhau cho hai moi de doa.
   *
   *   theo EMAIL : 5 / 15 phut   — chan do mat khau cua MOT tai khoan
   *   theo IP     : 30 / 15 phut  — chan doi tai nguyen tu mot nguon
   *
   * Ban dau toi dat ca hai bang 5, va phep do bat duoc hau qua: sau khi bi
   * doi, mot nguoi dung go DUNG mat khau van nhan 429. Ly do la ke doi va
   * nguoi dung dung chung mot IP — tinh huong that voi mot van phong sau NAT.
   *
   * Hai con so khac nhau vi hai muc dich khac nhau:
   *   - do mat khau mot tai khoan can NHIEU lan tren CUNG email -> chan chat
   *     theo email la du, va no khong lam kho ai
   *   - doi tai nguyen dung email khac nhau moi lan -> chan theo IP, nhung
   *     phai rong de mot van phong 10 nguoi khong bi khoa lan nhau
   *
   * Dat ca hai bang 5 la lay con so cua moi de doa thu nhat roi ap cho ca hai.
   *
   * `doc/06` ghi "5/15'/IP". Toi CO Y lech khoi con so do: no gop hai moi de
   * doa thanh mot. Tang han muc IP KHONG lam yeu di viec chan do mat khau, vi
   * viec do da co han muc email lo — va `HashGate` moi la thu bao ve tai
   * nguyen that su, khong phu thuoc IP nao.
   */
  @Public()
  @RateLimit({
    limit: 30,
    windowMs: 15 * 60_000,
    byIp: true,
    byBodyField: 'email',
    bodyFieldLimit: 5,
  })
  @Post('login')
  async login(
    @Body() body: unknown,
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserIdentityView> {
    const dto = parse(loginSchema, body);

    const result = await this.authService.login({
      email: dto.email,
      password: dto.password,
      ip: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });

    /**
     * Dang nhap THANH CONG -> xoa bo dem.
     *
     * Nho dong nay, han muc khong phai "5 lan dang nhap moi 15 phut" ma la
     * "5 lan THAT BAI lien tiep". Nguoi dung binh thuong khong bao gio cham
     * toi; ke doi thi cham ngay o lan thu sau.
     */
    const rl = req as RateLimitedRequest;
    if (rl.rateLimitRoute && rl.rateLimitKeys) {
      this.rateLimits.reset(rl.rateLimitRoute, rl.rateLimitKeys);
    }

    setSessionCookie(res, this.cfg, result.token, result.ttlSeconds);
    setCsrfCookie(res, this.cfg, randomBytes(32).toString('base64url'), result.ttlSeconds);

    // Ghi log CO chu the, KHONG co mat khau va KHONG co the.
    this.log.info('auth_login_ok', { user_id: result.user.id });

    /**
     * Tra ve TAI NGUYEN, khong tra ve vo.
     *
     * `EnvelopeInterceptor` boc thanh `{ "data": { "id": ... } }`. Ban truoc
     * tra `{ user: result.user }`, va qua vo se thanh `{ data: { user: {...} } }`
     * — mot lop long them khong noi gi. Voi endpoint tra ve MOT tai nguyen thi
     * `data` CHINH LA tai nguyen do; Luat 10a chan viec quay lai kieu cu.
     */
    return toUserIdentityView(result.user);
  }

  /**
   * Dang xuat luon THANH CONG, ke ca khi chua dang nhap.
   *
   * Khong co gi de bao ve o day, va tra loi cho mot yeu cau dang xuat chi lam
   * giao dien phai xu ly them mot nhanh. Ket qua mong muon — "phien nay khong
   * con" — dung o ca hai truong hop.
   */
  /**
   * `204 No Content` chu khong phai `200 { ok: true }`.
   *
   * `{ ok: true }` la mot than gia: no khong mang thong tin nao ma ma HTTP
   * chua noi. Va no bat frontend phai chon doc `res.ok` hay `body.data.ok` —
   * hai nguon cho cung mot su that, nen som muon co cho doc nguon sai.
   *
   * Ba endpoint con lai (`change-password`, `reset-password`,
   * `forgot-password`) cung the: chung lam mot viec roi khong co gi de ke.
   * `Promise<void>` cung la cach `EnvelopeInterceptor` biet KHONG boc — xem
   * chu thich `boc()` ve vi sao khong the doc `res.statusCode`.
   */
  @Public()
  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    clearSessionCookie(res, this.cfg);
    clearCsrfCookie(res, this.cfg);
  }

  @Get('me')
  async me(@Req() req: AuthedRequest): Promise<UserView> {
    // Guard da dat `principal`; toi day chac chan co.
    const user = await this.userService.findById(req.principal!.userId);
    /**
     * Guard da kiem the va the mang `userId` cua mot nguoi dung CON HOAT DONG.
     * Khong tim thay o day nghia la tai khoan bi xoa ngay giua hai buoc — mot
     * cuoc dua that, du hep. Tra 401 chu khong 500: phien khong con hop le nua,
     * va do la dieu nguoi goi can biet.
     */
    if (!user)
      throw new DomainError('AUTH_SESSION_EXPIRED', 'Phien khong con hop le', 'UNAUTHORIZED');
    return toUserView(user);
  }

  @Post('change-password')
  @HttpCode(204)
  async changePassword(
    @Body() body: unknown,
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
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
  }

  /**
   * Luon tra ve CUNG mot phan hoi, du email co ton tai hay khong.
   *
   * Neu tra 404 cho email khong co thi form "quen mat khau" tro thanh cong cu
   * kiem tra email nao dang ky trong he thong.
   */
  /**
   * Endpoint nay ky mot the va (o F5) se gui mot email — ca hai deu dat.
   *
   * HAI con so, cung ly do voi `login` — va day la mot loi toi de sot o F-1a.
   *
   * F-1a tach han muc IP khoi han muc email cho `login`, roi de nguyen
   * `forgot-password` voi ca hai bang 3. Phep thu tren HTTP that bat duoc:
   * ba yeu cau tu MOT IP voi BA email khac nhau la het han muc, nen nguoi thu
   * tu trong mot van phong sau NAT khong the dat lai mat khau, va thong bao
   * bao ho cho 15 phut. Toi da sua dung y do o mot endpoint roi khong hoi
   * "con endpoint nao cung the khong".
   *
   *   theo EMAIL : 3 / 15 phut   — chan viec doi thu gui lien tuc email dat
   *                                lai vao hom thu cua MOT nguoi
   *   theo IP     : 10 / 15 phut — chan dung phi email va uy tin ten mien,
   *                                nhung du rong cho mot van phong
   *
   * Khong xoa bo dem khi "thanh cong": endpoint nay luon tra 204 du email co
   * that hay khong (de khong lo email nao da dang ky), nen khong co tin hieu
   * nao chung to nguoi goi la nguoi that.
   */
  @Public()
  @RateLimit({
    limit: 10,
    windowMs: 15 * 60_000,
    byIp: true,
    byBodyField: 'email',
    bodyFieldLimit: 3,
  })
  @Post('forgot-password')
  @HttpCode(204)
  async forgotPassword(@Body() body: unknown): Promise<void> {
    const dto = parse(forgotPasswordSchema, body);
    const result = await this.authService.requestPasswordReset(dto.email);

    if (result) {
      // Job duoc commit truoc khi worker cham SMTP; token khong di qua log.
      try {
        await this.notifications.enqueuePasswordReset(result.email, result.token);
      } catch {
        // Van tra 204 de loi queue khong tro thanh cach liet ke email ton tai.
        // Khong ghi email, token hay message goc cua loi vao log.
        this.log.error('auth_reset_email_enqueue_failed', { user_id: result.userId });
      }
    }
  }

  @Public()
  @RateLimit({ limit: 10, windowMs: 15 * 60_000, byIp: true })
  @Post('reset-password')
  @HttpCode(204)
  async resetPassword(@Body() body: unknown): Promise<void> {
    const dto = parse(resetPasswordSchema, body);
    await this.authService.resetPassword({ token: dto.token, newPassword: dto.new_password });
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
  // Bam mat khau, nen phai co han muc — du `bootstrapFirstAdmin` da tu choi
  // truoc khi bam khi da co tai khoan.
  @Public()
  @RateLimit({ limit: 5, windowMs: 60 * 60_000, byIp: true })
  @Post('bootstrap')
  async bootstrap(@Body() body: unknown): Promise<UserView> {
    const dto = parse(bootstrapAdminSchema, body);
    const user = await this.userService.bootstrapFirstAdmin({
      name: dto.name,
      email: dto.email,
      password: dto.password,
    });
    this.log.warn('auth_bootstrap_admin_created', { user_id: user.id, email: user.email });
    return toUserView(user);
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
