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

/** Bien rong trong `.env` nghia la chua cau hinh, khong phai mot chuoi hop le. */
const optionalText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().min(1).optional(),
);

const siteOrigin = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.username === '' &&
      url.password === '' &&
      url.pathname === '/' &&
      url.search === '' &&
      url.hash === ''
    );
  }, 'NEXT_PUBLIC_SITE_URL phai la HTTP(S) origin, khong co credentials/path/query/hash');

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL bat buoc'),
  DATABASE_SCHEMA: z.string().default('ltv'),
  DATABASE_POOL_MAX: int.default(10),
  DATABASE_STATEMENT_TIMEOUT_MS: int.default(10_000),

  API_PORT: int.default(3001),
  API_BASE_PATH: z.string().default('/api/v1'),
  /** Origin cong khai dung cho canonical, hreflang va sitemap (F6). */
  NEXT_PUBLIC_SITE_URL: siteOrigin.default('http://localhost:3000'),
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
  /**
   * Co tin `X-Forwarded-For` khong.
   *
   * `false` la mac dinh AN TOAN. Bat khi KHONG dung sau proxy thi ke tan cong
   * tu dat header do va co han muc vo han — nguy hiem hon la de tat.
   */
  TRUST_PROXY: bool.default('false'),

  /**
   * Tran kich thuoc THAN yeu cau JSON.
   *
   * `express.json()` mac dinh 100 KB, nhung mac dinh do khong duoc dat tuong
   * minh o dau — nen no la mot con so khong ai chon. Noi dung bien tap la
   * JSONB (`doc/11` content block) voi nhieu block, nen 100 KB co the that su
   * khong du; 1 MB thi du rong ma van chan mot yeu cau 50 MB di sau vao he
   * thong roi moi bi tu choi.
   *
   * Tep KHONG di qua duong nay — upload dung `MEDIA_MAX_UPLOAD_BYTES` (F7).
   */
  BODY_LIMIT_BYTES: int.default(1024 * 1024),

  /**
   * `max-age` cua HSTS, giay. `0` = KHONG gui header.
   *
   * Mac dinh 0 CO Y. HSTS noi voi trinh duyet "tu nay chi dung HTTPS cho ten
   * mien nay", va trinh duyet NHO rat lau. Bat khi chua co chung chi hop le se
   * lam chinh minh khong truy cap duoc, va khong the go nhanh. Nen no phai la
   * mot quyet dinh co y thuc, khong phai mac dinh.
   */
  HSTS_MAX_AGE_SECONDS: int.default(0),
  /** Tran so lan bam Argon2 chay cung luc. Xem `shared/crypto/hash-gate.ts`. */
  HASH_MAX_CONCURRENT: int.default(4),
  HASH_MAX_QUEUED: int.default(32),

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

  /** `file` giup local/dev quan sat email ma khong can SMTP. Production cam. */
  EMAIL_TRANSPORT: z.enum(['file', 'smtp']).default('file'),
  EMAIL_FILE_DIR: z.string().min(1).default('./.data/mail-outbox'),
  SMTP_HOST: optionalText,
  SMTP_PORT: int.default(587),
  SMTP_USER: optionalText,
  SMTP_PASSWORD: optionalText,
  SMTP_FROM: z.string().email().default('no-reply@ltvietnam.com.vn'),
  INQUIRY_RECIPIENT: z.string().email().default('inquiries@ltvietnam.com.vn'),

  CAPTCHA_PROVIDER: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.enum(['turnstile', 'recaptcha']).optional(),
  ),
  CAPTCHA_SECRET: optionalText,
});

export type AppConfig = z.infer<typeof configSchema>;

/** Worker chi doc nhung bien no thuc su dung; khong doi JWT/reset secret. */
export const workerConfigSchema = configSchema.pick({
  NODE_ENV: true,
  LOG_LEVEL: true,
  DATABASE_URL: true,
  DATABASE_SCHEMA: true,
  DATABASE_POOL_MAX: true,
  DATABASE_STATEMENT_TIMEOUT_MS: true,
  NEXT_PUBLIC_SITE_URL: true,
  WORKER_ID: true,
  WORKER_BATCH_SIZE: true,
  WORKER_POLL_INTERVAL_MS: true,
  WORKER_PROCESSING_TIMEOUT_MS: true,
  WORKER_HEARTBEAT_INTERVAL_MS: true,
  WORKER_MAX_ATTEMPTS: true,
  EMAIL_TRANSPORT: true,
  EMAIL_FILE_DIR: true,
  SMTP_HOST: true,
  SMTP_PORT: true,
  SMTP_USER: true,
  SMTP_PASSWORD: true,
  SMTP_FROM: true,
});
export type WorkerConfig = z.infer<typeof workerConfigSchema>;

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
  if (!cfg.NEXT_PUBLIC_SITE_URL.startsWith('https://')) {
    loi.push('NEXT_PUBLIC_SITE_URL phai dung https:// tren production');
  }
  if (cfg.HASH_MAX_CONCURRENT > 16) {
    // Moi lan bam ton 19 MiB. 16 x 19 = 304 MiB da la nhieu cho mot may nho.
    loi.push(`HASH_MAX_CONCURRENT=${cfg.HASH_MAX_CONCURRENT} qua cao — moi lan bam ton 19 MiB`);
  }
  if (cfg.JWT_SECRET === cfg.PASSWORD_RESET_SECRET) {
    // Dung chung bi mat thi mot the dat lai mat khau doi duoc thanh the phien.
    loi.push('JWT_SECRET va PASSWORD_RESET_SECRET phai KHAC nhau');
  }
  if (cfg.EMAIL_TRANSPORT !== 'smtp') {
    loi.push('EMAIL_TRANSPORT phai la smtp tren production');
  }
  if (!cfg.SMTP_HOST) loi.push('SMTP_HOST bat buoc tren production');
  if (!cfg.CAPTCHA_PROVIDER || !cfg.CAPTCHA_SECRET) {
    loi.push('CAPTCHA_PROVIDER va CAPTCHA_SECRET bat buoc tren production');
  }
  if (!cfg.SMTP_FROM.toLowerCase().endsWith('@ltvietnam.com.vn')) {
    loi.push('SMTP_FROM phai thuoc ten mien ltvietnam.com.vn');
  }
  if ((cfg.SMTP_USER === undefined) !== (cfg.SMTP_PASSWORD === undefined)) {
    loi.push('SMTP_USER va SMTP_PASSWORD phai cung co hoac cung trong');
  }
  for (const [ten, gt] of [
    ['JWT_SECRET', cfg.JWT_SECRET],
    ['PASSWORD_RESET_SECRET', cfg.PASSWORD_RESET_SECRET],
  ] as const) {
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
  assertEmailCoherent(parsed.data);
  if ((parsed.data.CAPTCHA_PROVIDER === undefined) !== (parsed.data.CAPTCHA_SECRET === undefined)) {
    throw new Error(
      'Cau hinh khong hop le:\n  - CAPTCHA_PROVIDER va CAPTCHA_SECRET phai cung co hoac cung trong',
    );
  }
  return parsed.data;
}

export function loadWorkerConfig(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  const parsed = workerConfigSchema.safeParse(env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Cau hinh worker khong hop le:\n${lines.join('\n')}`);
  }
  assertEmailCoherent(parsed.data);
  return parsed.data;
}

function assertEmailCoherent(cfg: WorkerConfig): void {
  const loi: string[] = [];
  if (cfg.EMAIL_TRANSPORT === 'smtp' && !cfg.SMTP_HOST) {
    loi.push('SMTP_HOST bat buoc khi EMAIL_TRANSPORT=smtp');
  }
  if ((cfg.SMTP_USER === undefined) !== (cfg.SMTP_PASSWORD === undefined)) {
    loi.push('SMTP_USER va SMTP_PASSWORD phai cung co hoac cung trong');
  }
  if (loi.length > 0) throw new Error(`Cau hinh email khong hop le:\n  - ${loi.join('\n  - ')}`);
}

export function assertWorkerProductionSafe(cfg: WorkerConfig): void {
  if (cfg.NODE_ENV !== 'production') return;
  const loi: string[] = [];
  if (cfg.EMAIL_TRANSPORT !== 'smtp') loi.push('EMAIL_TRANSPORT phai la smtp tren production');
  if (!cfg.SMTP_HOST) loi.push('SMTP_HOST bat buoc tren production');
  if (!cfg.SMTP_FROM.toLowerCase().endsWith('@ltvietnam.com.vn')) {
    loi.push('SMTP_FROM phai thuoc ten mien ltvietnam.com.vn');
  }
  if ((cfg.SMTP_USER === undefined) !== (cfg.SMTP_PASSWORD === undefined)) {
    loi.push('SMTP_USER va SMTP_PASSWORD phai cung co hoac cung trong');
  }
  if (loi.length > 0) {
    throw new Error(`Cau hinh worker khong an toan cho production:\n  - ${loi.join('\n  - ')}`);
  }
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
