import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';
import { PostgresHealthAdapter } from './adapters/postgres-health.adapter.js';
import { DATABASE_HEALTH_PORT } from './ports/database-health.port.js';

/**
 * Module health.
 *
 * Rang buoc tang: controller -> service -> port -> adapter -> pg.
 * Khong tang nao nhay coc; doi adapter khong cham vao service.
 */
@Module({
  controllers: [HealthController],
  providers: [{ provide: DATABASE_HEALTH_PORT, useClass: PostgresHealthAdapter }, HealthService],
  exports: [HealthService],
})
export class HealthModule {}
