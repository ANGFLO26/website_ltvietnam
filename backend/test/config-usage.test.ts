import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { configSchema } from '@ltv/config';

/**
 * MOI khoa cau hinh phai duoc DUNG, hoac duoc khai bao la chua dung KEM LY DO.
 *
 * `doc/13` van de so 10: tam khoa khai bao ma khong noi nao doc. Mot khoa nhu
 * vay to hon mot dong ma chet, vi no xuat hien trong `.env.example` va nguoi
 * trien khai se DAT no, roi tin rang no co tac dung. `LOGIN_RATE_LIMIT` la vi
 * du dung: no ton tai tu dau, va den F-1a moi lo ra rang gioi han toc do CHUA
 * TUNG duoc cai dat — con so trong `.env` khong lam gi ca.
 *
 * Danh sach `CHUA_DUNG` la mot loi thua nhan CO CHU KY. Them mot dong vao do
 * de hon la cai dat khoa, nhung dong do phai noi ro phase nao se dung — nen
 * viec bo qua khong the im lang.
 */

const REPO = resolve(import.meta.dirname, '../..');

/** Nhung khoa CHUA duoc dung, va ly do — moi dong la mot loi hua co dia chi. */
const CHUA_DUNG: Record<string, string> = {
  // ── media: F7 ──
  MEDIA_ROOT: 'F7 — luu tru media',
  MEDIA_PUBLIC_DIR: 'F7',
  MEDIA_PROTECTED_DIR: 'F7',
  MEDIA_TEMP_DIR: 'F7',
  MEDIA_QUARANTINE_DIR: 'F7',
  MEDIA_MAX_UPLOAD_BYTES: 'F7 — tran upload, KHAC BODY_LIMIT_BYTES',
  MEDIA_PURGE_DELAY_DAYS: 'F7 — don media mo coi',
  MEDIA_PUBLIC_MAX_AGE_SECONDS: 'F7 — cache tep cong khai',

  /**
   * ── worker: F5 ──
   *
   * Ban dau toi liet ke ca nam khoa `WORKER_*` o day. Phep kiem chieu nguoc
   * bat ngay: `WORKER_BATCH_SIZE`, `WORKER_POLL_INTERVAL_MS` va
   * `WORKER_HEARTBEAT_INTERVAL_MS` DA duoc `worker/src/main.ts` doc tu truoc.
   *
   * Do dung la ly do phai co chieu nguoc: mot danh sach "chua dung" sai la mot
   * ban do sai, va mot ban do sai te hon khong co ban do.
   */
  WORKER_PROCESSING_TIMEOUT_MS: 'F5 — reaper thu hoi job treo',
  WORKER_MAX_ATTEMPTS: 'F5 — so lan thu lai truoc khi bo',
  SMTP_HOST: 'F5',
  SMTP_PORT: 'F5',
  SMTP_USER: 'F5',
  SMTP_PASSWORD: 'F5',
  SMTP_FROM: 'F5',
  INQUIRY_RECIPIENT: 'F5 — nguoi nhan thong bao bao gia',

  // ── captcha: F5 ──
  CAPTCHA_PROVIDER: 'F5 — chong spam form bao gia',
  CAPTCHA_SECRET: 'F5',

  /**
   * HAI KHOA NAY LA MOT VET TICH, khong phai mot loi hua.
   *
   * F-1a cai dat gioi han toc do bang `@RateLimit({ limit, windowMs })` ngay
   * canh tung endpoint, chu khong doc hai khoa nay — vi mot con so duy nhat
   * cho moi endpoint la sai: `login` can IP 30 / email 5, `forgot-password` can
   * IP 10 / email 3, `bootstrap` can 5/gio. Mot khoa `LOGIN_RATE_LIMIT` khong
   * dien dat duoc dieu do.
   *
   * De chung o day thi nguoi trien khai se dat `LOGIN_RATE_LIMIT=20` va tin
   * rang no co tac dung. Nen viec dung la XOA chung — ghi vao day de lan sau
   * doc thi biet day la mot quyet dinh chua lam, khong phai mot su bo sot.
   */
  LOGIN_RATE_LIMIT: 'VET TICH — nen XOA; han muc khai bao canh endpoint (F-1a)',
  LOGIN_RATE_WINDOW_MINUTES: 'VET TICH — nen XOA; xem LOGIN_RATE_LIMIT',
};

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|mjs)$/.test(full)) out.push(full);
  }
  return out;
}

/**
 * Quet MA NGUON, khong quet `.env.example`.
 *
 * Cau hoi la "co ma nao DOC khoa nay khong", nen chi noi doc mo`i tinh. Va bo
 * `packages/config` ra: chinh no la noi KHAI BAO, nen no luon "chua" moi khoa
 * va se lam phep kiem nay luon xanh — dung kieu xanh vo nghia.
 */
const MA = [
  ...walk(join(REPO, 'backend/src')),
  ...walk(join(REPO, 'worker/src')),
  ...walk(join(REPO, 'packages/db/src')),
  ...walk(join(REPO, 'packages/db/scripts')),
  ...walk(join(REPO, 'scripts')),
]
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');

const KHOA = Object.keys(configSchema.shape);

describe('doi chieu cau hinh voi cho dung', () => {
  it('doc duoc so do va co ma de quet', () => {
    // Neu mot trong hai rong thi ba phep kiem duoi xanh ma khong kiem gi.
    expect(KHOA.length).toBeGreaterThan(30);
    expect(MA.length).toBeGreaterThan(10_000);
  });

  it('moi khoa hoac DUOC DUNG, hoac nam trong danh sach CHUA_DUNG co ly do', () => {
    const mocoi = KHOA.filter((k) => !MA.includes(`cfg.${k}`) && !MA.includes(k))
      .filter((k) => !(k in CHUA_DUNG));
    expect(
      mocoi,
      `Khoa khai bao ma khong noi nao doc. Cai dat no, hoac them vao CHUA_DUNG kem ly do:\n${mocoi.join('\n')}`,
    ).toEqual([]);
  });

  it('danh sach CHUA_DUNG khong con khoa DA duoc dung', () => {
    /**
     * Chieu nguoc lai, va no quan trong khong kem: khi mot khoa duoc cai dat
     * that thi phai bo khoi danh sach nay. Neu khong, danh sach dan tro thanh
     * mot ban do sai — va mot ban do sai te hon khong co ban do.
     */
    const daDung = Object.keys(CHUA_DUNG).filter((k) => MA.includes(`cfg.${k}`));
    expect(
      daDung,
      `Nhung khoa nay DA duoc dung — bo khoi CHUA_DUNG:\n${daDung.join('\n')}`,
    ).toEqual([]);
  });

  it('CHUA_DUNG khong chua khoa KHONG con trong so do', () => {
    const la = Object.keys(CHUA_DUNG).filter((k) => !KHOA.includes(k));
    expect(la, `Khoa khong con trong configSchema:\n${la.join('\n')}`).toEqual([]);
  });
});

describe('.env.example — moi bien phai co nguoi doc', () => {
  const p = join(REPO, '.env.example');

  /**
   * `.env.example` phuc vu CA KHO, khong chi backend.
   *
   * Ban dau toi khang dinh moi bien phai nam trong `configSchema`. Phep kiem do
   * SAI, va no do voi bon bien: `POSTGRES_HOST_PORT` (docker-compose doc),
   * `WEB_PORT` (`frontend/package.json`), `INTERNAL_API_URL`
   * (`frontend/src/middleware.ts`) — ba bien nay co nguoi doc, chi khong phai
   * backend. `configSchema` la cau hinh cua backend/worker, khong phai cua kho.
   *
   * Cau hoi dung khong phai "co trong so do khong" ma "co AI doc khong". Nen
   * pham vi quet phai gom docker-compose, frontend va cac kich ban.
   */
  const NGUOI_DOC = [
    MA,
    existsSync(join(REPO, 'docker-compose.yml'))
      ? readFileSync(join(REPO, 'docker-compose.yml'), 'utf8')
      : '',
    ...walk(join(REPO, 'frontend/src')).map((f) => readFileSync(f, 'utf8')),
    existsSync(join(REPO, 'frontend/package.json'))
      ? readFileSync(join(REPO, 'frontend/package.json'), 'utf8')
      : '',
  ].join('\n');

  /** Bien huong tuong lai — chua ai doc, va ly do. */
  const CHUA_AI_DOC: Record<string, string> = {
    NEXT_PUBLIC_SITE_URL: 'F6 — canonical, sitemap, Open Graph can URL tuyet doi',
  };

  it('ton tai va co du bien de kiem', () => {
    expect(existsSync(p), 'khong thay .env.example').toBe(true);
    expect(NGUOI_DOC.length).toBeGreaterThan(10_000);
  });

  it('khong co bien nao KHONG AI doc', () => {
    /**
     * Mot bien trong `.env.example` ma khong ai doc se bi nguoi trien khai dat
     * va tin la co tac dung. Do la cung mot loi voi khoa cau hinh mo coi, chi
     * di tu huong nguoc lai.
     */
    const bien = [...readFileSync(p, 'utf8').matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]!);
    expect(bien.length).toBeGreaterThan(10);
    const mocoi = bien
      .filter((b) => !KHOA.includes(b) && !NGUOI_DOC.includes(b))
      .filter((b) => !(b in CHUA_AI_DOC));
    expect(
      mocoi,
      `.env.example khai bao bien khong ai doc:\n${mocoi.join('\n')}`,
    ).toEqual([]);
  });

  it('danh sach CHUA_AI_DOC khong con bien DA co nguoi doc', () => {
    const daDung = Object.keys(CHUA_AI_DOC).filter(
      (b) => KHOA.includes(b) || NGUOI_DOC.includes(b),
    );
    expect(daDung, `Da co nguoi doc — bo khoi CHUA_AI_DOC:\n${daDung.join('\n')}`).toEqual([]);
  });

  it('moi khoa BAT BUOC cua so do deu co mat trong .env.example', () => {
    /**
     * Chieu con lai: mot khoa khong co gia tri mac dinh ma thieu trong
     * `.env.example` thi nguoi trien khai chi biet no ton tai khi ung dung
     * KHONG KHOI DONG DUOC. Da xay ra that voi `JWT_SECRET`.
     */
    const noiDung = readFileSync(p, 'utf8');
    const batBuoc = KHOA.filter((k) => {
      const truong = configSchema.shape[k as keyof typeof configSchema.shape];
      return truong.safeParse(undefined).success === false;
    });
    expect(batBuoc.length).toBeGreaterThan(0);
    const thieu = batBuoc.filter((k) => !new RegExp(`^${k}=`, 'm').test(noiDung));
    expect(thieu, `Khoa bat buoc thieu trong .env.example:\n${thieu.join('\n')}`).toEqual([]);
  });
});
