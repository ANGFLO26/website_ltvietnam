import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { loadConfig, type AppConfig } from '@ltv/config';
import { createPool } from '@ltv/db';
import type pg from 'pg';
import { APP_CONFIG, PG_POOL } from './tokens.js';

/**
 * Tang ha tang — so huu tai nguyen dung chung cua tien trinh.
 *
 * Global de moi module lay duoc mà khong phai import lai. Doc config DUNG MOT
 * LAN va tao DUNG MOT pool; module nghiep vu khong duoc tu goi loadConfig()
 * hay createPool() (plan 03 muc 1: config -> logging -> pool -> module).
 */
@Global()
@Module({
  providers: [
    { provide: APP_CONFIG, useFactory: (): AppConfig => loadConfig() },
    {
      provide: PG_POOL,
      useFactory: (cfg: AppConfig): pg.Pool => createPool(cfg),
      inject: [APP_CONFIG],
    },
  ],
  exports: [APP_CONFIG, PG_POOL],
})
export class InfrastructureModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}
  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
