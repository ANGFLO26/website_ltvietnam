import { describe, expect, it, vi } from 'vitest';
import { adminHomepageSettingsIssues } from '@ltv/contracts';
import { bannerSchema, menuItemSchema, officeSchema } from '../src/api/dto/admin-site.dto.js';
import type { MenuItem } from '../src/dao/menus/object.js';
import { AdminSiteServiceImpl } from '../src/services/admin-site/service.js';
import { TtlCache } from '../src/shared/cache.js';

const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const item = (n: number, parentId: string | null = null): MenuItem => ({
  id: id(n),
  menuId: id(99),
  parentId,
  label: `Muc ${n}`,
  labelI18nKey: null,
  titleAttribute: null,
  linkType: 'none',
  linkTargetId: null,
  customUrl: null,
  iconId: null,
  openNewTab: false,
  displayOrder: n,
  status: 'active',
});

describe('A4 admin invariants', () => {
  it('homepage chi nhan allowlist va mien gia tri da cong bo', () => {
    expect(adminHomepageSettingsIssues('hero', { limit: 5, autoplay_ms: 6000 })).toEqual([]);
    expect(adminHomepageSettingsIssues('hero', { raw_html: '<script />' })).toHaveLength(1);
    expect(adminHomepageSettingsIssues('posts', { limit: 25 })).toHaveLength(1);
  });

  it('DTO chan link chet, URL khong an toan va toa do le', () => {
    expect(
      bannerSchema.safeParse({ image_id: id(1), title: 'Banner', link_type: 'product' }).success,
    ).toBe(false);
    expect(
      menuItemSchema.safeParse({
        label: 'X',
        link_type: 'custom_url',
        custom_url: 'javascript:alert(1)',
      }).success,
    ).toBe(false);
    expect(
      officeSchema.safeParse({
        office_type: 'branch',
        name: 'CN',
        address: 'Dia chi',
        latitude: 10,
      }).success,
    ).toBe(false);
  });

  it('menu khong cho tao vong, vuot hai cap hoac reorder thieu muc', async () => {
    const rows = [item(1), item(2, id(1)), item(3)];
    const menus = {
      findById: vi.fn(async () => ({
        id: id(99),
        code: 'main',
        name: 'Main',
        location: 'header',
        status: 'active',
      })),
      listItems: vi.fn(async () => rows),
      findItemById: vi.fn(async () => rows[0]),
      updateItem: vi.fn(),
      reorderItems: vi.fn(),
    };
    const service = new AdminSiteServiceImpl(
      {
        menus,
        transaction: async (fn: (tx: { menus: typeof menus }) => unknown) => fn({ menus }),
      } as never,
      {} as never,
      {} as never,
    );
    await expect(service.updateMenuItem(id(1), { parentId: id(1) })).rejects.toMatchObject({
      code: 'MENU_CYCLE',
    });
    await expect(service.updateMenuItem(id(3), { parentId: id(2) })).rejects.toMatchObject({
      code: 'MENU_DEPTH_EXCEEDED',
    });
    await expect(service.reorderMenu(id(99), [id(1), id(2)])).rejects.toMatchObject({
      code: 'MENU_REORDER_INVALID_SET',
    });
  });

  it('mutation homepage vo hieu hoa home cache nhung giu nav cache', async () => {
    const cache = new TtlCache(60_000);
    await cache.lay('home:vi', async () => 'old-home');
    await cache.lay('nav:header:vi', async () => 'old-nav');
    const homepageSections = {
      upsert: vi.fn(async () => ({
        id: id(50),
        sectionType: 'hero',
        isEnabled: true,
        displayOrder: 0,
        settings: { limit: 5 },
      })),
    };
    const service = new AdminSiteServiceImpl(
      { homepageSections } as never,
      {} as never,
      {} as never,
      cache,
    );
    await service.updateHomepage({
      sectionType: 'hero',
      isEnabled: true,
      displayOrder: 0,
      settings: { limit: 5 },
    });
    expect(await cache.lay('home:vi', async () => 'new-home')).toBe('new-home');
    expect(await cache.lay('nav:header:vi', async () => 'new-nav')).toBe('old-nav');
  });
});
