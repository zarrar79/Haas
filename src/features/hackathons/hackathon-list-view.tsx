"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { PageHeader } from "@/components/ui/page-header";
import { ListPageStat, ListPageStats } from "@/components/ui/list-page-stats";
import { FilterSelect, FilterTextField, StickyToolbar } from "@/components/ui/sticky-toolbar";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import {
  getHackathonAnalytics,
  listHackathons,
  restoreHackathon,
  updateHackathon,
  type HackathonAnalytics,
} from "@/features/hackathons/hackathon-api";
import { redirectIfUnauthorized } from "@/lib/client-api";
import { formatDate } from "@/lib/format";
import { hackathonLabel } from "@/lib/display-name";
import type { Hackathon } from "@/types/hackathon";

type Row = Hackathon & {
  teamCount?: number | null;
  challengeCount?: number | null;
};

export function HackathonListView() {
  const router = useRouter();
  const { isPlatformOperator } = useHaasAccess();
  const { setSelectedHackathonId } = useSelectedEvent();
  const [items, setItems] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [isActive, setIsActive] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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
      if (redirectIfUnauthorized(err, router)) return;
      setError(err instanceof Error ? err.message : "Failed to load hackathons");
    } finally {
      setIsLoading(false);
    }
  }, [search, isActive, showDeleted, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setActive(row: Row, active: boolean) {
    setBusyId(row.id);
    setError(null);
    try {
      if (row.is_deleted && active) {
        await restoreHackathon(row.id);
      } else {
        await updateHackathon(row.id, { is_active: active });
      }
      await load();
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

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
        actions={
          <>
            <Link href="/challenges">
              <Button variant="secondary">All challenges</Button>
            </Link>
            {isPlatformOperator ? (
              <Link href="/hackathons/new">
                <Button>Create event</Button>
              </Link>
            ) : null}
          </>
        }
      />

      <StickyToolbar
        layout="grid"
        footer={
          <ListPageStats>
            <ListPageStat label="Events" value={items.length} />
          </ListPageStats>
        }
      >
        <FilterTextField
          label="Search"
          name="search"
          value={search}
          onChange={setSearch}
          placeholder="Name…"
        />
        <FilterSelect label="Active" value={isActive} onChange={setIsActive}>
          <option value="">Any</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </FilterSelect>
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
                  {hackathonLabel(row)}
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
            header: "",
            className: "text-right w-12",
            render: (row) => (
              <RowActionsMenu
                label={`Actions for ${hackathonLabel(row, "event")}`}
                items={[
                  {
                    id: "teams",
                    label: `Teams${row.teamCount != null ? ` (${row.teamCount})` : ""}`,
                    onClick: () => goTeams(row.id),
                  },
                  {
                    id: "challenges",
                    label: `Challenges${row.challengeCount != null ? ` (${row.challengeCount})` : ""}`,
                    onClick: () => goChallenges(row.id),
                  },
                  {
                    id: "view",
                    label: "View",
                    href: `/events/${row.id}/hackathon`,
                  },
                  {
                    id: "enter",
                    label: "Enter workspace",
                    onClick: () => enterEvent(row.id),
                  },
                  row.is_active && !row.is_deleted
                    ? {
                        id: "deactivate",
                        label: "Deactivate",
                        disabled: busyId === row.id,
                        onClick: () => void setActive(row, false),
                      }
                    : {
                        id: "activate",
                        label: row.is_deleted ? "Restore & activate" : "Activate",
                        disabled: busyId === row.id,
                        onClick: () => void setActive(row, true),
                      },
                ]}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
