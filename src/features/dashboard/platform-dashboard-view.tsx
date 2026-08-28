"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { GuidanceHint } from "@/components/ui/tooltip";
import { formatBucketLabel } from "@/features/dashboard/admin-guidance";
import {
  CHART_COLORS,
  chartTooltipStyle,
  DashboardRow,
  DonutChart,
  MetricRing,
  SectionChart,
  VerticalBarChart,
} from "@/features/dashboard/dashboard-charts";
import type { PlatformDashboard } from "@/features/dashboard/dashboard-api";

type Props = {
  data: PlatformDashboard;
};

export function PlatformDashboardView({ data }: Props) {
  const timeline = (data.submissions_timeline ?? []).map((row) => ({
    label: formatBucketLabel(row.bucket),
    submissions: row.submissions ?? 0,
    valid: row.valid ?? 0,
  }));

  const eventComparison = useMemo(
    () =>
      (data.events ?? []).map((event) => ({
        name: (event.hackathon.display_name || event.hackathon.name).slice(
          0,
          14,
        ),
        teams: event.overview.teams.total,
        submissions: event.overview.submissions.total,
        machines: event.overview.machines.active,
        points: event.overview.submissions.total_points,
      })),
    [data.events],
  );

  const platformSplit = [
    { name: "Live events", value: data.platform.hackathons.live },
    {
      name: "Other active",
      value: Math.max(
        0,
        data.platform.hackathons.active - data.platform.hackathons.live,
      ),
    },
    {
      name: "Inactive",
      value: Math.max(
        0,
        data.platform.hackathons.total - data.platform.hackathons.active,
      ),
    },
  ];

  const submissionSplit = [
    {
      name: "Valid (window)",
      value: data.platform.submissions.window_valid,
    },
    {
      name: "Invalid (window)",
      value: Math.max(
        0,
        data.platform.submissions.window - data.platform.submissions.window_valid,
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <section className="dashboard-hero spark-card-elevated animate-fade-in-up p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-extrabold text-[var(--text)]">
            Platform analytics
          </h2>
          <GuidanceHint
            label="Platform analytics"
            tip="Cross-event statistics for Root / system operators."
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricRing
            label="Hackathons"
            value={data.platform.hackathons.total}
            max={Math.max(data.platform.hackathons.total, 1)}
            color={CHART_COLORS[0]}
          />
          <MetricRing
            label="Users"
            value={data.platform.users}
            max={Math.max(data.platform.users, 1)}
            color={CHART_COLORS[1]}
          />
          <MetricRing
            label="Active VMs"
            value={data.platform.active_machines}
            max={Math.max(data.platform.active_machines, 1)}
            color={CHART_COLORS[4]}
          />
          <MetricRing
            label="Submissions"
            value={data.platform.submissions.window}
            max={Math.max(data.platform.submissions.window, 1)}
            color={CHART_COLORS[2]}
          />
        </div>
      </section>

      <DashboardRow
        title="Platform snapshot"
        variant="overview"
        cols={2}
        delayMs={40}
      >
        <SectionChart title="Event status" chartKind="donut">
          <DonutChart data={platformSplit} />
        </SectionChart>
        <SectionChart title="Submission quality" chartKind="donut">
          <DonutChart data={submissionSplit} />
        </SectionChart>
      </DashboardRow>

      {timeline.length > 0 ? (
        <DashboardRow
          title="Platform pulse"
          variant="trends"
          cols={1}
          delayMs={80}
        >
          <SectionChart title="Submission timeline" chartKind="timeline">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={timeline}
                margin={{ top: 8, right: 16, left: 4, bottom: 8 }}
              >
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                />
                <RechartsTooltip contentStyle={chartTooltipStyle()} />
                <Legend
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="submissions"
                  stroke={CHART_COLORS[0]}
                  strokeWidth={2.5}
                  dot={false}
                  name="Submissions"
                />
                <Line
                  type="monotone"
                  dataKey="valid"
                  stroke={CHART_COLORS[2]}
                  strokeWidth={2.5}
                  dot={false}
                  name="Valid"
                />
              </LineChart>
            </ResponsiveContainer>
          </SectionChart>
        </DashboardRow>
      ) : null}

      {eventComparison.length > 0 ? (
        <DashboardRow
          title="Cross-event comparison"
          variant="rankings"
          cols={2}
          delayMs={120}
        >
          <SectionChart title="Events compared" chartKind="ranking">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={eventComparison}
                margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
              >
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                />
                <RechartsTooltip contentStyle={chartTooltipStyle()} />
                <Legend
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                />
                <Bar
                  dataKey="teams"
                  name="Teams"
                  fill={CHART_COLORS[0]}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="submissions"
                  name="Submissions"
                  fill={CHART_COLORS[1]}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="machines"
                  name="Active VMs"
                  fill={CHART_COLORS[4]}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </SectionChart>
          <SectionChart title="Event scores" chartKind="ranking">
            <VerticalBarChart
              data={eventComparison.map((e) => ({
                name: e.name,
                points: e.points,
              }))}
              dataKey="points"
              nameKey="name"
            />
          </SectionChart>
        </DashboardRow>
      ) : null}

      {(data.events ?? []).length > 0 ? (
        <DashboardRow
          title="Active events"
          variant="infra"
          cols={3}
          delayMs={160}
        >
          {data.events.map((event) => (
            <Link
              key={event.hackathon.id}
              href={`/events/${event.hackathon.id}`}
              className="dashboard-chart-panel dashboard-card flex h-full min-h-[112px] flex-col overflow-hidden transition hover:border-[var(--accent)]/40"
            >
              <div className="border-b border-[var(--border)] px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-[var(--text)]">
                    {event.hackathon.display_name || event.hackathon.name}
                  </p>
                  <Badge
                    tone={
                      event.hackathon.status === "live" ? "success" : undefined
                    }
                  >
                    {event.hackathon.status}
                  </Badge>
                </div>
              </div>
              <div className="grid flex-1 grid-cols-3 divide-x divide-[var(--border)] text-center">
                {(
                  [
                    ["Teams", event.overview.teams.total],
                    ["Flags", event.overview.submissions.total],
                    ["VMs", event.overview.machines.active],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className="flex flex-col items-center justify-center px-2 py-2"
                  >
                    <p className="text-base font-bold text-[var(--accent)]">
                      {value}
                    </p>
                    <p className="text-[0.65rem] uppercase tracking-wide text-[var(--text-muted)]">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </DashboardRow>
      ) : null}
    </div>
  );
}
