import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';

/**
 * Modular monolith (A1/D1).
 * Module chi giao tiep qua service/query port, khong goi repository cua nhau.
 * P0 chi co health; cac module nghiep vu duoc them theo tung phase.
 */
@Module({ imports: [HealthModule] })
export class AppModule {}
