import { Skeleton } from '@/components/ui/Skeleton';
import { getDictionary } from '@/lib/i18n';

export default function ProductsLoadingPage() {
  const dictionary = getDictionary('en');
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <Skeleton label={dictionary.common.loading} />
    </div>
  );
}
