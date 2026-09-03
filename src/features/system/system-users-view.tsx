"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { ModalShell } from "@/components/ui/modal-shell";
import { ListPageStat, ListPageStats } from "@/components/ui/list-page-stats";
import { FilterSelect, StickyToolbar } from "@/components/ui/sticky-toolbar";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { StaffUserCreateForm } from "@/components/ui/staff-user-create-form";
import { usePlatformDialog } from "@/components/ui/platform-dialog-provider";
import {
  applySectionSearch,
  useSectionSearch,
  userRowSearchParts,
} from "@/features/search/section-search";
import {
  blockSystemUser,
  listSystemUsers,
  unblockSystemUser,
  type SystemUser,
} from "@/features/system/system-api";
import { staffCreatorLabel } from "@/lib/user-creator";
import { ApiRequestError } from "@/lib/client-api";
import { userLabel } from "@/lib/assigned-events";

type BlockFilter = "all" | "blocked" | "not_blocked";
type StaffFilter = "all" | "staff" | "non_staff";

export function SystemUsersView() {
  const router = useRouter();
  const { prompt } = usePlatformDialog();
  const [allRows, setAllRows] = useState<SystemUser[]>([]);
  const { search, setSearch, debouncedSearch, focusId, clearDeepSearch } =
    useSectionSearch();
  const [blockFilter, setBlockFilter] = useState<BlockFilter>("all");
  const [organizationFilter, setOrganizationFilter] = useState("");
  const [staffFilter, setStaffFilter] = useState<StaffFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [shownCount, setShownCount] = useState(0);
  const onPaginationInfo = useCallback((info: { shown: number }) => {
    setShownCount(info.shown);
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setAllRows(
        await listSystemUsers({
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
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, [blockFilter, debouncedSearch, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onBlock(user: SystemUser) {
    const reason = await prompt({
      title: "Block user",
      message: `Provide a global block reason for ${user.username || user.email || user.id}.`,
      label: "Block reason",
      defaultValue: "Blocked in HAS",
      confirmLabel: "Block",
    });
    if (reason == null) return;
    setBusyId(user.id);
    try {
      await blockSystemUser(user.id, reason);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Block failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onUnblock(user: SystemUser) {
    setBusyId(user.id);
    try {
      await unblockSystemUser(user.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unblock failed");
    } finally {
      setBusyId(null);
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
    <div className="space-y-3">
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

        <div className="flex shrink-0 items-end gap-2 pb-0.5">
          {debouncedSearch || focusId ? (
            <Button size="sm" variant="secondary" onClick={clearDeepSearch}>
              Clear search
            </Button>
          ) : null}
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            Create user
          </Button>
        </div>
      </StickyToolbar>

      {error ? (
        <Alert variant="error">{error}</Alert>
      ) : null}

      <DataTable
        isLoading={isLoading}
        rows={rows}
        rowKey={(r) => r.id}
        onPaginationInfo={onPaginationInfo}
        emptyMessage="No users."
        columns={[
          {
            key: "user",
            header: "User",
            render: (row) => (
              <div className="flex items-center gap-3">
                <Avatar src={row.media_url} name={userLabel(row)} size="sm" />
                <div>
                  <div className="font-medium text-[var(--text)]">
                    {userLabel(row)}
                  </div>
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
            key: "type",
            header: "Type",
            render: (row) => row.user_type || "—",
          },
          {
            key: "created_by",
            header: "Created by",
            render: (row) => staffCreatorLabel(row) ?? "—",
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
              <RowActionsMenu
                label={`Actions for ${row.email || row.username || row.id}`}
                items={[
                  row.is_block
                    ? {
                        id: "unblock",
                        label: "Unblock",
                        disabled: busyId === row.id,
                        onClick: () => void onUnblock(row),
                      }
                    : {
                        id: "block",
                        label: "Block",
                        disabled: busyId === row.id,
                        onClick: () => void onBlock(row),
                      },
                ]}
              />
            ),
          },
        ]}
      />

      <ModalShell
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        ariaLabel="Create user"
      >
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-lg font-bold text-[var(--text)]">Create user</h2>
        </div>
        <div className="px-5 py-4">
          <StaffUserCreateForm
            onCreated={() => {
              setCreateOpen(false);
              void load();
            }}
          />
        </div>
      </ModalShell>
    </div>
  );
}
