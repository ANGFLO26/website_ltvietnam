import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * TEST KIEN TRUC — ep bon luat tang tu dong.
 *
 * Kien truc do MAY canh, khong phu thuoc nguoi review nho luat.
 * Sai tang la BUILD DO, khong phai gop y luc review.
 *
 * Bon luat (doc/06 "Bon tang va luat di qua tang"):
 *   1. presentation KHONG duoc import infrastructure
 *   2. domain KHONG duoc import bat cu gi tu ba tang con lai
 *   3. Module A KHONG duoc import application/ hay infrastructure/ cua module B
 *      — chi duoc import ports/
 *   4. CHI infrastructure duoc import kysely va pg
 */

const SRC = resolve(import.meta.dirname, '../src');

interface SourceFile {
  readonly path: string; // duong dan tuong doi tu src/
  readonly imports: string[]; // moi chuoi trong import ... from '...'
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.ts') && !full.endsWith('.test.ts')) out.push(full);
  }
  return out;
}

const FILES: SourceFile[] = walk(SRC).map((full) => {
  const body = readFileSync(full, 'utf8');
  const imports = [...body.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)].map((m) => m[1]!);
  return { path: relative(SRC, full).replaceAll('\\', '/'), imports };
});

/** Chuan hoa duong dan import tuong doi ve duong dan tu src/. */
function resolveImport(fromPath: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null; // package ngoai
  const dir = join(SRC, fromPath, '..');
  return relative(SRC, resolve(dir, spec)).replaceAll('\\', '/');
}

const layerOf = (p: string): string | null => {
  const m = /(?:^|\/)(presentation|application|domain|infrastructure)(?:\/|$)/.exec(p);
  return m ? m[1]! : null;
};
const moduleOf = (p: string): string | null => {
  const m = /^modules\/([^/]+)\//.exec(p);
  return m ? m[1]! : null;
};

describe('Luat 1 — presentation khong duoc import infrastructure', () => {
  it('khong co vi pham', () => {
    const bad: string[] = [];
    for (const f of FILES) {
      if (layerOf(f.path) !== 'presentation') continue;
      for (const spec of f.imports) {
        const target = resolveImport(f.path, spec);
        if (target && layerOf(target) === 'infrastructure') bad.push(`${f.path} -> ${spec}`);
      }
    }
    expect(
      bad,
      `Controller phai di qua service, khong goi thang repository:\n${bad.join('\n')}`,
    ).toEqual([]);
  });
});

describe('Luat 2 — domain khong import gi tu ba tang con lai', () => {
  it('khong co vi pham', () => {
    const bad: string[] = [];
    for (const f of FILES) {
      if (layerOf(f.path) !== 'domain') continue;
      for (const spec of f.imports) {
        const target = resolveImport(f.path, spec);
        if (
          target &&
          ['application', 'infrastructure', 'presentation'].includes(layerOf(target) ?? '')
        ) {
          bad.push(`${f.path} -> ${spec}`);
        }
      }
    }
    expect(bad, `Domain phai thuan, khong biet HTTP/SQL/framework:\n${bad.join('\n')}`).toEqual([]);
  });

  it('domain khong import framework hay driver', () => {
    const banned = ['@nestjs/', 'kysely', 'pg', 'express'];
    const bad: string[] = [];
    for (const f of FILES) {
      if (layerOf(f.path) !== 'domain') continue;
      for (const spec of f.imports) {
        if (banned.some((b) => spec === b || spec.startsWith(b))) bad.push(`${f.path} -> ${spec}`);
      }
    }
    expect(bad, `Domain khong duoc phu thuoc framework:\n${bad.join('\n')}`).toEqual([]);
  });
});

describe('Luat 3 — module chi duoc cham ports/ cua module khac', () => {
  it('khong co vi pham', () => {
    const bad: string[] = [];
    for (const f of FILES) {
      const from = moduleOf(f.path);
      if (!from) continue;
      for (const spec of f.imports) {
        const target = resolveImport(f.path, spec);
        if (!target) continue;
        const to = moduleOf(target);
        if (!to || to === from) continue;
        if (!target.includes('/ports/')) bad.push(`${from} -> ${to}: ${target}`);
      }
    }
    expect(bad, `Module chi duoc giao tiep qua port:\n${bad.join('\n')}`).toEqual([]);
  });
});

describe('Luat 4 — chi infrastructure duoc import kysely va pg', () => {
  it('khong co vi pham', () => {
    const drivers = ['kysely', 'pg'];
    const bad: string[] = [];
    for (const f of FILES) {
      const layer = layerOf(f.path);
      if (layer === 'infrastructure') continue;
      for (const spec of f.imports) {
        if (drivers.includes(spec)) bad.push(`${f.path} -> ${spec} (tang ${layer ?? 'goc'})`);
      }
    }
    expect(bad, `Chi tang ha tang duoc biet driver:\n${bad.join('\n')}`).toEqual([]);
  });
});

describe('Hinh dang module', () => {
  it('moi module co dung mot file <ten>.module.ts', () => {
    const mods = new Map<string, number>();
    for (const f of FILES) {
      const m = moduleOf(f.path);
      if (m && /\.module\.ts$/.test(f.path)) mods.set(m, (mods.get(m) ?? 0) + 1);
    }
    for (const [name, count] of mods) expect(count, `module ${name}`).toBe(1);
    expect(mods.size).toBeGreaterThan(0);
  });

  it('khong co file nam thang trong modules/<ten>/ ngoai *.module.ts', () => {
    const bad = FILES.filter((f) => {
      const m = /^modules\/[^/]+\/([^/]+)$/.exec(f.path);
      return m && !m[1]!.endsWith('.module.ts');
    }).map((f) => f.path);
    expect(
      bad,
      `File phai nam trong presentation/application/domain/infrastructure:\n${bad.join('\n')}`,
    ).toEqual([]);
  });
});

describe('Bo quet hoat dong dung', () => {
  it('doc duoc file va tim thay import', () => {
    expect(FILES.length).toBeGreaterThan(5);
    expect(FILES.some((f) => f.imports.length > 0)).toBe(true);
  });

  it('phat hien duoc vi pham gia lap', () => {
    // Tu kiem: neu logic phat hien sai thi test nay se hong.
    const fake: SourceFile = {
      path: 'modules/x/presentation/x.controller.ts',
      imports: ['../infrastructure/x.repository.js'],
    };
    const target = resolveImport(fake.path, fake.imports[0]!);
    expect(layerOf(fake.path)).toBe('presentation');
    expect(layerOf(target!)).toBe('infrastructure');
  });
});
