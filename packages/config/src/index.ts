/**
 * Cau hinh bootstrap — KHONG doc database.
 *
 * `settings` la module runtime doc tu DB, khong phai bootstrap config.
 * Khong tao canh Config -> Settings -> DB (plan 03 muc 1).
 */
import { z } from 'zod';

const bool = z
  .string()
  .transform((v) => v === 'true' || v === '1')
  .pipe(z.boolean());

const int = z.coerce.number().int();

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL bat buoc'),
  DATABASE_SCHEMA: z.string().default('ltv'),
  DATABASE_POOL_MAX: int.default(10),
  DATABASE_STATEMENT_TIMEOUT_MS: int.default(10_000),

  API_PORT: int.default(3001),
  API_BASE_PATH: z.string().default('/api/v1'),
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET phai it nhat 32 ky tu'),
  JWT_TTL_HOURS: int.default(8),
  PASSWORD_RESET_SECRET: z.string().min(32),
  PASSWORD_RESET_TTL_MINUTES: int.default(30),
  COOKIE_NAME: z.string().default('ltv_session'),
  COOKIE_SECURE: bool.default('false'),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('strict'),
  LOGIN_RATE_LIMIT: int.default(5),
  LOGIN_RATE_WINDOW_MINUTES: int.default(15),
  LOGIN_LOCK_AFTER_ATTEMPTS: int.default(10),

  MEDIA_ROOT: z.string().default('./.data/media'),
  MEDIA_PUBLIC_DIR: z.string().default('public-media'),
  MEDIA_PROTECTED_DIR: z.string().default('protected-documents'),
  MEDIA_TEMP_DIR: z.string().default('.tmp'),
  MEDIA_QUARANTINE_DIR: z.string().default('.quarantine'),
  MEDIA_MAX_UPLOAD_BYTES: int.default(20 * 1024 * 1024),
  MEDIA_PURGE_DELAY_DAYS: int.default(30),
  MEDIA_PUBLIC_MAX_AGE_SECONDS: int.default(86_400),

  WORKER_ID: z.string().default('worker-1'),
  WORKER_BATCH_SIZE: int.default(10),
  WORKER_POLL_INTERVAL_MS: int.default(5_000),
  WORKER_PROCESSING_TIMEOUT_MS: int.default(300_000),
  WORKER_HEARTBEAT_INTERVAL_MS: int.default(15_000),
  WORKER_MAX_ATTEMPTS: int.default(5),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: int.optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  INQUIRY_RECIPIENT: z.string().optional(),

  CAPTCHA_PROVIDER: z.string().optional(),
  CAPTCHA_SECRET: z.string().optional(),
});

export type AppConfig = z.infer<typeof configSchema>;

/** Doc va xac thuc bien moi truong. Nem loi ro rang neu thieu. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = configSchema.safeParse(env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Cau hinh khong hop le:\n${lines.join('\n')}`);
  }
  return parsed.data;
}

/** Duong dan tuyet doi cua bon lop luu tru media (D20). */
export function mediaPaths(cfg: AppConfig) {
  const root = cfg.MEDIA_ROOT.replace(/\/+$/, '');
  return {
    root,
    public: `${root}/${cfg.MEDIA_PUBLIC_DIR}`,
    publicOriginals: `${root}/${cfg.MEDIA_PUBLIC_DIR}/originals`,
    publicVariants: `${root}/${cfg.MEDIA_PUBLIC_DIR}/variants`,
    protected: `${root}/${cfg.MEDIA_PROTECTED_DIR}`,
    temp: `${root}/${cfg.MEDIA_TEMP_DIR}`,
    quarantine: `${root}/${cfg.MEDIA_QUARANTINE_DIR}`,
  } as const;
}
