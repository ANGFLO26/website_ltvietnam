import type { Metadata } from 'next';
import { renderSearchPage, searchMetadata } from '@/lib/w6/search';

export const metadata: Metadata = searchMetadata('vi');

export default function VietnameseSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | readonly string[]; page?: string | readonly string[] }>;
}) {
  return renderSearchPage('vi', searchParams);
}
