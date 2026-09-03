import { EventChallengesView } from "@/features/challenges/event-challenges-view";

/**
 * Platform challenges catalog — lists every challenge visible to the user.
 * Event-scoped view: /events/{hackathonId}/challenges
 */
export default function ChallengesPage() {
  return <EventChallengesView syncUrl />;
}
