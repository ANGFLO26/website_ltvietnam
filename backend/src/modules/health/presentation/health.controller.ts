import { Controller, Get, HttpCode, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HealthService } from '../application/health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** Public. Khong lo bat ky chi tiet noi bo nao. */
  @Get('live')
  @HttpCode(200)
  live() {
    return this.health.live();
  }

  /**
   * Noi bo. Proxy dung endpoint nay lam probe traffic.
   * Khong tra ten database, host SMTP, phien ban noi bo hay stack trace.
   */
  @Get('ready')
  async ready(@Res({ passthrough: true }) res: Response) {
    const result = await this.health.ready();
    res.status(result.status === 'ok' ? 200 : 503);
    return result;
  }
}
