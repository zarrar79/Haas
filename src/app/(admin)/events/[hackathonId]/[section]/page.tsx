import { Suspense } from "react";
import { redirect } from "next/navigation";

import { PlaceholderPage } from "@/components/shell/placeholder-page";
import { EventActivityLogsView } from "@/features/activity-logs/event-activity-logs-view";
import { EventHackathonView } from "@/features/events/event-hackathon-view";
import { EventMembersView } from "@/features/members/event-members-view";
import { EventSettingsView } from "@/features/settings/event-settings-view";
import { EventTeamsView } from "@/features/teams/event-teams-view";

type PageProps = {
  params: Promise<{ hackathonId: string; section: string }>;
};

export default async function EventSectionPage({ params }: PageProps) {
  const { hackathonId, section } = await params;

  if (section === "hackathon") {
    return (
      <Suspense
        fallback={
          <p className="text-sm text-[var(--text-muted)]">Loading hackathon…</p>
        }
      >
        <EventHackathonView hackathonId={hackathonId} />
      </Suspense>
    );
  }
  if (section === "organizations") {
    redirect(`/events/${hackathonId}/hackathon?tab=organizations`);
  }
  if (section === "sponsors") {
    redirect(`/events/${hackathonId}/hackathon?tab=sponsors`);
  }
  if (section === "members") {
    return <EventMembersView hackathonId={hackathonId} />;
  }
  if (section === "teams") {
    return <EventTeamsView hackathonId={hackathonId} />;
  }
  if (section === "settings") {
    return <EventSettingsView hackathonId={hackathonId} />;
  }
  if (section === "ops") {
    redirect(`/events/${hackathonId}`);
  }
  if (section === "activity-logs") {
    return <EventActivityLogsView hackathonId={hackathonId} />;
  }

  // Legacy flat CTF routes → CTF umbrella
  if (section === "leaderboard") {
    redirect(`/events/${hackathonId}/ctf/leaderboard`);
  }
  if (section === "challenges") {
    redirect(`/events/${hackathonId}/ctf/challenges`);
  }
  if (section === "question-answers") {
    redirect(`/events/${hackathonId}/ctf/question-answers`);
  }
  if (section === "scores") {
    redirect(`/events/${hackathonId}/ctf/submissions`);
  }
  if (section === "machines") {
    redirect(`/events/${hackathonId}/ctf/machines`);
  }
  if (section === "ctf") {
    redirect(`/events/${hackathonId}/ctf`);
  }
  if (section === "ad" || section === "attack-defense") {
    redirect(`/events/${hackathonId}/ad`);
  }

  const title = section.charAt(0).toUpperCase() + section.slice(1);
  return (
    <PlaceholderPage
      title={title}
      description={`Unknown event section: ${section}.`}
    />
  );
}
