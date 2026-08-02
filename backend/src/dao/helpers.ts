/**
 * Tien ich dung chung cho tang DAO.
 *
 * Vi sao la HAM chu khong phai lop cha generic:
 * mot `CrudDao<TTable, TEntity>` generic tren Kysely phai ep kieu lien tuc va
 * sinh ra thong bao loi rat kho doc. Tiet kiem duoc chung 15 dong moi DAO
 * nhung tra gia bang kha nang doc loi — khong dang.
 *
 * Lop cha CHI dung o cho co logic that su dang ke va dung chung:
 * `TreeDao` (5 bang) va `SluggedDao` (12 bang).
 */

export interface Page {
  readonly page: number;
  readonly pageSize: number;
}

export interface Paged<T> {
  readonly data: T[];
  readonly meta: {
    readonly page: number;
    readonly pageSize: number;
    readonly totalItems: number;
    readonly totalPages: number;
  };
}

export const MAX_PAGE_SIZE = 100;

/** Chuan hoa tham so phan trang theo `doc/06` PHAN II. */
export function normalizePage(input: Partial<Page> | undefined): Page {
  const page = Math.max(1, Math.trunc(input?.page ?? 1));
  const raw = Math.trunc(input?.pageSize ?? 20);
  return { page, pageSize: Math.min(MAX_PAGE_SIZE, Math.max(1, raw)) };
}

export function offsetOf(p: Page): number {
  return (p.page - 1) * p.pageSize;
}

export function toPaged<T>(data: T[], totalItems: number, p: Page): Paged<T> {
  return {
    data,
    meta: {
      page: p.page,
      pageSize: p.pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / p.pageSize)),
    },
  };
}

/**
 * Whitelist cot duoc sap xep (A14: `sort`/`order` chi nhan whitelist backend).
 * Nem loi neu client gui cot la — khong bao gio ghep thang vao SQL.
 */
export function assertSortable<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  if (value === undefined) return fallback;
  if ((allowed as readonly string[]).includes(value)) return value as T;
  throw new Error(`Cot sap xep khong hop le: ${value}`);
}

export type SortDirection = 'asc' | 'desc';

export function assertDirection(value: string | undefined): SortDirection {
  return value === 'desc' ? 'desc' : 'asc';
}
