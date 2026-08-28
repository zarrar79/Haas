"use client";

import type { ReactNode } from "react";

type Props = {
  open: boolean;
  children: ReactNode;
  className?: string;
};

/** Height-animated collapse for sidebar groups and panels. */
export function AnimatedCollapsible({ open, children, className = "" }: Props) {
  return (
    <div
      className={`accordion-panel ${open ? "accordion-panel-open" : ""} ${className}`}
      aria-hidden={!open}
    >
      <div className="accordion-panel-inner">{children}</div>
    </div>
  );
}
