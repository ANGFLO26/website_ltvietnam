import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_HEALTH_PORT, type DatabaseHealthPort } from './ports/database-health.port.js';

export type ReadinessState = 'ok' | 'unavailable';

export interface CoreReadiness {
  readonly status: ReadinessState;
  readonly checks: { readonly config: boolean; readonly database: boolean };
}

/**
 * Readiness Model B (FV-02 / plan 03 muc 2) — TANG UNG DUNG.
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
export class HealthService {
  constructor(@Inject(DATABASE_HEALTH_PORT) private readonly database: DatabaseHealthPort) {}

  /** Liveness: chi tra loi song, khong cham phu thuoc nao. */
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /** Core readiness: cau hinh + mot truy van PostgreSQL toi thieu. */
  async ready(): Promise<CoreReadiness> {
    const config = true; // da xac thuc luc khoi dong
    const database = await this.database.canServeMinimalQuery();
    return { status: config && database ? 'ok' : 'unavailable', checks: { config, database } };
  }
}
