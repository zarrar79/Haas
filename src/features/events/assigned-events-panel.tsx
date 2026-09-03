"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import {
  getAssignedHackathons,
  resolveAssignedEventId,
} from "@/lib/assigned-events";
import { useSelectedEvent } from "@/features/events/selected-event-context";

const QUICK_LINKS = [
  { label: "Overview", section: "" },
  { label: "Members", section: "members" },
  { label: "Teams", section: "teams" },
  { label: "Challenges", section: "challenges" },
  { label: "Scores", section: "scores" },
  { label: "Machines", section: "machines" },
  { label: "Activity", section: "activity-logs" },
  { label: "Settings", section: "settings" },
  { label: "Ops", section: "ops" },
] as const;

export function AssignedEventsPanel() {
  const { me } = useHaasAccess();
  const { selectedHackathonId, setSelectedHackathonId } = useSelectedEvent();
  const assigned = getAssignedHackathons(me);
  const activeId = resolveAssignedEventId(me, selectedHackathonId);

  if (assigned.length === 0) return null;

  return (
    <div className="rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
            Your events
          </p>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            {assigned.length === 1
              ? "You administer one hackathon."
              : `You administer ${assigned.length} hackathons — pick one to work in.`}
          </p>
        </div>
        {assigned.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            {assigned.map((row) => (
              <Button
                key={row.hackathon_id}
                size="sm"
                variant={
                  row.hackathon_id === activeId ? "primary" : "secondary"
                }
                onClick={() => setSelectedHackathonId(row.hackathon_id)}
              >
                {row.hackathon_name}
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      {activeId ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
          {QUICK_LINKS.map((link) => {
            const href =
              link.section === ""
                ? `/events/${activeId}`
                : `/events/${activeId}/${link.section}`;
            return (
              <Link key={link.label} href={href}>
                <Button size="sm" variant="secondary">
                  {link.label}
                </Button>
              </Link>
            );
          })}
          <Link href={`/events/${activeId}`}>
            <Button size="sm">Open workspace</Button>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
