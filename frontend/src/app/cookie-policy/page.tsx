import type { Metadata } from 'next';
import { policyMetadata, renderPolicyPage } from '@/lib/w6/policies';

export function generateMetadata(): Promise<Metadata> {
  return policyMetadata('cookie-policy', 'en');
}

export default function CookiePolicyPage() {
  return renderPolicyPage('cookie-policy', 'en');
}
