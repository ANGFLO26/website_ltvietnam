import type { Metadata } from 'next';
import { postDetailMetadata, renderPostDetail } from '@/page-views/news';

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return postDetailMetadata('vi', params);
}

export default function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  return renderPostDetail('vi', params);
}
