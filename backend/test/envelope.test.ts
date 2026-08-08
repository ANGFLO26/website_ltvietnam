import { describe, expect, it } from 'vitest';
import { Readable } from 'node:stream';
import { StreamableFile } from '@nestjs/common';
import { boc } from '../src/shared/http/envelope.interceptor.js';
import { isPage, page } from '../src/shared/http/envelope.js';
import { toUserIdentityView, toUserView } from '../src/api/dto/user.view.js';
import type { User } from '../src/dao/users/object.js';

/**
 * Vo phan hoi `{ data, meta }`.
 *
 * Khong can database va khong can khoi dong Nest: `boc()` la mot ham thuan.
 * Tach no ra khoi lop interceptor chinh la de kiem duoc nhu vay — phan con lai
 * cua interceptor (doc metadata, noi vao rxjs) la day noi cua Nest, va phep
 * thu that cho no la `scripts/smoke-auth.mjs` tren HTTP that.
 */

describe('boc() — hinh dang phan hoi thanh cong', () => {
  it('mot tai nguyen -> { data: <tai nguyen> }', () => {
    expect(boc({ id: 'u1', name: 'Tai' })).toEqual({ data: { id: 'u1', name: 'Tai' } });
  });

  it('KHONG long them mot lop', () => {
    /**
     * Loi de xay ra nhat: controller tra `{ user: ... }` roi vo boc them thanh
     * `{ data: { user: ... } }`. Luat 10a chan o phia ma nguon; day la phia
     * hanh vi — `data` CHINH LA tai nguyen.
     */
    const ra = boc({ id: 'u1' }) as { data: Record<string, unknown> };
    expect(ra.data).not.toHaveProperty('data');
    expect(ra.data).not.toHaveProperty('user');
  });

  it('KHONG tra gi -> khong co than (day la cach nhan biet 204)', () => {
    expect(boc(undefined)).toBeUndefined();
  });

  it('`null` KHAC `undefined` — null la mot cau tra loi that', () => {
    /**
     * `undefined` = "khong co gi de noi" (204). `null` = "co cau tra loi, va no
     * la khong co" — vd chua co ban nhap nao. Gop hai cai lam mot thi endpoint
     * thu hai buoc phai tra 204, va frontend mat kha nang phan biet.
     */
    expect(boc(null)).toEqual({ data: null });
  });

  it('gia tri nguyen thuy van duoc boc', () => {
    expect(boc(0)).toEqual({ data: 0 });
    expect(boc(false)).toEqual({ data: false });
    expect(boc('')).toEqual({ data: '' });
  });

  it('mang van duoc boc — KHONG bao gio tra mang o goc', () => {
    /**
     * Tra mot mang JSON o goc phan hoi la thu khong the mo rong: them
     * `meta` sau nay la mot thay doi PHA VO hop dong. Voi `{ data: [...] }`
     * thi them `meta` chi la mot khoa moi.
     */
    expect(boc([1, 2])).toEqual({ data: [1, 2] });
  });
});

describe('boc() — tep va luong di THANG', () => {
  /**
   * `doc/06` co `GET /documents/:slug/download`. Neu vo boc mot `Buffer` thanh
   * `{ data: <Buffer> }` thi Nest tuan tu hoa thanh
   * `{"data":{"type":"Buffer","data":[37,80,68,70,...]}}` — tep PDF hong, va
   * hong theo kieu chi phat hien khi nguoi dung mo tep, khong phai khi test.
   */
  it('Buffer khong bi boc', () => {
    const b = Buffer.from('%PDF-1.7');
    expect(boc(b)).toBe(b);
  });

  it('StreamableFile khong bi boc', () => {
    const f = new StreamableFile(Buffer.from('x'));
    expect(boc(f)).toBe(f);
  });

  it('luong doc khong bi boc', () => {
    const s = Readable.from(['x']);
    expect(boc(s)).toBe(s);
  });

  it('mot doi tuong thuong CO truong ten `pipe` khong phai la luong', () => {
    // `pipe` phai la HAM moi duoc coi la luong; mot truong du lieu ten `pipe`
    // (vd cau hinh mot duong ong) van la du lieu va phai duoc boc.
    expect(boc({ pipe: 'noi-tiep' })).toEqual({ data: { pipe: 'noi-tiep' } });
  });
});

describe('page() — meta phan trang', () => {
  it('{ data, meta } voi items nam o data', () => {
    const ra = boc(page(['a', 'b'], { page: 1, pageSize: 20, totalItems: 2 }));
    expect(ra).toEqual({
      data: ['a', 'b'],
      meta: { page: 1, page_size: 20, total_items: 2, total_pages: 1 },
    });
  });

  it('total_pages do page() TINH, khong do noi goi truyen', () => {
    /**
     * 32 endpoint = 32 co hoi chia sai. Sai lech mot trang o cuoi danh sach la
     * loai loi khong ai bao cao: nguoi dung thay "trang cuoi rong" roi bo qua.
     */
    const m = page([], { page: 3, pageSize: 20, totalItems: 41 }).meta;
    expect(m.total_pages).toBe(3);
  });

  it('rong -> total_pages: 0, KHONG phai 1', () => {
    // "Co 1 trang" ma trang do rong la mot cau noi doi nho. Bat bien duoc giu:
    // total_pages * page_size >= total_items.
    const m = page([], { page: 1, pageSize: 20, totalItems: 0 }).meta;
    expect(m.total_pages).toBe(0);
    expect(m.total_pages * m.page_size).toBeGreaterThanOrEqual(m.total_items);
  });

  it('pageSize = 0 khong lam chia cho khong', () => {
    // `Math.ceil(5/0)` la `Infinity`, va `Infinity` di ra JSON thanh `null`.
    const m = page([], { page: 1, pageSize: 0, totalItems: 5 }).meta;
    expect(Number.isFinite(m.total_pages)).toBe(true);
    expect(m.page_size).toBe(1);
  });

  it('dau trang la SYMBOL nen khong lo ra JSON', () => {
    /**
     * Neu dau nhan la mot truong thuong (`isPage: true`) thi no se xuat hien
     * trong phan hoi khi mot cho nao do quen boc. Khoa symbol thi
     * `JSON.stringify` bo qua.
     */
    const p = page(['a'], { page: 1, pageSize: 10, totalItems: 1 });
    expect(JSON.parse(JSON.stringify(p))).toEqual({
      items: ['a'],
      meta: { page: 1, page_size: 10, total_items: 1, total_pages: 1 },
    });
  });

  it('du lieu that co truong `items` KHONG bi nham la trang', () => {
    /**
     * Day la ly do dung symbol thay vi kiem `'items' in value`. Mot the loai co
     * truong `items` (vd mot menu) se bi hieu thanh phan trang, va `meta` bien
     * mat cung voi nua du lieu.
     */
    const gia = { items: ['a'], meta: { page: 1 } };
    expect(isPage(gia)).toBe(false);
    expect(boc(gia)).toEqual({ data: gia });
  });
});

describe('UserView — loc truong noi bo', () => {
  const u: User = {
    id: 'u1',
    name: 'Quan tri',
    email: 'admin@ltvietnam.local',
    role: 'admin',
    status: 'active',
    lastLoginAt: new Date('2026-08-08T03:00:00.000Z'),
    passwordChangedAt: new Date('2026-08-01T00:00:00.000Z'),
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
  };

  it('KHONG lo passwordChangedAt va status', () => {
    /**
     * Van de so 9 cua `doc/13`. Ca hai khong phai bi mat, nhung chung ke ve co
     * che ben trong: dau moi cua viec thu hoi phien, va viec tai khoan co the
     * bi `locked`. Khong ai can chung o `/auth/me`.
     */
    const v = toUserView(u) as Record<string, unknown>;
    expect(v).not.toHaveProperty('passwordChangedAt');
    expect(v).not.toHaveProperty('password_changed_at');
    expect(v).not.toHaveProperty('status');
    expect(v).not.toHaveProperty('createdAt');
  });

  it('chi dung snake_case', () => {
    for (const k of Object.keys(toUserView(u))) expect(k).not.toMatch(/[A-Z]/);
  });

  it('ngay thanh chuoi ISO, khong phai doi tuong Date', () => {
    expect(toUserView(u).last_login_at).toBe('2026-08-08T03:00:00.000Z');
  });

  it('chua bao gio dang nhap -> null', () => {
    expect(toUserView({ ...u, lastLoginAt: null }).last_login_at).toBeNull();
  });

  it('view cua dang nhap CAT truong thua thay vi doan gia tri', () => {
    /**
     * `login` khong doc `lastLoginAt`, nen no tra `UserIdentityView` — khong co
     * truong do. Ban dau toi de mot kieu duy nhat va dien `last_login_at: null`;
     * do la noi doi, vi `null` trong hop dong nay nghia la "chua bao gio dang
     * nhap" va nguoi vua dang nhap thi khong the chua bao gio dang nhap.
     */
    const v = toUserIdentityView({ ...u, xxx: 'thua' } as never) as Record<string, unknown>;
    expect(Object.keys(v).sort()).toEqual(['email', 'id', 'name', 'role']);
  });
});
