#!/usr/bin/env node
/**
 * Sinh khung bon file cho mot bang moi.
 *
 *   pnpm --filter @ltv/backend dao:new brands
 *
 * Them bang moi khong phai chep tay bon file — day la dieu kien de cau truc
 * "du bon thanh phan" khong tro thanh ganh nang.
 */
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const table = process.argv[2];
if (!table || !/^[a-z][a-z0-9_]*$/.test(table)) {
  process.stderr.write('Dung: pnpm dao:new <ten_bang_snake_case>\n');
  process.exit(1);
}

const pascal = (s) => s.split('_').map((p) => p[0].toUpperCase() + p.slice(1)).join('');
const camel = (s) => { const p = pascal(s); return p[0].toLowerCase() + p.slice(1); };
const singular = (s) => (s.endsWith('ies') ? `${s.slice(0, -3)}y` : s.endsWith('s') ? s.slice(0, -1) : s);

const Entity = pascal(singular(table));   // brands -> Brand
const dir = resolve(process.cwd(), 'src/dao', table);

const exists = async (p) => { try { await access(p); return true; } catch { return false; } };
if (await exists(dir)) {
  process.stderr.write(`Thu muc da ton tai: src/dao/${table}\n`);
  process.exit(1);
}
await mkdir(dir, { recursive: true });

await writeFile(join(dir, 'object.ts'), `/**
 * Thuc the nghiep vu \`${Entity}\` — KHONG phai hang trong bang.
 *
 * Tach khoi \`${pascal(table)}Table\` cua Kysely de khong lo snake_case,
 * \`Generated<T>\` va cac cot chua dung den ra tang tren.
 */
export interface ${Entity} {
  readonly id: string;
  // TODO: them truong nghiep vu
}

export interface Create${Entity}Input {
  // TODO
}

export type Update${Entity}Input = Partial<Create${Entity}Input>;
`);

await writeFile(join(dir, 'dao.interface.ts'), `import type { Create${Entity}Input, ${Entity}, Update${Entity}Input } from './object.js';

/**
 * Hop dong truy cap du lieu cho bang \`${table}\`.
 *
 * KHONG co tham so executor: DAO lay tu \`tx\` cua DaoManager da gan san
 * transaction.
 */
export interface ${Entity}Dao {
  findById(id: string): Promise<${Entity} | null>;
  insert(input: Create${Entity}Input): Promise<${Entity}>;
  update(id: string, input: Update${Entity}Input): Promise<${Entity}>;
}
`);

await writeFile(join(dir, 'mapper.ts'), `import type { Selectable } from 'kysely';
import type { ${pascal(table)}Table } from '@ltv/db';
import type { ${Entity} } from './object.js';

/**
 * Buc tuong duy nhat giua hinh dang BANG va hinh dang NGHIEP VU.
 * Doi ten cot trong database chi sua file nay.
 */
export function to${Entity}(row: Selectable<${pascal(table)}Table>): ${Entity} {
  return {
    id: row.id,
    // TODO: anh xa snake_case -> camelCase
  };
}
`);

await writeFile(join(dir, 'dao.ts'), `import { BaseDao } from '../base.dao.js';
import type { ${Entity}Dao } from './dao.interface.js';
import type { Create${Entity}Input, ${Entity}, Update${Entity}Input } from './object.js';
import { to${Entity} } from './mapper.js';

export class Kysely${Entity}Dao extends BaseDao implements ${Entity}Dao {
  async findById(id: string): Promise<${Entity} | null> {
    const row = await this.db
      .selectFrom('${table}').selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? to${Entity}(row) : null;
  }

  async insert(_input: Create${Entity}Input): Promise<${Entity}> {
    throw new Error('chua cai dat');
  }

  async update(_id: string, _input: Update${Entity}Input): Promise<${Entity}> {
    throw new Error('chua cai dat');
  }
}
`);

// Nhac dang ky vao DaoManager — khong tu sua de nguoi viet doc lai file do.
const managerPath = resolve(process.cwd(), 'src/dao/dao-manager.ts');
const manager = await readFile(managerPath, 'utf8');
const registered = manager.includes(`${camel(table)}:`);

process.stdout.write(`Da tao src/dao/${table}/ voi bon file.\n`);
if (!registered) {
  process.stdout.write(`
Con hai buoc thu cong trong src/dao/dao-manager.ts:
  1. interface AllDaos      them   readonly ${camel(table)}: ${Entity}Dao;
  2. function buildDaos     them   ${camel(table)}: new Kysely${Entity}Dao(db),
`);
}
