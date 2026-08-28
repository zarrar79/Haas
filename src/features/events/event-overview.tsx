"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import { getHackathon } from "@/features/hackathons/hackathon-api";
import type { HackathonAnalytics } from "@/features/hackathons/hackathon-api";
import { EventAnalyticsDashboard } from "@/features/ops/event-analytics-dashboard";
import {
  getEventAnalytics,
  listScores,
  type ScoreRow,
} from "@/features/ops/ops-api";
import type { Hackathon } from "@/types/hackathon";

const WORKSPACE_LINKS = [
  { href: "members", label: "Members" },
  { href: "teams", label: "Teams" },
  { href: "challenges", label: "Challenges" },
  { href: "question-answers", label: "Question answers" },
  { href: "scores", label: "Team scores" },
  { href: "machines", label: "Machines" },
  { href: "activity-logs", label: "Activity logs" },
  { href: "settings", label: "Settings" },
  { href: "ops", label: "Operations" },
];

export function EventOverview() {
  const params = useParams<{ hackathonId: string }>();
  const hackathonId = params.hackathonId;
  const router = useRouter();
  const { setSelectedHackathonId } = useSelectedEvent();
  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [analytics, setAnalytics] = useState<HackathonAnalytics | null>(null);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!hackathonId) return;
    setSelectedHackathonId(hackathonId);
    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [h, a, s] = await Promise.all([
          getHackathon(hackathonId),
          getEventAnalytics(hackathonId),
          listScores(hackathonId, { show_deleted: "false" }),
        ]);
        setHackathon(h);
        setAnalytics(a);
        setScores(s);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load event");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [hackathonId, setSelectedHackathonId]);

  if (!hackathonId) {
    return <Alert variant="error">Missing hackathon id.</Alert>;
  }

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Event workspace"
        title={hackathon?.display_name || hackathon?.name || "Event"}
        description="Live overview — team standings, challenge progress, and first bloods."
        actions={
          <>
            <Link href={`/events/${hackathonId}/ops`}>
              <Button variant="secondary">Full operations</Button>
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

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {WORKSPACE_LINKS.map((link) => (
          <Link
            key={link.href}
            href={`/events/${hackathonId}/${link.href}`}
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]"
          >
            <p className="text-sm font-medium text-[var(--text)]">{link.label}</p>
          </Link>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading overview…</p>
      ) : (
        <EventAnalyticsDashboard analytics={analytics} scores={scores} />
      )}
    </div>
  );
}
