import { Controller, Get, HttpCode, Inject, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HEALTH_SERVICE, type HealthService } from '../../services/health/interface.js';

/**
 * Tang API chi phu thuoc INTERFACE cua service, khong phu thuoc cai dat.
 * Khong biet gi ve DAO, ve Kysely, ve SQL.
 */
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
