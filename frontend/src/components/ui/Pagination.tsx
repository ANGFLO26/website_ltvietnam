import Link from 'next/link';

export interface PaginationProps {
  readonly page: number;
  readonly totalPages: number;
  readonly previousLabel: string;
  readonly nextLabel: string;
  readonly pageLabel: string;
  readonly hrefForPage: (page: number) => string;
}

export function Pagination(props: PaginationProps) {
  if (props.totalPages <= 1) return null;
  return (
    <nav className="flex items-center justify-between gap-4" aria-label={props.pageLabel}>
      {props.page <= 1 ? (
        <span />
      ) : (
        <Link href={props.hrefForPage(props.page - 1)}>{props.previousLabel}</Link>
      )}
      <span>
        {props.pageLabel
          .replace('{page}', String(props.page))
          .replace('{total}', String(props.totalPages))}
      </span>
      {props.page >= props.totalPages ? (
        <span />
      ) : (
        <Link href={props.hrefForPage(props.page + 1)}>{props.nextLabel}</Link>
      )}
    </nav>
  );
}
