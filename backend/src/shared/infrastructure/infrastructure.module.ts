import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { loadConfig, type AppConfig } from '@ltv/config';
import { createDb, createPool, type Database } from '@ltv/db';
import type { Kysely } from 'kysely';
import type pg from 'pg';
import { APP_CONFIG, KYSELY_DB, LOGGER, PG_POOL } from './tokens.js';
import { createLogger, type Logger } from './logging/logger.js';
import { KyselyTransactionAdapter } from './database/kysely-transaction.adapter.js';
import { TRANSACTION_PORT } from '../application/transaction.port.js';

/**
 * Tang ha tang — so huu tai nguyen dung chung cua tien trinh.
 *
 * Global de moi module lay duoc ma khong phai import lai.
 * Doc config DUNG MOT LAN, tao DUNG MOT pool. Module nghiep vu KHONG duoc
 * tu goi loadConfig() hay createPool().
 *
 * Thu tu bootstrap (plan 03 muc 1): config -> logging -> pool -> module.
 * `settings` la module runtime doc tu DB, KHONG phai bootstrap config —
 * khong tao canh Config -> Settings -> DB.
 */
@Global()
@Module({
  providers: [
    { provide: APP_CONFIG, useFactory: (): AppConfig => loadConfig() },
    {
      provide: LOGGER,
      useFactory: (cfg: AppConfig): Logger => createLogger(cfg.LOG_LEVEL, { app: 'backend' }),
      inject: [APP_CONFIG],
    },
    {
      provide: PG_POOL,
      useFactory: (cfg: AppConfig): pg.Pool => createPool(cfg),
      inject: [APP_CONFIG],
    },
    {
      provide: KYSELY_DB,
      useFactory: (pool: pg.Pool): Kysely<Database> => createDb(pool),
      inject: [PG_POOL],
    },
    { provide: TRANSACTION_PORT, useClass: KyselyTransactionAdapter },
  ],
  exports: [APP_CONFIG, LOGGER, PG_POOL, KYSELY_DB, TRANSACTION_PORT],
})
export class InfrastructureModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}
  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
