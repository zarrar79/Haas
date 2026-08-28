import { EventUserDetailView } from "@/features/users/event-user-detail-view";

type PageProps = {
  params: Promise<{ hackathonId: string; userId: string }>;
};

export default async function EventUserDetailPage({ params }: PageProps) {
  const { hackathonId, userId } = await params;
  return <EventUserDetailView hackathonId={hackathonId} userId={userId} />;
}
