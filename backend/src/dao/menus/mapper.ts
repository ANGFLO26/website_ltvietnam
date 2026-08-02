import type { Selectable } from 'kysely';
import type { MenusTable, MenuItemsTable } from '@ltv/db';
import type {
  Menu,
  MenuItem,
  MenuItemNode,
  MenuLinkType,
  MenuLocation,
  MenuStatus,
} from './object.js';

export function toMenu(row: Selectable<MenusTable>): Menu {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    location: row.location as MenuLocation,
    status: row.status as MenuStatus,
  };
}

export function toMenuItem(row: Selectable<MenuItemsTable>): MenuItem {
  return {
    id: row.id,
    menuId: row.menu_id,
    parentId: row.parent_id,
    label: row.label,
    labelI18nKey: row.label_i18n_key,
    titleAttribute: row.title_attribute,
    linkType: row.link_type as MenuLinkType,
    linkTargetId: row.link_target_id,
    customUrl: row.custom_url,
    iconId: row.icon_id,
    openNewTab: row.open_new_tab,
    displayOrder: row.display_order,
    status: row.status as MenuStatus,
  };
}

/**
 * Dung cay trong BO NHO tu danh sach phang.
 *
 * Muc co `parent_id` tro toi mot muc KHONG nam trong danh sach (vi da bi an)
 * se bi BO, khong duoc nang len lam muc goc. An muc cha ma de muc con noi
 * len chan trang la sai y bien tap, va la kieu loi chi lo ra tren giao dien.
 */
export function buildMenuTree(items: readonly MenuItem[]): MenuItemNode[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const children = new Map<string | null, MenuItem[]>();

  for (const item of items) {
    // Cha khong con trong danh sach -> bo ca muc nay
    if (item.parentId !== null && !byId.has(item.parentId)) continue;
    const key = item.parentId;
    const list = children.get(key);
    if (list) list.push(item);
    else children.set(key, [item]);
  }

  const build = (parentId: string | null, depth: number): MenuItemNode[] => {
    // Chan de quy vo han neu du lieu co vong lap cha-con.
    // Rang buoc CHECK chi chan `parent_id = id`, khong chan vong dai hon.
    if (depth > 5) return [];
    return (children.get(parentId) ?? [])
      .sort((a, b) => a.displayOrder - b.displayOrder || a.label.localeCompare(b.label))
      .map((i) => ({ ...i, children: build(i.id, depth + 1) }));
  };

  return build(null, 0);
}
