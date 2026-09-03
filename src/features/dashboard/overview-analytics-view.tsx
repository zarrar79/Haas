"use client";

import { useMemo, type ReactNode } from "react";
import {
  Area,
  AreaChart,
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
import {
  BiFlag,
  BiGroup,
  BiStar,
  BiTrophy,
} from "react-icons/bi";

import { formatBucketLabel } from "@/features/dashboard/admin-guidance";
import { chartTooltipStyle } from "@/features/dashboard/dashboard-charts";
import type { OverviewAnalyticsBundle } from "@/features/dashboard/overview-analytics-api";

const LIME = "var(--accent)";
const CORAL = "var(--danger)";
const TEAL = "var(--cyan)";
const MUTED = "var(--text-subtle)";

function formatNum(n: number) {
  return (n ?? 0).toLocaleString();
}

function pct(rate: number, digits = 0) {
  const v = (rate || 0) * 100;
  return digits > 0 ? v.toFixed(digits) : String(Math.round(v));
}

function formatFullTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Tooltip that prefers payload.fullLabel / fullName over truncated axis labels. */
function FullTextTooltip({
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
    payload?: Record<string, unknown>;
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const title =
    (typeof row?.fullLabel === "string" && row.fullLabel) ||
    (typeof row?.fullName === "string" && row.fullName) ||
    (typeof label === "string" ? label : "") ||
    "";

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
        <p
          style={{
            margin: "0 0 6px",
            fontWeight: 600,
            lineHeight: 1.35,
            color: "var(--text)",
          }}
        >
          {title}
        </p>
      ) : null}
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {payload.map((entry) => (
          <li
            key={String(entry.dataKey ?? entry.name)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 2,
              color: "var(--text-muted)",
              fontSize: 12,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: entry.color || "var(--accent)",
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1, wordBreak: "break-word" }}>
              {entry.name}
            </span>
            <span
              style={{
                fontWeight: 700,
                color: "var(--text)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
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

function Card({
  title,
  subtitle,
  children,
  className = "",
  icon,
  compact = false,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section
      className={`flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] ${
        compact ? "rounded-[var(--radius-sm)] p-3" : "p-5"
      } ${className}`}
    >
      {(title || icon) && (
        <header
          className={`flex items-start justify-between gap-2 ${
            compact ? "mb-1.5" : "mb-4 gap-3"
          }`}
        >
          <div className="min-w-0">
            {title ? (
              <h2
                className={`font-semibold tracking-tight text-[var(--text)] ${
                  compact ? "text-xs" : "text-[15px]"
                }`}
              >
                {title}
              </h2>
            ) : null}
            {subtitle ? (
              <p
                className={`leading-relaxed text-[var(--text-muted)] ${
                  compact ? "mt-0.5 text-[10px]" : "mt-1 text-xs"
                }`}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
          {icon}
        </header>
      )}
      {children}
    </section>
  );
}

function ProgressBar({
  value,
  max,
  color = LIME,
  compact = false,
}: {
  value: number;
  max: number;
  color?: string;
  compact?: boolean;
}) {
  const width = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      className={`overflow-hidden rounded-full bg-[var(--surface-hover)] ${
        compact ? "mt-2 h-1" : "mt-4 h-1.5"
      }`}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{
          width: `${width}%`,
          background: color,
          boxShadow: `0 0 10px ${color}`,
        }}
      />
    </div>
  );
}

function Pill({
  children,
  tone = "lime",
}: {
  children: ReactNode;
  tone?: "lime" | "coral" | "neutral" | "orange";
}) {
  const styles =
    tone === "lime"
      ? "border-[color-mix(in_srgb,var(--accent)_35%,transparent)] text-[var(--accent)]"
      : tone === "coral"
        ? "border-[color-mix(in_srgb,var(--danger)_40%,transparent)] text-[var(--danger)]"
        : tone === "orange"
          ? "border-[color-mix(in_srgb,var(--warning)_40%,transparent)] text-[var(--warning)]"
          : "border-[var(--border-strong)] text-[var(--text-muted)]";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${styles}`}
    >
      {children}
    </span>
  );
}

function IconBadge({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)] ${
        compact ? "size-6" : "size-8"
      }`}
    >
      {children}
    </span>
  );
}

function SolveRateGauge({ rate }: { rate: number }) {
  const clamped = Math.max(0, Math.min(1, rate || 0));
  const r = 54;
  const c = 2 * Math.PI * r;
  const arc = c * 0.75; // 270° gauge
  const offset = arc * (1 - clamped);
  const size = 148;

  return (
    <div className="relative mx-auto flex w-full max-w-[180px] items-center justify-center py-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-[135deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-hover)"
          strokeWidth={12}
          strokeDasharray={`${arc} ${c}`}
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={LIME}
          strokeWidth={12}
          strokeDasharray={`${arc} ${c}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 8px color-mix(in srgb, var(--accent) 55%, transparent))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-2 text-center">
        <p className="text-2xl font-bold tabular-nums text-[var(--text)]">
          {pct(clamped, 1)}%
        </p>
        <p className="text-[11px] text-[var(--text-subtle)]">accuracy</p>
      </div>
    </div>
  );
}

type Props = {
  data: OverviewAnalyticsBundle;
  periodLabel?: string;
};

export function OverviewAnalyticsView({ data, periodLabel }: Props) {
  const { kpis, activity, leaderboard, topChallenges, difficultyMix, submissions } =
    data;

  const period = periodLabel || activity.period || kpis.period || "7d";
  const windowHours = activity.window_hours || kpis.window_hours || 168;

  const activityChart = useMemo(
    () =>
      (activity.points ?? []).map((row) => ({
        label: formatBucketLabel(row.t),
        fullLabel: formatFullTimestamp(row.t),
        valid: row.valid ?? 0,
        invalid: row.invalid ?? 0,
        logins: row.logins ?? 0,
      })),
    [activity.points],
  );
  const hasActivity = activityChart.some(
    (r) => r.valid + r.invalid + r.logins > 0,
  );

  const lbItems = useMemo(
    () => (leaderboard.items ?? []).slice(0, 8),
    [leaderboard.items],
  );
  const maxScore = Math.max(...lbItems.map((t) => t.score || 0), 1);

  const windowSolveRate =
    (submissions.window?.total || 0) > 0
      ? (submissions.window.valid || 0) / submissions.window.total
      : 0;

  const difficultyGrouped = useMemo(() => {
    const solveMap = new Map(
      (difficultyMix.solves_by_difficulty ?? []).map((r) => [
        (r.difficulty || "unknown").toLowerCase(),
        r.solves || 0,
      ]),
    );
    const buckets = [
      { key: "easy", challenges: difficultyMix.easy || 0 },
      { key: "medium", challenges: difficultyMix.medium || 0 },
      { key: "hard", challenges: difficultyMix.hard || 0 },
    ];
    return buckets
      .filter((b) => b.challenges > 0 || (solveMap.get(b.key) || 0) > 0)
      .map((b) => ({
        name: b.key,
        fullName: b.key,
        challenges: b.challenges,
        solves: solveMap.get(b.key) || 0,
      }));
  }, [difficultyMix]);

  const challengeBars = useMemo(
    () =>
      (topChallenges.items ?? []).slice(0, 6).map((row) => ({
        name: row.name.length > 14 ? `${row.name.slice(0, 13)}…` : row.name,
        fullName: row.name,
        solves: row.solves ?? 0,
        submissions: row.submissions ?? 0,
        difficulty: row.difficulty,
        total_score: row.total_score ?? 0,
      })),
    [topChallenges.items],
  );

  const qualityPie = useMemo(
    () =>
      [
        {
          name: "valid",
          fullName: "valid",
          value: submissions.valid || 0,
          color: LIME,
        },
        {
          name: "invalid",
          fullName: "invalid",
          value: submissions.invalid || 0,
          color: CORAL,
        },
      ].filter((r) => r.value > 0),
    [submissions],
  );

  const challengeSolvePct = pct(kpis.challenge_solve_rate);

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Row 1 — KPI cards (compact height, full width) */}
      <div className="grid w-full grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Card
          compact
          title="Teams"
          icon={
            <IconBadge compact>
              <BiGroup className="size-3" />
            </IconBadge>
          }
        >
          <p className="text-xl font-bold tabular-nums tracking-tight text-[var(--text)]">
            {formatNum(kpis.teams_total)}
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-[var(--text-muted)]">
            {formatNum(kpis.teams_active)} active · {formatNum(kpis.members_total)}{" "}
            members
            {kpis.events_total != null ? (
              <> · {formatNum(kpis.events_total)} events</>
            ) : null}
          </p>
          <ProgressBar
            compact
            value={kpis.teams_active}
            max={Math.max(kpis.teams_total, 1)}
          />
        </Card>

        <Card
          compact
          title="Challenges solved"
          icon={
            <IconBadge compact>
              <BiFlag className="size-3" />
            </IconBadge>
          }
        >
          <p className="text-xl font-bold tabular-nums tracking-tight text-[var(--text)]">
            {formatNum(kpis.challenges_solved)}
            <span className="text-sm font-semibold text-[var(--text-muted)]">
              /{formatNum(kpis.challenges_total)}
            </span>
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-[var(--text-muted)]">
            {challengeSolvePct}% of the challenge set cracked
          </p>
          <ProgressBar
            compact
            value={kpis.challenges_solved}
            max={Math.max(kpis.challenges_total, 1)}
          />
        </Card>

        <Card
          compact
          title="Submissions"
          icon={
            <IconBadge compact>
              <BiStar className="size-3" />
            </IconBadge>
          }
        >
          <p className="text-xl font-bold tabular-nums tracking-tight text-[var(--text)]">
            {formatNum(kpis.submissions_total)}
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-[var(--text-muted)]">
            {formatNum(kpis.window.submissions_total)} in the current window
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            <Pill tone="lime">{formatNum(kpis.submissions_valid)} valid</Pill>
            <Pill tone="coral">{formatNum(kpis.submissions_invalid)} invalid</Pill>
          </div>
        </Card>

        <Card
          compact
          title="Points awarded"
          icon={
            <IconBadge compact>
              <BiTrophy className="size-3" />
            </IconBadge>
          }
        >
          <p className="text-xl font-bold tabular-nums tracking-tight text-[var(--text)]">
            {formatNum(submissions.points)}
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-[var(--text-muted)]">
            {formatNum(submissions.window.points)} pts this window
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
            {formatNum(submissions.first_bloods)} first bloods
          </p>
        </Card>
      </div>

      {/* Row 2 — Leaderboard + Window snapshot */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="Team leaderboard"
          subtitle={`Top ${lbItems.length || 0} teams by total score across all challenges`}
        >
          {lbItems.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--text-muted)]">
              No scored teams yet.
            </p>
          ) : (
            <ul className="space-y-4">
              {lbItems.map((team) => (
                <li key={team.team_id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-base font-semibold text-[var(--text)]">
                          {team.rank}. {team.name}
                        </p>
                        {team.rank === 1 ? (
                          <BiTrophy className="size-4 shrink-0 text-[var(--accent)]" />
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--text-subtle)]">
                        {team.team_code || team.team_id.slice(0, 8)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xl font-bold tabular-nums text-[var(--text)]">
                        {formatNum(team.score)}
                      </p>
                      <p className="text-xs text-[var(--text-subtle)]">
                        {formatNum(team.solves)} solves / {formatNum(team.submissions)}{" "}
                        subs
                      </p>
                    </div>
                  </div>
                  <ProgressBar value={team.score} max={maxScore} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Window snapshot"
          subtitle={`Activity in the last ${windowHours} hours (${period}).`}
        >
          <p className="text-sm leading-relaxed text-[var(--text-muted)]">
            <span className="font-semibold text-[var(--text)]">
              {formatNum(submissions.window.total)}
            </span>{" "}
            flags ·{" "}
            <span className="font-semibold text-[var(--accent)]">
              {pct(windowSolveRate)}% valid
            </span>{" "}
            ·{" "}
            <span className="font-semibold text-[var(--text)]">
              {formatNum(submissions.window.points)}
            </span>{" "}
            pts
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-subtle)]">
                Submissions
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--text)]">
                {formatNum(submissions.window.total)}
              </p>
            </div>
            <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-subtle)]">
                Points earned
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--text)]">
                {formatNum(submissions.window.points)}
              </p>
            </div>
            <div className="rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_08%,transparent)] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--accent)]">
                Valid flags
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--accent)]">
                {formatNum(submissions.window.valid)}
              </p>
            </div>
            <div className="rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--danger)_08%,transparent)] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--danger)]">
                Invalid flags
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--danger)]">
                {formatNum(submissions.window.invalid)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Row 3 — Activity + Solve rate */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="Activity timeline"
          subtitle="Valid vs invalid submissions and team logins per day."
        >
          <div className="mb-2 flex flex-wrap gap-4 text-xs text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[var(--accent)]" /> valid
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[var(--danger)]" /> invalid
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[var(--cyan)]" /> logins
            </span>
          </div>
          <div className="h-[260px] w-full">
            {hasActivity ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={activityChart}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="ovValidFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={LIME} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={LIME} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="ovInvalidFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CORAL} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={CORAL} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="ovLoginFill" x1="0" y1="0" x2="0" y2="1">
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
                    tick={{ fill: MUTED, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <RechartsTooltip content={<FullTextTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="invalid"
                    name="invalid"
                    stroke={CORAL}
                    fill="url(#ovInvalidFill)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="valid"
                    name="valid"
                    stroke={LIME}
                    fill="url(#ovValidFill)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="logins"
                    name="logins"
                    stroke={TEAL}
                    fill="url(#ovLoginFill)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
                No activity in this window yet.
              </p>
            )}
          </div>
        </Card>

        <Card
          title="Solve rate"
          subtitle="Valid submissions over all attempts."
        >
          <SolveRateGauge rate={submissions.solve_rate || kpis.solve_rate} />
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div className="rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_08%,transparent)] p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--accent)]">
                Valid
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums text-[var(--accent)]">
                {formatNum(submissions.valid)}
              </p>
            </div>
            <div className="rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--danger)_08%,transparent)] p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--danger)]">
                Invalid
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums text-[var(--danger)]">
                {formatNum(submissions.invalid)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Row 4 — Quality / Difficulty / Top challenges */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          title="Submission quality"
          subtitle={`${pct(submissions.solve_rate || kpis.solve_rate)}% of all flags submitted were valid.`}
        >
          <div className="relative h-[220px]">
            {qualityPie.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
                No submissions yet.
              </p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={qualityPie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={82}
                      paddingAngle={2}
                      cx="50%"
                      cy="50%"
                      stroke="none"
                    >
                      {qualityPie.map((row) => (
                        <Cell key={row.name} fill={row.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<FullTextTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      formatter={(value) => (
                        <span className="text-xs text-[var(--text-muted)]">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-6">
                  <p className="text-2xl font-bold tabular-nums text-[var(--text)]">
                    {formatNum(submissions.total)}
                  </p>
                  <p className="text-[11px] text-[var(--text-subtle)]">total</p>
                </div>
              </>
            )}
          </div>
        </Card>

        <Card
          title="Difficulty mix"
          subtitle={`${formatNum(difficultyMix.questions_total)} questions across ${formatNum(kpis.challenges_total)} challenges.`}
        >
          <div className="h-[220px]">
            {difficultyGrouped.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
                No challenges assigned.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={difficultyGrouped}
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
                  <RechartsTooltip content={<FullTextTooltip />} />
                  <Legend
                    formatter={(value) => (
                      <span className="text-xs text-[var(--text-muted)]">{value}</span>
                    )}
                  />
                  <Bar
                    dataKey="challenges"
                    name="challenges"
                    fill={TEAL}
                    radius={[4, 4, 0, 0]}
                    barSize={18}
                  />
                  <Bar
                    dataKey="solves"
                    name="solves"
                    fill={LIME}
                    radius={[4, 4, 0, 0]}
                    barSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card
          title="Top challenges"
          subtitle="Solves against total submissions."
        >
          <div className="h-[220px]">
            {challengeBars.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
                No challenge solves yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={challengeBars}
                  layout="vertical"
                  margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                  barGap={2}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={92}
                    tick={{ fill: MUTED, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip content={<FullTextTooltip />} />
                  <Bar
                    dataKey="submissions"
                    name="submissions"
                    fill={TEAL}
                    radius={[0, 999, 999, 0]}
                    barSize={8}
                  />
                  <Bar
                    dataKey="solves"
                    name="solves"
                    fill={LIME}
                    radius={[0, 999, 999, 0]}
                    barSize={8}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
