/**
 * Thuc the nghiep vu `Redirect`.
 *
 * Bang nay la thu giu lai gia tri SEO cua ~200 URL `.aspx` cu (ADR-001).
 * Spike P0 da chung minh: chi middleware phat duoc 301 THAT (18 byte),
 * `redirect()` cua Next phat 307 kem 5.8 KB HTML. Middleware doc bang nay
 * TRUOC KHI render, nen moi truy van o day nam tren duong nong.
 */
export type RedirectType = 301 | 302;
export type RedirectStatus = 'active' | 'disabled';

export interface Redirect {
  readonly id: string;
  readonly sourcePath: string;
  readonly targetPath: string;
  readonly redirectType: RedirectType;
  readonly status: RedirectStatus;
  readonly hitCount: number;
  readonly lastHitAt: Date | null;
  readonly createdAt: Date;
}

export interface CreateRedirectInput {
  readonly sourcePath: string;
  readonly targetPath: string;
  /** Mac dinh 301 — doi slug la thay doi vinh vien (ADR-002 muc 6). */
  readonly redirectType?: RedirectType;
}

export interface UpdateRedirectInput {
  readonly targetPath?: string;
  readonly redirectType?: RedirectType;
  readonly status?: RedirectStatus;
}

export interface RedirectFilter {
  readonly status?: RedirectStatus;
  /** Tim theo mot phan cua source hoac target. */
  readonly search?: string;
  /** Chi lay cai chua bao gio duoc dung — de don rac. */
  readonly neverHit?: boolean;
}

export class RedirectLoopError extends Error {
  constructor(readonly sourcePath: string, readonly targetPath: string) {
    super(`Chuyen huong tao vong lap: ${sourcePath} -> ${targetPath}`);
    this.name = 'RedirectLoopError';
  }
}
