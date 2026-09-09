import { EventKothListView } from "@/features/koth/event-koth-list-view";

type PageProps = {
  params: Promise<{ hackathonId: string }>;
};

export default async function EventKothListPage({ params }: PageProps) {
  const { hackathonId } = await params;
  return <EventKothListView hackathonId={hackathonId} />;
}
