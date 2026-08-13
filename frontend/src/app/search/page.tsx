import type { Metadata } from 'next';
import { renderSearchPage, searchMetadata } from '@/page-views/search';

export const metadata: Metadata = searchMetadata('en');

export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | readonly string[]; page?: string | readonly string[] }>;
}) {
  return renderSearchPage('en', searchParams);
}
