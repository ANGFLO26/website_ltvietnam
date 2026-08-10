import type { Metadata } from 'next';
import { newsCategoryMetadata, renderNewsCategory } from '@/lib/w4/news';

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return newsCategoryMetadata('en', params);
}

export default function NewsCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | readonly string[] }>;
}) {
  return renderNewsCategory('en', params, searchParams);
}
