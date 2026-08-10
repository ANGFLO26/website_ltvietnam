import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TaxonomyProductListing } from '@/components/product/TaxonomyProductListing';
import { isApiNotFound } from '@/lib/api/errors';
import { getProductCategory, getTaxonomyProducts } from '@/lib/api/taxonomy';
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
    const category = await getProductCategory(slug);
    return buildMetadata('products.category', {
      title: category.seo_title ?? category.name,
      description: category.seo_description ?? category.short_description,
      params: { slug },
      canonical: category.canonical,
      indexable: category.robots === 'index,follow',
    });
  } catch (error) {
    if (isApiNotFound(error)) notFound();
    throw error;
  }
}

export default async function ProductCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | readonly string[] }>;
}) {
  const { slug } = await params;
  const page = pageOf((await searchParams).page);
  try {
    const [category, products] = await Promise.all([
      getProductCategory(slug),
      getTaxonomyProducts('product-categories', slug, { page, page_size: 12 }),
    ]);
    return (
      <TaxonomyProductListing
        title={category.name}
        description={category.short_description}
        slug={slug}
        route="products.category"
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
