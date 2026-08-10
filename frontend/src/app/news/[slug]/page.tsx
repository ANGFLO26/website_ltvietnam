import type { Metadata } from 'next';
import { postDetailMetadata, renderPostDetail } from '@/lib/w4/news';

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return postDetailMetadata('en', params);
}

export default function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  return renderPostDetail('en', params);
}
