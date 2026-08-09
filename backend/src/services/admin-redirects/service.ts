import { buildReservedPaths, isReservedPath } from '@ltv/contracts';
import { ConflictError, NotFoundError } from '../../shared/errors.js';
import type { DaoScope } from '../../dao/dao-scope.js';
import { RedirectLoopError } from '../../dao/redirects/object.js';
import type { SlugService } from '../shared/slug.interface.js';
import type { AdminRedirectService } from './interface.js';

export type AdminRedirectDaos = DaoScope<'redirects'>;

export class AdminRedirectServiceImpl implements AdminRedirectService {
  private readonly reserved = buildReservedPaths();

  constructor(
    private readonly daos: AdminRedirectDaos,
    private readonly slugs: Pick<SlugService, 'isLivePath'>,
  ) {}

  async list(
    filter: Parameters<AdminRedirectService['list']>[0],
    page: Parameters<AdminRedirectService['list']>[1],
  ) {
    const result = await this.daos.redirects.list(filter, page);
    return {
      items: result.data,
      page: result.meta.page,
      pageSize: result.meta.pageSize,
      totalItems: result.meta.totalItems,
    };
  }

  async findById(id: string) {
    const redirect = await this.daos.redirects.findById(id);
    if (!redirect) throw new NotFoundError('REDIRECT_NOT_FOUND', `Khong tim thay redirect ${id}`);
    return redirect;
  }

  async create(input: Parameters<AdminRedirectService['create']>[0]) {
    await this.assertPath(input.sourcePath, input.targetPath);
    try {
      return await this.daos.transaction((tx) => tx.redirects.createCollapsingChain(input));
    } catch (error) {
      if (error instanceof RedirectLoopError) {
        throw new ConflictError('REDIRECT_LOOP', error.message);
      }
      throw error;
    }
  }

  async update(id: string, input: Parameters<AdminRedirectService['update']>[1]) {
    const current = await this.findById(id);
    const target = input.targetPath ?? current.targetPath;
    await this.assertPath(current.sourcePath, target);
    if (input.targetPath !== undefined) {
      return this.daos.transaction(async (tx) => {
        try {
          return await tx.redirects.retargetCollapsingChain(id, {
            ...input,
            targetPath: input.targetPath!,
          });
        } catch (error) {
          if (error instanceof RedirectLoopError) {
            throw new ConflictError('REDIRECT_LOOP', error.message);
          }
          throw error;
        }
      });
    }
    return this.daos.redirects.update(id, input);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.daos.redirects.delete(id);
  }

  private async assertPath(source: string, target: string): Promise<void> {
    if (!source.startsWith('/') || !target.startsWith('/')) {
      throw new ConflictError('REDIRECT_PATH_INVALID', 'Duong dan redirect phai bat dau bang /');
    }
    if (source === target)
      throw new ConflictError('REDIRECT_LOOP', 'Nguon va dich khong duoc trung nhau');
    if (isReservedPath(source, this.reserved)) {
      throw new ConflictError(
        'REDIRECT_SOURCE_IS_LIVE_ROUTE',
        'Khong duoc che route he thong dang hoat dong',
      );
    }
    if (await this.slugs.isLivePath(source)) {
      throw new ConflictError(
        'REDIRECT_SOURCE_IS_LIVE_ROUTE',
        'Khong duoc che noi dung dang duoc phuc vu',
      );
    }
  }
}
