import {
  TABLE_ELEMENT_CLASS,
  TABLE_SCROLL_CLASS,
  TABLE_SHELL_CLASS,
} from "@/components/ui/table-scroll";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`skeleton-block rounded-[var(--radius-sm)] bg-[var(--border)]/70 ${className}`}
      aria-hidden
    />
  );
}

export function SkeletonText({
  className = "",
  width = "w-full",
}: SkeletonProps & { width?: string }) {
  return <Skeleton className={`h-3.5 ${width} ${className}`} />;
}

type TableSkeletonProps = {
  columns?: number;
  rows?: number;
  selectable?: boolean;
};

export function TableSkeleton({
  columns = 5,
  rows = 8,
  selectable = false,
}: TableSkeletonProps) {
  const colCount = Math.max(1, columns);
  const rowCount = Math.max(1, rows);

  return (
    <div
      className={TABLE_SHELL_CLASS}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading table"
    >
      <div className={TABLE_SCROLL_CLASS}>
        <table className={TABLE_ELEMENT_CLASS}>
          <thead className="border-b border-[var(--border-strong)] bg-[var(--surface-raised)]">
            <tr>
              {selectable ? (
                <th className="w-10 px-3 py-3">
                  <Skeleton className="mx-auto h-4 w-4" />
                </th>
              ) : null}
              {Array.from({ length: colCount }).map((_, index) => (
                <th key={index} className="px-4 py-3">
                  <Skeleton className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-[var(--border)] last:border-b-0"
              >
                {selectable ? (
                  <td className="px-3 py-3">
                    <Skeleton className="mx-auto h-4 w-4" />
                  </td>
                ) : null}
                {Array.from({ length: colCount }).map((_, colIndex) => (
                  <td key={colIndex} className="px-4 py-3">
                    <Skeleton
                      className={`h-4 ${colIndex === 0 ? "w-36" : colIndex === colCount - 1 ? "w-20" : "w-24"}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <span className="sr-only">Loading table data</span>
    </div>
  );
}

export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      role="status"
      aria-busy="true"
      aria-label="Loading statistics"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4"
        >
          <Skeleton className="mb-3 h-3 w-20" />
          <Skeleton className="h-8 w-14" />
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div
      className="space-y-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5"
      role="status"
      aria-busy="true"
      aria-label="Loading form"
    >
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="mt-2 h-10 w-32" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div
      className="space-y-4"
      role="status"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      <StatsGridSkeleton count={4} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <Skeleton className="mb-4 h-4 w-32" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <Skeleton className="mb-4 h-4 w-28" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
        <Skeleton className="mb-4 h-4 w-36" />
        <TableSkeleton columns={4} rows={5} />
      </div>
    </div>
  );
}

export function PageSkeleton({ variant = "dashboard" }: { variant?: "dashboard" | "form" | "table" }) {
  if (variant === "form") return <FormSkeleton />;
  if (variant === "table") return <TableSkeleton />;
  return <DashboardSkeleton />;
}

export function InlineSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2 py-1" role="status" aria-busy="true">
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonText key={index} width={index === lines - 1 ? "w-2/3" : "w-full"} />
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-busy="true" aria-label="Loading list">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-3"
        >
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}
