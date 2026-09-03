"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useSelectedEvent } from "@/features/events/selected-event-context";

type HackathonQuickActionsProps = {
  hackathonId: string;
  teamCount?: number | null;
  challengeCount?: number | null;
  showView?: boolean;
};

export function HackathonQuickActions({
  hackathonId,
  teamCount,
  challengeCount,
  showView = false,
}: HackathonQuickActionsProps) {
  const router = useRouter();
  const { setSelectedHackathonId } = useSelectedEvent();

  function goTeams() {
    setSelectedHackathonId(hackathonId);
    router.push(`/events/${hackathonId}/teams`);
  }

  function goChallenges() {
    setSelectedHackathonId(hackathonId);
    router.push(`/events/${hackathonId}/challenges`);
  }

  function enterWorkspace() {
    setSelectedHackathonId(hackathonId);
    router.push(`/events/${hackathonId}`);
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={goTeams}>
        Teams{teamCount != null ? ` (${teamCount})` : ""}
      </Button>
      <Button variant="secondary" size="sm" onClick={goChallenges}>
        Challenges{challengeCount != null ? ` (${challengeCount})` : ""}
      </Button>
      {showView ? (
        <Link href={`/events/${hackathonId}/hackathon`}>
          <Button variant="secondary" size="sm">
            View
          </Button>
        </Link>
      ) : null}
      <Button size="sm" onClick={enterWorkspace}>
        Enter workspace
      </Button>
    </>
  );
}
