"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { ListPageStat, ListPageStats } from "@/components/ui/list-page-stats";
import { FilterSelect, StickyToolbar } from "@/components/ui/sticky-toolbar";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import { listHackathons } from "@/features/hackathons/hackathon-api";
import {
  applySectionSearch,
  useSectionSearch,
  userRowSearchParts,
} from "@/features/search/section-search";
import {
  eventUserDetailPath,
  eventUserLabel,
  listEventUsers,
  type EventUser,
} from "@/features/users/users-api";
import { AssignUserToTeamModal } from "@/features/teams/assign-user-to-team-modal";
import { EventUserRowActions } from "@/features/users/event-user-row-actions";
import { UserFormModal } from "@/features/users/user-form-modal";
import { useEventUserActions } from "@/features/users/use-event-user-actions";
import { ApiRequestError } from "@/lib/client-api";
import type { Hackathon } from "@/types/hackathon";

type Props = { hackathonId: string };

type BlockFilter = "all" | "blocked" | "not_blocked";
type StaffFilter = "all" | "staff" | "non_staff";

export function EventMembersView({ hackathonId }: Props) {
  const router = useRouter();
  const { canMutateEvent } = useHaasAccess();
  const { setSelectedHackathonId } = useSelectedEvent();
  const [activeId, setActiveId] = useState(hackathonId);
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [allRows, setAllRows] = useState<EventUser[]>([]);
  const { search, setSearch, debouncedSearch, focusId, clearDeepSearch } =
    useSectionSearch();
  const [blockFilter, setBlockFilter] = useState<BlockFilter>("all");
  const [organizationFilter, setOrganizationFilter] = useState("");
  const [staffFilter, setStaffFilter] = useState<StaffFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<EventUser | null>(null);
  const [assignTeamUser, setAssignTeamUser] = useState<EventUser | null>(null);
  const [shownCount, setShownCount] = useState(0);
  const onPaginationInfo = useCallback((info: { shown: number }) => {
    setShownCount(info.shown);
  }, []);

  const canWrite = canMutateEvent(activeId);

  useEffect(() => {
    setActiveId(hackathonId);
  }, [hackathonId]);

  useEffect(() => {
    void (async () => {
      try {
        const { items } = await listHackathons({ show_deleted: "false" });
        setHackathons(items);
      } catch (err) {
        if (err instanceof ApiRequestError && err.httpStatus === 401) {
          router.replace("/login");
        }
      }
    })();
  }, [router]);

  function onHackathonChange(nextId: string) {
    setActiveId(nextId);
    setSelectedHackathonId(nextId || null);
    if (nextId) {
      router.push(`/events/${nextId}/members`);
    }
  }

  const load = useCallback(async () => {
    if (!activeId) return;
    setIsLoading(true);
    setError(null);
    try {
      setAllRows(
        await listEventUsers(activeId, {
          search: debouncedSearch || undefined,
          is_block:
            blockFilter === "blocked"
              ? "true"
              : blockFilter === "not_blocked"
                ? "false"
                : undefined,
        }),
      );
    } catch (err) {
      if (err instanceof ApiRequestError && err.httpStatus === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setIsLoading(false);
    }
  }, [activeId, debouncedSearch, blockFilter, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const { busyId, blockUser, unblockUser, activateUser, deactivateUser } =
    useEventUserActions({
    hackathonId: activeId,
    onChanged: load,
  });

  async function handleBlock(row: EventUser) {
    try {
      await blockUser(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to block");
    }
  }

  async function handleUnblock(row: EventUser) {
    try {
      await unblockUser(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unblock");
    }
  }

  async function handleActivate(row: EventUser) {
    try {
      await activateUser(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate");
    }
  }

  async function handleDeactivate(row: EventUser) {
    try {
      await deactivateUser(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate");
    }
  }

  const rows = useMemo(() => {
    let filtered = applySectionSearch(
      allRows,
      debouncedSearch,
      focusId,
      userRowSearchParts,
    );
    const orgQuery = organizationFilter.trim().toLowerCase();
    if (orgQuery) {
      filtered = filtered.filter((row) =>
        (row.organization_name || row.organization_info || "")
          .toString()
          .toLowerCase()
          .includes(orgQuery),
      );
    }
    if (staffFilter === "staff") {
      filtered = filtered.filter((row) => row.is_staff === true);
    } else if (staffFilter === "non_staff") {
      filtered = filtered.filter((row) => row.is_staff !== true);
    }
    return filtered;
  }, [allRows, organizationFilter, staffFilter, debouncedSearch, focusId]);

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Event workspace"
        title="Members"
        actions={
          canWrite ? (
            <Button
              size="sm"
              onClick={() => {
                setEditingRow(null);
                setModalOpen(true);
              }}
            >
              Create user
            </Button>
          ) : undefined
        }
      />

      <StickyToolbar
        footer={
          <ListPageStats>
            <ListPageStat label="Showing" value={shownCount} />
            <ListPageStat label="Loaded" value={allRows.length} />
            {debouncedSearch || focusId ? (
              <>
                <span className="text-[var(--text-muted)]">·</span>
                <span className="text-[var(--accent)]">
                  {focusId ? "Deep search result" : `Matching “${debouncedSearch}”`}
                </span>
              </>
            ) : null}
          </ListPageStats>
        }
      >
        <FilterSelect
          label="Hackathon"
          value={activeId}
          onChange={onHackathonChange}
          className="min-w-[180px]"
        >
          {hackathons.length === 0 ? (
            <option value="">No events</option>
          ) : (
            hackathons.map((h) => (
              <option key={h.id} value={h.id}>
                {h.display_name || h.name}
              </option>
            ))
          )}
        </FilterSelect>

        <label className="flex min-w-[160px] flex-1 flex-col gap-1 text-xs text-[var(--text-muted)]">
          <span className="font-medium text-[var(--text)]">Search</span>
          <input
            name="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email, username…"
            className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[var(--focus-ring)]"
          />
        </label>

        <FilterSelect
          label="Blocked"
          value={blockFilter}
          onChange={(v) => setBlockFilter(v as BlockFilter)}
        >
          <option value="all">All</option>
          <option value="blocked">Blocked</option>
          <option value="not_blocked">Not blocked</option>
        </FilterSelect>

        <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs text-[var(--text-muted)]">
          <span className="font-medium text-[var(--text)]">Organization</span>
          <input
            name="organization"
            value={organizationFilter}
            onChange={(e) => setOrganizationFilter(e.target.value)}
            placeholder="Filter…"
            className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[var(--focus-ring)]"
          />
        </label>

        <FilterSelect
          label="Staff"
          value={staffFilter}
          onChange={(v) => setStaffFilter(v as StaffFilter)}
        >
          <option value="all">All</option>
          <option value="staff">Staff only</option>
          <option value="non_staff">Non-staff</option>
        </FilterSelect>

        {debouncedSearch || focusId ? (
          <div className="flex shrink-0 items-end pb-0.5">
            <Button size="sm" variant="secondary" onClick={clearDeepSearch}>
              Clear search
            </Button>
          </div>
        ) : null}
      </StickyToolbar>

      {error ? (
        <div className="mb-3">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}

      <DataTable
        isLoading={isLoading}
        rows={rows}
        rowKey={(r) => r.id}
        onPaginationInfo={onPaginationInfo}
        emptyMessage="No members for this event."
        columns={[
          {
            key: "user",
            header: "User",
            render: (row) => (
              <div className="flex items-center gap-3">
                <Avatar
                  src={row.media_url}
                  name={eventUserLabel(row)}
                  size="sm"
                />
                <div>
                  <Link
                    href={eventUserDetailPath(activeId, row.id)}
                    className="font-medium text-[var(--accent)] hover:underline"
                  >
                    {eventUserLabel(row)}
                  </Link>
                  <div className="text-xs text-[var(--text-muted)]">
                    {row.email || row.username}
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: "organization",
            header: "Organization",
            render: (row) => row.organization_name || "—",
          },
          {
            key: "blocked",
            header: "Blocked",
            render: (row) =>
              row.is_block ? (
                <Badge tone="danger">Yes</Badge>
              ) : (
                <Badge tone="success">No</Badge>
              ),
          },
          {
            key: "staff",
            header: "Staff",
            render: (row) =>
              row.is_staff ? (
                <Badge tone="success">Yes</Badge>
              ) : (
                <Badge>No</Badge>
              ),
          },
          {
            key: "teams",
            header: "Teams",
            render: (row) => {
              if (row.teams?.length) {
                return row.teams.map((t) => t.name || t.id).join(", ");
              }
              if (canWrite) {
                return (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyId === row.id}
                    onClick={() => setAssignTeamUser(row)}
                  >
                    Assign to team
                  </Button>
                );
              }
              return "—";
            },
          },
          {
            key: "status",
            header: "Status",
            render: (row) =>
              row.is_active === false ? (
                <Badge>Inactive</Badge>
              ) : (
                <Badge tone="success">Active</Badge>
              ),
          },
          {
            key: "actions",
            header: "",
            className: "text-right w-12",
            render: (row) => (
              <EventUserRowActions
                hackathonId={activeId}
                user={row}
                canWrite={canWrite}
                handlers={{
                  busyId,
                  onEdit: (user) => {
                    setEditingRow(user);
                    setModalOpen(true);
                  },
                  onBlock: (user) => void handleBlock(user),
                  onUnblock: (user) => void handleUnblock(user),
                  onActivate: (user) => void handleActivate(user),
                  onDeactivate: (user) => void handleDeactivate(user),
                }}
              />
            ),
          },
        ]}
      />

      <UserFormModal
        open={modalOpen}
        mode={editingRow ? "edit" : "create"}
        hackathonId={activeId}
        userId={editingRow?.id}
        row={editingRow}
        onClose={() => {
          setModalOpen(false);
          setEditingRow(null);
        }}
        onSaved={() => void load()}
      />

      <AssignUserToTeamModal
        open={Boolean(assignTeamUser)}
        hackathonId={activeId}
        user={assignTeamUser}
        onClose={() => setAssignTeamUser(null)}
        onSaved={() => void load()}
      />
    </div>
  );
}
