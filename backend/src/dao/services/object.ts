import type { EntityStatus } from '../brands/object.js';
import type { ContentBlock } from '../content.js';
import type { Locale } from '../translation.support.js';

/**
 * DICH VU — vua la CAY vua co BAN DICH.
 *
 * Bang cha `services` KHONG co ten va khong co slug. Nghe la, nhung dung:
 * ten va slug phu thuoc ngon ngu, nen chung song trong `service_translations`.
 * Bang cha chi giu nhung gi KHONG doi theo ngon ngu — vi tri trong cay, anh
 * dai dien, thu tu hien thi, trang thai chung.
 *
 * Hai muc trang thai, va ca hai deu can:
 *   `services.status`              — dich vu nay con cung cap khong
 *   `service_translations.status`  — ban tieng nay da viet xong chua
 * Ban tieng Anh con dang nhap trong khi ban tieng Viet da len song la tinh
 * huong binh thuong, khong phai ngoai le.
 */
export interface Service {
  readonly id: string;
  readonly parentId: string | null;
  readonly ancestorIds: string[];
  readonly depth: number;
  readonly serviceType: string | null;
  readonly featuredImageId: string | null;
  readonly status: EntityStatus;
  readonly isFeatured: boolean;
  readonly displayOrder: number;
  readonly publishedAt: Date | null;
}

/** Noi dung mot ngon ngu cua dich vu. */
export interface ServiceTranslation {
  readonly id: string;
  readonly serviceId: string;
  readonly locale: Locale;
  readonly name: string;
  readonly slug: string;
  readonly shortDescription: string | null;
  readonly overview: ContentBlock[];
  readonly customerProblems: ContentBlock[];
  readonly scopeOfWork: ContentBlock[];
  readonly process: ContentBlock[];
  readonly benefits: ContentBlock[];
  readonly faq: ContentBlock[];
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  readonly status: 'draft' | 'published' | 'hidden';
  readonly publishedAt: Date | null;
  readonly firstPublishedAt: Date | null;
}

export interface CreateServiceInput {
  readonly parentId?: string | null;
  readonly serviceType?: string | null;
  readonly featuredImageId?: string | null;
  readonly createdBy?: string | null;
}

export type UpdateServiceInput = Partial<Omit<CreateServiceInput, 'parentId' | 'createdBy'>> & {
  readonly isFeatured?: boolean;
  readonly displayOrder?: number;
  readonly updatedBy?: string | null;
};

/** Ghi mot ban dich. `name` va `slug` bat buoc; phan con lai co the de sau. */
export interface UpsertServiceTranslationInput {
  readonly locale: Locale;
  readonly name: string;
  readonly slug: string;
  readonly shortDescription?: string | null;
  readonly overview?: ContentBlock[];
  readonly customerProblems?: ContentBlock[];
  readonly scopeOfWork?: ContentBlock[];
  readonly process?: ContentBlock[];
  readonly benefits?: ContentBlock[];
  readonly faq?: ContentBlock[];
  readonly seoTitle?: string | null;
  readonly seoDescription?: string | null;
}

export interface ServiceFilter {
  readonly status?: EntityStatus;
  readonly isFeatured?: boolean;
  readonly parentId?: string | null;
  readonly includeDeleted?: boolean;
}

/**
 * Dich vu kem ban dich cua MOT ngon ngu — hinh dang ma trang cong khai can.
 * Ghep san o tang dao de trang khong phai goi hai lan.
 */
export interface ServiceWithTranslation {
  readonly service: Service;
  readonly translation: ServiceTranslation;
}
