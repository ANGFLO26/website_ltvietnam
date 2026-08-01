/**
 * Chay seed bootstrap.
 *
 * Idempotent: moi lenh dung ON CONFLICT DO NOTHING nen chay lai an toan.
 * KHONG tao tai khoan admin o day — mat khau co dinh trong seed la lo hong.
 * Lenh tao admin se co o B2 cung voi Argon2id.
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import pg from 'pg';

async function main(): Promise<void> {
  const dir = resolve(process.cwd(), 'seeds');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  const only = process.argv[2];
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    for (const f of files) {
      if (only && !f.includes(only)) continue;
      const sql = await readFile(join(dir, f), 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        process.stdout.write(`  ${f}  OK\n`);
      } catch (e) {
        await client.query('ROLLBACK');
        throw new Error(`${f} that bai: ${(e as Error).message}`);
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }
  process.stdout.write('Seed xong.\n');
}

main().catch((e: unknown) => {
  process.stderr.write(`${(e as Error).message}\n`);
  process.exit(1);
});
