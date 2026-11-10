"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BiAward, BiCrown, BiMedal, BiTrophy } from "react-icons/bi";

import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import {
  ListPageStat,
  ListPageStats,
  ListPageStatsDot,
} from "@/components/ui/list-page-stats";
import {
  FilterSelect,
  FilterTextField,
  StickyToolbar,
} from "@/components/ui/sticky-toolbar";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  getOverviewLeaderboard,
  type OverviewLeaderboardItem,
} from "@/features/dashboard/overview-analytics-api";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import { redirectIfUnauthorized } from "@/lib/client-api";

type Props = { hackathonId: string };

type LimitOption = "25" | "50" | "100" | "200";
type SideFilter = "all" | string;
type BlockFilter = "all" | "blocked" | "active";

function formatNum(n: number) {
  return new Intl.NumberFormat().format(n || 0);
}

/** Live board treats first blood as "bonus"; Haas also has a separate bonus_score field. */
function displayBonus(row: OverviewLeaderboardItem) {
  return (row.first_blood_score ?? 0) + (row.bonus_score ?? 0);
}

function displayChallengeScore(row: OverviewLeaderboardItem) {
  return row.challenge_score ?? 0;
}

function DifficultyBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.min(((value || 0) / Math.max(max, 1)) * 100, 100);
  return (
    <div className="flex min-w-[72px] items-center gap-1.5">
      <div className="h-2 flex-1 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--bg)]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="min-w-[1.25rem] text-center text-xs font-semibold tabular-nums text-[var(--text)]">
        {value || 0}
      </span>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const Icon = rank === 1 ? BiCrown : rank === 2 ? BiMedal : rank === 3 ? BiAward : BiTrophy;
  const tone =
    rank === 1 ? "success" : rank === 2 || rank === 3 ? "warning" : undefined;
  return (
    <div className="flex items-center gap-1.5">
      <Badge tone={tone}>#{rank}</Badge>
      {rank <= 3 ? <Icon className="size-4 text-[var(--accent)]" /> : null}
    </div>
  );
}

function TopTeamCard({
  team,
  maxDifficulty,
}: {
  team: OverviewLeaderboardItem;
  maxDifficulty: number;
}) {
  const easy = team.difficulty_counts?.easy ?? 0;
  const medium = team.difficulty_counts?.medium ?? 0;
  const hard = team.difficulty_counts?.hard ?? 0;
  const solved = easy + medium + hard + (team.difficulty_counts?.other ?? 0);
  const finalScore = team.final_score ?? team.score ?? 0;
  const challengeScore = displayChallengeScore(team);
  const bonus = displayBonus(team);

  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={team.name} src={team.image_url || undefined} size="md" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-base font-semibold text-[var(--text)]">
                {team.name}
              </p>
              {team.is_blocked ? <Badge tone="danger">Blocked</Badge> : null}
              {team.register_as ? <Badge>{team.register_as}</Badge> : null}
            </div>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {team.team_code || team.team_id.slice(0, 8)}
            </p>
            <p className="mt-2 text-lg font-bold tabular-nums text-[var(--text)]">
              {formatNum(finalScore)}
              <span className="ml-1 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                total
              </span>
            </p>
            <p className="mt-0.5 text-xs tabular-nums text-[var(--text-muted)]">
              {formatNum(challengeScore)} score
              <span className="mx-1 text-[var(--border-strong,#94a3b8)]">·</span>
              <span className="text-[var(--success,#16a34a)]">
                +{formatNum(bonus)} bonus
              </span>
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {formatNum(solved)} {solved === 1 ? "challenge" : "challenges"} solved
            </p>
          </div>
        </div>
        <RankBadge rank={team.rank} />
      </div>

      <div className="mt-4 space-y-2.5">
        {(
          [
            { label: "Easy", value: easy, color: "var(--success, #16a34a)" },
            { label: "Medium", value: medium, color: "var(--warning, #d97706)" },
            { label: "Hard", value: hard, color: "var(--danger, #dc2626)" },
          ] as const
        ).map((row) => (
          <div key={row.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[var(--text-muted)]">{row.label}</span>
              <span className="font-semibold tabular-nums text-[var(--text)]">
                {row.value}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--bg)]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((row.value / Math.max(maxDifficulty, 1)) * 100, 100)}%`,
                  backgroundColor: row.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EventLeaderboardView({ hackathonId }: Props) {
  const router = useRouter();
  const { setSelectedHackathonId } = useSelectedEvent();
  const [limit, setLimit] = useState<LimitOption>("100");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sideFilter, setSideFilter] = useState<SideFilter>("all");
  const [blockFilter, setBlockFilter] = useState<BlockFilter>("all");
  const [items, setItems] = useState<OverviewLeaderboardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Event Workspace pages follow the header / URL hackathon only.
  useEffect(() => {
    if (hackathonId) setSelectedHackathonId(hackathonId);
  }, [hackathonId, setSelectedHackathonId]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    if (!hackathonId) return;
    setIsLoading(true);
    setError(null);
    try {
      const payload = await getOverviewLeaderboard(hackathonId, { limit });
      setItems(payload.items ?? []);
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(err instanceof Error ? err.message : "Failed to load leaderboard");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [hackathonId, limit, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const sideOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of items) {
      if (row.register_as?.trim()) set.add(row.register_as.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return items.filter((row) => {
      if (sideFilter !== "all" && (row.register_as || "") !== sideFilter) {
        return false;
      }
      if (blockFilter === "blocked" && !row.is_blocked) return false;
      if (blockFilter === "active" && row.is_blocked) return false;
      if (!q) return true;
      const haystack = [
        row.name,
        row.team_code,
        row.team_id,
        row.register_as,
        String(row.rank),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, debouncedSearch, sideFilter, blockFilter]);

  const topThree = useMemo(() => filtered.slice(0, 3), [filtered]);

  const maxDifficulty = useMemo(() => {
    let max = 1;
    for (const row of filtered) {
      const d = row.difficulty_counts;
      max = Math.max(max, d?.easy ?? 0, d?.medium ?? 0, d?.hard ?? 0);
    }
    return max;
  }, [filtered]);

  const stats = useMemo(() => {
    const totalScore = filtered.reduce(
      (sum, row) => sum + (row.final_score ?? row.score ?? 0),
      0,
    );
    const totalSolves = filtered.reduce((sum, row) => sum + (row.solves || 0), 0);
    const leader = filtered[0];
    return {
      teams: filtered.length,
      totalScore,
      totalSolves,
      leaderName: leader?.name || "—",
      leaderScore: leader?.final_score ?? leader?.score ?? 0,
    };
  }, [filtered]);

  return (
    <div className="w-full space-y-4">
      <PageHeader
        eyebrow="Event workspace"
        title="Leaderboard"
        description="Team ranking for this hackathon — same layout as the live dashboard, with admin search and filters."
        actions={
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      <StickyToolbar>
        <FilterTextField
          label="Search"
          value={search}
          onChange={setSearch}
          placeholder="Team name, code, side…"
        />
        <FilterSelect label="Side" value={sideFilter} onChange={setSideFilter}>
          <option value="all">All sides</option>
          {sideOptions.map((side) => (
            <option key={side} value={side}>
              {side}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Status"
          value={blockFilter}
          onChange={(v) => setBlockFilter(v as BlockFilter)}
        >
          <option value="all">All teams</option>
          <option value="active">Active only</option>
          <option value="blocked">Blocked only</option>
        </FilterSelect>
        <FilterSelect
          label="Show top"
          value={limit}
          onChange={(v) => setLimit(v as LimitOption)}
        >
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="200">200</option>
        </FilterSelect>
      </StickyToolbar>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <ListPageStats>
        <ListPageStat label="Shown teams" value={formatNum(stats.teams)} />
        <ListPageStatsDot />
        <ListPageStat label="Total points" value={formatNum(stats.totalScore)} />
        <ListPageStatsDot />
        <ListPageStat label="Total solves" value={formatNum(stats.totalSolves)} />
        <ListPageStatsDot />
        <ListPageStat
          label="Leader"
          value={
            stats.leaderName === "—"
              ? "—"
              : `${stats.leaderName} (${formatNum(stats.leaderScore)})`
          }
        />
      </ListPageStats>

      {isLoading && items.length === 0 ? (
        <TableSkeleton rows={8} columns={8} />
      ) : (
        <>
          {topThree.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {topThree.map((team) => (
                <TopTeamCard
                  key={team.team_id}
                  team={team}
                  maxDifficulty={maxDifficulty}
                />
              ))}
            </div>
          ) : null}

          <DataTable
            isLoading={isLoading}
            rows={filtered}
            rowKey={(row) => row.team_id}
            emptyMessage="No teams match the current search or filters."
            columns={[
              {
                key: "rank",
                header: "Rank",
                className: "w-24",
                render: (row) => <RankBadge rank={row.rank} />,
              },
              {
                key: "team",
                header: "Team",
                render: (row) => (
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={row.name}
                      src={row.image_url || undefined}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-[var(--text)]">
                          {row.name}
                        </p>
                        {row.is_blocked ? (
                          <Badge tone="danger">Blocked</Badge>
                        ) : null}
                      </div>
                      <p className="truncate text-xs text-[var(--text-muted)]">
                        {row.team_code || row.team_id.slice(0, 8)}
                        {row.register_as ? ` · ${row.register_as}` : ""}
                      </p>
                    </div>
                  </div>
                ),
              },
              {
                key: "easy",
                header: "Easy",
                render: (row) => (
                  <DifficultyBar
                    value={row.difficulty_counts?.easy ?? 0}
                    max={maxDifficulty}
                    color="var(--success, #16a34a)"
                  />
                ),
              },
              {
                key: "medium",
                header: "Medium",
                render: (row) => (
                  <DifficultyBar
                    value={row.difficulty_counts?.medium ?? 0}
                    max={maxDifficulty}
                    color="var(--warning, #d97706)"
                  />
                ),
              },
              {
                key: "hard",
                header: "Hard",
                render: (row) => (
                  <DifficultyBar
                    value={row.difficulty_counts?.hard ?? 0}
                    max={maxDifficulty}
                    color="var(--danger, #dc2626)"
                  />
                ),
              },
              {
                key: "challenge",
                header: "Score",
                render: (row) => (
                  <span className="tabular-nums font-medium text-[var(--text)]">
                    {formatNum(displayChallengeScore(row))}
                  </span>
                ),
              },
              {
                key: "bonus",
                header: "Bonus",
                render: (row) => (
                  <span className="tabular-nums font-medium text-[var(--success,#16a34a)]">
                    +{formatNum(displayBonus(row))}
                  </span>
                ),
              },
              {
                key: "negative",
                header: "Negative",
                render: (row) => (
                  <span className="tabular-nums font-medium text-[var(--danger)]">
                    -{formatNum(row.negative_score ?? 0)}
                  </span>
                ),
              },
              {
                key: "total",
                header: "Total",
                render: (row) => (
                  <span className="text-base font-bold tabular-nums text-[var(--text)]">
                    {formatNum(row.final_score ?? row.score ?? 0)}
                  </span>
                ),
              },
            ]}
          />
        </>
      )}
    </div>
  );
}
