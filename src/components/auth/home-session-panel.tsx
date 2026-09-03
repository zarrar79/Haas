"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoader } from "@/components/ui/loader";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import { AssignedEventsPanel } from "@/features/events/assigned-events-panel";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import {
  getConsolidatedOverviewBundle,
  type OverviewAnalyticsBundle,
} from "@/features/dashboard/overview-analytics-api";
import { OverviewAnalyticsView } from "@/features/dashboard/overview-analytics-view";
import {
  getLifecycleAnalyticsBundle,
  type LifecycleAnalyticsBundle,
} from "@/features/dashboard/lifecycle-analytics-api";
import { LifecycleAnalyticsView } from "@/features/dashboard/lifecycle-analytics-view";
import { listHackathons } from "@/features/hackathons/hackathon-api";
import {
  getAssignedHackathons,
  resolveAssignedEventId,
} from "@/lib/assigned-events";

const DEFAULT_PERIOD = "7d";
const ALL_EVENTS = "all";

type EventOption = { id: string; name: string };

export function HomeSessionPanel() {
  const { me, isLoading, isEventOnlyAdmin } = useHaasAccess();
  const { selectedHackathonId, setSelectedHackathonId } = useSelectedEvent();
  const [lifecycle, setLifecycle] = useState<LifecycleAnalyticsBundle | null>(
    null,
  );
  const [analytics, setAnalytics] = useState<OverviewAnalyticsBundle | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [filterEventId, setFilterEventId] = useState<string>(ALL_EVENTS);
  const [eventOptions, setEventOptions] = useState<EventOption[]>([]);

  const assigned = getAssignedHackathons(me);
  const primaryEventId = resolveAssignedEventId(me, selectedHackathonId);

  const loadEventOptions = useCallback(async () => {
    try {
      if (isEventOnlyAdmin) {
        const rows = getAssignedHackathons(me);
        setEventOptions(
          rows.map((row) => ({
            id: row.hackathon_id,
            name: row.hackathon_name,
          })),
        );
        return;
      }
      const { items } = await listHackathons({ show_deleted: "false" });
      setEventOptions(
        items.map((h) => ({
          id: h.id,
          name: h.display_name || h.name || h.id,
        })),
      );
    } catch {
      const rows = getAssignedHackathons(me);
      setEventOptions(
        rows.map((row) => ({
          id: row.hackathon_id,
          name: row.hackathon_name,
        })),
      );
    }
  }, [me, isEventOnlyAdmin]);

  const loadDashboards = useCallback(async () => {
    setDashboardLoading(true);
    setError(null);
    const eventId =
      filterEventId !== ALL_EVENTS ? filterEventId : undefined;
    try {
      const [life, competition] = await Promise.all([
        getLifecycleAnalyticsBundle({
          period: DEFAULT_PERIOD,
          limit: "20",
          event_id: eventId,
        }),
        getConsolidatedOverviewBundle({
          period: DEFAULT_PERIOD,
          limit: "15",
          event_id: eventId,
        }),
      ]);
      setLifecycle(life);
      setAnalytics(competition);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
      setLifecycle(null);
      setAnalytics(null);
    } finally {
      setDashboardLoading(false);
    }
  }, [filterEventId]);

  useEffect(() => {
    if (!isLoading) void loadEventOptions();
  }, [isLoading, loadEventOptions]);

  useEffect(() => {
    if (!isLoading) void loadDashboards();
  }, [isLoading, loadDashboards]);

  useEffect(() => {
    if (primaryEventId && primaryEventId !== selectedHackathonId) {
      setSelectedHackathonId(primaryEventId);
    }
  }, [primaryEventId, selectedHackathonId, setSelectedHackathonId]);

  const tabs = useMemo(
    () => [
      { id: ALL_EVENTS, label: "All events" },
      ...eventOptions.map((event) => ({
        id: event.id,
        label:
          event.name.length > 28
            ? `${event.name.slice(0, 27)}…`
            : event.name,
      })),
    ],
    [eventOptions],
  );

  return (
    <div className="flex w-full flex-col gap-4">
      <PageHeader title="Dashboard" />

      <div
        className="flex flex-wrap gap-1 border-b border-[var(--border)] pb-px"
        role="tablist"
        aria-label="Filter dashboard by event"
      >
        {tabs.map((tab) => {
          const active = filterEventId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilterEventId(tab.id)}
              className={`relative px-3 py-2 text-sm font-semibold transition ${
                active
                  ? "text-[var(--text)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              {tab.label}
              {active ? (
                <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-[var(--accent)]" />
              ) : null}
            </button>
          );
        })}
      </div>

      {isEventOnlyAdmin ? <AssignedEventsPanel /> : null}

      {isLoading || dashboardLoading ? (
        <PageLoader label="Loading dashboard analytics…" />
      ) : null}

      {error ? <Alert variant="error">{error}</Alert> : null}

      {!isLoading && !dashboardLoading && lifecycle ? (
        <LifecycleAnalyticsView data={lifecycle} />
      ) : null}

      {!isLoading && !dashboardLoading && analytics ? (
        <div className="space-y-3 border-t border-[var(--border)] pt-6">
          <OverviewAnalyticsView
            data={analytics}
            periodLabel={DEFAULT_PERIOD}
          />
        </div>
      ) : null}

      {!isLoading &&
      !dashboardLoading &&
      !error &&
      !lifecycle &&
      !analytics &&
      isEventOnlyAdmin &&
      assigned.length === 0 ? (
        <div className="spark-card flex min-h-[160px] flex-col items-center justify-center gap-3 p-5 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            No hackathons have been assigned to your account yet. Ask a
            platform administrator to provision access.
          </p>
        </div>
      ) : null}
    </div>
  );
}
