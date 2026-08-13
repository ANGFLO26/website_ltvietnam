import Link from 'next/link';

const TABS = [
  ['/website', 'Tổng quan'],
  ['/website/homepage', 'Trang chủ'],
  ['/website/banners', 'Banner'],
  ['/website/customers', 'Khách hàng'],
  ['/website/offices', 'Văn phòng'],
  ['/website/menus', 'Menu & footer'],
] as const;
export function WebsiteTabs({ active }: { readonly active: string }) {
  return (
    <nav className="resource-tabs" aria-label="Quản trị website">
      {TABS.map(([href, label]) => (
        <Link key={href} href={href} className={active === href ? 'is-active' : ''}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
