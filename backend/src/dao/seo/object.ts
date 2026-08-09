import type { Locale } from '@ltv/contracts';

export type SitemapSourceKind =
  | 'page'
  | 'product'
  | 'brand'
  | 'product_category'
  | 'standard'
  | 'application'
  | 'service'
  | 'project'
  | 'post'
  | 'post_category'
  | 'document';

/** Mot URL dong tiem nang; service con phai ap quy tac route/canonical. */
export interface SitemapSource {
  readonly kind: SitemapSourceKind;
  readonly locale: Locale;
  readonly slug: string;
  readonly pageType: string | null;
  readonly updatedAt: Date;
  readonly hasEditorialContent: boolean;
}

export interface SitemapSourceRow {
  readonly kind: SitemapSourceKind;
  readonly locale: Locale;
  readonly slug: string;
  readonly page_type: string | null;
  readonly updated_at: Date;
  readonly has_editorial_content: boolean;
}
