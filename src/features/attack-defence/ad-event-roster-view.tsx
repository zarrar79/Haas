"use client";

import { useMemo, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { FILTER_CONTROL_CLASS } from "@/components/ui/form-control";
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
import {
  createAdPlaying,
  createAdPlayingTeam,
  deleteAdPlayingTeam,
  type AdChallenge,
  type AdPlaying,
  type AdPlayingTeam,
} from "@/features/attack-defence/attack-defence-api";
import type { EventTeam } from "@/features/teams/team-api";

type Props = {
  eventId: string;
  canWrite: boolean;
  playings: AdPlaying[];
  playingTeams: AdPlayingTeam[];
  challenges: AdChallenge[];
  platformTeams: EventTeam[];
  onChanged: () => void | Promise<void>;
};

type MatchupRow = {
  id: string;
  team: EventTeam;
  assignment: AdPlayingTeam | null;
};

type MatchupColumn = {
  key: string;
  header: string;
  wrap?: boolean;
  sticky?: "left" | "right";
  render: (row: MatchupRow) => React.ReactNode;
};

const MATCHUP_PAGE_SIZES = [8, 16, 32] as const;

const EMPTY_FILTERS = {
  q: "",
  paired: "",
  challenge: "",
  machine: "",
};

type MatchupFilters = typeof EMPTY_FILTERS;

function matchesQuery(haystack: string, q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return haystack.toLowerCase().includes(needle);
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function withSerialColumn(
  rows: MatchupRow[],
  columns: MatchupColumn[],
): MatchupColumn[] {
  return [
    {
      key: "sn",
      header: "#",
      render: (row) => {
        const idx = rows.findIndex((r) => r.id === row.id);
        return String(idx >= 0 ? idx + 1 : "—");
      },
    },
    ...columns,
  ];
}

export function AdEventRosterView({
  eventId,
  canWrite,
  playings,
  playingTeams,
  challenges,
  platformTeams,
  onChanged,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<MatchupFilters>(EMPTY_FILTERS);

  const setFilter = <K extends keyof MatchupFilters>(
    key: K,
    value: MatchupFilters[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => setFilters(EMPTY_FILTERS);

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((v) => v.trim() !== ""),
    [filters],
  );

  const enrolledByTeamId = useMemo(() => {
    const map = new Map<string, AdPlayingTeam>();
    for (const pt of playingTeams) map.set(pt.team, pt);
    return map;
  }, [playingTeams]);

  const enrolledByChallengeId = useMemo(() => {
    const map = new Map<string, AdPlayingTeam>();
    for (const pt of playingTeams) map.set(pt.challenge, pt);
    return map;
  }, [playingTeams]);

  const freeTeams = useMemo(
    () => platformTeams.filter((t) => !enrolledByTeamId.has(t.id)),
    [platformTeams, enrolledByTeamId],
  );

  const freeChallenges = useMemo(
    () => challenges.filter((c) => !enrolledByChallengeId.has(c.id)),
    [challenges, enrolledByChallengeId],
  );

  const countsMatch =
    freeTeams.length > 0 && freeTeams.length === freeChallenges.length;

  const challengeOptions = useMemo(
    () =>
      [...challenges]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ id: c.id, name: c.name })),
    [challenges],
  );

  const rows: MatchupRow[] = useMemo(
    () =>
      [...platformTeams]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((team) => ({
          id: team.id,
          team,
          assignment: enrolledByTeamId.get(team.id) ?? null,
        })),
    [platformTeams, enrolledByTeamId],
  );

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filters.paired === "yes" && !r.assignment) return false;
      if (filters.paired === "no" && r.assignment) return false;
      if (
        filters.challenge &&
        (!r.assignment || r.assignment.challenge !== filters.challenge)
      )
        return false;
      if (filters.machine === "yes" && !r.assignment?.machine_ip) return false;
      if (filters.machine === "no" && r.assignment?.machine_ip) return false;
      return matchesQuery(
        `${r.team.name} ${r.team.team_code || ""} ${r.assignment?.challenge_name || ""} ${r.assignment?.machine_ip || ""}`,
        filters.q,
      );
    });
  }, [rows, filters]);

  const ensurePlaying = async () => {
    if (playings[0]) return playings[0];
    return createAdPlaying({
      event: eventId,
      is_open: true,
      is_active: true,
    });
  };

  const assignPair = async (teamId: string, challengeId: string) => {
    if (!canWrite || !challengeId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const playing = await ensurePlaying();
      await createAdPlayingTeam({
        ad_playing: playing.id,
        team: teamId,
        challenge: challengeId,
      });
      setMessage("Matchup saved.");
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign");
    } finally {
      setBusy(false);
    }
  };

  const removeAssignment = async (pt: AdPlayingTeam) => {
    if (!canWrite) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await deleteAdPlayingTeam(pt.id);
      setMessage("Matchup removed.");
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setBusy(false);
    }
  };

  const randomAssign = async () => {
    if (!canWrite) return;
    if (freeTeams.length === 0) {
      setError("No free teams left to assign.");
      return;
    }
    if (freeTeams.length !== freeChallenges.length) {
      setError(
        `Random assign needs equal free teams and challenges (${freeTeams.length} team${freeTeams.length === 1 ? "" : "s"}, ${freeChallenges.length} challenge${freeChallenges.length === 1 ? "" : "s"}).`,
      );
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const playing = await ensurePlaying();
      const shuffled = shuffle(freeChallenges);
      for (let i = 0; i < freeTeams.length; i += 1) {
        await createAdPlayingTeam({
          ad_playing: playing.id,
          team: freeTeams[i].id,
          challenge: shuffled[i].id,
        });
      }
      setMessage(
        `Randomly paired ${freeTeams.length} team${freeTeams.length === 1 ? "" : "s"} with challenges.`,
      );
      await onChanged();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Random assignment failed",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-[var(--text)]">
            Matchups
          </h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Assign each team a challenge from the dropdown of unassigned
            challenges. One challenge per team.
          </p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Free teams:{" "}
            <strong className="text-[var(--text)]">{freeTeams.length}</strong>
            {" · "}
            Unassigned challenges:{" "}
            <strong className="text-[var(--text)]">
              {freeChallenges.length}
            </strong>
            {" · "}
            Paired:{" "}
            <strong className="text-[var(--text)]">{playingTeams.length}</strong>
          </p>
        </div>
        {canWrite ? (
          <Button
            size="sm"
            disabled={busy || !countsMatch}
            title={
              countsMatch
                ? "Shuffle unassigned challenges onto free teams"
                : "Needs equal free team and challenge counts"
            }
            onClick={() => void randomAssign()}
          >
            Randomly assign
          </Button>
        ) : null}
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {message ? <Alert variant="success">{message}</Alert> : null}

      <StickyToolbar
        footer={
          <ListPageStats>
            <ListPageStat label="Total" value={rows.length} />
            <ListPageStatsDot />
            <ListPageStat
              label="Shown"
              value={filteredRows.length}
              tone={filteredRows.length !== rows.length ? "accent" : "default"}
            />
          </ListPageStats>
        }
      >
        <FilterTextField
          label="Search"
          value={filters.q}
          onChange={(v) => setFilter("q", v)}
          placeholder="Team, challenge, IP…"
        />
        <FilterSelect
          label="Paired"
          value={filters.paired}
          onChange={(v) => setFilter("paired", v)}
        >
          <option value="">All</option>
          <option value="yes">Paired</option>
          <option value="no">Not paired</option>
        </FilterSelect>
        <FilterSelect
          label="Challenge"
          value={filters.challenge}
          onChange={(v) => setFilter("challenge", v)}
        >
          <option value="">All challenges</option>
          {challengeOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Machine"
          value={filters.machine}
          onChange={(v) => setFilter("machine", v)}
        >
          <option value="">All</option>
          <option value="yes">Has VM IP</option>
          <option value="no">No VM IP</option>
        </FilterSelect>
        <div className="flex shrink-0 flex-wrap items-end gap-2 pb-0.5">
          <Button
            size="sm"
            variant="secondary"
            disabled={!hasActiveFilters}
            onClick={clearFilters}
          >
            Clear
          </Button>
        </div>
      </StickyToolbar>

      <DataTable
        rows={filteredRows}
        rowKey={(r) => r.id}
        emptyMessage="No platform teams available."
        defaultPageSize={16}
        pageSizeOptions={MATCHUP_PAGE_SIZES}
        columns={withSerialColumn(filteredRows, [
          {
            key: "team",
            header: "Team",
            render: (r) => (
              <span className="font-medium text-[var(--text)]">
                {r.team.name}
                {r.team.team_code ? (
                  <span className="ml-1 font-normal text-[var(--text-muted)]">
                    ({r.team.team_code})
                  </span>
                ) : null}
              </span>
            ),
          },
          {
            key: "challenge",
            header: "Challenge",
            wrap: true,
            render: (r) => {
              if (r.assignment) {
                return (
                  <span className="text-sm text-[var(--text)]">
                    {r.assignment.challenge_name ||
                      r.assignment.challenge.slice(0, 8)}
                  </span>
                );
              }

              if (!canWrite) {
                return <span className="text-[var(--text-muted)]">—</span>;
              }

              return (
                <select
                  className={`${FILTER_CONTROL_CLASS} min-w-[14rem]`}
                  value=""
                  disabled={busy || freeChallenges.length === 0}
                  onChange={(e) => {
                    const challengeId = e.target.value;
                    if (challengeId) void assignPair(r.id, challengeId);
                  }}
                >
                  <option value="">
                    {freeChallenges.length
                      ? "Select challenge…"
                      : "No unassigned challenges"}
                  </option>
                  {freeChallenges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              );
            },
          },
          {
            key: "combo",
            header: "Challenge–team",
            wrap: true,
            render: (r) => {
              if (!r.assignment) {
                return (
                  <span className="text-[var(--text-muted)]">Not paired</span>
                );
              }
              return (
                <span className="text-sm text-[var(--text)]">
                  {r.team.name}
                  <span className="mx-1.5 text-[var(--text-muted)]">↔</span>
                  {r.assignment.challenge_name ||
                    r.assignment.challenge.slice(0, 8)}
                </span>
              );
            },
          },
          {
            key: "vm_ip",
            header: "VM IP",
            render: (r) => (
              <span className="font-mono text-sm text-[var(--text)]">
                {r.assignment?.machine_ip || "—"}
              </span>
            ),
          },
          {
            key: "actions",
            header: "",
            sticky: "right",
            render: (r) => {
              if (!canWrite || !r.assignment) {
                return (
                  <span className="text-xs text-[var(--text-muted)]">—</span>
                );
              }
              return (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void removeAssignment(r.assignment!)}
                >
                  Remove
                </Button>
              );
            },
          },
        ])}
      />
    </div>
  );
}
