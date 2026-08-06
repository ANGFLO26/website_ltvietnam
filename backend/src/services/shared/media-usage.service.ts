import { ConflictError, NotFoundError } from '../../shared/errors.js';
import type { DaoScope } from '../../dao/dao-scope.js';
import type {
  MediaDeleteDecision,
  MediaUsage,
  MediaUsagePlace,
  MediaUsageService,
} from './media-usage.interface.js';

export type MediaUsageDaos = DaoScope<'media' | 'contentMediaRefs'>;

/**
 * RA SOAT TEP TRUOC KHI XOA — bit lo hong A4 o tang nghiep vu.
 *
 * Co HAI nguon tham chieu, va chung hoan toan doc lap:
 *
 *   1. KHOA NGOAI — `products.featured_image_id`, `brands.logo_id`,
 *      `documents.file_id`... PostgreSQL biet ve chung va `ON DELETE RESTRICT`
 *      tu bao ve. Tang DAO dem bang cach doc `pg_catalog`, nen bang moi co
 *      khoa ngoai toi `media` duoc tinh tu dong.
 *
 *   2. KHOI NOI DUNG JSONB — anh nhung giua bai viet. PostgreSQL KHONG biet
 *      gi ve chung; `content_media_refs` la chi muc nguoc do ung dung tu duy
 *      tri de bu lai.
 *
 * Bo qua nguon thu hai la bo qua PHAN LON anh trong mot website noi dung.
 */
export class MediaUsageServiceImpl implements MediaUsageService {
  constructor(private readonly daos: MediaUsageDaos) {}

  async usage(mediaId: string): Promise<MediaUsage> {
    // `countReferences` cua DAO doc tu `pg_catalog` va da GOM CA
    // `content_media_refs` (vi no cung co khoa ngoai toi `media`).
    // Nen phai tru ra, khong thi dem doi mot lan.
    const all = await this.daos.media.countReferences(mediaId);
    const refs = await this.daos.contentMediaRefs.findByMedia(mediaId);
    const contentBlocks = refs.length;
    const foreignKeys = Math.max(0, all - contentBlocks);

    const places: MediaUsagePlace[] = refs.map((r) => ({
      source: 'content_block' as const,
      entityType: r.entityType,
      entityId: r.entityId,
      fieldName: r.fieldName,
      locale: r.locale,
    }));

    /**
     * Chi tiet cho nhanh KHOA NGOAI chua co.
     *
     * `countReferences` tra ve mot con so, khong tra ve toa do. Liet ke duoc
     * thi giao dien to sang duoc tung cho, nhung phai sinh 22 truy van hoac
     * mot cau UNION lon — va o buoc "xac nhan xoa" thi con so da du de chan.
     * Ghi lai o day de nguoi doc sau khong tuong day la thieu sot.
     */
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

    /**
     * Kiem va xoa trong CUNG transaction.
     *
     * Kiem ngoai transaction roi xoa la mot khoang trong: giua hai thao tac,
     * mot nguoi khac co the vua chen anh nay vao bai viet cua ho. Truong hop
     * hiem, nhung hau qua la mot bai viet co o anh vo — va khong ai biet tai
     * sao.
     */
    await this.daos.transaction(async (tx) => {
      const all = await tx.media.countReferences(mediaId);
      if (all > 0) {
        const usage = await this.usage(mediaId);
        throw new ConflictError(
          'MEDIA_IN_USE',
          `Tep dang duoc dung o ${usage.total} cho`,
          { usage },
        );
      }
      await tx.media.softDelete(mediaId, at);
    });
  }

  async findPurgeable(before: Date, limit: number): Promise<readonly string[]> {
    const candidates = await this.daos.media.findPurgeCandidates(before, limit);

    // Kiem LAI tung cai. Giua luc xoa mem va luc don, mot ban nhap co the da
    // duoc khoi phuc va dung lai anh do — va don tep la khong hoan tac duoc.
    const out: string[] = [];
    for (const m of candidates) {
      if ((await this.daos.media.countReferences(m.id)) === 0) out.push(m.id);
    }
    return out;
  }
}
