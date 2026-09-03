import type { ReactNode } from "react";

export function ListPageStats({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs leading-none text-[var(--text-muted)]">
      {children}
    </div>
  );
}

export function ListPageStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "accent" | "warning";
}) {
  const valueClass =
    tone === "accent"
      ? "text-[var(--accent)]"
      : tone === "warning"
        ? "text-[var(--warning)]"
        : "text-[var(--text)]";

  return (
    <span className="inline-flex items-baseline gap-1">
      <span>{label}</span>
      <strong className={`leading-none ${valueClass}`}>{value}</strong>
    </span>
  );
}

export function ListPageStatsDot() {
  return (
    <span aria-hidden className="text-[var(--border-strong)]">
      ·
    </span>
  );
}
