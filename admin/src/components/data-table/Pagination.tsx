import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  readonly page: number;
  readonly totalPages: number;
  readonly hrefFor: (page: number) => string;
}) {
  const displayTotal = Math.max(1, totalPages);
  return (
    <nav className="pagination" aria-label="Phân trang">
      <span>
        Trang {page} / {displayTotal}
      </span>
      <div>
        {page > 1 ? (
          <Link
            className="button button--secondary"
            href={hrefFor(page - 1)}
            aria-label="Trang trước"
          >
            <ChevronLeft size={16} />
            Trước
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link
            className="button button--secondary"
            href={hrefFor(page + 1)}
            aria-label="Trang sau"
          >
            Sau
            <ChevronRight size={16} />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
