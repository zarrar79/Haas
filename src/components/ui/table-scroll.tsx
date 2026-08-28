import type { ReactNode } from "react";

/** Outer bordered shell for scrollable tables — Spark Admin style. */
export const TABLE_SHELL_CLASS =
  "relative overflow-hidden rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow-sm)]";

/** Horizontal scroll region with styled scrollbar (see globals.css). */
export const TABLE_SCROLL_CLASS =
  "haas-table-scroll overflow-x-auto overscroll-x-contain";

/** Table element: grows with columns, never squishes below container width. */
export const TABLE_ELEMENT_CLASS =
  "w-max min-w-full border-collapse text-left text-sm [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap [&_thead]:bg-[var(--surface-raised)] [&_th]:px-4 [&_th]:py-3 [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-[var(--text-subtle)] [&_td]:border-t [&_td]:border-[var(--border)] [&_td]:px-4 [&_td]:py-3 [&_td]:text-[var(--text)]";

type TableScrollProps = {
  children: ReactNode;
  className?: string;
};

export function TableScroll({ children, className = "" }: TableScrollProps) {
  return (
    <div className={`${TABLE_SHELL_CLASS} ${className}`.trim()}>
      <div className={TABLE_SCROLL_CLASS}>{children}</div>
    </div>
  );
}
