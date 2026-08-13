import type { Metadata } from 'next';
import { renderServiceDetail, serviceDetailMetadata } from '@/page-views/services';

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return serviceDetailMetadata('en', params);
}

export default function EnglishServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return renderServiceDetail('en', params);
}
