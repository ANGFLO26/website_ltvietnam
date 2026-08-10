import type { ProductRelatedView } from '@ltv/contracts';
import type { Dictionary } from '@/lib/i18n';
import { ProductGrid } from './ProductGrid';

export function RelatedProducts({
  related,
  dictionary,
}: {
  related: readonly ProductRelatedView[];
  dictionary: Dictionary;
}) {
  if (related.length === 0) return null;
  return (
    <section aria-labelledby="related-products">
      <h2 id="related-products" className="text-2xl font-bold text-slate-950">
        {dictionary.products.relatedProductsTitle}
      </h2>
      <div className="mt-5">
        <ProductGrid
          products={related.map((item) => item.product)}
          dictionary={dictionary}
          headingLevel={3}
        />
      </div>
    </section>
  );
}
