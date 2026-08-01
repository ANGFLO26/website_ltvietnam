#!/usr/bin/env node
import { resolve } from 'node:path';
import { loadConfig } from '@ltv/config';
import pg from 'pg';
import {
  loadMigrations,
  migrateDown,
  migrateUp,
  ensureHistoryTable,
  readHistory,
  validateHistory,
} from './migration-runner.js';

// Giai theo thu muc goi cua package (pnpm --filter dat cwd o day).
// KHONG dung import.meta.url: file da bien dich nam trong dist/src/ nen
// duong dan tuong doi se lech mot cap.
const MIGRATIONS_DIR = resolve(process.cwd(), 'migrations');

const log = (m: string) => process.stdout.write(`${m}\n`);

async function main(): Promise<void> {
  const cmd = process.argv[2] ?? 'status';
  const cfg = loadConfig();
  const pool = new pg.Pool({ connectionString: cfg.DATABASE_URL });

  try {
    switch (cmd) {
      case 'up': {
        const r = await migrateUp(pool, MIGRATIONS_DIR, cfg.DATABASE_SCHEMA, log);
        log(`OK — apply ${r.applied.length}, da co san ${r.skipped}`);
        break;
      }
      case 'down': {
        const steps = Number(process.argv[3] ?? 1);
        const undone = await migrateDown(pool, MIGRATIONS_DIR, cfg.DATABASE_SCHEMA, steps, log);
        log(`OK — rollback ${undone.length}`);
        break;
      }
      case 'verify': {
        const migs = await loadMigrations(MIGRATIONS_DIR);
        log(`Bo file hop le: ${migs.length} migration, moi up co down, so lien tuc.`);
        break;
      }
      case 'status': {
        const migs = await loadMigrations(MIGRATIONS_DIR);
        const client = await pool.connect();
        try {
          await ensureHistoryTable(client, cfg.DATABASE_SCHEMA);
          const applied = await readHistory(client, cfg.DATABASE_SCHEMA);
          const pending = validateHistory(migs, applied);
          log(`Tong: ${migs.length} | Da apply: ${applied.length} | Con lai: ${pending.length}`);
          for (const m of migs) {
            const a = applied.find((x) => x.id === m.id);
            log(`  ${a ? '[x]' : '[ ]'} ${m.id} ${m.name}`);
          }
        } finally {
          client.release();
        }
        break;
      }
      default:
        log(`Lenh khong biet: ${cmd}. Dung: up | down [n] | status | verify`);
        process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`${(err as Error).message}\n`);
  process.exit(1);
});
