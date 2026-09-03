"use client";

import { useEffect, type ReactNode } from "react";

type ModalShellProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  panelClassName?: string;
  zIndexClass?: string;
  ariaLabel?: string;
};

export function ModalShell({
  open,
  onClose,
  children,
  panelClassName = "max-w-lg",
  zIndexClass = "z-50",
  ariaLabel = "Dialog",
}: ModalShellProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-end justify-center p-2 sm:items-center sm:p-4`}
    >
      <button
        type="button"
        className="haas-modal-overlay absolute inset-0 bg-[var(--overlay)]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={`haas-modal-panel relative z-10 flex max-h-[min(100dvh,880px)] w-full flex-col overflow-hidden rounded-t-[var(--radius)] border border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow-lg)] sm:max-h-[min(92vh,880px)] sm:rounded-[var(--radius)] ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
