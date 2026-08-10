import type { Metadata } from 'next';
import { renderRequestSuccess, requestSuccessMetadata } from '@/lib/w5/success';

export const metadata: Metadata = requestSuccessMetadata('en');

export default function RequestSuccessPage() {
  return renderRequestSuccess('en');
}
