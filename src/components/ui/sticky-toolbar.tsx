import type { InputHTMLAttributes, ReactNode } from "react";

import { FILTER_CONTROL_CLASS } from "@/components/ui/form-control";

/** Full-bleed sticky shell — opaque, no table bleed-through while scrolling. */
export const STICKY_TOOLBAR_OUTER_CLASS =
  "sticky top-0 z-20 -mx-3 border-b border-[var(--border)] bg-[var(--bg)] px-3 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8";

export const STICKY_TOOLBAR_INNER_CLASS =
  "sticky-toolbar-inner rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--surface)] p-3 shadow-[var(--shadow-sm)]";

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
  row: "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end",
  grid: "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3",
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

const FILTER_FIELD_CLASS =
  "flex min-w-0 w-full flex-1 flex-col gap-1 text-xs text-[var(--text-muted)] sm:min-w-[8.75rem]";

function FilterField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`${FILTER_FIELD_CLASS} ${className ?? ""}`.trim()}>
      <span className="font-medium text-[var(--text)]">{label}</span>
      {children}
    </label>
  );
}

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
    <FilterField label={label} className={className}>
      <select
        className={FILTER_CONTROL_CLASS}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </FilterField>
  );
}

type FilterTextFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "onChange" | "value"
> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function FilterTextField({
  label,
  value,
  onChange,
  className,
  ...props
}: FilterTextFieldProps) {
  return (
    <FilterField label={label} className={className}>
      <input
        className={FILTER_CONTROL_CLASS}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </FilterField>
  );
}
