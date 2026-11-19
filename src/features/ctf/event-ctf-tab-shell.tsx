"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { EventChallengesView } from "@/features/challenges/event-challenges-view";
import { EventModeSubnav } from "@/features/events/event-mode-subnav";
import { ctfSubnavItems } from "@/features/events/event-mode-subnav-items";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import { EventLeaderboardView } from "@/features/leaderboard/event-leaderboard-view";
import { EventMachinesView } from "@/features/machines/event-machines-view";
import { EventQuestionAnswersView } from "@/features/question-answers/event-question-answers-view";
import { EventTeamScoresView } from "@/features/scores/event-team-scores-view";

type Props = {
  hackathonId: string;
  tab: string;
};

export function EventCtfTabShell({ hackathonId, tab }: Props) {
  const router = useRouter();
  const { setSelectedHackathonId } = useSelectedEvent();

  useEffect(() => {
    if (hackathonId) setSelectedHackathonId(hackathonId);
  }, [hackathonId, setSelectedHackathonId]);

  useEffect(() => {
    const known = new Set([
      "leaderboard",
      "challenges",
      "question-answers",
      "submissions",
      "scores",
      "machines",
    ]);
    if (!known.has(tab)) {
      router.replace(`/events/${hackathonId}/ctf`);
    }
  }, [tab, hackathonId, router]);

  const subnav = <EventModeSubnav items={ctfSubnavItems(hackathonId)} />;

  if (tab === "leaderboard") {
    return (
      <>
        {subnav}
        <EventLeaderboardView
          hackathonId={hackathonId}
          eyebrow="CTF"
          title="CTF leaderboard"
        />
      </>
    );
  }
  if (tab === "challenges") {
    return (
      <>
        {subnav}
        <EventChallengesView
          hackathonId={hackathonId}
          eyebrow="CTF"
          title="CTF challenges"
        />
      </>
    );
  }
  if (tab === "question-answers") {
    return (
      <>
        {subnav}
        <EventQuestionAnswersView
          hackathonId={hackathonId}
          eyebrow="CTF"
          title="Question answers"
        />
      </>
    );
  }
  if (tab === "submissions" || tab === "scores") {
    return (
      <>
        {subnav}
        <EventTeamScoresView
          hackathonId={hackathonId}
          eyebrow="CTF"
          title="Team submissions"
        />
      </>
    );
  }
  if (tab === "machines") {
    return (
      <>
        {subnav}
        <EventMachinesView
          hackathonId={hackathonId}
          eyebrow="CTF"
          title="Machines"
        />
      </>
    );
  }

  return subnav;
}
