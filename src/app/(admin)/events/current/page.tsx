"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { useEffectiveHackathonId } from "@/features/events/use-effective-hackathon-id";
import { useSelectedEvent } from "@/features/events/selected-event-context";

/** Resolves /events/current → /events/{assigned or selected id} */
export default function CurrentEventRedirectPage() {
  const router = useRouter();
  const effectiveHackathonId = useEffectiveHackathonId();
  const { setSelectedHackathonId } = useSelectedEvent();

  useEffect(() => {
    if (effectiveHackathonId) {
      setSelectedHackathonId(effectiveHackathonId);
      router.replace(`/events/${effectiveHackathonId}`);
    }
  }, [effectiveHackathonId, router, setSelectedHackathonId]);

  if (!effectiveHackathonId) {
    return (
      <Alert variant="info">
        No hackathon is assigned to your account yet. Ask a platform admin to assign
        you as an event administrator.
      </Alert>
    );
  }

  return (
    <p className="text-sm text-[var(--text-muted)]">Opening event workspace…</p>
  );
}
