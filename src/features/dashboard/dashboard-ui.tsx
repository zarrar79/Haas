"use client";

import { useRef, type ReactNode } from "react";

import { GuidanceHint } from "@/components/ui/tooltip";
import {
  TABLE_ELEMENT_CLASS,
  TABLE_SHELL_CLASS,
  SyncedHorizontalScroll,
} from "@/components/ui/table-scroll";
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
  const tableRef = useRef<HTMLTableElement>(null);

  if (rows.length === 0) {
    return (
      <p className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className={TABLE_SHELL_CLASS}>
      <SyncedHorizontalScroll tableRef={tableRef}>
        <table ref={tableRef} className={TABLE_ELEMENT_CLASS}>
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`cell-${rowIndex}-${cellIndex}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </SyncedHorizontalScroll>
    </div>
  );
}
