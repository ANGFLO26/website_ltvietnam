import type { Locale } from '@ltv/contracts';
import type { Metadata } from 'next';
import { HomeSections } from '@/components/home/HomeSections';
import { StructuredData } from '@/components/seo/StructuredData';
import { getServerConfig } from '@/config';
import { loadHomePage } from '@/lib/home';
import { getDictionary } from '@/lib/i18n';
import { localizedRouteAlternates } from '@/lib/localized-content';
import { buildMetadata } from '@/lib/seo';
import { buildSiteStructuredData } from '@/lib/structured-data';

/**
 * Trang chu — mot ban dung chung cho ca hai ngon ngu.
 *
 * Truoc dot dao ngon ngu, trang chu chi co tieng Anh va logic nam thang trong
 * `app/page.tsx`. Nay no co hai bien the, va viec sao chep than component sang
 * `app/en/page.tsx` se tao hai ban phai sua song song. Moi trang khac trong
 * `page-views/` da theo khuon nay; trang chu khong co ly do de la ngoai le.
 */
export function homeMetadata(locale: Locale): Metadata {
  const dictionary = getDictionary(locale);
  return buildMetadata('home', {
    title: dictionary.home.title,
    description: dictionary.home.description,
    locale,
    hreflangAlternates: localizedRouteAlternates('home'),
  });
}

export async function renderHome(locale: Locale) {
  const dictionary = getDictionary(locale);
  const { home, offices } = await loadHomePage(locale);
  const config = getServerConfig();
  return (
    <div>
      <StructuredData
        values={[
          buildSiteStructuredData({
            siteUrl: config.siteUrl.toString(),
            name: dictionary.home.title,
            description: dictionary.home.description,
            offices,
            logoUrl: config.siteLogoUrl,
          }),
        ]}
      />
      <HomeSections home={home} offices={offices} dictionary={dictionary} />
    </div>
  );
}
