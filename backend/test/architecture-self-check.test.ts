import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * TU KIEM BO QUET KIEN TRUC.
 *
 * Mot luat khong bao gio kich hoat con te hon khong co luat — no cho cam giac
 * an toan gia. Phep thu tiem loi da tung phat hien Luat 3 pass rong: regex bat
 * `dao.ts` khong bao gio khop vi import spec giu duoi `.js`.
 *
 * Cac test duoi kiem chinh BIEU THUC va HAM cua bo quet, khong sua file that.
 */
const ARCH = readFileSync(resolve(import.meta.dirname, './architecture.test.ts'), 'utf8');

describe('Bo quet phai bat duoc ca hai duoi .ts va .js', () => {
  it('Luat 3 bat ca dao.ts lan dao.js', () => {
    const re = /\^dao\\\/\[\^\/\]\+\\\/dao\\\.\(ts\|js\)\$/;
    expect(re.test(ARCH), 'Luat 3 phai bat ca hai duoi — xem git history vi sao').toBe(true);
  });

  it('bieu thuc Luat 3 khop dung duong dan da giai', () => {
    const rule = /^dao\/[^/]+\/dao\.(ts|js)$/;
    expect(rule.test('dao/users/dao.js')).toBe(true); // sau khi giai import spec
    expect(rule.test('dao/users/dao.ts')).toBe(true);
    expect(rule.test('dao/users/dao.interface.js')).toBe(false); // interface duoc phep
    expect(rule.test('dao/users/mapper.js')).toBe(false);
  });
});

describe('Bo quet phai bo qua comment', () => {
  const strip = (s: string): string =>
    s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

  it('khong bat chu trong comment khoi', () => {
    expect(strip('/** Tach khoi `UsersTable` cua Kysely */\nexport interface X {}')).not.toContain(
      'UsersTable',
    );
  });
  it('khong bat chu trong comment dong', () => {
    expect(strip('const a = 1; // dung Selectable<UsersTable>')).not.toContain('Selectable<');
  });
  it('KHONG xoa nham chuoi trong URL', () => {
    expect(strip("const u = 'https://a.com/x';")).toContain('https://a.com/x');
  });
});

describe('Bo quet co du sau luat', () => {
  it('co day du sau nhom luat', () => {
    for (const n of [1, 2, 3, 4, 5, 6]) {
      expect(ARCH, `thieu Luat ${n}`).toContain(`Luat ${n} —`);
    }
  });
});
