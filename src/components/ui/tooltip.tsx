"use client";

import type { ReactNode } from "react";

type Side = "top" | "bottom" | "left" | "right";
type Align = "start" | "center" | "end";

type Props = {
  content: ReactNode;
  children: ReactNode;
  side?: Side;
  align?: Align;
  className?: string;
  maxWidthClass?: string;
  /** Structured panel popover (no inner padding on bubble — content supplies layout). */
  panel?: boolean;
};

const sideClass: Record<Side, string> = {
  top: "bottom-[calc(100%+0.625rem)]",
  bottom: "top-[calc(100%+0.625rem)]",
  left: "right-[calc(100%+0.625rem)] top-1/2 -translate-y-1/2",
  right: "left-[calc(100%+0.625rem)] top-1/2 -translate-y-1/2",
};

const alignClass: Record<Side, Record<Align, string>> = {
  top: {
    start: "left-0",
    center: "left-1/2 -translate-x-1/2",
    end: "right-0",
  },
  bottom: {
    start: "left-0",
    center: "left-1/2 -translate-x-1/2",
    end: "right-0",
  },
  left: {
    start: "top-0",
    center: "top-1/2 -translate-y-1/2",
    end: "bottom-0",
  },
  right: {
    start: "top-0",
    center: "top-1/2 -translate-y-1/2",
    end: "bottom-0",
  },
};

export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  className = "",
  maxWidthClass = "max-w-xs",
  panel = false,
}: Props) {
  const block = className.includes("w-full");

  return (
    <span
      className={`tooltip-root group/tooltip relative min-w-0 ${
        block ? "flex w-full" : "inline-flex"
      } ${className}`}
    >
      {children}
      <span
        role="tooltip"
        className={`tooltip-bubble pointer-events-none absolute z-[100] ${sideClass[side]} ${alignClass[side][align]} ${maxWidthClass} ${
          panel
            ? "rounded-[var(--radius)] p-0 opacity-0 shadow-none"
            : "rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 py-2 text-xs font-medium leading-relaxed text-[var(--text)] opacity-0 shadow-[var(--shadow-lg)]"
        } transition duration-200 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100 group-focus-visible/tooltip:opacity-100`}
      >
        {content}
      </span>
    </span>
  );
}

export function GuidanceHint({
  label,
  tip,
}: {
  label: string;
  tip: string;
}) {
  return (
    <Tooltip content={tip} side="top" maxWidthClass="max-w-sm">
      <button
        type="button"
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-hover)] text-[0.65rem] font-bold text-[var(--text-muted)] transition hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
        aria-label={`Help: ${label}`}
      >
        ?
      </button>
    </Tooltip>
  );
}
