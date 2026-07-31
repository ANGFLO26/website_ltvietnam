import { Module } from '@nestjs/common';
import { loadConfig } from '@ltv/config';
import { createPool } from '@ltv/db';
import type pg from 'pg';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

export const PG_POOL = Symbol('PG_POOL');

@Module({
  controllers: [HealthController],
  providers: [
    { provide: PG_POOL, useFactory: (): pg.Pool => createPool(loadConfig()) },
    {
      provide: HealthService,
      useFactory: (pool: pg.Pool) => new HealthService(pool),
      inject: [PG_POOL],
    },
  ],
  exports: [HealthService],
})
export class HealthModule {}
