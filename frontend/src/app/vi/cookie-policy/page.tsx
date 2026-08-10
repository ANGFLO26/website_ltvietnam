import type { Metadata } from 'next';
import { policyMetadata, renderPolicyPage } from '@/lib/w6/policies';

export function generateMetadata(): Promise<Metadata> {
  return policyMetadata('cookie-policy', 'vi');
}

export default function VietnameseCookiePolicyPage() {
  return renderPolicyPage('cookie-policy', 'vi');
}
