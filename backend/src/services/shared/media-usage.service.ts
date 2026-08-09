import { ConflictError, NotFoundError } from '../../shared/errors.js';
import type { DaoScope } from '../../dao/dao-scope.js';
import type {
  MediaDeleteDecision,
  MediaUsage,
  MediaUsagePlace,
  MediaUsageService,
} from './media-usage.interface.js';

export type MediaUsageDaos = DaoScope<'media' | 'contentMediaRefs'>;

/** Ra soat ca FK truc tiep va anh nhung trong content block truoc khi xoa. */
export class MediaUsageServiceImpl implements MediaUsageService {
  constructor(private readonly daos: MediaUsageDaos) {}

  async usage(mediaId: string): Promise<MediaUsage> {
    // Lay ca con so LAN toa do cua hai nguon de man hinh quan tri chi ro noi can sua.
    const [all, refs] = await Promise.all([
      this.daos.media.countReferences(mediaId),
      this.daos.contentMediaRefs.findByMedia(mediaId),
    ]);
    const contentBlocks = refs.length;
    const foreignKeys = Math.max(0, all - contentBlocks);
    const foreignRefs = foreignKeys > 0 ? await this.daos.media.findReferencePlaces(mediaId) : [];

    const places: MediaUsagePlace[] = [
      ...foreignRefs.map((r) => ({
        source: 'foreign_key' as const,
        entityType: r.entityType,
        entityId: r.entityId,
        fieldName: r.fieldName,
        locale: null,
      })),
      ...refs.map((r) => ({
        source: 'content_block' as const,
        entityType: r.entityType,
        entityId: r.entityId,
        fieldName: r.fieldName,
        locale: r.locale,
      })),
    ];

    return {
      mediaId,
      foreignKeys,
      contentBlocks,
      total: foreignKeys + contentBlocks,
      places,
    };
  }

  async canDelete(mediaId: string): Promise<MediaDeleteDecision> {
    const usage = await this.usage(mediaId);
    return usage.total === 0 ? { allowed: true } : { allowed: false, usage };
  }

  async softDelete(mediaId: string, at: Date = new Date()): Promise<void> {
    const media = await this.daos.media.findById(mediaId);
    if (!media) throw new NotFoundError('MEDIA_NOT_FOUND', `Khong tim thay tep ${mediaId}`);

    // Kiem va soft-delete trong cung transaction; den purge lai kiem them mot lan.
    await this.daos.transaction(async (tx) => {
      const all = await tx.media.countReferences(mediaId);
      if (all > 0) {
        const usage = await this.usage(mediaId);
        throw new ConflictError('MEDIA_IN_USE', `Tep dang duoc dung o ${usage.total} cho`, {
          usage,
        });
      }
      await tx.media.softDelete(mediaId, at);
    });
  }

  async findPurgeable(before: Date, limit: number): Promise<readonly string[]> {
    const candidates = await this.daos.media.findPurgeCandidates(before, limit);
    const out: string[] = [];
    for (const media of candidates) {
      if ((await this.daos.media.countReferences(media.id)) === 0) out.push(media.id);
    }
    return out;
  }
}
