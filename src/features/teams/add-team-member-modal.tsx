"use client";

import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { InlineLoader } from "@/components/ui/loader";
import {
  addTeamMember,
  removeTeamMember,
} from "@/features/teams/team-api";
import {
  eventUserLabel,
  listEventUsers,
  type EventUser,
  type EventUserTeam,
} from "@/features/users/users-api";

export const MAX_TEAM_MEMBERS = 5;

type Props = {
  open: boolean;
  hackathonId: string;
  teamId: string;
  teamName: string;
  currentMemberUserIds: string[];
  onClose: () => void;
  onSaved: () => void;
};

function otherTeamMemberships(
  user: EventUser,
  targetTeamId: string,
): EventUserTeam[] {
  return (user.teams ?? []).filter((team) => team.id && team.id !== targetTeamId);
}

export function AddTeamMemberModal({
  open,
  hackathonId,
  teamId,
  teamName,
  currentMemberUserIds,
  onClose,
  onSaved,
}: Props) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [users, setUsers] = useState<EventUser[]>([]);
  const [selected, setSelected] = useState<EventUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setDebouncedSearch("");
    setSelected(null);
    setError(null);
  }, [open, teamId]);

  const loadUsers = useCallback(async () => {
    if (!open || !hackathonId) return;
    setIsLoading(true);
    setError(null);
    try {
      setUsers(
        await listEventUsers(hackathonId, {
          search: debouncedSearch || undefined,
          limit: "100",
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, hackathonId, open]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const memberIdSet = new Set(currentMemberUserIds);
  const availableUsers = users.filter((user) => !memberIdSet.has(user.id));
  const transferTeams = selected ? otherTeamMemberships(selected, teamId) : [];

  async function onConfirmAdd() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      for (const membership of transferTeams) {
        if (!membership.membership_id) continue;
        await removeTeamMember(
          hackathonId,
          membership.id,
          membership.membership_id,
        );
      }
      await addTeamMember(hackathonId, teamId, {
        user: selected.id,
        is_approved: true,
        is_captain: false,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      panelClassName="max-w-lg"
      zIndexClass="z-[60]"
      ariaLabel="Add team member"
    >
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-lg font-bold text-[var(--text)]">Add team member</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {teamName} · up to {MAX_TEAM_MEMBERS} members
          </p>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto px-5 py-4">
          <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text)]">Search users</span>
            <input
              className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, username…"
            />
          </label>

          {error ? <Alert variant="error">{error}</Alert> : null}

          {transferTeams.length > 0 && selected ? (
            <div className="rounded-[var(--radius-sm)] border border-[var(--warning)]/40 bg-[var(--warning-muted)] px-3 py-2 text-sm text-[var(--warning)]">
              <strong>{eventUserLabel(selected)}</strong> is currently on{" "}
              {transferTeams.map((t) => t.name || t.team_code || "another team").join(", ")}.
              Adding them to {teamName} will remove them from their previous team
              (membership deactivated) before joining this one.
            </div>
          ) : null}

          <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)]">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <InlineLoader label="Loading users…" />
              </div>
            ) : availableUsers.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                {users.length === 0
                  ? "No users found for this event."
                  : "All matching users are already on this team."}
              </p>
            ) : (
              <ul className="max-h-64 divide-y divide-[var(--border)] overflow-y-auto">
                {availableUsers.map((user) => {
                  const isSelected = selected?.id === user.id;
                  const onOtherTeam = otherTeamMemberships(user, teamId);
                  return (
                    <li key={user.id}>
                      <button
                        type="button"
                        className={`flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition ${
                          isSelected
                            ? "bg-[var(--accent-muted)]"
                            : "hover:bg-[var(--surface-hover)]"
                        }`}
                        onClick={() => setSelected(user)}
                      >
                        <span className="text-sm font-semibold text-[var(--text)]">
                          {eventUserLabel(user)}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {user.email || user.username}
                        </span>
                        {onOtherTeam.length > 0 ? (
                          <span className="mt-1 text-[0.65rem] font-medium text-[var(--warning)]">
                            On team:{" "}
                            {onOtherTeam
                              .map((t) => t.name || t.team_code || t.id)
                              .join(", ")}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            disabled={!selected || busy || isLoading}
            onClick={() => void onConfirmAdd()}
          >
            {busy ? "Adding…" : transferTeams.length > 0 ? "Transfer & add" : "Add member"}
          </Button>
        </div>
    </ModalShell>
  );
}
