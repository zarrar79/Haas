"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { useSelectedEvent } from "@/features/events/selected-event-context";

/** Resolves /events/current → /events/{selectedId} */
export default function CurrentEventRedirectPage() {
  const router = useRouter();
  const { selectedHackathonId } = useSelectedEvent();

  useEffect(() => {
    if (selectedHackathonId) {
      router.replace(`/events/${selectedHackathonId}`);
    }
  }, [selectedHackathonId, router]);

  if (!selectedHackathonId) {
    return (
      <Alert variant="info">
        No event selected yet. Open Hackathons and click Enter on an event.
      </Alert>
    );
  }

  return (
    <p className="text-sm text-[var(--text-muted)]">Opening event workspace…</p>
  );
}
