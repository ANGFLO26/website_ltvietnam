import { newsListMetadata, renderNewsList } from '@/page-views/news';

export const metadata = newsListMetadata('en');

export default function EnglishNewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | readonly string[] }>;
}) {
  return renderNewsList('en', searchParams);
}
