import { newsListMetadata, renderNewsList } from '@/lib/w4/news';

export const metadata = newsListMetadata('vi');

export default function VietnameseNewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | readonly string[] }>;
}) {
  return renderNewsList('vi', searchParams);
}
