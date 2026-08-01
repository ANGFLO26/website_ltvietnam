import { Module } from '@nestjs/common';
import { HealthController } from './presentation/health.controller.js';
import { HealthService } from './application/health.service.js';
import { PostgresHealthAdapter } from './infrastructure/postgres-health.adapter.js';
import { DATABASE_HEALTH_PORT } from './application/ports/database-health.port.js';

/** Chuoi tang: presentation -> application -> port -> infrastructure -> Kysely. */
@Module({
  controllers: [HealthController],
  providers: [{ provide: DATABASE_HEALTH_PORT, useClass: PostgresHealthAdapter }, HealthService],
  exports: [HealthService],
})
export class HealthModule {}
