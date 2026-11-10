"use client";

import { PlatformTeamsView } from "@/features/teams/platform-teams-view";

/** Platform-level Teams: every team on the platform (event-scoped view lives at /events/[id]/teams). */
export default function TeamsPage() {
  return <PlatformTeamsView />;
}
