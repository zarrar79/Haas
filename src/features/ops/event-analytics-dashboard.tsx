"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { HackathonAnalytics } from "@/features/hackathons/hackathon-api";
import type { ScoreRow } from "@/features/ops/ops-api";

const CHART_COLORS = [
  "#2dd4bf",
  "#38bdf8",
  "#a78bfa",
  "#fbbf24",
  "#f87171",
  "#34d399",
  "#fb923c",
  "#e879f9",
];

type ChartCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

function ChartCard({ title, description, children }: ChartCardProps) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>
      {description ? (
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">{description}</p>
      ) : null}
      <div className="mt-3 h-64 w-full">{children}</div>
    </div>
  );
}

function tooltipStyle() {
  return {
    background: "var(--surface-raised)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--text)",
    fontSize: 12,
  };
}

export type EventAnalyticsDashboardProps = {
  analytics: HackathonAnalytics | null;
  scores: ScoreRow[];
};

export function EventAnalyticsDashboard({
  analytics,
  scores,
}: EventAnalyticsDashboardProps) {
  const derived = useMemo(() => {
    const activeScores = scores.filter((s) => !s.is_soft_deleted);

    const teamMap = new Map<
      string,
      {
        name: string;
        score: number;
        solves: number;
        firstBlood: number;
        firstBloodPoints: number;
      }
    >();

    const challengeMap = new Map<
      string,
      { name: string; solves: number; firstBloods: number }
    >();

    let baseScore = 0;
    let firstBloodPoints = 0;
    let bonusPoints = 0;
    let firstBloodCount = 0;
    const solvedChallengeIds = new Set<string>();

    for (const row of activeScores) {
      const teamKey = row.team || row.team_name || "unknown";
      const teamName = row.team_name || row.team || "Unknown team";
      const challengeKey = row.challenge || row.challenge_name || "unknown";
      const challengeName =
        row.challenge_name || row.challenge || "Unknown challenge";

      const base = Number(row.score ?? 0);
      const fb = Number(row.first_blood_score ?? 0);
      const bonus = Number(row.bonus_score ?? 0);
      const total = base + fb + bonus;
      const isSolve = row.answer_validity !== false;
      const isFirstBlood = fb > 0;

      baseScore += base;
      firstBloodPoints += fb;
      bonusPoints += bonus;
      if (isFirstBlood) firstBloodCount += 1;
      if (isSolve && challengeKey !== "unknown") {
        solvedChallengeIds.add(challengeKey);
      }

      const team = teamMap.get(teamKey) ?? {
        name: teamName,
        score: 0,
        solves: 0,
        firstBlood: 0,
        firstBloodPoints: 0,
      };
      team.score += total;
      if (isSolve) team.solves += 1;
      if (isFirstBlood) {
        team.firstBlood += 1;
        team.firstBloodPoints += fb;
      }
      teamMap.set(teamKey, team);

      const chal = challengeMap.get(challengeKey) ?? {
        name: challengeName,
        solves: 0,
        firstBloods: 0,
      };
      if (isSolve) chal.solves += 1;
      if (isFirstBlood) chal.firstBloods += 1;
      challengeMap.set(challengeKey, chal);
    }

    const totalChallenges = analytics?.challenges ?? challengeMap.size;
    const solvedChallenges = solvedChallengeIds.size;
    const unsolvedChallenges = Math.max(0, totalChallenges - solvedChallenges);

    const topTeamsByScore = Array.from(teamMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((t) => ({
        name: t.name.length > 14 ? `${t.name.slice(0, 12)}…` : t.name,
        fullName: t.name,
        score: t.score,
        solves: t.solves,
      }));

    const topTeamsBySolves = Array.from(teamMap.values())
      .sort((a, b) => b.solves - a.solves)
      .slice(0, 8)
      .map((t) => ({
        name: t.name.length > 14 ? `${t.name.slice(0, 12)}…` : t.name,
        fullName: t.name,
        solves: t.solves,
        firstBlood: t.firstBlood,
      }));

    const topChallenges = Array.from(challengeMap.values())
      .sort((a, b) => b.solves - a.solves)
      .slice(0, 8)
      .map((c) => ({
        name: c.name.length > 16 ? `${c.name.slice(0, 14)}…` : c.name,
        fullName: c.name,
        solves: c.solves,
      }));

    const firstBloodByTeam = Array.from(teamMap.values())
      .filter((t) => t.firstBlood > 0)
      .sort((a, b) => b.firstBlood - a.firstBlood)
      .slice(0, 8)
      .map((t) => ({
        name: t.name,
        value: t.firstBlood,
      }));

    const scoreBreakdown = [
      { name: "Base score", value: baseScore },
      { name: "First blood", value: firstBloodPoints },
      { name: "Bonus", value: bonusPoints },
    ].filter((d) => d.value > 0);

    const challengeProgress = [
      { name: "Solved", value: solvedChallenges },
      { name: "Unsolved", value: unsolvedChallenges },
    ].filter((d) => d.value > 0);

    return {
      kpis: {
        teams: analytics?.teams ?? teamMap.size,
        challenges: totalChallenges,
        solved: solvedChallenges,
        firstBloods: firstBloodCount,
        submissions: analytics?.submissions ?? activeScores.length,
        totalScore:
          analytics?.total_score ?? baseScore + firstBloodPoints + bonusPoints,
        firstBloodPoints,
      },
      topTeamsByScore,
      topTeamsBySolves,
      topChallenges,
      firstBloodByTeam,
      scoreBreakdown,
      challengeProgress,
    };
  }, [analytics, scores]);

  const emptyScores = scores.filter((s) => !s.is_soft_deleted).length === 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {(
          [
            ["Teams", derived.kpis.teams],
            ["Challenges", derived.kpis.challenges],
            ["Solved", derived.kpis.solved],
            ["First bloods", derived.kpis.firstBloods],
            ["Submissions", derived.kpis.submissions],
            ["Total score", derived.kpis.totalScore],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <p className="text-xs text-[var(--text-muted)]">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-[var(--text)]">
              {value}
            </p>
          </div>
        ))}
      </div>

      {emptyScores ? (
        <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-10 text-center text-sm text-[var(--text-muted)]">
          No score data yet — charts will appear when teams start solving
          challenges.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Top teams by score"
            description="Combined base + first blood + bonus"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={derived.topTeamsByScore} margin={{ left: 0, right: 8 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                <Tooltip
                  contentStyle={tooltipStyle()}
                  formatter={(value) => [value ?? 0, "Score"]}
                  labelFormatter={(_, payload) =>
                    String(payload?.[0]?.payload?.fullName ?? "")
                  }
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {derived.topTeamsByScore.map((_, index) => (
                    <Cell
                      key={`team-score-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Top teams by solves"
            description="Valid answers per team"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={derived.topTeamsBySolves} margin={{ left: 0, right: 8 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={tooltipStyle()}
                  formatter={(value, name) => [
                    value ?? 0,
                    name === "solves" ? "Solves" : "First bloods",
                  ]}
                  labelFormatter={(_, payload) =>
                    String(payload?.[0]?.payload?.fullName ?? "")
                  }
                />
                <Legend />
                <Bar
                  dataKey="solves"
                  name="Solves"
                  fill={CHART_COLORS[0]}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="firstBlood"
                  name="First bloods"
                  fill={CHART_COLORS[3]}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Challenge progress"
            description="Solved vs remaining challenges"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={derived.challengeProgress}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {derived.challengeProgress.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={
                        entry.name === "Solved"
                          ? CHART_COLORS[0]
                          : CHART_COLORS[4]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle()} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Score breakdown"
            description="Base vs first blood vs bonus points"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={
                    derived.scoreBreakdown.length
                      ? derived.scoreBreakdown
                      : [{ name: "No points", value: 1 }]
                  }
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {(derived.scoreBreakdown.length
                    ? derived.scoreBreakdown
                    : [{ name: "No points", value: 1 }]
                  ).map((_, index) => (
                    <Cell
                      key={`score-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle()} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Most solved challenges"
            description="Solve count by challenge"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={derived.topChallenges}
                layout="vertical"
                margin={{ left: 8, right: 8 }}
              >
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={tooltipStyle()}
                  formatter={(value) => [value ?? 0, "Solves"]}
                  labelFormatter={(_, payload) =>
                    String(payload?.[0]?.payload?.fullName ?? "")
                  }
                />
                <Bar dataKey="solves" radius={[0, 4, 4, 0]}>
                  {derived.topChallenges.map((_, index) => (
                    <Cell
                      key={`chal-${index}`}
                      fill={CHART_COLORS[(index + 1) % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="First bloods by team"
            description="Who claimed the first solves"
          >
            {derived.firstBloodByTeam.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
                No first bloods yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={derived.firstBloodByTeam}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {derived.firstBloodByTeam.map((_, index) => (
                      <Cell
                        key={`fb-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle()} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      )}
    </div>
  );
}
