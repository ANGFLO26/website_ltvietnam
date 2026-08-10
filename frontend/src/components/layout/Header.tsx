import Link from 'next/link';
import type { Locale, NavigationView } from '@ltv/contracts';
import { InquiryLauncher } from '@/components/inquiry/InquiryLauncher';
import { getPublicCaptchaConfig } from '@/config';
import type { Dictionary } from '@/lib/i18n';
import { routePath } from '@/lib/routes';
import { MegaMenu } from './MegaMenu';
import { MenuItemLink } from './MenuTree';
import { MobileMenu } from './MobileMenu';

export function Header({
  header,
  mobile,
  dictionary,
  locale = 'en',
}: {
  header: NavigationView;
  mobile: NavigationView;
  dictionary: Dictionary;
  locale?: Locale;
}) {
  const productPath = routePath('products.landing');
  const hiddenDesktopPaths = new Set([routePath('home'), routePath('contact', { locale })]);
  const items = header.menus
    .flatMap((menu) => menu.items)
    .filter((item) => item.url === null || !hiddenDesktopPaths.has(item.url));
  const captcha = getPublicCaptchaConfig();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 shadow-[0_1px_0_rgba(15,23,42,.04)] backdrop-blur">
      <div className="mx-auto flex min-h-18 max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link
          className="mr-auto flex items-center gap-3 text-xl font-extrabold tracking-tight text-slate-950 no-underline"
          href={routePath('home')}
        >
          <span
            className="grid size-9 place-items-center rounded-lg bg-[var(--color-primary)] text-sm font-black text-white shadow-sm"
            aria-hidden="true"
          >
            {dictionary.layout.brandShort.slice(0, 2).toUpperCase()}
          </span>
          <span>{dictionary.layout.brandShort}</span>
        </Link>
        <nav className="hidden lg:block" aria-label={dictionary.layout.mainNavigation}>
          <ul className="flex items-center gap-4 xl:gap-6">
            {items.map((item, index) => (
              <li key={`${item.label}:${item.url ?? 'heading'}:${index}`}>
                {item.url === productPath && header.product_mega_menu !== null ? (
                  <div className="flex items-center gap-1">
                    <Link className="font-semibold text-slate-800 no-underline" href={productPath}>
                      {item.label}
                    </Link>
                    <details className="group relative">
                      <summary
                        className="grid size-7 cursor-pointer place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                        aria-label={dictionary.layout.productMenu}
                      >
                        <span className="transition group-open:rotate-180" aria-hidden="true">
                          &#8964;
                        </span>
                      </summary>
                      <div className="absolute left-1/2 z-50 mt-4 w-[40rem] -translate-x-1/2">
                        <MegaMenu data={header.product_mega_menu} dictionary={dictionary} />
                      </div>
                    </details>
                  </div>
                ) : (
                  <MenuItemLink
                    className="font-medium text-slate-700 no-underline transition hover:text-[var(--color-primary)]"
                    item={item}
                  />
                )}
              </li>
            ))}
          </ul>
        </nav>
        <Link
          className="hidden size-10 place-items-center rounded-full border border-slate-200 text-lg text-slate-700 no-underline transition hover:border-blue-200 hover:bg-blue-50 hover:text-[var(--color-primary)] xl:grid"
          href={routePath('search', { locale })}
          aria-label={dictionary.search.label}
        >
          <span className="search-icon" aria-hidden="true" />
        </Link>
        <InquiryLauncher
          className="hidden rounded-lg bg-[var(--color-primary)] px-4 py-2.5 font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-900 lg:block"
          locale={locale}
          dictionary={dictionary}
          captcha={captcha}
          label={dictionary.layout.requestQuote}
        />
        <MobileMenu navigation={mobile} dictionary={dictionary} locale={locale} />
      </div>
    </header>
  );
}
