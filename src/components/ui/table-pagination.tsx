"use client";

import { Button } from "@/components/ui/button";

export const TABLE_PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
export const DEFAULT_TABLE_PAGE_SIZE = 50;

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
};

export function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = TABLE_PAGE_SIZE_OPTIONS,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--text-muted)]">
      <div className="flex flex-wrap items-center gap-2">
        <span>
          Showing {from}–{to} of {total}
        </span>
        <label className="flex items-center gap-1.5">
          <span className="font-medium text-[var(--text)]">Rows</span>
          <select
            className="rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--input-bg)] px-2 py-1.5 text-sm text-[var(--text)] outline-none"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          Previous
        </Button>
        <span className="min-w-[5.5rem] text-center font-medium text-[var(--text)]">
          Page {safePage} / {totalPages}
        </span>
        <Button
          size="sm"
          variant="secondary"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
