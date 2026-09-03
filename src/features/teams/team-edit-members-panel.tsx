"use client";

import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InlineLoader } from "@/components/ui/loader";
import { usePlatformDialog } from "@/components/ui/platform-dialog-provider";
import { AddTeamMemberModal, MAX_TEAM_MEMBERS } from "@/features/teams/add-team-member-modal";
import {
  listTeamMembers,
  removeTeamMember,
  updateTeamMember,
  type TeamMember,
} from "@/features/teams/team-api";

type Props = {
  hackathonId: string;
  teamId: string;
  teamName: string;
  canManage: boolean;
  onChanged?: () => void;
};

function memberLabel(member: TeamMember) {
  const detail = member.user_detail;
  const name = [detail?.name, detail?.last_name].filter(Boolean).join(" ").trim();
  return name || detail?.username || detail?.email || member.user || member.id;
}

function memberUserId(member: TeamMember) {
  return member.user_detail?.id || member.user || null;
}

export function TeamEditMembersPanel({
  hackathonId,
  teamId,
  teamName,
  canManage,
  onChanged,
}: Props) {
  const { confirm } = usePlatformDialog();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const loadMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setMembers(await listTeamMembers(hackathonId, teamId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  }, [hackathonId, teamId]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  async function onMakeCaptain(member: TeamMember) {
    if (member.is_captain) return;
    setBusyId(member.id);
    setError(null);
    try {
      for (const other of members) {
        if (other.is_captain && other.id !== member.id) {
          await updateTeamMember(hackathonId, teamId, other.id, {
            is_captain: false,
          });
        }
      }
      await updateTeamMember(hackathonId, teamId, member.id, {
        is_captain: true,
      });
      await loadMembers();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update captain");
    } finally {
      setBusyId(null);
    }
  }

  async function onRemove(member: TeamMember) {
    const label = memberLabel(member);
    const ok = await confirm({
      title: "Remove member",
      message: `Remove ${label} from ${teamName}? Their membership will be deactivated.`,
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) {
      return;
    }
    setBusyId(member.id);
    setError(null);
    try {
      await removeTeamMember(hackathonId, teamId, member.id);
      await loadMembers();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setBusyId(null);
    }
  }

  const memberUserIds = members
    .map((member) => memberUserId(member))
    .filter((id): id is string => Boolean(id));

  return (
    <div className="space-y-3 border-t border-[var(--border)] pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text)]">
            Team members
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            {members.length} of {MAX_TEAM_MEMBERS} members
          </p>
        </div>
        {canManage && members.length < MAX_TEAM_MEMBERS ? (
          <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
            Add member
          </Button>
        ) : null}
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {isLoading ? (
        <div className="flex justify-center py-6">
          <InlineLoader label="Loading members…" />
        </div>
      ) : members.length === 0 ? (
        <p className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--text-muted)]">
          No members on this team yet.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)]">
          {members.map((member) => {
            const label = memberLabel(member);
            const isBusy = busyId === member.id;
            return (
              <li
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--text)]">
                      {label}
                    </span>
                    {member.is_captain ? (
                      <Badge tone="warning">Captain</Badge>
                    ) : null}
                    {member.is_approved === false ? (
                      <Badge tone="danger">Pending</Badge>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    {member.user_detail?.email || member.user_detail?.username}
                  </p>
                </div>

                {canManage ? (
                  <div className="flex shrink-0 flex-wrap gap-1">
                    {!member.is_captain ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isBusy || busyId !== null}
                        onClick={() => void onMakeCaptain(member)}
                      >
                        {isBusy ? "Updating…" : "Make captain"}
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isBusy || busyId !== null}
                      onClick={() => void onRemove(member)}
                    >
                      Remove
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {addOpen ? (
        <AddTeamMemberModal
          open
          hackathonId={hackathonId}
          teamId={teamId}
          teamName={teamName}
          currentMemberUserIds={memberUserIds}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            void loadMembers();
            onChanged?.();
          }}
        />
      ) : null}
    </div>
  );
}
