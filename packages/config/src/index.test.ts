import { describe, expect, it } from 'vitest';
import {
  assertProductionSafe,
  assertWorkerProductionSafe,
  loadConfig,
  loadWorkerConfig,
  mediaPaths,
} from './index.js';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_SECRET: 'a'.repeat(32),
  PASSWORD_RESET_SECRET: 'b'.repeat(32),
};

describe('loadConfig', () => {
  it('nhan cau hinh toi thieu va dien mac dinh', () => {
    const cfg = loadConfig(base as NodeJS.ProcessEnv);
    expect(cfg.DATABASE_SCHEMA).toBe('ltv');
    expect(cfg.API_PORT).toBe(3001);
    expect(cfg.MEDIA_PURGE_DELAY_DAYS).toBe(30);
  });

  it('tu choi khi thieu DATABASE_URL', () => {
    expect(() => loadConfig({ ...base, DATABASE_URL: '' } as NodeJS.ProcessEnv)).toThrow(
      /DATABASE_URL/,
    );
  });

  it('tu choi JWT_SECRET qua ngan', () => {
    expect(() => loadConfig({ ...base, JWT_SECRET: 'ngan' } as NodeJS.ProcessEnv)).toThrow(
      /JWT_SECRET/,
    );
  });

  it('tach CORS_ORIGINS thanh mang', () => {
    const cfg = loadConfig({
      ...base,
      CORS_ORIGINS: 'http://a.com, http://b.com',
    } as NodeJS.ProcessEnv);
    expect(cfg.CORS_ORIGINS).toEqual(['http://a.com', 'http://b.com']);
  });

  it('tach bon lop luu tru media theo D20', () => {
    const p = mediaPaths(loadConfig({ ...base, MEDIA_ROOT: '/srv/media/' } as NodeJS.ProcessEnv));
    expect(p.public).toBe('/srv/media/public-media');
    expect(p.protected).toBe('/srv/media/protected-documents');
    expect(p.publicVariants).toBe('/srv/media/public-media/variants');
  });

  it('worker khong doi JWT_SECRET hay PASSWORD_RESET_SECRET', () => {
    const cfg = loadWorkerConfig({ DATABASE_URL: base.DATABASE_URL } as NodeJS.ProcessEnv);
    expect(cfg.WORKER_ID).toBe('worker-1');
    expect('JWT_SECRET' in cfg).toBe(false);
  });

  it('production tu choi file transport va CAPTCHA rong', () => {
    const cfg = loadConfig({
      ...base,
      NODE_ENV: 'production',
      CORS_ORIGINS: 'https://ltvietnam.com.vn',
      NEXT_PUBLIC_SITE_URL: 'https://ltvietnam.com.vn',
    } as NodeJS.ProcessEnv);
    expect(() => assertProductionSafe(cfg)).toThrow(/EMAIL_TRANSPORT|CAPTCHA/);
    expect(() =>
      assertWorkerProductionSafe(
        loadWorkerConfig({
          DATABASE_URL: base.DATABASE_URL,
          NODE_ENV: 'production',
        } as NodeJS.ProcessEnv),
      ),
    ).toThrow(/EMAIL_TRANSPORT/);
  });

  it('tu choi cau hinh SMTP/CAPTCHA nua voi', () => {
    expect(() => loadConfig({ ...base, EMAIL_TRANSPORT: 'smtp' } as NodeJS.ProcessEnv)).toThrow(
      /SMTP_HOST/,
    );
    expect(() =>
      loadConfig({ ...base, CAPTCHA_PROVIDER: 'turnstile' } as NodeJS.ProcessEnv),
    ).toThrow(/CAPTCHA_SECRET/);
  });
});
