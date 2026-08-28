"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StickyToolbar } from "@/components/ui/sticky-toolbar";
import { TextField } from "@/components/ui/text-field";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import {
  getHackathonAnalytics,
  listHackathons,
  type HackathonAnalytics,
} from "@/features/hackathons/hackathon-api";
import { ApiRequestError } from "@/lib/client-api";
import { isPlatformChallengeOperator } from "@/lib/is-platform-operator";
import type { Hackathon } from "@/types/hackathon";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

type Row = Hackathon & {
  teamCount?: number | null;
  challengeCount?: number | null;
};

export function HackathonListView() {
  const router = useRouter();
  const { setSelectedHackathonId } = useSelectedEvent();
  const [items, setItems] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [isActive, setIsActive] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlatform, setIsPlatform] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { items: rows } = await listHackathons({
        search: search.trim() || undefined,
        is_active: isActive || undefined,
        show_deleted: showDeleted ? "true" : undefined,
      });

      const withCounts = await Promise.all(
        rows.map(async (row) => {
          try {
            const analytics: HackathonAnalytics = await getHackathonAnalytics(
              row.id,
            );
            return {
              ...row,
              teamCount: analytics.teams ?? 0,
              challengeCount: analytics.challenges ?? 0,
            };
          } catch {
            return { ...row, teamCount: null, challengeCount: null };
          }
        }),
      );

      setItems(withCounts);
    } catch (err) {
      if (err instanceof ApiRequestError && err.httpStatus === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load hackathons");
    } finally {
      setIsLoading(false);
    }
  }, [search, isActive, showDeleted, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      try {
        const { callAppApi } = await import("@/lib/client-api");
        type MePayload = {
          data: { is_root?: boolean; system_role?: string };
        };
        const result = await callAppApi<{
          ok: boolean;
          data: MePayload;
        }>("/api/haas/me");
        if (result.ok) {
          setIsPlatform(isPlatformChallengeOperator(result.data.data));
        }
      } catch {
        setIsPlatform(false);
      }
    })();
  }, []);

  function goChallenges(id: string) {
    setSelectedHackathonId(id);
    router.push(`/events/${id}/challenges`);
  }

  function goTeams(id: string) {
    setSelectedHackathonId(id);
    router.push(`/events/${id}/teams`);
  }

  function enterEvent(id: string) {
    setSelectedHackathonId(id);
    router.push(`/events/${id}`);
  }

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Events"
        title="Hackathons"
        description="Open Teams or Challenges per event. Counts come from event analytics."
        actions={
          <>
            <Button variant="secondary" onClick={() => void load()}>
              Refresh
            </Button>
            <Link href="/challenges">
              <Button variant="secondary">All challenges</Button>
            </Link>
            {isPlatform ? (
              <Link href="/hackathons/new">
                <Button>Create event</Button>
              </Link>
            ) : null}
          </>
        }
      />

      <StickyToolbar layout="grid">
        <TextField
          label="Search"
          name="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name…"
        />
        <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
          <span className="font-medium text-[var(--text)]">Active</span>
          <select
            className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text)]"
            value={isActive}
            onChange={(e) => setIsActive(e.target.value)}
          >
            <option value="">Any</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm text-[var(--text)]">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
          />
          Show archived
        </label>
      </StickyToolbar>

      {error ? (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}

      <DataTable
        isLoading={isLoading}
        rows={items}
        rowKey={(row) => row.id}
        emptyMessage="No hackathons returned for your role."
        columns={[
          {
            key: "name",
            header: "Event",
            render: (row) => (
              <div>
                <div className="font-medium">
                  {row.display_name || row.name}
                </div>
                <div className="font-mono text-xs text-[var(--text-muted)]">
                  {row.id}
                </div>
              </div>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (row) => (
              <div className="flex flex-wrap gap-1">
                {row.is_deleted ? (
                  <Badge tone="danger">Archived</Badge>
                ) : row.is_active ? (
                  <Badge tone="success">Active</Badge>
                ) : (
                  <Badge>Inactive</Badge>
                )}
                {row.is_infinite ? <Badge tone="success">Infinite</Badge> : null}
              </div>
            ),
          },
          {
            key: "dates",
            header: "Schedule",
            render: (row) =>
              row.is_infinite ? (
                <span className="text-[var(--text-muted)]">Infinite (no end)</span>
              ) : (
                <span className="text-xs text-[var(--text-muted)]">
                  {formatDate(row.start_datetime)}
                  <br />
                  {formatDate(row.end_datetime)}
                </span>
              ),
          },
          {
            key: "actions",
            header: "Quick open",
            className: "text-right",
            render: (row) => (
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => goTeams(row.id)}
                >
                  Teams
                  {row.teamCount != null ? ` (${row.teamCount})` : ""}
                </Button>
                <Button size="sm" onClick={() => goChallenges(row.id)}>
                  Challenges
                  {row.challengeCount != null
                    ? ` (${row.challengeCount})`
                    : ""}
                </Button>
                <Link href={`/hackathons/${row.id}`}>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => enterEvent(row.id)}
                >
                  Enter
                </Button>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
