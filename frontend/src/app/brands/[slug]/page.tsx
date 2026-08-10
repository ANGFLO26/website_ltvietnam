import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContentPageHeader } from '@/components/content/ContentPageHeader';
import { ProductGrid } from '@/components/product/ProductGrid';
import { isApiNotFound } from '@/lib/api/errors';
import { getProducts } from '@/lib/api/products';
import { getBrand } from '@/lib/api/taxonomy';
import { getDictionary } from '@/lib/i18n';
import { routePath } from '@/lib/routes';
import { buildMetadata } from '@/lib/seo';

const dictionary = getDictionary('en');

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const brand = await getBrand(slug);
    return buildMetadata('brands.detail', {
      title: brand.name,
      description: brand.short_description,
      params: { slug },
      canonical: brand.canonical,
      indexable: brand.robots === 'index,follow',
    });
  } catch (error) {
    if (isApiNotFound(error)) notFound();
    throw error;
  }
}

export default async function BrandDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const [brand, products] = await Promise.all([
      getBrand(slug),
      getProducts({ brand: [slug], pageSize: 12 }),
    ]);
    return (
      <div>
        <ContentPageHeader
          title={brand.name}
          description={brand.short_description}
          breadcrumbs={[
            { label: dictionary.content.home, href: routePath('home') },
            {
              label: dictionary.content.brandsTitle,
              href: routePath('brands.list'),
            },
            { label: brand.name },
          ]}
          locale="en"
          dictionary={dictionary}
        />
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <section aria-labelledby="brand-profile">
            <h2 id="brand-profile" className="text-2xl font-bold text-slate-950">
              {dictionary.content.brandProfile}
            </h2>
            <dl className="mt-5 grid gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2">
              {brand.country_code === null ? null : (
                <div>
                  <dt className="text-sm font-semibold text-slate-600">
                    {dictionary.content.countryLabel}
                  </dt>
                  <dd className="mt-1 text-slate-950">{brand.country_code}</dd>
                </div>
              )}
              {brand.website_url === null ? null : (
                <div>
                  <dt className="text-sm font-semibold text-slate-600">
                    {dictionary.content.websiteLabel}
                  </dt>
                  <dd className="mt-1">
                    <a href={brand.website_url} rel="noopener noreferrer">
                      {brand.website_url}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <section className="mt-12" aria-labelledby="brand-products">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <h2 id="brand-products" className="text-2xl font-bold text-slate-950">
                {dictionary.content.brandProducts}
              </h2>
              <Link href={routePath('products.all', { query: { brand: brand.slug } })}>
                {dictionary.content.browseBrandProducts.replace('{brand}', brand.name)}
              </Link>
            </div>
            <ProductGrid products={products.data} dictionary={dictionary} headingLevel={3} />
          </section>
        </div>
      </div>
    );
  } catch (error) {
    if (isApiNotFound(error)) notFound();
    throw error;
  }
}
