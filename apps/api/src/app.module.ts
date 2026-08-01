import { Module } from '@nestjs/common';
import { InfrastructureModule } from './infrastructure/infrastructure.module.js';
import { HealthModule } from './health/health.module.js';

/**
 * Modular monolith (A1/D1).
 *
 * Module chi giao tiep qua service/query port, khong goi repository cua nhau.
 * `InfrastructureModule` la Global: no so huu config va pool dung mot lan cho
 * ca tien trinh; module nghiep vu khong duoc tu tao tai nguyen nay.
 *
 * P0 chi co health; module nghiep vu duoc them theo tung phase (P2 tro di).
 */
@Module({ imports: [InfrastructureModule, HealthModule] })
export class AppModule {}
