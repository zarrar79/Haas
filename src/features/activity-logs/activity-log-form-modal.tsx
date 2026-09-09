"use client";

import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-fields";
import { ModalShell } from "@/components/ui/modal-shell";
import { TextField } from "@/components/ui/text-field";
import {
  ACTIVITY_LOG_TYPES,
  createActivityLog,
  updateActivityLog,
  type ActivityLog,
  type ActivityLogWriteInput,
} from "@/features/ops/ops-api";
import type { EventUser } from "@/features/users/users-api";
import { eventUserLabel } from "@/features/users/users-api";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  hackathonId: string;
  row?: ActivityLog | null;
  users: EventUser[];
  onClose: () => void;
  onSaved: () => void;
};

function memberLabel(m: EventUser) {
  return eventUserLabel(m);
}

export function ActivityLogFormModal({
  open,
  mode,
  hackathonId,
  row,
  users,
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

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      panelClassName="max-w-lg"
      zIndexClass="z-[60]"
      ariaLabel={mode === "edit" ? "Edit activity log" : "Record activity log"}
    >
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            {mode === "edit" ? "Edit activity log" : "Record activity log"}
          </h2>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          <FormSelect label="Type" required value={type} onChange={setType}>
            {ACTIVITY_LOG_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </FormSelect>
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
          <FormSelect
            label="Submitted by"
            value={submittedBy}
            onChange={setSubmittedBy}
          >
            <option value="">None</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {memberLabel(u)}
              </option>
            ))}
          </FormSelect>
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
    </ModalShell>
  );
}
