import type { Metadata } from 'next';
import { aboutDetailMetadata, renderAboutDetail } from '@/page-views/about';

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return aboutDetailMetadata('en', params);
}

export default function EnglishAboutDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return renderAboutDetail('en', params);
}
