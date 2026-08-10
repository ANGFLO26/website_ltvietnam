import { HomeSections } from '@/components/home/HomeSections';
import { StructuredData } from '@/components/seo/StructuredData';
import { getServerConfig } from '@/config';
import { loadHomePage } from '@/lib/home';
import { getDictionary } from '@/lib/i18n';
import { buildMetadata } from '@/lib/seo';
import { buildSiteStructuredData } from '@/lib/structured-data';

const dictionary = getDictionary('en');

export const metadata = buildMetadata('home', {
  title: dictionary.home.title,
  description: dictionary.home.description,
});

export default async function HomePage() {
  const { home, offices } = await loadHomePage('en');
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
