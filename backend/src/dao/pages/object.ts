import type { EntityStatus } from '../brands/object.js';
import type { ContentBlock } from '../content.js';
import type { Locale } from '../translation.support.js';

/**
 * TRANG TINH — gioi thieu, lien he, chinh sach bao mat, dieu khoan.
 *
 * `page_type` la UNIQUE va la thu ma ma nguon tham chieu toi ("trang lien he"),
 * khong phai slug. Ly do: slug doi theo ngon ngu va co the doi theo thoi gian,
 * nhung ma nguon can mot cai ten on dinh de tro toi. Doi slug thi khong gay
 * gi; doi `page_type` thi gay, va do la dung — no la khoa nghiep vu.
 *
 * `is_system_page` danh dau nhung trang KHONG duoc xoa: chinh sach bao mat,
 * dieu khoan, cookie. Thieu chung thi khong tuan thu duoc, ma khong co gi
 * o giao dien nhac.
 */
export interface AppPage {
  readonly id: string;
  readonly pageType: string;
  readonly featuredImageId: string | null;
  readonly status: EntityStatus;
  readonly isSystemPage: boolean;
  readonly displayOrder: number;
  readonly publishedAt: Date | null;
}

export interface PageTranslation {
  readonly id: string;
  readonly pageId: string;
  readonly locale: Locale;
  readonly title: string;
  readonly slug: string;
  readonly summary: string | null;
  readonly content: ContentBlock[];
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  readonly status: 'draft' | 'published' | 'hidden';
  readonly publishedAt: Date | null;
  readonly firstPublishedAt: Date | null;
}

export interface CreatePageInput {
  readonly pageType: string;
  readonly featuredImageId?: string | null;
  readonly isSystemPage?: boolean;
  readonly createdBy?: string | null;
}

export interface UpdatePageInput {
  readonly featuredImageId?: string | null;
  readonly displayOrder?: number;
  readonly updatedBy?: string | null;
}

export interface UpsertPageTranslationInput {
  readonly locale: Locale;
  readonly title: string;
  readonly slug: string;
  readonly summary?: string | null;
  readonly content?: ContentBlock[];
  readonly seoTitle?: string | null;
  readonly seoDescription?: string | null;
}

export interface PageWithTranslation {
  readonly page: AppPage;
  readonly translation: PageTranslation;
}
