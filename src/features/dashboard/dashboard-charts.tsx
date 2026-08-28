"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { GuidanceHint } from "@/components/ui/tooltip";
import { DASHBOARD_SECTION_TIPS } from "@/features/dashboard/admin-guidance";

export const CHART_COLORS = [
  "var(--accent)",
  "var(--cyan)",
  "var(--success)",
  "var(--warning)",
  "var(--danger)",
  "var(--text-subtle)",
];

/** Fixed chart body heights per row type — keeps siblings aligned in a grid. */
export const ROW_CHART_HEIGHT = {
  donut: 180,
  bar: 220,
  ranking: 240,
  timeline: 240,
  wide: 260,
} as const;

export type DashboardRowVariant =
  | "overview"
  | "trends"
  | "rankings"
  | "breakdown"
  | "infra";

const ROW_VARIANT_CLASS: Record<DashboardRowVariant, string> = {
  overview: "dashboard-row--overview",
  trends: "dashboard-row--trends",
  rankings: "dashboard-row--rankings",
  breakdown: "dashboard-row--breakdown",
  infra: "dashboard-row--infra",
};

const ROW_HEIGHT_VAR: Record<DashboardRowVariant, number> = {
  overview: ROW_CHART_HEIGHT.donut,
  trends: ROW_CHART_HEIGHT.timeline,
  rankings: ROW_CHART_HEIGHT.ranking,
  breakdown: ROW_CHART_HEIGHT.bar,
  infra: ROW_CHART_HEIGHT.bar,
};

export function chartTooltipStyle() {
  return {
    background: "var(--surface-raised)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--text)",
    fontSize: 12,
  };
}

export function DashboardRow({
  title,
  subtitle,
  variant = "breakdown",
  cols = 2,
  delayMs = 0,
  children,
}: {
  title: string;
  subtitle?: string;
  variant?: DashboardRowVariant;
  cols?: 1 | 2 | 3 | 4;
  delayMs?: number;
  children: ReactNode;
}) {
  const colClass =
    cols === 1
      ? "grid-cols-1"
      : cols === 3
        ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
        : cols === 4
          ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
          : "grid-cols-1 lg:grid-cols-2";

  return (
    <section
      className={`dashboard-row animate-fade-in-up ${ROW_VARIANT_CLASS[variant]}`}
      style={
        {
          animationDelay: `${delayMs}ms`,
          "--dashboard-row-chart-h": `${ROW_HEIGHT_VAR[variant]}px`,
        } as React.CSSProperties
      }
    >
      <div className="dashboard-row-header">
        <div>
          <h2 className="dashboard-row-title">{title}</h2>
          {subtitle ? (
            <p className="dashboard-row-subtitle">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className={`dashboard-row-grid grid gap-2.5 ${colClass}`}>
        {children}
      </div>
    </section>
  );
}

export function ChartPanel({
  title,
  tip,
  children,
  height,
  delayMs = 0,
  className = "",
  chartKind = "bar",
}: {
  title: string;
  tip?: string;
  children: ReactNode;
  height?: number;
  delayMs?: number;
  className?: string;
  chartKind?: "donut" | "bar" | "ranking" | "timeline";
}) {
  const resolvedHeight =
    height ??
    (chartKind === "donut"
      ? ROW_CHART_HEIGHT.donut
      : chartKind === "ranking"
        ? ROW_CHART_HEIGHT.ranking
        : chartKind === "timeline"
          ? ROW_CHART_HEIGHT.timeline
          : ROW_CHART_HEIGHT.bar);

  return (
    <div
      className={`dashboard-chart-panel flex h-full min-h-0 flex-col animate-fade-in-up p-3 ${className}`}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="dashboard-chart-panel-header mb-1.5 flex min-h-[1.5rem] shrink-0 items-center gap-1.5">
        <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
          {title}
        </h3>
        {tip ? <GuidanceHint label={title} tip={tip} /> : null}
      </div>
      <div
        className="dashboard-chart-panel-body min-h-0 w-full flex-1"
        style={{ height: resolvedHeight, minHeight: resolvedHeight }}
      >
        {children}
      </div>
    </div>
  );
}

export function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[120px] items-center justify-center rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--surface-raised)] px-3 text-center text-xs text-[var(--text-muted)]">
      {message}
    </div>
  );
}

export function DonutChart({
  data,
  innerRadius = 40,
  outerRadius = 64,
}: {
  data: { name: string; value: number }[];
  innerRadius?: number;
  outerRadius?: number;
}) {
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) {
    return <EmptyChart message="No data to chart yet." />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <Pie
          data={filtered}
          dataKey="value"
          nameKey="name"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          cx="50%"
          cy="46%"
        >
          {filtered.map((entry, index) => (
            <Cell
              key={entry.name}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
            />
          ))}
        </Pie>
        <RechartsTooltip contentStyle={chartTooltipStyle()} />
        <Legend
          verticalAlign="bottom"
          align="center"
          iconType="circle"
          wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function HorizontalBarChart({
  data,
  dataKey,
  nameKey,
  barName,
}: {
  data: Record<string, string | number>[];
  dataKey: string;
  nameKey: string;
  barName?: string;
}) {
  if (data.length === 0) {
    return <EmptyChart message="No data to chart yet." />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 16, left: 4, bottom: 8 }}
      >
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
        />
        <YAxis
          type="category"
          dataKey={nameKey}
          width={110}
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
        />
        <RechartsTooltip contentStyle={chartTooltipStyle()} />
        <Bar
          dataKey={dataKey}
          name={barName || dataKey}
          radius={[0, 4, 4, 0]}
          fill={CHART_COLORS[0]}
        >
          {data.map((_, index) => (
            <Cell
              key={`bar-${index}`}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function VerticalBarChart({
  data,
  dataKey,
  nameKey,
  stacked,
  stackKeys,
}: {
  data: Record<string, string | number>[];
  dataKey?: string;
  nameKey: string;
  stacked?: boolean;
  stackKeys?: { key: string; name: string; color?: string }[];
}) {
  if (data.length === 0) {
    return <EmptyChart message="No data to chart yet." />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis
          dataKey={nameKey}
          tick={{ fill: "var(--text-muted)", fontSize: 10 }}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
        />
        <RechartsTooltip contentStyle={chartTooltipStyle()} />
        {stacked && stackKeys ? (
          <>
            <Legend />
            {stackKeys.map((s, index) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                stackId="stack"
                fill={s.color || CHART_COLORS[index % CHART_COLORS.length]}
                radius={
                  index === stackKeys.length - 1 ? [4, 4, 0, 0] : undefined
                }
              />
            ))}
          </>
        ) : (
          <Bar
            dataKey={dataKey || "value"}
            radius={[4, 4, 0, 0]}
            fill={CHART_COLORS[0]}
          >
            {data.map((_, index) => (
              <Cell
                key={`vbar-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Bar>
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SectionChart({
  id,
  title,
  children,
  delayMs = 0,
  height,
  chartKind = "bar",
}: {
  id?: string;
  title: string;
  children: ReactNode;
  delayMs?: number;
  height?: number;
  chartKind?: "donut" | "bar" | "ranking" | "timeline";
}) {
  return (
    <ChartPanel
      title={title}
      tip={id ? DASHBOARD_SECTION_TIPS[id] : undefined}
      height={height}
      delayMs={delayMs}
      chartKind={chartKind}
    >
      {children}
    </ChartPanel>
  );
}

export function MetricRing({
  label,
  value,
  max,
  color = "var(--accent)",
  tip,
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
  tip?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const size = 72;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="dashboard-stat-card flex flex-col items-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-raised)] p-2.5 text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--surface-hover)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="dashboard-ring-progress transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-extrabold text-[var(--text)]">
            {value.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="mt-1 flex items-center gap-1">
        <p className="text-[0.65rem] font-semibold text-[var(--text-muted)]">{label}</p>
        {tip ? <GuidanceHint label={label} tip={tip} /> : null}
      </div>
    </div>
  );
}
