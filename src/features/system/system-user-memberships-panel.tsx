"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { FormCheckbox, FormInput } from "@/components/ui/form-fields";
import { ModalShell } from "@/components/ui/modal-shell";
import { usePlatformDialog } from "@/components/ui/platform-dialog-provider";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  createSystemUserMembership,
  listSystemUserMemberships,
  removeSystemUserMembership,
  updateSystemUserMembership,
  type UserTeamMembership,
} from "@/features/system/system-api";
import {
  listPlatformTeams,
  type EventTeam,
} from "@/features/teams/team-api";

type Props = {
  userId: string;
};

function formatDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString();
}

export function SystemUserMembershipsPanel({ userId }: Props) {
  const { confirm } = usePlatformDialog();
  const [rows, setRows] = useState<UserTeamMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editRow, setEditRow] = useState<UserTeamMembership | null>(null);
  const [editCaptain, setEditCaptain] = useState(false);
  const [editApproved, setEditApproved] = useState(true);
  const [editRejected, setEditRejected] = useState(false);
  const [editActive, setEditActive] = useState(true);
  const [editBusy, setEditBusy] = useState(false);

  const [assignOpen, setAssignOpen] = useState(false);
  const [teamSearch, setTeamSearch] = useState("");
  const [teams, setTeams] = useState<EventTeam[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<EventTeam | null>(null);
  const [assignBusy, setAssignBusy] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setRows(await listSystemUserMemberships(userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load memberships");
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!assignOpen) return;
    setTeamSearch("");
    setSelectedTeam(null);
    setTeamsLoading(true);
    void listPlatformTeams({ is_active: "true" })
      .then(setTeams)
      .catch(() => setTeams([]))
      .finally(() => setTeamsLoading(false));
  }, [assignOpen]);

  function openEdit(row: UserTeamMembership) {
    setEditRow(row);
    setEditCaptain(Boolean(row.is_captain));
    setEditApproved(row.is_approved !== false);
    setEditRejected(Boolean(row.is_rejected));
    setEditActive(row.is_active !== false);
    setError(null);
  }

  async function saveEdit() {
    if (!editRow) return;
    setEditBusy(true);
    setError(null);
    try {
      await updateSystemUserMembership(userId, editRow.id, {
        is_captain: editCaptain,
        is_approved: editApproved,
        is_rejected: editRejected,
        is_active: editActive,
      });
      setEditRow(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setEditBusy(false);
    }
  }

  async function onRemove(row: UserTeamMembership) {
    const label = row.team_detail?.name || row.team || "this team";
    const ok = await confirm({
      title: "Remove from team",
      message: `Deactivate membership on ${label}? The user can be re-added later.`,
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) return;
    setBusyId(row.id);
    setError(null);
    try {
      await removeSystemUserMembership(userId, row.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onReactivate(row: UserTeamMembership) {
    setBusyId(row.id);
    setError(null);
    try {
      await updateSystemUserMembership(userId, row.id, {
        is_active: true,
        is_rejected: false,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reactivate failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onAssign() {
    if (!selectedTeam) {
      setError("Select a team.");
      return;
    }
    setAssignBusy(true);
    setError(null);
    try {
      await createSystemUserMembership(userId, {
        team: selectedTeam.id,
        is_approved: true,
      });
      setAssignOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assign failed");
    } finally {
      setAssignBusy(false);
    }
  }

  const filteredTeams = teams.filter((t) => {
    const q = teamSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (t.name || "").toLowerCase().includes(q) ||
      (t.team_code || "").toLowerCase().includes(q)
    );
  });

  const activeCount = rows.filter((r) => r.is_active !== false).length;

  return (
    <section className="space-y-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
            Team memberships
          </h3>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {activeCount} active · {rows.length} total
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
          <Button size="sm" onClick={() => setAssignOpen(true)}>
            Assign to team
          </Button>
        </div>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {isLoading ? (
        <TableSkeleton columns={5} rows={4} />
      ) : (
        <DataTable
          rows={rows}
          rowKey={(r) => r.id}
          emptyMessage="No team memberships."
          columns={[
            {
              key: "team",
              header: "Team",
              wrap: true,
              render: (r) => (
                <div>
                  <Link
                    href={`/teams?focus=${r.team_detail?.id || r.team}`}
                    className="font-medium text-[var(--accent)] hover:underline"
                  >
                    {r.team_detail?.name || r.team || "—"}
                  </Link>
                  <p className="text-xs text-[var(--text-muted)]">
                    {r.team_detail?.team_code || ""}
                    {r.referer_detail?.name
                      ? ` · ${r.referer_detail.name}`
                      : ""}
                  </p>
                </div>
              ),
            },
            {
              key: "playing",
              header: "Playing in",
              wrap: true,
              render: (r) => {
                const events = r.team_detail?.playing_in || [];
                if (!events.length) return "—";
                return events
                  .map((e) => e.display_name || e.name || e.id)
                  .join(", ");
              },
            },
            {
              key: "flags",
              header: "Status",
              render: (r) => (
                <span className="flex flex-wrap gap-1">
                  {r.is_active === false ? (
                    <Badge tone="danger">Inactive</Badge>
                  ) : (
                    <Badge tone="success">Active</Badge>
                  )}
                  {r.is_captain ? <Badge tone="warning">Captain</Badge> : null}
                  {r.is_rejected ? (
                    <Badge tone="danger">Rejected</Badge>
                  ) : r.is_approved === false ? (
                    <Badge tone="warning">Pending</Badge>
                  ) : (
                    <Badge tone="success">Approved</Badge>
                  )}
                </span>
              ),
            },
            {
              key: "joined",
              header: "Joined",
              render: (r) => formatDate(r.joined_at),
            },
            {
              key: "actions",
              header: "",
              sticky: "right",
              render: (r) => (
                <RowActionsMenu
                  items={[
                    {
                      id: "edit",
                      label: "Edit membership",
                      onClick: () => openEdit(r),
                      disabled: busyId === r.id,
                    },
                    {
                      id: "remove",
                      label: "Remove from team",
                      onClick: () => void onRemove(r),
                      destructive: true,
                      hidden: r.is_active === false,
                      disabled: busyId === r.id,
                    },
                    {
                      id: "reactivate",
                      label: "Reactivate",
                      onClick: () => void onReactivate(r),
                      hidden: r.is_active !== false,
                      disabled: busyId === r.id,
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      )}

      <ModalShell
        open={Boolean(editRow)}
        onClose={() => !editBusy && setEditRow(null)}
        ariaLabel="Edit membership"
      >
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Edit membership
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {editRow?.team_detail?.name || editRow?.team || ""}
          </p>
        </div>
        <div className="space-y-3 px-5 py-4">
          <FormCheckbox
            label="Captain"
            checked={editCaptain}
            onChange={setEditCaptain}
            disabled={editBusy}
          />
          <FormCheckbox
            label="Approved"
            checked={editApproved}
            onChange={(v) => {
              setEditApproved(v);
              if (v) setEditRejected(false);
            }}
            disabled={editBusy}
          />
          <FormCheckbox
            label="Rejected"
            checked={editRejected}
            onChange={(v) => {
              setEditRejected(v);
              if (v) setEditApproved(false);
            }}
            disabled={editBusy}
          />
          <FormCheckbox
            label="Active"
            checked={editActive}
            onChange={setEditActive}
            disabled={editBusy}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              disabled={editBusy}
              onClick={() => setEditRow(null)}
            >
              Cancel
            </Button>
            <Button disabled={editBusy} onClick={() => void saveEdit()}>
              {editBusy ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        open={assignOpen}
        onClose={() => !assignBusy && setAssignOpen(false)}
        ariaLabel="Assign to team"
      >
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Assign to team
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Add this user to a platform team.
          </p>
        </div>
        <div className="space-y-3 px-5 py-4">
          <FormInput
            label="Search teams"
            value={teamSearch}
            onChange={setTeamSearch}
            placeholder="Name or code"
            disabled={assignBusy}
          />
          {teamsLoading ? (
            <TableSkeleton columns={1} rows={4} />
          ) : (
            <ul className="max-h-64 divide-y divide-[var(--border)] overflow-y-auto rounded-[var(--radius)] border border-[var(--border)]">
              {filteredTeams.length === 0 ? (
                <li className="px-3 py-4 text-sm text-[var(--text-muted)]">
                  No teams found.
                </li>
              ) : (
                filteredTeams.slice(0, 50).map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--surface-hover)] ${
                        selectedTeam?.id === t.id
                          ? "bg-[var(--accent-muted)]"
                          : ""
                      }`}
                      onClick={() => setSelectedTeam(t)}
                      disabled={assignBusy}
                    >
                      <span>
                        <span className="font-medium text-[var(--text)]">
                          {t.name}
                        </span>
                        <span className="ml-2 text-xs text-[var(--text-muted)]">
                          {t.team_code}
                        </span>
                      </span>
                      {selectedTeam?.id === t.id ? (
                        <Badge tone="success">Selected</Badge>
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              disabled={assignBusy}
              onClick={() => setAssignOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={assignBusy || !selectedTeam}
              onClick={() => void onAssign()}
            >
              {assignBusy ? "Assigning…" : "Assign"}
            </Button>
          </div>
        </div>
      </ModalShell>
    </section>
  );
}
