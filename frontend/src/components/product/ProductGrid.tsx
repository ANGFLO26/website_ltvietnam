import type { ProductCardView } from '@ltv/contracts';
import type { Dictionary } from '@/lib/i18n';
import { ProductCard } from './ProductCard';

export function ProductGrid({
  products,
  dictionary,
  headingLevel = 2,
}: {
  products: readonly ProductCardView[];
  dictionary: Dictionary;
  headingLevel?: 2 | 3;
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <ProductCard
          key={product.slug}
          product={product}
          dictionary={dictionary}
          headingLevel={headingLevel}
        />
      ))}
    </div>
  );
}
