"use client";

import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { InlineLoader } from "@/components/ui/loader";
import {
  MAX_TEAM_MEMBERS,
} from "@/features/teams/add-team-member-modal";
import {
  addTeamMember,
  listTeams,
  removeTeamMember,
  type EventTeam,
} from "@/features/teams/team-api";
import {
  eventUserLabel,
  type EventUser,
  type EventUserTeam,
} from "@/features/users/users-api";

type Props = {
  open: boolean;
  hackathonId: string;
  user: EventUser | null;
  onClose: () => void;
  onSaved: () => void;
};

function validateUserForTeam(user: EventUser): string | null {
  if (user.is_block) return "This user is blocked and cannot join a team.";
  if (user.is_active === false) return "This user is inactive. Activate them first.";
  return null;
}

function validateTeamForAdd(team: EventTeam): string | null {
  if (team.is_blocked) return "This team is blocked.";
  if (team.is_active === false) return "This team is inactive. Activate it first.";
  const count =
    typeof team.member_count === "number"
      ? team.member_count
      : team.members?.length ?? 0;
  if (count >= MAX_TEAM_MEMBERS) {
    return `Team is full (${MAX_TEAM_MEMBERS} members max).`;
  }
  return null;
}

export function AssignUserToTeamModal({
  open,
  hackathonId,
  user,
  onClose,
  onSaved,
}: Props) {
  const [search, setSearch] = useState("");
  const [teams, setTeams] = useState<EventTeam[]>([]);
  const [selected, setSelected] = useState<EventTeam | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setSelected(null);
    setError(null);
  }, [open, user?.id]);

  const loadTeams = useCallback(async () => {
    if (!open || !hackathonId) return;
    setIsLoading(true);
    setError(null);
    try {
      setTeams(await listTeams(hackathonId, { is_active: "true", limit: "100" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams");
      setTeams([]);
    } finally {
      setIsLoading(false);
    }
  }, [hackathonId, open]);

  useEffect(() => {
    void loadTeams();
  }, [loadTeams]);

  const userError = user ? validateUserForTeam(user) : null;
  const existingTeams = user?.teams ?? [];

  const filteredTeams = teams.filter((team) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const hay = [team.name, team.team_code, team.id].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  });

  const teamError = selected ? validateTeamForAdd(selected) : null;

  async function onConfirm() {
    if (!user || !selected) return;
    const userValidation = validateUserForTeam(user);
    if (userValidation) {
      setError(userValidation);
      return;
    }
    const teamValidation = validateTeamForAdd(selected);
    if (teamValidation) {
      setError(teamValidation);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      for (const membership of existingTeams) {
        if (!membership.membership_id || !membership.id) continue;
        await removeTeamMember(
          hackathonId,
          membership.id,
          membership.membership_id,
        );
      }
      await addTeamMember(hackathonId, selected.id, {
        user: user.id,
        is_approved: true,
        is_captain: false,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign user to team");
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      panelClassName="max-w-lg"
      zIndexClass="z-[60]"
      ariaLabel="Assign to team"
    >
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-lg font-bold text-[var(--text)]">Assign to team</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {eventUserLabel(user)}
          </p>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto px-5 py-4">
          {userError ? <Alert variant="error">{userError}</Alert> : null}
          {error ? <Alert variant="error">{error}</Alert> : null}
          {teamError && selected ? (
            <Alert variant="info">{teamError}</Alert>
          ) : null}

          {existingTeams.length > 0 ? (
            <div className="rounded-[var(--radius-sm)] border border-[var(--warning)]/40 bg-[var(--warning-muted)] px-3 py-2 text-sm text-[var(--warning)]">
              User is listed on{" "}
              {existingTeams.map((t: EventUserTeam) => t.name || t.team_code).join(", ")}.
              Confirming will move them to the selected team.
            </div>
          ) : null}

          <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text)]">Search teams</span>
            <input
              className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Team name or code…"
              disabled={Boolean(userError)}
            />
          </label>

          <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)]">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <InlineLoader label="Loading teams…" />
              </div>
            ) : filteredTeams.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                No active teams found for this event.
              </p>
            ) : (
              <ul className="max-h-64 divide-y divide-[var(--border)] overflow-y-auto">
                {filteredTeams.map((team) => {
                  const isSelected = selected?.id === team.id;
                  const validation = validateTeamForAdd(team);
                  const count =
                    typeof team.member_count === "number"
                      ? team.member_count
                      : team.members?.length ?? 0;
                  return (
                    <li key={team.id}>
                      <button
                        type="button"
                        disabled={Boolean(userError) || Boolean(validation)}
                        className={`flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition ${
                          isSelected
                            ? "bg-[var(--accent-muted)]"
                            : validation
                              ? "opacity-50"
                              : "hover:bg-[var(--surface-hover)]"
                        }`}
                        onClick={() => setSelected(team)}
                      >
                        <span className="text-sm font-semibold text-[var(--text)]">
                          {team.name}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {team.team_code || team.id} · {count}/{MAX_TEAM_MEMBERS}{" "}
                          members
                        </span>
                        {validation ? (
                          <span className="mt-1 text-[0.65rem] text-[var(--warning)]">
                            {validation}
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
            disabled={
              !selected ||
              busy ||
              isLoading ||
              Boolean(userError) ||
              Boolean(teamError)
            }
            onClick={() => void onConfirm()}
          >
            {busy ? "Assigning…" : "Assign to team"}
          </Button>
        </div>
    </ModalShell>
  );
}
