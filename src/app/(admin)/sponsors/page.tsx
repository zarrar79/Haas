"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { useEffectiveHackathonId } from "@/features/events/use-effective-hackathon-id";
import { useSelectedEvent } from "@/features/events/selected-event-context";

/** Legacy /sponsors → Event workspace Hackathon → Sponsors. */
export default function SponsorsRedirectPage() {
  const router = useRouter();
  const effectiveHackathonId = useEffectiveHackathonId();
  const { setSelectedHackathonId } = useSelectedEvent();

  useEffect(() => {
    if (effectiveHackathonId) {
      setSelectedHackathonId(effectiveHackathonId);
      router.replace(`/events/${effectiveHackathonId}/hackathon?tab=sponsors`);
    }
  }, [effectiveHackathonId, router, setSelectedHackathonId]);

  if (!effectiveHackathonId) {
    return (
      <Alert variant="info">
        Select an event in the header, then open Hackathon → Sponsors.
      </Alert>
    );
  }

  return <p className="text-sm text-[var(--text-muted)]">Opening sponsors…</p>;
}
