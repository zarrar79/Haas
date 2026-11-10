"use client";

import { useEffect, useMemo, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { addPlayingChallenges } from "@/features/challenges/challenge-api";
import { hackathonLabel } from "@/lib/display-name";
import type { Hackathon } from "@/types/hackathon";

type Props = {
  open: boolean;
  onClose: () => void;
  onAttached: () => void;
  challengeIds: string[];
  challengeLabel?: string;
  hackathons: Hackathon[];
  /** Map of challengeId → catalog hackathon ids already on the playing roster. */
  playingByChallengeId?: Record<string, string[]>;
  /** Pre-select when opened from a specific event scope (if not already playing). */
  defaultHackathonId?: string | null;
};

function membershipForHackathon(
  hackathonId: string,
  challengeIds: string[],
  playingByChallengeId: Record<string, string[]>,
) {
  if (challengeIds.length === 0) {
    return { linkedCount: 0, allLinked: false, someLinked: false };
  }
  let linkedCount = 0;
  for (const challengeId of challengeIds) {
    const playing = playingByChallengeId[challengeId] || [];
    if (playing.includes(hackathonId)) linkedCount += 1;
  }
  return {
    linkedCount,
    allLinked: linkedCount === challengeIds.length,
    someLinked: linkedCount > 0 && linkedCount < challengeIds.length,
  };
}

export function AttachChallengeModal({
  open,
  onClose,
  onAttached,
  challengeIds,
  challengeLabel,
  hackathons,
  playingByChallengeId = {},
  defaultHackathonId,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title =
    challengeIds.length === 1
      ? challengeLabel
        ? `Add “${challengeLabel}” to playing`
        : "Add challenge to playing"
      : `Add ${challengeIds.length} challenges to playing`;

  const sortedHackathons = useMemo(
    () =>
      [...hackathons].sort((a, b) =>
        hackathonLabel(a).localeCompare(hackathonLabel(b)),
      ),
    [hackathons],
  );

  const rows = useMemo(
    () =>
      sortedHackathons.map((h) => {
        const membership = membershipForHackathon(
          h.id,
          challengeIds,
          playingByChallengeId,
        );
        return { hackathon: h, ...membership };
      }),
    [sortedHackathons, challengeIds, playingByChallengeId],
  );

  const selectableIds = useMemo(
    () => rows.filter((row) => !row.allLinked).map((row) => row.hackathon.id),
    [rows],
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    setBusy(false);
    const initial = new Set<string>();
    if (defaultHackathonId && selectableIds.includes(defaultHackathonId)) {
      initial.add(defaultHackathonId);
    }
    setSelected(initial);
    // Reset only when the dialog opens for a new target set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, challengeIds.join("|"), defaultHackathonId]);

  function toggle(id: string) {
    if (!selectableIds.includes(id)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllAvailable() {
    setSelected(new Set(selectableIds));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function submit() {
    const targets = [...selected].filter((id) => selectableIds.includes(id));
    if (targets.length === 0) {
      setError(
        "Select at least one hackathon that is not already fully on the playing roster.",
      );
      return;
    }
    if (challengeIds.length === 0) {
      setError("No challenges selected.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      let attached = 0;
      let skipped = 0;
      for (const hackathonId of targets) {
        const toAdd = challengeIds.filter((challengeId) => {
          const already = new Set(playingByChallengeId[challengeId] || []);
          return !already.has(hackathonId);
        });
        if (toAdd.length === 0) {
          skipped += challengeIds.length;
          continue;
        }
        await addPlayingChallenges(hackathonId, toAdd);
        attached += toAdd.length;
        skipped += challengeIds.length - toAdd.length;
      }
      if (attached === 0 && skipped > 0) {
        setError(
          "All selected challenges are already on those playing hackathons.",
        );
        return;
      }
      onAttached();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add to playing roster",
      );
    } finally {
      setBusy(false);
    }
  }

  const selectedCount = [...selected].filter((id) =>
    selectableIds.includes(id),
  ).length;

  return (
    <ModalShell
      open={open}
      onClose={busy ? () => undefined : onClose}
      panelClassName="max-w-md"
      ariaLabel={title}
    >
      <div className="border-b border-[var(--border)] px-5 py-4">
        <h2 className="text-lg font-semibold text-[var(--text)]">{title}</h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Select one or many events. Challenges already on a live playing
          roster are marked and cannot be selected again.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {error ? (
          <div className="mb-3">
            <Alert variant="error">{error}</Alert>
          </div>
        ) : null}

        {sortedHackathons.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            No hackathons available.
          </p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={busy || selectableIds.length === 0}
                onClick={selectAllAvailable}
              >
                Select all available
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy || selectedCount === 0}
                onClick={clearSelection}
              >
                Clear
              </Button>
            </div>
            <ul className="space-y-2">
              {rows.map(
                ({ hackathon: h, allLinked, someLinked, linkedCount }) => {
                  const checked = allLinked || selected.has(h.id);
                  const disabled = busy || allLinked;
                  return (
                    <li key={h.id}>
                      <label
                        className={`flex items-start gap-3 rounded-[var(--radius-sm)] border px-3 py-2 ${
                          allLinked
                            ? "cursor-default border-[var(--border)] bg-[var(--surface-raised)]/60 opacity-80"
                            : "cursor-pointer border-[var(--border)] hover:bg-[var(--surface-hover)]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggle(h.id)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-[var(--text)]">
                              {hackathonLabel(h)}
                            </span>
                            {allLinked ? (
                              <Badge tone="success">Already playing</Badge>
                            ) : someLinked ? (
                              <Badge tone="warning">
                                Playing for {linkedCount}/{challengeIds.length}
                              </Badge>
                            ) : null}
                          </span>
                          {h.name &&
                          h.display_name &&
                          h.name !== h.display_name ? (
                            <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                              {h.name}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  );
                },
              )}
            </ul>
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] px-5 py-3">
        <p className="text-xs text-[var(--text-muted)]">
          {selectedCount === 0
            ? "Pick one or more events"
            : `${selectedCount} hackathon${selectedCount === 1 ? "" : "s"} selected`}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={busy || selectedCount === 0 || challengeIds.length === 0}
            onClick={() => void submit()}
          >
            {busy ? "Adding…" : "Add to playing"}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
