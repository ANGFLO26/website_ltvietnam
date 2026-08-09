import type { Locale } from './routes.js';

/** Chi thi robots ma frontend dat vao the meta. */
export type RobotsDirective = 'index,follow' | 'noindex,follow' | 'noindex,nofollow';

/**
 * Mot URL thay the da duoc xac minh la published.
 *
 * `url` la URL tuyet doi de frontend khong phai lap lai quy tac locale/route.
 * `slug` duoc giu de giao dien co the tao nut chuyen ngon ngu ma khong tach URL.
 */
export interface HreflangAlternateView {
  readonly locale: Locale;
  readonly slug: string;
  readonly url: string;
}

/** Metadata tu sinh theo ADR-011; khong co truong nao duoc luu trong DB. */
export interface SeoDetailView {
  readonly canonical: string;
  readonly robots: RobotsDirective;
  readonly hreflang_alternates: readonly HreflangAlternateView[];
}
