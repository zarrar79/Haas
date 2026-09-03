"use client";

import { useMemo, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatBucketLabel } from "@/features/dashboard/admin-guidance";
import { chartTooltipStyle } from "@/features/dashboard/dashboard-charts";
import type { LifecycleAnalyticsBundle } from "@/features/dashboard/lifecycle-analytics-api";

const LIME = "var(--accent)";
const TEAL = "var(--cyan)";
const MUTED = "var(--text-subtle)";

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Card({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] ${className}`}
    >
      <header className="mb-4">
        <h2 className="text-[15px] font-semibold tracking-tight text-[var(--text)]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
            {subtitle}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function FullLabelTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    color?: string;
    dataKey?: string;
    payload?: { fullName?: string; fullLabel?: string };
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const title = row?.fullLabel || row?.fullName || label || "";
  return (
    <div
      style={{
        ...chartTooltipStyle(),
        maxWidth: 320,
        padding: "8px 10px",
        whiteSpace: "normal",
        wordBreak: "break-word",
      }}
    >
      {title ? (
        <p style={{ margin: "0 0 6px", fontWeight: 600, color: "var(--text)" }}>
          {title}
        </p>
      ) : null}
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {payload.map((entry) => (
          <li
            key={String(entry.dataKey ?? entry.name)}
            style={{
              display: "flex",
              gap: 8,
              marginTop: 2,
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                marginTop: 4,
                borderRadius: 999,
                background: entry.color || LIME,
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1 }}>{entry.name}</span>
            <span style={{ fontWeight: 700, color: "var(--text)" }}>
              {typeof entry.value === "number"
                ? entry.value.toLocaleString()
                : String(entry.value ?? "")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type Props = {
  data: LifecycleAnalyticsBundle;
};

export function LifecycleAnalyticsView({ data }: Props) {
  const { registrationsByEvent, registrationTimeline, solvesByEvent } = data;

  const regBars = useMemo(
    () =>
      (registrationsByEvent.items ?? []).map((row) => ({
        name: row.name.length > 16 ? `${row.name.slice(0, 15)}…` : row.name,
        fullName: row.name,
        registered: row.registered,
        blocked: row.blocked,
      })),
    [registrationsByEvent.items],
  );

  const timelineChart = useMemo(
    () =>
      (registrationTimeline.points ?? []).map((row) => ({
        label: formatBucketLabel(row.t),
        fullLabel: formatDate(row.t),
        registrations: row.registrations,
        cumulative: row.cumulative,
      })),
    [registrationTimeline.points],
  );

  const solveBars = useMemo(
    () =>
      (solvesByEvent.items ?? []).map((row) => ({
        name: row.name.length > 16 ? `${row.name.slice(0, 15)}…` : row.name,
        fullName: row.name,
        solved: row.challenges_solved,
        total: row.challenges_total,
      })),
    [solvesByEvent.items],
  );

  const hasTimeline = timelineChart.some(
    (r) => r.registrations > 0 || r.cumulative > 0,
  );

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card
          title="Users registered by event"
          subtitle="Active memberships on each hackathon."
        >
          <div className="h-[260px]">
            {regBars.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
                No registrations yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={regBars}
                  layout="vertical"
                  margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                >
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: MUTED, fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fill: MUTED, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip content={<FullLabelTooltip />} />
                  <Bar
                    dataKey="registered"
                    name="Registered users"
                    fill={LIME}
                    radius={[0, 6, 6, 0]}
                    barSize={14}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card
          title="Challenges solved by event"
          subtitle="Distinct challenges solved in each hackathon."
        >
          <div className="h-[260px]">
            {solveBars.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
                No solves yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={solveBars}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  barGap={4}
                >
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: MUTED, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: MUTED, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip content={<FullLabelTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="total"
                    name="Total challenges"
                    fill={TEAL}
                    radius={[4, 4, 0, 0]}
                    barSize={16}
                  />
                  <Bar
                    dataKey="solved"
                    name="Solved"
                    fill={LIME}
                    radius={[4, 4, 0, 0]}
                    barSize={16}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <Card
        title="Registration timeline"
        subtitle={`New user registrations per day (${registrationTimeline.period}) across your events.`}
      >
        <div className="mb-2 flex flex-wrap gap-4 text-xs text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[var(--accent)]" /> new
            registrations
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[var(--cyan)]" /> cumulative
          </span>
        </div>
        <div className="h-[280px]">
          {hasTimeline ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={timelineChart}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="regFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={LIME} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={LIME} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="cumFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={TEAL} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={TEAL} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: MUTED, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: MUTED, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip content={<FullLabelTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="registrations"
                  name="New registrations"
                  stroke={LIME}
                  fill="url(#regFill)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  name="Cumulative"
                  stroke={TEAL}
                  fill="url(#cumFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
              No registrations in this window yet.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
