import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { loadConfig, type AppConfig } from '@ltv/config';
import { createDaoRuntime, type DaoRuntime } from './dao/connection.js';
import { APP_CONFIG, DAO_MANAGER, LOGGER } from './shared/tokens.js';
import { createLogger, type Logger } from './shared/logging/logger.js';
import { HEALTH_SERVICE } from './services/health/interface.js';
import { HealthServiceImpl } from './services/health/service.js';
import { HealthController } from './api/public/health.controller.js';

const DAO_RUNTIME = Symbol('DAO_RUNTIME');

/**
 * Ba tang: api -> services -> dao.
 *
 * Tai nguyen dung chung (config, logger, pool, DAO manager) doc/tao DUNG MOT LAN
 * o day. Service khong duoc tu goi loadConfig() hay createPool().
 *
 * Thu tu bootstrap (plan 03 muc 1): config -> logging -> pool -> DAO -> service.
 * `settings` la DAO doc tu DB luc chay, KHONG phai bootstrap config —
 * khong tao canh Config -> Settings -> DB.
 */
@Global()
@Module({
  controllers: [HealthController],
  providers: [
    { provide: APP_CONFIG, useFactory: (): AppConfig => loadConfig() },
    {
      provide: LOGGER,
      useFactory: (cfg: AppConfig): Logger => createLogger(cfg.LOG_LEVEL, { app: 'backend' }),
      inject: [APP_CONFIG],
    },
    {
      provide: DAO_RUNTIME,
      useFactory: (cfg: AppConfig): Promise<DaoRuntime> => createDaoRuntime(cfg),
      inject: [APP_CONFIG],
    },
    { provide: DAO_MANAGER, useFactory: (rt: DaoRuntime) => rt.manager, inject: [DAO_RUNTIME] },
    { provide: HEALTH_SERVICE, useClass: HealthServiceImpl },
  ],
  exports: [APP_CONFIG, LOGGER, DAO_MANAGER],
})
export class AppModule implements OnApplicationShutdown {
  constructor(@Inject(DAO_RUNTIME) private readonly dao: DaoRuntime) {}
  async onApplicationShutdown(): Promise<void> {
    await this.dao.close();
  }
}
