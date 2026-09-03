"use client";

import { Alert } from "@/components/ui/alert";
import { EventTeamsView } from "@/features/teams/event-teams-view";
import { useEffectiveHackathonId } from "@/features/events/use-effective-hackathon-id";

export default function TeamsPage() {
  const effectiveId = useEffectiveHackathonId();

  if (!effectiveId) {
    return (
      <Alert variant="info">
        No hackathon is assigned to your account yet. Ask a platform admin to assign
        you as an event administrator, or open Teams from an event workspace.
      </Alert>
    );
  }

  return <EventTeamsView hackathonId={effectiveId} syncUrl />;
}
