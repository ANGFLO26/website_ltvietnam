import { anyBlockSchema, type ContentBlock } from '@ltv/contracts';

export type { ContentBlock };

/**
 * Doc mot cot JSONB khoi noi dung tu DB thanh mang khoi da kiem.
 *
 * Vi sao PHAI kiem lai o day, du da kiem luc ghi:
 * cot `description JSONB` khong co rang buoc hinh dang. Du lieu co the den tu
 * ban migration cu, tu mot lan `psql` sua tay, hoac tu phien ban truoc cua
 * lat cat khoi. Neu mapper tin tuong va ep kieu, thi mot khoi hong se di thang
 * len renderer va lam trang trang — cach xa cho gay loi hang thang.
 *
 * Cach xu ly: BO khoi hong, giu phan con lai. Trang thieu mot doan van van
 * doc duoc; trang trang thi khong.
 */
export function toBlocks(raw: unknown): ContentBlock[] {
  if (!Array.isArray(raw)) return [];
  const out: ContentBlock[] = [];
  for (const item of raw) {
    const r = anyBlockSchema.safeParse(item);
    if (r.success) out.push(r.data);
  }
  return out;
}

/** Ghi mang khoi xuong cot JSONB. */
export function fromBlocks(blocks: readonly ContentBlock[] | undefined): string {
  return JSON.stringify(blocks ?? []);
}
