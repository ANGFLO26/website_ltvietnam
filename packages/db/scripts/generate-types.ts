/**
 * Sinh kieu Kysely tu PostgreSQL THAT.
 *
 * Doc information_schema cua database da chay migration, roi sinh
 * src/schema-types.ts. Nho vay kieu luon dong bo voi schema — khong the lech
 * vi khong ai go tay.
 *
 * Chay:  DATABASE_URL=... node dist/scripts/generate-types.js
 */
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

const SCHEMA = process.env.DATABASE_SCHEMA ?? 'ltv';

/** PostgreSQL -> TypeScript. */
const TYPE_MAP: Record<string, string> = {
  uuid: 'string',
  text: 'string',
  citext: 'string',
  'character varying': 'string',
  character: 'string',
  integer: 'number',
  bigint: 'string',
  smallint: 'number',
  numeric: 'string',
  real: 'number',
  'double precision': 'number',
  boolean: 'boolean',
  'timestamp with time zone': 'Timestamp',
  'timestamp without time zone': 'Timestamp',
  date: 'DateOnly',
  time: 'string',
  jsonb: 'Json',
  json: 'Json',
  inet: 'string',
  bytea: 'Buffer',
  ARRAY: 'string[]',
};

const pascal = (s: string): string =>
  s
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');

interface Col {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: 'YES' | 'NO';
  column_default: string | null;
  udt_name: string;
}

async function main(): Promise<void> {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const { rows } = await pool.query<Col>(
    `SELECT table_name, column_name, data_type, is_nullable, column_default, udt_name
       FROM information_schema.columns
      WHERE table_schema = $1
        AND table_name IN (SELECT table_name FROM information_schema.tables
                            WHERE table_schema = $1 AND table_type = 'BASE TABLE')
      ORDER BY table_name, ordinal_position`,
    [SCHEMA],
  );
  await pool.end();

  const byTable = new Map<string, Col[]>();
  for (const c of rows) {
    if (!byTable.has(c.table_name)) byTable.set(c.table_name, []);
    byTable.get(c.table_name)!.push(c);
  }

  const out: string[] = [
    '/**',
    ' * SINH TU DONG — DUNG SUA TAY.',
    ' *',
    ' * Nguon: PostgreSQL schema `' + SCHEMA + '`, sinh boi scripts/generate-types.ts.',
    ' * Chay lai sau moi migration:  pnpm --filter @ltv/db gen:types',
    ' */',
    "import type { ColumnType, Generated } from 'kysely';",
    '',
    '// Cot dung ColumnType san. Ban `*Gen` cho cot CO DEFAULT: kieu insert them',
    '// `undefined` de khong phai truyen. KHONG boc `Generated<ColumnType<..>>` —',
    '// boc hai lan lam hong kieu doc.',
    'type Timestamp = ColumnType<Date, Date | string, Date | string>;',
    'type TimestampGen = ColumnType<Date, Date | string | undefined, Date | string>;',
    '// DATE doc ra la CHUOI `YYYY-MM-DD`, khong phai `Date` — mot ngay tren',
    '// lich khong co mui gio. Xem `dao/connection.ts`.',
    'type DateOnly = ColumnType<string, Date | string, Date | string>;',
    'type DateOnlyGen = ColumnType<string, Date | string | undefined, Date | string>;',
    'type Json = unknown;',
    'type JsonGen = ColumnType<unknown, unknown | undefined, unknown>;',
    '',
  ];

  for (const [table, cols] of [...byTable].sort()) {
    out.push(`export interface ${pascal(table)}Table {`);
    for (const c of cols) {
      const base =
        c.data_type === 'ARRAY'
          ? `${TYPE_MAP[c.udt_name.replace(/^_/, '')] ?? 'string'}[]`
          : (TYPE_MAP[c.data_type] ?? 'string');
      // Cot da la ColumnType thi dung ban *Gen; boc Generated<ColumnType<..>>
      // se lam hong kieu doc.
      const GEN: Record<string, string> = {
        Timestamp: 'TimestampGen',
        DateOnly: 'DateOnlyGen',
        Json: 'JsonGen',
      };
      const hasDefault = c.column_default !== null;
      let ts = hasDefault ? (GEN[base] ?? `Generated<${base}>`) : base;
      if (c.is_nullable === 'YES') ts += ' | null';
      out.push(`  ${c.column_name}: ${ts};`);
    }
    out.push('}', '');
  }

  out.push('export interface Database {');
  for (const table of [...byTable.keys()].sort()) out.push(`  ${table}: ${pascal(table)}Table;`);
  out.push('}', '');

  // Chay tu thu muc goi cua package (pnpm --filter dat cwd o day),
  // khong dung import.meta.dirname vi file da bien dich nam trong dist/.
  const target = resolve(process.cwd(), 'src/schema-types.ts');
  await writeFile(target, out.join('\n'), 'utf8');
  process.stdout.write(`Da sinh ${byTable.size} bang -> src/schema-types.ts\n`);
}

main().catch((e: unknown) => {
  process.stderr.write(`${(e as Error).message}\n`);
  process.exit(1);
});
