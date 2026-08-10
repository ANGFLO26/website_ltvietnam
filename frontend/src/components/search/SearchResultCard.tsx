import type { SearchHitView } from '@ltv/contracts';
import { Card } from '@/components/ui/Card';
import type { Dictionary } from '@/lib/i18n';
import { routePath } from '@/lib/routes';

export function SearchResultCard({
  result,
  dictionary,
}: {
  result: SearchHitView;
  dictionary: Dictionary;
}) {
  return (
    <Card
      title={result.title}
      eyebrow={dictionary.search.productType}
      description={result.subtitle}
      href={routePath('products.detail', { params: { slug: result.slug } })}
    />
  );
}
