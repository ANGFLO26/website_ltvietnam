import type { EntityStatus } from '../brands/object.js';
import type { ContentBlock } from '../content.js';
import type { Locale } from '../translation.support.js';

/**
 * Ngay tren lich, dinh dang `YYYY-MM-DD`.
 *
 * KHONG dung `Date`: ngay ban giao mot du an la mot o tren to lich, khong
 * phai mot thoi diem. Dung `Date` thi no keo theo mui gio, va ngay se lech
 * khi may chu va may soan thao o hai mui khac nhau.
 */
export type CalendarDate = string;

export type ProjectType =
  | 'installation' | 'commissioning' | 'handover' | 'training'
  | 'maintenance' | 'repair' | 'fabrication' | 'case_study' | 'other';

/**
 * MUC DO CONG KHAI CUA KHACH HANG — cot nguy hiem nhat trong nhom nay.
 *
 *   public         duoc neu ten that
 *   hide_name      chi duoc noi "mot nha may loc dau tai Dung Quat"
 *   industry_only  chi duoc noi nganh
 *   confidential   khong duoc nhac gi
 *
 * Vi sao dang de tam: dua nham ten mot khach hang da ky NDA len website la
 * su co phap ly, khong phai loi hien thi. Va no khong the phat hien duoc
 * bang mat thuong — trang nhin van dep.
 *
 * Vi vay `ProjectCard` va `ProjectDetail` KHONG mang `customerId` ra ngoai;
 * chung chi mang `customerDisplayName` da duoc tang dao tinh san theo dung
 * muc do nay. Muon biet khach that la ai thi phai goi ham rieng, va cho goi
 * do la cho nguoi review nhin thay.
 */
export type CustomerVisibility = 'public' | 'hide_name' | 'industry_only' | 'confidential';

export interface Project {
  readonly id: string;
  readonly customerId: string | null;
  readonly projectType: ProjectType;
  readonly customerVisibility: CustomerVisibility;
  readonly locationText: string | null;
  readonly countryCode: string | null;
  /** `YYYY-MM-DD`. Ngay tren lich, khong co mui gio — xem `dao/connection.ts`. */
  readonly startedAt: CalendarDate | null;
  readonly completedAt: CalendarDate | null;
  readonly featuredImageId: string | null;
  readonly status: EntityStatus;
  readonly isFeatured: boolean;
  readonly publishedAt: Date | null;
}

export interface ProjectTranslation {
  readonly id: string;
  readonly projectId: string;
  readonly locale: Locale;
  readonly title: string;
  readonly slug: string;
  readonly shortDescription: string | null;
  readonly scopeOfWork: ContentBlock[];
  readonly implementation: ContentBlock[];
  readonly result: ContentBlock[];
  /** Ten hien thi do bien tap dat khi khong duoc neu ten that. */
  readonly customerDisplayName: string | null;
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  readonly status: 'draft' | 'published' | 'hidden';
  readonly publishedAt: Date | null;
  readonly firstPublishedAt: Date | null;
}

export interface CreateProjectInput {
  readonly projectType: ProjectType;
  readonly customerId?: string | null;
  readonly customerVisibility?: CustomerVisibility;
  readonly locationText?: string | null;
  readonly countryCode?: string | null;
  readonly startedAt?: CalendarDate | null;
  readonly completedAt?: CalendarDate | null;
  readonly featuredImageId?: string | null;
  readonly createdBy?: string | null;
}

export type UpdateProjectInput = Partial<Omit<CreateProjectInput, 'createdBy'>> & {
  readonly isFeatured?: boolean;
  readonly updatedBy?: string | null;
};

export interface UpsertProjectTranslationInput {
  readonly locale: Locale;
  readonly title: string;
  readonly slug: string;
  readonly shortDescription?: string | null;
  readonly scopeOfWork?: ContentBlock[];
  readonly implementation?: ContentBlock[];
  readonly result?: ContentBlock[];
  readonly customerDisplayName?: string | null;
  readonly seoTitle?: string | null;
  readonly seoDescription?: string | null;
}

export interface ProjectFilter {
  readonly status?: EntityStatus;
  readonly projectType?: ProjectType;
  readonly isFeatured?: boolean;
  readonly includeDeleted?: boolean;
}

export interface ProjectWithTranslation {
  readonly project: Project;
  readonly translation: ProjectTranslation;
}

export interface ProjectLinks {
  readonly productIds?: readonly string[];
  readonly serviceIds?: readonly string[];
  readonly brandIds?: readonly string[];
}
