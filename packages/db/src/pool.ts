import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import type { AppConfig } from '@ltv/config';
import type { Database } from './schema-types.js';

/**
 * NOI DUY NHAT trong ca kho ma duoc goi `new pg.Pool`.
 *
 * Truoc F-1c co SAU cho tao pool, va chung KHAC nhau:
 *
 *   packages/db/src/pool.ts        search_path OK  timeout OK  DATE parser KHONG
 *   backend/src/dao/connection.ts  search_path OK  timeout OK  DATE parser OK
 *   packages/db/src/cli.ts         khong co gi ca
 *   packages/db/scripts/seed.ts    khong co gi ca
 *   .../generate-types.ts          khong co gi ca
 *   packages/testing/src/index.ts  khong co gi ca (va khong ai dung file nay)
 *
 * Do khong phai rui ro ve sau — no DA phan hoa roi, va dung o cho toi da viet
 * ca mot doan chu thich de canh bao. Do duoc voi `TZ=Asia/Ho_Chi_Minh`:
 *
 *   SELECT '2026-03-15'::date
 *     qua pool cua @ltv/db  (worker + CLI dung) -> Date "2026-03-14T17:00:00Z"
 *     qua pool cua backend                      -> String "2026-03-15"
 *
 * Worker doc lech MOT NGAY, tren may that dat gio Viet Nam. Toi sua loi do o
 * `backend/src/dao/connection.ts`, viet ro vi sao, roi khong mang no sang ban
 * sao thu hai — vi khong co gi buoc phai mang.
 */

/**
 * DATE ve nguyen dang chuoi `YYYY-MM-DD`.
 *
 * Mac dinh, `pg` dung kieu DATE thanh mot `Date` o NUA DEM GIO DIA PHUONG.
 * Tren may chay UTC+7, `2026-03-15` doc ra thanh `2026-03-14T17:00:00Z` —
 * lech mot ngay. Loi nay im lang tuyet doi: no dung tren may phat trien dat o
 * UTC va sai tren may that dat o gio Viet Nam, hoac nguoc lai.
 *
 * Mot ngay tren lich (ngay ban giao du an, ngay phat hanh tai lieu) khong gan
 * voi mui gio nao. Bieu dien no bang `Date` la sai ngay tu dau, nen o day giu
 * nguyen chuoi va `schema-types.ts` khai bao DATE doc ra la `string`.
 *
 * Dat o PHAM VI MODULE, khong dat trong `createPoolFrom`: `pg.types` la trang
 * thai toan cuc cua module `pg`, nen dang ky mot lan la du, va lam vay thi moi
 * pool deu duoc ap — ke ca pool mot bai test tu tao. Nhung "moi pool" chi dung
 * neu tien trinh CO nap file nay; do la ly do Luat 12 chan `new pg.Pool` o moi
 * cho khac, va Luat 13 khang dinh dong duoi day ton tai.
 */
const PG_OID_DATE = 1082;
pg.types.setTypeParser(PG_OID_DATE, (value: string) => value);

export interface PoolOptions {
  readonly connectionString: string;
  readonly schema: string;
  readonly max?: number;
  /**
   * `0` = KHONG gioi han. Con so nay la ly do phai co hai ham chu khong mot:
   * xem `createMigrationPool`.
   */
  readonly statementTimeoutMs: number;
  /**
   * Thoi gian toi da CHO mot khoa. Khac `statement_timeout`: cai kia gioi han
   * thoi gian CHAY.
   */
  readonly lockTimeoutMs?: number;
}

/**
 * Tang thap nhat — dung khi khong co `AppConfig` day du (script, test).
 *
 * `search_path` khong phai chi tiet trang tri. Do duoc tren pool "tho" khong
 * dat no:
 *
 *   SHOW search_path                       -> "$user", public
 *   SELECT 1 FROM users                    -> relation "users" does not exist
 *   CREATE TABLE thu_khong_qualify (id int) -> nam o schema `public`
 *
 * Cau lenh thu ba la cai dang lo: mot migration quen viet `ltv.` se tao bang
 * trong `public` ma khong bao loi, va moi migration sau do co viet `ltv.` se
 * that bai theo cach rat kho lan. Migration hien tai deu dat schema tuong minh
 * nen chua ai dinh — nhung khong co gi ep dieu do.
 */
export function createPoolFrom(o: PoolOptions): pg.Pool {
  return new pg.Pool({ connectionString: o.connectionString, max: o.max, options: thamSo(o) });
}

/**
 * Mot KET NOI DON, khong phai pool.
 *
 * Chi dung khi PHAI ghim mot phien: giu mot khoa qua nhieu cau lenh, hoac mo
 * mot transaction roi kiem tu ben ngoai. Pool khong bao dam hai cau lenh di
 * cung mot ket noi, nen no khong lam duoc viec do.
 *
 * O day chu khong o file test: test `inquiry-outbox` can mot ket noi giu khoa
 * de chung minh `FOR UPDATE SKIP LOCKED`, va no cung can `search_path`. De no
 * tu goi `new pg.Client` thi lai la mot bien the thu bay.
 */
export function createClientFrom(o: PoolOptions): pg.Client {
  return new pg.Client({ connectionString: o.connectionString, options: thamSo(o) });
}

/**
 * Dat MOI tham so phien qua `options`, khong tron hai co che.
 *
 * `pg` co truong `statement_timeout` rieng, nhung `0` la gia tri falsy nen
 * "khong gioi han" de bi bo qua im lang. Mot co che duy nhat thi `0` la mot
 * con so nhu moi con so khac.
 */
function thamSo(o: PoolOptions): string {
  const cai: string[] = [
    `-c search_path=${o.schema},public`,
    `-c statement_timeout=${Math.max(0, Math.trunc(o.statementTimeoutMs))}`,
  ];
  if (o.lockTimeoutMs !== undefined) {
    cai.push(`-c lock_timeout=${Math.max(0, Math.trunc(o.lockTimeoutMs))}`);
  }
  return cai.join(' ');
}

/** Pool cho tien trinh phuc vu yeu cau: backend va worker. */
export function createAppPool(cfg: AppConfig): pg.Pool {
  return createPoolFrom({
    connectionString: cfg.DATABASE_URL,
    schema: cfg.DATABASE_SCHEMA,
    max: cfg.DATABASE_POOL_MAX,
    statementTimeoutMs: cfg.DATABASE_STATEMENT_TIMEOUT_MS,
  });
}

/**
 * Pool cho MIGRATION — va no PHAI khac pool ung dung.
 *
 * Day la ly do khong gop tat ca thanh mot ham. Do duoc tren pool ung dung:
 *
 *   SHOW statement_timeout  -> 10s
 *   SELECT pg_sleep(10)     -> canceling statement due to statement timeout
 *
 * `CREATE INDEX` tren mot bang lon mat vai phut. Cho migration dung
 * `statement_timeout` cua ung dung nghia la migration bi HUY GIUA DUONG khi du
 * lieu lon len — tren may that, khong phai tren may phat trien. Nen o day
 * `statement_timeout = 0`.
 *
 * Nhung `0` cho MOI thu la nguy hiem theo huong khac: mot migration doi khoa
 * sau mot truy van dai se treo vo han va giu khoa DDL, chan ca ung dung. Nen
 * `lock_timeout = 10s`: that bai NHANH khi khong lay duoc khoa, con viec thi
 * cho chay bao lau cung duoc. Do la hai loai kien nhan khac nhau.
 */
export function createMigrationPool(cfg: AppConfig): pg.Pool {
  return createPoolFrom({
    connectionString: cfg.DATABASE_URL,
    schema: cfg.DATABASE_SCHEMA,
    max: 2,
    statementTimeoutMs: 0,
    lockTimeoutMs: 10_000,
  });
}

export function createDb(pool: pg.Pool): Kysely<Database> {
  return new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
}
