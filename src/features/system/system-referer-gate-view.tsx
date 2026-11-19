"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FormCheckbox,
  FormSelect,
  FormTextarea,
} from "@/components/ui/form-fields";
import { TextField } from "@/components/ui/text-field";
import { FormSkeleton } from "@/components/ui/skeleton";
import { listReferers, type RefererItem } from "@/features/catalog/catalog-api";
import {
  getRefererRegistrationGate,
  patchRefererRegistrationGate,
  type RefererRegistrationGate,
} from "@/features/system/system-api";
import { redirectIfUnauthorized } from "@/lib/client-api";

/** ISO → value for <input type="datetime-local"> in local time. */
function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string): string | null {
  if (!local.trim()) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function SystemRefererGateView() {
  const router = useRouter();
  const [referers, setReferers] = useState<RefererItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [isEnabled, setIsEnabled] = useState(false);
  const [refererId, setRefererId] = useState("");
  const [allowedEmails, setAllowedEmails] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [denialMessage, setDenialMessage] = useState("");
  const [applyRegistration, setApplyRegistration] = useState(true);
  const [applyTeamCreate, setApplyTeamCreate] = useState(true);
  const [applyTeamJoin, setApplyTeamJoin] = useState(true);
  const [bypassStaff, setBypassStaff] = useState(true);
  const [meta, setMeta] = useState<{
    allowedEmailCount: number;
    isActiveNow: boolean;
    inactiveReason: string | null;
  } | null>(null);

  const applyGate = useCallback((gate: RefererRegistrationGate) => {
    setIsEnabled(Boolean(gate.is_enabled));
    setRefererId(gate.referer ? String(gate.referer) : "");
    setAllowedEmails(gate.allowed_emails || "");
    setStartsAt(toLocalInput(gate.starts_at));
    setEndsAt(toLocalInput(gate.ends_at));
    setDenialMessage(gate.denial_message || "");
    setApplyRegistration(gate.apply_to_registration !== false);
    setApplyTeamCreate(gate.apply_to_team_create !== false);
    setApplyTeamJoin(gate.apply_to_team_join !== false);
    setBypassStaff(gate.bypass_staff !== false);
    setMeta({
      allowedEmailCount: gate.allowed_email_count ?? 0,
      isActiveNow: Boolean(gate.is_active_now),
      inactiveReason: gate.inactive_reason ?? null,
    });
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [gate, refererRows] = await Promise.all([
        getRefererRegistrationGate(),
        listReferers().catch(() => [] as RefererItem[]),
      ]);
      setReferers(refererRows);
      applyGate(gate);
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load referer registration gate",
      );
    } finally {
      setIsLoading(false);
    }
  }, [applyGate, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    const startIso = fromLocalInput(startsAt);
    const endIso = fromLocalInput(endsAt);
    if (startIso && endIso && new Date(endIso) < new Date(startIso)) {
      setError("End must be after start — otherwise the gate never enforces.");
      setIsSaving(false);
      return;
    }
    try {
      const gate = await patchRefererRegistrationGate({
        is_enabled: isEnabled,
        referer: refererId || null,
        allowed_emails: allowedEmails,
        starts_at: startIso,
        ends_at: endIso,
        denial_message: denialMessage,
        apply_to_registration: applyRegistration,
        apply_to_team_create: applyTeamCreate,
        apply_to_team_join: applyTeamJoin,
        bypass_staff: bypassStaff,
      });
      applyGate(gate);
      setSuccess(
        gate.is_active_now
          ? "Saved — gate is active now and enforcing the allow-list."
          : `Saved — gate is NOT enforcing yet: ${gate.inactive_reason || "check the time window."}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <FormSkeleton fields={8} />;
  }

  const emailLines = allowedEmails
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean).length;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={isEnabled ? "success" : "neutral"}>
          {isEnabled ? "Enabled" : "Disabled"}
        </Badge>
        {meta?.isActiveNow ? (
          <Badge tone="warning">Active now</Badge>
        ) : (
          <Badge tone="neutral">Not enforcing now</Badge>
        )}
        <span className="text-xs text-[var(--text-muted)]">
          {meta?.allowedEmailCount ?? emailLines} allow-listed emails
        </span>
      </div>

   

      {meta && !meta.isActiveNow && meta.inactiveReason ? (
        <Alert variant="error">{meta.inactiveReason}</Alert>
      ) : null}

      {error ? <Alert variant="error">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      <div className="space-y-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
        <FormCheckbox
          label="Only referer registration allowed (enable gate)"
          checked={isEnabled}
          onChange={setIsEnabled}
          disabled={isSaving}
        />

        <FormSelect
          label="Referer to assign on allowed registration"
          value={refererId}
          onChange={setRefererId}
          disabled={isSaving}
        >
          <option value="">— Select referer —</option>
          {referers.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name || r.slug}
            </option>
          ))}
        </FormSelect>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Gate starts at"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            disabled={isSaving}
          />
          <TextField
            label="Gate ends at"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            disabled={isSaving}
          />
        </div>

        <FormTextarea
          label="Allow-listed emails (one per line)"
          value={allowedEmails}
          onChange={setAllowedEmails}
          rows={12}
          disabled={isSaving}
          placeholder={"user1@example.com\nuser2@example.com"}
        />
        <p className="text-xs text-[var(--text-muted)]">
           {emailLines} lines
          currently.
        </p>

        <FormTextarea
          label="Denial message (shown to non-referers)"
          value={denialMessage}
          onChange={setDenialMessage}
          rows={4}
          disabled={isSaving}
        />

        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--text)]">Apply to</p>
          <FormCheckbox
            label="User registration / account create"
            checked={applyRegistration}
            onChange={setApplyRegistration}
            disabled={isSaving}
          />
          <FormCheckbox
            label="Team create"
            checked={applyTeamCreate}
            onChange={setApplyTeamCreate}
            disabled={isSaving}
          />
          <FormCheckbox
            label="Team join"
            checked={applyTeamJoin}
            onChange={setApplyTeamJoin}
            disabled={isSaving}
          />
          <FormCheckbox
            label="Bypass for staff / superusers"
            checked={bypassStaff}
            onChange={setBypassStaff}
            disabled={isSaving}
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button onClick={() => void onSave()} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save gate settings"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void load()}
            disabled={isSaving}
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
