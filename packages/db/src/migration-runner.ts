/**
 * Migration runner — hien thuc yeu cau CASE B cua ke hoach P1.
 *
 * Bao dam:
 *  1. So thu tu duy nhat, tang dan (001, 002, ...); moi `up` co `down` tuong ung.
 *  2. Chay tung migration mot, theo dung thu tu.
 *  3. Voi DDL trong transaction: ghi lich su va DDL commit NGUYEN TU.
 *     That bai khong de lai trang thai da danh dau thanh cong.
 *  4. Checksum SHA-256 tung file; file da apply bi sua -> FAIL CLOSED.
 *  5. Advisory lock cua PostgreSQL: hai runner chay cung luc chi mot cai apply.
 *  6. Lich su khong hop le (gap, trung, sai thu tu, migration la) -> FAIL CLOSED.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Pool, PoolClient } from 'pg';

/** Khoa tu van dung rieng cho migration. */
const ADVISORY_LOCK_KEY = 4_827_301_155;

/**
 * Bang lich su nam o SCHEMA RIENG, khong nam trong schema ma no quan ly.
 *
 * Ly do: migration 002 tao schema `ltv`, nen `down` cua no la
 * `DROP SCHEMA ltv CASCADE`. Neu bang lich su nam trong `ltv` thi chinh thao tac
 * rollback do se xoa mat lich su, va runner mat tri nho giua chung —
 * do la loi da do duoc khi rollback tu 33 ve 0.
 */
const META_SCHEMA = 'ltv_meta';

export interface Migration {
  readonly id: string; // '001'
  readonly name: string; // 'enable_extensions'
  readonly upPath: string;
  readonly downPath: string;
  readonly upSql: string;
  readonly downSql: string;
  readonly checksum: string;
  /** DDL khong chay duoc trong transaction, vd CREATE INDEX CONCURRENTLY. */
  readonly nonTransactional: boolean;
}

export interface AppliedMigration {
  readonly id: string;
  readonly name: string;
  readonly checksum: string;
  readonly appliedAt: Date;
}

export class MigrationError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

/** DDL bat buoc chay ngoai transaction. */
const NON_TRANSACTIONAL = /\bCONCURRENTLY\b|\bCREATE\s+DATABASE\b|\bDROP\s+DATABASE\b|\bVACUUM\b/i;

/** Doc thu muc migration, kiem tinh toan ven cua chinh bo file truoc khi cham DB. */
export async function loadMigrations(dir: string): Promise<Migration[]> {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();

  const ups = files.filter((f) => f.includes('.up.'));
  const downs = new Set(files.filter((f) => f.includes('.down.')));

  const out: Migration[] = [];
  const seen = new Set<string>();

  for (const up of ups) {
    const m = /^(\d{3,})_(.+)\.up\.sql$/.exec(up);
    if (!m) throw new MigrationError(`Ten file sai dinh dang: ${up}`, 'BAD_FILENAME');
    const [, id, name] = m as unknown as [string, string, string];

    if (seen.has(id)) throw new MigrationError(`Trung so migration: ${id}`, 'DUPLICATE_ID');
    seen.add(id);

    const downFile = `${id}_${name}.down.sql`;
    if (!downs.has(downFile))
      throw new MigrationError(`Migration ${id} thieu file down: ${downFile}`, 'MISSING_DOWN');

    const upSql = await readFile(join(dir, up), 'utf8');
    const downSql = await readFile(join(dir, downFile), 'utf8');

    out.push({
      id,
      name,
      upPath: up,
      downPath: downFile,
      upSql,
      downSql,
      checksum: sha256(upSql),
      nonTransactional: NON_TRANSACTIONAL.test(upSql),
    });
  }

  // So thu tu phai lien tuc, khong nhay coc.
  out.sort((a, b) => a.id.localeCompare(b.id));
  out.forEach((mig, i) => {
    const expected = String(i + 1).padStart(3, '0');
    if (mig.id !== expected)
      throw new MigrationError(
        `So migration khong lien tuc: mong doi ${expected}, gap ${mig.id}`,
        'GAP_IN_SEQUENCE',
      );
  });

  if (out.length === 0) throw new MigrationError('Khong tim thay migration nao', 'EMPTY');
  return out;
}

export async function ensureHistoryTable(client: PoolClient, _schema: string): Promise<void> {
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${ident(META_SCHEMA)}`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${ident(META_SCHEMA)}.schema_migrations (
      id          VARCHAR(16)  PRIMARY KEY,
      name        VARCHAR(200) NOT NULL,
      checksum    CHAR(64)     NOT NULL,
      applied_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      applied_by  TEXT         NOT NULL DEFAULT CURRENT_USER,
      duration_ms INTEGER
    )`);
}

export async function readHistory(
  client: PoolClient,
  _schema: string,
): Promise<AppliedMigration[]> {
  const { rows } = await client.query<{
    id: string;
    name: string;
    checksum: string;
    applied_at: Date;
  }>(
    `SELECT id, name, checksum, applied_at FROM ${ident(META_SCHEMA)}.schema_migrations ORDER BY id`,
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    checksum: r.checksum,
    appliedAt: r.applied_at,
  }));
}

/**
 * Doi chieu lich su voi bo file. Fail closed voi moi bat thuong.
 * Tra ve danh sach migration con phai chay.
 */
export function validateHistory(
  migrations: readonly Migration[],
  applied: readonly AppliedMigration[],
): Migration[] {
  const byId = new Map(migrations.map((m) => [m.id, m]));

  for (const [i, a] of applied.entries()) {
    const mig = byId.get(a.id);
    if (!mig)
      throw new MigrationError(
        `Lich su co migration ${a.id} khong ton tai trong thu muc`,
        'UNKNOWN_MIGRATION',
      );
    if (mig.checksum !== a.checksum)
      throw new MigrationError(
        `Migration ${a.id} da doi sau khi apply. ` +
          `Checksum trong DB ${a.checksum.slice(0, 12)}..., file ${mig.checksum.slice(0, 12)}...`,
        'CHECKSUM_MISMATCH',
      );
    // Lich su phai la tien to lien tuc cua bo file.
    const expected = migrations[i];
    if (!expected || expected.id !== a.id)
      throw new MigrationError(
        `Lich su khong phai tien to lien tuc: vi tri ${i} mong doi ${expected?.id ?? '(het)'}, gap ${a.id}`,
        'OUT_OF_ORDER',
      );
  }

  return migrations.slice(applied.length);
}

export interface RunResult {
  readonly applied: string[];
  readonly skipped: number;
}

/** Chay moi migration con thieu. Moi migration mot transaction rieng. */
export async function migrateUp(
  pool: Pool,
  dir: string,
  schema: string,
  log: (msg: string) => void = () => {},
): Promise<RunResult> {
  const migrations = await loadMigrations(dir);
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);
    await ensureHistoryTable(client, schema);
    const applied = await readHistory(client, schema);
    const pending = validateHistory(migrations, applied);

    if (pending.length === 0) {
      log(`Khong co migration moi. Da apply ${applied.length}.`);
      return { applied: [], skipped: applied.length };
    }

    const done: string[] = [];
    for (const mig of pending) {
      const started = Date.now();
      if (mig.nonTransactional) {
        // DDL khong the nam trong transaction. Chay truoc, ghi lich su sau.
        // Khong nguyen tu duoc — phai co the chay lai an toan.
        log(`  ${mig.id} ${mig.name} (NGOAI transaction)`);
        await client.query(mig.upSql);
        await recordHistory(client, schema, mig, Date.now() - started);
      } else {
        log(`  ${mig.id} ${mig.name}`);
        await client.query('BEGIN');
        try {
          await client.query(mig.upSql);
          await recordHistory(client, schema, mig, Date.now() - started);
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw new MigrationError(
            `Migration ${mig.id}_${mig.name} that bai, da rollback: ${(err as Error).message}`,
            'MIGRATION_FAILED',
          );
        }
      }
      done.push(mig.id);
    }
    log(`Da apply ${done.length} migration.`);
    return { applied: done, skipped: applied.length };
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]).catch(() => {});
    client.release();
  }
}

/** Rollback migration cuoi cung. Chi dung cho DB dung mot lan khi kiem thu. */
export async function migrateDown(
  pool: Pool,
  dir: string,
  schema: string, // giu trong chu ky de tuong thich; lich su nam o META_SCHEMA
  steps = 1,
  log: (msg: string) => void = () => {},
): Promise<string[]> {
  const migrations = await loadMigrations(dir);
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);
    await ensureHistoryTable(client, schema);
    const applied = await readHistory(client, schema);
    validateHistory(migrations, applied);

    const target = applied.slice(-steps).reverse();
    const undone: string[] = [];
    for (const a of target) {
      const mig = migrations.find((m) => m.id === a.id)!;
      log(`  down ${mig.id} ${mig.name}`);
      await client.query('BEGIN');
      try {
        await client.query(mig.downSql);
        await client.query(`DELETE FROM ${ident(META_SCHEMA)}.schema_migrations WHERE id = $1`, [
          mig.id,
        ]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw new MigrationError(
          `Rollback ${mig.id} that bai: ${(err as Error).message}`,
          'ROLLBACK_FAILED',
        );
      }
      undone.push(mig.id);
    }
    return undone;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]).catch(() => {});
    client.release();
  }
}

async function recordHistory(
  client: PoolClient,
  _schema: string,
  mig: Migration,
  durationMs: number,
): Promise<void> {
  await client.query(
    `INSERT INTO ${ident(META_SCHEMA)}.schema_migrations (id, name, checksum, duration_ms)
     VALUES ($1, $2, $3, $4)`,
    [mig.id, mig.name, mig.checksum, durationMs],
  );
}

/** Trich dan dinh danh an toan — chi cho phep chu, so, gach duoi. */
function ident(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name))
    throw new MigrationError(`Ten schema khong hop le: ${name}`, 'BAD_IDENT');
  return `"${name}"`;
}
