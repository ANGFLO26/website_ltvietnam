import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { loadMigrations, validateHistory, MigrationError } from './migration-runner.js';

const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

let dir: string;
async function put(name: string, body: string): Promise<void> {
  await writeFile(join(dir, name), body, 'utf8');
}

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mig-'));
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('loadMigrations — kiem bo file truoc khi cham database', () => {
  it('doc duoc bo file hop le va tinh checksum', async () => {
    await put('001_a.up.sql', 'CREATE TABLE a();');
    await put('001_a.down.sql', 'DROP TABLE a;');
    await put('002_b.up.sql', 'CREATE TABLE b();');
    await put('002_b.down.sql', 'DROP TABLE b;');
    const m = await loadMigrations(dir);
    expect(m).toHaveLength(2);
    expect(m[0]!.id).toBe('001');
    expect(m[0]!.checksum).toBe(sha('CREATE TABLE a();'));
    expect(m[1]!.nonTransactional).toBe(false);
  });

  it('TU CHOI khi thieu file down', async () => {
    await put('003_c.up.sql', 'CREATE TABLE c();');
    await expect(loadMigrations(dir)).rejects.toThrow(/thieu file down/);
    await rm(join(dir, '003_c.up.sql'));
  });

  it('TU CHOI khi so thu tu nhay coc', async () => {
    await put('005_e.up.sql', 'CREATE TABLE e();');
    await put('005_e.down.sql', 'DROP TABLE e;');
    await expect(loadMigrations(dir)).rejects.toThrow(/khong lien tuc/);
    await rm(join(dir, '005_e.up.sql'));
    await rm(join(dir, '005_e.down.sql'));
  });

  it('TU CHOI ten file sai dinh dang', async () => {
    await put('khong-co-so.up.sql', 'SELECT 1;');
    await expect(loadMigrations(dir)).rejects.toThrow(/sai dinh dang/);
    await rm(join(dir, 'khong-co-so.up.sql'));
  });

  it('nhan dien DDL khong chay duoc trong transaction', async () => {
    await put('003_idx.up.sql', 'CREATE INDEX CONCURRENTLY i ON a(x);');
    await put('003_idx.down.sql', 'DROP INDEX i;');
    const m = await loadMigrations(dir);
    expect(m.find((x) => x.id === '003')!.nonTransactional).toBe(true);
    await rm(join(dir, '003_idx.up.sql'));
    await rm(join(dir, '003_idx.down.sql'));
  });
});

describe('validateHistory — fail closed voi moi bat thuong', () => {
  const migs = [
    {
      id: '001',
      name: 'a',
      checksum: 'aa',
      upPath: '',
      downPath: '',
      upSql: '',
      downSql: '',
      nonTransactional: false,
    },
    {
      id: '002',
      name: 'b',
      checksum: 'bb',
      upPath: '',
      downPath: '',
      upSql: '',
      downSql: '',
      nonTransactional: false,
    },
    {
      id: '003',
      name: 'c',
      checksum: 'cc',
      upPath: '',
      downPath: '',
      upSql: '',
      downSql: '',
      nonTransactional: false,
    },
  ];
  const applied = (...ids: [string, string][]) =>
    ids.map(([id, checksum]) => ({ id, name: '', checksum, appliedAt: new Date() }));

  it('lich su rong -> tat ca deu con phai chay', () => {
    expect(validateHistory(migs, [])).toHaveLength(3);
  });

  it('tien to hop le -> tra ve phan con lai', () => {
    expect(validateHistory(migs, applied(['001', 'aa']))).toHaveLength(2);
  });

  it('da chay het -> khong con gi', () => {
    expect(
      validateHistory(migs, applied(['001', 'aa'], ['002', 'bb'], ['003', 'cc'])),
    ).toHaveLength(0);
  });

  it('CHECKSUM LECH -> tu choi (file da apply bi sua)', () => {
    expect(() => validateHistory(migs, applied(['001', 'DA_BI_SUA']))).toThrow(
      /da doi sau khi apply/,
    );
  });

  it('MIGRATION LA trong lich su -> tu choi', () => {
    expect(() => validateHistory(migs, applied(['099', 'zz']))).toThrow(
      /khong ton tai trong thu muc/,
    );
  });

  it('SAI THU TU -> tu choi', () => {
    expect(() => validateHistory(migs, applied(['002', 'bb']))).toThrow(/tien to lien tuc/);
  });

  it('CO LO HONG giua chung -> tu choi', () => {
    expect(() => validateHistory(migs, applied(['001', 'aa'], ['003', 'cc']))).toThrow(
      /tien to lien tuc/,
    );
  });

  it('nem dung loai loi kem ma', () => {
    try {
      validateHistory(migs, applied(['001', 'SAI']));
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(MigrationError);
      expect((e as MigrationError).code).toBe('CHECKSUM_MISMATCH');
    }
  });
});
