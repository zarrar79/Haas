"use client";

import type { ReactNode } from "react";

import { GuidanceHint } from "@/components/ui/tooltip";
import {
  formatDashboardNumber,
  DASHBOARD_SECTION_TIPS,
} from "@/features/dashboard/admin-guidance";

export function DashboardStatCard({
  label,
  value,
  tip,
  tone,
  delayMs = 0,
}: {
  label: string;
  value: number | string;
  tip?: string;
  tone?: "accent" | "success" | "warning" | "danger";
  delayMs?: number;
}) {
  const toneClass =
    tone === "success"
      ? "text-[var(--success)]"
      : tone === "warning"
        ? "text-[var(--warning)]"
        : tone === "danger"
          ? "text-[var(--danger)]"
          : tone === "accent"
            ? "text-[var(--accent)]"
            : "text-[var(--text)]";

  return (
    <div
      className="dashboard-stat-card spark-stat-card animate-fade-in-up"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="flex items-center gap-1.5">
        <p className="spark-stat-label">{label}</p>
        {tip ? <GuidanceHint label={label} tip={tip} /> : null}
      </div>
      <p className={`spark-stat-value ${toneClass}`}>
        {typeof value === "number" ? formatDashboardNumber(value) : value}
      </p>
    </div>
  );
}

export function DashboardSection({
  id,
  title,
  tip,
  children,
  delayMs = 0,
  action,
}: {
  id?: string;
  title: string;
  tip?: string;
  children: ReactNode;
  delayMs?: number;
  action?: ReactNode;
}) {
  const resolvedTip = tip ?? (id ? DASHBOARD_SECTION_TIPS[id] : undefined);

  return (
    <section
      id={id}
      className="dashboard-section spark-card animate-fade-in-up p-5"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
            {title}
          </h3>
          {resolvedTip ? (
            <GuidanceHint label={title} tip={resolvedTip} />
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DashboardTable({
  headers,
  rows,
  emptyMessage = "No data yet.",
}: {
  headers: string[];
  rows: (string | ReactNode)[][];
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--border)]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[var(--surface-raised)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((row, rowIndex) => (
            <tr
              key={`row-${rowIndex}`}
              className="transition hover:bg-[var(--surface-hover)]"
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={`cell-${rowIndex}-${cellIndex}`}
                  className="px-3 py-2.5 text-[var(--text)]"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
