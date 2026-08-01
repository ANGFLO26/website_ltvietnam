import { Inject, Injectable } from '@nestjs/common';
import type { DaoPing } from '../../dao/dao-manager.js';
import { DAO_MANAGER } from '../../shared/tokens.js';
import type { CoreReadiness, HealthService } from './interface.js';

/**
 * Readiness Model B (FV-02 / plan 03 muc 2).
 *
 * `/health/ready` CHI kiem cau hinh bootstrap va PostgreSQL.
 * TUYET DOI khong kiem storage, SMTP, worker, outbox backlog, CDN, media processor.
 *
 * Ly do: gan readiness loi voi SMTP thi khi SMTP chet, proxy rut Nest khoi
 * traffic, keo theo POST /inquiries chet — mat lead vi loi email, dung thu ma
 * ADR-003 sinh ra de chong. Bao phu cho storage/worker nam o hai endpoint rieng:
 * /health/ready/media (B3) va /health/worker (B7).
 */
@Injectable()
export class HealthServiceImpl implements HealthService {
  constructor(@Inject(DAO_MANAGER) private readonly daos: DaoPing) {}

  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  async ready(): Promise<CoreReadiness> {
    const config = true; // da xac thuc luc khoi dong
    const database = await this.daos.ping();
    return { status: config && database ? 'ok' : 'unavailable', checks: { config, database } };
  }
}
