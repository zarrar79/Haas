"use client";

import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormCheckbox, FormSelect } from "@/components/ui/form-fields";
import { ModalShell } from "@/components/ui/modal-shell";
import { TextField } from "@/components/ui/text-field";
import type { ChallengeSummary } from "@/features/challenges/challenge-api";
import {
  createMachine,
  updateMachine,
  type MachineRow,
  type MachineWriteInput,
} from "@/features/ops/ops-api";
import type { EventTeam } from "@/features/teams/team-api";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  hackathonId: string;
  row?: MachineRow | null;
  teams: EventTeam[];
  challenges: ChallengeSummary[];
  onClose: () => void;
  onSaved: () => void;
};

export function MachineFormModal({
  open,
  mode,
  hackathonId,
  row,
  teams,
  challenges,
  onClose,
  onSaved,
}: Props) {
  const [challengeId, setChallengeId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [namespace, setNamespace] = useState("");
  const [podName, setPodName] = useState("");
  const [machineName, setMachineName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [osType, setOsType] = useState("");
  const [remoteName, setRemoteName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === "edit" && row) {
      setChallengeId(row.challenge || "");
      setTeamId(row.team || "");
      setNamespace(row.namespace || "");
      setPodName(row.pod_name || "");
      setMachineName(row.machine_name || "");
      setIpAddress(row.ip_address || "");
      setOsType(row.os_type || "");
      setRemoteName(row.remote_name || "");
      setIsActive(row.is_active !== false);
      setBlocked(Boolean(row.blocked));
      setExpiresAt(row.expires_at ? row.expires_at.slice(0, 16) : "");
    } else {
      setChallengeId(challenges[0]?.id || "");
      setTeamId(teams[0]?.id || "");
      setNamespace("");
      setPodName("");
      setMachineName("");
      setIpAddress("");
      setOsType("");
      setRemoteName("");
      setIsActive(true);
      setBlocked(false);
      setExpiresAt("");
    }
  }, [open, mode, row, teams, challenges]);

  async function submit() {
    if (!challengeId || !teamId) {
      setError("Challenge and team are required.");
      return;
    }
    setBusy(true);
    setError(null);
    // Spawn: only challenge + team; namespace, pod, IP, OS, expiry come from
    // the team and Kubernetes on the backend.
    const body: MachineWriteInput =
      mode === "edit"
        ? {
            challenge: challengeId,
            team: teamId,
            namespace: namespace.trim() || undefined,
            pod_name: podName.trim() || undefined,
            machine_name: machineName.trim() || undefined,
            ip_address: ipAddress.trim() || undefined,
            os_type: osType.trim() || undefined,
            remote_name: remoteName.trim() || undefined,
            is_active: isActive,
            blocked,
            expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
          }
        : { challenge: challengeId, team: teamId, is_active: true };
    try {
      if (mode === "edit" && row) {
        await updateMachine(hackathonId, row.id, body);
      } else {
        await createMachine(hackathonId, body);
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
      panelClassName="max-w-2xl"
      zIndexClass="z-[60]"
      ariaLabel={mode === "edit" ? "Edit spawned machine" : "Spawn machine"}
    >
      <div className="border-b border-[var(--border)] px-5 py-4">
        <h2 className="text-lg font-semibold text-[var(--text)]">
          {mode === "edit" ? "Edit spawned machine" : "Spawn machine"}
        </h2>
      </div>
      <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect
            label="Challenge"
            required
            value={challengeId}
            onChange={setChallengeId}
          >
            <option value="">Select challenge</option>
            {challenges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </FormSelect>
          <FormSelect label="Team" required value={teamId} onChange={setTeamId}>
            <option value="">Select team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </FormSelect>
          {mode === "edit" ? (
            <>
              <TextField
                label="Namespace"
                name="namespace"
                value={namespace}
                onChange={(e) => setNamespace(e.target.value)}
              />
              <TextField
                label="Pod name"
                name="pod_name"
                value={podName}
                onChange={(e) => setPodName(e.target.value)}
              />
              <TextField
                label="Machine name"
                name="machine_name"
                value={machineName}
                onChange={(e) => setMachineName(e.target.value)}
              />
              <TextField
                label="IP address"
                name="ip_address"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
              />
              <TextField
                label="OS type"
                name="os_type"
                value={osType}
                onChange={(e) => setOsType(e.target.value)}
              />
              <TextField
                label="Remote name"
                name="remote_name"
                value={remoteName}
                onChange={(e) => setRemoteName(e.target.value)}
              />
              <TextField
                label="Expires at"
                name="expires_at"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </>
          ) : null}
        </div>
        {mode === "edit" ? (
          <div className="flex flex-wrap gap-4">
            <FormCheckbox
              label="Active"
              checked={isActive}
              onChange={setIsActive}
            />
            <FormCheckbox
              label="Blocked"
              checked={blocked}
              onChange={setBlocked}
            />
          </div>
        ) : (
          <p className="text-xs text-[var(--text-muted)]">
            Namespace, pod name, IP and OS are filled in automatically from the
            team and Kubernetes.
          </p>
        )}
        {error ? <Alert variant="error">{error}</Alert> : null}
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={() => void submit()} disabled={busy}>
          {busy
            ? mode === "edit"
              ? "Saving…"
              : "Spawning…"
            : mode === "edit"
              ? "Save changes"
              : "Spawn"}
        </Button>
      </div>
    </ModalShell>
  );
}
