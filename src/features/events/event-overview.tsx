"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoader } from "@/components/ui/loader";
import {
  getOverviewAnalyticsBundle,
  type OverviewAnalyticsBundle,
} from "@/features/dashboard/overview-analytics-api";
import { OverviewAnalyticsView } from "@/features/dashboard/overview-analytics-view";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import { getHackathon } from "@/features/hackathons/hackathon-api";
import type { Hackathon } from "@/types/hackathon";

const DEFAULT_PERIOD = "7d";

export function EventOverview() {
  const params = useParams<{ hackathonId: string }>();
  const hackathonId = params.hackathonId;
  const router = useRouter();
  const { setSelectedHackathonId } = useSelectedEvent();
  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [analytics, setAnalytics] = useState<OverviewAnalyticsBundle | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!hackathonId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [h, bundle] = await Promise.all([
        getHackathon(hackathonId),
        getOverviewAnalyticsBundle(hackathonId, {
          period: DEFAULT_PERIOD,
          limit: "15",
        }),
      ]);
      setHackathon(h);
      setAnalytics(bundle);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load overview");
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
        <PageLoader label="Loading event overview…" />
      ) : analytics ? (
        <OverviewAnalyticsView data={analytics} periodLabel={DEFAULT_PERIOD} />
      ) : null}
    </div>
  );
}
