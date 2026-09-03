"use client";

import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import type { ChallengeSummary } from "@/features/challenges/challenge-api";
import { bulkSpawnMachines } from "@/features/ops/ops-api";
import type { EventTeam } from "@/features/teams/team-api";

type Props = {
  open: boolean;
  hackathonId: string;
  teams: EventTeam[];
  challenges: ChallengeSummary[];
  onClose: () => void;
  onSaved: () => void;
};

export function BulkSpawnModal({
  open,
  hackathonId,
  teams,
  challenges,
  onClose,
  onSaved,
}: Props) {
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [selectedChallenges, setSelectedChallenges] = useState<Set<string>>(
    new Set(),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedTeams(new Set());
    setSelectedChallenges(new Set());
    setError(null);
  }, [open]);

  function toggle(
    set: Set<string>,
    id: string,
    setter: (s: Set<string>) => void,
  ) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  }

  async function submit() {
    const teamIds = [...selectedTeams];
    const challengeIds = [...selectedChallenges];
    if (teamIds.length === 0 || challengeIds.length === 0) {
      setError("Select at least one team and one challenge.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await bulkSpawnMachines(hackathonId, { team_ids: teamIds, challenge_ids: challengeIds });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk spawn failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      panelClassName="max-w-2xl"
      zIndexClass="z-[60]"
      ariaLabel="Bulk spawn machines"
    >
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Bulk spawn machines
          </h2>
        </div>
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-4 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-medium text-[var(--text)]">Teams</h3>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded border border-[var(--border)] p-2">
              {teams.map((t) => (
                <label
                  key={t.id}
                  className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-[var(--surface-raised)]"
                >
                  <input
                    type="checkbox"
                    checked={selectedTeams.has(t.id)}
                    onChange={() => toggle(selectedTeams, t.id, setSelectedTeams)}
                  />
                  {t.name}
                </label>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium text-[var(--text)]">
              Challenges
            </h3>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded border border-[var(--border)] p-2">
              {challenges.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-[var(--surface-raised)]"
                >
                  <input
                    type="checkbox"
                    checked={selectedChallenges.has(c.id)}
                    onChange={() =>
                      toggle(selectedChallenges, c.id, setSelectedChallenges)
                    }
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-[var(--border)] px-5 py-4">
          {error ? (
            <div className="mb-3">
              <Alert variant="error">{error}</Alert>
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={busy}>
              {busy ? "Spawning…" : "Spawn selected"}
            </Button>
          </div>
        </div>
    </ModalShell>
  );
}
