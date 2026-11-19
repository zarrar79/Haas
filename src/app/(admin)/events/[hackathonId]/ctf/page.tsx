import { EventCtfView } from "@/features/ctf/event-ctf-view";

type PageProps = {
  params: Promise<{ hackathonId: string }>;
};

export default async function EventCtfPage({ params }: PageProps) {
  const { hackathonId } = await params;
  return <EventCtfView hackathonId={hackathonId} />;
}
