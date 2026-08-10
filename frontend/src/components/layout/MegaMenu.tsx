import Link from 'next/link';
import type { ProductMegaMenuView } from '@ltv/contracts';
import type { Dictionary } from '@/lib/i18n';
import { routePath } from '@/lib/routes';

export function MegaMenu({
  data,
  dictionary,
}: {
  data: ProductMegaMenuView;
  dictionary: Dictionary;
}) {
  return (
    <div className="grid gap-7 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-sm shadow-2xl md:grid-cols-2">
      <section aria-labelledby="mega-categories">
        <h2 id="mega-categories" className="font-semibold text-slate-950">
          {dictionary.layout.productsByCategory}
        </h2>
        <ul className="mt-3 space-y-1">
          {data.categories.map((category) => (
            <li key={category.slug}>
              <Link
                className="block rounded-lg px-3 py-2 font-medium no-underline transition hover:bg-blue-50 hover:text-blue-900"
                href={routePath('products.category', { params: { slug: category.slug } })}
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="mega-brands">
        <h2 id="mega-brands" className="font-semibold text-slate-950">
          {dictionary.layout.productsByBrand}
        </h2>
        <ul className="mt-3 space-y-1">
          {data.brands.map((brand) => (
            <li key={brand.slug}>
              <Link
                className="block rounded-lg px-3 py-2 font-medium no-underline transition hover:bg-blue-50 hover:text-blue-900"
                href={routePath('brands.detail', { params: { slug: brand.slug } })}
              >
                {brand.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-950 px-5 py-4 font-semibold text-white md:col-span-2">
        <Link className="text-white no-underline" href={routePath('products.landing')}>
          {dictionary.layout.productOverview}
        </Link>
        <Link className="text-cyan-300 no-underline" href={routePath('products.all')}>
          {dictionary.layout.allProducts} <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    </div>
  );
}
