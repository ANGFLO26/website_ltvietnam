import type { EntityStatus } from '../brands/object.js';
import type { ContentBlock } from '../content.js';
import type { Locale } from '../translation.support.js';

/**
 * BAI VIET — bang cha giu quan he, bang dich giu noi dung.
 *
 * `category_id` la NOT NULL: bai viet khong co danh muc thi khong biet xep
 * vao dau tren giao dien, va khoa ngoai RESTRICT bao dam danh muc khong bi
 * xoa khi con bai.
 */
export interface Post {
  readonly id: string;
  readonly categoryId: string;
  readonly featuredImageId: string | null;
  readonly authorId: string | null;
  readonly status: EntityStatus;
  readonly isFeatured: boolean;
  readonly publishedAt: Date | null;
}

export interface PostTranslation {
  readonly id: string;
  readonly postId: string;
  readonly locale: Locale;
  readonly title: string;
  readonly slug: string;
  readonly excerpt: string | null;
  readonly content: ContentBlock[];
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  readonly status: 'draft' | 'published' | 'hidden';
  readonly publishedAt: Date | null;
  readonly firstPublishedAt: Date | null;
}

export interface CreatePostInput {
  readonly categoryId: string;
  readonly featuredImageId?: string | null;
  readonly authorId?: string | null;
}

export interface UpdatePostInput {
  readonly categoryId?: string;
  readonly featuredImageId?: string | null;
  readonly authorId?: string | null;
  readonly isFeatured?: boolean;
}

export interface UpsertPostTranslationInput {
  readonly locale: Locale;
  readonly title: string;
  readonly slug: string;
  readonly excerpt?: string | null;
  readonly content?: ContentBlock[];
  readonly seoTitle?: string | null;
  readonly seoDescription?: string | null;
}

export interface PostFilter {
  readonly status?: EntityStatus;
  readonly categoryId?: string;
  readonly isFeatured?: boolean;
  readonly includeDeleted?: boolean;
}

export interface PostWithTranslation {
  readonly post: Post;
  readonly translation: PostTranslation;
}

/** Cac quan he cua bai viet — deu la thay-ca-tap (ADR-008). */
export interface PostLinks {
  readonly productIds?: readonly string[];
  readonly serviceIds?: readonly string[];
  readonly projectIds?: readonly string[];
  readonly brandIds?: readonly string[];
}
