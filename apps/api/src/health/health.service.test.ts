import { describe, expect, it } from 'vitest';
import { HealthService } from './health.service.js';
import type { DatabaseHealthPort } from './ports/database-health.port.js';

/**
 * Day chinh la phan thuong cua viec tach port: kiem thu HealthService
 * KHONG can database, khong can pg, khong can container.
 * Truoc khi refactor, service nhan thang pg.Pool nen khong lam duoc dieu nay.
 */
const fakeDb = (healthy: boolean): DatabaseHealthPort => ({
  canServeMinimalQuery: async () => healthy,
});

describe('HealthService — Readiness Model B', () => {
  it('live() khong cham phu thuoc nao', () => {
    // Truyen port luon nem loi: neu live() co cham DB thi test se hong.
    const explodes: DatabaseHealthPort = {
      canServeMinimalQuery: async () => {
        throw new Error('live() KHONG duoc cham database');
      },
    };
    expect(new HealthService(explodes).live()).toEqual({ status: 'ok' });
  });

  it('ready() tra ok khi PostgreSQL tra loi duoc', async () => {
    const r = await new HealthService(fakeDb(true)).ready();
    expect(r.status).toBe('ok');
    expect(r.checks).toEqual({ config: true, database: true });
  });

  it('ready() tra unavailable khi PostgreSQL chet', async () => {
    const r = await new HealthService(fakeDb(false)).ready();
    expect(r.status).toBe('unavailable');
    expect(r.checks.database).toBe(false);
  });

  /**
   * FV-02: core readiness KHONG duoc phu thuoc storage, SMTP hay worker.
   * Test nay khoa lai y dinh do — no se hong neu ai do them phu thuoc moi
   * vao constructor cua HealthService.
   */
  it('chi phu thuoc DUNG MOT cong: database', () => {
    expect(HealthService.length).toBe(1);
  });
});
