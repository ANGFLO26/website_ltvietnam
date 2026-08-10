import type { Metadata } from 'next';
import { policyMetadata, renderPolicyPage } from '@/lib/w6/policies';

export function generateMetadata(): Promise<Metadata> {
  return policyMetadata('terms-of-use', 'en');
}

export default function TermsOfUsePage() {
  return renderPolicyPage('terms-of-use', 'en');
}
