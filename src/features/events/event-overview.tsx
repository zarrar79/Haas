"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoader } from "@/components/ui/loader";
import {
  getHackathonDashboard,
  type HackathonDashboard,
} from "@/features/dashboard/dashboard-api";
import { HackathonDashboardView } from "@/features/dashboard/hackathon-dashboard-view";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import { getHackathon } from "@/features/hackathons/hackathon-api";
import type { Hackathon } from "@/types/hackathon";

export function EventOverview() {
  const params = useParams<{ hackathonId: string }>();
  const hackathonId = params.hackathonId;
  const router = useRouter();
  const { setSelectedHackathonId } = useSelectedEvent();
  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [dashboard, setDashboard] = useState<HackathonDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!hackathonId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [h, dash] = await Promise.all([
        getHackathon(hackathonId),
        getHackathonDashboard(hackathonId, { hours: "24", limit: "10" }),
      ]);
      setHackathon(h);
      setDashboard(dash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [hackathonId]);

  useEffect(() => {
    if (!hackathonId) return;
    setSelectedHackathonId(hackathonId);
    void load();
  }, [hackathonId, load, setSelectedHackathonId]);

  if (!hackathonId) {
    return <Alert variant="error">Missing hackathon id.</Alert>;
  }

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Event workspace"
        title={hackathon?.display_name || hackathon?.name || "Event dashboard"}
        actions={
          <>
            <Button variant="secondary" onClick={() => void load()}>
              Refresh
            </Button>
            <Link href={`/events/${hackathonId}/ops`}>
              <Button variant="secondary">Operations</Button>
            </Link>
            <Link href={`/hackathons/${hackathonId}`}>
              <Button variant="secondary">Event details</Button>
            </Link>
            <Button variant="ghost" onClick={() => router.push("/hackathons")}>
              All events
            </Button>
          </>
        }
      />

      {error ? (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}

      {isLoading ? (
        <PageLoader label="Loading event dashboard…" />
      ) : dashboard ? (
        <HackathonDashboardView data={dashboard} />
      ) : null}
    </div>
  );
}
