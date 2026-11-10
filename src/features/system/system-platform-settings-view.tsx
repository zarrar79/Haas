"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormCheckbox, FormTextarea } from "@/components/ui/form-fields";
import { FormSkeleton } from "@/components/ui/skeleton";
import {
  getPlatformSettings,
  patchPlatformSettings,
  type PlatformSettings,
} from "@/features/system/system-api";
import { redirectIfUnauthorized } from "@/lib/client-api";

export function SystemPlatformSettingsView() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [isLmsEnabled, setIsLmsEnabled] = useState(true);
  const [lmsDisabledMessage, setLmsDisabledMessage] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const applySettings = useCallback((row: PlatformSettings) => {
    setIsLmsEnabled(Boolean(row.is_lms_enabled));
    setLmsDisabledMessage(row.lms_disabled_message || "");
    setUpdatedAt(row.updated_at ?? null);
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      applySettings(await getPlatformSettings());
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(
        err instanceof Error ? err.message : "Failed to load platform settings",
      );
    } finally {
      setIsLoading(false);
    }
  }, [applySettings, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const row = await patchPlatformSettings({
        is_lms_enabled: isLmsEnabled,
        lms_disabled_message: lmsDisabledMessage,
      });
      applySettings(row);
      setSuccess(
        isLmsEnabled
          ? "LMS / Academy is enabled for the player portal."
          : "LMS / Academy is disabled for the player portal.",
      );
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(
        err instanceof Error ? err.message : "Failed to save platform settings",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <FormSkeleton fields={4} />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold text-[var(--text)]">
          Platform settings
        </h2>
        <Badge tone={isLmsEnabled ? "success" : "warning"}>
          LMS {isLmsEnabled ? "enabled" : "disabled"}
        </Badge>
        {updatedAt ? (
          <span className="text-xs text-[var(--text-muted)]">
            Updated {new Date(updatedAt).toLocaleString()}
          </span>
        ) : null}
      </div>

      <p className="text-sm text-[var(--text-muted)]">
        These toggles apply to the whole platform — not a single hackathon.
        Player portal LMS / Academy buttons and routes follow this setting.
      </p>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      <div className="space-y-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
        <FormCheckbox
          label="Enable LMS / Academy"
          checked={isLmsEnabled}
          onChange={setIsLmsEnabled}
          disabled={isSaving}
        />
        <p className="-mt-2 text-xs text-[var(--text-muted)]">
          When off, the player portal hides LMS navigation and shows the
          disabled message below.
        </p>

        <FormTextarea
          label="LMS disabled message"
          value={lmsDisabledMessage}
          onChange={setLmsDisabledMessage}
          rows={3}
          disabled={isSaving}
          placeholder="Learning Management System is currently disabled."
        />

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void onSave()} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save settings"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void load()}
            disabled={isSaving}
          >
            Refresh
          </Button>
        </div>
      </div>
    </div>
  );
}
