"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  TABLE_ELEMENT_CLASS,
  TABLE_SHELL_CLASS,
  SyncedHorizontalScroll,
} from "@/components/ui/table-scroll";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  TablePagination,
  TABLE_PAGE_SIZE_OPTIONS,
} from "@/components/ui/table-pagination";
import { TableSkeleton } from "@/components/ui/skeleton";

type Column<T> = {
  key: string;
  header: string | React.ReactNode;
  className?: string;
  /** When true, cell content may wrap (default: nowrap for horizontal scroll). */
  wrap?: boolean;
  render: (row: T) => React.ReactNode;
};

type DataTablePaginationInfo = {
  page: number;
  pageSize: number;
  /** Rows visible on the current page. */
  shown: number;
  /** Total rows after filters (before pagination). */
  total: number;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  isLoading?: boolean;
  /** Enable multi-select checkboxes. */
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (next: Set<string>) => void;
  onRowDoubleClick?: (row: T) => void;
  /** Client-side pagination (default true). */
  paginate?: boolean;
  pageSizeOptions?: readonly number[];
  defaultPageSize?: number;
  /** Fired when page / page size / visible row count changes. */
  onPaginationInfo?: (info: DataTablePaginationInfo) => void;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = "No records found.",
  isLoading,
  selectable = false,
  selectedKeys,
  onSelectionChange,
  onRowDoubleClick,
  paginate = true,
  pageSizeOptions = TABLE_PAGE_SIZE_OPTIONS,
  defaultPageSize = DEFAULT_TABLE_PAGE_SIZE,
  onPaginationInfo,
}: DataTableProps<T>) {
  const tableRef = useRef<HTMLTableElement>(null);
  const selected = selectedKeys ?? new Set<string>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  useEffect(() => {
    setPage(1);
  }, [rows, pageSize]);

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(page, totalPages);

  const pageRows = useMemo(() => {
    if (!paginate) return rows;
    const start = (safePage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [paginate, rows, safePage, pageSize]);

  const shown = paginate ? pageRows.length : total;

  useEffect(() => {
    onPaginationInfo?.({
      page: safePage,
      pageSize,
      shown,
      total,
    });
  }, [onPaginationInfo, safePage, pageSize, shown, total]);

  const allKeys = pageRows.map((row) => rowKey(row));
  const allSelected =
    allKeys.length > 0 && allKeys.every((key) => selected.has(key));
  const someSelected = allKeys.some((key) => selected.has(key));

  function toggleAll() {
    if (!onSelectionChange) return;
    if (allSelected) {
      const next = new Set(selected);
      for (const key of allKeys) next.delete(key);
      onSelectionChange(next);
      return;
    }
    const next = new Set(selected);
    for (const key of allKeys) next.add(key);
    onSelectionChange(next);
  }

  function toggleOne(key: string) {
    if (!onSelectionChange) return;
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange(next);
  }

  if (isLoading) {
    return (
      <TableSkeleton
        columns={columns.length}
        selectable={selectable}
      />
    );
  }

  if (rows.length === 0) {
    return (
      <div className="spark-card border-dashed px-4 py-10 text-center text-sm font-medium text-[var(--text-muted)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div>
      <div className={TABLE_SHELL_CLASS}>
        <SyncedHorizontalScroll tableRef={tableRef}>
          <table ref={tableRef} className={TABLE_ELEMENT_CLASS}>
            <thead className="border-b border-[var(--border-strong)] bg-[var(--surface-raised)] text-xs uppercase tracking-wide text-[var(--text-subtle)]">
              <tr>
                {selectable ? (
                  <th className="sticky left-0 z-10 w-10 whitespace-nowrap bg-[var(--surface-raised)] px-3 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all rows"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = !allSelected && someSelected;
                      }}
                      onChange={toggleAll}
                    />
                  </th>
                ) : null}
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`whitespace-nowrap px-4 py-3 font-semibold ${column.className ?? ""}`}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const key = rowKey(row);
                const isSelected = selected.has(key);
                return (
                  <tr
                    key={key}
                    onDoubleClick={() => onRowDoubleClick?.(row)}
                    className={`border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface-hover)] ${
                      isSelected ? "bg-[var(--accent-muted)]" : ""
                    }`}
                  >
                    {selectable ? (
                      <td className="sticky left-0 z-10 whitespace-nowrap bg-[var(--surface)] px-3 py-3 group-hover:bg-[var(--surface-raised)]">
                        <input
                          type="checkbox"
                          aria-label={`Select row ${key}`}
                          checked={isSelected}
                          onChange={() => toggleOne(key)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-4 py-3 align-middle text-[var(--text)] ${
                          column.wrap ? "whitespace-normal" : "whitespace-nowrap"
                        } ${column.className ?? ""}`}
                      >
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </SyncedHorizontalScroll>
      </div>

      {paginate ? (
        <TablePagination
          page={safePage}
          pageSize={pageSize}
          total={total}
          pageSizeOptions={pageSizeOptions}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      ) : null}
    </div>
  );
}
