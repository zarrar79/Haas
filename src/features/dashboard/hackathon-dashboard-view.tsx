"use client";

import { useMemo } from "react";
import {
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
import {
  formatBucketLabel,
  formatDuration,
} from "@/features/dashboard/admin-guidance";
import {
  CHART_COLORS,
  chartTooltipStyle,
  DashboardRow,
  DonutChart,
  HorizontalBarChart,
  MetricRing,
  SectionChart,
  VerticalBarChart,
} from "@/features/dashboard/dashboard-charts";
import type { HackathonDashboard } from "@/features/dashboard/dashboard-api";

function statusBadge(status: string) {
  if (status === "live") return <Badge tone="success">Live</Badge>;
  if (status === "upcoming") return <Badge tone="warning">Upcoming</Badge>;
  if (status === "ended") return <Badge>Ended</Badge>;
  return <Badge tone="danger">Inactive</Badge>;
}

function truncateLabel(value: string, max = 14) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

type Props = {
  data: HackathonDashboard;
};

export function HackathonDashboardView({ data }: Props) {
  const { hackathon, overview } = data;

  const timelineChart = useMemo(() => {
    if (!data.timeline) return [];
    const map = new Map<
      string,
      { label: string; submissions: number; activity: number; spawns: number }
    >();
    for (const row of data.timeline.submissions) {
      const key = row.bucket || "unknown";
      const entry = map.get(key) ?? {
        label: formatBucketLabel(row.bucket),
        submissions: 0,
        activity: 0,
        spawns: 0,
      };
      entry.submissions = row.count ?? 0;
      map.set(key, entry);
    }
    for (const row of data.timeline.activity) {
      const key = row.bucket || "unknown";
      const entry = map.get(key) ?? {
        label: formatBucketLabel(row.bucket),
        submissions: 0,
        activity: 0,
        spawns: 0,
      };
      entry.activity = row.count ?? 0;
      map.set(key, entry);
    }
    for (const row of data.timeline.machine_spawns) {
      const key = row.bucket || "unknown";
      const entry = map.get(key) ?? {
        label: formatBucketLabel(row.bucket),
        submissions: 0,
        activity: 0,
        spawns: 0,
      };
      entry.spawns = row.count ?? 0;
      map.set(key, entry);
    }
    return Array.from(map.values());
  }, [data.timeline]);

  const submissionTimeline = useMemo(
    () =>
      (data.submissions?.timeline ?? []).map((row) => ({
        label: formatBucketLabel(row.bucket),
        valid: row.valid ?? 0,
        invalid: row.invalid ?? 0,
      })),
    [data.submissions],
  );

  const teamLeaderboard = useMemo(
    () =>
      (data.teams?.leaderboard ?? []).slice(0, 10).map((row) => ({
        name: truncateLabel(
          row.team__name || row.team__team_code || row.team_id,
        ),
        score: row.total_score ?? 0,
      })),
    [data.teams],
  );

  const challengeSolves = useMemo(
    () =>
      (data.challenges?.top_by_solves ?? []).slice(0, 10).map((row) => ({
        name: truncateLabel(row.challenge__name || row.challenge_id, 16),
        solves: row.solves ?? 0,
      })),
    [data.challenges],
  );

  const topUsers = useMemo(
    () =>
      (data.submissions?.top_users ?? []).slice(0, 8).map((row) => ({
        name: truncateLabel(row.user__username || row.user_id, 12),
        score: row.total_score ?? 0,
      })),
    [data.submissions],
  );

  const machinesByTeam = useMemo(
    () =>
      (data.machines?.by_team ?? []).slice(0, 8).map((row) => ({
        name: truncateLabel(String(row.team__name || "Team")),
        active: row.active ?? 0,
      })),
    [data.machines],
  );

  const machinesByChallenge = useMemo(
    () =>
      (data.machines?.by_challenge ?? []).slice(0, 8).map((row) => ({
        name: truncateLabel(String(row.challenge__name || "Challenge"), 16),
        active: row.active ?? 0,
      })),
    [data.machines],
  );

  const activityTimeline = useMemo(
    () =>
      (data.activity?.timeline ?? []).map((row) => ({
        label: formatBucketLabel(row.bucket),
        events: row.events ?? 0,
      })),
    [data.activity],
  );

  const challengeDifficulty = useMemo(
    () =>
      (data.challenges?.by_difficulty ?? []).map((row) => ({
        name: row.challenge__difficulty_level__name || "Unknown",
        solves: row.solves ?? 0,
      })),
    [data.challenges],
  );

  const memberTypes = useMemo(
    () =>
      (data.members?.by_user_type ?? []).map((row) => ({
        name: row.user__user_type || "default",
        value: row.count,
      })),
    [data.members],
  );

  const teamsBySide = useMemo(
    () =>
      (data.teams?.by_register_as ?? []).map((row) => ({
        name: row.register_as || "unknown",
        count: row.count,
      })),
    [data.teams],
  );

  const submissionSplit = overview
    ? [
        { name: "Valid", value: overview.submissions.valid },
        { name: "Invalid", value: overview.submissions.invalid },
      ]
    : [];

  const machineSplit = overview
    ? [
        { name: "Active", value: overview.machines.active },
        { name: "Stopped", value: overview.machines.inactive },
        { name: "Blocked", value: overview.machines.blocked },
      ]
    : [];

  const teamSplit = overview
    ? [
        { name: "Active", value: overview.teams.active },
        { name: "Blocked", value: overview.teams.blocked },
      ]
    : [];

  const activitySplit = overview
    ? [
        { name: "Logins", value: overview.activity.logins },
        { name: "Spawns", value: overview.activity.spawns },
        { name: "Stops", value: overview.activity.stops },
        { name: "Valid flags", value: overview.activity.successful_submissions },
        { name: "Invalid flags", value: overview.activity.invalid_submissions },
      ]
    : [];

  const solvedVsUnsolved = data.challenges
    ? [
        {
          name: "Solved",
          value: (data.challenges.top_by_solves ?? []).filter(
            (c) => (c.solves ?? 0) > 0,
          ).length,
        },
        { name: "Unsolved", value: data.challenges.unsolved?.length ?? 0 },
      ]
    : [];

  return (
    <div className="space-y-4">
      <section className="dashboard-hero spark-card-elevated animate-fade-in-up overflow-hidden p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold tracking-tight text-[var(--text)]">
                {hackathon.display_name || hackathon.name}
              </h2>
              {statusBadge(hackathon.status)}
            </div>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {data.params.hours}h analytics window
            </p>
          </div>
          {hackathon.progress.percent != null ? (
            <div className="min-w-[220px] flex-1 max-w-md">
              <div className="mb-1 flex justify-between text-xs text-[var(--text-muted)]">
                <span>Event progress</span>
                <span>{hackathon.progress.percent.toFixed(1)}%</span>
              </div>
              <div className="dashboard-progress-track h-3 overflow-hidden rounded-full bg-[var(--surface-hover)]">
                <div
                  className="dashboard-progress-fill h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--cyan)]"
                  style={{ width: `${hackathon.progress.percent}%` }}
                />
              </div>
              <p className="mt-1 text-[0.65rem] text-[var(--text-subtle)]">
                {formatDuration(hackathon.progress.remaining_seconds)} remaining
              </p>
            </div>
          ) : null}
        </div>

        {overview ? (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-6">
            <MetricRing
              label="Teams"
              value={overview.teams.total}
              max={Math.max(overview.teams.total, 1)}
              color={CHART_COLORS[0]}
            />
            <MetricRing
              label="Members"
              value={overview.members.event_members}
              max={Math.max(overview.members.event_members, 1)}
              color={CHART_COLORS[1]}
            />
            <MetricRing
              label="Submissions"
              value={overview.submissions.total}
              max={Math.max(overview.submissions.total, 1)}
              color={CHART_COLORS[2]}
            />
            <MetricRing
              label="Points"
              value={overview.submissions.total_points}
              max={Math.max(overview.submissions.total_points, 1)}
              color={CHART_COLORS[3]}
            />
            <MetricRing
              label="Machines"
              value={overview.machines.active}
              max={Math.max(
                overview.machines.active +
                  overview.machines.inactive +
                  overview.machines.blocked,
                1,
              )}
              color={CHART_COLORS[4]}
            />
            <MetricRing
              label="First bloods"
              value={overview.submissions.first_bloods}
              max={Math.max(overview.submissions.first_bloods, 1)}
              color={CHART_COLORS[5]}
            />
          </div>
        ) : null}
      </section>

      {overview ? (
        <DashboardRow
          title="Snapshot"
          variant="overview"
          cols={4}
          delayMs={40}
        >
          <SectionChart id="submissions" title="Submission split" chartKind="donut">
            <DonutChart data={submissionSplit} />
          </SectionChart>
          <SectionChart id="machines" title="Machine status" chartKind="donut">
            <DonutChart data={machineSplit} />
          </SectionChart>
          <SectionChart id="teams" title="Team status" chartKind="donut">
            <DonutChart data={teamSplit} />
          </SectionChart>
          <SectionChart id="activity" title="Activity mix" chartKind="donut">
            <DonutChart data={activitySplit} />
          </SectionChart>
        </DashboardRow>
      ) : null}

      {timelineChart.length > 0 ? (
        <DashboardRow
          title="Live pulse"
          variant="trends"
          cols={1}
          delayMs={120}
        >
          <SectionChart id="timeline" title="Event timeline" chartKind="timeline">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={timelineChart}
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
                  dataKey="activity"
                  stroke={CHART_COLORS[2]}
                  strokeWidth={2.5}
                  dot={false}
                  name="Activity"
                />
                <Line
                  type="monotone"
                  dataKey="spawns"
                  stroke={CHART_COLORS[4]}
                  strokeWidth={2.5}
                  dot={false}
                  name="Spawns"
                />
              </LineChart>
            </ResponsiveContainer>
          </SectionChart>
        </DashboardRow>
      ) : null}

      <DashboardRow
        title="Rankings"
        variant="rankings"
        cols={2}
        delayMs={160}
      >
        <SectionChart id="teams" title="Team leaderboard" chartKind="ranking">
          <HorizontalBarChart
            data={teamLeaderboard}
            dataKey="score"
            nameKey="name"
            barName="Score"
          />
        </SectionChart>
        <SectionChart id="challenges" title="Top challenges" chartKind="ranking">
          <HorizontalBarChart
            data={challengeSolves}
            dataKey="solves"
            nameKey="name"
            barName="Solves"
          />
        </SectionChart>
      </DashboardRow>

      {(submissionTimeline.length > 0 || topUsers.length > 0) && (
        <DashboardRow
          title="Submissions"
          variant="breakdown"
          cols={2}
          delayMs={200}
        >
          {submissionTimeline.length > 0 ? (
            <SectionChart id="submissions" title="Submission flow" chartKind="bar">
              <VerticalBarChart
                data={submissionTimeline}
                nameKey="label"
                stacked
                stackKeys={[
                  { key: "valid", name: "Valid", color: CHART_COLORS[2] },
                  { key: "invalid", name: "Invalid", color: CHART_COLORS[4] },
                ]}
              />
            </SectionChart>
          ) : (
            <div className="dashboard-chart-panel flex h-full items-center justify-center rounded-[var(--radius)] border border-dashed border-[var(--border)] p-4 text-xs text-[var(--text-muted)]">
              No submission timeline data
            </div>
          )}
          {topUsers.length > 0 ? (
            <SectionChart title="Top scorers" chartKind="bar">
              <HorizontalBarChart
                data={topUsers}
                dataKey="score"
                nameKey="name"
                barName="Points"
              />
            </SectionChart>
          ) : null}
        </DashboardRow>
      )}

      {(teamsBySide.length > 0 || challengeDifficulty.length > 0) && (
        <DashboardRow
          title="Distribution"
          variant="breakdown"
          cols={2}
          delayMs={240}
        >
          {teamsBySide.length > 0 ? (
            <SectionChart title="Teams by side" chartKind="bar">
              <VerticalBarChart
                data={teamsBySide}
                dataKey="count"
                nameKey="name"
              />
            </SectionChart>
          ) : null}
          {challengeDifficulty.length > 0 ? (
            <SectionChart title="Solves by difficulty" chartKind="bar">
              <VerticalBarChart
                data={challengeDifficulty}
                dataKey="solves"
                nameKey="name"
              />
            </SectionChart>
          ) : null}
        </DashboardRow>
      )}

      {(data.challenges || (data.activity?.by_type ?? []).length > 0) && (
        <DashboardRow
          title="Progress"
          variant="overview"
          cols={2}
          delayMs={280}
        >
          {data.challenges ? (
            <SectionChart title="Challenge progress" chartKind="donut">
              <DonutChart data={solvedVsUnsolved} />
            </SectionChart>
          ) : null}
          {(data.activity?.by_type ?? []).length > 0 ? (
            <SectionChart id="activity" title="Activity breakdown" chartKind="donut">
              <DonutChart
                data={(data.activity?.by_type ?? []).slice(0, 8).map((row) => ({
                  name: truncateLabel(row.label || row.type, 12),
                  value: row.count,
                }))}
              />
            </SectionChart>
          ) : null}
        </DashboardRow>
      )}

      {activityTimeline.length > 0 ? (
        <DashboardRow
          title="Activity trend"
          variant="trends"
          cols={1}
          delayMs={320}
        >
          <SectionChart title="Activity over time" chartKind="bar">
            <VerticalBarChart
              data={activityTimeline}
              dataKey="events"
              nameKey="label"
            />
          </SectionChart>
        </DashboardRow>
      ) : null}

      {(machinesByTeam.length > 0 || machinesByChallenge.length > 0) && (
        <DashboardRow
          title="Infrastructure"
          variant="infra"
          cols={2}
          delayMs={360}
        >
          {machinesByTeam.length > 0 ? (
            <SectionChart id="machines" title="Machines by team" chartKind="ranking">
              <HorizontalBarChart
                data={machinesByTeam}
                dataKey="active"
                nameKey="name"
                barName="Active VMs"
              />
            </SectionChart>
          ) : null}
          {machinesByChallenge.length > 0 ? (
            <SectionChart title="Machines by challenge" chartKind="ranking">
              <HorizontalBarChart
                data={machinesByChallenge}
                dataKey="active"
                nameKey="name"
                barName="Active VMs"
              />
            </SectionChart>
          ) : null}
        </DashboardRow>
      )}

      {memberTypes.length > 0 ? (
        <DashboardRow
          title="Participants"
          variant="overview"
          cols={1}
          delayMs={400}
        >
          <SectionChart id="members" title="Member types" chartKind="donut">
            <DonutChart data={memberTypes} />
          </SectionChart>
        </DashboardRow>
      ) : null}
    </div>
  );
}
