import { BaseDao } from '../base.dao.js';
import type { MenuDao } from './dao.interface.js';
import type {
  CreateMenuInput,
  Menu,
  MenuItem,
  MenuLocation,
  MenuTree,
  UpsertMenuItemInput,
  UpdateMenuInput,
} from './object.js';
import { buildMenuTree, toMenu, toMenuItem } from './mapper.js';

export class KyselyMenuDao extends BaseDao implements MenuDao {
  async findById(id: string): Promise<Menu | null> {
    const row = await this.db
      .selectFrom('menus')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? toMenu(row) : null;
  }

  async findByCode(code: string): Promise<Menu | null> {
    const row = await this.db
      .selectFrom('menus')
      .selectAll()
      .where('code', '=', code)
      .executeTakeFirst();
    return row ? toMenu(row) : null;
  }

  async listAll(): Promise<Menu[]> {
    const rows = await this.db
      .selectFrom('menus')
      .selectAll()
      .orderBy('location')
      .orderBy('code')
      .execute();
    return rows.map(toMenu);
  }

  async insert(input: CreateMenuInput): Promise<Menu> {
    const row = await this.db
      .insertInto('menus')
      .values({
        code: input.code,
        name: input.name,
        location: input.location,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return toMenu(row);
  }

  async update(id: string, input: UpdateMenuInput): Promise<Menu> {
    const row = await this.db
      .updateTable('menus')
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.location !== undefined && { location: input.location }),
        ...(input.status !== undefined && { status: input.status }),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
    return toMenu(row);
  }

  async delete(id: string): Promise<void> {
    // `menu_items.menu_id` la CASCADE — muc con di theo menu.
    await this.db.deleteFrom('menus').where('id', '=', id).execute();
  }

  async findTreeByCode(code: string): Promise<MenuTree | null> {
    const m = await this.db
      .selectFrom('menus')
      .selectAll()
      .where('code', '=', code)
      .where('status', '=', 'active')
      .executeTakeFirst();
    if (!m) return null;

    const rows = await this.db
      .selectFrom('menu_items')
      .selectAll()
      .where('menu_id', '=', m.id)
      .where('status', '=', 'active')
      .orderBy('display_order')
      .execute();

    return { menu: toMenu(m), items: buildMenuTree(rows.map(toMenuItem)) };
  }

  /**
   * Nhieu menu cung luc bang HAI truy van, khong phai hai truy van moi menu.
   * Chan trang can bon menu — vong lap goi `findTreeByCode` bon lan la tam
   * cau, va do la N+1 o quy mo nho.
   */
  async findTreesByLocations(locations: readonly MenuLocation[]): Promise<MenuTree[]> {
    if (locations.length === 0) return [];

    const menus = await this.db
      .selectFrom('menus')
      .selectAll()
      .where('location', 'in', [...locations])
      .where('status', '=', 'active')
      .orderBy('location')
      .execute();
    if (menus.length === 0) return [];

    const items = await this.db
      .selectFrom('menu_items')
      .selectAll()
      .where(
        'menu_id',
        'in',
        menus.map((m) => m.id),
      )
      .where('status', '=', 'active')
      .orderBy('display_order')
      .execute();

    const byMenu = new Map<string, MenuItem[]>();
    for (const row of items) {
      const item = toMenuItem(row);
      const list = byMenu.get(item.menuId);
      if (list) list.push(item);
      else byMenu.set(item.menuId, [item]);
    }

    return menus.map((m) => ({
      menu: toMenu(m),
      items: buildMenuTree(byMenu.get(m.id) ?? []),
    }));
  }

  async listItems(menuId: string): Promise<MenuItem[]> {
    const rows = await this.db
      .selectFrom('menu_items')
      .selectAll()
      .where('menu_id', '=', menuId)
      .orderBy('display_order')
      .orderBy('label')
      .execute();
    return rows.map(toMenuItem);
  }

  async findItemById(id: string): Promise<MenuItem | null> {
    const row = await this.db
      .selectFrom('menu_items')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? toMenuItem(row) : null;
  }

  async insertItem(menuId: string, input: UpsertMenuItemInput): Promise<MenuItem> {
    const row = await this.db
      .insertInto('menu_items')
      .values({
        menu_id: menuId,
        parent_id: input.parentId ?? null,
        label: input.label,
        label_i18n_key: input.labelI18nKey ?? null,
        title_attribute: input.titleAttribute ?? null,
        link_type: input.linkType,
        link_target_id: input.linkTargetId ?? null,
        custom_url: input.customUrl ?? null,
        icon_id: input.iconId ?? null,
        open_new_tab: input.openNewTab ?? false,
        display_order: input.displayOrder ?? 0,
        status: input.status ?? 'active',
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return toMenuItem(row);
  }

  async updateItem(id: string, input: Partial<UpsertMenuItemInput>): Promise<MenuItem> {
    const row = await this.db
      .updateTable('menu_items')
      .set({
        ...(input.parentId !== undefined && { parent_id: input.parentId }),
        ...(input.label !== undefined && { label: input.label }),
        ...(input.labelI18nKey !== undefined && { label_i18n_key: input.labelI18nKey }),
        ...(input.titleAttribute !== undefined && { title_attribute: input.titleAttribute }),
        ...(input.linkType !== undefined && { link_type: input.linkType }),
        ...(input.linkTargetId !== undefined && { link_target_id: input.linkTargetId }),
        ...(input.customUrl !== undefined && { custom_url: input.customUrl }),
        ...(input.iconId !== undefined && { icon_id: input.iconId }),
        ...(input.openNewTab !== undefined && { open_new_tab: input.openNewTab }),
        ...(input.displayOrder !== undefined && { display_order: input.displayOrder }),
        ...(input.status !== undefined && { status: input.status }),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
    return toMenuItem(row);
  }

  async deleteItem(id: string): Promise<void> {
    await this.db.deleteFrom('menu_items').where('id', '=', id).execute();
  }

  async reorderItems(menuId: string, itemIds: readonly string[]): Promise<void> {
    for (let order = 0; order < itemIds.length; order += 1) {
      await this.db
        .updateTable('menu_items')
        .set({ display_order: order })
        .where('menu_id', '=', menuId)
        .where('id', '=', itemIds[order]!)
        .execute();
    }
  }

  /**
   * Thay toan bo muc cua menu.
   *
   * PHAI chay trong transaction — nguoi goi lay DAO nay tu `tx` nen dieu do
   * duoc bao dam boi cach goi.
   *
   * Thu tu ba buoc la co y:
   *   1. xoa het muc cu (CASCADE tu don ca lien ket cha-con cu)
   *   2. ghi muc GOC truoc, giu nguyen `id` do nguoi goi gui
   *   3. ghi muc CON sau, khi cha da ton tai
   * Ghi lan lon thi khoa ngoai `parent_id` tro toi hang chua co va DB tu choi.
   */
  async replaceItems(menuId: string, items: readonly UpsertMenuItemInput[]): Promise<void> {
    await this.db.deleteFrom('menu_items').where('menu_id', '=', menuId).execute();
    if (items.length === 0) return;

    const roots = items.filter((i) => (i.parentId ?? null) === null);
    const children = items.filter((i) => (i.parentId ?? null) !== null);

    const toRow = (i: UpsertMenuItemInput, order: number) => ({
      ...(i.id !== undefined && { id: i.id }),
      menu_id: menuId,
      parent_id: i.parentId ?? null,
      label: i.label,
      label_i18n_key: i.labelI18nKey ?? null,
      title_attribute: i.titleAttribute ?? null,
      link_type: i.linkType,
      link_target_id: i.linkTargetId ?? null,
      custom_url: i.customUrl ?? null,
      icon_id: i.iconId ?? null,
      ...(i.openNewTab !== undefined && { open_new_tab: i.openNewTab }),
      display_order: i.displayOrder ?? order,
      ...(i.status !== undefined && { status: i.status }),
    });

    if (roots.length > 0) {
      await this.db
        .insertInto('menu_items')
        .values(roots.map((i, n) => toRow(i, n)))
        .execute();
    }
    if (children.length > 0) {
      await this.db
        .insertInto('menu_items')
        .values(children.map((i, n) => toRow(i, n)))
        .execute();
    }
  }
}
