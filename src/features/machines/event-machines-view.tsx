"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  BulkActionBar,
  runBulkSequential,
} from "@/components/ui/bulk-action-bar";
import { Button } from "@/components/ui/button";
import { CopyableText } from "@/components/ui/copyable-text";
import { DataTable } from "@/components/ui/data-table";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { PageHeader } from "@/components/ui/page-header";
import {
  ListPageStat,
  ListPageStats,
  ListPageStatsDot,
} from "@/components/ui/list-page-stats";
import { FilterSelect, StickyToolbar } from "@/components/ui/sticky-toolbar";
import { usePlatformDialog } from "@/components/ui/platform-dialog-provider";
import { listChallengeAdmin } from "@/features/challenges/challenge-admin-api";
import type { ChallengeSummary } from "@/features/challenges/challenge-api";
import { HackathonPicker } from "@/features/events/hackathon-picker";
import {
  applySectionSearch,
  machineRowSearchParts,
  useSectionSearch,
} from "@/features/search/section-search";
import { BulkSpawnModal } from "@/features/machines/bulk-spawn-modal";
import { MachineFormModal } from "@/features/machines/machine-form-modal";
import {
  blockMachine,
  bulkStopMachines,
  deleteMachine,
  listMachines,
  stopMachine,
  type MachineRow,
} from "@/features/ops/ops-api";
import { listTeams, type EventTeam } from "@/features/teams/team-api";
import { ApiRequestError } from "@/lib/client-api";

type Props = { hackathonId: string };

type ActiveFilter = "all" | "active" | "inactive";
type BlockedFilter = "all" | "blocked" | "not_blocked";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function spawnedByLabel(row: MachineRow) {
  const d = row.spawned_by;
  if (!d) return "—";
  const name = [d.name].filter(Boolean).join(" ").trim();
  return name || d.username || d.email || "—";
}

export function EventMachinesView({ hackathonId }: Props) {
  const { confirm } = usePlatformDialog();
  const router = useRouter();
  const [activeId, setActiveId] = useState(hackathonId);
  const [rows, setRows] = useState<MachineRow[]>([]);
  const [teams, setTeams] = useState<EventTeam[]>([]);
  const [challenges, setChallenges] = useState<ChallengeSummary[]>([]);
  const { search, setSearch, debouncedSearch, focusId, clearDeepSearch } =
    useSectionSearch();
  const [teamFilter, setTeamFilter] = useState("");
  const [challengeFilter, setChallengeFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [blockedFilter, setBlockedFilter] = useState<BlockedFilter>("all");
  const [showDeleted, setShowDeleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [spawnModalOpen, setSpawnModalOpen] = useState(false);
  const [bulkSpawnOpen, setBulkSpawnOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<MachineRow | null>(null);

  useEffect(() => {
    setActiveId(hackathonId);
  }, [hackathonId]);

  const load = useCallback(async () => {
    if (!activeId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [machineList, teamList, challengeList] = await Promise.all([
        listMachines(activeId, {
          search: debouncedSearch || undefined,
          team: teamFilter || undefined,
          challenge: challengeFilter || undefined,
          is_active:
            activeFilter === "active"
              ? "true"
              : activeFilter === "inactive"
                ? "false"
                : undefined,
          blocked:
            blockedFilter === "blocked"
              ? "true"
              : blockedFilter === "not_blocked"
                ? "false"
                : undefined,
          show_deleted: showDeleted ? "true" : "false",
        }),
        listTeams(activeId, { limit: "200" }),
        listChallengeAdmin(activeId),
      ]);
      setRows(machineList);
      setTeams(teamList);
      setChallenges(challengeList);
      setSelectedKeys(new Set());
    } catch (err) {
      if (err instanceof ApiRequestError && err.httpStatus === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load machines");
    } finally {
      setIsLoading(false);
    }
  }, [
    activeFilter,
    activeId,
    blockedFilter,
    challengeFilter,
    debouncedSearch,
    router,
    showDeleted,
    teamFilter,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(
    () =>
      applySectionSearch(
        rows,
        debouncedSearch,
        focusId,
        machineRowSearchParts,
      ),
    [rows, debouncedSearch, focusId],
  );

  const stats = useMemo(() => {
    const active = filteredRows.filter((r) => r.is_active && !r.is_deleted);
    return {
      total: filteredRows.length,
      active: active.length,
      blocked: filteredRows.filter((r) => r.blocked).length,
    };
  }, [filteredRows]);

  async function onStop(row: MachineRow) {
    setBusyId(row.id);
    try {
      await stopMachine(activeId, row.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stop failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onBlock(row: MachineRow) {
    setBusyId(row.id);
    try {
      await blockMachine(activeId, row.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Block failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(row: MachineRow) {
    const ok = await confirm({
      title: "Delete machine",
      message: "Soft-delete this machine record?",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    setBusyId(row.id);
    try {
      await deleteMachine(activeId, row.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onBulkStopAll() {
    const ok = await confirm({
      title: "Stop all machines",
      message: "Stop all active machines for this event?",
      confirmLabel: "Stop all",
      destructive: true,
    });
    if (!ok) return;
    setBulkBusy(true);
    try {
      await bulkStopMachines(activeId, { all_active: true });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk stop failed");
    } finally {
      setBulkBusy(false);
    }
  }

  async function onBulkStopSelected() {
    const ids = [...selectedKeys];
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      await runBulkSequential(ids, async (id) => {
        await stopMachine(activeId, id);
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk stop failed");
    } finally {
      setBulkBusy(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const activeRows = filteredRows.filter((r) => r.is_active && !r.is_deleted);
    if (selectedKeys.size === activeRows.length && activeRows.length > 0) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(activeRows.map((r) => r.id)));
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Event workspace"
        title="Machines"
        actions={
          <>
            <Button variant="secondary" onClick={() => setBulkSpawnOpen(true)}>
              Bulk spawn
            </Button>
            <Button
              onClick={() => {
                setEditingRow(null);
                setSpawnModalOpen(true);
              }}
            >
              Spawn machine
            </Button>
          </>
        }
      />

      <StickyToolbar
        layout="stack"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <ListPageStats>
              <ListPageStat label="Total" value={stats.total} />
              <ListPageStatsDot />
              <ListPageStat label="Active" value={stats.active} tone="accent" />
              <ListPageStatsDot />
              <ListPageStat label="Blocked" value={stats.blocked} tone="warning" />
            </ListPageStats>
            <Button
              size="sm"
              variant="secondary"
              disabled={bulkBusy}
              onClick={() => void onBulkStopAll()}
            >
              Stop all active
            </Button>
          </div>
        }
      >
        <div className="flex flex-wrap items-end gap-3">
          <HackathonPicker
            value={activeId}
            onChange={setActiveId}
            section="machines"
          />
          <label className="flex min-w-[180px] flex-col gap-1 text-xs text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text)]">Search</span>
            <input
              className="rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]/40"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Team, challenge, IP, pod…"
            />
          </label>
          {(search.trim() || focusId) && (
            <div className="flex items-end pb-0.5">
              <Button
                size="sm"
                variant="secondary"
                onClick={clearDeepSearch}
              >
                Clear search
              </Button>
            </div>
          )}
          <FilterSelect
            label="Team"
            value={teamFilter}
            onChange={setTeamFilter}
          >
            <option value="">All teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Challenge"
            value={challengeFilter}
            onChange={setChallengeFilter}
          >
            <option value="">All challenges</option>
            {challenges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Active"
            value={activeFilter}
            onChange={(v) => setActiveFilter(v as ActiveFilter)}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </FilterSelect>
          <FilterSelect
            label="Blocked"
            value={blockedFilter}
            onChange={(v) => setBlockedFilter(v as BlockedFilter)}
          >
            <option value="all">All</option>
            <option value="blocked">Blocked</option>
            <option value="not_blocked">Not blocked</option>
          </FilterSelect>
          <label className="flex items-center gap-2 pb-2 text-sm text-[var(--text)]">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
            />
            Show deleted
          </label>
        </div>
      </StickyToolbar>

      {error ? (
        <div className="mb-3">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}

      <BulkActionBar
        selectedCount={selectedKeys.size}
        onClear={() => setSelectedKeys(new Set())}
        actions={[
          {
            id: "stop-selected",
            label: bulkBusy ? "Stopping…" : "Stop selected",
            disabled: bulkBusy || selectedKeys.size === 0,
            onClick: () => void onBulkStopSelected(),
          },
        ]}
      />

      <DataTable
        rows={filteredRows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage={
          debouncedSearch || focusId
            ? "No machines match your search."
            : "No spawned machines for this event."
        }
        columns={[
          {
            key: "select",
            header: (
              <input
                type="checkbox"
                aria-label="Select all active machines"
                checked={
                  filteredRows.filter((r) => r.is_active && !r.is_deleted).length > 0 &&
                  selectedKeys.size ===
                    filteredRows.filter((r) => r.is_active && !r.is_deleted).length
                }
                onChange={toggleSelectAll}
              />
            ),
            render: (r) =>
              r.is_active && !r.is_deleted ? (
                <input
                  type="checkbox"
                  aria-label={`Select ${r.machine_name || r.id}`}
                  checked={selectedKeys.has(r.id)}
                  onChange={() => toggleSelect(r.id)}
                />
              ) : null,
          },
          {
            key: "team",
            header: "Team",
            render: (r) => r.team_name || r.team || "—",
          },
          {
            key: "challenge",
            header: "Challenge",
            render: (r) => r.challenge_name || r.challenge || "—",
          },
          {
            key: "ip",
            header: "IP / Pod",
            render: (r) => (
              <div className="space-y-0.5">
                <CopyableText
                  value={r.ip_address}
                  maxWidthClass="max-w-[140px]"
                />
                <span className="block font-mono text-[10px] text-[var(--text-subtle)]">
                  {r.pod_name || r.namespace || "—"}
                </span>
              </div>
            ),
          },
          {
            key: "machine",
            header: "Machine",
            render: (r) => (
              <span className="text-xs">
                {r.machine_name || "—"}
                {r.os_type ? (
                  <span className="ml-1 text-[var(--text-muted)]">
                    ({r.os_type})
                  </span>
                ) : null}
              </span>
            ),
          },
          {
            key: "spawned",
            header: "Spawned by",
            render: (r) => (
              <span className="text-xs text-[var(--text-muted)]">
                {spawnedByLabel(r)}
              </span>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (r) => (
              <div className="flex flex-wrap gap-1">
                {r.is_deleted ? (
                  <Badge tone="warning">Deleted</Badge>
                ) : r.is_active ? (
                  <Badge tone="success">Active</Badge>
                ) : (
                  <Badge>Stopped</Badge>
                )}
                {r.blocked ? <Badge tone="danger">Blocked</Badge> : null}
              </div>
            ),
          },
          {
            key: "expires",
            header: "Expires",
            render: (r) => (
              <span className="whitespace-nowrap text-xs text-[var(--text-muted)]">
                {formatDate(r.expires_at)}
              </span>
            ),
          },
          {
            key: "actions",
            header: "",
            className: "text-right w-12",
            render: (r) => (
              <RowActionsMenu
                label={`Actions for machine ${r.id}`}
                items={[
                  {
                    id: "stop",
                    label: "Stop",
                    disabled: busyId === r.id || !r.is_active || r.is_deleted,
                    onClick: () => void onStop(r),
                  },
                  {
                    id: "block",
                    label: "Block",
                    disabled: busyId === r.id || r.blocked || r.is_deleted,
                    onClick: () => void onBlock(r),
                  },
                  {
                    id: "edit",
                    label: "Edit",
                    disabled: busyId === r.id || r.is_deleted,
                    onClick: () => {
                      setEditingRow(r);
                      setSpawnModalOpen(true);
                    },
                  },
                  {
                    id: "delete",
                    label: "Delete",
                    disabled: busyId === r.id || r.is_deleted,
                    destructive: true,
                    onClick: () => void onDelete(r),
                  },
                ]}
              />
            ),
          },
        ]}
      />

      <MachineFormModal
        open={spawnModalOpen}
        mode={editingRow ? "edit" : "create"}
        hackathonId={activeId}
        row={editingRow}
        teams={teams}
        challenges={challenges}
        onClose={() => {
          setSpawnModalOpen(false);
          setEditingRow(null);
        }}
        onSaved={() => void load()}
      />

      <BulkSpawnModal
        open={bulkSpawnOpen}
        hackathonId={activeId}
        teams={teams}
        challenges={challenges}
        onClose={() => setBulkSpawnOpen(false)}
        onSaved={() => void load()}
      />
    </div>
  );
}
