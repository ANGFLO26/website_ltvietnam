import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TaxonomyProductListing } from '@/components/product/TaxonomyProductListing';
import { isApiNotFound } from '@/lib/api/errors';
import { getStandard, getTaxonomyProducts } from '@/lib/api/taxonomy';
import { getDictionary } from '@/lib/i18n';
import { buildMetadata } from '@/lib/seo';

const dictionary = getDictionary('en');

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const standard = await getStandard(slug);
    return buildMetadata('products.standard', {
      title: standard.seo_title ?? `${standard.organization} ${standard.code}`,
      description: standard.seo_description ?? standard.description ?? standard.name,
      params: { slug },
      canonical: standard.canonical,
      indexable: standard.robots === 'index,follow',
    });
  } catch (error) {
    if (isApiNotFound(error)) notFound();
    throw error;
  }
}

export default async function ProductStandardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | readonly string[] }>;
}) {
  const { slug } = await params;
  const page = pageOf((await searchParams).page);
  try {
    const [standard, products] = await Promise.all([
      getStandard(slug),
      getTaxonomyProducts('standards', slug, { page, page_size: 12 }),
    ]);
    return (
      <TaxonomyProductListing
        title={`${standard.organization} ${standard.code}`}
        description={standard.description ?? standard.name}
        slug={slug}
        route="products.standard"
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
