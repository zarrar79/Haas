import { EventKothLeaderboardView } from "@/features/koth/event-koth-leaderboard-view";

type PageProps = {
  params: Promise<{ hackathonId: string }>;
};

export default async function EventKothLeaderboardPage({ params }: PageProps) {
  const { hackathonId } = await params;
  return <EventKothLeaderboardView hackathonId={hackathonId} />;
}
