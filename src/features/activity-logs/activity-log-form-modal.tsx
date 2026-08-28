"use client";

import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import {
  ACTIVITY_LOG_TYPES,
  createActivityLog,
  updateActivityLog,
  type ActivityLog,
  type ActivityLogWriteInput,
} from "@/features/ops/ops-api";
import type { EventMember } from "@/features/members/member-api";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  hackathonId: string;
  row?: ActivityLog | null;
  members: EventMember[];
  onClose: () => void;
  onSaved: () => void;
};

const INPUT_CLASS =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]";

function memberLabel(m: EventMember) {
  const d = m.user_detail;
  const name = [d?.name, d?.last_name].filter(Boolean).join(" ").trim();
  return name || d?.username || d?.email || m.user;
}

export function ActivityLogFormModal({
  open,
  mode,
  hackathonId,
  row,
  members,
  onClose,
  onSaved,
}: Props) {
  const [type, setType] = useState<string>(ACTIVITY_LOG_TYPES[0]);
  const [message, setMessage] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [submittedBy, setSubmittedBy] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === "edit" && row) {
      setType(row.type || ACTIVITY_LOG_TYPES[0]);
      setMessage(row.message || "");
      setIpAddress(row.ip_address || "");
      setSubmittedBy(row.submitted_by || "");
    } else {
      setType(ACTIVITY_LOG_TYPES[0]);
      setMessage("");
      setIpAddress("");
      setSubmittedBy("");
    }
  }, [open, mode, row]);

  async function submit() {
    if (!type) {
      setError("Activity type is required.");
      return;
    }
    setBusy(true);
    setError(null);
    const body: ActivityLogWriteInput = {
      type,
      message: message.trim() || undefined,
      ip_address: ipAddress.trim() || undefined,
      submitted_by: submittedBy || undefined,
    };
    try {
      if (mode === "edit" && row) {
        await updateActivityLog(hackathonId, row.id, body);
      } else {
        await createActivityLog(hackathonId, body);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[var(--overlay)]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(92vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            {mode === "edit" ? "Edit activity log" : "Record activity log"}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Player action log for this event (Organizer / Manager).
          </p>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text)]">Type *</span>
            <select
              className={INPUT_CLASS}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {ACTIVITY_LOG_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <TextField
            label="Message"
            name="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <TextField
            label="IP address"
            name="ip_address"
            value={ipAddress}
            onChange={(e) => setIpAddress(e.target.value)}
          />
          <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text)]">Submitted by</span>
            <select
              className={INPUT_CLASS}
              value={submittedBy}
              onChange={(e) => setSubmittedBy(e.target.value)}
            >
              <option value="">None</option>
              {members.map((m) => (
                <option key={m.id} value={m.user}>
                  {memberLabel(m)}
                </option>
              ))}
            </select>
          </label>
          {error ? <Alert variant="error">{error}</Alert> : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy}>
            {busy ? "Saving…" : mode === "edit" ? "Save changes" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}
