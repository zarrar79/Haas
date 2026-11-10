"use client";

import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import type { KothSession, KothSessionConfigPatch } from "@/features/koth/koth-api";

type Props = {
  session: KothSession | null;
  onClose: () => void;
  /** Saves only the changed fields; throws to show the error in the dialog. */
  onSave: (patch: KothSessionConfigPatch) => Promise<void>;
};

// ISO → value for <input type="datetime-local"> in the admin's local time.
function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIso(local: string): string | null {
  return local ? new Date(local).toISOString() : null;
}

/** Edit a KOTH instance's round start / end time from the instance list. */
export function KothScheduleModal({ session, onClose, onSave }: Props) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStart(toLocalInput(session?.start_time));
    setEnd(toLocalInput(session?.end_time));
    setError(null);
  }, [session]);

  const roundStarted = session?.status === "running" || session?.status === "paused";
  const startChanged = start !== toLocalInput(session?.start_time);
  const endChanged = end !== toLocalInput(session?.end_time);

  const save = async () => {
    if (!session) return;
    if (startChanged && start && new Date(start) <= new Date()) {
      setError("Round start time must be in the future.");
      return;
    }
    if (endChanged && end && new Date(end) <= new Date()) {
      setError("Round end time must be in the future.");
      return;
    }
    if (start && end && new Date(end) <= new Date(start)) {
      setError("Round end time must be after the start time.");
      return;
    }
    if (!startChanged && !endChanged) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Only send edited fields: an unchanged past start would fail validation.
      await onSave({
        ...(startChanged ? { start_time: toIso(start) } : {}),
        ...(endChanged ? { end_time: toIso(end) } : {}),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save round times");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      open={!!session}
      onClose={saving ? () => undefined : onClose}
      panelClassName="max-w-md"
      ariaLabel="Edit KOTH round times"
    >
      <div className="border-b border-[var(--border)] px-3 py-4 sm:px-5">
        <h2 className="text-lg font-semibold text-[var(--text)]">Round times</h2>
        <p className="mt-0.5 truncate text-sm text-[var(--text-muted)]">
          {session?.display_title || session?.name}
        </p>
      </div>

      <div className="space-y-3 px-3 py-4 sm:px-5">
        {error ? <Alert variant="error">{error}</Alert> : null}
        <label className="block text-xs text-[var(--text-muted)]">
          Round starts at
          <input
            type="datetime-local"
            className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm text-[var(--text)] disabled:opacity-60"
            value={start}
            disabled={saving || roundStarted}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        {roundStarted ? (
          <p className="text-xs text-[var(--text-muted)]">
            The round has started; stop it to change the start time.
          </p>
        ) : null}
        <label className="block text-xs text-[var(--text-muted)]">
          Round ends at
          <input
            type="datetime-local"
            className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm text-[var(--text)] disabled:opacity-60"
            value={end}
            disabled={saving}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
        <p className="text-xs text-[var(--text-muted)]">
          The round starts and stops automatically at these times. These are independent of the
          hackathon&apos;s own start / end time; leave a field empty to start / stop manually.
        </p>
      </div>

      <div className="flex justify-end gap-2 border-t border-[var(--border)] px-3 py-3 sm:px-5">
        <Button variant="ghost" disabled={saving} onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </ModalShell>
  );
}
