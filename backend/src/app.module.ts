import { Module } from '@nestjs/common';
import { InfrastructureModule } from './shared/infrastructure/infrastructure.module.js';
import { HealthModule } from './modules/health/health.module.js';

/**
 * Modular monolith (A1/D1).
 *
 * Module chi giao tiep qua service/query port, khong goi repository cua nhau.
 * `InfrastructureModule` la Global: so huu config, logger, pool va Kysely
 * dung mot lan cho ca tien trinh.
 *
 * B0 chi co health. Module nghiep vu them theo tung phase (B2 tro di).
 */
@Module({ imports: [InfrastructureModule, HealthModule] })
export class AppModule {}
