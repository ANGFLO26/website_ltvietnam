import type { ReactNode } from 'react';
import { EmptyState } from '@/components/ui/States';

export interface DataColumn<T> {
  readonly id: string;
  readonly header: string;
  readonly mobileLabel?: string;
  render(row: T): ReactNode;
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  caption,
  emptyTitle = 'Chưa có dữ liệu',
  emptyDescription = 'Không có bản ghi phù hợp với bộ lọc hiện tại.',
}: {
  readonly rows: readonly T[];
  readonly columns: readonly DataColumn<T>[];
  readonly rowKey: (row: T) => string;
  readonly caption: string;
  readonly emptyTitle?: string;
  readonly emptyDescription?: string;
}) {
  if (rows.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />;
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.id} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td key={column.id} data-label={column.mobileLabel ?? column.header}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
