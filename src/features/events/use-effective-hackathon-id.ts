"use client";

import { useMemo } from "react";

import { useHaasAccess } from "@/features/auth/haas-access-context";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import { resolveAssignedEventId } from "@/lib/assigned-events";

/**
 * Hackathon id for event-scoped routes: persisted selection, or first assigned event.
 */
export function useEffectiveHackathonId(): string | null {
  const { me } = useHaasAccess();
  const { selectedHackathonId } = useSelectedEvent();

  return useMemo(
    () => resolveAssignedEventId(me, selectedHackathonId),
    [me, selectedHackathonId],
  );
}
