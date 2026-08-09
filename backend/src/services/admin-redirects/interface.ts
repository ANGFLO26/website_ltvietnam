import type { Redirect, RedirectStatus, RedirectType } from '../../dao/redirects/object.js';

export const ADMIN_REDIRECT_SERVICE = Symbol('ADMIN_REDIRECT_SERVICE');

export interface AdminRedirectService {
  list(
    filter: {
      readonly status?: RedirectStatus;
      readonly search?: string;
      readonly neverHit?: boolean;
    },
    page: { readonly page: number; readonly pageSize: number },
  ): Promise<{
    readonly items: readonly Redirect[];
    readonly page: number;
    readonly pageSize: number;
    readonly totalItems: number;
  }>;
  findById(id: string): Promise<Redirect>;
  create(input: {
    readonly sourcePath: string;
    readonly targetPath: string;
    readonly redirectType?: RedirectType;
  }): Promise<Redirect>;
  update(
    id: string,
    input: {
      readonly targetPath?: string;
      readonly redirectType?: RedirectType;
      readonly status?: RedirectStatus;
    },
  ): Promise<Redirect>;
  delete(id: string): Promise<void>;
}
