import { newsListMetadata, renderNewsList } from '@/lib/w4/news';

export const metadata = newsListMetadata('en');

export default function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | readonly string[] }>;
}) {
  return renderNewsList('en', searchParams);
}
