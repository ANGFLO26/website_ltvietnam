import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TaxonomyProductListing } from '@/components/product/TaxonomyProductListing';
import { isApiNotFound } from '@/lib/api/errors';
import { getApplication, getTaxonomyProducts } from '@/lib/api/taxonomy';
import { getDictionary } from '@/lib/i18n';
import { buildMetadata } from '@/lib/seo';

const dictionary = getDictionary('vi');

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const application = await getApplication(slug);
    return buildMetadata('products.application', {
      title: application.seo_title ?? application.name,
      description: application.seo_description ?? dictionary.products.taxonomyDescription,
      params: { slug },
      canonical: application.canonical,
      indexable: application.robots === 'index,follow',
    });
  } catch (error) {
    if (isApiNotFound(error)) notFound();
    throw error;
  }
}

export default async function ProductApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | readonly string[] }>;
}) {
  const { slug } = await params;
  const page = pageOf((await searchParams).page);
  try {
    const [application, products] = await Promise.all([
      getApplication(slug),
      getTaxonomyProducts('applications', slug, { page, page_size: 12 }),
    ]);
    return (
      <TaxonomyProductListing
        title={application.name}
        description={null}
        slug={slug}
        route="products.application"
        products={products}
        dictionary={dictionary}
      />
    );
  } catch (error) {
    if (isApiNotFound(error)) notFound();
    throw error;
  }
}

function pageOf(value: string | readonly string[] | undefined): number {
  const raw = typeof value === 'string' ? value : value?.[0];
  const page = Number.parseInt(raw ?? '', 10);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}
