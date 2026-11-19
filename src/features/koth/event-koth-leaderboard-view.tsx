"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  ListPageStat,
  ListPageStats,
  ListPageStatsDot,
} from "@/components/ui/list-page-stats";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoader } from "@/components/ui/loader";
import {
  FilterSelect,
  FilterTextField,
  StickyToolbar,
} from "@/components/ui/sticky-toolbar";
import {
  EventModeSubnav,
  kothSubnavItems,
} from "@/features/events/event-mode-subnav";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import {
  getKothLeaderboard,
  listKothSessions,
  type KothSession,
  type KothTeamScore,
} from "@/features/koth/koth-api";
import { redirectIfUnauthorized } from "@/lib/client-api";

type Props = { hackathonId: string };

function formatHold(seconds: number) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (h > 0) return `${h}h ${m}m ${rem}s`;
  if (m > 0) return `${m}m ${rem}s`;
  return `${rem}s`;
}

function statusTone(status: string) {
  switch (status) {
    case "running":
      return "success" as const;
    case "paused":
      return "warning" as const;
    case "stopped":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

export function EventKothLeaderboardView({ hackathonId }: Props) {
  const router = useRouter();
  const { setSelectedHackathonId } = useSelectedEvent();
  const [activeId, setActiveId] = useState(hackathonId);
  const [sessions, setSessions] = useState<KothSession[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [rows, setRows] = useState<KothTeamScore[]>([]);
  const [session, setSession] = useState<KothSession | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActiveId(hackathonId);
    if (hackathonId) setSelectedHackathonId(hackathonId);
  }, [hackathonId, setSelectedHackathonId]);

  const loadSessions = useCallback(async () => {
    if (!activeId) return;
    setError(null);
    try {
      const list = await listKothSessions(activeId);
      setSessions(list);
      setSessionId((prev) => {
        if (prev && list.some((s) => s.id === prev)) return prev;
        const preferred =
          list.find((s) => s.status === "running") ||
          list.find((s) => s.is_active !== false) ||
          list[0];
        return preferred?.id || "";
      });
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(err instanceof Error ? err.message : "Failed to load KOTH sessions");
      setSessions([]);
      setSessionId("");
    }
  }, [activeId, router]);

  const loadBoard = useCallback(async () => {
    if (!activeId || !sessionId) {
      setRows([]);
      setSession(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const payload = await getKothLeaderboard(activeId, sessionId);
      setSession(payload.session || null);
      setRows(payload.leaderboard || []);
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(
        err instanceof Error ? err.message : "Failed to load KOTH leaderboard",
      );
      setRows([]);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, [activeId, sessionId, router]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.team_name?.toLowerCase().includes(q) ||
        row.koth_code?.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    const totalScore = filtered.reduce((sum, row) => sum + (row.total_score || 0), 0);
    const leader = filtered[0];
    return {
      teams: filtered.length,
      totalScore,
      leaderName: leader?.team_name || "—",
      leaderScore: leader?.total_score ?? 0,
      king: session?.current_team_name || "—",
    };
  }, [filtered, session]);

  return (
    <div className="w-full space-y-4">
      <PageHeader
        eyebrow="King of the Hill"
        title="KOTH leaderboard"
        description="Team ranking for KOTH scoring on the selected session — holds, reigns, and total points."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void loadSessions();
              void loadBoard();
            }}
          >
            Refresh
          </Button>
        }
      />

      <EventModeSubnav items={kothSubnavItems(activeId)} />

      <StickyToolbar>
        <FilterSelect
          label="Session"
          value={sessionId}
          onChange={setSessionId}
        >
          {sessions.length === 0 ? (
            <option value="">No sessions</option>
          ) : (
            sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {(s.display_title || s.name || "KOTH") + ` · ${s.status}`}
              </option>
            ))
          )}
        </FilterSelect>
        <FilterTextField
          label="Search"
          value={search}
          onChange={setSearch}
          placeholder="Team name or KOTH code…"
        />
        {sessionId ? (
          <Link href={`/events/${activeId}/koth/${sessionId}`}>
            <Button variant="secondary" size="sm">
              Open session
            </Button>
          </Link>
        ) : null}
      </StickyToolbar>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {!sessionId && !isLoading ? (
        <Alert variant="info">
          Create a KOTH session under Sessions to see scoring here.
        </Alert>
      ) : null}

      {session ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
          <span className="font-medium text-[var(--text)]">
            {session.display_title || session.name}
          </span>
          <Badge tone={statusTone(session.status)}>{session.status}</Badge>
          {session.current_team_name ? (
            <span>Current king: {session.current_team_name}</span>
          ) : (
            <span>No current king</span>
          )}
        </div>
      ) : null}

      <ListPageStats>
        <ListPageStat label="Teams scored" value={String(stats.teams)} />
        <ListPageStatsDot />
        <ListPageStat label="Total points" value={String(stats.totalScore)} />
        <ListPageStatsDot />
        <ListPageStat
          label="Leader"
          value={
            stats.leaderName === "—"
              ? "—"
              : `${stats.leaderName} (${stats.leaderScore})`
          }
        />
        <ListPageStatsDot />
        <ListPageStat label="Current king" value={stats.king} />
      </ListPageStats>

      {isLoading && rows.length === 0 ? (
        <PageLoader label="Loading KOTH leaderboard…" variant="form" />
      ) : (
        <DataTable
          isLoading={isLoading}
          emptyMessage="No KOTH scores yet for this session."
          rowKey={(row) => row.id}
          rows={filtered}
          columns={[
            {
              key: "rank",
              header: "#",
              render: (row) =>
                String(filtered.findIndex((r) => r.id === row.id) + 1),
            },
            {
              key: "team",
              header: "Team",
              render: (row) => (
                <div>
                  <div className="font-medium">{row.team_name}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {row.koth_code}
                  </div>
                </div>
              ),
            },
            {
              key: "score",
              header: "Score",
              render: (row) => (
                <span className="font-semibold tabular-nums">
                  {row.total_score}
                </span>
              ),
            },
            {
              key: "reigns",
              header: "Became king",
              render: (row) => String(row.times_became_king),
            },
            {
              key: "dethroned",
              header: "Dethroned",
              render: (row) => String(row.times_dethroned),
            },
            {
              key: "hold",
              header: "Hold time",
              render: (row) => formatHold(row.total_hold_seconds),
            },
          ]}
        />
      )}
    </div>
  );
}
