'use client';

import type {
  AdminMenuItemView,
  AdminMenuLinkType,
  AdminMenuLocation,
  AdminMenuView,
  AdminSettingView,
} from '@ltv/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus, Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { useUnsavedChanges } from '@/lib/use-unsaved-changes';
import type { OperationOption } from './options.server';
import {
  addMenuItem,
  createMenu,
  operationKeys,
  reorderMenu,
  updateMenu,
  updateMenuItem,
  updateSettingGroup,
} from './api';

const LOCATIONS: Readonly<Record<AdminMenuLocation, string>> = {
  header: 'Header desktop',
  mobile: 'Menu mobile',
  footer_company: 'Footer · Công ty',
  footer_products: 'Footer · Sản phẩm',
  footer_services: 'Footer · Dịch vụ',
  footer_legal: 'Footer · Pháp lý',
};
const LINKS: Readonly<Record<AdminMenuLinkType, string>> = {
  none: 'Nhóm / không liên kết',
  custom_url: 'URL tùy chỉnh',
  page: 'Trang nội dung',
  product_category: 'Danh mục sản phẩm',
  brand: 'Thương hiệu',
  service: 'Dịch vụ',
  post_category: 'Danh mục bài viết',
  product: 'Sản phẩm',
  post: 'Bài viết',
};
type ItemForm = {
  id: string | null;
  parent_id: string;
  label: string;
  link_type: AdminMenuLinkType;
  link_target_id: string;
  custom_url: string;
  open_new_tab: boolean;
  status: 'active' | 'hidden';
};
const emptyItem = (): ItemForm => ({
  id: null,
  parent_id: '',
  label: '',
  link_type: 'none',
  link_target_id: '',
  custom_url: '',
  open_new_tab: false,
  status: 'active',
});

export function MenuManager({
  initial,
  targets,
  companySettings,
}: {
  readonly initial: readonly AdminMenuView[];
  readonly targets: Readonly<Record<string, readonly OperationOption[]>>;
  readonly companySettings: readonly AdminSettingView[];
}) {
  const [menus, setMenus] = useState([...initial]);
  const [selectedId, setSelectedId] = useState(initial[0]?.id ?? '');
  const [creatingMenu, setCreatingMenu] = useState(false);
  const [menuCode, setMenuCode] = useState('');
  const [menuName, setMenuName] = useState('');
  const [menuLocation, setMenuLocation] = useState<AdminMenuLocation>('header');
  const [item, setItem] = useState<ItemForm>(emptyItem);
  const toast = useToast();
  const qc = useQueryClient();
  const selected = menus.find((x) => x.id === selectedId) ?? null;
  const itemBaseline = item.id
    ? selected?.items.find((candidate) => candidate.id === item.id)
    : null;
  useUnsavedChanges(
    (creatingMenu && Boolean(menuCode || menuName || menuLocation !== 'header')) ||
      JSON.stringify(item) !== JSON.stringify(itemBaseline ? fromItem(itemBaseline) : emptyItem()),
  );
  const roots = selected?.items.filter((x) => x.parent_id === null && x.id !== item.id) ?? [];
  const ordered = useMemo(() => (selected ? flatten(selected.items) : []), [selected]);
  const syncMenu = (id: string, patch: Partial<AdminMenuView>) =>
    setMenus((current) => current.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const create = useMutation({
    mutationFn: () => createMenu({ code: menuCode, name: menuName, location: menuLocation }),
    onSuccess: (value) => {
      const menu = { ...value, items: value.items ?? [] };
      setMenus((current) => [...current, menu]);
      setSelectedId(menu.id);
      setCreatingMenu(false);
      setMenuCode('');
      setMenuName('');
      toast.show('Đã tạo menu.', 'success');
    },
    onError: errorToast(toast),
  });
  const saveMenu = useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      location?: AdminMenuLocation;
      status?: 'active' | 'hidden';
    }) => updateMenu(id, body),
    onSuccess: (value) => {
      syncMenu(value.id, value);
      toast.show('Đã cập nhật menu.', 'success');
    },
    onError: errorToast(toast),
  });
  const saveItem = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('Hãy chọn menu.');
      const body = {
        parent_id: item.parent_id || null,
        label: item.label,
        link_type: item.link_type,
        link_target_id: isInternal(item.link_type) ? item.link_target_id || null : null,
        custom_url: item.link_type === 'custom_url' ? item.custom_url || null : null,
        open_new_tab: item.open_new_tab,
        status: item.status,
      };
      return item.id ? updateMenuItem(item.id, body) : addMenuItem(selected.id, body);
    },
    onSuccess: (value) => {
      if (selected)
        syncMenu(selected.id, {
          items: [value, ...selected.items.filter((x) => x.id !== value.id)],
        });
      setItem(emptyItem());
      void qc.invalidateQueries({ queryKey: operationKeys.menus });
      toast.show('Đã lưu mục menu.', 'success');
    },
    onError: errorToast(toast),
  });
  const reorder = useMutation({
    mutationFn: (ids: readonly string[]) =>
      selected ? reorderMenu(selected.id, ids) : Promise.reject(new Error('Hãy chọn menu.')),
    onSuccess: (items) => {
      if (selected) syncMenu(selected.id, { items });
      toast.show('Đã đổi thứ tự menu.', 'success');
    },
    onError: errorToast(toast),
  });
  const move = (index: number, by: number) => {
    const next = [...ordered];
    const target = index + by;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    reorder.mutate(next.map((x) => x.id));
  };
  return (
    <>
      <div className="menu-workspace">
        <aside className="panel menu-list">
          <div className="operation-card__heading">
            <div>
              <h2>Các menu</h2>
              <p>Chọn vị trí cần biên tập</p>
            </div>
            <Button
              variant="secondary"
              icon={<Plus size={16} />}
              onClick={() => setCreatingMenu(true)}
            >
              Mới
            </Button>
          </div>
          {creatingMenu ? (
            <div className="menu-create">
              <Field
                label="Mã menu"
                placeholder="header_main"
                value={menuCode}
                onChange={(e) => setMenuCode(e.target.value)}
              />
              <Field label="Tên" value={menuName} onChange={(e) => setMenuName(e.target.value)} />
              <Select
                label="Vị trí"
                value={menuLocation}
                onChange={(e) => setMenuLocation(e.target.value as AdminMenuLocation)}
              >
                {Object.entries(LOCATIONS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Button loading={create.isPending} onClick={() => create.mutate()}>
                Tạo menu
              </Button>
            </div>
          ) : null}
          <div className="menu-list__items">
            {menus.map((menu) => (
              <button
                key={menu.id}
                type="button"
                className={menu.id === selectedId ? 'is-active' : ''}
                onClick={() => {
                  setSelectedId(menu.id);
                  setItem(emptyItem());
                }}
              >
                <span>
                  <strong>{menu.name}</strong>
                  <small>{LOCATIONS[menu.location]}</small>
                </span>
                <StatusBadge tone={menu.status === 'active' ? 'success' : 'warning'}>
                  {menu.status}
                </StatusBadge>
              </button>
            ))}
          </div>
        </aside>
        <section className="panel operation-card">
          {selected ? (
            <>
              <div className="operation-card__heading">
                <div>
                  <h2>{selected.name}</h2>
                  <p>{LOCATIONS[selected.location]} · tối đa 2 cấp</p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() =>
                    saveMenu.mutate({
                      id: selected.id,
                      status: selected.status === 'active' ? 'hidden' : 'active',
                    })
                  }
                >
                  {selected.status === 'active' ? 'Ẩn menu' : 'Kích hoạt'}
                </Button>
              </div>
              <div className="menu-items">
                {ordered.map((row, index) => (
                  <div key={row.id} className={`menu-item-row ${row.parent_id ? 'is-child' : ''}`}>
                    <button
                      type="button"
                      className="menu-item-row__label"
                      onClick={() => setItem(fromItem(row))}
                    >
                      <strong>{row.label}</strong>
                      <small>
                        {LINKS[row.link_type]} · {row.status}
                      </small>
                    </button>
                    <div>
                      <Button
                        variant="ghost"
                        aria-label="Đưa lên"
                        disabled={index === 0 || reorder.isPending}
                        onClick={() => move(index, -1)}
                        icon={<ArrowUp size={16} />}
                      />
                      <Button
                        variant="ghost"
                        aria-label="Đưa xuống"
                        disabled={index === ordered.length - 1 || reorder.isPending}
                        onClick={() => move(index, 1)}
                        icon={<ArrowDown size={16} />}
                      />
                    </div>
                  </div>
                ))}
                {ordered.length === 0 ? (
                  <p className="operation-note">Menu chưa có mục nào.</p>
                ) : null}
              </div>
              <div className="menu-item-form">
                <h3>{item.id ? 'Chỉnh sửa mục menu' : 'Thêm mục menu'}</h3>
                <div className="form-grid form-grid--two">
                  <Field
                    label="Nhãn hiển thị"
                    required
                    value={item.label}
                    onChange={(e) => setItem({ ...item, label: e.target.value })}
                  />
                  <Select
                    label="Mục cha"
                    description="Chỉ chọn mục cấp 1; hệ thống không cho tạo vòng lặp."
                    value={item.parent_id}
                    onChange={(e) => setItem({ ...item, parent_id: e.target.value })}
                  >
                    <option value="">Cấp 1</option>
                    {roots.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.label}
                      </option>
                    ))}
                  </Select>
                  <Select
                    label="Loại liên kết"
                    value={item.link_type}
                    onChange={(e) =>
                      setItem({
                        ...item,
                        link_type: e.target.value as AdminMenuLinkType,
                        link_target_id: '',
                        custom_url: '',
                      })
                    }
                  >
                    {Object.entries(LINKS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                  {isInternal(item.link_type) ? (
                    <Select
                      label="Đích liên kết"
                      value={item.link_target_id}
                      onChange={(e) => setItem({ ...item, link_target_id: e.target.value })}
                    >
                      <option value="">Chọn nội dung…</option>
                      {(targets[item.link_type] ?? []).map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.label}
                        </option>
                      ))}
                    </Select>
                  ) : item.link_type === 'custom_url' ? (
                    <Field
                      label="URL đích"
                      value={item.custom_url}
                      onChange={(e) => setItem({ ...item, custom_url: e.target.value })}
                    />
                  ) : (
                    <div className="operation-note">
                      Dùng làm nhóm menu, không dẫn tới trang khác.
                    </div>
                  )}
                </div>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={item.open_new_tab}
                    onChange={(e) => setItem({ ...item, open_new_tab: e.target.checked })}
                  />
                  <span>Mở trong tab mới</span>
                </label>
                <div className="operation-actions">
                  <Button
                    loading={saveItem.isPending}
                    icon={<Save size={16} />}
                    onClick={() => saveItem.mutate()}
                  >
                    Lưu mục
                  </Button>
                  {item.id ? (
                    <Button variant="ghost" onClick={() => setItem(emptyItem())}>
                      Hủy sửa
                    </Button>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <p>Chưa có menu. Hãy tạo menu đầu tiên.</p>
          )}
        </section>
      </div>
      {selected?.location.startsWith('footer_') ? (
        <FooterCompanySettings settings={companySettings} />
      ) : null}
    </>
  );
}

function FooterCompanySettings({ settings }: { readonly settings: readonly AdminSettingView[] }) {
  const [baseline, setBaseline] = useState(settings);
  const [values, setValues] = useState(() =>
    Object.fromEntries(settings.map((x) => [x.key, x.masked ? '' : (x.value ?? '')])),
  );
  const changed = footerSettingsPatch(baseline, values);
  useUnsavedChanges(Object.keys(changed).length > 0);
  const toast = useToast();
  const save = useMutation({
    mutationFn: () => {
      if (Object.keys(changed).length === 0) throw new Error('Chưa có thay đổi để lưu.');
      return updateSettingGroup('company', changed);
    },
    onSuccess: (updated) => {
      setBaseline(updated);
      setValues(
        Object.fromEntries(
          updated.map((setting) => [setting.key, setting.masked ? '' : (setting.value ?? '')]),
        ),
      );
      toast.show('Đã lưu thông tin công ty ở footer.', 'success');
    },
    onError: errorToast(toast),
  });
  return (
    <section className="panel operation-card footer-company">
      <div className="operation-card__heading">
        <div>
          <h2>Thông tin công ty ở footer</h2>
          <p>Menu footer và thông tin liên hệ được chỉnh ngay trong cùng luồng.</p>
        </div>
      </div>
      <div className="form-grid form-grid--two">
        {settings.map((setting) => (
          <Field
            key={setting.id}
            label={setting.key.replaceAll('_', ' ')}
            type={setting.masked ? 'password' : 'text'}
            placeholder={setting.masked ? 'Để trống để giữ nguyên' : undefined}
            value={values[setting.key] ?? ''}
            onChange={(e) => setValues({ ...values, [setting.key]: e.target.value })}
          />
        ))}
      </div>
      <Button loading={save.isPending} icon={<Save size={16} />} onClick={() => save.mutate()}>
        Lưu thông tin footer
      </Button>
    </section>
  );
}
function footerSettingsPatch(
  settings: readonly AdminSettingView[],
  values: Readonly<Record<string, string>>,
) {
  return Object.fromEntries(
    settings.flatMap((setting) => {
      const value = values[setting.key] ?? '';
      if (setting.masked) return value && value !== '********' ? [[setting.key, value]] : [];
      return value !== (setting.value ?? '') ? [[setting.key, value || null]] : [];
    }),
  );
}
function flatten(items: readonly AdminMenuItemView[]): AdminMenuItemView[] {
  const roots = items.filter((x) => x.parent_id === null).sort(byOrder);
  return roots.flatMap((root) => [
    root,
    ...items.filter((x) => x.parent_id === root.id).sort(byOrder),
  ]);
}
function byOrder(a: AdminMenuItemView, b: AdminMenuItemView) {
  return a.display_order - b.display_order;
}
function isInternal(type: AdminMenuLinkType) {
  return type !== 'none' && type !== 'custom_url';
}
function fromItem(x: AdminMenuItemView): ItemForm {
  return {
    id: x.id,
    parent_id: x.parent_id ?? '',
    label: x.label,
    link_type: x.link_type,
    link_target_id: x.link_target_id ?? '',
    custom_url: x.custom_url ?? '',
    open_new_tab: x.open_new_tab,
    status: x.status,
  };
}
function errorToast(toast: ReturnType<typeof useToast>) {
  return (error: unknown) =>
    toast.show(error instanceof Error ? error.message : 'Không thể cập nhật.', 'danger');
}
