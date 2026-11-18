import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Select } from "./ui";

export const TABLE_PAGE_SIZES = [5, 10, 25, 50] as const;
const DEFAULT_PAGE_SIZE = 10;

export function useTablePage<T>(rows: readonly T[], initialRowIndex = 0) {
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(() => Math.floor(initialRowIndex / DEFAULT_PAGE_SIZE) + 1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize)));
  const start = (currentPage - 1) * pageSize;
  function changePage(page: number) {
    setPage(page);
    viewportRef.current?.scrollTo({ top: 0 });
  }

  return {
    start,
    visibleRows: rows.slice(start, start + pageSize),
    viewportRef,
    resetPage: () => changePage(1),
    pagination: {
      total: rows.length,
      page: currentPage,
      pageSize,
      onPageChange: changePage,
      onPageSizeChange: (size: number) => {
        setPageSize(size);
        changePage(1);
      },
    },
  };
}

export function TablePagination({
  label,
  noun,
  plural = noun + "s",
  total,
  page,
  pageSize,
  onPageChange,
  autoPageSize,
  onPageSizeChange,
}: {
  label: string;
  noun: string;
  plural?: string;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  autoPageSize?: boolean;
  onPageSizeChange?: (size: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const range = start === end ? String(start) : start + "–" + end;
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 shrink-0 border-t border-brio-subtle px-5 py-3">
      <p role="status" className="text-sm text-brio-muted tabular-nums">
        {total ? range + " of " + total + " " : "0 "}
        {total === 1 ? noun : plural}
      </p>
      {(pages > 1 || onPageSizeChange) && (
        <nav aria-label={label} className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
          {onPageSizeChange && (
            <label className="flex items-center gap-2 text-xs text-brio-muted">
              Rows per page
              <Select
                className="w-20"
                value={autoPageSize ? 0 : pageSize}
                onChange={(event) => onPageSizeChange(Number(event.target.value))}
              >
                {autoPageSize !== undefined && <option value={0}>Auto</option>}
                {TABLE_PAGE_SIZES.map((size) => (
                  <option value={size} key={size}>
                    {size}
                  </option>
                ))}
              </Select>
            </label>
          )}
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="w-8 px-0"
              aria-label="Previous page"
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft aria-hidden className="size-4" />
            </Button>
            <span className="px-1 text-xs text-brio-muted tabular-nums">
              Page {page} of {pages}
            </span>

            <Button
              size="sm"
              className="w-8 px-0"
              aria-label="Next page"
              disabled={page === pages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight aria-hidden className="size-4" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
