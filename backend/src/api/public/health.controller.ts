import { Controller, Get, HttpCode, Inject, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HEALTH_SERVICE, type HealthService } from '../../services/health/interface.js';
import { Public } from '../admin/auth.guard.js';
import { NoEnvelope } from '../../shared/http/envelope.js';

/**
 * Tang API chi phu thuoc INTERFACE cua service, khong phu thuoc cai dat.
 * Khong biet gi ve DAO, ve Kysely, ve SQL.
 */
/**
 * `@Public()` o cap LOP — probe khong the mang cookie.
 *
 * Guard dang ky toan cuc nen mac dinh moi endpoint deu can dang nhap. Health
 * la ngoai le BAT BUOC: trinh dieu phoi goi `/health/live` de biet tien trinh
 * con song, va no khong co phien nao ca. Quen `@Public()` o day thi probe
 * nhan 401, trinh dieu phoi ket luan ung dung chet, va GIET no — mot vong lap
 * khoi dong lai vinh vien ma ung dung thi hoan toan khoe manh.
 *
 * Loi nay da xay ra that o lan chay dau: `/health/live` tra 401.
 */
/**
 * `@NoEnvelope()` — health nam NGOAI hop dong `/api/v1`.
 *
 * `main.ts` loai `health/live` va `health/ready` khoi tien to `/api/v1`, nen
 * chung khong phai API cua frontend. Nguoi tieu thu la trinh dieu phoi
 * (Docker/Kubernetes/proxy) va no doc MA HTTP; boc `{ data: ... }` chi lam
 * nguoi go `curl /health/ready` phai dao them mot lop de xem `status`.
 *
 * Luat 10c gioi han decorator nay trong mot danh sach trang tuong minh, de no
 * khong tro thanh duong thoat cho endpoint nao thay vo bat tien.
 */
@NoEnvelope()
@Public()
@Controller('health')
export class HealthController {
  constructor(@Inject(HEALTH_SERVICE) private readonly health: HealthService) {}

  /** Public. Khong lo bat ky chi tiet noi bo nao. */
  @Get('live')
  @HttpCode(200)
  live() {
    return this.health.live();
  }

  /** Noi bo. Proxy dung endpoint nay lam probe traffic. */
  @Get('ready')
  async ready(@Res({ passthrough: true }) res: Response) {
    const result = await this.health.ready();
    res.status(result.status === 'ok' ? 200 : 503);
    return result;
  }
}
