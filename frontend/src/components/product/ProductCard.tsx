import Link from 'next/link';
import type { ProductCardView } from '@ltv/contracts';
import type { Dictionary } from '@/lib/i18n';
import { routePath } from '@/lib/routes';

export function ProductCard({
  product,
  dictionary,
  headingLevel = 2,
}: {
  product: ProductCardView;
  dictionary: Dictionary;
  headingLevel?: 2 | 3;
}) {
  const Heading = `h${headingLevel}` as 'h2' | 'h3';
  const detailHref = routePath('products.detail', { params: { slug: product.slug } });
  const visibleDescription = isDemoCopy(product.short_description)
    ? null
    : product.short_description;
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,.07)] transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_20px_50px_rgba(15,76,129,.14)]">
      <Link
        className="technical-product-visual relative flex aspect-[4/3] overflow-hidden bg-slate-100 p-6 text-slate-950 no-underline"
        href={detailHref}
        aria-label={`${dictionary.products.viewProduct}: ${product.name}`}
      >
        <span className="absolute right-5 top-5 rounded-full border border-slate-300/70 bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-600 backdrop-blur">
          {product.brand?.name ?? dictionary.products.brandLabel}
        </span>
        <span className="relative mt-auto block max-w-[85%]">
          <span className="block text-xs font-bold uppercase tracking-[0.18em] text-blue-800">
            {dictionary.layout.companyDescriptor}
          </span>
          <span className="mt-3 block text-2xl font-black tracking-tight text-slate-700 transition group-hover:text-blue-900">
            {product.model ?? product.name}
          </span>
        </span>
        <span
          className="absolute -bottom-10 -right-8 size-36 rounded-full border-[18px] border-blue-800/10 transition duration-500 group-hover:scale-110"
          aria-hidden="true"
        />
      </Link>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-800">
            {product.brand?.name}
          </p>
          {product.discontinued ? (
            <span className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
              {dictionary.products.discontinued}
            </span>
          ) : null}
        </div>
        <Heading className="mt-2 text-xl font-bold tracking-tight text-slate-950">
          <Link className="text-slate-950 no-underline" href={detailHref}>
            {product.name}
          </Link>
        </Heading>
        {product.model === null ? null : (
          <p className="mt-1 text-sm text-slate-600">
            {dictionary.products.modelLabel}: {product.model}
          </p>
        )}
        {visibleDescription === null ? null : (
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{visibleDescription}</p>
        )}
        {product.standards.length === 0 ? null : (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {dictionary.products.standardsLabel}
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {product.standards.slice(0, 3).map((standard) => (
                <li key={standard.slug}>
                  <Link
                    className="inline-flex min-h-9 items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 no-underline transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-900"
                    href={routePath('products.standard', { params: { slug: standard.slug } })}
                  >
                    {standard.organization} {standard.code}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Link
          className="mt-auto inline-flex items-center justify-between border-t border-slate-200 pt-5 font-bold text-[var(--color-primary)] no-underline"
          href={detailHref}
        >
          {dictionary.products.viewProduct}
          <span className="transition group-hover:translate-x-1" aria-hidden="true">
            &rarr;
          </span>
        </Link>
      </div>
    </article>
  );
}

function isDemoCopy(value: string | null): boolean {
  return value !== null && /\bdemo\b|khong dung|van ban demo/i.test(value);
}
