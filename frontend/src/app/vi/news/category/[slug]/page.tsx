import type { Metadata } from 'next';
import { newsCategoryMetadata, renderNewsCategory } from '@/page-views/news';

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return newsCategoryMetadata('vi', params);
}

export default function VietnameseNewsCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | readonly string[] }>;
}) {
  return renderNewsCategory('vi', params, searchParams);
}
