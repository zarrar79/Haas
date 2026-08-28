"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoader } from "@/components/ui/loader";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import {
  getHackathonDashboard,
  getPlatformDashboard,
  type HackathonDashboard,
  type PlatformDashboard,
} from "@/features/dashboard/dashboard-api";
import { HackathonDashboardView } from "@/features/dashboard/hackathon-dashboard-view";
import { PlatformDashboardView } from "@/features/dashboard/platform-dashboard-view";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import { useUiPreferences } from "@/theme/ui-preferences";

export function HomeSessionPanel() {
  const router = useRouter();
  const { setShowApiTester } = useUiPreferences();
  const { me, isLoading, userDisplayName, isRoot } = useHaasAccess();
  const { selectedHackathonId } = useSelectedEvent();
  const [eventDashboard, setEventDashboard] =
    useState<HackathonDashboard | null>(null);
  const [platformDashboard, setPlatformDashboard] =
    useState<PlatformDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const primaryEventId =
    selectedHackathonId || me?.hackathon_admins?.[0]?.hackathon_id || null;

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
      if (isRoot) {
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
  }, [isRoot, primaryEventId]);

  useEffect(() => {
    if (!isLoading) void loadDashboards();
  }, [isLoading, loadDashboards]);

  return (
    <div className="flex w-full flex-col gap-4">
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${userDisplayName || "Operator"}`}
        description="Live analytics for your events — teams, submissions, machines, and activity at a glance."
        actions={
          <>
            <Button variant="secondary" onClick={() => void loadDashboards()}>
              Refresh
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push("/hackathons")}
            >
              Hackathons
            </Button>
            {primaryEventId ? (
              <Link href={`/events/${primaryEventId}`}>
                <Button>Full event view</Button>
              </Link>
            ) : null}
            <Button variant="secondary" onClick={() => setShowApiTester(true)}>
              API tester
            </Button>
          </>
        }
      />

      {isLoading || dashboardLoading ? (
        <PageLoader label="Loading analytics…" />
      ) : null}

      {error ? (
        <Alert variant="error">{error}</Alert>
      ) : null}

      {!isLoading && !dashboardLoading ? (
        <>
          {isRoot && platformDashboard ? (
            <PlatformDashboardView data={platformDashboard} />
          ) : null}

          {eventDashboard ? (
            <div className="space-y-2">
              {!isRoot && primaryEventId ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-[var(--text-muted)]">
                    Showing analytics for your active event
                  </p>
                  {me?.hackathon_admins && me.hackathon_admins.length > 1 ? (
                    <div className="flex flex-wrap gap-2">
                      {me.hackathon_admins.map((row) => (
                        <Link key={row.hackathon_id} href={`/events/${row.hackathon_id}`}>
                          <Button
                            size="sm"
                            variant={
                              row.hackathon_id === primaryEventId
                                ? "primary"
                                : "secondary"
                            }
                          >
                            {row.hackathon_name}
                          </Button>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <HackathonDashboardView data={eventDashboard} />
            </div>
          ) : !isRoot && !primaryEventId ? (
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
