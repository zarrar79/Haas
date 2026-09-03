import type { ReactNode } from "react";

import {
  InlineSkeleton,
  PageSkeleton,
  TableSkeleton,
} from "@/components/ui/skeleton";

type LoaderSize = "sm" | "md" | "lg";

const sizeClass: Record<LoaderSize, string> = {
  sm: "loader-ring-sm",
  md: "loader-ring-md",
  lg: "loader-ring-lg",
};

type LoaderProps = {
  size?: LoaderSize;
  label?: string;
  className?: string;
};

export function Loader({ size = "md", label, className = "" }: LoaderProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className={`loader-ring ${sizeClass[size]}`} aria-hidden />
      {label ? (
        <p className="loader-label text-sm font-medium text-[var(--text-muted)]">
          {label}
        </p>
      ) : null}
      <span className="sr-only">{label || "Loading"}</span>
    </div>
  );
}

export function TableLoader({
  label = "Loading records…",
  columns = 5,
  rows = 8,
  selectable = false,
}: {
  label?: string;
  columns?: number;
  rows?: number;
  selectable?: boolean;
}) {
  return (
    <div aria-label={label}>
      <TableSkeleton columns={columns} rows={rows} selectable={selectable} />
    </div>
  );
}

export function PageLoader({
  label = "Loading workspace…",
  className = "",
  variant = "dashboard",
}: {
  label?: string;
  className?: string;
  variant?: "dashboard" | "form" | "table";
}) {
  return (
    <div className={`w-full ${className}`} aria-label={label}>
      <PageSkeleton variant={variant} />
    </div>
  );
}

export function InlineLoader({ label }: { label?: string }) {
  return (
    <div aria-label={label || "Loading"} role="status" aria-busy="true">
      <InlineSkeleton lines={2} />
    </div>
  );
}

export function OverlayLoader({
  label = "Loading…",
  children,
  variant = "table",
}: {
  label?: string;
  children?: ReactNode;
  variant?: "dashboard" | "form" | "table";
}) {
  return (
    <div className="absolute inset-0 z-10 rounded-[inherit] bg-[var(--surface)]/90 p-4 backdrop-blur-[1px]">
      <PageSkeleton variant={variant} />
      {children}
    </div>
  );
}
