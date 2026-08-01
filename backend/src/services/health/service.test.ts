import { describe, expect, it } from 'vitest';
import { HealthServiceImpl } from './service.js';
import type { DaoPing } from '../../dao/dao-manager.js';

/**
 * Phan thuong cua viec service phu thuoc INTERFACE: kiem thu khong can
 * database, khong can Kysely, khong can container.
 */
const ping = (ok: boolean): DaoPing => ({ ping: async () => ok });

describe('HealthService — Readiness Model B', () => {
  it('live() khong cham phu thuoc nao', () => {
    const explodes: DaoPing = {
      ping: async () => {
        throw new Error('live() KHONG duoc cham database');
      },
    };
    expect(new HealthServiceImpl(explodes).live()).toEqual({ status: 'ok' });
  });

  it('ready() ok khi PostgreSQL tra loi duoc', async () => {
    const r = await new HealthServiceImpl(ping(true)).ready();
    expect(r).toEqual({ status: 'ok', checks: { config: true, database: true } });
  });

  it('ready() unavailable khi PostgreSQL chet', async () => {
    const r = await new HealthServiceImpl(ping(false)).ready();
    expect(r.status).toBe('unavailable');
  });

  /** FV-02: core readiness KHONG duoc phu thuoc storage, SMTP hay worker. */
  it('chi phu thuoc DUNG MOT cong', () => {
    expect(HealthServiceImpl.length).toBe(1);
  });
});
