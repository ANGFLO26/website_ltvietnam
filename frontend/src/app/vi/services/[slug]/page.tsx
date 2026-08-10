import type { Metadata } from 'next';
import { renderServiceDetail, serviceDetailMetadata } from '@/lib/w4/services';

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return serviceDetailMetadata('vi', params);
}

export default function VietnameseServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return renderServiceDetail('vi', params);
}
