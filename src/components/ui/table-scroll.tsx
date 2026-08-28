import type { ReactNode } from "react";

/** Outer bordered shell for scrollable tables. */
export const TABLE_SHELL_CLASS =
  "relative rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]";

/** Horizontal scroll region with styled scrollbar (see globals.css). */
export const TABLE_SCROLL_CLASS =
  "haas-table-scroll overflow-x-auto overscroll-x-contain";

/** Table element: grows with columns, never squishes below container width. */
export const TABLE_ELEMENT_CLASS =
  "w-max min-w-full border-collapse text-left text-sm [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap";

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
