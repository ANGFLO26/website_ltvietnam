import { newsListMetadata, renderNewsList } from '@/page-views/news';

export const metadata = newsListMetadata('vi');

export default function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | readonly string[] }>;
}) {
  return renderNewsList('vi', searchParams);
}
