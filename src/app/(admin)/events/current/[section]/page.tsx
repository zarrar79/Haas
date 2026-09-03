"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { useEffectiveHackathonId } from "@/features/events/use-effective-hackathon-id";
import { useSelectedEvent } from "@/features/events/selected-event-context";

export default function CurrentEventSectionRedirectPage() {
  const router = useRouter();
  const params = useParams<{ section: string }>();
  const effectiveHackathonId = useEffectiveHackathonId();
  const { setSelectedHackathonId } = useSelectedEvent();

  useEffect(() => {
    if (effectiveHackathonId && params.section) {
      setSelectedHackathonId(effectiveHackathonId);
      router.replace(`/events/${effectiveHackathonId}/${params.section}`);
    }
  }, [effectiveHackathonId, params.section, router, setSelectedHackathonId]);

  if (!effectiveHackathonId) {
    return (
      <Alert variant="info">
        No hackathon is assigned to your account yet. Ask a platform admin to assign
        you as an event administrator.
      </Alert>
    );
  }

  return (
    <p className="text-sm text-[var(--text-muted)]">Opening section…</p>
  );
}
