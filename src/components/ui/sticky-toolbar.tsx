import type { ReactNode } from "react";

/** Full-bleed sticky shell — opaque, no table bleed-through while scrolling. */
export const STICKY_TOOLBAR_OUTER_CLASS =
  "sticky top-0 z-20 -mx-4 border-b border-[var(--border)] bg-[var(--bg)] px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8";

export const STICKY_TOOLBAR_INNER_CLASS =
  "rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm";

/** @deprecated Use STICKY_TOOLBAR_OUTER_CLASS */
export const STICKY_TOOLBAR_CLASS = STICKY_TOOLBAR_OUTER_CLASS;

type StickyToolbarProps = {
  children: ReactNode;
  className?: string;
  layout?: "row" | "grid" | "stack" | "plain";
  /** Optional row below filters (counts, hints) — stays sticky with filters */
  footer?: ReactNode;
};

const LAYOUT_CLASS: Record<NonNullable<StickyToolbarProps["layout"]>, string> = {
  row: "flex flex-nowrap items-end gap-2 overflow-x-auto",
  grid: "grid gap-3 sm:grid-cols-3",
  stack: "flex flex-col gap-3",
  plain: "",
};

export function StickyToolbar({
  children,
  className = "",
  layout = "row",
  footer,
}: StickyToolbarProps) {
  return (
    <div className={STICKY_TOOLBAR_OUTER_CLASS}>
      <div
        className={`${STICKY_TOOLBAR_INNER_CLASS} ${LAYOUT_CLASS[layout]} ${className}`.trim()}
      >
        {children}
      </div>
      {footer ? (
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated Use StickyToolbar — kept as semantic alias for filter rows. */
export const FilterToolbar = StickyToolbar;

export function FilterSelect({
  label,
  value,
  onChange,
  className,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      className={`flex min-w-[140px] flex-1 flex-col gap-1 text-xs text-[var(--text-muted)] ${className ?? ""}`}
    >
      <span className="font-medium text-[var(--text)]">{label}</span>
      <select
        className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-sm text-[var(--text)]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </label>
  );
}
