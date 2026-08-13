import type { LucideIcon } from 'lucide-react';
import {
  FileText,
  FileArchive,
  FolderKanban,
  Image,
  Inbox,
  LayoutDashboard,
  Menu,
  Package,
  Route,
  Settings,
  Users,
} from 'lucide-react';

export interface AdminRouteItem {
  readonly label: string;
  readonly href: string;
  readonly icon: LucideIcon;
  readonly ready: boolean;
}

export interface AdminRouteGroup {
  readonly label: string;
  readonly items: readonly AdminRouteItem[];
}

export const ADMIN_ROUTES: readonly AdminRouteGroup[] = [
  {
    label: 'Tổng quan',
    items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, ready: true }],
  },
  {
    label: 'Vận hành',
    items: [{ label: 'Yêu cầu khách hàng', href: '/inquiries', icon: Inbox, ready: true }],
  },
  {
    label: 'Catalogue',
    items: [
      { label: 'Sản phẩm', href: '/products', icon: Package, ready: true },
      { label: 'Taxonomy', href: '/taxonomy', icon: FolderKanban, ready: true },
    ],
  },
  {
    label: 'Nội dung',
    items: [{ label: 'Trang & bài viết', href: '/content', icon: FileText, ready: true }],
  },
  {
    label: 'Tài nguyên',
    items: [
      { label: 'Thư viện Media', href: '/media', icon: Image, ready: true },
      { label: 'Tài liệu', href: '/documents', icon: FileArchive, ready: true },
    ],
  },
  {
    label: 'Website',
    items: [
      { label: 'Website công khai', href: '/website', icon: Menu, ready: true },
      { label: 'Chuyển hướng URL', href: '/redirects', icon: Route, ready: true },
    ],
  },
  {
    label: 'Hệ thống',
    items: [
      { label: 'Cài đặt', href: '/settings', icon: Settings, ready: true },
      { label: 'Tài khoản', href: '/users', icon: Users, ready: true },
    ],
  },
] as const;

export function breadcrumbFor(pathname: string): readonly string[] {
  if (pathname.startsWith('/account')) return ['Hệ thống', 'Tài khoản của tôi'];
  for (const group of ADMIN_ROUTES) {
    const item = group.items.find((route) => pathname.startsWith(route.href));
    if (item) return [group.label, item.label];
  }
  return ['Quản trị'];
}
