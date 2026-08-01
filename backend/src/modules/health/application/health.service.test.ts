import { describe, expect, it } from 'vitest';
import { HealthService } from './health.service.js';
import type { DatabaseHealthPort } from './ports/database-health.port.js';

/**
 * Phan thuong cua viec tach port: kiem thu HealthService KHONG can database,
 * khong can Kysely, khong can container.
 */
const fakeDb = (healthy: boolean): DatabaseHealthPort => ({
  canServeMinimalQuery: async () => healthy,
});

describe('HealthService — Readiness Model B', () => {
  it('live() khong cham phu thuoc nao', () => {
    const explodes: DatabaseHealthPort = {
      canServeMinimalQuery: async () => {
        throw new Error('live() KHONG duoc cham database');
      },
    };
    expect(new HealthService(explodes).live()).toEqual({ status: 'ok' });
  });

  it('ready() ok khi PostgreSQL tra loi duoc', async () => {
    const r = await new HealthService(fakeDb(true)).ready();
    expect(r.status).toBe('ok');
    expect(r.checks).toEqual({ config: true, database: true });
  });

  it('ready() unavailable khi PostgreSQL chet', async () => {
    const r = await new HealthService(fakeDb(false)).ready();
    expect(r.status).toBe('unavailable');
  });

  /** FV-02: core readiness KHONG duoc phu thuoc storage, SMTP hay worker. */
  it('chi phu thuoc DUNG MOT cong', () => {
    expect(HealthService.length).toBe(1);
  });
});
