import type { ReactNode } from "react";

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

export function TableLoader({ label = "Loading records…" }: { label?: string }) {
  return (
    <div className="spark-card flex min-h-[220px] items-center justify-center px-4 py-12">
      <Loader size="md" label={label} />
    </div>
  );
}

export function PageLoader({
  label = "Loading workspace…",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex min-h-[280px] w-full items-center justify-center ${className}`}
    >
      <div className="loader-panel rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] px-10 py-12 shadow-[var(--shadow-sm)]">
        <Loader size="lg" label={label} />
      </div>
    </div>
  );
}

export function InlineLoader({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)]">
      <span className={`loader-ring ${sizeClass.sm}`} aria-hidden />
      {label ? <span>{label}</span> : null}
    </span>
  );
}

export function OverlayLoader({
  label = "Loading…",
  children,
}: {
  label?: string;
  children?: ReactNode;
}) {
  return (
    <div className="loader-overlay absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-[var(--surface)]/80 backdrop-blur-[2px]">
      <Loader size="md" label={label} />
      {children}
    </div>
  );
}
