import { Injectable } from '@nestjs/common';
import type pg from 'pg';

export type ReadinessState = 'ok' | 'degraded' | 'unavailable';

export interface CoreReadiness {
  readonly status: ReadinessState;
  readonly checks: { readonly config: boolean; readonly database: boolean };
}

/**
 * Readiness Model B (FV-02 / plan 03 muc 2).
 *
 * `/health/ready` CHI kiem cau hinh bootstrap va PostgreSQL.
 * TUYET DOI khong kiem storage, SMTP, worker, outbox backlog, CDN hay media processor.
 *
 * Ly do: neu gan readiness loi voi SMTP, khi SMTP chet thi proxy rut Nest khoi
 * traffic, keo theo POST /inquiries chet — tuc la mat lead vi loi email, dung
 * thu ma ADR-003 sinh ra de chong. Bao phu cho storage/worker nam o hai endpoint
 * rieng: /health/ready/media va /health/worker.
 */
@Injectable()
export class HealthService {
  constructor(private readonly pool: pg.Pool) {}

  /** Liveness: chi tra loi song, khong cham phu thuoc nao. */
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /** Core readiness: cau hinh + mot truy van PostgreSQL toi thieu. */
  async ready(): Promise<CoreReadiness> {
    let database = false;
    try {
      const res = await this.pool.query('SELECT 1 AS ok');
      database = res.rows[0]?.ok === 1;
    } catch {
      database = false;
    }
    // Cau hinh da duoc xac thuc luc khoi dong; toi day chac chan hop le.
    const config = true;
    return { status: database && config ? 'ok' : 'unavailable', checks: { config, database } };
  }
}
