"use client";

import type { ReactNode } from "react";

type Side = "top" | "bottom" | "left" | "right";

type Props = {
  content: ReactNode;
  children: ReactNode;
  side?: Side;
  className?: string;
  maxWidthClass?: string;
};

const sideClass: Record<Side, string> = {
  top: "bottom-[calc(100%+0.5rem)] left-1/2 -translate-x-1/2",
  bottom: "top-[calc(100%+0.5rem)] left-1/2 -translate-x-1/2",
  left: "right-[calc(100%+0.5rem)] top-1/2 -translate-y-1/2",
  right: "left-[calc(100%+0.5rem)] top-1/2 -translate-y-1/2",
};

export function Tooltip({
  content,
  children,
  side = "top",
  className = "",
  maxWidthClass = "max-w-xs",
}: Props) {
  return (
    <span
      className={`tooltip-root group/tooltip relative inline-flex ${className}`}
    >
      {children}
      <span
        role="tooltip"
        className={`tooltip-bubble pointer-events-none absolute z-50 ${sideClass[side]} ${maxWidthClass} rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 py-2 text-xs font-medium leading-relaxed text-[var(--text)] opacity-0 shadow-[var(--shadow-lg)] transition duration-200 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100`}
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
