import { EventKothView } from "@/features/koth/event-koth-view";

type PageProps = {
  params: Promise<{ hackathonId: string; sessionId: string }>;
};

export default async function EventKothSessionPage({ params }: PageProps) {
  const { hackathonId, sessionId } = await params;
  return <EventKothView hackathonId={hackathonId} sessionId={sessionId} />;
}
