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
  /**
   * MAC DINH `true` — an toan cho production.
   *
   * Ban truoc mac dinh `false` de chay duoc tren `http://localhost`. Do la
   * mac dinh nguy hiem: quen dat bien tren may chu that thi cookie phien di
   * qua HTTP tran, va bat ky ai tren duong truyen deu doc duoc.
   *
   * Mac dinh phai la gia tri AN TOAN; muon noi long thi phai go tay. Va viec
   * go tay do bi `assertProductionSafe()` tu choi khi `NODE_ENV=production`.
   */
  COOKIE_SECURE: bool.default('true'),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('strict'),
  /** Ten cookie CSRF. Doc duoc tu JavaScript — do la co y (mau double-submit). */
  CSRF_COOKIE_NAME: z.string().default('ltv_csrf'),
  CSRF_HEADER_NAME: z.string().default('x-csrf-token'),
  LOGIN_RATE_LIMIT: int.default(5),
  LOGIN_RATE_WINDOW_MINUTES: int.default(15),
  LOGIN_LOCK_AFTER_ATTEMPTS: int.default(10),
  MIN_PASSWORD_LENGTH: int.default(12),

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

/**
 * Nhung cau hinh chay duoc tren may ca nhan nhung KHONG duoc phep len that.
 *
 * Goi luc khoi dong. Nem loi va dung tien trinh chu khong chi ghi canh bao:
 * mot dong canh bao trong log khoi dong se bi cuon qua trong ba giay va
 * khong ai doc lai.
 */
export function assertProductionSafe(cfg: AppConfig): void {
  if (cfg.NODE_ENV !== 'production') return;

  const loi: string[] = [];

  if (!cfg.COOKIE_SECURE) {
    loi.push('COOKIE_SECURE=false — cookie phien se di qua HTTP tran');
  }
  if (cfg.COOKIE_SAME_SITE === 'none') {
    loi.push('COOKIE_SAME_SITE=none — mo duong cho CSRF tu bat ky trang nao');
  }
  if (cfg.CORS_ORIGINS.length === 0) {
    loi.push('CORS_ORIGINS rong — admin se khong goi duoc API');
  }
  if (cfg.CORS_ORIGINS.some((o) => o.startsWith('http://'))) {
    loi.push('CORS_ORIGINS chua origin http:// — chi cho phep https tren production');
  }
  if (cfg.JWT_SECRET === cfg.PASSWORD_RESET_SECRET) {
    // Dung chung bi mat thi mot the dat lai mat khau doi duoc thanh the phien.
    loi.push('JWT_SECRET va PASSWORD_RESET_SECRET phai KHAC nhau');
  }
  for (const [ten, gt] of [['JWT_SECRET', cfg.JWT_SECRET], ['PASSWORD_RESET_SECRET', cfg.PASSWORD_RESET_SECRET]] as const) {
    if (gt.includes('thay-bang-gia-tri-that')) {
      loi.push(`${ten} van la gia tri mau trong .env.example`);
    }
  }

  if (loi.length > 0) {
    throw new Error(
      `Cau hinh khong an toan cho production:\n  - ${loi.join('\n  - ')}\n` +
        'Sua bien moi truong roi khoi dong lai.',
    );
  }
}

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
