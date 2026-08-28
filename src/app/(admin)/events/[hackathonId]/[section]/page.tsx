import { EventActivityLogsView } from "@/features/activity-logs/event-activity-logs-view";
import { EventChallengesView } from "@/features/challenges/event-challenges-view";
import { EventMachinesView } from "@/features/machines/event-machines-view";
import { EventMembersView } from "@/features/members/event-members-view";
import { EventOpsView } from "@/features/ops/event-ops-view";
import { EventQuestionAnswersView } from "@/features/question-answers/event-question-answers-view";
import { EventTeamScoresView } from "@/features/scores/event-team-scores-view";
import { EventSettingsView } from "@/features/settings/event-settings-view";
import { EventTeamsView } from "@/features/teams/event-teams-view";
import { PlaceholderPage } from "@/components/shell/placeholder-page";

type PageProps = {
  params: Promise<{ hackathonId: string; section: string }>;
};

export default async function EventSectionPage({ params }: PageProps) {
  const { hackathonId, section } = await params;

  if (section === "challenges") {
    return <EventChallengesView hackathonId={hackathonId} />;
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
    return <EventOpsView hackathonId={hackathonId} />;
  }
  if (section === "question-answers") {
    return <EventQuestionAnswersView hackathonId={hackathonId} />;
  }
  if (section === "scores") {
    return <EventTeamScoresView hackathonId={hackathonId} />;
  }
  if (section === "machines") {
    return <EventMachinesView hackathonId={hackathonId} />;
  }
  if (section === "activity-logs") {
    return <EventActivityLogsView hackathonId={hackathonId} />;
  }

  const title = section.charAt(0).toUpperCase() + section.slice(1);
  return (
    <PlaceholderPage
      title={title}
      description={`Unknown event section: ${section}.`}
    />
  );
}
