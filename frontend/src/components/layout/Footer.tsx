import type { MenuItemView, NavigationView } from '@ltv/contracts';
import Link from 'next/link';
import type { Dictionary } from '@/lib/i18n';
import { routePath } from '@/lib/routes';
import { MenuTree } from './MenuTree';

export function Footer({
  navigation,
  dictionary,
}: {
  navigation: NavigationView;
  dictionary: Dictionary;
}) {
  const visibleMenus = navigation.menus
    .map((menu) => ({ ...menu, items: visibleMenuItems(menu.items) }))
    .filter((menu) => menu.items.length > 0);

  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(17rem,.8fr)_minmax(0,1.2fr)]">
          <div>
            <Link
              className="inline-flex items-center gap-3 text-white no-underline"
              href={routePath('home')}
            >
              <span className="grid size-10 place-items-center rounded-lg bg-blue-700 text-sm font-black">
                {dictionary.layout.brandShort.slice(0, 2).toUpperCase()}
              </span>
              <span className="text-xl font-black">{dictionary.layout.brandShort}</span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">
              {dictionary.home.heroFallbackDescription}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                className="rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-slate-950 no-underline"
                href={routePath('products.all')}
              >
                {dictionary.layout.allProducts}
              </Link>
              <Link
                className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-bold text-white no-underline"
                href={routePath('contact')}
              >
                {dictionary.home.contactAction}
              </Link>
            </div>
          </div>

          {visibleMenus.length === 0 ? null : (
            <nav
              className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
              aria-label={dictionary.layout.footerNavigation}
            >
              {visibleMenus.map((menu) => (
                <section key={menu.code} aria-labelledby={`footer-${menu.code}`}>
                  <h2 id={`footer-${menu.code}`} className="font-semibold text-white">
                    {menu.name}
                  </h2>
                  <MenuTree className="mt-4 space-y-2 text-sm text-slate-400" items={menu.items} />
                </section>
              ))}
            </nav>
          )}
        </div>
        <p className="mt-12 border-t border-slate-800 pt-6 text-sm text-slate-500">
          {new Date().getFullYear()} {dictionary.layout.copyright}
        </p>
      </div>
    </footer>
  );
}

function visibleMenuItems(items: readonly MenuItemView[]): readonly MenuItemView[] {
  return items
    .filter((item) => !isDemoCopy(item.label))
    .map((item) => ({ ...item, children: visibleMenuItems(item.children) }))
    .filter((item) => item.url !== null || item.children.length > 0);
}

function isDemoCopy(value: string): boolean {
  return /\bdemo\b|khong dung|van ban demo/i.test(value);
}
