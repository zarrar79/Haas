"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormSkeleton } from "@/components/ui/skeleton";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import {
  getLiveDashboardTabs,
  patchLiveDashboardTabs,
  type LiveDashboardTab,
} from "@/features/events/live-dashboard-tabs-api";
import { redirectIfUnauthorized } from "@/lib/client-api";

type Props = {
  hackathonId: string;
  disabled?: boolean;
};

function coerceEnabled(tab: LiveDashboardTab): boolean {
  return Boolean(tab.is_enabled ?? tab.isEnabled);
}

export function EventLiveDashboardSettingsPanel({
  hackathonId,
  disabled = false,
}: Props) {
  const router = useRouter();
  const { canMutateEvent } = useHaasAccess();
  const canWrite = canMutateEvent(hackathonId) && !disabled;

  const [tabs, setTabs] = useState<LiveDashboardTab[]>([]);
  const [viewOnDashboard, setViewOnDashboard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getLiveDashboardTabs(hackathonId);
      setViewOnDashboard(Boolean(data.view_on_dashboard));
      setTabs(
        (data.tabs || []).map((t) => ({
          ...t,
          is_enabled: coerceEnabled(t),
        })),
      );
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load live dashboard settings",
      );
    } finally {
      setIsLoading(false);
    }
  }, [hackathonId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const navigationTabs = useMemo(
    () => tabs.filter((t) => t.group !== "overview_cards"),
    [tabs],
  );
  const overviewCards = useMemo(
    () => tabs.filter((t) => t.group === "overview_cards"),
    [tabs],
  );

  function toggleTab(name: string, enabled: boolean) {
    setTabs((prev) =>
      prev.map((t) => (t.name === name ? { ...t, is_enabled: enabled } : t)),
    );
    setSuccess(null);
  }

  async function handleSave() {
    if (!canWrite) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await patchLiveDashboardTabs(hackathonId, {
        view_on_dashboard: viewOnDashboard,
        tabs: tabs.map((t) => ({
          name: t.name,
          is_enabled: coerceEnabled(t),
        })),
      });
      setViewOnDashboard(Boolean(updated.view_on_dashboard));
      setTabs(
        (updated.tabs || []).map((t) => ({
          ...t,
          is_enabled: coerceEnabled(t),
        })),
      );
      setSuccess("Live dashboard display settings saved.");
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <FormSkeleton fields={6} />;
  }

  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
            Live dashboard display
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Choose which tabs and overview cards appear on the live dashboard
            for this hackathon.
          </p>
        </div>
        {canWrite ? (
          <Button
            type="button"
            size="sm"
            disabled={isSaving}
            onClick={() => void handleSave()}
          >
            {isSaving ? "Saving…" : "Save display"}
          </Button>
        ) : null}
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      <label className="mb-4 flex items-start gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] p-3 text-sm text-[var(--text)]">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0"
          checked={viewOnDashboard}
          onChange={(e) => {
            setViewOnDashboard(e.target.checked);
            setSuccess(null);
          }}
          disabled={!canWrite || isSaving}
        />
        <span>
          <span className="font-medium">Show this event on the live dashboard</span>
          <span className="mt-0.5 block text-[var(--text-muted)]">
            When enabled, this hackathon appears in the live dashboard event
            list (still scoped to assigned staff).
          </span>
        </span>
      </label>

      <div className="grid gap-4 lg:grid-cols-2">
        <TabToggleGroup
          title="Navigation tabs"
          tabs={navigationTabs}
          disabled={!canWrite || isSaving}
          onToggle={toggleTab}
        />
        <TabToggleGroup
          title="Overview cards"
          tabs={overviewCards}
          disabled={!canWrite || isSaving}
          onToggle={toggleTab}
        />
      </div>
    </div>
  );
}

function TabToggleGroup({
  title,
  tabs,
  disabled,
  onToggle,
}: {
  title: string;
  tabs: LiveDashboardTab[];
  disabled: boolean;
  onToggle: (name: string, enabled: boolean) => void;
}) {
  if (!tabs.length) return null;
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] p-4">
      <h3 className="mb-3 text-sm font-semibold text-[var(--text)]">{title}</h3>
      <ul className="space-y-2">
        {tabs.map((tab) => (
          <li key={tab.name}>
            <label className="flex items-center justify-between gap-3 text-sm text-[var(--text)]">
              <span>{tab.label || tab.name}</span>
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0"
                checked={coerceEnabled(tab)}
                onChange={(e) => onToggle(tab.name, e.target.checked)}
                disabled={disabled}
              />
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
