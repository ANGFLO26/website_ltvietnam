import { describe, expect, it } from 'vitest';
import { loadConfig, mediaPaths } from './index.js';

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
});
