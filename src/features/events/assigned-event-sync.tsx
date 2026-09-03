"use client";

import { useEffect } from "react";

import { useHaasAccess } from "@/features/auth/haas-access-context";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import { resolveAssignedEventId } from "@/lib/assigned-events";
import { isPlatformOperator } from "@/lib/haas-access";

/** Keeps selected hackathon in sync with /me hackathon_admins for event-only admins. */
export function AssignedEventSync() {
  const { me, isLoading } = useHaasAccess();
  const { selectedHackathonId, setSelectedHackathonId } = useSelectedEvent();

  useEffect(() => {
    if (isLoading || !me || isPlatformOperator(me)) return;
    const resolved = resolveAssignedEventId(me, selectedHackathonId);
    if (resolved !== selectedHackathonId) {
      setSelectedHackathonId(resolved);
    }
  }, [isLoading, me, selectedHackathonId, setSelectedHackathonId]);

  return null;
}
