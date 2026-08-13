import type { Metadata } from 'next';
import { postDetailMetadata, renderPostDetail } from '@/page-views/news';

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return postDetailMetadata('en', params);
}

export default function EnglishNewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return renderPostDetail('en', params);
}
