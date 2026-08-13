'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import type { Locale, NavigationView } from '@ltv/contracts';
import type { Dictionary } from '@/lib/i18n';
import { routePath } from '@/lib/routes';
import { MenuTree } from './MenuTree';

export function MobileMenu({
  navigation,
  dictionary,
  locale = 'en',
}: {
  navigation: NavigationView;
  dictionary: Dictionary;
  locale?: Locale;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  function closeAfterNavigation(event: React.MouseEvent<HTMLDivElement>): void {
    if ((event.target as HTMLElement).closest('a') === null) return;
    setOpen(false);
  }

  return (
    <div className="relative lg:hidden">
      <button
        ref={triggerRef}
        className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-800"
        type="button"
        aria-controls={panelId}
        aria-expanded={open}
        aria-label={open ? dictionary.layout.closeMenu : dictionary.layout.openMenu}
        data-mobile-menu-trigger
        onClick={() => setOpen((current) => !current)}
      >
        {dictionary.layout.openMenu}
      </button>
      {open ? (
        <div
          id={panelId}
          className="absolute right-0 z-50 mt-3 max-h-[min(78vh,42rem)] w-[min(92vw,24rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
          data-mobile-menu-panel
          onClick={closeAfterNavigation}
        >
          <form className="mb-5" action={routePath('products.all')} method="get" role="search">
            <label className="sr-only" htmlFor={`${panelId}-search`}>
              {dictionary.products.searchLabel}
            </label>
            <div className="flex rounded-lg border border-slate-300 bg-slate-50 p-1">
              <input
                className="min-w-0 flex-1 bg-transparent px-3 py-2 outline-none"
                id={`${panelId}-search`}
                name="q"
                placeholder={dictionary.products.searchPlaceholder}
              />
              <button
                className="rounded-md bg-[var(--color-primary)] px-3 font-bold text-white"
                type="submit"
              >
                {dictionary.products.searchAction}
              </button>
            </div>
          </form>
          <nav aria-label={dictionary.layout.mobileNavigation}>
            {navigation.menus.map((menu) => (
              <MenuTree
                key={menu.code}
                className="space-y-1"
                items={menu.items}
                dictionary={dictionary}
              />
            ))}
          </nav>
          {navigation.product_mega_menu === null ? null : (
            <div className="mt-5 border-t border-slate-200 pt-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                {dictionary.layout.productsByCategory}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {navigation.product_mega_menu.categories.slice(0, 3).map((category) => (
                  <Link
                    key={category.slug}
                    className="rounded-full bg-slate-100 px-3 py-2 text-sm font-medium no-underline"
                    href={routePath('products.category', { params: { slug: category.slug } })}
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-200 pt-5">
            <Link
              className="rounded-lg border border-slate-300 px-3 py-3 text-center text-sm font-bold no-underline"
              href={routePath('products.all')}
            >
              {dictionary.layout.allProducts}
            </Link>
            <Link
              className="rounded-lg bg-[var(--color-primary)] px-3 py-3 text-center text-sm font-bold text-white no-underline"
              href={routePath('contact', { locale })}
            >
              {dictionary.home.contactAction}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
