'use client';

import type { AdminUserView } from '@ltv/contracts';
import {
  ChevronDown,
  ExternalLink,
  KeyRound,
  Menu as MenuIcon,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ADMIN_ROUTES, breadcrumbFor } from '@/lib/routes';
import { LogoutButton } from './LogoutButton';

export function AdminShell({
  user,
  publicSiteUrl,
  children,
}: {
  readonly user: AdminUserView;
  readonly publicSiteUrl: string;
  readonly children: ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileButton = useRef<HTMLButtonElement>(null);
  const mobileNav = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    mobileNav.current?.querySelector<HTMLElement>('a')?.focus();
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        mobileButton.current?.focus();
        return;
      }
      if (event.key !== 'Tab' || !mobileNav.current) return;
      const items = focusable(mobileNav.current);
      const first = items[0];
      const last = items.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  useEffect(() => setMobileOpen(false), [pathname]);
  const breadcrumb = breadcrumbFor(pathname);

  return (
    <div className={`admin-shell ${collapsed ? 'admin-shell--collapsed' : ''}`}>
      <a className="skip-link" href="#admin-content">
        Bỏ qua điều hướng
      </a>
      <aside className="sidebar" aria-label="Điều hướng quản trị">
        <SidebarBrand collapsed={collapsed} />
        <SidebarNavigation pathname={pathname} collapsed={collapsed} />
        <button
          type="button"
          className="sidebar__collapse"
          aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          <span>{collapsed ? 'Mở rộng' : 'Thu gọn'}</span>
        </button>
      </aside>

      {mobileOpen ? (
        <div className="mobile-drawer" role="presentation">
          <button
            className="mobile-drawer__backdrop"
            type="button"
            aria-label="Đóng điều hướng"
            onClick={() => {
              setMobileOpen(false);
              mobileButton.current?.focus();
            }}
          />
          <aside
            ref={mobileNav}
            className="mobile-drawer__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Điều hướng di động"
          >
            <div className="mobile-drawer__header">
              <SidebarBrand collapsed={false} />
              <button
                type="button"
                className="icon-button"
                aria-label="Đóng điều hướng"
                onClick={() => {
                  setMobileOpen(false);
                  mobileButton.current?.focus();
                }}
              >
                <X size={20} />
              </button>
            </div>
            <SidebarNavigation pathname={pathname} collapsed={false} />
          </aside>
        </div>
      ) : null}

      <div className="admin-shell__main">
        <header className="admin-topbar">
          <button
            ref={mobileButton}
            type="button"
            className="icon-button admin-topbar__menu"
            aria-label="Mở điều hướng"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <MenuIcon size={21} />
          </button>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            {breadcrumb.map((item, index) => (
              <span key={item} aria-current={index === breadcrumb.length - 1 ? 'page' : undefined}>
                {item}
              </span>
            ))}
          </nav>
          <div className="admin-topbar__actions">
            <a
              className="view-site-link"
              href={publicSiteUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Xem website công khai"
            >
              <span>Xem website</span>
              <ExternalLink size={15} aria-hidden="true" />
            </a>
            <details className="account-menu">
              <summary>
                <span className="account-menu__avatar" aria-hidden="true">
                  {initials(user.name)}
                </span>
                <span className="account-menu__identity">
                  <strong>{user.name}</strong>
                  <small>{user.email}</small>
                </span>
                <ChevronDown size={16} aria-hidden="true" />
              </summary>
              <div className="account-menu__panel">
                <Link className="account-menu__item" href="/account/password">
                  <KeyRound size={16} aria-hidden="true" />
                  Đổi mật khẩu
                </Link>
                <LogoutButton />
              </div>
            </details>
          </div>
        </header>
        <main id="admin-content" className="admin-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarBrand({ collapsed }: { readonly collapsed: boolean }) {
  return (
    <Link className="sidebar__brand" href="/dashboard" aria-label="LT Vietnam Admin">
      <span className="sidebar__mark">LT</span>
      {!collapsed ? (
        <span>
          <strong>LT Vietnam</strong>
          <small>Admin Console</small>
        </span>
      ) : null}
    </Link>
  );
}

function SidebarNavigation({
  pathname,
  collapsed,
}: {
  readonly pathname: string;
  readonly collapsed: boolean;
}) {
  return (
    <nav className="sidebar__nav">
      {ADMIN_ROUTES.map((group) => (
        <div className="sidebar__group" key={group.label}>
          {!collapsed ? <p>{group.label}</p> : null}
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = item.ready && pathname.startsWith(item.href);
            if (!item.ready) {
              return (
                <span
                  key={item.href}
                  className="sidebar__link sidebar__link--planned"
                  title={`${item.label} — triển khai ở phase sau`}
                  aria-disabled="true"
                >
                  <Icon size={18} aria-hidden="true" />
                  {!collapsed ? (
                    <>
                      <span>{item.label}</span>
                      <small>Sắp có</small>
                    </>
                  ) : null}
                </span>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar__link ${active ? 'sidebar__link--active' : ''}`}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} aria-hidden="true" />
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function focusable(root: HTMLElement): HTMLElement[] {
  return [
    ...root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((item) => !item.hasAttribute('hidden') && item.getAttribute('aria-hidden') !== 'true');
}
