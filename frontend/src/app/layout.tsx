import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import type { Locale } from '@ltv/contracts';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { TopBar } from '@/components/layout/TopBar';
import { CookieBanner } from '@/components/ui/CookieBanner';
import { getDictionary } from '@/lib/i18n';
import { loadSiteShellSafe } from '@/lib/site-shell';
import './globals.css';

/** API duoc doc luc request; production build va trang 404 khong can backend. */
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = requestLocale(await headers());
  const dictionary = getDictionary(locale);
  const shell = await loadSiteShellSafe(locale);
  return (
    <html lang={locale}>
      <body>
        <a className="skip-link" href="#main-content">
          {dictionary.common.skipToContent}
        </a>
        <TopBar locale={locale} dictionary={dictionary} />
        <Header
          header={shell.header}
          mobile={shell.mobile}
          dictionary={dictionary}
          locale={locale}
        />
        <main id="main-content">{children}</main>
        <Footer navigation={shell.footer} dictionary={dictionary} />
        <CookieBanner locale={locale} dictionary={dictionary} />
      </body>
    </html>
  );
}

function requestLocale(requestHeaders: Headers): Locale {
  return requestHeaders.get('x-ltv-locale') === 'vi' ? 'vi' : 'en';
}
