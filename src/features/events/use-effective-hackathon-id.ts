"use client";

import { useMemo } from "react";

import { useHaasAccess } from "@/features/auth/haas-access-context";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import { resolveAssignedEventId } from "@/lib/assigned-events";

/**
 * Hackathon id for event-scoped routes.
 * Platform operators: persisted navbar selection (any event).
 * Event admins: selection clamped to /me assignments.
 */
export function useEffectiveHackathonId(): string | null {
  const { me } = useHaasAccess();
  const { selectedHackathonId } = useSelectedEvent();

  return useMemo(
    () => resolveAssignedEventId(me, selectedHackathonId),
    [me, selectedHackathonId],
  );
}
