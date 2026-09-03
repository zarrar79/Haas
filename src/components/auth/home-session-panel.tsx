"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoader } from "@/components/ui/loader";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import { AssignedEventsPanel } from "@/features/events/assigned-events-panel";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import {
  getHackathonDashboard,
  getPlatformDashboard,
  type HackathonDashboard,
  type PlatformDashboard,
} from "@/features/dashboard/dashboard-api";
import { HackathonDashboardView } from "@/features/dashboard/hackathon-dashboard-view";
import { PlatformDashboardView } from "@/features/dashboard/platform-dashboard-view";
import {
  getAssignedHackathons,
  resolveAssignedEventId,
} from "@/lib/assigned-events";
import { useUiPreferences } from "@/theme/ui-preferences";

export function HomeSessionPanel() {
  const router = useRouter();
  const { setShowApiTester } = useUiPreferences();
  const { me, isLoading, userDisplayName, isPlatformOperator, isEventOnlyAdmin } =
    useHaasAccess();
  const { selectedHackathonId, setSelectedHackathonId } = useSelectedEvent();
  const [eventDashboard, setEventDashboard] =
    useState<HackathonDashboard | null>(null);
  const [platformDashboard, setPlatformDashboard] =
    useState<PlatformDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const assigned = getAssignedHackathons(me);
  const primaryEventId = resolveAssignedEventId(me, selectedHackathonId);

  const loadDashboards = useCallback(async () => {
    setDashboardLoading(true);
    setError(null);
    try {
      const tasks: Promise<void>[] = [];
      if (primaryEventId) {
        tasks.push(
          getHackathonDashboard(primaryEventId, { hours: "24", limit: "10" }).then(
            setEventDashboard,
          ),
        );
      } else {
        setEventDashboard(null);
      }
      if (isPlatformOperator) {
        tasks.push(
          getPlatformDashboard({ hours: "24", limit: "8" }).then(
            setPlatformDashboard,
          ),
        );
      } else {
        setPlatformDashboard(null);
      }
      await Promise.all(tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setDashboardLoading(false);
    }
  }, [isPlatformOperator, primaryEventId]);

  useEffect(() => {
    if (!isLoading) void loadDashboards();
  }, [isLoading, loadDashboards]);

  useEffect(() => {
    if (primaryEventId && primaryEventId !== selectedHackathonId) {
      setSelectedHackathonId(primaryEventId);
    }
  }, [primaryEventId, selectedHackathonId, setSelectedHackathonId]);

  return (
    <div className="flex w-full flex-col gap-4">
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${userDisplayName || "Operator"}`}
        description={
          isEventOnlyAdmin
            ? "Your assigned hackathons — members, teams, scores, and activity for each event."
            : "Live analytics for your events — teams, submissions, machines, and activity at a glance."
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => void loadDashboards()}>
              Refresh
            </Button>
            {!isEventOnlyAdmin ? (
              <Button
                variant="secondary"
                onClick={() => router.push("/hackathons")}
              >
                Hackathons
              </Button>
            ) : null}
            {primaryEventId ? (
              <Link href={`/events/${primaryEventId}`}>
                <Button>Event workspace</Button>
              </Link>
            ) : null}
            {/*   */}
          </>
        }
      />

      {isEventOnlyAdmin ? <AssignedEventsPanel /> : null}

      {isLoading || dashboardLoading ? (
        <PageLoader label="Loading analytics…" />
      ) : null}

      {error ? <Alert variant="error">{error}</Alert> : null}

      {!isLoading && !dashboardLoading ? (
        <>
          {isPlatformOperator && platformDashboard ? (
            <PlatformDashboardView data={platformDashboard} />
          ) : null}

          {eventDashboard ? (
            <HackathonDashboardView data={eventDashboard} />
          ) : isEventOnlyAdmin && assigned.length === 0 ? (
            <div className="spark-card flex min-h-[160px] flex-col items-center justify-center gap-3 p-5 text-center">
              <p className="text-sm text-[var(--text-muted)]">
                No hackathons have been assigned to your account yet. Ask a
                platform administrator to provision access.
              </p>
            </div>
          ) : !isPlatformOperator && !primaryEventId ? (
            <div className="spark-card flex min-h-[160px] flex-col items-center justify-center gap-3 p-5 text-center">
              <p className="text-sm text-[var(--text-muted)]">
                Select a hackathon to view live analytics charts.
              </p>
              <Button onClick={() => router.push("/hackathons")}>
                Open hackathons
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
