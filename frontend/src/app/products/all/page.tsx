import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ProductCatalogue } from '@/components/product/ProductCatalogue';
import { ProductSearchForm } from '@/components/product/ProductSearchForm';
import { loadCataloguePage } from '@/lib/catalogue';
import { hasCatalogueQuery, parseProductFilters, type SearchParams } from '@/lib/filter';
import { getDictionary } from '@/lib/i18n';
import { routePath } from '@/lib/routes';
import { buildMetadata } from '@/lib/seo';

const dictionary = getDictionary('en');

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const filters = parseProductFilters(await searchParams);
  return buildMetadata('products.all', {
    title: dictionary.products.allProductsTitle,
    description: dictionary.products.allProductsDescription,
    indexable: !hasCatalogueQuery(filters),
    canonical: routePath('products.all'),
  });
}

export default async function AllProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const filters = parseProductFilters(await searchParams);
  const data = await loadCataloguePage(filters);
  return (
    <div>
      <header className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-12">
          <Breadcrumb
            label={dictionary.products.breadcrumb}
            items={[
              { label: dictionary.products.home, href: routePath('home') },
              { label: dictionary.products.products, href: routePath('products.landing') },
              { label: dictionary.products.allProductsTitle },
            ]}
          />
          <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_.9fr] lg:items-end">
            <div>
              <p className="section-kicker">{dictionary.products.catalogueTitle}</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
                {dictionary.products.allProductsTitle}
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-slate-600">
                {dictionary.products.allProductsDescription}
              </p>
            </div>
            <ProductSearchForm dictionary={dictionary} defaultValue={filters.q} />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <ProductCatalogue
          products={data.products}
          options={data.options}
          filters={filters}
          dictionary={dictionary}
        />
      </div>
    </div>
  );
}
