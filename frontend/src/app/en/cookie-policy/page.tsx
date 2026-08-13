import type { Metadata } from 'next';
import { policyMetadata, renderPolicyPage } from '@/page-views/policies';

export function generateMetadata(): Promise<Metadata> {
  return policyMetadata('cookie-policy', 'en');
}

export default function EnglishCookiePolicyPage() {
  return renderPolicyPage('cookie-policy', 'en');
}
