"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { useEffectiveHackathonId } from "@/features/events/use-effective-hackathon-id";
import { useSelectedEvent } from "@/features/events/selected-event-context";

/** Legacy /organizations → Event workspace Hackathon → Organizations. */
export default function OrganizationsRedirectPage() {
  const router = useRouter();
  const effectiveHackathonId = useEffectiveHackathonId();
  const { setSelectedHackathonId } = useSelectedEvent();

  useEffect(() => {
    if (effectiveHackathonId) {
      setSelectedHackathonId(effectiveHackathonId);
      router.replace(
        `/events/${effectiveHackathonId}/hackathon?tab=organizations`,
      );
    }
  }, [effectiveHackathonId, router, setSelectedHackathonId]);

  if (!effectiveHackathonId) {
    return (
      <Alert variant="info">
        Select an event in the header, then open Hackathon → Organizations.
      </Alert>
    );
  }

  return (
    <p className="text-sm text-[var(--text-muted)]">Opening organizations…</p>
  );
}
