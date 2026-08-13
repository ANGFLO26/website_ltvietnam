import type { Locale, SearchHitView } from '@ltv/contracts';
import { Card } from '@/components/ui/Card';
import type { Dictionary } from '@/lib/i18n';
import { routePath, type RouteKey } from '@/lib/routes';

/**
 * Route va nhan cho tung loai ket qua.
 *
 * Mot bang tra cuu DAY DU tren union `SearchHitView['type']`: them mot loai noi
 * dung vao contracts ma quen bo sung o day la loi BIEN DICH, khong phai mot the
 * <a> tro vao trang san pham khong ton tai. Truoc khi tim kiem duoc mo rong,
 * ham nay dung `products.detail` cho MOI ket qua — dung vi luc do chi co san
 * pham, nhung se sai im lang ngay khi co loai thu hai.
 */
const HIT: Record<SearchHitView['type'], { readonly route: RouteKey; readonly label: keyof Dictionary['search'] }> = {
  product: { route: 'products.detail', label: 'productType' },
  service: { route: 'services.detail', label: 'serviceType' },
  project: { route: 'projects.detail', label: 'projectType' },
  post: { route: 'news.detail', label: 'postType' },
};

export function SearchResultCard({
  result,
  locale,
  dictionary,
}: {
  result: SearchHitView;
  locale: Locale;
  dictionary: Dictionary;
}) {
  const hit = HIT[result.type];
  return (
    <Card
      title={result.title}
      eyebrow={dictionary.search[hit.label]}
      description={result.subtitle}
      href={routePath(hit.route, {
        // Catalogue chi co tieng Viet, nen `products.detail` khong nhan locale.
        ...(result.type === 'product' ? {} : { locale }),
        params: { slug: result.slug },
      })}
    />
  );
}
