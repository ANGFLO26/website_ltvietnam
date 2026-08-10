import Link from 'next/link';
import type { ProductRelatedView } from '@ltv/contracts';
import type { Dictionary } from '@/lib/i18n';
import { routePath } from '@/lib/routes';

export function DiscontinuedNotice({
  related,
  dictionary,
}: {
  related: readonly ProductRelatedView[];
  dictionary: Dictionary;
}) {
  const alternatives = related.filter((item) =>
    ['alternative', 'similar', 'recommended'].includes(item.relation_type),
  );
  return (
    <aside className="rounded-xl border border-amber-300 bg-amber-50 p-5" role="status">
      <h2 className="text-lg font-bold text-amber-950">{dictionary.products.discontinuedTitle}</h2>
      <p className="mt-2 text-sm text-amber-900">{dictionary.products.discontinuedMessage}</p>
      {alternatives.length === 0 ? null : (
        <div className="mt-4">
          <p className="text-sm font-semibold text-amber-950">
            {dictionary.products.alternativeProductsTitle}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {alternatives.map((item) => (
              <li key={item.product.slug}>
                <Link
                  className="inline-block rounded-full bg-white px-3 py-1.5 text-sm font-semibold no-underline"
                  href={routePath('products.detail', { params: { slug: item.product.slug } })}
                >
                  {item.product.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
