import type { Metadata } from 'next';
import { renderRequestSuccess, requestSuccessMetadata } from '@/lib/w5/success';

export const metadata: Metadata = requestSuccessMetadata('vi');

export default function VietnameseRequestSuccessPage() {
  return renderRequestSuccess('vi');
}
